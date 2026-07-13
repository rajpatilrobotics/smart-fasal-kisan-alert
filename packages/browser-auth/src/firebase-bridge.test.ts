import { describe, expect, it } from 'vitest';

import {
  createFirebaseIdentityBridge,
  type FirebaseAppCheckHandle,
  type FirebaseAppHandle,
  type FirebaseAuthHandle,
  type FirebaseBridgeConfigurationInput,
  type FirebaseUserHandle,
  type FirebaseWebSdkPort,
} from './firebase-bridge';

const APP: FirebaseAppHandle = { kind: 'firebase-app' };
const AUTH: FirebaseAuthHandle = { kind: 'firebase-auth' };
const APP_CHECK: FirebaseAppCheckHandle = { kind: 'firebase-app-check' };
const USER: FirebaseUserHandle = { kind: 'firebase-user' };
const RETURN_STATE_ID = '00000000-0000-4000-8000-000000000101';

const FARMER_CONFIGURATION = {
  apiKey: 'farmer-public-web-api-key',
  appCheckEnterpriseSiteKey: 'farmer-enterprise-site-key',
  appId: '1:101:web:farmer-app-id',
  authDomain: 'farmer-identity.example.test',
  environment: 'staging',
  projectId: 'smart-fasal-farmer-staging',
  surface: 'farmer',
} satisfies FirebaseBridgeConfigurationInput<'farmer'>;

interface SdkHarnessOptions {
  readonly idToken?: string;
  readonly limitedUseTokens?: readonly string[];
  readonly signInFailure?: Error;
}

function createSdkHarness(options: SdkHarnessOptions = {}) {
  const persistence = Object.freeze({ type: 'NONE' });
  const initializeAppCalls: {
    readonly appName: string;
    readonly options: Parameters<FirebaseWebSdkPort['initializeApp']>[0];
  }[] = [];
  const initializeAuthCalls: Parameters<FirebaseWebSdkPort['initializeAuth']>[] = [];
  const initializeAppCheckCalls: Parameters<FirebaseWebSdkPort['initializeAppCheck']>[] = [];
  const signInCalls: FirebaseAuthHandle[] = [];
  const idTokenCalls: Parameters<FirebaseWebSdkPort['getIdToken']>[] = [];
  const limitedUseCalls: FirebaseAppCheckHandle[] = [];
  const signOutCalls: FirebaseAuthHandle[] = [];
  const limitedUseTokens = options.limitedUseTokens ?? [
    'limited-app-check-token-000000000001',
    'limited-app-check-token-000000000002',
    'limited-app-check-token-000000000003',
  ];
  let limitedUseTokenIndex = 0;

  const sdk: FirebaseWebSdkPort = {
    inMemoryPersistence: persistence,
    initializeApp(firebaseOptions, appName) {
      initializeAppCalls.push({ appName, options: firebaseOptions });
      return APP;
    },
    initializeAuth(app, dependencies) {
      initializeAuthCalls.push([app, dependencies]);
      return AUTH;
    },
    initializeAppCheck(app, appCheckOptions) {
      initializeAppCheckCalls.push([app, appCheckOptions]);
      return APP_CHECK;
    },
    signInWithGooglePopup(auth) {
      signInCalls.push(auth);
      return options.signInFailure === undefined
        ? Promise.resolve(USER)
        : Promise.reject(options.signInFailure);
    },
    getIdToken(user, forceRefresh) {
      idTokenCalls.push([user, forceRefresh]);
      return Promise.resolve(options.idToken ?? 'firebase-id-token-000000000000000001');
    },
    getLimitedUseAppCheckToken(appCheck) {
      limitedUseCalls.push(appCheck);
      const token = limitedUseTokens[limitedUseTokenIndex];
      limitedUseTokenIndex += 1;
      return token === undefined
        ? Promise.reject(new Error('limited-use-token-test-sequence-exhausted'))
        : Promise.resolve(token);
    },
    signOut(auth) {
      signOutCalls.push(auth);
      return Promise.resolve();
    },
  };

  return {
    calls: {
      idToken: idTokenCalls,
      initializeApp: initializeAppCalls,
      initializeAppCheck: initializeAppCheckCalls,
      initializeAuth: initializeAuthCalls,
      limitedUse: limitedUseCalls,
      signIn: signInCalls,
      signOut: signOutCalls,
    },
    persistence,
    sdk,
  };
}

