import { describe, expect, it, vi } from 'vitest';

import {
  createDeterministicIdentityVerifier,
  createFirebaseIdentityVerifier,
  createIdentityVerifier,
  FirebaseIdentityVerifier,
  verifyBrowserCredentialsIndependently,
  type FirebaseAdminModules,
  type FirebaseIdentityVerifierConfig,
  type IdentityVerifier,
  type SecurityResult,
  type SubjectSecurityRecord,
  type VerifiedAppCheck,
  type VerifiedIdentity,
} from '../index';

const NOW = new Date('2026-07-13T10:00:00.000Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1_000);

const VALID_DECODED_IDENTITY: Readonly<Record<string, unknown>> = {
  uid: 'firebase-uid-1',
  sub: 'firebase-uid-1',
  aud: 'smart-fasal-local',
  iss: 'https://securetoken.google.com/smart-fasal-local',
  environment: 'local',
  security_version: 4,
  iat: NOW_SECONDS - 60,
  exp: NOW_SECONDS + 3_600,
  auth_time: NOW_SECONDS - 120,
  firebase: { sign_in_second_factor: 'totp' },
};

const VALID_DECODED_APP_CHECK: Readonly<Record<string, unknown>> = {
  appId: 'rsk-local-app',
  exp: NOW_SECONDS + 3_600,
};

const ACTIVE_SUBJECT: SubjectSecurityRecord = {
  subjectId: 'subject-1',
  subjectType: 'STAFF',
  environment: 'local',
  status: 'ACTIVE',
  securityVersion: 4,
};

interface MockFirebaseState {
  decodedIdentity: unknown;
  decodedAppCheck: unknown;
  identityError?: Error;
  appCheckError?: Error;
  existingApp?: boolean;
  initializeCount: number;
  verifyIdCount: number;
  verifyAppCheckCount: number;
  checkRevoked?: boolean;
}

class MockFirebaseError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`Synthetic Firebase error: ${code}`);
    this.code = code;
  }
}

function makeModules(state: MockFirebaseState): FirebaseAdminModules {
  const app = { name: 'smart-fasal-local-smart-fasal-local' };
  return {
    app: {
      applicationDefault: () => ({ kind: 'application-default-credentials' }),
      getApps: () => (state.existingApp === true ? [app] : []),
      initializeApp: () => {
        state.initializeCount += 1;
        return app;
      },
    },
    auth: {
      getAuth: () => ({
        verifyIdToken: (_token, checkRevoked) => {
          state.verifyIdCount += 1;
          state.checkRevoked = checkRevoked;
          if (state.identityError !== undefined) {
            return Promise.reject(state.identityError);
          }
          return Promise.resolve(state.decodedIdentity);
        },
      }),
    },
    appCheck: {
      getAppCheck: () => ({
        verifyToken: () => {
          state.verifyAppCheckCount += 1;
          if (state.appCheckError !== undefined) {
            return Promise.reject(state.appCheckError);
          }
          return Promise.resolve(state.decodedAppCheck);
        },
      }),
    },
  };
}

function makeState(patch: Partial<MockFirebaseState> = {}): MockFirebaseState {
  return {
    decodedIdentity: VALID_DECODED_IDENTITY,
    decodedAppCheck: VALID_DECODED_APP_CHECK,
    initializeCount: 0,
    verifyIdCount: 0,
    verifyAppCheckCount: 0,
    ...patch,
  };
}

function makeFirebaseConfig(
  state: MockFirebaseState,
  resolveSubject: FirebaseIdentityVerifierConfig['resolveSubject'] = () =>
    Promise.resolve(ACTIVE_SUBJECT),
): FirebaseIdentityVerifierConfig {
  return {
    mode: 'firebase',
    environment: 'local',
    projectId: 'smart-fasal-local',
    allowedAppIds: { RSK: ['rsk-local-app'], FARMER: ['farmer-local-app'] },
    resolveSubject,
    now: () => NOW,
    loadModules: () => Promise.resolve(makeModules(state)),
  };
}

function expectFailure<T>(
  result: SecurityResult<T>,
  reason: Extract<SecurityResult<T>, { ok: false }>['problem']['reason'],
): void {
  expect(result).toMatchObject({ ok: false, problem: { reason } });
}

