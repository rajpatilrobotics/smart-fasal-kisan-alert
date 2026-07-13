import {
  getLimitedUseToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import type { AuthSurface, IdentityBridge, InMemoryCredentials } from './index';

export type BrowserEnvironment = 'local' | 'preview' | 'staging' | 'demo' | 'production';

export interface FirebaseBridgeConfigurationInput<Surface extends AuthSurface> {
  readonly surface: Surface;
  readonly environment?: string;
  readonly apiKey?: string;
  readonly authDomain?: string;
  readonly projectId?: string;
  readonly appId?: string;
  readonly appCheckEnterpriseSiteKey?: string;
}

export interface FirebaseBridgeConfiguration<Surface extends AuthSurface> {
  readonly surface: Surface;
  readonly environment: BrowserEnvironment;
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly appCheckEnterpriseSiteKey: string;
  readonly appName: string;
}

export interface FirebaseAppHandle {
  readonly kind: 'firebase-app';
}

export interface FirebaseAuthHandle {
  readonly kind: 'firebase-auth';
}

export interface FirebaseAppCheckHandle {
  readonly kind: 'firebase-app-check';
}

export interface FirebaseUserHandle {
  readonly kind: 'firebase-user';
}

export interface FirebaseWebSdkPort {
  readonly inMemoryPersistence: unknown;
  initializeApp(options: FirebaseOptions, appName: string): FirebaseAppHandle;
  initializeAuth(
    app: FirebaseAppHandle,
    dependencies: { readonly persistence: unknown },
  ): FirebaseAuthHandle;
  initializeAppCheck(
    app: FirebaseAppHandle,
    options: {
      readonly enterpriseSiteKey: string;
      readonly isTokenAutoRefreshEnabled: false;
    },
  ): FirebaseAppCheckHandle;
  signInWithGooglePopup(auth: FirebaseAuthHandle): Promise<FirebaseUserHandle>;
  getIdToken(user: FirebaseUserHandle, forceRefresh: true): Promise<string>;
  getLimitedUseAppCheckToken(appCheck: FirebaseAppCheckHandle): Promise<string>;
  signOut(auth: FirebaseAuthHandle): Promise<void>;
}

const FIREBASE_WEB_SDK: FirebaseWebSdkPort = {
  inMemoryPersistence,
  initializeApp: (options, appName) =>
    initializeApp(options, appName) as unknown as FirebaseAppHandle,
  initializeAuth: (app, dependencies) =>
    initializeAuth(app as never, {
      persistence: dependencies.persistence as never,
    }) as unknown as FirebaseAuthHandle,
  initializeAppCheck: (app, options) =>
    initializeAppCheck(app as never, {
      provider: new ReCaptchaEnterpriseProvider(options.enterpriseSiteKey),
      isTokenAutoRefreshEnabled: options.isTokenAutoRefreshEnabled,
    }) as unknown as FirebaseAppCheckHandle,
  signInWithGooglePopup: async (auth) => {
    const result = await signInWithPopup(
      auth as never,
      new GoogleAuthProvider(),
      browserPopupRedirectResolver,
    );
    return result.user as unknown as FirebaseUserHandle;
  },
  getIdToken: (user, forceRefresh) =>
    (user as unknown as { getIdToken(forceRefresh: boolean): Promise<string> }).getIdToken(
      forceRefresh,
    ),
  getLimitedUseAppCheckToken: async (appCheck) => {
    const result = await getLimitedUseToken(appCheck as never);
    return result.token;
  },
  signOut: (auth) => signOut(auth as never),
};

const ENVIRONMENTS = new Set<BrowserEnvironment>([
  'local',
  'preview',
  'staging',
  'demo',
  'production',
]);
const SAFE_VALUE = /^[A-Za-z0-9._~:+/-]+$/u;
const PROJECT_ID = /^[a-z0-9][a-z0-9-]{3,62}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function configuredValue(value: string | undefined, maximumLength = 512): string | undefined {
  const candidate = value?.trim();
  if (
    candidate === undefined ||
    candidate.length === 0 ||
    candidate.length > maximumLength ||
    !SAFE_VALUE.test(candidate)
  ) {
    return undefined;
  }
  return candidate;
}

function configuredAuthDomain(value: string | undefined): string | undefined {
  const candidate = configuredValue(value, 253);
  if (candidate === undefined || candidate.includes('/') || candidate.includes(':')) {
    return undefined;
  }
  try {
    const url = new URL(`https://${candidate}`);
    return url.hostname === candidate ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function parseFirebaseBridgeConfiguration<Surface extends AuthSurface>(
  input: FirebaseBridgeConfigurationInput<Surface>,
): FirebaseBridgeConfiguration<Surface> | undefined {
  const environment = input.environment as BrowserEnvironment | undefined;
  const apiKey = configuredValue(input.apiKey);
  const authDomain = configuredAuthDomain(input.authDomain);
  const projectId = configuredValue(input.projectId, 63);
  const appId = configuredValue(input.appId);
  const appCheckEnterpriseSiteKey = configuredValue(input.appCheckEnterpriseSiteKey);
  if (
    environment === undefined ||
    !ENVIRONMENTS.has(environment) ||
    apiKey === undefined ||
    authDomain === undefined ||
    projectId === undefined ||
    !PROJECT_ID.test(projectId) ||
    appId === undefined ||
    appCheckEnterpriseSiteKey === undefined
  ) {
    return undefined;
  }
  return Object.freeze({
    surface: input.surface,
    environment,
    apiKey,
    authDomain,
    projectId,
    appId,
    appCheckEnterpriseSiteKey,
    appName: `smart-fasal-${input.surface}-${environment}-${projectId}`,
  });
}

function validToken(value: string): boolean {
  return value.length >= 16 && value.length <= 16_384 && !/\s/u.test(value);
}

function safeProviderError(): Error {
  return new Error('IDENTITY_PROVIDER_UNAVAILABLE');
}

/**
 * Creates the production browser bridge. It retains Firebase service handles but never retains a
 * returned credential. Auth is initialized with only `inMemoryPersistence`.
 *
 * Firebase's public App Check initializer has no memory-only cache switch and performs an
 * unavoidable SDK cached-state read from IndexedDB. This bridge disables auto-refresh and calls
 * only `getLimitedUseToken()`: the pinned SDK bypasses reusable App Check state for that call and
 * does not persist or reuse the returned limited-use token. Standard `getToken()` is deliberately
 * absent from the injected port, making it impossible for application code to request it.
 */
export function createFirebaseIdentityBridge<Surface extends AuthSurface>(
  input: FirebaseBridgeConfigurationInput<Surface>,
  sdk: FirebaseWebSdkPort = FIREBASE_WEB_SDK,
): IdentityBridge<Surface> | undefined {
  const configuration = parseFirebaseBridgeConfiguration(input);
  if (configuration === undefined) return undefined;

  let app: FirebaseAppHandle;
  let auth: FirebaseAuthHandle;
  let appCheck: FirebaseAppCheckHandle;
  try {
    app = sdk.initializeApp(
      {
        apiKey: configuration.apiKey,
        authDomain: configuration.authDomain,
        projectId: configuration.projectId,
        appId: configuration.appId,
      },
      configuration.appName,
    );
    auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence });
    appCheck = sdk.initializeAppCheck(app, {
      enterpriseSiteKey: configuration.appCheckEnterpriseSiteKey,
      isTokenAutoRefreshEnabled: false,
    });
  } catch {
    return undefined;
  }

  async function currentLimitedUseAppCheckToken(): Promise<string> {
    try {
      const token = await sdk.getLimitedUseAppCheckToken(appCheck);
      if (!validToken(token)) throw safeProviderError();
      return token;
    } catch {
      throw safeProviderError();
    }
  }

  return Object.freeze({
    credentialPersistence: 'memory' as const,
    getAppCheckToken: currentLimitedUseAppCheckToken,
    async signIn(signInInput: {
      readonly returnStateId: string;
      readonly surface: Surface;
    }): Promise<InMemoryCredentials> {
      if (signInInput.surface !== configuration.surface || !UUID.test(signInInput.returnStateId)) {
        throw safeProviderError();
      }
      try {
        const user = await sdk.signInWithGooglePopup(auth);
        const [idToken, appCheckToken] = await Promise.all([
          sdk.getIdToken(user, true),
          currentLimitedUseAppCheckToken(),
        ]);
        if (!validToken(idToken) || !validToken(appCheckToken)) throw safeProviderError();
        return Object.freeze({ idToken, appCheckToken });
      } catch {
        await sdk.signOut(auth).catch(() => undefined);
        throw safeProviderError();
      }
    },
    async signOut() {
      try {
        await sdk.signOut(auth);
      } catch {
        throw safeProviderError();
      }
    },
  });
}
