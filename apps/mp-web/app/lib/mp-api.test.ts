import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMpReturnState,
  establishMpRole,
  loadMpShell,
  problemToShellIssue,
  revokeMpRoleContext,
} from './mp-api';

const DOMAIN_ORIGIN = 'https://identity.demo.example';
const MP_QUERY_ORIGIN = 'https://released-aggregates.demo.example';
const INSTALLATION_ID = '00000000-0000-4000-8000-000000000101';
const SUBJECT_ID = '00000000-0000-4000-8000-000000000102';
const ROLE_GRANT_ID = '00000000-0000-4000-8000-000000000103';
const ROLE_CONTEXT_ID = '00000000-0000-4000-8000-000000000104';
const OFFICE_ID = '00000000-0000-4000-8000-000000000105';
const JURISDICTION_ID = '00000000-0000-4000-8000-000000000106';
const COMMAND_ID = '00000000-0000-4000-8000-000000000107';
const RETURN_STATE_ID = '00000000-0000-4000-8000-000000000108';
const credentials = {
  appCheckToken: 'app-check-token-kept-in-header',
  idToken: 'id-token-kept-in-header',
} as const;

interface RecordedRequest {
  readonly body: unknown;
  readonly credentials: RequestCredentials;
  readonly headers: Headers;
  readonly method: string;
  readonly url: URL;
}

const mpRole = {
  capabilitySetVersion: 3,
  destination: '/mp/overview',
  jurisdictionId: JURISDICTION_ID,
  officeId: OFFICE_ID,
  roleGrantId: ROLE_GRANT_ID,
  roleType: 'MP',
} as const;

const staffSession = {
  authorizationVersion: 9,
  capabilitySetVersion: 3,
  deviceBindingState: 'ACTIVE',
  environment: 'demo',
  mfaState: 'CURRENT',
  roles: [mpRole],
  subjectId: SUBJECT_ID,
  subjectType: 'STAFF',
} as const;

const mpContext = {
  authorizationVersion: 9,
  capabilities: [],
  capabilitySetVersion: 3,
  environment: 'demo',
  jurisdictionId: JURISDICTION_ID,
  officeId: OFFICE_ID,
  purposeCode: 'data.rights',
  roleContextId: ROLE_CONTEXT_ID,
  roleType: 'MP',
  subjectId: SUBJECT_ID,
} as const;

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': contentType },
    status,
  });
}

function problemResponse(
  code: 'AUTHENTICATION_REQUIRED' | 'CONSENT_OR_ACCESS_VERSION_CHANGED' | 'DEPENDENCY_UNAVAILABLE',
  status: 401 | 409 | 503,
) {
  return jsonResponse(
    {
      code,
      correlationId: '00000000-0000-4000-8000-000000000109',
      fieldErrors: [],
      retryable: true,
      status,
      title: 'Dependency unavailable',
      type: 'https://smart-fasal.example/problems/dependency-unavailable',
    },
    status,
    'application/problem+json',
  );
}

async function recordRequest(request: Request): Promise<RecordedRequest> {
  return {
    body: request.body === null ? undefined : await request.clone().json(),
    credentials: request.credentials,
    headers: new Headers(request.headers),
    method: request.method,
    url: new URL(request.url),
  };
}

function installFetch(
  handler: (request: Request) => Promise<Response> | Response,
): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    return handler(request);
  });
}

function expectSharedHeaders(request: RecordedRequest, roleContextId?: string) {
  expect(request.headers.get('X-Client-Build')).toBe(
    process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'mp-web-local',
  );
  expect(request.headers.get('X-Client-Installation-Id')).toBe(INSTALLATION_ID);
  expect(request.headers.get('X-Client-Schema-Version')).toBe('1');
  expect(request.headers.get('X-Role-Context-Id')).toBe(roleContextId ?? null);
  expect(request.credentials).toBe('omit');
}

function expectCredentialsOutsideUrl(request: RecordedRequest) {
  expect(request.headers.get('Authorization')).toBe(`Bearer ${credentials.idToken}`);
  expect(request.headers.get('X-Firebase-AppCheck')).toBe(credentials.appCheckToken);
  for (const sensitiveValue of [
    credentials.idToken,
    credentials.appCheckToken,
    INSTALLATION_ID,
    ROLE_CONTEXT_ID,
  ]) {
    expect(request.url.href).not.toContain(sensitiveValue);
  }
  expect(request.url.search).toBe('');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MP shell problem mapping', () => {
  it.each([
    ['AUTHENTICATION_REQUIRED', 401, 'unauthenticated'],
    ['AUTHORIZATION_DENIED', 401, 'unauthenticated'],
    ['AUTHORIZATION_DENIED', 403, 'denied'],
    ['AUTHORIZATION_VERSION_CHANGED', 409, 'expired'],
    ['SOURCE_VERSION_EXPIRED', 409, 'expired'],
    ['CONSENT_OR_ACCESS_VERSION_CHANGED', 409, 'withdrawn'],
    ['DEPENDENCY_UNAVAILABLE', 503, 'unavailable'],
  ] as const)('keeps %s distinct', (code, status, expected) => {
    expect(problemToShellIssue(code, status)).toBe(expected);
  });
});