function makeDeterministicVerifier(
  config: Parameters<typeof createDeterministicIdentityVerifier>[0],
): IdentityVerifier {
  const result = createDeterministicIdentityVerifier(config);
  if (!result.ok) throw new Error(result.problem.reason);
  return result.value;
}

describe('FirebaseIdentityVerifier', () => {
  it('uses ADC initialization, revocation-aware verification and current subject state', async () => {
    const state = makeState();
    const verifier = new FirebaseIdentityVerifier(makeFirebaseConfig(state));
    const identity = await verifier.verifyIdToken('synthetic-valid-id-token');
    expect(identity).toEqual({
      ok: true,
      value: {
        subjectId: 'subject-1',
        subjectType: 'STAFF',
        providerUid: 'firebase-uid-1',
        environment: 'local',
        projectId: 'smart-fasal-local',
        securityVersion: 4,
        issuedAt: '2026-07-13T09:59:00.000Z',
        expiresAt: '2026-07-13T11:00:00.000Z',
        mfa: { secondFactor: true, assuredAt: '2026-07-13T09:58:00.000Z' },
      },
    });
    expect(state.checkRevoked).toBe(true);
    expect(state.initializeCount).toBe(1);

    const appCheck = await verifier.verifyAppCheckToken('synthetic-valid-app-check', 'RSK');
    expect(appCheck).toMatchObject({
      ok: true,
      value: { appId: 'rsk-local-app', environment: 'local', surface: 'RSK' },
    });
    expect(state.initializeCount).toBe(1);
  });

  it('reuses an existing named Firebase app', async () => {
    const state = makeState({ existingApp: true });
    const verifier = new FirebaseIdentityVerifier(makeFirebaseConfig(state));
    expect((await verifier.verifyIdToken('synthetic-id')).ok).toBe(true);
    expect(state.initializeCount).toBe(0);
  });

  it('returns typed Unavailable for absent production configuration or module failure', async () => {
    expectFailure(
      createFirebaseIdentityVerifier({
        ...makeFirebaseConfig(makeState()),
        projectId: ' ',
      }),
      'DEPENDENCY_NOT_CONFIGURED',
    );
    expectFailure(
      createFirebaseIdentityVerifier({
        ...makeFirebaseConfig(makeState()),
        allowedAppIds: {},
      }),
      'DEPENDENCY_NOT_CONFIGURED',
    );

    const verifier = new FirebaseIdentityVerifier({
      ...makeFirebaseConfig(makeState()),
      loadModules: () => Promise.reject(new Error('synthetic module failure')),
    });
    const result = await verifier.verifyIdToken('synthetic-id');
    expectFailure(result, 'DEPENDENCY_FAILED');
    expect(result).toMatchObject({
      ok: false,
      problem: { code: 'DEPENDENCY_UNAVAILABLE', status: 503 },
    });
  });

  it('does not pass empty or unknown credentials to Firebase', async () => {
    const state = makeState();
    const verifier = new FirebaseIdentityVerifier(makeFirebaseConfig(state));
    expectFailure(await verifier.verifyIdToken(''), 'CREDENTIAL_REJECTED');
    expectFailure(await verifier.verifyAppCheckToken('', 'RSK'), 'APP_CHECK_REJECTED');
    expect(state.verifyIdCount).toBe(0);
    expect(state.verifyAppCheckCount).toBe(0);
  });

  it('maps provider credential failures and dependency failures safely', async () => {
    const invalidState = makeState({
      identityError: new MockFirebaseError('auth/id-token-revoked'),
    });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(invalidState)).verifyIdToken(
        'synthetic-id',
      ),
      'CREDENTIAL_REJECTED',
    );

    for (const code of [
      'app/invalid-credential',
      'app/network-error',
      'auth/internal-error',
      'auth/network-request-failed',
      'app-check/internal-error',
    ]) {
      const dependencyState = makeState({ identityError: new MockFirebaseError(code) });
      expectFailure(
        await new FirebaseIdentityVerifier(makeFirebaseConfig(dependencyState)).verifyIdToken(
          'synthetic-id',
        ),
        'DEPENDENCY_FAILED',
      );
    }
    const primitiveError = makeState({ identityError: new Error('rejected') });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(primitiveError)).verifyIdToken(
        'synthetic-id',
      ),
      'CREDENTIAL_REJECTED',
    );
  });

  it.each([
    ['non-object', 'decoded'],
    ['missing uid', { ...VALID_DECODED_IDENTITY, uid: undefined }],
    ['missing sub', { ...VALID_DECODED_IDENTITY, sub: undefined }],
    ['different sub', { ...VALID_DECODED_IDENTITY, sub: 'other' }],
    ['wrong audience', { ...VALID_DECODED_IDENTITY, aud: 'other-project' }],
    ['wrong issuer', { ...VALID_DECODED_IDENTITY, iss: 'https://example.invalid' }],
    ['missing issued time', { ...VALID_DECODED_IDENTITY, iat: undefined }],
    ['future issued time', { ...VALID_DECODED_IDENTITY, iat: NOW_SECONDS + 61 }],
    ['missing expiration', { ...VALID_DECODED_IDENTITY, exp: undefined }],
    ['expired', { ...VALID_DECODED_IDENTITY, exp: NOW_SECONDS }],
    ['missing security version', { ...VALID_DECODED_IDENTITY, security_version: undefined }],
    ['non-integer security version', { ...VALID_DECODED_IDENTITY, security_version: 1.2 }],
  ])('rejects a decoded token with %s', async (_label, decodedIdentity) => {
    const state = makeState({ decodedIdentity });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(state)).verifyIdToken('synthetic-id'),
      'CREDENTIAL_REJECTED',
    );
  });

  it('rejects identity tokens from another environment', async () => {
    const state = makeState({
      decodedIdentity: { ...VALID_DECODED_IDENTITY, environment: 'preview' },
    });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(state)).verifyIdToken('synthetic-id'),
      'ENVIRONMENT_MISMATCH',
    );
  });

  it('fails closed for missing, disabled, mismatched and stale subject records', async () => {
    const state = makeState();
    const records: readonly (SubjectSecurityRecord | null)[] = [
      null,
      { ...ACTIVE_SUBJECT, status: 'DISABLED' },
      { ...ACTIVE_SUBJECT, status: 'DELETED' },
      { ...ACTIVE_SUBJECT, subjectId: '' },
    ];
    for (const record of records) {
      const verifier = new FirebaseIdentityVerifier(
        makeFirebaseConfig(state, () => Promise.resolve(record)),
      );
      expectFailure(await verifier.verifyIdToken('synthetic-id'), 'CREDENTIAL_REJECTED');
    }

    expectFailure(
      await new FirebaseIdentityVerifier(
        makeFirebaseConfig(state, () =>
          Promise.resolve({ ...ACTIVE_SUBJECT, environment: 'preview' }),
        ),
      ).verifyIdToken('synthetic-id'),
      'ENVIRONMENT_MISMATCH',
    );
    expectFailure(
      await new FirebaseIdentityVerifier(
        makeFirebaseConfig(state, () => Promise.resolve({ ...ACTIVE_SUBJECT, securityVersion: 5 })),
      ).verifyIdToken('synthetic-id'),
      'SECURITY_VERSION_CHANGED',
    );
    expectFailure(
      await new FirebaseIdentityVerifier(
        makeFirebaseConfig(state, () =>
          Promise.reject(new Error('synthetic subject store unavailable')),
        ),
      ).verifyIdToken('synthetic-id'),
      'DEPENDENCY_FAILED',
    );
  });

  it('accepts only explicit MFA indicators and a valid authentication time', async () => {
    const withoutMfa = makeState({
      decodedIdentity: { ...VALID_DECODED_IDENTITY, firebase: {} },
    });
    const noMfaResult = await new FirebaseIdentityVerifier(
      makeFirebaseConfig(withoutMfa),
    ).verifyIdToken('synthetic-id');
    expect(noMfaResult).toMatchObject({ ok: true });
    if (noMfaResult.ok) {
      expect(noMfaResult.value.mfa).toBeUndefined();
    }

    const amrMfa = makeState({
      decodedIdentity: { ...VALID_DECODED_IDENTITY, firebase: {}, amr: ['pwd', 'mfa'] },
    });
    const amrResult = await new FirebaseIdentityVerifier(makeFirebaseConfig(amrMfa)).verifyIdToken(
      'synthetic-id',
    );
    expect(amrResult).toMatchObject({ ok: true, value: { mfa: { secondFactor: true } } });

    const missingAuthenticationTime = makeState({
      decodedIdentity: { ...VALID_DECODED_IDENTITY, auth_time: undefined },
    });
    const missingTimeResult = await new FirebaseIdentityVerifier(
      makeFirebaseConfig(missingAuthenticationTime),
    ).verifyIdToken('synthetic-id');
    expect(missingTimeResult).toMatchObject({ ok: true });
    if (missingTimeResult.ok) {
      expect(missingTimeResult.value.mfa).toBeUndefined();
    }
  });

  it('verifies App Check independently against the surface app allowlist', async () => {
    const unconfigured = new FirebaseIdentityVerifier(makeFirebaseConfig(makeState()));
    expectFailure(
      await unconfigured.verifyAppCheckToken('synthetic-app-check', 'MP'),
      'DEPENDENCY_NOT_CONFIGURED',
    );

    const invalidProvider = makeState({
      appCheckError: new MockFirebaseError('app-check/invalid-argument'),
    });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(invalidProvider)).verifyAppCheckToken(
        'synthetic-app-check',
        'RSK',
      ),
      'APP_CHECK_REJECTED',
    );
    const unavailableProvider = makeState({
      appCheckError: new MockFirebaseError('app-check/internal-error'),
    });
    expectFailure(
      await new FirebaseIdentityVerifier(
        makeFirebaseConfig(unavailableProvider),
      ).verifyAppCheckToken('synthetic-app-check', 'RSK'),
      'DEPENDENCY_FAILED',
    );

    for (const decodedAppCheck of [
      'decoded',
      { ...VALID_DECODED_APP_CHECK, appId: undefined },
      { ...VALID_DECODED_APP_CHECK, exp: undefined },
      { ...VALID_DECODED_APP_CHECK, exp: NOW_SECONDS },
    ]) {
      const state = makeState({ decodedAppCheck });
      expectFailure(
        await new FirebaseIdentityVerifier(makeFirebaseConfig(state)).verifyAppCheckToken(
          'synthetic-app-check',
          'RSK',
        ),
        'APP_CHECK_REJECTED',
      );
    }

    const wrongApp = makeState({
      decodedAppCheck: { ...VALID_DECODED_APP_CHECK, appId: 'farmer-local-app' },
    });
    expectFailure(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(wrongApp)).verifyAppCheckToken(
        'synthetic-app-check',
        'RSK',
      ),
      'APP_ID_NOT_ALLOWED',
    );

    const snakeCaseAppId = makeState({
      decodedAppCheck: { app_id: 'rsk-local-app', exp: NOW_SECONDS + 60 },
    });
    expect(
      await new FirebaseIdentityVerifier(makeFirebaseConfig(snakeCaseAppId)).verifyAppCheckToken(
        'synthetic-app-check',
        'RSK',
      ),
    ).toMatchObject({ ok: true, value: { appId: 'rsk-local-app' } });
  });

  it('starts ID-token and App Check verification independently', async () => {
    const identity: VerifiedIdentity = {
      subjectId: 'subject-1',
      subjectType: 'STAFF',
      providerUid: 'provider-1',
      environment: 'local',
      projectId: 'project-1',
      securityVersion: 1,
      issuedAt: '2026-07-13T09:00:00.000Z',
      expiresAt: '2026-07-13T11:00:00.000Z',
    };
    const appCheck: VerifiedAppCheck = {
      appId: 'rsk-local-app',
      environment: 'local',
      surface: 'RSK',
      expiresAt: '2026-07-13T11:00:00.000Z',
    };
    const verifyIdToken = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        problem: {
          code: 'AUTHENTICATION_REQUIRED' as const,
          status: 401 as const,
          title: 'Authentication required',
          detail: 'Rejected',
          retryable: false,
          reason: 'CREDENTIAL_REJECTED' as const,
        },
      }),
    );
    const verifyAppCheckToken = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: appCheck }),
    );
    const result = await verifyBrowserCredentialsIndependently(
      { verifyIdToken, verifyAppCheckToken },
      { idToken: 'bad', appCheckToken: 'valid', surface: 'RSK' },
    );
    expectFailure(result, 'CREDENTIAL_REJECTED');
    expect(verifyIdToken).toHaveBeenCalledOnce();
    expect(verifyAppCheckToken).toHaveBeenCalledOnce();
    expect(identity.subjectId).toBe('subject-1');
  });
});

