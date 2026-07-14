import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createFarmerReturnState,
  establishFarmerRole,
  loadFarmerShell,
  problemToShellIssue,
  revokeFarmerRoleContext,
} from './farmer-api';

const API_ORIGIN = 'https://farmer-api.local.example';
const APP_CHECK_TOKEN = 'farmer-app-check-secret';
const ID_TOKEN = 'farmer-id-token-secret';
const INSTALLATION_ID = 'farmer-installation-a';
const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';
const ROLE_GRANT_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_CONTEXT_ID = '33333333-3333-4333-8333-333333333333';
const COMMAND_ID = '44444444-4444-4444-8444-444444444444';
const RETURN_STATE_ID = '55555555-5555-4555-8555-555555555555';
const CORRELATION_ID = '66666666-6666-4666-8666-666666666666';

const credentials = {
  appCheckToken: APP_CHECK_TOKEN,
  idToken: ID_TOKEN,
} as const;

interface CapturedRequest {
  readonly body: string;
  readonly headers: Headers;
  readonly method: string;
  readonly url: URL;
}

interface QueuedResponse {
  readonly body: unknown;
  readonly contentType?: 'application/json' | 'application/problem+json';
  readonly status?: number;
}

function installFetchQueue(...responses: readonly QueuedResponse[]): CapturedRequest[] {
  const requests: CapturedRequest[] = [];
  let responseIndex = 0;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      requests.push({
        body: request.method === 'GET' ? '' : await request.clone().text(),
        headers: new Headers(request.headers),
        method: request.method,
        url: new URL(request.url),
      });

      const queued = responses[responseIndex++];
      if (!queued) throw new Error(`Unexpected request to ${request.url}`);
      return new Response(JSON.stringify(queued.body), {
        headers: { 'content-type': queued.contentType ?? 'application/json' },
        status: queued.status ?? 200,
      });
    }),
  );

  return requests;
}

function expectRequiredHeaders(request: CapturedRequest): void {
  expect(request.headers.get('x-client-build')).toBe(
    process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'farmer-web-local',
  );
  expect(request.headers.get('x-client-installation-id')).toBe(INSTALLATION_ID);
  expect(request.headers.get('x-client-schema-version')).toBe('1');
}

function expectSecretsAbsentFromUrl(request: CapturedRequest): void {
  expect(request.url.search).toBe('');
  expect(request.url.href).not.toContain(ID_TOKEN);
  expect(request.url.href).not.toContain(APP_CHECK_TOKEN);
  expect(request.url.href).not.toContain(ROLE_CONTEXT_ID);
  expect(request.url.href).not.toContain(INSTALLATION_ID);
}

function unavailableProblem() {
  return {
    code: 'DEPENDENCY_UNAVAILABLE',
    correlationId: CORRELATION_ID,
    detail: 'Identity dependency is not configured.',
    fieldErrors: [],
    retryable: true,
    status: 503,
    title: 'Dependency unavailable',
    type: 'https://smart-fasal.example/problems/dependency-unavailable',
  } as const;
}

function farmerRoleContext(overrides: Record<string, unknown> = {}) {
  return {
    authorizationVersion: 7,
    capabilities: [],
    capabilitySetVersion: 3,
    environment: 'local',
    purposeCode: 'farmer.self_service',
    roleContextId: ROLE_CONTEXT_ID,
    roleType: 'FARMER',
    subjectId: SUBJECT_ID,
    ...overrides,
  };
}

function farmerSession(overrides: Record<string, unknown> = {}) {
  return {
    activeRoleContext: farmerRoleContext(),
    authorizationVersion: 7,
    capabilitySetVersion: 3,
    deviceBindingState: 'ACTIVE',
    environment: 'local',
    mfaState: 'NOT_REQUIRED',
    roles: [],
    subjectId: SUBJECT_ID,
    subjectType: 'FARMER',
    ...overrides,
  };
}

function farmerBootstrap(overrides: Record<string, unknown> = {}) {
  return {
    authorizationVersion: 7,
    capabilities: [],
    farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
    locale: 'mr',
    onboardingState: 'COMPLETE',
    subjectId: SUBJECT_ID,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Farmer shell problem mapping', () => {
  it.each([
    ['AUTHENTICATION_REQUIRED', 401, 'unauthenticated'],
    [undefined, 401, 'unauthenticated'],
    ['AUTHORIZATION_DENIED', 403, 'denied'],
    [undefined, 403, 'denied'],
    ['AUTHORIZATION_VERSION_CHANGED', 409, 'expired'],
    ['SOURCE_VERSION_EXPIRED', 409, 'expired'],
    ['CONSENT_OR_ACCESS_VERSION_CHANGED', 409, 'withdrawn'],
    ['DEPENDENCY_UNAVAILABLE', 503, 'unavailable'],
  ] as const)('maps %s without collapsing security states', (code, status, expected) => {
    expect(problemToShellIssue(code, status)).toBe(expected);
  });
});

