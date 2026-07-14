import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { JsonValue, VoiceControlFrame } from '@smart-fasal/contracts';

import { VoiceFailure, voiceFailure } from './errors.js';
import {
  type CancelProposalInput,
  canonicalPayloadHash,
  type ConfirmProposalInput,
  type CorrectProposalInput,
  type InMemoryVoiceProposalStore,
  type JsonObject,
} from './proposals.js';
import { MonotonicSequenceWindow } from './sequence.js';
import type {
  InMemoryVoiceTicketStore,
  IssuedVoiceSession,
  VoicePrincipal,
  VoiceTicketBinding,
} from './tickets.js';

export const MAX_CONTROL_FRAME_BYTES = 32 * 1024;
export const MAX_AUDIO_FRAME_BYTES = 64 * 1024;
export const VOICE_AUDIO_FRAME_HEADER_BYTES = 4;
export const MAX_AUDIO_FRAME_DURATION_MS = 1_000;
export const M2_CLOSED_TOOL_REGISTRY: readonly string[] = Object.freeze([]);

export interface VoiceTurnInput {
  readonly turnId: string;
  readonly input:
    | { readonly type: 'TEXT'; readonly text: string }
    | {
        readonly type: 'AUDIO';
        readonly mimeType: 'audio/webm;codecs=opus' | 'audio/wav';
        readonly sha256: string;
        readonly bytesBase64: string;
      };
  readonly clientSequence: number;
  readonly acknowledgedServerSequence: number;
}

export interface VoiceTurnOutput {
  readonly turnId: string;
  readonly sessionId: string;
  readonly state:
    'HELP' | 'UNAVAILABLE' | 'NEEDS_CLARIFICATION' | 'PROPOSAL_PENDING' | 'RESULT_READY';
  readonly messageKey: string;
  readonly proposalId?: string;
  readonly result?:
    | {
        readonly resultType: 'RECOMMENDATION_READ';
        readonly recommendationId: string;
        readonly summary: string;
        readonly openDetailsRoute: string;
        readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
        readonly sourceGeneratedAt: string;
      }
    | {
        readonly resultType: 'ADVISORY_READ';
        readonly advisoryId: string;
        readonly summary: string;
        readonly openDetailsRoute: string;
        readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
        readonly sourceGeneratedAt: string;
      };
  readonly serverSequence: number;
  readonly acknowledgedClientSequence: number;
}

export interface ProviderInterpretation {
  readonly kind: 'HELP' | 'CLARIFICATION' | 'TOOL_PROPOSAL' | 'VALIDATED_RESULT';
  readonly messageKey: string;
  readonly toolKey?: string;
  readonly payload?: JsonObject;
  readonly readBack?: JsonObject;
  readonly result?: VoiceTurnOutput['result'];
}

export interface VoiceProvider {
  interpret(input: {
    readonly generation: number;
    readonly input: VoiceTurnInput['input'];
    readonly language: VoiceTicketBinding['language'];
    readonly principal: VoicePrincipal;
    readonly sanitizedContextIds: readonly string[];
    readonly sessionId: string;
  }): Promise<ProviderInterpretation>;
  cancel(input: { readonly generation: number; readonly sessionId: string }): Promise<void>;
}

export class UnavailableVoiceProvider implements VoiceProvider {
  interpret(): Promise<ProviderInterpretation> {
    return Promise.reject(voiceFailure('DEPENDENCY_UNAVAILABLE', 503, true));
  }

  async cancel(): Promise<void> {
    // There is no provider work to cancel.
  }
}

interface SessionTransportState {
  readonly client: MonotonicSequenceWindow;
  readonly turnReceipts: Map<
    string,
    { readonly fingerprint: string; readonly output: VoiceTurnOutput }
  >;
}

interface OfflineAudioRecord {
  readonly offlineAudioRefId: string;
  readonly attachmentId: string;
  readonly assetId: string;
  readonly localCaptureId: string;
  readonly sessionId: string;
  readonly principal: VoicePrincipal;
  readonly audioConsentVersion: number;
  readonly expiresAt: string;
  state: 'TRANSCRIPTION_PENDING' | 'NEEDS_CONFIRMATION' | 'CANCELLED' | 'EXPIRED';
}

