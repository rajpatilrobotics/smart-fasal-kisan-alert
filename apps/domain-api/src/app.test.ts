import { ProblemDetailsSchema } from '@smart-fasal/contracts/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildDomainApi, type DomainApiOptions } from './app.js';
import {
  ApiBoundaryProblem,
  type AppCheckVerifier,
  type DomainOperationAdapter,
  type DomainOperationId,
  type IdentityVerifier,
  type ProtectedDisclosureService,
  type RequestAuthorizer,
  type SafeRequestLogRecord,
} from './boundary.js';

const SUBJECT_ID = '10000000-0000-4000-8000-000000000001';
const ROLE_GRANT_ID = '10000000-0000-4000-8000-000000000002';
const ROLE_CONTEXT_ID = '10000000-0000-4000-8000-000000000003';
const TARGET_ID = '10000000-0000-4000-8000-000000000004';
const POLICY_ID = '10000000-0000-4000-8000-000000000005';
const COMMAND_ID = '10000000-0000-4000-8000-000000000006';
const EVENT_ID = '10000000-0000-4000-8000-000000000007';
const OFFICE_ID = '10000000-0000-4000-8000-000000000008';
const JURISDICTION_ID = '10000000-0000-4000-8000-000000000009';
const IDEMPOTENCY_KEY = '10000000-0000-4000-8000-000000000010';
const RETURN_STATE_ID = '10000000-0000-4000-8000-000000000011';
const FUTURE = '2099-01-01T00:00:00.000Z';
const NOW = '2026-07-13T00:00:00.000Z';

const openApps: ReturnType<typeof buildDomainApi>[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map(async (app) => app.close()));
  vi.restoreAllMocks();
});

function fakeIdentityVerifier(): IdentityVerifier {
  return {
    mode: 'synthetic-test',
    verifyIdToken(token) {
      if (token !== 'known-identity-token') return Promise.reject(new Error('unknown identity'));
      return Promise.resolve({
        subjectId: SUBJECT_ID,
        subjectType: 'FARMER',
        environment: 'local',
        expiresAt: FUTURE,
        securityVersion: 1,
        mfaState: 'NOT_REQUIRED',
      });
    },
  };
}

function fakeAppCheckVerifier(): AppCheckVerifier {
  return {
    mode: 'synthetic-test',
    verifyAppCheckToken(token, options) {
      if (token !== 'known-app-check-token') return Promise.reject(new Error('unknown app check'));
      return Promise.resolve({
        appId: `${options.surface.toLowerCase()}-app`,
        environment: 'local',
        expiresAt: FUTURE,
      });
    },
  };
}

function allowAllAuthorizer(): RequestAuthorizer {
  return { authorize: () => Promise.resolve({ allowed: true }) };
}

function sessionResponse() {
  return {
    subjectId: SUBJECT_ID,
    subjectType: 'FARMER',
    environment: 'local',
    mfaState: 'NOT_REQUIRED',
    deviceBindingState: 'ACTIVE',
    authorizationVersion: 1,
    capabilitySetVersion: 1,
    roles: [],
  };
}

function commandResult() {
  return {
    commandId: COMMAND_ID,
    disposition: 'ACCEPTED',
    result: { type: 'consentDecision', id: TARGET_ID, revision: 1 },
    eventIds: [EVENT_ID],
    serverReceivedAt: NOW,
  };
}

