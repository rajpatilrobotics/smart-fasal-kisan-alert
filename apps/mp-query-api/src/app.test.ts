import { readFile } from 'node:fs/promises';

import { ProblemDetailsSchema } from '@smart-fasal/contracts/release/mp';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildMpQueryApi, type MpQueryApiOptions, type MpSafeRequestLogRecord } from './app.js';

const SUBJECT_ID = '20000000-0000-4000-8000-000000000001';
const ROLE_CONTEXT_ID = '20000000-0000-4000-8000-000000000002';
const FUTURE = '2099-01-01T00:00:00.000Z';
const openApps: ReturnType<typeof buildMpQueryApi>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
});

function testOptions(overrides: Partial<MpQueryApiOptions> = {}): MpQueryApiOptions {
  return {
    environment: 'local',
    runtimeMode: 'test',
    origins: ['http://mp.test'],
    appIds: ['mp-app'],
    identityVerifier: {
      mode: 'synthetic-test',
      verifyIdToken(token) {
        if (token !== 'known-mp-identity') return Promise.reject(new Error('unknown identity'));
        return Promise.resolve({
          subjectId: SUBJECT_ID,
          environment: 'local',
          expiresAt: FUTURE,
          mfaState: 'CURRENT',
        });
      },
    },
    appCheckVerifier: {
      mode: 'synthetic-test',
      verifyAppCheckToken(token) {
        if (token !== 'known-mp-app-check') return Promise.reject(new Error('unknown app check'));
        return Promise.resolve({ appId: 'mp-app', environment: 'local', expiresAt: FUTURE });
      },
    },
    authorizer: { authorize: () => Promise.resolve({ allowed: true }) },
    ...overrides,
  };
}

function openApp(options: MpQueryApiOptions = testOptions()) {
  const app = buildMpQueryApi(options);
  openApps.push(app);
  return app;
}

function requestHeaders(origin = 'http://mp.test') {
  return {
    origin,
    authorization: 'Bearer known-mp-identity',
    'x-firebase-appcheck': 'known-mp-app-check',
    'x-client-installation-id': 'mp.installation.synthetic',
    'x-client-build': '1.0.0-test',
    'x-client-schema-version': '1',
    'x-role-context-id': ROLE_CONTEXT_ID,
  };
}