describe('Farmer API boundary', () => {
  it('creates a return state with App Check and required metadata in headers only', async () => {
    const requests = installFetchQueue({
      body: {
        expiresAt: '2026-07-13T10:05:00.000Z',
        returnStateId: RETURN_STATE_ID,
      },
    });

    await expect(
      createFarmerReturnState(APP_CHECK_TOKEN, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe(RETURN_STATE_ID);

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe('POST');
    expect(request.url.origin).toBe(API_ORIGIN);
    expect(request.url.pathname).toBe('/v1/auth/return-states');
    expectRequiredHeaders(request);
    expect(request.headers.get('x-firebase-appcheck')).toBe(APP_CHECK_TOKEN);
    expect(request.headers.has('authorization')).toBe(false);
    expect(JSON.parse(request.body)).toEqual({ routeKey: 'FARMER_HOME' });
    expectSecretsAbsentFromUrl(request);
  });

  it('returns the accepted role-context id for memory-only caller storage', async () => {
    const requests = installFetchQueue(
      {
        body: {
          authorizationVersion: 7,
          capabilitySetVersion: 3,
          deviceBindingState: 'ACTIVE',
          environment: 'local',
          mfaState: 'NOT_REQUIRED',
          roles: [
            {
              capabilitySetVersion: 3,
              destination: '/farmer/today',
              roleGrantId: ROLE_GRANT_ID,
              roleType: 'FARMER',
            },
          ],
          subjectId: SUBJECT_ID,
          subjectType: 'FARMER',
        },
      },
      {
        body: {
          commandId: COMMAND_ID,
          disposition: 'ACCEPTED',
          eventIds: ['identity-role-context-created-event'],
          result: { id: ROLE_CONTEXT_ID, revision: 1, type: 'roleContext' },
          serverReceivedAt: '2026-07-13T10:00:01.000Z',
        },
      },
    );

    const result = await establishFarmerRole(credentials, INSTALLATION_ID, {
      baseUrl: API_ORIGIN,
      roleCommand: {
        commandId: COMMAND_ID,
        recordedAt: '2026-07-13T10:00:00.000Z',
        timezone: 'Asia/Kolkata',
      },
    });

    expect(result).toEqual({ kind: 'ready', roleContextId: ROLE_CONTEXT_ID });
    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.url.pathname)).toEqual([
      '/v1/auth/roles',
      '/v1/auth/role-contexts',
    ]);
    for (const request of requests) {
      expectRequiredHeaders(request);
      expect(request.headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
      expect(request.headers.get('x-firebase-appcheck')).toBe(APP_CHECK_TOKEN);
      expect(request.headers.has('x-role-context-id')).toBe(false);
      expectSecretsAbsentFromUrl(request);
    }

    const commandRequest = requests[1]!;
    expect(commandRequest.headers.get('idempotency-key')).toBe(COMMAND_ID);
    expect(JSON.parse(commandRequest.body)).toMatchObject({
      operation: 'SelectRoleContext',
      payload: { roleGrantId: ROLE_GRANT_ID },
      target: { id: COMMAND_ID, type: 'roleContext' },
    });
  });

  it('reuses an already active Farmer role context without issuing a command', async () => {
    const requests = installFetchQueue({ body: farmerSession() });

    await expect(
      establishFarmerRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toEqual({ kind: 'ready', roleContextId: ROLE_CONTEXT_ID });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url.pathname).toBe('/v1/auth/roles');
  });

  it('keeps a typed role-list dependency failure distinct', async () => {
    installFetchQueue({
      body: unavailableProblem(),
      contentType: 'application/problem+json',
      status: 503,
    });

    await expect(
      establishFarmerRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe('unavailable');
  });

  it('denies role establishment when no Farmer grant exists', async () => {
    installFetchQueue({
      body: farmerSession({ activeRoleContext: undefined, roles: [] }),
    });

    await expect(
      establishFarmerRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe('denied');
  });

  it('denies a role-selection receipt that does not identify a role context', async () => {
    installFetchQueue(
      {
        body: farmerSession({
          activeRoleContext: undefined,
          roles: [
            {
              capabilitySetVersion: 3,
              destination: '/farmer/today',
              roleGrantId: ROLE_GRANT_ID,
              roleType: 'FARMER',
            },
          ],
        }),
      },
      {
        body: {
          commandId: COMMAND_ID,
          disposition: 'ACCEPTED',
          eventIds: [],
          result: { id: ROLE_CONTEXT_ID, revision: 1, type: 'accessGrant' },
          serverReceivedAt: '2026-07-13T10:00:01.000Z',
        },
      },
    );

    await expect(
      establishFarmerRole(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleCommand: {
          commandId: COMMAND_ID,
          recordedAt: '2026-07-13T10:00:00.000Z',
          timezone: 'Asia/Kolkata',
        },
      }),
    ).resolves.toBe('denied');
  });

  it('returns unavailable when role establishment cannot reach the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(
      establishFarmerRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe('unavailable');
  });

  it('loads the protected shell with the role context and client metadata in headers only', async () => {
    const activeRoleContext = {
      authorizationVersion: 7,
      capabilities: [],
      capabilitySetVersion: 3,
      environment: 'local',
      purposeCode: 'farmer.self_service',
      roleContextId: ROLE_CONTEXT_ID,
      roleType: 'FARMER',
      subjectId: SUBJECT_ID,
    } as const;
    const requests = installFetchQueue(
      {
        body: {
          activeRoleContext,
          authorizationVersion: 7,
          capabilitySetVersion: 3,
          deviceBindingState: 'ACTIVE',
          environment: 'local',
          mfaState: 'NOT_REQUIRED',
          roles: [],
          subjectId: SUBJECT_ID,
          subjectType: 'FARMER',
        },
      },
      {
        body: {
          authorizationVersion: 7,
          capabilities: [],
          farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
          locale: 'mr',
          onboardingState: 'COMPLETE',
          subjectId: SUBJECT_ID,
        },
      },
    );

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({
      authorizationVersion: 7,
      environment: 'local',
      farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
      kind: 'ready',
      onboardingState: 'COMPLETE',
      role: 'FARMER',
      subjectId: SUBJECT_ID,
    });

    expect(requests.map((request) => request.url.pathname)).toEqual([
      '/v1/auth/session',
      '/v1/farmer/bootstrap',
      '/v1/farmer/today',
    ]);
    for (const request of requests) {
      expectRequiredHeaders(request);
      expect(request.headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
      expect(request.headers.get('x-firebase-appcheck')).toBe(APP_CHECK_TOKEN);
      expect(request.headers.get('x-role-context-id')).toBe(ROLE_CONTEXT_ID);
      expectSecretsAbsentFromUrl(request);
    }
  });

  it('preserves a typed dependency-unavailable shell result', async () => {
    const requests = installFetchQueue({
      body: unavailableProblem(),
      contentType: 'application/problem+json',
      status: 503,
    });

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.get('x-role-context-id')).toBe(ROLE_CONTEXT_ID);
    expectSecretsAbsentFromUrl(requests[0]!);
  });

  it('denies a shell load before a role context is selected without making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toEqual({ kind: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing active context', farmerSession({ activeRoleContext: undefined }), 'expired'],
    [
      'wrong active role',
      farmerSession({ activeRoleContext: farmerRoleContext({ roleType: 'RSK' }) }),
      'denied',
    ],
    ['expired MFA assurance', farmerSession({ mfaState: 'EXPIRED' }), 'expired'],
    ['inactive device binding', farmerSession({ deviceBindingState: 'REVOKED' }), 'denied'],
  ] as const)('handles %s', async (_case, session, expected) => {
    installFetchQueue({ body: session });

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: expected });
  });

  it('expires a shell when bootstrap authorization changed after session resolution', async () => {
    installFetchQueue(
      { body: farmerSession() },
      { body: farmerBootstrap({ authorizationVersion: 8 }) },
    );

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'expired' });
  });

  it('preserves a typed bootstrap dependency failure', async () => {
    installFetchQueue(
      { body: farmerSession() },
      {
        body: unavailableProblem(),
        contentType: 'application/problem+json',
        status: 503,
      },
    );

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable when a shell request cannot reach the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(
      loadFarmerShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('revokes the selected role context with an idempotent authenticated command', async () => {
    const requests = installFetchQueue({
      body: {
        commandId: COMMAND_ID,
        disposition: 'ALREADY_ACCEPTED',
        eventIds: ['identity-role-context-revoked-event'],
        result: { id: ROLE_CONTEXT_ID, revision: 2, type: 'roleContext' },
        serverReceivedAt: '2026-07-13T10:02:00.000Z',
      },
    });

    await expect(
      revokeFarmerRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        baseUrl: API_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(true);

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe('DELETE');
    expect(request.url.pathname).toBe(`/v1/auth/role-contexts/${ROLE_CONTEXT_ID}`);
    expect(request.url.search).toBe('');
    expect(request.url.href).not.toContain(ID_TOKEN);
    expect(request.url.href).not.toContain(APP_CHECK_TOKEN);
    expect(request.url.href).not.toContain(INSTALLATION_ID);
    expectRequiredHeaders(request);
    expect(request.headers.get('authorization')).toBe(`Bearer ${ID_TOKEN}`);
    expect(request.headers.get('x-firebase-appcheck')).toBe(APP_CHECK_TOKEN);
    expect(request.headers.get('x-role-context-id')).toBe(ROLE_CONTEXT_ID);
    expect(request.headers.get('idempotency-key')).toBe(COMMAND_ID);
  });

  it('does not treat a typed revoke failure as successful', async () => {
    installFetchQueue({
      body: unavailableProblem(),
      contentType: 'application/problem+json',
      status: 503,
    });

    await expect(
      revokeFarmerRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        baseUrl: API_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(false);
  });

  it('does not treat a failed revoke request as successful', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(
      revokeFarmerRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        baseUrl: API_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(false);
  });
});
