import { randomUUID } from 'node:crypto';

export const OUTBOX_CLAIM_SQL = `
with candidates as (
  select outbox_id
  from platform.outbox
  where (
      state in ('PENDING', 'FAILED')
      and available_at <= $1
    ) or (
      state = 'CLAIMED'
      and claim_expires_at < $1
    )
  order by available_at, outbox_id
  for update skip locked
  limit $2
)
update platform.outbox as outbox
set state = 'CLAIMED',
    claimed_by = $3,
    claim_expires_at = $4,
    claim_token = $5,
    attempt_count = outbox.attempt_count + 1
from candidates
where outbox.outbox_id = candidates.outbox_id
returning outbox.*
`.trim();

export const OUTBOX_MARK_PUBLISHED_SQL = `
update platform.outbox
set state = 'PUBLISHED',
    published_at = $5,
    claimed_by = null,
    claim_expires_at = null,
    claim_token = null
where outbox_id = $1
  and state = 'CLAIMED'
  and claimed_by = $2
  and claim_token = $3
  and attempt_count = $4
returning outbox_id
`.trim();

export const OUTBOX_MARK_RETRY_SQL = `
update platform.outbox
set state = 'FAILED',
    available_at = $5,
    last_safe_problem_code = $6,
    claimed_by = null,
    claim_expires_at = null,
    claim_token = null
where outbox_id = $1
  and state = 'CLAIMED'
  and claimed_by = $2
  and claim_token = $3
  and attempt_count = $4
returning outbox_id
`.trim();

export interface ClaimedOutboxEntry {
  outboxId: string;
  integrationEventId: string;
  destination: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  attemptCount: number;
  claimedBy: string;
  claimToken: string;
}

export interface OutboxClaimDispositionInput {
  outboxId: string;
  workerId: string;
  claimToken: string;
  attemptCount: number;
}

export interface OutboxTransaction {
  claim(input: {
    now: Date;
    limit: number;
    workerId: string;
    claimExpiresAt: Date;
    claimToken: string;
  }): Promise<readonly ClaimedOutboxEntry[]>;
  markPublished(input: OutboxClaimDispositionInput & { publishedAt: Date }): Promise<boolean>;
  markRetry(
    input: OutboxClaimDispositionInput & { availableAt: Date; safeProblemCode: string },
  ): Promise<boolean>;
}

export interface OutboxStore {
  transaction<Result>(work: (transaction: OutboxTransaction) => Promise<Result>): Promise<Result>;
}

export interface Publisher {
  publish(entry: ClaimedOutboxEntry): Promise<void>;
}

export async function claimOutbox(
  store: OutboxStore,
  input: {
    now: Date;
    limit: number;
    workerId: string;
    leaseMilliseconds: number;
    claimToken?: string;
  },
): Promise<readonly ClaimedOutboxEntry[]> {
  const claimExpiresAt = new Date(input.now.getTime() + input.leaseMilliseconds);
  return store.transaction((transaction) =>
    transaction.claim({
      now: input.now,
      limit: input.limit,
      workerId: input.workerId,
      claimExpiresAt,
      claimToken: input.claimToken ?? randomUUID(),
    }),
  );
}

export async function publishClaimedEntry(
  store: OutboxStore,
  publisher: Publisher,
  entry: ClaimedOutboxEntry,
  now: Date,
): Promise<'PUBLISHED' | 'RETRY' | 'STALE_CLAIM'> {
  const claim = {
    outboxId: entry.outboxId,
    workerId: entry.claimedBy,
    claimToken: entry.claimToken,
    attemptCount: entry.attemptCount,
  };
  try {
    await publisher.publish(entry);
  } catch {
    const marked = await store.transaction((transaction) =>
      transaction.markRetry({
        ...claim,
        availableAt: new Date(now.getTime() + retryDelayMilliseconds(entry.attemptCount)),
        safeProblemCode: 'PROVIDER_UNAVAILABLE',
      }),
    );
    return marked ? 'RETRY' : 'STALE_CLAIM';
  }

  const marked = await store.transaction((transaction) =>
    transaction.markPublished({ ...claim, publishedAt: now }),
  );
  return marked ? 'PUBLISHED' : 'STALE_CLAIM';
}

export interface InboxEvent {
  eventId: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface InboxDisposition {
  state: 'APPLIED' | 'REJECTED';
  safeCode: string;
}

export interface InboxTransaction {
  start(consumerName: string, eventId: string): Promise<InboxDisposition | 'NEW'>;
  complete(consumerName: string, eventId: string, disposition: InboxDisposition): Promise<void>;
}

export interface InboxStore {
  transaction<Result>(work: (transaction: InboxTransaction) => Promise<Result>): Promise<Result>;
}

export async function consumeExactlyOnceEffect(
  store: InboxStore,
  consumerName: string,
  event: InboxEvent,
  applyEffect: (transaction: InboxTransaction, event: InboxEvent) => Promise<InboxDisposition>,
): Promise<InboxDisposition> {
  return store.transaction(async (transaction) => {
    const existing = await transaction.start(consumerName, event.eventId);
    if (existing !== 'NEW') return existing;
    const disposition = await applyEffect(transaction, event);
    await transaction.complete(consumerName, event.eventId, disposition);
    return disposition;
  });
}

function retryDelayMilliseconds(attemptCount: number): number {
  const boundedAttempt = Math.max(1, Math.min(attemptCount, 8));
  return 1_000 * 2 ** (boundedAttempt - 1);
}