describe('Firebase browser bridge configuration', () => {
  it('returns unavailable without complete, known, and safe configuration', () => {
    const { calls, sdk } = createSdkHarness();
    const invalidConfigurations: readonly FirebaseBridgeConfigurationInput<'farmer'>[] = [
      { surface: 'farmer' },
      { ...FARMER_CONFIGURATION, environment: 'unknown' },
      { ...FARMER_CONFIGURATION, projectId: 'UPPERCASE-NOT-ALLOWED' },
      { ...FARMER_CONFIGURATION, authDomain: 'https://farmer.example.test' },
      { ...FARMER_CONFIGURATION, appCheckEnterpriseSiteKey: ' ' },
    ];

    for (const configuration of invalidConfigurations) {
      expect(createFirebaseIdentityBridge(configuration, sdk)).toBeUndefined();
    }
    expect(calls.initializeApp).toHaveLength(0);
    expect(calls.initializeAuth).toHaveLength(0);
    expect(calls.initializeAppCheck).toHaveLength(0);
  });

  it('derives a unique named app and keeps each surface configuration separate', () => {
    const { calls, sdk } = createSdkHarness();
    const configurations = [
      FARMER_CONFIGURATION,
      {
        ...FARMER_CONFIGURATION,
        apiKey: 'rsk-public-web-api-key',
        appCheckEnterpriseSiteKey: 'rsk-enterprise-site-key',
        appId: '1:202:web:rsk-app-id',
        projectId: 'smart-fasal-rsk-staging',
        surface: 'rsk',
      } as const,
      {
        ...FARMER_CONFIGURATION,
        apiKey: 'mp-public-web-api-key',
        appCheckEnterpriseSiteKey: 'mp-enterprise-site-key',
        appId: '1:303:web:mp-app-id',
        projectId: 'smart-fasal-mp-staging',
        surface: 'mp',
      } as const,
    ];

    for (const configuration of configurations) {
      expect(createFirebaseIdentityBridge(configuration, sdk)).toBeDefined();
    }
    expect(
      calls.initializeApp.map(({ appName, options }) => ({ appId: options.appId, appName })),
    ).toEqual([
      {
        appId: '1:101:web:farmer-app-id',
        appName: 'smart-fasal-farmer-staging-smart-fasal-farmer-staging',
      },
      {
        appId: '1:202:web:rsk-app-id',
        appName: 'smart-fasal-rsk-staging-smart-fasal-rsk-staging',
      },
      {
        appId: '1:303:web:mp-app-id',
        appName: 'smart-fasal-mp-staging-smart-fasal-mp-staging',
      },
    ]);
    expect(calls.initializeAppCheck.map(([, options]) => options.enterpriseSiteKey)).toEqual([
      'farmer-enterprise-site-key',
      'rsk-enterprise-site-key',
      'mp-enterprise-site-key',
    ]);
  });
});

describe('Firebase browser bridge initialization', () => {
  it('initializes Auth with only in-memory persistence and App Check without auto-refresh', () => {
    const { calls, persistence, sdk } = createSdkHarness();

    expect(createFirebaseIdentityBridge(FARMER_CONFIGURATION, sdk)).toBeDefined();
    expect(calls.initializeApp).toEqual([
      {
        appName: 'smart-fasal-farmer-staging-smart-fasal-farmer-staging',
        options: {
          apiKey: 'farmer-public-web-api-key',
          appId: '1:101:web:farmer-app-id',
          authDomain: 'farmer-identity.example.test',
          projectId: 'smart-fasal-farmer-staging',
        },
      },
    ]);
    expect(calls.initializeAuth).toEqual([[APP, { persistence }]]);
    expect(calls.initializeAppCheck).toEqual([
      [
        APP,
        {
          enterpriseSiteKey: 'farmer-enterprise-site-key',
          isTokenAutoRefreshEnabled: false,
        },
      ],
    ]);
    expect(Object.keys(sdk)).not.toContain('getToken');
  });

  it('returns unavailable when SDK initialization fails without exposing the provider error', () => {
    const { sdk } = createSdkHarness();
    const failingSdk: FirebaseWebSdkPort = {
      ...sdk,
      initializeApp() {
        throw new Error('raw SDK configuration details');
      },
    };

    expect(createFirebaseIdentityBridge(FARMER_CONFIGURATION, failingSdk)).toBeUndefined();
  });
});

