import { describe, expect, it, vi } from 'vitest';

import { InMemoryVoiceProposalStore } from './proposals.js';
import {
  MAX_AUDIO_FRAME_BYTES,
  MAX_AUDIO_FRAME_DURATION_MS,
  type ProviderInterpretation,
  type VoiceProvider,
  VoiceTransportService,
} from './orchestrator.js';
import { InMemoryVoiceTicketStore, type VoiceTicketBinding } from './tickets.js';

const binding: VoiceTicketBinding = {
  environment: 'local',
  subjectId: '019f5678-1234-7000-8000-000000000002',
  roleContextId: '019f5678-1234-7000-8000-000000000003',
  roleType: 'FARMER',
  origin: 'http://localhost:3000',
  authorizationVersion: 7,
  devicePartitionId: '019f5678-1234-7000-8000-000000000004',
  language: 'mr',
  visualRoute: '/farmer/today',
  contextIds: [],
};
const principal = binding;

function createService(provider?: VoiceProvider, offlineReauthorize = true) {
  let id = 1;
  const randomId = () => `019f5678-1234-7000-8000-${String(id++).padStart(12, '0')}`;
  const tickets = new InMemoryVoiceTicketStore({ randomId });
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
    ...(provider === undefined ? {} : { provider }),
    offlineAudioPolicy: {
      attachVerified: vi.fn().mockResolvedValue({
        attachmentId: '019f5678-1234-7000-8000-000000000090',
        expiresAt: '2099-07-20T00:00:00.000Z',
        mediaPurpose: 'VOICE_OFFLINE_AUDIO',
        verificationState: 'VERIFIED',
      }),
      reauthorize: vi.fn().mockResolvedValue(offlineReauthorize),
    },
  });
  return { execute, service, tickets };
}

