import { buildService, type HealthPayload } from '@smart-fasal/service-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import { SERVICE_NAME } from './config.js';
import { WorkerLifecycle } from './lifecycle.js';

const openApps: ReturnType<typeof buildService>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe(`${SERVICE_NAME} worker health contract`, () => {
  it('reports readiness only while the worker lifecycle is running', async () => {
    const worker = new WorkerLifecycle();
    const app = buildService({
      readiness: () => worker.isReady,
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

    worker.start();
    const readyWhileRunning = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(readyWhileRunning.statusCode).toBe(200);
    expect(readyWhileRunning.json<HealthPayload>()).toMatchObject({
      service: SERVICE_NAME,
      status: 'ok',
    });

    worker.stop();
    const readyAfterStop = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(readyAfterStop.statusCode).toBe(503);
  });
});
