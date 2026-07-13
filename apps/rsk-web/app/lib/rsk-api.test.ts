import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createRskReturnState,
  establishRskRole,
  loadRskShell,
  problemToShellIssue,
  revokeRskRoleContext,
} from './rsk-api';

const API_ORIGIN = 'https://rsk-api.local.example';
const APP_CHECK_TOKEN = 'rsk-app-check-secret';
const ID_TOKEN = 'rsk-id-token-secret';
const INSTALLATION_ID = 'rsk-installation-a';
const SUBJECT_ID = '71111111-1111-4111-8111-111111111111';
const ROLE_GRANT_ID = '72222222-2222-4222-8222-222222222222';
const ROLE_CONTEXT_ID = '73333333-3333-4333-8333-333333333333';
const COMMAND_ID = '74444444-4444-4444-8444-444444444444';
const RETURN_STATE_ID = '75555555-5555-4555-8555-555555555555';
const CORRELATION_ID = '76666666-6666-4666-8666-666666666666';
const OFFICE_ID = '77777777-7777-4777-8777-777777777777';
const JURISDICTION_ID = '78888888-8888-4888-8888-888888888888';

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
    process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'rsk-web-local',
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
    detail: 'Authorization dependency is not configured.',
    fieldErrors: [],
    retryable: true,
    status: 503,
    title: 'Dependency unavailable',
    type: 'https://smart-fasal.example/problems/dependency-unavailable',
  } as const;
}

function rskRoleContext(overrides: Record<string, unknown> = {}) {
  return {
    authorizationVersion: 12,
    capabilities: ['rsk.work.read'],
    capabilitySetVersion: 5,
    environment: 'local',
    jurisdictionId: JURISDICTION_ID,
    officeId: OFFICE_ID,
    purposeCode: 'assisted.service',
    roleContextId: ROLE_CONTEXT_ID,
    roleType: 'RSK',
    subjectId: SUBJECT_ID,
    ...overrides,
  };
}

function rskSession(overrides: Record<string, unknown> = {}) {
  return {
    activeRoleContext: rskRoleContext(),
    authorizationVersion: 12,
    capabilitySetVersion: 5,
    deviceBindingState: 'ACTIVE',
    environment: 'local',
    mfaState: 'CURRENT',
    roles: [],
    subjectId: SUBJECT_ID,
    subjectType: 'STAFF',
    ...overrides,
  };
}

function rskBootstrap(overrides: Record<string, unknown> = {}) {
  return {
    authorizationVersion: 12,
    capabilities: ['rsk.work.read'],
    jurisdictionId: JURISDICTION_ID,
    officeId: OFFICE_ID,
    subjectId: SUBJECT_ID,
    workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RSK shell problem mapping', () => {
  it.each([
    ['AUTHENTICATION_REQUIRED', 401, 'unauthenticated'],
    [undefined, 401, 'unauthenticated'],
    ['AUTHORIZATION_DENIED', 403, 'denied'],
    [undefined, 403, 'denied'],
    ['AUTHORIZATION_VERSION_CHANGED', 409, 'expired'],
    ['SOURCE_VERSION_EXPIRED', 409, 'expired'],
    ['CONSENT_OR_ACCESS_VERSION_CHANGED', 409, 'withdrawn'],
    ['DEPENDENCY_UNAVAILABLE', 503, 'unavailable'],
  ] as const)('keeps %s distinct', (code, status, expected) => {
    expect(problemToShellIssue(code, status)).toBe(expected);
  });
});