export interface OfflineAudioPolicy {
  attachVerified(input: {
    readonly assetId: string;
    readonly audioConsentVersion: number;
    readonly expectedSessionRevision: number;
    readonly language: VoiceTicketBinding['language'];
    readonly localCaptureId: string;
    readonly principal: VoicePrincipal;
    readonly sessionId: string;
  }): Promise<{
    readonly attachmentId: string;
    readonly expiresAt: string;
    readonly mediaPurpose: string;
    readonly verificationState: string;
  }>;
  reauthorize(input: {
    readonly assetId: string;
    readonly attachmentId: string;
    readonly audioConsentVersion: number;
    readonly principal: VoicePrincipal;
    readonly sessionId: string;
  }): Promise<boolean>;
}

export interface VoiceTransportServiceOptions {
  readonly tickets: InMemoryVoiceTicketStore;
  readonly proposals: InMemoryVoiceProposalStore;
  readonly provider?: VoiceProvider;
  readonly registeredToolKeys?: readonly string[];
  readonly now?: () => number;
  readonly randomId?: () => string;
  readonly offlineAudioPolicy?: OfflineAudioPolicy;
}

function isHelp(text: string): boolean {
  return ['help', 'मदत', 'मदद'].includes(text.trim().toLocaleLowerCase());
}

function jsonObject(value: JsonValue | undefined): JsonObject {
  if (value === undefined || value === null || Array.isArray(value) || typeof value !== 'object') {
    throw voiceFailure('VOICE_FRAME_INVALID', 400);
  }
  return value;
}

function requiredString(payload: JsonObject, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw voiceFailure('VOICE_FRAME_INVALID', 400);
  }
  return value;
}

function requiredRevision(payload: JsonObject): number {
  const value = payload['expectedProposalRevision'];
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw voiceFailure('VOICE_FRAME_INVALID', 400);
  }
  return value as number;
}

function principalMatchesSession(principal: VoicePrincipal, binding: VoiceTicketBinding): boolean {
  return (
    principal.environment === binding.environment &&
    principal.subjectId === binding.subjectId &&
    principal.roleContextId === binding.roleContextId &&
    principal.roleType === binding.roleType &&
    principal.origin === binding.origin &&
    principal.authorizationVersion === binding.authorizationVersion &&
    principal.devicePartitionId === binding.devicePartitionId
  );
}

/** Shared HTTPS/WebSocket orchestration. It never retains raw turn audio or replays mutations. */
export class VoiceTransportService {
  readonly #tickets: InMemoryVoiceTicketStore;
  readonly #proposals: InMemoryVoiceProposalStore;
  readonly #provider: VoiceProvider;
  readonly #registeredToolKeys: ReadonlySet<string>;
  readonly #now: () => number;
  readonly #randomId: () => string;
  readonly #offlineAudioPolicy: OfflineAudioPolicy | undefined;
  readonly #transport = new Map<string, SessionTransportState>();
  readonly #offlineAudio = new Map<string, OfflineAudioRecord>();
  readonly #offlineAudioReceipts = new Map<
    string,
    {
      readonly fingerprint: string;
      readonly output: {
        readonly offlineAudioRefId: string;
        readonly attachmentId: string;
        readonly state: 'TRANSCRIPTION_PENDING';
        readonly expiresAt: string;
      };
    }
  >();
  readonly #idempotencyLocks = new Map<string, Promise<void>>();
  readonly #sessionReceipts = new Map<
    string,
    { readonly bindingFingerprint: string; readonly sessionId: string }
  >();

  constructor(options: VoiceTransportServiceOptions) {
    this.#tickets = options.tickets;
    this.#proposals = options.proposals;
    this.#provider = options.provider ?? new UnavailableVoiceProvider();
    this.#registeredToolKeys = new Set(options.registeredToolKeys ?? M2_CLOSED_TOOL_REGISTRY);
    this.#now = options.now ?? Date.now;
    this.#randomId = options.randomId ?? randomUUID;
    this.#offlineAudioPolicy = options.offlineAudioPolicy;
  }

