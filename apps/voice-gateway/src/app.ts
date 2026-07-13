import { randomUUID } from 'node:crypto';

import websocket from '@fastify/websocket';
import {
  AttachOfflineAudioRequestSchema,
  CancelVoiceProposalRequestSchema,
  ConfirmVoiceProposalRequestSchema,
  CorrectVoiceProposalRequestSchema,
  CreateVoiceSessionRequestSchema,
  VoiceControlFrameSchema,
  VoiceTurnRequestSchema,
} from '@smart-fasal/contracts/schemas';
import { buildService } from '@smart-fasal/service-runtime';
import {
  MAX_AUDIO_FRAME_BYTES,
  MAX_CONTROL_FRAME_BYTES,
  VOICE_PROTOCOL,
  VoiceFailure,
  type VoicePrincipal,
  type VoiceTicketBinding,
  type VoiceTransportService,
} from '@smart-fasal/voice';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { RawData, WebSocket } from 'ws';

import { SERVICE_NAME } from './config.js';
import { parseVoiceSubprotocols } from './websocket-protocol.js';

const MAX_SERVER_BUFFER_BYTES = 256 * 1024;
const MAX_PENDING_CLIENT_FRAMES = 8;
const MAX_CLIENT_FRAMES_PER_SECOND = 64;
const HEARTBEAT_MS = 20_000;

export interface RequestedVoiceSessionContext {
  readonly contextIds: readonly string[];
  readonly language: VoiceTicketBinding['language'];
  readonly visualRoute: string;
}

export interface VoiceGatewayAuthorizer {
  authorizeHttp(request: FastifyRequest): Promise<VoicePrincipal>;
  deriveVoiceSessionBinding(
    principal: VoicePrincipal,
    requested: RequestedVoiceSessionContext,
  ): Promise<VoiceTicketBinding>;
  reauthorizeRealtime(binding: VoiceTicketBinding): Promise<boolean>;
}

export interface VoiceGatewayOptions {
  readonly authorizer: VoiceGatewayAuthorizer;
  readonly service: VoiceTransportService;
  readonly websocketEndpoint: string;
  readonly readiness?: () => boolean | Promise<boolean>;
}

interface RealtimeContext {
  readonly expiresAt: string;
  readonly principal: VoicePrincipal;
  readonly sessionId: string;
}

function requiredHeader(request: FastifyRequest, name: string): string {
  const value = request.headers[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new VoiceFailure('AUTHENTICATION_REQUIRED', { statusCode: 401 });
  }
  return value;
}

function safeProblemCode(error: unknown) {
  if (!(error instanceof VoiceFailure)) return 'DEPENDENCY_UNAVAILABLE' as const;
  switch (error.code) {
    case 'AUTHENTICATION_REQUIRED':
    case 'AUTHORIZATION_DENIED':
    case 'CONSENT_OR_ACCESS_VERSION_CHANGED':
    case 'DEPENDENCY_UNAVAILABLE':
    case 'INVALID_STATE_TRANSITION':
    case 'RATE_LIMITED':
    case 'VOICE_PROPOSAL_EXPIRED':
    case 'VOICE_PROPOSAL_HASH_MISMATCH':
      return error.code;
    default:
      return 'AUTHORIZATION_DENIED' as const;
  }
}

function safeSend(socket: WebSocket, payload: string): void {
  if (socket.readyState !== 1) return;
  if (socket.bufferedAmount > MAX_SERVER_BUFFER_BYTES) {
    socket.close(1013, 'BACKPRESSURE');
    return;
  }
  socket.send(payload);
}

function dataBytes(data: RawData): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  return data;
}

function exactOrigin(request: FastifyRequest): string {
  const origin = request.headers.origin;
  if (typeof origin !== 'string' || origin.length > 240) {
    throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
  }
  if (
    (parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) ||
    parsed.origin !== origin ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
  }
  return origin;
}

function bindingMatchesPrincipal(binding: VoiceTicketBinding, principal: VoicePrincipal): boolean {
  return (
    binding.environment === principal.environment &&
    binding.subjectId === principal.subjectId &&
    binding.roleContextId === principal.roleContextId &&
    binding.roleType === principal.roleType &&
    binding.origin === principal.origin &&
    binding.authorizationVersion === principal.authorizationVersion &&
    binding.devicePartitionId === principal.devicePartitionId
  );
}

function proposalAction(value: string): { readonly proposalId: string; readonly action: string } {
  const match = /^(?<proposalId>[0-9a-f-]{36}):(?<action>confirm|correct|cancel)$/iu.exec(value);
  if (match?.groups === undefined) {
    throw new VoiceFailure('INVALID_STATE_TRANSITION', { statusCode: 404 });
  }
  return { proposalId: match.groups['proposalId'] ?? '', action: match.groups['action'] ?? '' };
}