describe('bounded voice transport', () => {
  it('offers help but reports provider/tool outage honestly through the shared turn path', async () => {
    const { service } = createService();
    const session = service.createSession(binding).session;

    await expect(
      service.processTurn(session.sessionId, principal, {
        turnId: '019f5678-1234-7000-8000-000000000010',
        input: { type: 'TEXT', text: 'मदत' },
        clientSequence: 1,
        acknowledgedServerSequence: 0,
      }),
    ).resolves.toMatchObject({ state: 'HELP', messageKey: 'voice.help' });
    await expect(
      service.processTurn(session.sessionId, principal, {
        turnId: '019f5678-1234-7000-8000-000000000011',
        input: { type: 'TEXT', text: 'do something' },
        clientSequence: 2,
        acknowledgedServerSequence: 1,
      }),
    ).resolves.toMatchObject({
      state: 'UNAVAILABLE',
      messageKey: 'voice.action_unavailable_use_touch_or_text',
    });
  });

  it('invalidates unfinished provider work on reconnect and does not create a proposal', async () => {
    let resolveProvider: ((value: ProviderInterpretation) => void) | undefined;
    const cancel = vi.fn().mockResolvedValue(undefined);
    const provider: VoiceProvider = {
      interpret: vi.fn<VoiceProvider['interpret']>(
        () =>
          new Promise<ProviderInterpretation>((resolve) => {
            resolveProvider = resolve;
          }),
      ),
      cancel,
    };
    const { service } = createService(provider);
    const issued = service.createSession(binding);
    const pending = service.processTurn(issued.session.sessionId, principal, {
      turnId: '019f5678-1234-7000-8000-000000000010',
      input: { type: 'TEXT', text: 'change state' },
      clientSequence: 1,
      acknowledgedServerSequence: 0,
    });

    await service.reconnect(issued.session.sessionId, binding);
    resolveProvider?.({
      kind: 'TOOL_PROPOSAL',
      messageKey: 'unsafe',
      toolKey: 'unregistered.write',
      payload: { changed: true },
      readBack: { changed: true },
    });

    await expect(pending).resolves.toMatchObject({ state: 'UNAVAILABLE' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not disguise a genuine provider adapter defect as ordinary Unavailable', async () => {
    const provider: VoiceProvider = {
      interpret: vi.fn().mockRejectedValue(new Error('adapter defect')),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const { service } = createService(provider);
    const session = service.createSession(binding).session;
    await expect(
      service.processTurn(session.sessionId, principal, {
        turnId: '019f5678-1234-7000-8000-000000000012',
        input: { type: 'TEXT', text: 'do something' },
        clientSequence: 1,
        acknowledgedServerSequence: 0,
      }),
    ).rejects.toThrow('adapter defect');
  });

  it('acknowledges duplicates, requests bounded resync on gaps and rejects oversized audio', async () => {
    const { service } = createService();
    const session = service.createSession(binding).session;
    const base = {
      protocolVersion: 1 as const,
      sessionId: session.sessionId,
      messageId: '019f5678-1234-7000-8000-000000000010',
      acknowledgedSequence: 0,
      type: 'session.start' as const,
      payload: {},
    };
    await expect(
      service.handleControlFrame(principal, { ...base, sequence: 1 }),
    ).resolves.toMatchObject({
      type: 'session.ready',
    });
    await expect(
      service.handleControlFrame(principal, { ...base, sequence: 1 }),
    ).resolves.toMatchObject({
      type: 'transport.ack',
      payload: { highestContiguousSequence: 1 },
    });
    await expect(
      service.handleControlFrame(principal, { ...base, sequence: 3 }),
    ).resolves.toMatchObject({
      type: 'transport.resync_request',
      payload: { expectedSequence: 2 },
    });
    expect(() => {
      service.acceptAudioFrame(
        session.sessionId,
        principal,
        new Uint8Array(MAX_AUDIO_FRAME_BYTES + 1),
      );
    }).toThrow('VOICE_FRAME_TOO_LARGE');
    const boundedAudio = new Uint8Array(8);
    new DataView(boundedAudio.buffer).setUint32(0, MAX_AUDIO_FRAME_DURATION_MS, false);
    expect(() => {
      service.acceptAudioFrame(session.sessionId, principal, boundedAudio);
    }).not.toThrow();
    new DataView(boundedAudio.buffer).setUint32(0, MAX_AUDIO_FRAME_DURATION_MS + 1, false);
    expect(() => {
      service.acceptAudioFrame(session.sessionId, principal, boundedAudio);
    }).toThrow('VOICE_FRAME_INVALID');
  });

  it('moves offline audio only to Needs Confirmation and executes no domain mutation', async () => {
    const { execute, service } = createService();
    const session = service.createSession(binding).session;
    const attached = await service.attachOfflineAudio({
      assetId: '019f5678-1234-7000-8000-000000000050',
      audioConsentVersion: 3,
      expectedSessionRevision: 0,
      language: 'mr',
      idempotencyKey: '019f5678-1234-7000-8000-000000000099',
      localCaptureId: '019f5678-1234-7000-8000-000000000051',
      sessionId: session.sessionId,
      principal,
    });
    expect(attached.state).toBe('TRANSCRIPTION_PENDING');
    await expect(
      service.completeOfflineTranscription(attached.offlineAudioRefId, principal),
    ).resolves.toEqual({
      state: 'NEEDS_CONFIRMATION',
      domainMutationExecuted: false,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not advance offline transcription after consent or access withdrawal', async () => {
    const { execute, service } = createService(undefined, false);
    const session = service.createSession(binding).session;
    const input = {
      assetId: '019f5678-1234-7000-8000-000000000060',
      audioConsentVersion: 3,
      expectedSessionRevision: 0,
      language: 'mr',
      idempotencyKey: '019f5678-1234-7000-8000-000000000061',
      localCaptureId: '019f5678-1234-7000-8000-000000000062',
      sessionId: session.sessionId,
      principal,
    } as const;
    const attached = await service.attachOfflineAudio(input);
    await expect(service.attachOfflineAudio(input)).rejects.toThrow(
      'CONSENT_OR_ACCESS_VERSION_CHANGED',
    );
    await expect(
      service.completeOfflineTranscription(attached.offlineAudioRefId, principal),
    ).rejects.toThrow('CONSENT_OR_ACCESS_VERSION_CHANGED');
    expect(execute).not.toHaveBeenCalled();
  });
});
