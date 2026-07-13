import { afterEach, describe, expect, it } from 'vitest';

import { buildService, startService } from './index';

const openApps: ReturnType<typeof buildService>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe('service health runtime', () => {
  it('reports liveness using the service identity', async () => {
    const app = buildService({ serviceName: 'test-service' });
    openApps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toMatchObject({ service: 'test-service', status: 'ok' });
  });

  it('returns 503 when readiness fails', async () => {
    const app = buildService({ readiness: () => false, serviceName: 'test-service' });
    openApps.push(app);
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'not_ready' });
  });

  it('starts and stops the production listener lifecycle', async () => {
    let started = false;
    let stopped = false;
    const app = await startService({
      host: '127.0.0.1',
      onStart: () => {
        started = true;
      },
      onStop: () => {
        stopped = true;
      },
      port: 0,
      serviceName: 'listener-test',
    });
    openApps.push(app);

    expect(started).toBe(true);
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);

    await app.close();
    openApps.pop();
    expect(stopped).toBe(true);
  });
});