function fakeOperations(
  onExecute?: (operationId: DomainOperationId) => void,
): DomainOperationAdapter {
  return {
    execute(request) {
      onExecute?.(request.operationId);
      const responses: Partial<Record<DomainOperationId, unknown>> = {
        createReturnState: { returnStateId: RETURN_STATE_ID, expiresAt: FUTURE },
        getAuthSession: sessionResponse(),
        listRoles: sessionResponse(),
        selectRoleContext: commandResult(),
        revokeRoleContext: commandResult(),
        getFarmerBootstrap: {
          subjectId: SUBJECT_ID,
          locale: 'mr',
          onboardingState: 'NOT_STARTED',
          authorizationVersion: 1,
          capabilities: [],
          farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
          deviceMode: 'PERSONAL',
          setup: {
            status: 'NOT_STARTED',
            conflictCount: 0,
            syncStatus: 'SYNCED',
          },
        },
        listFarmerConsents: { items: [], revision: 0 },
        recordConsentDecision: commandResult(),
        getRskBootstrap: {
          subjectId: SUBJECT_ID,
          officeId: OFFICE_ID,
          jurisdictionId: JURISDICTION_ID,
          authorizationVersion: 1,
          capabilities: [],
          workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
        },
        issueRskAccessGrant: commandResult(),
        createRskProtectedDisclosure: {
          targetId: TARGET_ID,
          accessVersion: 1,
          fields: { displayName: 'Synthetic Farmer', contact: 'synthetic-contact' },
          auditedAt: NOW,
        },
      };
      return Promise.resolve(responses[request.operationId]);
    },
  };
}

function fakeProtectedDisclosure(): ProtectedDisclosureService {
  return {
    disclose: () =>
      Promise.resolve({
        allowed: true,
        response: {
          targetId: TARGET_ID,
          accessVersion: 1,
          fields: { displayName: 'Synthetic Farmer', contact: 'synthetic-contact' },
          auditedAt: NOW,
        },
      }),
  };
}

function testOptions(overrides: Partial<DomainApiOptions> = {}): DomainApiOptions {
  return {
    environment: 'local',
    runtimeMode: 'test',
    origins: {
      farmer: ['http://farmer.test'],
      rsk: ['http://rsk.test'],
      mp: ['http://mp.test'],
    },
    appIds: {
      farmer: ['farmer-app'],
      rsk: ['rsk-app'],
      mp: ['mp-app'],
    },
    identityVerifier: fakeIdentityVerifier(),
    appCheckVerifier: fakeAppCheckVerifier(),
    authorizer: allowAllAuthorizer(),
    operations: fakeOperations(),
    protectedDisclosure: fakeProtectedDisclosure(),
    ...overrides,
  };
}

function openApp(options: DomainApiOptions = testOptions()) {
  const app = buildDomainApi(options);
  openApps.push(app);
  return app;
}

function browserHeaders(origin = 'http://farmer.test') {
  return {
    origin,
    authorization: 'Bearer known-identity-token',
    'x-firebase-appcheck': 'known-app-check-token',
    'x-client-installation-id': 'installation.synthetic.1',
    'x-client-build': '1.0.0-test',
    'x-client-schema-version': '1',
  };
}

function businessHeaders(origin = 'http://farmer.test') {
  return {
    ...browserHeaders(origin),
    'x-role-context-id': ROLE_CONTEXT_ID,
  };
}

function commandHeaders(origin = 'http://farmer.test') {
  return {
    ...browserHeaders(origin),
    'idempotency-key': IDEMPOTENCY_KEY,
    'if-match': '"rev:0"',
  };
}

function businessCommandHeaders(origin = 'http://farmer.test') {
  return {
    ...commandHeaders(origin),
    'x-role-context-id': ROLE_CONTEXT_ID,
  };
}

function clientContext() {
  return { clientRecordedAt: NOW, timezone: 'Asia/Kolkata', dataModeClaim: 'SIMULATED' };
}

function selectRoleCommand() {
  return {
    commandSchemaVersion: 1,
    operation: 'SelectRoleContext',
    target: { type: 'roleContext', id: ROLE_CONTEXT_ID },
    expectedRevision: 0,
    payload: { roleGrantId: ROLE_GRANT_ID },
    clientContext: clientContext(),
  };
}

function consentCommand() {
  return {
    commandSchemaVersion: 1,
    operation: 'RecordConsentDecision',
    target: { type: 'consentDecision', id: TARGET_ID },
    expectedRevision: 0,
    payload: {
      decision: 'ALLOW',
      scopeKey: 'location.processing',
      purposeKey: 'farmer.self_service',
      targetKind: 'ACCOUNT',
      targetId: TARGET_ID,
      policyVersionId: POLICY_ID,
    },
    clientContext: clientContext(),
  };
}

