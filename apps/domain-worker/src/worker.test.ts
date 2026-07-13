import type { ClaimedOutboxEntry, OutboxTransaction } from '@smart-fasal/events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OutboxPublisherWorker,
  type ReadinessAwareOutboxStore,
  type ReadinessAwarePublisher,
  type SafeWorkerEvent,
} from './worker.js';

const NOW = new Date('2026-07-13T08:00:00.000Z');
const ENTRY: ClaimedOutboxEntry = {
  attemptCount: 1,
  claimedBy: 'domain-worker:test',
  claimToken: '00000000-0000-4000-8000-000000000001',
  destination: 'provider-test',
  eventType: 'consent.decision_recorded',
  integrationEventId: '00000000-0000-4000-8000-000000000002',
  outboxId: '00000000-0000-4000-8000-000000000003',
  payload: { privateValueThatMustNotBeLogged: 'secret-payload-value' },
};

interface StoreHarnessOptions {
  readonly entries?: readonly ClaimedOutboxEntry[];
  readonly markPublished?: boolean;
  readonly markRetry?: boolean;
}

function createStoreHarness(options: StoreHarnessOptions = {}) {
  const calls: string[] = [];
  let transactionActive = false;
  const claim = vi.fn(() => Promise.resolve(options.entries ?? [ENTRY]));
  const markPublished = vi.fn(() => Promise.resolve(options.markPublished ?? true));
  const markRetry = vi.fn(() => Promise.resolve(options.markRetry ?? true));
  const transactionObserved = vi.fn();
  async function transaction<Result>(
    work: (transaction: OutboxTransaction) => Promise<Result>,
  ): Promise<Result> {
    transactionObserved();
    calls.push('transaction:start');
    transactionActive = true;
    try {
      return await work({ claim, markPublished, markRetry });
    } finally {
      transactionActive = false;
      calls.push('transaction:end');
    }
  }
  const checkReadiness = vi.fn(() => Promise.resolve({ available: true } as const));
  const store: ReadinessAwareOutboxStore = {
    checkReadiness,
    close: () => Promise.resolve(),
    transaction,
  };
  return {
    calls,
    checkReadiness,
    claim,
    isTransactionActive: () => transactionActive,
    markPublished,
    markRetry,
    store,
    transaction: transactionObserved,
  };
}

function readyPublisher(
  publish: ReadinessAwarePublisher['publish'] = () => Promise.resolve(),
): ReadinessAwarePublisher {
  return {
    checkReadiness: () => Promise.resolve({ available: true }),
    publish,
  };
}