describe('Firebase browser credential lifecycle', () => {
  it('requests fresh limited-use App Check tokens and never caches a returned credential', async () => {
    const { calls, sdk } = createSdkHarness();
    const bridge = createFirebaseIdentityBridge(FARMER_CONFIGURATION, sdk);
    expect(bridge).toBeDefined();
    if (bridge === undefined) throw new Error('test bridge was not created');

    await expect(bridge.getAppCheckToken()).resolves.toBe('limited-app-check-token-000000000001');
    await expect(
      bridge.signIn({ returnStateId: RETURN_STATE_ID, surface: 'farmer' }),
    ).resolves.toEqual({
      appCheckToken: 'limited-app-check-token-000000000002',
      idToken: 'firebase-id-token-000000000000000001',
    });
    await expect(bridge.getAppCheckToken()).resolves.toBe('limited-app-check-token-000000000003');

    expect(calls.limitedUse).toEqual([APP_CHECK, APP_CHECK, APP_CHECK]);
    expect(calls.signIn).toEqual([AUTH]);
    expect(calls.idToken).toEqual([[USER, true]]);
    expect(JSON.stringify(bridge)).not.toContain('token-000000');
  });

  it('does not read browser credential stores or navigation state', async () => {
    const browserStateKeys = [
      'history',
      'indexedDB',
      'localStorage',
      'location',
      'sessionStorage',
    ] as const;
    const originalDescriptors = browserStateKeys.map((key) => ({
      descriptor: Object.getOwnPropertyDescriptor(globalThis, key),
      key,
    }));
    const browserStateReads: string[] = [];
    for (const { key } of originalDescriptors) {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        get() {
          browserStateReads.push(key);
          return undefined;
        },
      });
    }

    try {
      const { sdk } = createSdkHarness();
      const bridge = createFirebaseIdentityBridge(FARMER_CONFIGURATION, sdk);
      if (bridge === undefined) throw new Error('test bridge was not created');
      await bridge.getAppCheckToken();
      await bridge.signIn({ returnStateId: RETURN_STATE_ID, surface: 'farmer' });
      expect(browserStateReads).toEqual([]);
    } finally {
      for (const { descriptor, key } of originalDescriptors) {
        if (descriptor === undefined) Reflect.deleteProperty(globalThis, key);
        else Object.defineProperty(globalThis, key, descriptor);
      }
    }
  });

  it('rejects wrong-surface and malformed return state input before opening a popup', async () => {
    const { calls, sdk } = createSdkHarness();
    const crossSurfaceConfiguration: FirebaseBridgeConfigurationInput<'farmer' | 'mp' | 'rsk'> =
      FARMER_CONFIGURATION;
    const bridge = createFirebaseIdentityBridge(crossSurfaceConfiguration, sdk);
    if (bridge === undefined) throw new Error('test bridge was not created');

    await expect(bridge.signIn({ returnStateId: RETURN_STATE_ID, surface: 'rsk' })).rejects.toThrow(
      'IDENTITY_PROVIDER_UNAVAILABLE',
    );
    await expect(
      bridge.signIn({ returnStateId: 'return-state-in-a-url', surface: 'farmer' }),
    ).rejects.toThrow('IDENTITY_PROVIDER_UNAVAILABLE');
    expect(calls.signIn).toHaveLength(0);
  });

  it('converts raw provider failures to one generic error and signs out partial state', async () => {
    const { calls, sdk } = createSdkHarness({
      signInFailure: new Error('raw popup email and provider details'),
    });
    const bridge = createFirebaseIdentityBridge(FARMER_CONFIGURATION, sdk);
    if (bridge === undefined) throw new Error('test bridge was not created');

    const operation = bridge.signIn({ returnStateId: RETURN_STATE_ID, surface: 'farmer' });
    await expect(operation).rejects.toThrow('IDENTITY_PROVIDER_UNAVAILABLE');
    await expect(operation).rejects.not.toThrow('raw popup email and provider details');
    expect(calls.signOut).toEqual([AUTH]);
  });
});