function accessGrantCommand() {
  return {
    commandSchemaVersion: 1,
    operation: 'IssueAccessGrant',
    target: { type: 'accessGrant', id: TARGET_ID },
    expectedRevision: 0,
    payload: {
      targetKind: 'ASSISTED_FARMER_CONTEXT',
      targetId: TARGET_ID,
      farmerSubjectId: SUBJECT_ID,
      purposeKey: 'assisted.service',
      consentAccessVersion: 1,
      expiresAt: FUTURE,
    },
    clientContext: clientContext(),
  };
}

function protectedBrowserRequests() {
  const returnStateHeaders = browserHeaders();
  delete (returnStateHeaders as Partial<typeof returnStateHeaders>).authorization;
  const roleContextHeaders = commandHeaders();
  delete (roleContextHeaders as Partial<typeof roleContextHeaders>)['if-match'];

  return [
    {
      method: 'POST',
      url: '/v1/auth/return-states',
      headers: returnStateHeaders,
      payload: { routeKey: 'FARMER_HOME' },
    },
    { method: 'GET', url: '/v1/auth/session', headers: browserHeaders() },
    { method: 'GET', url: '/v1/auth/roles', headers: browserHeaders() },
    {
      method: 'POST',
      url: '/v1/auth/role-contexts',
      headers: roleContextHeaders,
      payload: selectRoleCommand(),
    },
    {
      method: 'DELETE',
      url: `/v1/auth/role-contexts/${ROLE_CONTEXT_ID}`,
      headers: roleContextHeaders,
    },
    { method: 'GET', url: '/v1/farmer/bootstrap', headers: businessHeaders() },
    { method: 'GET', url: '/v1/farmer/consents', headers: businessHeaders() },
    {
      method: 'POST',
      url: '/v1/farmer/consent-decisions',
      headers: businessCommandHeaders(),
      payload: consentCommand(),
    },
    {
      method: 'GET',
      url: '/v1/rsk/bootstrap',
      headers: businessHeaders('http://rsk.test'),
    },
    {
      method: 'POST',
      url: '/v1/rsk/access-grants',
      headers: businessCommandHeaders('http://rsk.test'),
      payload: accessGrantCommand(),
    },
    {
      method: 'POST',
      url: '/v1/rsk/protected-disclosures',
      headers: businessHeaders('http://rsk.test'),
      payload: {
        targetKind: 'ASSISTED_FARMER_CONTEXT',
        targetId: TARGET_ID,
        purposeKey: 'assisted.service',
        expectedAccessVersion: 1,
        fieldSet: 'CONTACT',
      },
    },
  ] as const;
}