export async function buildVoiceGatewayApp(options: VoiceGatewayOptions): Promise<FastifyInstance> {
  const endpoint = new URL(options.websocketEndpoint);
  if (
    endpoint.protocol !== 'wss:' ||
    endpoint.pathname !== '/v1/realtime' ||
    endpoint.search !== '' ||
    endpoint.hash !== '' ||
    endpoint.username !== '' ||
    endpoint.password !== ''
  ) {
    throw new Error('websocketEndpoint must be a credential-free wss /v1/realtime URL');
  }

  const app = buildService({
    readiness: options.readiness ?? (() => true),
    serviceName: SERVICE_NAME,
  });
  const realtimeContexts = new WeakMap<FastifyRequest, RealtimeContext>();

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('cache-control', 'no-store');
    reply.header('pragma', 'no-cache');
    reply.header('x-content-type-options', 'nosniff');
    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    const status = error instanceof VoiceFailure ? error.statusCode : 500;
    const code = safeProblemCode(error);
    return reply.code(status).send({
      type: `https://smart-fasal.invalid/problems/${code.toLowerCase()}`,
      title: code,
      status,
      code,
      correlationId: randomUUID(),
      retryable: error instanceof VoiceFailure ? error.retryable : false,
      fieldErrors: [],
    });
  });

  await app.register(websocket, {
    options: {
      maxPayload: MAX_AUDIO_FRAME_BYTES,
      handleProtocols(protocols) {
        return protocols.size === 2 && protocols.has(VOICE_PROTOCOL) ? VOICE_PROTOCOL : false;
      },
    },
  });

  app.post('/v1/voice/sessions', async (request, reply) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const body = CreateVoiceSessionRequestSchema.parse(request.body);
    const idempotencyKey = requiredHeader(request, 'idempotency-key');
    const binding = await options.authorizer.deriveVoiceSessionBinding(principal, {
      language: body.language,
      visualRoute: body.visualRoute,
      contextIds: body.contextIds,
    });
    if (!bindingMatchesPrincipal(binding, principal)) {
      throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
    }
    const issued = await options.service.openSession(binding, idempotencyKey);
    return reply.code(201).send({
      sessionId: issued.session.sessionId,
      state: 'CREATED',
      websocketEndpoint: endpoint.toString(),
      singleUseTicket: issued.singleUseTicket,
      ticketExpiresAt: issued.ticketExpiresAt,
      sessionExpiresAt: issued.session.expiresAt,
      protocolVersion: 1,
      httpsTurnsEndpoint: `/v1/voice/sessions/${issued.session.sessionId}/turns`,
    });
  });

  app.post('/v1/voice/sessions/:sessionId/turns', async (request) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const body = VoiceTurnRequestSchema.parse(request.body);
    if (requiredHeader(request, 'idempotency-key') !== body.turnId) {
      throw new VoiceFailure('INVALID_STATE_TRANSITION', { statusCode: 409 });
    }
    const { sessionId } = request.params as { sessionId: string };
    return options.service.processTurn(sessionId, principal, body);
  });

  app.get('/v1/voice/proposals/:proposalId', async (request) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const { proposalId } = request.params as { proposalId: string };
    return options.service.getProposal(proposalId, principal);
  });

  app.post('/v1/voice/proposals/:proposalWithAction', async (request) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const { proposalWithAction } = request.params as { proposalWithAction: string };
    const { action, proposalId } = proposalAction(proposalWithAction);
    const idempotencyKey = requiredHeader(request, 'idempotency-key');
    if (action === 'confirm') {
      const body = ConfirmVoiceProposalRequestSchema.parse(request.body);
      if (body.proposalId !== proposalId) {
        throw new VoiceFailure('INVALID_STATE_TRANSITION', { statusCode: 409 });
      }
      return options.service.confirmProposal({ ...body, idempotencyKey, principal });
    }
    if (action === 'correct') {
      const body = CorrectVoiceProposalRequestSchema.parse(request.body);
      if (body.proposalId !== proposalId) {
        throw new VoiceFailure('INVALID_STATE_TRANSITION', { statusCode: 409 });
      }
      return options.service.correctProposal({ ...body, idempotencyKey, principal });
    }
    const body = CancelVoiceProposalRequestSchema.parse(request.body);
    if (body.proposalId !== proposalId) {
      throw new VoiceFailure('INVALID_STATE_TRANSITION', { statusCode: 409 });
    }
    return options.service.cancelProposal({ ...body, idempotencyKey, principal });
  });

  app.get('/v1/commands/:commandId', async (request) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const { commandId } = request.params as { commandId: string };
    return options.service.commandStatus(commandId, principal);
  });

  app.post('/v1/voice/offline-audio', async (request) => {
    const principal = await options.authorizer.authorizeHttp(request);
    const body = AttachOfflineAudioRequestSchema.parse(request.body);
    const idempotencyKey = requiredHeader(request, 'idempotency-key');
    return options.service.attachOfflineAudio({ ...body, idempotencyKey, principal });
  });

  app.get(
    '/v1/realtime',
    {
      websocket: true,
      preValidation: async (request) => {
        // Realtime deliberately ignores bearer/App Check headers. Only exact Origin + ticket apply.
        if (request.raw.url !== '/v1/realtime') {
          throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
        }
        const origin = exactOrigin(request);
        const parsed = parseVoiceSubprotocols(request.headers['sec-websocket-protocol']);
        const session = await options.service.consumeRealtimeTicket(
          parsed.ticket,
          origin,
          (binding) => options.authorizer.reauthorizeRealtime(binding),
        );
        realtimeContexts.set(request, {
          expiresAt: session.expiresAt,
          principal: session.binding,
          sessionId: session.sessionId,
        });
      },
    },
    (socket, request) => {
      const context = realtimeContexts.get(request);
      if (context === undefined || socket.protocol !== VOICE_PROTOCOL) {
        socket.close(1008, 'AUTHORIZATION_DENIED');
        return;
      }

      let alive = true;
      let queue = Promise.resolve();
      let pendingClientFrames = 0;
      let frameWindowStartedAt = Date.now();
      let framesInWindow = 0;
      const warningDelay = Math.max(0, Date.parse(context.expiresAt) - Date.now() - 30_000);
      const expiryDelay = Math.max(0, Date.parse(context.expiresAt) - Date.now());
      const warningTimer = setTimeout(() => {
        try {
          safeSend(
            socket,
            JSON.stringify(
              options.service.sessionExpiringFrame(context.sessionId, context.principal),
            ),
          );
        } catch {
          socket.close(1008, 'SESSION_EXPIRED');
        }
      }, warningDelay);
      const expiryTimer = setTimeout(() => {
        socket.close(1000, 'SESSION_EXPIRED');
      }, expiryDelay);
      const heartbeat = setInterval(() => {
        if (!alive) {
          socket.terminate();
          return;
        }
        alive = false;
        socket.ping();
      }, HEARTBEAT_MS);

      socket.on('pong', () => {
        alive = true;
      });
      socket.on('message', (data, isBinary) => {
        const now = Date.now();
        if (now - frameWindowStartedAt >= 1_000) {
          frameWindowStartedAt = now;
          framesInWindow = 0;
        }
        framesInWindow += 1;
        if (
          pendingClientFrames >= MAX_PENDING_CLIENT_FRAMES ||
          framesInWindow > MAX_CLIENT_FRAMES_PER_SECOND
        ) {
          socket.close(1013, 'BACKPRESSURE');
          return;
        }
        pendingClientFrames += 1;
        queue = queue
          .then(async () => {
            try {
              const bytes = dataBytes(data);
              if (isBinary) {
                options.service.acceptAudioFrame(context.sessionId, context.principal, bytes);
                return;
              }
              if (bytes.byteLength === 0 || bytes.byteLength > MAX_CONTROL_FRAME_BYTES) {
                throw new VoiceFailure('VOICE_FRAME_TOO_LARGE', { statusCode: 413 });
              }
              const frame = VoiceControlFrameSchema.parse(
                JSON.parse(Buffer.from(bytes).toString('utf8')),
              );
              if (frame.sessionId !== context.sessionId) {
                throw new VoiceFailure('AUTHORIZATION_DENIED', { statusCode: 403 });
              }
              const response = await options.service.handleControlFrame(context.principal, frame);
              safeSend(socket, JSON.stringify(response));
            } catch (error) {
              socket.close(
                error instanceof VoiceFailure && error.code === 'VOICE_FRAME_TOO_LARGE'
                  ? 1009
                  : 1008,
                'VOICE_FRAME_REJECTED',
              );
            }
          })
          .finally(() => {
            pendingClientFrames -= 1;
          });
      });
      socket.once('close', () => {
        clearInterval(heartbeat);
        clearTimeout(warningTimer);
        clearTimeout(expiryTimer);
        void options.service.bargeIn(context.sessionId, context.principal).catch(() => undefined);
      });
    },
  );

  return app;
}
