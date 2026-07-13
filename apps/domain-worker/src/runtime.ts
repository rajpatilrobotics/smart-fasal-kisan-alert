import type { DomainWorkerConfiguration } from './config.js';
import { PostgresOutboxStore } from './postgres-outbox-store.js';
import {
  OutboxPublisherWorker,
  UnavailableOutboxStore,
  UnavailablePublisher,
  type ReadinessAwareOutboxStore,
  type ReadinessAwarePublisher,
  type SafeWorkerEvent,
  type WorkerReadiness,
} from './worker.js';

export interface DomainWorkerRuntime {
  readonly worker: OutboxPublisherWorker;
  close(): Promise<void>;
  readiness(): WorkerReadiness;
  start(): Promise<void>;
}

export function createDomainWorkerRuntime(options: {
  readonly configuration: DomainWorkerConfiguration;
  readonly emitSafeEvent?: (event: SafeWorkerEvent) => void;
  readonly publisher?: ReadinessAwarePublisher;
  readonly store?: ReadinessAwareOutboxStore;
}): DomainWorkerRuntime {
  const store =
    options.store ??
    (options.configuration.database.available
      ? new PostgresOutboxStore({
          databaseUrl: options.configuration.database.url,
          environment: options.configuration.environment,
        })
      : new UnavailableOutboxStore(options.configuration.database.code));
  // Milestone 1 deliberately has no cloud publisher. A real adapter must be injected by a later,
  // separately authorized milestone; this default can never claim or report ready.
  const publisher = options.publisher ?? new UnavailablePublisher();
  const worker = new OutboxPublisherWorker({
    batchSize: options.configuration.batchSize,
    leaseMilliseconds: options.configuration.leaseMilliseconds,
    maximumBackoffMilliseconds: options.configuration.maximumBackoffMilliseconds,
    operationTimeoutMilliseconds: options.configuration.operationTimeoutMilliseconds,
    pollIntervalMilliseconds: options.configuration.pollIntervalMilliseconds,
    publisher,
    store,
    workerId: options.configuration.workerId,
    ...(options.emitSafeEvent === undefined ? {} : { emitSafeEvent: options.emitSafeEvent }),
  });
  let closed = false;

  return {
    worker,
    start: () => worker.start(),
    readiness: () => worker.readiness,
    async close() {
      if (closed) return;
      closed = true;
      await worker.stop();
      await store.close();
    },
  };
}