describe('domain API route contracts', () => {
  it('exposes the twelve approved non-MP routes and no MP query route', async () => {
    const executed: DomainOperationId[] = [];
    const app = openApp(testOptions({ operations: fakeOperations((id) => executed.push(id)) }));

    const requests = [
      { method: 'GET', url: '/v1/system/reachability' },
      ...protectedBrowserRequests(),
    ] as const;

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode, `${request.method} ${request.url}`).toBe(200);
    }

    expect(executed).toEqual([
      'createReturnState',
      'getAuthSession',
      'listRoles',
      'selectRoleContext',
      'revokeRoleContext',
      'getFarmerBootstrap',
      'listFarmerConsents',
      'recordConsentDecision',
      'getRskBootstrap',
      'issueRskAccessGrant',
    ]);

    const forbidden = await app.inject({
      method: 'GET',
      url: '/v1/mp/query-context',
      headers: browserHeaders('http://mp.test'),
    });
    expect(forbidden.statusCode).toBe(404);
    expect(forbidden.headers['content-type']).toContain('application/problem+json');
    expect(ProblemDetailsSchema.safeParse(forbidden.json()).success).toBe(true);
  });

  it('requires schema version 1 on every protected browser route', async () => {
    const app = openApp();

    for (const request of protectedBrowserRequests()) {
      const headers: Record<string, string> = { ...request.headers };
      delete headers['x-client-schema-version'];
      const response = await app.inject({ ...request, headers });

      expect(response.statusCode, `${request.method} ${request.url}`).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        fieldErrors: [expect.objectContaining({ field: 'x-client-schema-version' })],
      });
    }

    for (const schemaVersion of ['not-a-version', '2']) {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/farmer/bootstrap',
        headers: { ...businessHeaders(), 'x-client-schema-version': schemaVersion },
      });
      expect(response.statusCode, schemaVersion).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    }
  });

  it('requires a UUID role context on every Farmer and RSK business route', async () => {
    const app = openApp();
    const businessRequests = protectedBrowserRequests().filter(
      (request) => request.url.startsWith('/v1/farmer/') || request.url.startsWith('/v1/rsk/'),
    );

    for (const request of businessRequests) {
      const headers: Record<string, string> = { ...request.headers };
      delete headers['x-role-context-id'];
      const response = await app.inject({ ...request, headers });

      expect(response.statusCode, `${request.method} ${request.url}`).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.json()).toMatchObject({
        code: 'INVALID_STATE_TRANSITION',
        fieldErrors: [expect.objectContaining({ field: 'x-role-context-id' })],
      });
    }

    const malformed = await app.inject({
      method: 'GET',
      url: '/v1/farmer/bootstrap',
      headers: { ...businessHeaders(), 'x-role-context-id': 'not-a-uuid' },
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.headers['content-type']).toContain('application/problem+json');
  });

  it('returns common typed boundary failures route by route', async () => {
    const app = openApp();
    const unavailableOptions = testOptions();
    delete unavailableOptions.appCheckVerifier;
    const unavailableApp = openApp(unavailableOptions);

    for (const request of protectedBrowserRequests()) {
      const authenticationHeaders: Record<string, string> = { ...request.headers };
      if (request.url === '/v1/auth/return-states') {
        delete authenticationHeaders['x-firebase-appcheck'];
      } else {
        delete authenticationHeaders['authorization'];
      }
      const unauthenticated = await app.inject({ ...request, headers: authenticationHeaders });
      expect(unauthenticated.statusCode, `${request.method} ${request.url} 401`).toBe(401);
      expect(unauthenticated.headers['content-type']).toContain('application/problem+json');
      expect(unauthenticated.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });

      const denied = await app.inject({
        ...request,
        headers: { ...request.headers, origin: 'http://attacker.test' },
      });
      expect(denied.statusCode, `${request.method} ${request.url} 403`).toBe(403);
      expect(denied.headers['content-type']).toContain('application/problem+json');
      expect(denied.json()).toMatchObject({ code: 'AUTHORIZATION_DENIED' });

      const unavailable = await unavailableApp.inject(request);
      expect(unavailable.statusCode, `${request.method} ${request.url} 503`).toBe(503);
      expect(unavailable.headers['content-type']).toContain('application/problem+json');
      expect(unavailable.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    }

    const versionConflictApp = openApp(
      testOptions({
        authorizer: {
          authorize: () =>
            Promise.resolve({ allowed: false, code: 'AUTHORIZATION_VERSION_CHANGED' }),
        },
      }),
    );
    for (const request of protectedBrowserRequests().filter(
      (candidate) => candidate.url !== '/v1/auth/return-states',
    )) {
      const conflict = await versionConflictApp.inject(request);
      expect(conflict.statusCode, `${request.method} ${request.url} 409`).toBe(409);
      expect(conflict.headers['content-type']).toContain('application/problem+json');
      expect(conflict.json()).toMatchObject({ code: 'AUTHORIZATION_VERSION_CHANGED' });
    }
  });

  it('returns 429 only from the rate-limited return-state route contract', async () => {
    const fallback = fakeOperations();
    const app = openApp(
      testOptions({
        operations: {
          execute: (request) =>
            request.operationId === 'createReturnState'
              ? Promise.reject(
                  new ApiBoundaryProblem({
                    code: 'RATE_LIMITED',
                    status: 429,
                    title: 'Too many return-state requests.',
                    retryable: true,
                  }),
                )
              : fallback.execute(request),
        },
      }),
    );
    const request = protectedBrowserRequests()[0];
    const response = await app.inject(request);

    expect(response.statusCode).toBe(429);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });

  it('strictly rejects unknown request fields before invoking the operation adapter', async () => {
    const execute = vi.fn<DomainOperationAdapter['execute']>();
    const app = openApp(testOptions({ operations: { execute } }));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/return-states',
      headers: browserHeaders(),
      payload: { routeKey: 'FARMER_HOME', arbitraryReturnUrl: 'https://attacker.invalid' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(execute).not.toHaveBeenCalled();
    expect(ProblemDetailsSchema.safeParse(response.json()).success).toBe(true);
  });

  it.each([
    ['malformed JSON', 'application/json', '{'],
    ['unsupported body media type', 'application/xml', '<return-state />'],
  ])('normalizes %s to typed 400 Problem Details', async (_case, contentType, payload) => {
    const app = openApp();
    const headers = browserHeaders();
    delete (headers as Partial<typeof headers>).authorization;
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/return-states',
      headers: { ...headers, 'content-type': contentType },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('returns typed 400 Problem Details for path validation failures', async () => {
    const app = openApp();
    const headers = commandHeaders();
    delete (headers as Partial<typeof headers>)['if-match'];
    const response = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/role-contexts/not-a-uuid',
      headers,
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('fails closed instead of serializing a non-contract adapter response', async () => {
    const app = openApp(
      testOptions({
        operations: {
          execute: () => Promise.resolve({ ...sessionResponse(), rawCredential: 'must-not-leak' }),
        },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: browserHeaders(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('must-not-leak');
    expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
  });

  it('requires schema and idempotency headers on commands', async () => {
    const app = openApp();
    const headers = browserHeaders();
    delete (headers as Partial<typeof headers>)['x-client-schema-version'];
    const missingSchema = await app.inject({
      method: 'POST',
      url: '/v1/auth/role-contexts',
      headers,
      payload: selectRoleCommand(),
    });

    expect(missingSchema.statusCode).toBe(400);
    expect(missingSchema.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });

    const missingIdempotency = await app.inject({
      method: 'POST',
      url: '/v1/auth/role-contexts',
      headers: browserHeaders(),
      payload: selectRoleCommand(),
    });
    expect(missingIdempotency.statusCode).toBe(428);
    expect(missingIdempotency.headers['content-type']).toContain('application/problem+json');
    expect(missingIdempotency.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('requires a matching If-Match revision for concurrent commands', async () => {
    const app = openApp();
    const missing = businessCommandHeaders();
    delete (missing as Partial<typeof missing>)['if-match'];
    const missingResponse = await app.inject({
      method: 'POST',
      url: '/v1/farmer/consent-decisions',
      headers: missing,
      payload: consentCommand(),
    });
    expect(missingResponse.statusCode).toBe(428);
    expect(missingResponse.headers['content-type']).toContain('application/problem+json');

    const mismatchResponse = await app.inject({
      method: 'POST',
      url: '/v1/farmer/consent-decisions',
      headers: { ...businessCommandHeaders(), 'if-match': '"rev:4"' },
      payload: consentCommand(),
    });
    expect(mismatchResponse.statusCode).toBe(409);
    expect(mismatchResponse.headers['content-type']).toContain('application/problem+json');
    expect(mismatchResponse.json()).toMatchObject({ code: 'EXPECTED_REVISION_MISMATCH' });
  });

  it.each(['x-client-installation-id', 'x-client-build'])(
    'requires the %s boundary header on protected requests',
    async (header) => {
      const app = openApp();
      const headers = browserHeaders();
      if (header === 'x-client-installation-id') {
        delete (headers as Partial<typeof headers>)['x-client-installation-id'];
      } else {
        delete (headers as Partial<typeof headers>)['x-client-build'];
      }

      const response = await app.inject({
        method: 'GET',
        url: '/v1/farmer/bootstrap',
        headers,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
    },
  );
});

describe('domain API request security', () => {
  it('verifies App Check and identity independently and fails unknown credentials', async () => {
    const appCheckVerifier = fakeAppCheckVerifier();
    const identityVerifier = fakeIdentityVerifier();
    const verifyAppCheckToken = vi.fn(
      (...args: Parameters<AppCheckVerifier['verifyAppCheckToken']>) =>
        appCheckVerifier.verifyAppCheckToken(...args),
    );
    const verifyIdToken = vi.fn((...args: Parameters<IdentityVerifier['verifyIdToken']>) =>
      identityVerifier.verifyIdToken(...args),
    );
    const app = openApp(
      testOptions({
        appCheckVerifier: { mode: 'synthetic-test', verifyAppCheckToken },
        identityVerifier: { mode: 'synthetic-test', verifyIdToken },
      }),
    );

    const noAppCheckHeaders = browserHeaders();
    delete (noAppCheckHeaders as Partial<typeof noAppCheckHeaders>)['x-firebase-appcheck'];
    const missingAppCheck = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: noAppCheckHeaders,
    });
    expect(missingAppCheck.statusCode).toBe(401);
    expect(verifyIdToken).not.toHaveBeenCalled();

    const unknownIdentity = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: {
        ...browserHeaders(),
        authorization: 'Bearer unknown-identity-token',
      },
    });
    expect(unknownIdentity.statusCode).toBe(401);
    expect(verifyAppCheckToken).toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalled();

    verifyAppCheckToken.mockClear();
    verifyIdToken.mockClear();
    const invalidAppCheck = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: {
        ...browserHeaders(),
        'x-firebase-appcheck': 'unknown-app-check-token',
      },
    });
    expect(invalidAppCheck.statusCode).toBe(401);
    expect(verifyAppCheckToken).toHaveBeenCalledWith(
      'unknown-app-check-token',
      expect.objectContaining({ surface: 'FARMER' }),
    );
    expect(verifyIdToken).toHaveBeenCalledWith(
      'known-identity-token',
      expect.objectContaining({ checkRevoked: true }),
    );
  });

  it('enforces exact surface origins and requires Origin on mutations', async () => {
    const app = openApp();

    const crossSurface = await app.inject({
      method: 'GET',
      url: '/v1/rsk/bootstrap',
      headers: browserHeaders('http://farmer.test'),
    });
    expect(crossSurface.statusCode).toBe(403);

    const noOriginHeaders = commandHeaders();
    delete (noOriginHeaders as Partial<typeof noOriginHeaders>).origin;
    const missingOrigin = await app.inject({
      method: 'POST',
      url: '/v1/farmer/consent-decisions',
      headers: noOriginHeaders,
      payload: consentCommand(),
    });
    expect(missingOrigin.statusCode).toBe(403);

    const noReadOriginHeaders = browserHeaders();
    delete (noReadOriginHeaders as Partial<typeof noReadOriginHeaders>).origin;
    const missingReadOrigin = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: noReadOriginHeaders,
    });
    expect(missingReadOrigin.statusCode).toBe(403);
  });

  it('rejects an App Check application ID shared by different product surfaces', () => {
    expect(() =>
      buildDomainApi(
        testOptions({
          appIds: {
            farmer: ['shared-app'],
            rsk: ['shared-app'],
            mp: ['mp-app'],
          },
        }),
      ),
    ).toThrow('physically separate');
  });

  it('passes the exact route capability and purpose to the injected authorizer', async () => {
    const authorize = vi.fn<RequestAuthorizer['authorize']>(() =>
      Promise.resolve({ allowed: true }),
    );
    const app = openApp(testOptions({ authorizer: { authorize } }));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/rsk/protected-disclosures',
      headers: businessHeaders('http://rsk.test'),
      payload: {
        targetKind: 'ASSISTED_FARMER_CONTEXT',
        targetId: TARGET_ID,
        purposeKey: 'assisted.service',
        expectedAccessVersion: 1,
        fieldSet: 'CONTACT',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        operationId: 'createRskProtectedDisclosure',
        surface: 'rsk',
        capability: 'rsk.protected_disclose',
        purpose: 'assisted.service',
        origin: 'http://rsk.test',
        clientSchemaVersion: 1,
        resource: {
          targetKind: 'ASSISTED_FARMER_CONTEXT',
          targetId: TARGET_ID,
          purposeKey: 'assisted.service',
          expectedAccessVersion: 1,
          fieldSet: 'CONTACT',
        },
      }),
    );
  });

  it('preserves typed authorization outcomes such as MFA_REQUIRED', async () => {
    const app = openApp(
      testOptions({
        authorizer: { authorize: () => Promise.resolve({ allowed: false, code: 'MFA_REQUIRED' }) },
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/v1/rsk/bootstrap',
      headers: businessHeaders('http://rsk.test'),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'MFA_REQUIRED' });
  });

  it('allows only exact-origin CORS and never enables credentialed wildcard CORS', async () => {
    const app = openApp();
    const allowed = await app.inject({
      method: 'OPTIONS',
      url: '/v1/farmer/bootstrap',
      headers: { origin: 'http://farmer.test' },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://farmer.test');
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined();

    const denied = await app.inject({
      method: 'OPTIONS',
      url: '/v1/farmer/bootstrap',
      headers: { origin: 'http://attacker.test' },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects credentials in URLs', async () => {
    const app = openApp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/system/reachability?token=do-not-store-this',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('fails closed with typed Unavailable when real adapters are not configured', async () => {
    const options = testOptions();
    delete options.operations;
    const app = openApp(options);
    const response = await app.inject({
      method: 'GET',
      url: '/v1/auth/session',
      headers: browserHeaders(),
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE', retryable: true });
  });

  it('never falls back to the generic adapter for a protected disclosure', async () => {
    const options = testOptions();
    delete options.protectedDisclosure;
    const execute = vi.fn<DomainOperationAdapter['execute']>();
    options.operations = { execute };
    const app = openApp(options);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/rsk/protected-disclosures',
      headers: businessHeaders('http://rsk.test'),
      payload: {
        targetKind: 'ASSISTED_FARMER_CONTEXT',
        targetId: TARGET_ID,
        purposeKey: 'assisted.service',
        expectedAccessVersion: 1,
        fieldSet: 'CONTACT',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('Synthetic Farmer');
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects deterministic synthetic verifiers in production construction', () => {
    expect(() => buildDomainApi(testOptions({ runtimeMode: 'production' }))).toThrow(
      'Synthetic credential verifiers cannot run in production.',
    );
  });

  it('requires HTTPS origins in production construction', () => {
    const options = testOptions({
      runtimeMode: 'production',
      identityVerifier: { ...fakeIdentityVerifier(), mode: 'firebase-admin' },
      appCheckVerifier: { ...fakeAppCheckVerifier(), mode: 'firebase-admin' },
    });
    expect(() => buildDomainApi(options)).toThrow(
      'Configured application origins must use HTTPS in production.',
    );
  });
});

describe('domain API safe request logs', () => {
  it('emits only allowlisted metadata when an adapter throws sensitive content', async () => {
    const records: SafeRequestLogRecord[] = [];
    const operations: DomainOperationAdapter = {
      execute: () =>
        Promise.reject(
          new Error(
            `SELECT * FROM farmer WHERE id='${SUBJECT_ID}' AND token='known-identity-token'`,
          ),
        ),
    };
    const app = openApp(
      testOptions({ operations, requestLogger: { write: (record) => records.push(record) } }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/v1/farmer/bootstrap',
      headers: businessHeaders(),
    });
    expect(response.statusCode).toBe(503);
    expect(records).toHaveLength(1);

    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain('known-identity-token');
    expect(serialized).not.toContain('known-app-check-token');
    expect(serialized).not.toContain(SUBJECT_ID);
    expect(serialized).not.toContain('SELECT');
    expect(records[0]).toMatchObject({
      route: '/v1/farmer/bootstrap',
      actorClass: 'FARMER',
      problemCode: 'DEPENDENCY_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
