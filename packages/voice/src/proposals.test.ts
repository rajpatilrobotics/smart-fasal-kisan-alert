import { describe, expect, it, vi } from 'vitest';

import {
  canonicalPayloadHash,
  InMemoryVoiceProposalStore,
  type DomainMutationExecutor,
} from './proposals.js';
import type { VoicePrincipal } from './tickets.js';

const principal: VoicePrincipal = {
  environment: 'local',
  subjectId: '019f5678-1234-7000-8000-000000000002',
  roleContextId: '019f5678-1234-7000-8000-000000000003',
  roleType: 'FARMER',
  origin: 'http://localhost:3000',
  authorizationVersion: 7,
  devicePartitionId: '019f5678-1234-7000-8000-000000000004',
};
const SESSION_ID = '019f5678-1234-7000-8000-000000000001';
const COMMAND_ID = '019f5678-1234-7000-8000-000000000010';

function setup(now = Date.parse('2026-07-13T00:00:00.000Z')) {
  const execute = vi.fn<DomainMutationExecutor['execute']>().mockResolvedValue({
    accepted: true,
    receiptReference: '019f5678-1234-7000-8000-000000000020',
  });
  let id = 30;
  const reauthorize = vi.fn().mockResolvedValue(true);
  const store = new InMemoryVoiceProposalStore({
    executor: { execute },
    policy: { reauthorize },
    registeredToolKeys: ['farmer.test.write'],
    now: () => now,
    randomId: () => `019f5678-1234-7000-8000-${String(id++).padStart(12, '0')}`,
  });
  return { execute, reauthorize, store };
}

function proposal(store: InMemoryVoiceProposalStore, expiresAt = '2026-07-13T00:10:00.000Z') {
  return store.create({
    sessionId: SESSION_ID,
    principal,
    toolKey: 'farmer.test.write',
    payload: { scope: 'VOICE', value: 1 },
    readBack: { message: 'Test only' },
    expiresAt,
  });
}

describe('persisted exact-hash voice proposals', () => {
  it('reauthorizes an exact receipt replay before disclosing it', async () => {
    const { reauthorize, store } = setup();
    const created = proposal(store);
    const input = {
      proposalId: created.proposalId,
      expectedProposalRevision: created.revision,
      payloadHash: created.payloadHash,
      commandId: COMMAND_ID,
      idempotencyKey: COMMAND_ID,
      principal,
    };
    await store.confirm(input);

    await expect(
      store.confirm({
        ...input,
        principal: { ...principal, devicePartitionId: SESSION_ID },
      }),
    ).rejects.toThrow('AUTHORIZATION_DENIED');
    reauthorize.mockResolvedValue(false);
    await expect(store.confirm(input)).rejects.toThrow('AUTHORIZATION_DENIED');
  });

  it('confirms the stored hash at most once and replays the same receipt', async () => {
    const { execute, store } = setup();
    const created = proposal(store);
    const input = {
      proposalId: created.proposalId,
      expectedProposalRevision: created.revision,
      payloadHash: created.payloadHash,
      commandId: COMMAND_ID,
      idempotencyKey: COMMAND_ID,
      principal,
    };

    const first = await store.confirm(input);
    const replay = await store.confirm(input);

    expect(first).toEqual(replay);
    expect(first.state).toBe('ACCEPTED');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        commandId: COMMAND_ID,
        payload: { scope: 'VOICE', value: 1 },
      }),
    );
  });

  it('rejects a changed hash, changed actor and changed access version without mutation', async () => {
    const { execute, store } = setup();
    const created = proposal(store);

    await expect(
      store.confirm({
        proposalId: created.proposalId,
        expectedProposalRevision: 0,
        payloadHash: canonicalPayloadHash({ changed: true }),
        commandId: COMMAND_ID,
        idempotencyKey: COMMAND_ID,
        principal,
      }),
    ).rejects.toThrow('VOICE_PROPOSAL_HASH_MISMATCH');
    await expect(
      store.confirm({
        proposalId: created.proposalId,
        expectedProposalRevision: 0,
        payloadHash: created.payloadHash,
        commandId: COMMAND_ID,
        idempotencyKey: COMMAND_ID,
        principal: { ...principal, authorizationVersion: 8 },
      }),
    ).rejects.toThrow('CONSENT_OR_ACCESS_VERSION_CHANGED');
    expect(() => store.get(created.proposalId, { ...principal, subjectId: SESSION_ID })).toThrow(
      'AUTHORIZATION_DENIED',
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('never executes cancelled, corrected, expired or merely unconfirmed proposals', async () => {
    const { execute, store } = setup();
    const unconfirmed = proposal(store);
    expect(store.get(unconfirmed.proposalId, principal).state).toBe('PENDING');

    const cancelled = proposal(store);
    const cancelledResult = await store.cancel({
      proposalId: cancelled.proposalId,
      expectedProposalRevision: 0,
      commandId: COMMAND_ID,
      idempotencyKey: COMMAND_ID,
      principal,
    });
    expect(cancelledResult.state).toBe('CANCELLED');

    const corrected = proposal(store);
    const replacement = await store.correct({
      proposalId: corrected.proposalId,
      expectedProposalRevision: 0,
      commandId: '019f5678-1234-7000-8000-000000000011',
      idempotencyKey: '019f5678-1234-7000-8000-000000000011',
      correction: { corrected: true },
      principal,
    });
    expect(store.get(corrected.proposalId, principal).state).toBe('SUPERSEDED');
    expect(replacement.state).toBe('PENDING');

    expect(() => proposal(store, '2026-07-12T23:59:59.000Z')).toThrow('VOICE_PROPOSAL_EXPIRED');
    expect(execute).not.toHaveBeenCalled();
  });
});