describe('MP generated API boundary', () => {
  it('creates an MP return state without placing App Check or installation context in the URL', async () => {
    const requests: RecordedRequest[] = [];
    installFetch(async (request) => {
      requests.push(await recordRequest(request));
      return jsonResponse({
        expiresAt: '2026-07-13T08:05:00.000Z',
        returnStateId: RETURN_STATE_ID,
      });
    });

    await expect(
      createMpReturnState(credentials.appCheckToken, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
      }),
    ).resolves.toBe(RETURN_STATE_ID);

    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request).toBeDefined();
    if (!request) throw new Error('Expected the return-state request');
    expect(request.method).toBe('POST');
    expect(request.url.origin).toBe(DOMAIN_ORIGIN);
    expect(request.url.pathname).toBe('/v1/auth/return-states');
    expect(request.body).toEqual({ routeKey: 'MP_HOME' });
    expectSharedHeaders(request);
    expect(request.headers.get('X-Firebase-AppCheck')).toBe(credentials.appCheckToken);
    expect(request.headers.get('Authorization')).toBeNull();
    expect(request.url.href).not.toContain(credentials.appCheckToken);
    expect(request.url.href).not.toContain(INSTALLATION_ID);
    expect(request.url.search).toBe('');
  });

  it('surfaces a typed return-state dependency failure without returning a state id', async () => {
    installFetch(() => problemResponse('DEPENDENCY_UNAVAILABLE', 503));

    await expect(
      createMpReturnState(credentials.appCheckToken, INSTALLATION_ID, {
        baseUrl: DOMAIN_ORIGIN,
      }),
    ).rejects.toThrow('DEPENDENCY_UNAVAILABLE');
  });

  it('establishes the offered MP role and uses the returned role-context id', async () => {
    const requests: RecordedRequest[] = [];
    installFetch(async (request) => {
      requests.push(await recordRequest(request));
      if (request.method === 'GET' && new URL(request.url).pathname === '/v1/auth/roles') {
        return jsonResponse(staffSession);
      }
      if (request.method === 'POST' && new URL(request.url).pathname === '/v1/auth/role-contexts') {
        return jsonResponse({
          commandId: COMMAND_ID,
          disposition: 'ACCEPTED',
          eventIds: ['00000000-0000-4000-8000-000000000110'],
          result: { id: ROLE_CONTEXT_ID, revision: 1, type: 'roleContext' },
          serverReceivedAt: '2026-07-13T08:00:01.000Z',
        });
      }
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        roleCommand: {
          commandId: COMMAND_ID,
          recordedAt: '2026-07-13T08:00:00.000Z',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).resolves.toEqual({ kind: 'ready', roleContextId: ROLE_CONTEXT_ID });

    expect(requests).toHaveLength(2);
    const rolesRequest = requests[0];
    const selectRequest = requests[1];
    expect(rolesRequest).toBeDefined();
    expect(selectRequest).toBeDefined();
    if (!rolesRequest || !selectRequest) throw new Error('Expected role establishment requests');

    expect(rolesRequest.url.origin).toBe(DOMAIN_ORIGIN);
    expect(rolesRequest.url.pathname).toBe('/v1/auth/roles');
    expectSharedHeaders(rolesRequest);
    expectCredentialsOutsideUrl(rolesRequest);

    expect(selectRequest.url.origin).toBe(DOMAIN_ORIGIN);
    expect(selectRequest.url.pathname).toBe('/v1/auth/role-contexts');
    expect(selectRequest.headers.get('Idempotency-Key')).toBe(COMMAND_ID);
    expectSharedHeaders(selectRequest);
    expectCredentialsOutsideUrl(selectRequest);
    expect(selectRequest.body).toEqual({
      clientContext: {
        clientRecordedAt: '2026-07-13T08:00:00.000Z',
        dataModeClaim: 'LIVE',
        timezone: 'Asia/Kolkata',
      },
      commandSchemaVersion: 1,
      expectedRevision: 0,
      operation: 'SelectRoleContext',
      payload: {
        jurisdictionId: JURISDICTION_ID,
        officeId: OFFICE_ID,
        roleGrantId: ROLE_GRANT_ID,
      },
      target: { id: COMMAND_ID, type: 'roleContext' },
    });
  });

  it.each([
    ['expired MFA', { ...staffSession, mfaState: 'EXPIRED' }, 'expired'],
    ['missing current MFA', { ...staffSession, mfaState: 'REQUIRED' }, 'denied'],
    ['missing MP role grant', { ...staffSession, roles: [] }, 'denied'],
    [
      'an existing MP context',
      { ...staffSession, activeRoleContext: mpContext },
      { kind: 'ready', roleContextId: ROLE_CONTEXT_ID },
    ],
  ] as const)('does not issue a role command for %s', async (_label, session, expected) => {
    const fetchMock = installFetch(() => jsonResponse(session));

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, { authBaseUrl: DOMAIN_ORIGIN }),
    ).resolves.toEqual(expected);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves a typed authentication failure while listing roles', async () => {
    installFetch(() => problemResponse('AUTHENTICATION_REQUIRED', 401));

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, { authBaseUrl: DOMAIN_ORIGIN }),
    ).resolves.toBe('unauthenticated');
  });

  it('fails closed when role selection does not return an accepted role context', async () => {
    let callCount = 0;
    installFetch(() => {
      callCount += 1;
      return callCount === 1
        ? jsonResponse(staffSession)
        : jsonResponse({
            commandId: COMMAND_ID,
            disposition: 'REJECTED',
            eventIds: [],
            serverReceivedAt: '2026-07-13T08:00:01.000Z',
          });
    });

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        roleCommand: {
          commandId: COMMAND_ID,
          recordedAt: '2026-07-13T08:00:00.000Z',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).resolves.toBe('denied');
  });

  it('maps a typed role-command dependency failure to unavailable', async () => {
    let callCount = 0;
    installFetch(() => {
      callCount += 1;
      return callCount === 1
        ? jsonResponse(staffSession)
        : problemResponse('DEPENDENCY_UNAVAILABLE', 503);
    });

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        roleCommand: {
          commandId: COMMAND_ID,
          recordedAt: '2026-07-13T08:00:00.000Z',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).resolves.toBe('unavailable');
  });

  it('returns unavailable when the role boundary cannot be reached', async () => {
    installFetch(() => {
      throw new TypeError('synthetic network failure');
    });

    await expect(
      establishMpRole(credentials, INSTALLATION_ID, { authBaseUrl: DOMAIN_ORIGIN }),
    ).resolves.toBe('unavailable');
  });

  it('loads identity from Domain API and queries release context only from MP Query API', async () => {
    const requests: RecordedRequest[] = [];
    installFetch(async (request) => {
      requests.push(await recordRequest(request));
      const url = new URL(request.url);
      if (url.origin === DOMAIN_ORIGIN && url.pathname === '/v1/auth/session') {
        return jsonResponse({ ...staffSession, activeRoleContext: mpContext });
      }
      if (url.origin === MP_QUERY_ORIGIN && url.pathname === '/v1/mp/query-context') {
        return jsonResponse({
          activeRelease: null,
          availableMetricKeys: [],
          code: 'DEPENDENCY_UNAVAILABLE',
          state: 'UNAVAILABLE',
        });
      }
      throw new Error(`Unexpected cross-surface request: ${request.method} ${request.url}`);
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({
      authorizationVersion: 9,
      environment: 'demo',
      jurisdictionId: JURISDICTION_ID,
      kind: 'ready',
      releaseState: 'DEPENDENCY_UNAVAILABLE',
      role: 'MP',
      subjectId: SUBJECT_ID,
    });

    expect(requests).toHaveLength(2);
    const domainRequests = requests.filter((request) => request.url.origin === DOMAIN_ORIGIN);
    const queryRequests = requests.filter((request) => request.url.pathname.startsWith('/v1/mp/'));
    expect(domainRequests.map((request) => request.url.pathname)).toEqual(['/v1/auth/session']);
    expect(queryRequests).toHaveLength(1);
    expect(queryRequests[0]?.url.origin).toBe(MP_QUERY_ORIGIN);
    expect(queryRequests[0]?.url.pathname).toBe('/v1/mp/query-context');

    for (const request of requests) {
      expectSharedHeaders(request, ROLE_CONTEXT_ID);
      expectCredentialsOutsideUrl(request);
    }
  });

  it('maps an unavailable release dependency without exposing a partial ready shell', async () => {
    const requests: RecordedRequest[] = [];
    installFetch(async (request) => {
      requests.push(await recordRequest(request));
      const url = new URL(request.url);
      if (url.origin === DOMAIN_ORIGIN) {
        return jsonResponse({ ...staffSession, activeRoleContext: mpContext });
      }
      if (url.origin === MP_QUERY_ORIGIN) return problemResponse('DEPENDENCY_UNAVAILABLE', 503);
      throw new Error(`Unexpected request origin: ${url.origin}`);
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });

    expect(requests.map((request) => request.url.origin)).toEqual([DOMAIN_ORIGIN, MP_QUERY_ORIGIN]);
  });

  it.each([
    ['missing active context', staffSession, { kind: 'expired' }],
    [
      'expired MFA',
      { ...staffSession, activeRoleContext: mpContext, mfaState: 'EXPIRED' },
      { kind: 'expired' },
    ],
    [
      'inactive device binding',
      { ...staffSession, activeRoleContext: mpContext, deviceBindingState: 'REVOKED' },
      { kind: 'denied' },
    ],
  ] as const)('stops before the MP query for %s', async (_label, session, expected) => {
    const requests: Request[] = [];
    installFetch((request) => {
      requests.push(request);
      return jsonResponse(session);
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual(expected);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0]?.url ?? DOMAIN_ORIGIN).pathname).toBe('/v1/auth/session');
  });

  it('preserves a withdrawal response from the Domain session boundary', async () => {
    installFetch(() => problemResponse('CONSENT_OR_ACCESS_VERSION_CHANGED', 409));

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'withdrawn' });
  });

  it('rejects a release response that contains metrics while claiming unavailability', async () => {
    let callCount = 0;
    installFetch(() => {
      callCount += 1;
      return callCount === 1
        ? jsonResponse({ ...staffSession, activeRoleContext: mpContext })
        : jsonResponse({
            activeRelease: null,
            availableMetricKeys: ['private-yield'],
            code: 'DEPENDENCY_UNAVAILABLE',
            state: 'UNAVAILABLE',
          });
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'denied' });
  });

  it('returns unavailable when the isolated MP query origin is not configured', async () => {
    installFetch(() => jsonResponse({ ...staffSession, activeRoleContext: mpContext }));

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: '',
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('rethrows a request failure after its caller has aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    installFetch(() => {
      throw new DOMException('Aborted', 'AbortError');
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
        signal: controller.signal,
      }),
    ).rejects.toThrow('Aborted');
  });

  it('fails closed before network access when no role context is selected', async () => {
    const fetchMock = installFetch(() => {
      throw new Error('fetch must not run without a selected role context');
    });

    await expect(
      loadMpShell(credentials, INSTALLATION_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        queryBaseUrl: MP_QUERY_ORIGIN,
      }),
    ).resolves.toEqual({ kind: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('revokes the role context at the Domain origin with a stable idempotency key', async () => {
    const requests: RecordedRequest[] = [];
    installFetch(async (request) => {
      requests.push(await recordRequest(request));
      return jsonResponse({
        commandId: COMMAND_ID,
        disposition: 'ALREADY_ACCEPTED',
        eventIds: ['00000000-0000-4000-8000-000000000111'],
        result: { id: ROLE_CONTEXT_ID, revision: 2, type: 'roleContext' },
        serverReceivedAt: '2026-07-13T08:10:00.000Z',
      });
    });

    await expect(
      revokeMpRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(true);

    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request).toBeDefined();
    if (!request) throw new Error('Expected a role-context revocation request');
    expect(request.method).toBe('DELETE');
    expect(request.url.origin).toBe(DOMAIN_ORIGIN);
    expect(request.url.pathname).toBe(`/v1/auth/role-contexts/${ROLE_CONTEXT_ID}`);
    expect(request.url.search).toBe('');
    expect(request.body).toBeUndefined();
    expect(request.headers.get('Idempotency-Key')).toBe(COMMAND_ID);
    expectSharedHeaders(request, ROLE_CONTEXT_ID);
    expect(request.headers.get('Authorization')).toBe(`Bearer ${credentials.idToken}`);
    expect(request.headers.get('X-Firebase-AppCheck')).toBe(credentials.appCheckToken);
    expect(request.url.href).not.toContain(credentials.idToken);
    expect(request.url.href).not.toContain(credentials.appCheckToken);
    expect(request.url.href).not.toContain(INSTALLATION_ID);
  });

  it.each([
    ['a typed dependency failure', false],
    ['a network failure', true],
  ] as const)('reports revocation failure for %s', async (_label, throwNetworkError) => {
    installFetch(() => {
      if (throwNetworkError) throw new TypeError('synthetic network failure');
      return problemResponse('DEPENDENCY_UNAVAILABLE', 503);
    });

    await expect(
      revokeMpRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        authBaseUrl: DOMAIN_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(false);
  });
});
