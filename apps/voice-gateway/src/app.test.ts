import { createHash } from 'node:crypto';

import {
  InMemoryVoiceProposalStore,
  InMemoryVoiceTicketStore,
  VoiceTransportService,
  type VoicePrincipal,
  type VoiceTicketBinding,
} from '@smart-fasal/voice';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

import { buildVoiceGatewayApp, type VoiceGatewayOptions } from './app.js';

const principal: VoicePrincipal = {
  environment: 'local',
  subjectId: '019f5678-1234-7000-8000-000000000002',
  roleContextId: '019f5678-1234-7000-8000-000000000003',
  roleType: 'FARMER',
  origin: 'http://localhost:3000',
  authorizationVersion: 7,
  devicePartitionId: '019f5678-1234-7000-8000-000000000004',
};
const TICKET = 'abcdefghijklmnopqrstuvwxyzABCDEFGH123456789';

const apps: Awaited<ReturnType<typeof buildVoiceGatewayApp>>[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.terminate();
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function fixture(
  options: {
    realtimeAuthorized?: boolean;
    offlineAuthorized?: boolean;
    invalidDerivedBinding?: boolean;
  } = {},
) {
  let id = 10;
  const randomId = () => `019f5678-1234-7000-8000-${String(id++).padStart(12, '0')}`;
  const tickets = new InMemoryVoiceTicketStore({ randomId, randomTicket: () => TICKET });
  const execute = vi.fn().mockResolvedValue({ accepted: true });
  const proposals = new InMemoryVoiceProposalStore({
    executor: { execute },
    policy: { reauthorize: vi.fn().mockResolvedValue(true) },
    registeredToolKeys: [],
    randomId,
  });
  const service = new VoiceTransportService({
    tickets,
    proposals,
    randomId,
    offlineAudioPolicy: {
      attachVerified: vi.fn().mockImplementation((input: unknown) => {
        if (options.offlineAuthorized === false) throw new Error('DENIED');
        void input;
        return Promise.resolve({
          attachmentId: randomId(),
          expiresAt: '2026-07-20T00:00:00.000Z',
          mediaPurpose: 'VOICE_OFFLINE_AUDIO' as const,
          verificationState: 'VERIFIED' as const,
        });
      }),
      reauthorize: vi.fn().mockResolvedValue(options.offlineAuthorized !== false),
    },
  });
  const gateway: VoiceGatewayOptions = {
    authorizer: {
      authorizeHttp: vi.fn().mockResolvedValue(principal),
      deriveVoiceSessionBinding: vi.fn().mockImplementation(
        (
          authorizedPrincipal: VoicePrincipal,
          requested: {
            language: VoiceTicketBinding['language'];
            visualRoute: string;
            contextIds: readonly string[];
          },
        ) =>
          Promise.resolve({
            ...authorizedPrincipal,
            ...requested,
            ...(options.invalidDerivedBinding === true ? { subjectId: TICKET } : {}),
          }),
      ),
      reauthorizeRealtime: vi.fn((binding: VoiceTicketBinding) =>
        Promise.resolve(options.realtimeAuthorized !== false && binding.authorizationVersion === 7),
      ),
    },
    service,
    websocketEndpoint: 'wss://voice.local.invalid/v1/realtime',
  };
  return { execute, gateway, service };
}

const sessionBody = {
  protocolVersion: 1,
  language: 'mr',
  visualRoute: '/farmer/today',
  contextIds: [],
  audioCapabilities: { realtime: true, httpsAudio: true, offlineAudio: true },
};

async function createSession(app: Awaited<ReturnType<typeof buildVoiceGatewayApp>>) {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/voice/sessions',
    headers: { 'idempotency-key': '019f5678-1234-7000-8000-000000000009' },
    payload: sessionBody,
  });
  expect(response.statusCode).toBe(201);
  return response.json<{
    sessionId: string;
    singleUseTicket: string;
    websocketEndpoint: string;
  }>();
}