describe('RSK API boundary', () => {
  it('creates a return state with App Check and required metadata in headers only', async () => {
    const requests = installFetchQueue({
      body: {
        expiresAt: '2026-07-13T10:05:00.000Z',
        returnStateId: RETURN_STATE_ID,
      },
    });

    await expect(
      createRskReturnState(APP_CHECK_TOKEN, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe(RETURN_STATE_ID);

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe('POST');
    expect(request.url.origin).toBe(API_ORIGIN);
    expect(request.url.pathname).toBe('/v1/auth/return-states');
    expectRequiredHeaders(request);
    expect(request.headers.get('x-firebase-appcheck')).toBe(APP_CHECK_TOKEN);
    expect(request.headers.has('authorization')).toBe(false);
    expect(JSON.parse(request.body)).toEqual({ routeKey: 'RSK_HOME' });
    expectSecretsAbsentFromUrl(request);
  });

  it('returns the accepted role-context id for memory-only caller storage', async () => {
    const requests = installFetchQueue(
      {
        body: {
          authorizationVersion: 12,
          capabilitySetVersion: 5,
          deviceBindingState: 'ACTIVE',
          environment: 'local',
          mfaState: 'CURRENT',
          roles: [
            {
              capabilitySetVersion: 5,
              destination: '/rsk/work',
              jurisdictionId: JURISDICTION_ID,
              officeId: OFFICE_ID,
              roleGrantId: ROLE_GRANT_ID,
              roleType: 'RSK',
            },
          ],
          subjectId: SUBJECT_ID,
          subjectType: 'STAFF',
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

    const result = await establishRskRole(credentials, INSTALLATION_ID, {
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
      payload: {
        jurisdictionId: JURISDICTION_ID,
        officeId: OFFICE_ID,
        roleGrantId: ROLE_GRANT_ID,
      },
      target: { id: COMMAND_ID, type: 'roleContext' },
    });
  });

  it('reuses an already active RSK role context without issuing a command', async () => {
    const requests = installFetchQueue({ body: rskSession() });

    await expect(
      establishRskRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
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
      establishRskRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe('unavailable');
  });

  it.each([
    ['expired MFA assurance', rskSession({ mfaState: 'EXPIRED' }), 'expired'],
    ['missing current MFA', rskSession({ mfaState: 'REQUIRED' }), 'denied'],
    [
      'missing office assignment',
      rskSession({
        activeRoleContext: undefined,
        roles: [
          {
            capabilitySetVersion: 5,
            destination: '/rsk/work',
            jurisdictionId: JURISDICTION_ID,
            roleGrantId: ROLE_GRANT_ID,
            roleType: 'RSK',
          },
        ],
      }),
      'denied',
    ],
    [
      'missing jurisdiction assignment',
      rskSession({
        activeRoleContext: undefined,
        roles: [
          {
            capabilitySetVersion: 5,
            destination: '/rsk/work',
            officeId: OFFICE_ID,
            roleGrantId: ROLE_GRANT_ID,
            roleType: 'RSK',
          },
        ],
      }),
      'denied',
    ],
  ] as const)('handles %s', async (_case, session, expected) => {
    installFetchQueue({ body: session });

    await expect(
      establishRskRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe(expected);
  });

  it('denies a role-selection receipt that does not identify a role context', async () => {
    installFetchQueue(
      {
        body: rskSession({
          activeRoleContext: undefined,
          roles: [
            {
              capabilitySetVersion: 5,
              destination: '/rsk/work',
              jurisdictionId: JURISDICTION_ID,
              officeId: OFFICE_ID,
              roleGrantId: ROLE_GRANT_ID,
              roleType: 'RSK',
            },
          ],
        }),
      },
      {
        body: {
          commandId: COMMAND_ID,
          disposition: 'REJECTED',
          eventIds: [],
          serverReceivedAt: '2026-07-13T10:00:01.000Z',
        },
      },
    );

    await expect(
      establishRskRole(credentials, INSTALLATION_ID, {
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
      establishRskRole(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toBe('unavailable');
  });

  it('loads the protected shell with the role context and client metadata in headers only', async () => {
    const activeRoleContext = {
      authorizationVersion: 12,
      capabilities: ['rsk.work.read'],
      capabilitySetVersion: 5,
      environment: 'local',
      jurisdictionId: JURISDICTION_ID,
      officeId: OFFICE_ID,
      purposeCode: 'assisted.service',
      roleContextId: ROLE_CONTEXT_ID,
      roleType: 'RSK',
      subjectId: SUBJECT_ID,
    } as const;
    const requests = installFetchQueue(
      {
        body: {
          activeRoleContext,
          authorizationVersion: 12,
          capabilitySetVersion: 5,
          deviceBindingState: 'ACTIVE',
          environment: 'local',
          mfaState: 'CURRENT',
          roles: [],
          subjectId: SUBJECT_ID,
          subjectType: 'STAFF',
        },
      },
      {
        body: {
          authorizationVersion: 12,
          capabilities: ['rsk.work.read'],
          jurisdictionId: JURISDICTION_ID,
          officeId: OFFICE_ID,
          subjectId: SUBJECT_ID,
          workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
        },
      },
    );

    await expect(
      loadRskShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({
      authorizationVersion: 12,
      environment: 'local',
      jurisdictionId: JURISDICTION_ID,
      kind: 'ready',
      officeId: OFFICE_ID,
      role: 'RSK',
      subjectId: SUBJECT_ID,
      workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    });

    expect(requests.map((request) => request.url.pathname)).toEqual([
      '/v1/auth/session',
      '/v1/rsk/bootstrap',
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
      loadRskShell(credentials, INSTALLATION_ID, {
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
      loadRskShell(credentials, INSTALLATION_ID, { baseUrl: API_ORIGIN }),
    ).resolves.toEqual({ kind: 'denied' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing active context', rskSession({ activeRoleContext: undefined }), 'expired'],
    [
      'wrong active role',
      rskSession({ activeRoleContext: rskRoleContext({ roleType: 'FARMER' }) }),
      'denied',
    ],
    ['expired MFA assurance', rskSession({ mfaState: 'EXPIRED' }), 'expired'],
    ['missing current MFA', rskSession({ mfaState: 'REQUIRED' }), 'denied'],
    ['inactive device binding', rskSession({ deviceBindingState: 'REVOKED' }), 'denied'],
  ] as const)('handles %s', async (_case, session, expected) => {
    installFetchQueue({ body: session });

    await expect(
      loadRskShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: expected });
  });

  it.each([
    ['authorization version', rskBootstrap({ authorizationVersion: 13 })],
    ['office assignment', rskBootstrap({ officeId: ROLE_CONTEXT_ID })],
    ['jurisdiction assignment', rskBootstrap({ jurisdictionId: ROLE_CONTEXT_ID })],
  ] as const)('expires a shell after a changed %s', async (_case, bootstrap) => {
    installFetchQueue({ body: rskSession() }, { body: bootstrap });

    await expect(
      loadRskShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'expired' });
  });

  it('preserves a typed bootstrap dependency failure', async () => {
    installFetchQueue(
      { body: rskSession() },
      {
        body: unavailableProblem(),
        contentType: 'application/problem+json',
        status: 503,
      },
    );

    await expect(
      loadRskShell(credentials, INSTALLATION_ID, {
        baseUrl: API_ORIGIN,
        roleContextId: ROLE_CONTEXT_ID,
      }),
    ).resolves.toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable when a shell request cannot reach the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(
      loadRskShell(credentials, INSTALLATION_ID, {
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
      revokeRskRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
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
      revokeRskRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        baseUrl: API_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(false);
  });

  it('does not treat a failed revoke request as successful', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(
      revokeRskRoleContext(credentials, INSTALLATION_ID, ROLE_CONTEXT_ID, {
        baseUrl: API_ORIGIN,
        revokeCommandId: COMMAND_ID,
      }),
    ).resolves.toBe(false);
  });
});
