import { describe, expect, it } from 'vitest';

import { parseDomainWorkerConfiguration } from './config.js';
import { createDomainWorkerRuntime } from './runtime.js';
import type { ReadinessAwarePublisher } from './worker.js';

const readyPublisher: ReadinessAwarePublisher = {
  checkReadiness: () => Promise.resolve({ available: true }),
  publish: () => Promise.resolve(),
};

describe('domain worker configuration', () => {
  it('keeps a missing or malformed dedicated database URL explicitly unavailable', async () => {
    const missing = parseDomainWorkerConfiguration({ SMART_FASAL_ENVIRONMENT: 'local' });
    const malformed = parseDomainWorkerConfiguration({
      DOMAIN_WORKER_DATABASE_URL: 'https://not-postgres.example.test/database',
      SMART_FASAL_ENVIRONMENT: 'local',
    });
    expect(missing.database).toEqual({
      available: false,
      code: 'DATABASE_CONFIGURATION_MISSING',
    });
    expect(malformed.database).toEqual({
      available: false,
      code: 'DATABASE_CONFIGURATION_INVALID',
    });

    const runtime = createDomainWorkerRuntime({
      configuration: missing,
      publisher: readyPublisher,
    });
    await runtime.start();
    expect(runtime.readiness()).toEqual({
      code: 'DATABASE_CONFIGURATION_MISSING',
      state: 'UNAVAILABLE',
    });
    await runtime.close();
  });

  it('accepts a bounded environment-specific polling configuration', () => {
    expect(
      parseDomainWorkerConfiguration({
        DOMAIN_WORKER_BATCH_SIZE: '3',
        DOMAIN_WORKER_DATABASE_URL: 'postgresql://worker.example.test/smart_fasal',
        DOMAIN_WORKER_ID: 'domain-worker:staging:01',
        DOMAIN_WORKER_LEASE_MS: '20000',
        DOMAIN_WORKER_MAX_BACKOFF_MS: '20000',
        DOMAIN_WORKER_OPERATION_TIMEOUT_MS: '4000',
        DOMAIN_WORKER_POLL_INTERVAL_MS: '750',
        SMART_FASAL_ENVIRONMENT: 'staging',
      }),
    ).toEqual({
      batchSize: 3,
      database: {
        available: true,
        url: 'postgresql://worker.example.test/smart_fasal',
      },
      environment: 'staging',
      leaseMilliseconds: 20_000,
      maximumBackoffMilliseconds: 20_000,
      operationTimeoutMilliseconds: 4_000,
      pollIntervalMilliseconds: 750,
      workerId: 'domain-worker:staging:01',
    });
  });

  it('rejects unknown environments, unsafe worker IDs, and leases shorter than operations', () => {
    expect(() => parseDomainWorkerConfiguration({ SMART_FASAL_ENVIRONMENT: 'unknown' })).toThrow(
      'DOMAIN_WORKER_CONFIGURATION_INVALID',
    );
    expect(() =>
      parseDomainWorkerConfiguration({
        DOMAIN_WORKER_ID: 'unsafe worker id',
        SMART_FASAL_ENVIRONMENT: 'local',
      }),
    ).toThrow('DOMAIN_WORKER_CONFIGURATION_INVALID');
    expect(() =>
      parseDomainWorkerConfiguration({
        DOMAIN_WORKER_LEASE_MS: '5000',
        DOMAIN_WORKER_OPERATION_TIMEOUT_MS: '5000',
        SMART_FASAL_ENVIRONMENT: 'local',
      }),
    ).toThrow('DOMAIN_WORKER_CONFIGURATION_INVALID');
  });
});
