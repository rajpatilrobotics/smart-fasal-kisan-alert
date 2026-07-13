import type { HealthPayload } from '@smart-fasal/contracts/schemas';
import { afterEach, describe, expect, it } from 'vitest';

import { buildDomainApi } from './app.js';
import { SERVICE_NAME } from './config.js';

const openApps: ReturnType<typeof buildDomainApi>[] = [];

function buildTestApp(readiness: () => boolean = () => true) {
  return buildDomainApi({
    environment: 'local',
    origins: {
      farmer: ['http://farmer.test'],
      rsk: ['http://rsk.test'],
      mp: ['http://mp.test'],
    },
    appIds: { farmer: [], rsk: [], mp: [] },
    identityVerifier: {
      mode: 'synthetic-test',
      verifyIdToken: () => Promise.reject(new Error('not used by health tests')),
    },
    appCheckVerifier: {
      mode: 'synthetic-test',
      verifyAppCheckToken: () => Promise.reject(new Error('not used by health tests')),
    },
    authorizer: {
      authorize: () => Promise.resolve({ allowed: false, code: 'AUTHORIZATION_DENIED' }),
    },
    operations: {
      execute: () => Promise.reject(new Error('not used by health tests')),
    },
    protectedDisclosure: {
      disclose: () => Promise.resolve({ allowed: false, code: 'AUTHORIZATION_DENIED' }),
    },
    readiness,
    runtimeMode: 'test',
  });
}

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

describe(`${SERVICE_NAME} health contract`, () => {
  it.each(['/health/live', '/health/ready'])('returns a safe response for %s', async (url) => {
    const app = buildTestApp();
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url });
    const body = response.json<HealthPayload>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({ service: SERVICE_NAME, status: 'ok' });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('fails readiness closed without failing liveness', async () => {
    const app = buildTestApp(() => false);
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

  it('does not let a readiness callback override absent protected-operation adapters', async () => {
    const app = buildDomainApi({
      environment: 'local',
      origins: {
        farmer: ['http://farmer.test'],
        rsk: ['http://rsk.test'],
        mp: ['http://mp.test'],
      },
      appIds: { farmer: [], rsk: [], mp: [] },
      readiness: () => true,
      runtimeMode: 'test',
    });
    openApps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json<HealthPayload>().status).toBe('not_ready');
  });
});
