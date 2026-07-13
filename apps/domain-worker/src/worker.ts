import {
  claimOutbox,
  publishClaimedEntry,
  type OutboxStore,
  type Publisher,
} from '@smart-fasal/events';

export type DependencyUnavailableCode =
  | 'DATABASE_CONFIGURATION_INVALID'
  | 'DATABASE_CONFIGURATION_MISSING'
  | 'OUTBOX_STORE_UNAVAILABLE'
  | 'PUBLISHER_UNAVAILABLE'
  | 'ROLE_POSTURE_INVALID';

export type DependencyReadiness =
  | { readonly available: true }
  | { readonly available: false; readonly code: DependencyUnavailableCode };

export interface ReadinessAwareOutboxStore extends OutboxStore {
  checkReadiness(): Promise<DependencyReadiness>;
  close(): Promise<void>;
}

export interface ReadinessAwarePublisher extends Publisher {
  checkReadiness(): Promise<DependencyReadiness>;
}

export type WorkerUnavailableCode =
  | DependencyUnavailableCode
  | 'PUBLISH_ATTEMPT_FAILED'
  | 'WORKER_STARTING'
  | 'WORKER_STOPPED'
  | 'WORKER_STOPPING';

export type WorkerReadiness =
  | { readonly state: 'READY' }
  | { readonly state: 'UNAVAILABLE'; readonly code: WorkerUnavailableCode };

export type PollState =
  'DELIVERED' | 'DEPENDENCY_UNAVAILABLE' | 'EMPTY' | 'PUBLISH_RETRY' | 'STALE_CLAIM' | 'STOPPED';

export interface PollSummary {
  readonly state: PollState;
  readonly claimedCount: number;
  readonly publishedCount: number;
  readonly retryCount: number;
  readonly staleClaimCount: number;
}

export interface SafeWorkerEvent extends PollSummary {
  readonly eventName: 'domain_worker.outbox_poll';
  readonly safeProblemCode?: WorkerUnavailableCode;
}

export interface OutboxPublisherWorkerOptions {
  readonly batchSize: number;
  readonly leaseMilliseconds: number;
  readonly maximumBackoffMilliseconds: number;
  readonly operationTimeoutMilliseconds: number;
  readonly pollIntervalMilliseconds: number;
  readonly publisher: ReadinessAwarePublisher;
  readonly store: ReadinessAwareOutboxStore;
  readonly workerId: string;
  readonly emitSafeEvent?: (event: SafeWorkerEvent) => void;
  readonly now?: () => Date;
}

const EMPTY_COUNTS = {
  claimedCount: 0,
  publishedCount: 0,
  retryCount: 0,
  staleClaimCount: 0,
} as const;

class OperationTimeout extends Error {
  constructor() {
    super('DOMAIN_WORKER_OPERATION_TIMEOUT');
  }
}

function withTimeout<Result>(
  operation: () => Promise<Result>,
  milliseconds: number,
): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new OperationTimeout());
    }, milliseconds);
    void operation()
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timeout);
      });
  });
}

function waitFor(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const complete = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', complete);
      resolve();
    };
    const timeout = setTimeout(complete, milliseconds);
    signal.addEventListener('abort', complete, { once: true });
  });
}