describe('voice gateway HTTPS boundary', () => {
  it('returns a credential-free endpoint and uses the same bounded turn orchestrator', async () => {
    const { gateway } = fixture();
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const session = await createSession(app);

    expect(session.websocketEndpoint).toBe('wss://voice.local.invalid/v1/realtime');
    expect(session.websocketEndpoint).not.toContain(session.singleUseTicket);
    const createResponse = await app.inject({ method: 'GET', url: '/health/live' });
    expect(createResponse.headers['cache-control']).toBe('no-store');
    expect(createResponse.headers.pragma).toBe('no-cache');
    const turn = await app.inject({
      method: 'POST',
      url: `/v1/voice/sessions/${session.sessionId}/turns`,
      headers: { 'idempotency-key': '019f5678-1234-7000-8000-000000000080' },
      payload: {
        turnId: '019f5678-1234-7000-8000-000000000080',
        input: { type: 'TEXT', text: 'help' },
        clientSequence: 1,
        acknowledgedServerSequence: 0,
      },
    });
    expect(turn.statusCode).toBe(200);
    expect(turn.json()).toMatchObject({ state: 'HELP', messageKey: 'voice.help' });
  });

  it('rejects a session binding that was not derived for the authenticated principal', async () => {
    const { gateway } = fixture({ invalidDerivedBinding: true });
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/voice/sessions',
      headers: { 'idempotency-key': '019f5678-1234-7000-8000-000000000009' },
      payload: sessionBody,
    });
    expect(response.statusCode).toBe(403);
  });

  it('rejects HTTPS audio with a changed digest or more than 64 KiB', async () => {
    const { gateway } = fixture();
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const session = await createSession(app);
    const bytes = Buffer.from('bounded audio');
    const request = (bytesBase64: string, sha256: string, turnId: string) =>
      app.inject({
        method: 'POST',
        url: `/v1/voice/sessions/${session.sessionId}/turns`,
        headers: { 'idempotency-key': turnId },
        payload: {
          turnId,
          input: { type: 'AUDIO', mimeType: 'audio/wav', bytesBase64, sha256 },
          clientSequence: 1,
          acknowledgedServerSequence: 0,
        },
      });
    const mismatch = await request(
      bytes.toString('base64'),
      `sha256:${'0'.repeat(64)}`,
      '019f5678-1234-7000-8000-000000000081',
    );
    expect(mismatch.statusCode).toBe(400);

    const oversized = Buffer.alloc(64 * 1024 + 1);
    const tooLarge = await request(
      oversized.toString('base64'),
      `sha256:${createHash('sha256').update(oversized).digest('hex')}`,
      '019f5678-1234-7000-8000-000000000082',
    );
    expect(tooLarge.statusCode).toBe(413);
  });

  it('requires verified typed offline media and returns only transcription pending', async () => {
    const { execute, gateway } = fixture();
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const session = await createSession(app);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/voice/offline-audio',
      headers: { 'idempotency-key': '019f5678-1234-7000-8000-000000000090' },
      payload: {
        assetId: '019f5678-1234-7000-8000-000000000091',
        localCaptureId: '019f5678-1234-7000-8000-000000000092',
        language: 'mr',
        sessionId: session.sessionId,
        audioConsentVersion: 2,
        expectedSessionRevision: 0,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ state: 'TRANSCRIPTION_PENDING' });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('voice gateway realtime boundary', () => {
  it('uses only exact Origin plus subprotocol ticket, echoes no credential and rejects replay', async () => {
    const { gateway } = fixture();
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const session = await createSession(app);
    const wsUrl = `${address.replace('http://', 'ws://')}/v1/realtime`;
    const first = new WebSocket(wsUrl, ['sfka.voice.v1', `ticket.${session.singleUseTicket}`], {
      origin: principal.origin,
      headers: { authorization: 'Bearer ignored-by-ticket-auth' },
    });
    sockets.push(first);
    await new Promise<void>((resolve, reject) => {
      first.once('open', resolve);
      first.once('error', reject);
    });
    expect(first.protocol).toBe('sfka.voice.v1');
    expect(first.protocol).not.toContain('ticket.');

    const replayStatus = await new Promise<number>((resolve) => {
      const replay = new WebSocket(wsUrl, ['sfka.voice.v1', `ticket.${session.singleUseTicket}`], {
        origin: principal.origin,
      });
      sockets.push(replay);
      replay.once('unexpected-response', (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
      replay.once('error', () => {
        resolve(0);
      });
    });
    expect(replayStatus).toBe(401);
  });

  it('closes a client that outruns the bounded inbound frame queue', async () => {
    const { gateway, service } = fixture();
    vi.spyOn(service, 'handleControlFrame').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        protocolVersion: 1,
        sessionId: '019f5678-1234-7000-8000-000000000010',
        messageId: '019f5678-1234-7000-8000-000000000011',
        sequence: 1,
        acknowledgedSequence: 0,
        type: 'transport.ack',
        payload: {},
      };
    });
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const session = await createSession(app);
    const socket = new WebSocket(
      `${address.replace('http://', 'ws://')}/v1/realtime`,
      ['sfka.voice.v1', `ticket.${session.singleUseTicket}`],
      { origin: principal.origin },
    );
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    const closed = new Promise<number>((resolve) => {
      socket.once('close', (code) => {
        resolve(code);
      });
    });
    for (let sequence = 1; sequence <= 9; sequence += 1) {
      socket.send(
        JSON.stringify({
          protocolVersion: 1,
          sessionId: session.sessionId,
          messageId: `019f5678-1234-7000-8000-${String(sequence).padStart(12, '0')}`,
          sequence,
          acknowledgedSequence: 0,
          type: 'session.start',
          payload: {},
        }),
      );
    }
    await expect(closed).resolves.toBe(1013);
  });

  it('fails closed when current authorization changed before ticket consumption', async () => {
    const { gateway } = fixture({ realtimeAuthorized: false });
    const app = await buildVoiceGatewayApp(gateway);
    apps.push(app);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const session = await createSession(app);
    const status = await new Promise<number>((resolve) => {
      const socket = new WebSocket(
        `${address.replace('http://', 'ws://')}/v1/realtime`,
        ['sfka.voice.v1', `ticket.${session.singleUseTicket}`],
        { origin: principal.origin },
      );
      sockets.push(socket);
      socket.once('unexpected-response', (_request, response) => {
        resolve(response.statusCode ?? 0);
      });
      socket.once('error', () => {
        resolve(0);
      });
    });
    expect(status).toBe(403);
  });
});