describe('DeterministicIdentityVerifier', () => {
  const identity: VerifiedIdentity = {
    subjectId: 'synthetic-subject',
    subjectType: 'STAFF',
    providerUid: 'synthetic-provider',
    environment: 'local',
    projectId: 'synthetic-local',
    securityVersion: 1,
    issuedAt: '2026-07-13T09:00:00.000Z',
    expiresAt: '2026-07-13T11:00:00.000Z',
  };
  const appCheck: VerifiedAppCheck = {
    appId: 'synthetic-rsk-app',
    environment: 'local',
    surface: 'RSK',
    expiresAt: '2026-07-13T11:00:00.000Z',
  };
  const fixture = {
    idToken: 'synthetic-id-token',
    appCheckToken: 'synthetic-app-check-token',
    identity,
    appCheck,
  } as const;

  it('is available only through explicit local synthetic injection', () => {
    expect(
      createDeterministicIdentityVerifier({
        mode: 'fake',
        environment: 'local',
        fixtures: [fixture],
        now: () => new Date('2026-07-13T10:00:00.000Z'),
      }),
    ).toMatchObject({ ok: true });
    expectFailure(
      createIdentityVerifier({
        mode: 'fake',
        environment: 'production',
        fixtures: [fixture],
        now: () => new Date('2026-07-13T10:00:00.000Z'),
      }),
      'FAKE_MODE_FORBIDDEN',
    );
    expectFailure(
      createIdentityVerifier({
        mode: 'fake',
        environment: 'preview',
        fixtures: [fixture],
        now: () => new Date('2026-07-13T10:00:00.000Z'),
      }),
      'FAKE_MODE_FORBIDDEN',
    );
  });

  it('accepts only exact registered synthetic credentials', async () => {
    const verifier = makeDeterministicVerifier({
      mode: 'fake',
      environment: 'local',
      fixtures: [fixture],
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });
    expect(
      await verifier.verifyBrowserCredentials({
        idToken: fixture.idToken,
        appCheckToken: fixture.appCheckToken,
        surface: 'RSK',
      }),
    ).toMatchObject({ ok: true });
    expectFailure(await verifier.verifyIdToken('unknown-id-token'), 'CREDENTIAL_REJECTED');
    expectFailure(
      await verifier.verifyAppCheckToken('unknown-app-check', 'RSK'),
      'APP_CHECK_REJECTED',
    );
    expectFailure(
      await verifier.verifyAppCheckToken(fixture.appCheckToken, 'FARMER'),
      'APP_ID_NOT_ALLOWED',
    );
  });

  it('rejects a fixture that crosses the configured environment', async () => {
    const previewIdentity = { ...identity, environment: 'preview' as const };
    const previewAppCheck = { ...appCheck, environment: 'preview' as const };
    const verifier = makeDeterministicVerifier({
      mode: 'fake',
      environment: 'local',
      now: () => new Date('2026-07-13T10:00:00.000Z'),
      fixtures: [
        {
          ...fixture,
          identity: previewIdentity,
          appCheck: previewAppCheck,
        },
      ],
    });
    expectFailure(await verifier.verifyIdToken(fixture.idToken), 'ENVIRONMENT_MISMATCH');
    expectFailure(
      await verifier.verifyAppCheckToken(fixture.appCheckToken, 'RSK'),
      'ENVIRONMENT_MISMATCH',
    );
  });

  it('rejects expired synthetic identity and App Check fixtures', async () => {
    const verifier = makeDeterministicVerifier({
      mode: 'fake',
      environment: 'local',
      fixtures: [fixture],
      now: () => new Date('2026-07-13T12:00:00.000Z'),
    });
    expectFailure(await verifier.verifyIdToken(fixture.idToken), 'CREDENTIAL_REJECTED');
    expectFailure(
      await verifier.verifyAppCheckToken(fixture.appCheckToken, 'RSK'),
      'APP_CHECK_REJECTED',
    );
  });

  it('creates the Firebase variant through the common factory', () => {
    const result = createIdentityVerifier(makeFirebaseConfig(makeState()));
    expect(result).toMatchObject({ ok: true });
  });
});