function unavailableSummary(): PollSummary {
  return { ...EMPTY_COUNTS, state: 'DEPENDENCY_UNAVAILABLE' };
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

export class OutboxPublisherWorker {
  readonly #batchSize: number;
  readonly #emitSafeEvent: (event: SafeWorkerEvent) => void;
  readonly #leaseMilliseconds: number;
  readonly #maximumBackoffMilliseconds: number;
  readonly #now: () => Date;
  readonly #operationTimeoutMilliseconds: number;
  readonly #pollIntervalMilliseconds: number;
  readonly #publisher: ReadinessAwarePublisher;
  readonly #store: ReadinessAwareOutboxStore;
  readonly #workerId: string;

  #abortController: AbortController | undefined;
  #loop: Promise<void> | undefined;
  #pollInFlight: Promise<PollSummary> | undefined;
  #readiness: WorkerReadiness = { state: 'UNAVAILABLE', code: 'WORKER_STOPPED' };
  #state: 'running' | 'starting' | 'stopped' | 'stopping' = 'stopped';

  constructor(options: OutboxPublisherWorkerOptions) {
    this.#batchSize = options.batchSize;
    this.#emitSafeEvent = options.emitSafeEvent ?? (() => undefined);
    this.#leaseMilliseconds = options.leaseMilliseconds;
    this.#maximumBackoffMilliseconds = options.maximumBackoffMilliseconds;
    this.#now = options.now ?? (() => new Date());
    this.#operationTimeoutMilliseconds = options.operationTimeoutMilliseconds;
    this.#pollIntervalMilliseconds = options.pollIntervalMilliseconds;
    this.#publisher = options.publisher;
    this.#store = options.store;
    this.#workerId = options.workerId;
  }

  get isReady(): boolean {
    return this.readiness.state === 'READY';
  }

  get readiness(): WorkerReadiness {
    if (this.#state === 'starting') {
      return { state: 'UNAVAILABLE', code: 'WORKER_STARTING' };
    }
    if (this.#state === 'stopping') {
      return { state: 'UNAVAILABLE', code: 'WORKER_STOPPING' };
    }
    if (this.#state === 'stopped') {
      return { state: 'UNAVAILABLE', code: 'WORKER_STOPPED' };
    }
    return this.#readiness;
  }

  async start(): Promise<void> {
    if (this.#state !== 'stopped') return;
    this.#state = 'starting';
    this.#readiness = { state: 'UNAVAILABLE', code: 'WORKER_STARTING' };
    const controller = new AbortController();
    this.#abortController = controller;

    const dependencyReadiness = await this.#checkDependencies();
    if (controller.signal.aborted) {
      this.#state = 'stopped';
      this.#readiness = { state: 'UNAVAILABLE', code: 'WORKER_STOPPED' };
      return;
    }
    this.#readiness = dependencyReadiness.available
      ? { state: 'READY' }
      : { state: 'UNAVAILABLE', code: dependencyReadiness.code };
    this.#state = 'running';
    this.#loop = this.#runLoop(controller.signal);
  }

  async stop(): Promise<void> {
    if (this.#state === 'stopped') return;
    if (this.#state === 'stopping') {
      await this.#loop;
      return;
    }
    this.#state = 'stopping';
    this.#readiness = { state: 'UNAVAILABLE', code: 'WORKER_STOPPING' };
    this.#abortController?.abort();
    await this.#loop;
    this.#loop = undefined;
    this.#abortController = undefined;
    this.#state = 'stopped';
    this.#readiness = { state: 'UNAVAILABLE', code: 'WORKER_STOPPED' };
  }

  pollOnce(signal?: AbortSignal): Promise<PollSummary> {
    if (this.#pollInFlight !== undefined) return this.#pollInFlight;
    const poll = this.#executePoll(signal).finally(() => {
      if (this.#pollInFlight === poll) this.#pollInFlight = undefined;
    });
    this.#pollInFlight = poll;
    return poll;
  }

  async #checkDependencies(): Promise<DependencyReadiness> {
    try {
      const publisher = await withTimeout(
        () => this.#publisher.checkReadiness(),
        this.#operationTimeoutMilliseconds,
      );
      if (!publisher.available) return publisher;
    } catch {
      return { available: false, code: 'PUBLISHER_UNAVAILABLE' };
    }

    try {
      return await withTimeout(
        () => this.#store.checkReadiness(),
        this.#operationTimeoutMilliseconds,
      );
    } catch {
      return { available: false, code: 'OUTBOX_STORE_UNAVAILABLE' };
    }
  }

  async #executePoll(signal?: AbortSignal): Promise<PollSummary> {
    if (isAborted(signal)) return { ...EMPTY_COUNTS, state: 'STOPPED' };
    const dependencies = await this.#checkDependencies();
    if (!dependencies.available) {
      this.#readiness = { state: 'UNAVAILABLE', code: dependencies.code };
      const summary = unavailableSummary();
      this.#emit(summary, dependencies.code);
      return summary;
    }
    this.#readiness = { state: 'READY' };

    let entries;
    try {
      entries = await withTimeout(
        () =>
          claimOutbox(this.#store, {
            leaseMilliseconds: this.#leaseMilliseconds,
            limit: this.#batchSize,
            now: this.#now(),
            workerId: this.#workerId,
          }),
        this.#operationTimeoutMilliseconds,
      );
    } catch {
      this.#readiness = { state: 'UNAVAILABLE', code: 'OUTBOX_STORE_UNAVAILABLE' };
      const summary = unavailableSummary();
      this.#emit(summary, 'OUTBOX_STORE_UNAVAILABLE');
      return summary;
    }

    if (entries.length === 0) {
      const summary = { ...EMPTY_COUNTS, state: 'EMPTY' as const };
      this.#emit(summary);
      return summary;
    }

    let publishedCount = 0;
    let retryCount = 0;
    let staleClaimCount = 0;
    const timedPublisher: Publisher = {
      publish: (entry) =>
        withTimeout(() => this.#publisher.publish(entry), this.#operationTimeoutMilliseconds),
    };

    try {
      for (const entry of entries) {
        if (isAborted(signal)) break;
        const disposition = await publishClaimedEntry(
          this.#store,
          timedPublisher,
          entry,
          this.#now(),
        );
        if (disposition === 'PUBLISHED') publishedCount += 1;
        if (disposition === 'RETRY') retryCount += 1;
        if (disposition === 'STALE_CLAIM') staleClaimCount += 1;
      }
    } catch {
      this.#readiness = { state: 'UNAVAILABLE', code: 'OUTBOX_STORE_UNAVAILABLE' };
      const summary = {
        claimedCount: entries.length,
        publishedCount,
        retryCount,
        staleClaimCount,
        state: 'DEPENDENCY_UNAVAILABLE' as const,
      };
      this.#emit(summary, 'OUTBOX_STORE_UNAVAILABLE');
      return summary;
    }

    const state: PollState = isAborted(signal)
      ? 'STOPPED'
      : retryCount > 0
        ? 'PUBLISH_RETRY'
        : staleClaimCount > 0
          ? 'STALE_CLAIM'
          : 'DELIVERED';
    if (retryCount > 0) {
      this.#readiness = { state: 'UNAVAILABLE', code: 'PUBLISH_ATTEMPT_FAILED' };
    }
    const summary = {
      claimedCount: entries.length,
      publishedCount,
      retryCount,
      staleClaimCount,
      state,
    };
    this.#emit(summary, retryCount > 0 ? 'PUBLISH_ATTEMPT_FAILED' : undefined);
    return summary;
  }

  #emit(summary: PollSummary, safeProblemCode?: WorkerUnavailableCode): void {
    try {
      this.#emitSafeEvent({
        ...summary,
        eventName: 'domain_worker.outbox_poll',
        ...(safeProblemCode === undefined ? {} : { safeProblemCode }),
      });
    } catch {
      // Observability must not affect delivery or expose the callback's raw exception.
    }
  }

  async #runLoop(signal: AbortSignal): Promise<void> {
    let consecutiveFailures = this.#readiness.state === 'READY' ? 0 : 1;
    while (!signal.aborted) {
      const delay = Math.min(
        this.#maximumBackoffMilliseconds,
        this.#pollIntervalMilliseconds * 2 ** Math.min(consecutiveFailures, 8),
      );
      await waitFor(delay, signal);
      if (isAborted(signal)) break;
      const summary = await this.pollOnce(signal);
      consecutiveFailures = ['DELIVERED', 'EMPTY', 'STALE_CLAIM'].includes(summary.state)
        ? 0
        : Math.min(consecutiveFailures + 1, 8);
    }
  }
}

export class UnavailableOutboxStore implements ReadinessAwareOutboxStore {
  constructor(private readonly code: DependencyUnavailableCode) {}

  checkReadiness(): Promise<DependencyReadiness> {
    return Promise.resolve({ available: false, code: this.code });
  }

  transaction<Result>(): Promise<Result> {
    return Promise.reject(new Error('OUTBOX_STORE_UNAVAILABLE'));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class UnavailablePublisher implements ReadinessAwarePublisher {
  checkReadiness(): Promise<DependencyReadiness> {
    return Promise.resolve({ available: false, code: 'PUBLISHER_UNAVAILABLE' });
  }

  publish(): Promise<void> {
    return Promise.reject(new Error('PUBLISHER_UNAVAILABLE'));
  }
}
