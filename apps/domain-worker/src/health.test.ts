import { buildService, type HealthPayload } from '@smart-fasal/service-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseDomainWorkerConfiguration, SERVICE_NAME } from './config.js';
import { createDomainWorkerRuntime, type DomainWorkerRuntime } from './runtime.js';
import type { ReadinessAwareOutboxStore, ReadinessAwarePublisher } from './worker.js';

const openApps: ReturnType<typeof buildService>[] = [];
const openRuntimes: DomainWorkerRuntime[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
  await Promise.all(openRuntimes.splice(0).map(async (runtime) => runtime.close()));
});

function readyStore(transaction = vi.fn()): ReadinessAwareOutboxStore {
  return {
    checkReadiness: () => Promise.resolve({ available: true }),
    close: () => Promise.resolve(),
    transaction: () => {
      transaction();
      return Promise.reject(new Error('test transaction should not run'));
    },
  };
}

const readyPublisher: ReadinessAwarePublisher = {
  checkReadiness: () => Promise.resolve({ available: true }),
  publish: () => Promise.resolve(),
};

describe(`${SERVICE_NAME} worker health contract`, () => {
  it('reports readiness only while a configured worker is running', async () => {
    const runtime = createDomainWorkerRuntime({
      configuration: parseDomainWorkerConfiguration({
        DOMAIN_WORKER_POLL_INTERVAL_MS: '60000',
        SMART_FASAL_ENVIRONMENT: 'local',
      }),
      publisher: readyPublisher,
      store: readyStore(),
    });
    openRuntimes.push(runtime);
    const app = buildService({
      readiness: () => runtime.readiness().state === 'READY',
      serviceName: SERVICE_NAME,
    });
    openApps.push(app);

    const liveBeforeStart = await app.inject({ method: 'GET', url: '/health/live' });
    const readyBeforeStart = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(liveBeforeStart.statusCode).toBe(200);
    expect(liveBeforeStart.json<HealthPayload>()).toMatchObject({
      service: SERVICE_NAME,
      status: 'ok',
    });
    expect(readyBeforeStart.statusCode).toBe(503);
    expect(readyBeforeStart.json<HealthPayload>()).toMatchObject({
      service: SERVICE_NAME,
      status: 'not_ready',
    });

    await runtime.start();
    const readyWhileRunning = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(readyWhileRunning.statusCode).toBe(200);
    expect(readyWhileRunning.json<HealthPayload>()).toMatchObject({
      service: SERVICE_NAME,
      status: 'ok',
    });

    await runtime.close();
    const readyAfterStop = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(readyAfterStop.statusCode).toBe(503);
  });

  it('does not claim and remains unavailable when the Milestone 1 publisher is absent', async () => {
    const transaction = vi.fn();
    const checkStore = vi.fn(() => Promise.resolve({ available: true } as const));
    const store = readyStore(transaction);
    store.checkReadiness = checkStore;
    const runtime = createDomainWorkerRuntime({
      configuration: parseDomainWorkerConfiguration({
        DOMAIN_WORKER_DATABASE_URL: 'postgresql://ignored.example.test/smart_fasal',
        DOMAIN_WORKER_POLL_INTERVAL_MS: '60000',
        SMART_FASAL_ENVIRONMENT: 'local',
      }),
      store,
    });
    openRuntimes.push(runtime);

    await runtime.start();

    expect(runtime.readiness()).toEqual({
      code: 'PUBLISHER_UNAVAILABLE',
      state: 'UNAVAILABLE',
    });
    expect(checkStore).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
