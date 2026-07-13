import { describe, expect, it, vi } from 'vitest';

import {
  OUTBOX_CLAIM_SQL,
  OUTBOX_MARK_PUBLISHED_SQL,
  OUTBOX_MARK_RETRY_SQL,
  claimOutbox,
  consumeExactlyOnceEffect,
  publishClaimedEntry,
  type ClaimedOutboxEntry,
  type InboxDisposition,
  type InboxStore,
  type OutboxClaimDispositionInput,
  type OutboxStore,
} from './index';

const entry: ClaimedOutboxEntry = {
  outboxId: 'outbox-1',
  integrationEventId: 'event-1',
  destination: 'test',
  eventType: 'consent.decision_recorded',
  payload: { accessVersion: 2 },
  attemptCount: 1,
  claimedBy: 'worker-1',
  claimToken: '00000000-0000-4000-8000-000000000001',
};

describe('outbox delivery', () => {
  it('uses short skip-locked claims', () => {
    expect(OUTBOX_CLAIM_SQL).toContain('for update skip locked');
    expect(OUTBOX_CLAIM_SQL).toContain('limit $2');
    expect(OUTBOX_CLAIM_SQL).toContain('claim_token = $5');
    expect(OUTBOX_CLAIM_SQL).toContain("state = 'CLAIMED'");
    expect(OUTBOX_CLAIM_SQL).toContain('claim_expires_at < $1');
    for (const statement of [OUTBOX_MARK_PUBLISHED_SQL, OUTBOX_MARK_RETRY_SQL]) {
      expect(statement).toContain('claimed_by = $2');
      expect(statement).toContain('claim_token = $3');
      expect(statement).toContain('attempt_count = $4');
      expect(statement).toContain('claim_token = null');
    }
  });

  it('claims inside one transaction and returns before provider I/O', async () => {
    const claim = vi.fn(() => Promise.resolve([entry]));
    const store: OutboxStore = {
      transaction: (work) =>
        work({
          claim,
          markPublished: vi.fn(() => Promise.resolve(true)),
          markRetry: vi.fn(() => Promise.resolve(true)),
        }),
    };
    await expect(
      claimOutbox(store, {
        now: new Date('2026-07-13T08:00:00Z'),
        limit: 10,
        workerId: 'worker-1',
        leaseMilliseconds: 5_000,
        claimToken: entry.claimToken,
      }),
    ).resolves.toEqual([entry]);
    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({
        workerId: 'worker-1',
        limit: 10,
        claimToken: entry.claimToken,
      }),
    );
  });

  it('publishes outside a transaction and acknowledges afterward', async () => {
    const calls: string[] = [];
    const store: OutboxStore = {
      transaction: (work) => {
        calls.push('transaction');
        return work({
          claim: vi.fn(),
          markPublished: () => {
            calls.push('published');
            return Promise.resolve(true);
          },
          markRetry: vi.fn(() => Promise.resolve(true)),
        });
      },
    };
    await publishClaimedEntry(
      store,
      {
        publish: () => {
          calls.push('network');
          return Promise.resolve();
        },
      },
      entry,
      new Date('2026-07-13T08:00:00Z'),
    );
    expect(calls).toEqual(['network', 'transaction', 'published']);
  });

  it('records a safe retry after publisher failure', async () => {
    const markRetry = vi.fn(() => Promise.resolve(true));
    const store: OutboxStore = {
      transaction: (work) =>
        work({
          claim: vi.fn(),
          markPublished: vi.fn(() => Promise.resolve(true)),
          markRetry,
        }),
    };
    await expect(
      publishClaimedEntry(
        store,
        { publish: () => Promise.reject(new Error('secret provider response')) },
        entry,
        new Date('2026-07-13T08:00:00Z'),
      ),
    ).resolves.toBe('RETRY');
    expect(markRetry).toHaveBeenCalledWith({
      outboxId: 'outbox-1',
      workerId: 'worker-1',
      claimToken: entry.claimToken,
      attemptCount: 1,
      availableAt: new Date('2026-07-13T08:00:01Z'),
      safeProblemCode: 'PROVIDER_UNAVAILABLE',
    });
  });

  it('does not let an expired worker acknowledge a reclaimed entry', async () => {
    const currentClaim = {
      workerId: 'worker-2',
      claimToken: '00000000-0000-4000-8000-000000000002',
      attemptCount: 2,
    };
    const markPublished = vi.fn((input: OutboxClaimDispositionInput & { publishedAt: Date }) =>
      Promise.resolve(
        input.workerId === currentClaim.workerId &&
          input.claimToken === currentClaim.claimToken &&
          input.attemptCount === currentClaim.attemptCount,
      ),
    );
    const store: OutboxStore = {
      transaction: (work) =>
        work({
          claim: vi.fn(),
          markPublished,
          markRetry: () => Promise.resolve(false),
        }),
    };

    await expect(
      publishClaimedEntry(
        store,
        { publish: () => Promise.resolve() },
        entry,
        new Date('2026-07-13T08:00:10Z'),
      ),
    ).resolves.toBe('STALE_CLAIM');
    expect(markPublished).toHaveBeenCalledWith(
      expect.objectContaining({ workerId: 'worker-1', claimToken: entry.claimToken }),
    );
  });
});

describe('consumer inbox', () => {
  it('commits inbox, owned effect and disposition in one transaction', async () => {
    const dispositions = new Map<string, InboxDisposition>();
    let transactions = 0;
    const store: InboxStore = {
      transaction: (work) => {
        transactions += 1;
        return work({
          start: (consumerName, eventId) =>
            Promise.resolve(dispositions.get(`${consumerName}:${eventId}`) ?? 'NEW'),
          complete: (consumerName, eventId, disposition) => {
            dispositions.set(`${consumerName}:${eventId}`, disposition);
            return Promise.resolve();
          },
        });
      },
    };
    const effect = vi.fn(() => Promise.resolve({ state: 'APPLIED', safeCode: 'OK' } as const));
    const event = { eventId: 'event-1', eventType: 'test', payload: {} };
    await expect(consumeExactlyOnceEffect(store, 'consumer', event, effect)).resolves.toEqual({
      state: 'APPLIED',
      safeCode: 'OK',
    });
    await consumeExactlyOnceEffect(store, 'consumer', event, effect);
    expect(effect).toHaveBeenCalledTimes(1);
    expect(transactions).toBe(2);
  });
});