  createSession(binding: VoiceTicketBinding): IssuedVoiceSession {
    const issued = this.#tickets.createSession(binding);
    this.#transport.set(issued.session.sessionId, {
      client: new MonotonicSequenceWindow(),
      turnReceipts: new Map(),
    });
    return issued;
  }

  async openSession(
    binding: VoiceTicketBinding,
    idempotencyKey: string,
  ): Promise<IssuedVoiceSession> {
    const bindingFingerprint = canonicalPayloadHash(binding as unknown as JsonObject);
    return this.#withIdempotencyLock(idempotencyKey, async () => {
      const prior = this.#sessionReceipts.get(idempotencyKey);
      if (prior !== undefined) {
        if (prior.bindingFingerprint !== bindingFingerprint) {
          throw voiceFailure('INVALID_STATE_TRANSITION', 409);
        }
        // Reissue a new hash-only one-time ticket for the same logical session. Plaintext is never cached.
        return this.reconnect(prior.sessionId, binding);
      }
      const issued = this.createSession(binding);
      this.#sessionReceipts.set(idempotencyKey, {
        bindingFingerprint,
        sessionId: issued.session.sessionId,
      });
      return issued;
    });
  }

  consumeRealtimeTicket(
    ticket: string,
    origin: string,
    reauthorize: (binding: VoiceTicketBinding) => Promise<boolean>,
  ) {
    return this.#tickets.consumeRealtime(ticket, origin, reauthorize);
  }

  async reconnect(sessionId: string, binding: VoiceTicketBinding): Promise<IssuedVoiceSession> {
    const generation = this.#tickets.beginProviderWork(sessionId);
    const issued = this.#tickets.reconnect(sessionId, binding);
    this.#transport.set(sessionId, {
      client: new MonotonicSequenceWindow(),
      turnReceipts: new Map(),
    });
    await this.#safeCancel(sessionId, generation);
    return issued;
  }

  async bargeIn(sessionId: string, principal: VoicePrincipal): Promise<void> {
    this.#assertSessionPrincipal(sessionId, principal);
    const generation = this.#tickets.beginProviderWork(sessionId);
    this.#tickets.invalidateProviderWork(sessionId);
    await this.#safeCancel(sessionId, generation);
  }

  async processTurn(
    sessionId: string,
    principal: VoicePrincipal,
    turn: VoiceTurnInput,
  ): Promise<VoiceTurnOutput> {
    const session = this.#assertSessionPrincipal(sessionId, principal);
    const transport = this.#requiredTransport(sessionId);
    const turnFingerprint = canonicalPayloadHash(turn as unknown as JsonObject);
    const prior = transport.turnReceipts.get(turn.turnId);
    if (prior !== undefined) {
      if (prior.fingerprint !== turnFingerprint) {
        throw voiceFailure('INVALID_STATE_TRANSITION', 409);
      }
      return prior.output;
    }
    if (turn.input.type === 'AUDIO') this.#validateHttpsAudio(turn.input);

    const disposition = transport.client.receive(turn.clientSequence);
    if (disposition.kind === 'DUPLICATE') throw voiceFailure('INVALID_STATE_TRANSITION', 409);
    if (disposition.kind === 'GAP') throw voiceFailure('VOICE_SEQUENCE_GAP', 409, true);
    transport.client.acknowledgePeer(turn.acknowledgedServerSequence);

    let state: VoiceTurnOutput['state'] = 'UNAVAILABLE';
    let messageKey = 'voice.action_unavailable_use_touch_or_text';
    let proposalId: string | undefined;
    let result: VoiceTurnOutput['result'];

    if (turn.input.type === 'TEXT' && isHelp(turn.input.text)) {
      state = 'HELP';
      messageKey = 'voice.help';
    } else {
      const generation = this.#tickets.beginProviderWork(sessionId);
      try {
        const interpretation = await this.#provider.interpret({
          generation,
          input: turn.input,
          language: session.binding.language,
          principal,
          sanitizedContextIds: session.binding.contextIds,
          sessionId,
        });
        if (!this.#tickets.isProviderWorkCurrent(sessionId, generation)) {
          throw voiceFailure('DEPENDENCY_UNAVAILABLE', 503, true);
        }
        if (interpretation.kind === 'HELP') {
          state = 'HELP';
          messageKey = interpretation.messageKey;
        } else if (interpretation.kind === 'CLARIFICATION') {
          state = 'NEEDS_CLARIFICATION';
          messageKey = interpretation.messageKey;
        } else if (
          interpretation.kind === 'VALIDATED_RESULT' &&
          interpretation.result !== undefined &&
          (interpretation.toolKey === 'farmer.recommendation.read' ||
            interpretation.toolKey === 'farmer.advisory.read') &&
          this.#registeredToolKeys.has(interpretation.toolKey)
        ) {
          state = 'RESULT_READY';
          messageKey = interpretation.messageKey;
          result = interpretation.result;
        } else if (
          interpretation.toolKey !== undefined &&
          interpretation.payload !== undefined &&
          interpretation.readBack !== undefined &&
          this.#registeredToolKeys.has(interpretation.toolKey)
        ) {
          const proposal = this.#proposals.create({
            sessionId,
            principal,
            toolKey: interpretation.toolKey,
            payload: interpretation.payload,
            readBack: interpretation.readBack,
            expiresAt: new Date(
              Math.min(this.#now() + 10 * 60_000, Date.parse(session.expiresAt)),
            ).toISOString(),
          });
          state = 'PROPOSAL_PENDING';
          messageKey = interpretation.messageKey;
          proposalId = proposal.proposalId;
        }
      } catch (error) {
        if (!(error instanceof VoiceFailure) || error.code !== 'DEPENDENCY_UNAVAILABLE') {
          throw error;
        }
        // A typed provider outage becomes honest Unavailable; genuine programming failures still fail.
      }
    }

    const output: VoiceTurnOutput = Object.freeze({
      turnId: turn.turnId,
      sessionId,
      state,
      messageKey,
      ...(proposalId === undefined ? {} : { proposalId }),
      ...(result === undefined ? {} : { result }),
      serverSequence: transport.client.nextSendingSequence(),
      acknowledgedClientSequence: transport.client.highestReceived,
    });
    transport.turnReceipts.set(turn.turnId, { fingerprint: turnFingerprint, output });
    return output;
  }

  async handleControlFrame(
    principal: VoicePrincipal,
    frame: VoiceControlFrame,
  ): Promise<VoiceControlFrame> {
    this.#assertSessionPrincipal(frame.sessionId, principal);
    const transport = this.#requiredTransport(frame.sessionId);
    const disposition = transport.client.receive(frame.sequence);
    if (disposition.kind === 'DUPLICATE') {
      return this.#serverFrame(frame.sessionId, 'transport.ack', {
        highestContiguousSequence: disposition.highestContiguous,
      });
    }
    if (disposition.kind === 'GAP') {
      return this.#serverFrame(frame.sessionId, 'transport.resync_request', {
        expectedSequence: disposition.expected,
        highestContiguousSequence: disposition.highestContiguous,
      });
    }
    transport.client.acknowledgePeer(frame.acknowledgedSequence);

    switch (frame.type) {
      case 'session.start':
        return this.#serverFrame(frame.sessionId, 'session.ready', { toolKeys: [] });
      case 'ping':
      case 'transport.ack':
        return this.#serverFrame(frame.sessionId, 'transport.ack', {
          highestContiguousSequence: transport.client.highestReceived,
        });
      case 'transport.resync_request':
        return this.#serverFrame(frame.sessionId, 'transport.resync', {
          highestContiguousClientSequence: transport.client.highestReceived,
          proposalState: 'UNCHANGED',
          replayedAudio: false,
          replayedMutation: false,
        });
      case 'barge_in':
        await this.bargeIn(frame.sessionId, principal);
        return this.#serverFrame(frame.sessionId, 'state.changed', { state: 'LISTENING' });
      case 'audio.end':
        return this.#serverFrame(frame.sessionId, 'state.changed', {
          state: 'UNAVAILABLE',
          messageKey: 'voice.action_unavailable_use_touch_or_text',
        });
      case 'proposal.confirm': {
        const payload = jsonObject(frame.payload);
        const commandId = requiredString(payload, 'commandId');
        const result = await this.#proposals.confirm({
          proposalId: requiredString(payload, 'proposalId'),
          expectedProposalRevision: requiredRevision(payload),
          payloadHash: requiredString(payload, 'payloadHash'),
          commandId,
          idempotencyKey: requiredString(payload, 'idempotencyKey'),
          principal,
        } satisfies ConfirmProposalInput);
        return this.#serverFrame(frame.sessionId, 'command.state', result as unknown as JsonObject);
      }
      case 'proposal.correct': {
        const payload = jsonObject(frame.payload);
        const commandId = requiredString(payload, 'commandId');
        const result = await this.#proposals.correct({
          proposalId: requiredString(payload, 'proposalId'),
          expectedProposalRevision: requiredRevision(payload),
          commandId,
          idempotencyKey: requiredString(payload, 'idempotencyKey'),
          correction: jsonObject(payload['correction']),
          principal,
        } satisfies CorrectProposalInput);
        return this.#serverFrame(
          frame.sessionId,
          'proposal.state',
          result as unknown as JsonObject,
        );
      }
      case 'proposal.cancel': {
        const payload = jsonObject(frame.payload);
        const commandId = requiredString(payload, 'commandId');
        const result = await this.#proposals.cancel({
          proposalId: requiredString(payload, 'proposalId'),
          expectedProposalRevision: requiredRevision(payload),
          commandId,
          idempotencyKey: requiredString(payload, 'idempotencyKey'),
          principal,
        } satisfies CancelProposalInput);
        return this.#serverFrame(
          frame.sessionId,
          'proposal.state',
          result as unknown as JsonObject,
        );
      }
      case 'session.close':
        this.#tickets.closeSession(frame.sessionId, principal);
        return this.#serverFrame(frame.sessionId, 'session.closed', { reason: 'CLIENT_CLOSED' });
      default:
        throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
  }

  acceptAudioFrame(sessionId: string, principal: VoicePrincipal, frame: Uint8Array): void {
    this.#assertSessionPrincipal(sessionId, principal);
    if (
      frame.byteLength <= VOICE_AUDIO_FRAME_HEADER_BYTES ||
      frame.byteLength > MAX_AUDIO_FRAME_BYTES
    ) {
      throw voiceFailure('VOICE_FRAME_TOO_LARGE', 413);
    }
    const durationMs = new DataView(
      frame.buffer,
      frame.byteOffset,
      VOICE_AUDIO_FRAME_HEADER_BYTES,
    ).getUint32(0, false);
    if (durationMs === 0 || durationMs > MAX_AUDIO_FRAME_DURATION_MS) {
      throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
    // The bounded bytes are intentionally not persisted; reconnect never replays audio.
  }

  sessionExpiringFrame(sessionId: string, principal: VoicePrincipal): VoiceControlFrame {
    this.#assertSessionPrincipal(sessionId, principal);
    return this.#serverFrame(sessionId, 'session.expiring', { reconnectRequired: true });
  }

  getProposal(proposalId: string, principal: VoicePrincipal) {
    return this.#proposals.get(proposalId, principal);
  }

  confirmProposal(input: ConfirmProposalInput) {
    return this.#proposals.confirm(input);
  }

  correctProposal(input: CorrectProposalInput) {
    return this.#proposals.correct(input);
  }

  cancelProposal(input: CancelProposalInput) {
    return this.#proposals.cancel(input);
  }

  commandStatus(commandId: string, principal: VoicePrincipal) {
    return this.#proposals.commandStatus(commandId, principal);
  }

  async attachOfflineAudio(input: {
    readonly assetId: string;
    readonly audioConsentVersion: number;
    readonly expectedSessionRevision: number;
    readonly language: VoiceTicketBinding['language'];
    readonly localCaptureId: string;
    readonly sessionId: string;
    readonly principal: VoicePrincipal;
    readonly idempotencyKey: string;
  }): Promise<{
    readonly offlineAudioRefId: string;
    readonly attachmentId: string;
    readonly state: 'TRANSCRIPTION_PENDING';
    readonly expiresAt: string;
  }> {
    const session = this.#assertSessionPrincipal(input.sessionId, input.principal);
    const offlineAudioPolicy = this.#offlineAudioPolicy;
    if (session.binding.language !== input.language || offlineAudioPolicy === undefined) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    const requestFingerprint = canonicalPayloadHash({
      assetId: input.assetId,
      audioConsentVersion: input.audioConsentVersion,
      authorizationVersion: input.principal.authorizationVersion,
      devicePartitionId: input.principal.devicePartitionId,
      environment: input.principal.environment,
      expectedSessionRevision: input.expectedSessionRevision,
      idempotencyKey: input.idempotencyKey,
      language: input.language,
      localCaptureId: input.localCaptureId,
      origin: input.principal.origin,
      roleContextId: input.principal.roleContextId,
      roleType: input.principal.roleType,
      sessionId: input.sessionId,
      subjectId: input.principal.subjectId,
    });
    const prior = this.#offlineAudioReceipts.get(input.idempotencyKey);
    if (prior !== undefined) {
      await this.#reauthorizeOfflineReceipt(prior.output.offlineAudioRefId, input.principal);
      if (prior.fingerprint !== requestFingerprint) {
        throw voiceFailure('INVALID_STATE_TRANSITION', 409);
      }
      return prior.output;
    }
    return this.#withIdempotencyLock(input.idempotencyKey, async () => {
      const insidePrior = this.#offlineAudioReceipts.get(input.idempotencyKey);
      if (insidePrior !== undefined) {
        await this.#reauthorizeOfflineReceipt(
          insidePrior.output.offlineAudioRefId,
          input.principal,
        );
        if (insidePrior.fingerprint !== requestFingerprint) {
          throw voiceFailure('INVALID_STATE_TRANSITION', 409);
        }
        return insidePrior.output;
      }
      const authorization = await offlineAudioPolicy.attachVerified(input);
      if (
        authorization.mediaPurpose !== 'VOICE_OFFLINE_AUDIO' ||
        authorization.verificationState !== 'VERIFIED' ||
        Date.parse(authorization.expiresAt) <= this.#now()
      ) {
        throw voiceFailure('AUTHORIZATION_DENIED', 403);
      }
      const offlineAudioRefId = this.#randomId();
      const expiresAt = new Date(
        Math.min(Date.parse(authorization.expiresAt), this.#now() + 7 * 24 * 60 * 60_000),
      ).toISOString();
      this.#offlineAudio.set(offlineAudioRefId, {
        offlineAudioRefId,
        attachmentId: authorization.attachmentId,
        assetId: input.assetId,
        localCaptureId: input.localCaptureId,
        sessionId: input.sessionId,
        principal: input.principal,
        audioConsentVersion: input.audioConsentVersion,
        expiresAt,
        state: 'TRANSCRIPTION_PENDING',
      });
      const output = Object.freeze({
        offlineAudioRefId,
        attachmentId: authorization.attachmentId,
        state: 'TRANSCRIPTION_PENDING' as const,
        expiresAt,
      });
      this.#offlineAudioReceipts.set(input.idempotencyKey, {
        fingerprint: requestFingerprint,
        output,
      });
      return output;
    });
  }

  async completeOfflineTranscription(
    offlineAudioRefId: string,
    principal: VoicePrincipal,
  ): Promise<{ readonly state: 'NEEDS_CONFIRMATION'; readonly domainMutationExecuted: false }> {
    const record = this.#offlineAudio.get(offlineAudioRefId);
    if (
      record === undefined ||
      !principalMatchesSession(principal, {
        ...record.principal,
        language: 'en',
        visualRoute: '/',
        contextIds: [],
      })
    ) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    this.#assertSessionPrincipal(record.sessionId, principal);
    if (
      record.state !== 'TRANSCRIPTION_PENDING' ||
      Date.parse(record.expiresAt) <= this.#now() ||
      this.#offlineAudioPolicy === undefined
    ) {
      throw voiceFailure('INVALID_STATE_TRANSITION', 409);
    }
    if (
      !(await this.#offlineAudioPolicy.reauthorize({
        assetId: record.assetId,
        attachmentId: record.attachmentId,
        audioConsentVersion: record.audioConsentVersion,
        principal,
        sessionId: record.sessionId,
      }))
    ) {
      throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
    }
    record.state = 'NEEDS_CONFIRMATION';
    return Object.freeze({ state: 'NEEDS_CONFIRMATION', domainMutationExecuted: false });
  }

  async #reauthorizeOfflineReceipt(
    offlineAudioRefId: string,
    principal: VoicePrincipal,
  ): Promise<void> {
    const record = this.#offlineAudio.get(offlineAudioRefId);
    if (record === undefined || this.#offlineAudioPolicy === undefined) {
      throw voiceFailure('AUTHORIZATION_DENIED', 403);
    }
    this.#assertSessionPrincipal(record.sessionId, principal);
    if (
      !(await this.#offlineAudioPolicy.reauthorize({
        assetId: record.assetId,
        attachmentId: record.attachmentId,
        audioConsentVersion: record.audioConsentVersion,
        principal,
        sessionId: record.sessionId,
      }))
    ) {
      throw voiceFailure('CONSENT_OR_ACCESS_VERSION_CHANGED', 403);
    }
  }

  #validateHttpsAudio(input: Extract<VoiceTurnInput['input'], { readonly type: 'AUDIO' }>): void {
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(input.bytesBase64)
    ) {
      throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
    const bytes = Buffer.from(input.bytesBase64, 'base64');
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_FRAME_BYTES) {
      throw voiceFailure('VOICE_FRAME_TOO_LARGE', 413);
    }
    const matchesContainer =
      input.mimeType === 'audio/wav'
        ? bytes.byteLength >= 12 &&
          bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
          bytes.subarray(8, 12).toString('ascii') === 'WAVE'
        : bytes.byteLength >= 4 &&
          bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!matchesContainer) throw voiceFailure('VOICE_FRAME_INVALID', 400);
    const calculated = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const expectedBytes = Buffer.from(input.sha256, 'utf8');
    const calculatedBytes = Buffer.from(calculated, 'utf8');
    if (
      expectedBytes.length !== calculatedBytes.length ||
      !timingSafeEqual(expectedBytes, calculatedBytes)
    ) {
      throw voiceFailure('VOICE_FRAME_INVALID', 400);
    }
  }

  #assertSessionPrincipal(sessionId: string, principal: VoicePrincipal) {
    return this.#tickets.getSession(sessionId, principal);
  }

  #requiredTransport(sessionId: string): SessionTransportState {
    const state = this.#transport.get(sessionId);
    if (state === undefined) throw voiceFailure('AUTHORIZATION_DENIED', 404);
    return state;
  }

  #serverFrame(
    sessionId: string,
    type: VoiceControlFrame['type'],
    payload: JsonObject,
  ): VoiceControlFrame {
    const sequence = this.#requiredTransport(sessionId).client.nextSendingSequence();
    return Object.freeze({
      protocolVersion: 1,
      sessionId,
      messageId: this.#randomId(),
      sequence,
      acknowledgedSequence: this.#requiredTransport(sessionId).client.highestReceived,
      type,
      payload,
    });
  }

  async #safeCancel(sessionId: string, generation: number): Promise<void> {
    try {
      await this.#provider.cancel({ sessionId, generation });
    } catch {
      // Cancellation is best effort after the local generation is already invalidated.
    }
  }

  async #withIdempotencyLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    const prior = this.#idempotencyLocks.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#idempotencyLocks.set(
      key,
      prior.then(() => held),
    );
    await prior;
    try {
      return await work();
    } finally {
      release();
    }
  }
}