describe('MP query API release-safe boundary', () => {
  it('reports reachability without authentication', async () => {
    const app = openApp();
    const response = await app.inject({ method: 'GET', url: '/v1/system/reachability' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'mp-query-api', status: 'ok' });
  });

  it('returns a truthful typed unavailable query context until release publication exists', async () => {
    const app = openApp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      state: 'UNAVAILABLE',
      code: 'DEPENDENCY_UNAVAILABLE',
      availableMetricKeys: [],
      activeRelease: null,
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('passes the validated schema version to MP authorization', async () => {
    const authorize = vi.fn(() => Promise.resolve({ allowed: true as const }));
    const app = openApp(testOptions({ authorizer: { authorize } }));
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(200);
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ clientSchemaVersion: 1 }));
  });

  it.each([undefined, 'not-a-version', '2'])(
    'requires supported schema version 1 instead of %s',
    async (schemaVersion) => {
      const app = openApp();
      const headers: Record<string, string> = { ...requestHeaders() };
      if (schemaVersion === undefined) {
        delete headers['x-client-schema-version'];
      } else {
        headers['x-client-schema-version'] = schemaVersion;
      }
      const response = await app.inject({
        method: 'GET',
        url: '/v1/mp/query-context',
        headers,
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        fieldErrors: [expect.objectContaining({ field: 'x-client-schema-version' })],
      });
    },
  );

  it.each([undefined, 'not-a-uuid'])(
    'requires a UUID role context instead of %s',
    async (value) => {
      const app = openApp();
      const headers: Record<string, string> = { ...requestHeaders() };
      if (value === undefined) {
        delete headers['x-role-context-id'];
      } else {
        headers['x-role-context-id'] = value;
      }
      const response = await app.inject({
        method: 'GET',
        url: '/v1/mp/query-context',
        headers,
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        fieldErrors: [expect.objectContaining({ field: 'x-role-context-id' })],
      });
    },
  );

  it('fails closed instead of serializing non-release adapter fields', async () => {
    const app = openApp(
      testOptions({
        releaseAdapter: {
          getQueryContext: () =>
            Promise.resolve({
              state: 'UNAVAILABLE',
              code: 'DEPENDENCY_UNAVAILABLE',
              availableMetricKeys: [],
              activeRelease: null,
              exactFarmerLocation: 'must-not-leak',
            }),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).not.toContain('must-not-leak');
    expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
  });

  it('requires independent identity and App Check verification', async () => {
    const app = openApp();
    const noAppCheckHeaders = requestHeaders();
    delete (noAppCheckHeaders as Partial<typeof noAppCheckHeaders>)['x-firebase-appcheck'];
    const missingAppCheck = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: noAppCheckHeaders,
    });
    expect(missingAppCheck.statusCode).toBe(401);
    expect(missingAppCheck.headers['content-type']).toContain('application/problem+json');
    expect(missingAppCheck.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });

    const unknownIdentity = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: {
        ...requestHeaders(),
        authorization: 'Bearer unknown',
      },
    });
    expect(unknownIdentity.statusCode).toBe(401);
    expect(unknownIdentity.headers['content-type']).toContain('application/problem+json');
  });

  it('fails closed with typed Unavailable when real credential adapters are not configured', async () => {
    const options = testOptions();
    delete options.identityVerifier;
    delete options.appCheckVerifier;
    const app = openApp(options);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', retryable: true });
  });

  it('preserves typed staff MFA denial from the injected authorizer', async () => {
    const app = openApp(
      testOptions({
        authorizer: { authorize: () => Promise.resolve({ allowed: false, code: 'MFA_REQUIRED' }) },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'MFA_REQUIRED' });
  });

  it('preserves authorization-version conflicts as typed 409 problems', async () => {
    const app = openApp(
      testOptions({
        authorizer: {
          authorize: () =>
            Promise.resolve({ allowed: false, code: 'AUTHORIZATION_VERSION_CHANGED' }),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });

    expect(response.statusCode).toBe(409);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'AUTHORIZATION_VERSION_CHANGED' });
  });

  it('enforces the exact MP origin and CORS allowlist', async () => {
    const app = openApp();
    const denied = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders('http://farmer.test'),
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers['content-type']).toContain('application/problem+json');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/mp/query-context',
      headers: { origin: 'http://mp.test' },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://mp.test');
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();
    expect(preflight.headers['access-control-allow-headers']).toContain('X-Client-Schema-Version');
  });

  it.each([
    '/v1/auth/session',
    '/v1/auth/roles',
    '/v1/auth/return-states',
    '/v1/farmer/bootstrap',
    '/v1/rsk/bootstrap',
  ])('does not expose non-release query API route %s', async (url) => {
    const app = openApp();
    const response = await app.inject({ method: 'GET', url, headers: requestHeaders() });
    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(ProblemDetailsSchema.safeParse(response.json()).success).toBe(true);
  });

  it('rejects synthetic verifiers in production', () => {
    expect(() => buildMpQueryApi(testOptions({ runtimeMode: 'production' }))).toThrow(
      'Synthetic credential verifiers cannot run in production.',
    );
  });

  it('requires HTTPS origins in production', () => {
    const base = testOptions();
    if (base.identityVerifier === undefined || base.appCheckVerifier === undefined) {
      throw new Error('Expected synthetic test verifiers.');
    }
    const options = testOptions({
      runtimeMode: 'production',
      identityVerifier: { ...base.identityVerifier, mode: 'firebase-admin' },
      appCheckVerifier: { ...base.appCheckVerifier, mode: 'firebase-admin' },
    });
    expect(() => buildMpQueryApi(options)).toThrow('MP origins must use HTTPS in production.');
  });
});

describe('MP query API isolation and safe logging', () => {
  it('has no operational package, route, persistence or database configuration dependency', async () => {
    const files = await Promise.all(
      ['../package.json', './app.ts', './config.ts', './index.ts'].map(async (path) =>
        readFile(new URL(path, import.meta.url), 'utf8'),
      ),
    );
    const source = files.join('\n');

    expect(source).not.toMatch(
      /@smart-fasal\/(?:application|database|domain|persistence)|drizzle|postgres|DATABASE_URL/u,
    );
    expect(source).not.toContain('/v1/farmer/');
    expect(source).not.toContain('/v1/rsk/');
  });

  it('never logs credentials, protected identifiers, bodies, SQL or raw adapter errors', async () => {
    const records: MpSafeRequestLogRecord[] = [];
    const app = openApp(
      testOptions({
        releaseAdapter: {
          getQueryContext: () =>
            Promise.reject(
              new Error(`SELECT private_value FROM farmer WHERE subject_id='${SUBJECT_ID}'`),
            ),
        },
        requestLogger: { write: (record) => records.push(record) },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: requestHeaders(),
    });
    expect(response.statusCode).toBe(503);
    expect(records).toHaveLength(1);

    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain('known-mp-identity');
    expect(serialized).not.toContain('known-mp-app-check');
    expect(serialized).not.toContain(SUBJECT_ID);
    expect(serialized).not.toContain('SELECT');
    expect(records[0]).toMatchObject({
      route: '/v1/mp/query-context',
      actorClass: 'MP_STAFF',
      problemCode: 'DEPENDENCY_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