function createWorker(options: {
  readonly publisher: ReadinessAwarePublisher;
  readonly store: ReadinessAwareOutboxStore;
  readonly emitSafeEvent?: (event: SafeWorkerEvent) => void;
  readonly operationTimeoutMilliseconds?: number;
  readonly pollIntervalMilliseconds?: number;
  readonly maximumBackoffMilliseconds?: number;
}) {
  return new OutboxPublisherWorker({
    batchSize: 10,
    leaseMilliseconds: 5_000,
    maximumBackoffMilliseconds: options.maximumBackoffMilliseconds ?? 1_000,
    now: () => NOW,
    operationTimeoutMilliseconds: options.operationTimeoutMilliseconds ?? 100,
    pollIntervalMilliseconds: options.pollIntervalMilliseconds ?? 100,
    publisher: options.publisher,
    store: options.store,
    workerId: 'domain-worker:test',
    ...(options.emitSafeEvent === undefined ? {} : { emitSafeEvent: options.emitSafeEvent }),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('outbox publisher orchestration', () => {
  it('claims in a short transaction, publishes outside it, then fences acknowledgement', async () => {
    const harness = createStoreHarness();
    const publish = vi.fn(() => {
      expect(harness.isTransactionActive()).toBe(false);
      harness.calls.push('provider:publish');
      return Promise.resolve();
    });
    const safeEvents: SafeWorkerEvent[] = [];
    const worker = createWorker({
      emitSafeEvent: (event) => safeEvents.push(event),
      publisher: readyPublisher(publish),
      store: harness.store,
    });

    await expect(worker.pollOnce()).resolves.toEqual({
      claimedCount: 1,
      publishedCount: 1,
      retryCount: 0,
      staleClaimCount: 0,
      state: 'DELIVERED',
    });

    expect(harness.calls).toEqual([
      'transaction:start',
      'transaction:end',
      'provider:publish',
      'transaction:start',
      'transaction:end',
    ]);
    expect(harness.markPublished).toHaveBeenCalledWith({
      attemptCount: 1,
      claimToken: ENTRY.claimToken,
      outboxId: ENTRY.outboxId,
      publishedAt: NOW,
      workerId: 'domain-worker:test',
    });
    expect(JSON.stringify(safeEvents)).not.toContain('secret-payload-value');
    expect(safeEvents).toEqual([
      {
        claimedCount: 1,
        eventName: 'domain_worker.outbox_poll',
        publishedCount: 1,
        retryCount: 0,
        staleClaimCount: 0,
        state: 'DELIVERED',
      },
    ]);
  });

  it('records a bounded safe retry after publisher failure without logging raw errors', async () => {
    const harness = createStoreHarness();
    const safeEvents: SafeWorkerEvent[] = [];
    const worker = createWorker({
      emitSafeEvent: (event) => safeEvents.push(event),
      publisher: readyPublisher(() =>
        Promise.reject(new Error('secret provider response with protected payload')),
      ),
      store: harness.store,
    });

    await expect(worker.pollOnce()).resolves.toMatchObject({
      retryCount: 1,
      state: 'PUBLISH_RETRY',
    });
    expect(harness.markRetry).toHaveBeenCalledWith({
      attemptCount: 1,
      availableAt: new Date('2026-07-13T08:00:01.000Z'),
      claimToken: ENTRY.claimToken,
      outboxId: ENTRY.outboxId,
      safeProblemCode: 'PROVIDER_UNAVAILABLE',
      workerId: 'domain-worker:test',
    });
    expect(safeEvents.at(-1)).toMatchObject({
      safeProblemCode: 'PUBLISH_ATTEMPT_FAILED',
      state: 'PUBLISH_RETRY',
    });
    expect(JSON.stringify(safeEvents)).not.toContain('secret provider response');
  });

  it('reports a stale fenced claim without overwriting the newer owner', async () => {
    const harness = createStoreHarness({ markPublished: false });
    const worker = createWorker({ publisher: readyPublisher(), store: harness.store });

    await expect(worker.pollOnce()).resolves.toEqual({
      claimedCount: 1,
      publishedCount: 0,
      retryCount: 0,
      staleClaimCount: 1,
      state: 'STALE_CLAIM',
    });
    expect(harness.markPublished).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptCount: ENTRY.attemptCount,
        claimToken: ENTRY.claimToken,
        workerId: ENTRY.claimedBy,
      }),
    );
  });

  it('never checks or claims the store while the publisher dependency is unavailable', async () => {
    const harness = createStoreHarness();
    const publisher: ReadinessAwarePublisher = {
      checkReadiness: () => Promise.resolve({ available: false, code: 'PUBLISHER_UNAVAILABLE' }),
      publish: vi.fn(),
    };
    const worker = createWorker({ publisher, store: harness.store });

    await expect(worker.pollOnce()).resolves.toMatchObject({
      claimedCount: 0,
      state: 'DEPENDENCY_UNAVAILABLE',
    });
    expect(harness.checkReadiness).not.toHaveBeenCalled();
    expect(harness.transaction).not.toHaveBeenCalled();
  });
});

describe('polling lifecycle', () => {
  it('times out a hanging publish, marks retry, and stops without taking another claim', async () => {
    vi.useFakeTimers();
    const harness = createStoreHarness();
    const publish = vi.fn(() => new Promise<void>(() => undefined));
    const worker = createWorker({
      operationTimeoutMilliseconds: 50,
      pollIntervalMilliseconds: 100,
      publisher: readyPublisher(publish),
      store: harness.store,
    });

    await worker.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(publish).toHaveBeenCalledTimes(1);
    const stopping = worker.stop();
    await vi.advanceTimersByTimeAsync(50);
    await stopping;

    expect(harness.markRetry).toHaveBeenCalledTimes(1);
    expect(harness.claim).toHaveBeenCalledTimes(1);
    expect(worker.isReady).toBe(false);
    expect(worker.readiness).toEqual({ code: 'WORKER_STOPPED', state: 'UNAVAILABLE' });
  });

  it('uses bounded dependency backoff and remains restart-safe', async () => {
    vi.useFakeTimers();
    const harness = createStoreHarness();
    const checkReadiness = vi.fn(() =>
      Promise.resolve({ available: false, code: 'PUBLISHER_UNAVAILABLE' } as const),
    );
    const publisher: ReadinessAwarePublisher = {
      checkReadiness,
      publish: vi.fn(),
    };
    const worker = createWorker({
      maximumBackoffMilliseconds: 250,
      pollIntervalMilliseconds: 100,
      publisher,
      store: harness.store,
    });

    await worker.start();
    expect(checkReadiness).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(199);
    expect(checkReadiness).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(checkReadiness).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(249);
    expect(checkReadiness).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(checkReadiness).toHaveBeenCalledTimes(3);

    await worker.stop();
    await worker.stop();
    expect(harness.transaction).not.toHaveBeenCalled();
  });
});
