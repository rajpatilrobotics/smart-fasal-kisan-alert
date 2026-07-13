import { buildService, type HealthPayload } from '@smart-fasal/service-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import { SERVICE_NAME } from './config.js';

const openApps: ReturnType<typeof buildService>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe(`${SERVICE_NAME} health contract`, () => {
  it.each(['/health/live', '/health/ready'])('returns a safe response for %s', async (url) => {
    const app = buildService({ serviceName: SERVICE_NAME });
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url });
    const body = response.json<HealthPayload>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ service: SERVICE_NAME, status: 'ok' });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('fails readiness closed without failing liveness', async () => {
    const app = buildService({
      readiness: () => false,
      serviceName: SERVICE_NAME,
    });
    openApps.push(app);

    const [live, ready] = await Promise.all([
      app.inject({ method: 'GET', url: '/health/live' }),
      app.inject({ method: 'GET', url: '/health/ready' }),
    ]);

    expect(live.statusCode).toBe(200);
    expect(ready.statusCode).toBe(503);
    expect(ready.json<HealthPayload>()).toMatchObject({
      service: SERVICE_NAME,
      status: 'not_ready',
    });
  });
});
