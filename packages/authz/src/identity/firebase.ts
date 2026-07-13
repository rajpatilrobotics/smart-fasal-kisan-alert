import { authenticationRequired, dependencyUnavailable, type SecurityResult } from '../problems.js';
import {
  verifyBrowserCredentialsIndependently,
  type ApplicationSurface,
  type BrowserCredentialInput,
  type IdentityVerifier,
  type RuntimeEnvironment,
  type VerifiedAppCheck,
  type VerifiedBrowserIdentity,
  type VerifiedIdentity,
} from './types.js';

export interface SubjectSecurityRecord {
  readonly subjectId: string;
  readonly subjectType: 'FARMER' | 'STAFF';
  readonly environment: RuntimeEnvironment;
  readonly status: 'ACTIVE' | 'DISABLED' | 'DELETED';
  readonly securityVersion: number;
}

export interface FirebaseAppHandle {
  readonly name: string;
}

interface FirebaseAuthHandle {
  verifyIdToken(token: string, checkRevoked: boolean): Promise<unknown>;
}

interface FirebaseAppCheckHandle {
  verifyToken(token: string): Promise<unknown>;
}

export interface FirebaseAdminModules {
  readonly app: {
    applicationDefault(): unknown;
    getApps(): readonly FirebaseAppHandle[];
    initializeApp(
      options: { readonly credential: unknown; readonly projectId: string },
      name: string,
    ): FirebaseAppHandle;
  };
  readonly auth: {
    getAuth(app: FirebaseAppHandle): FirebaseAuthHandle;
  };
  readonly appCheck: {
    getAppCheck(app: FirebaseAppHandle): FirebaseAppCheckHandle;
  };
}

export type FirebaseAdminModuleLoader = () => Promise<FirebaseAdminModules>;

export interface FirebaseIdentityVerifierConfig {
  readonly mode: 'firebase';
  readonly environment: RuntimeEnvironment;
  readonly projectId: string;
  readonly allowedAppIds: Readonly<Partial<Record<ApplicationSurface, readonly string[]>>>;
  readonly resolveSubject: (providerUid: string) => Promise<SubjectSecurityRecord | null>;
  readonly now?: () => Date;
  readonly loadModules?: FirebaseAdminModuleLoader;
}

interface InitializedFirebase {
  readonly auth: FirebaseAuthHandle;
  readonly appCheck: FirebaseAppCheckHandle;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function hasFirebaseAppShape(value: unknown): value is FirebaseAdminModules['app'] {
  return (
    isRecord(value) &&
    typeof value['applicationDefault'] === 'function' &&
    typeof value['getApps'] === 'function' &&
    typeof value['initializeApp'] === 'function'
  );
}

function hasFirebaseAuthShape(value: unknown): value is FirebaseAdminModules['auth'] {
  return isRecord(value) && typeof value['getAuth'] === 'function';
}

function hasFirebaseAppCheckShape(value: unknown): value is FirebaseAdminModules['appCheck'] {
  return isRecord(value) && typeof value['getAppCheck'] === 'function';
}

async function loadFirebaseAdminModules(): Promise<FirebaseAdminModules> {
  // Variables keep the SDK optional at compile time while package.json pins the production runtime.
  const appSpecifier = 'firebase-admin/app';
  const authSpecifier = 'firebase-admin/auth';
  const appCheckSpecifier = 'firebase-admin/app-check';
  // TypeScript types variable dynamic imports as `any`; the runtime shape guards below restore safety.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [app, auth, appCheck] = await Promise.all([
    import(appSpecifier),
    import(authSpecifier),
    import(appCheckSpecifier),
  ]);

  if (
    !hasFirebaseAppShape(app) ||
    !hasFirebaseAuthShape(auth) ||
    !hasFirebaseAppCheckShape(appCheck)
  ) {
    throw new Error('Firebase Admin module shape is unsupported.');
  }

  return { app, auth, appCheck };
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readInteger(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

function hasMfaClaim(decoded: Readonly<Record<string, unknown>>): boolean {
  const firebase = decoded['firebase'];
  if (
    isRecord(firebase) &&
    typeof firebase['sign_in_second_factor'] === 'string' &&
    firebase['sign_in_second_factor'].length > 0
  ) {
    return true;
  }

  const authenticationMethods = decoded['amr'];
  return (
    Array.isArray(authenticationMethods) && authenticationMethods.some((method) => method === 'mfa')
  );
}

function safeErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  return readString(error, 'code');
}

function isDependencyFailure(error: unknown): boolean {
  const code = safeErrorCode(error);
  return (
    code === 'app/invalid-credential' ||
    code === 'app/network-error' ||
    code === 'auth/internal-error' ||
    code === 'auth/network-request-failed' ||
    code === 'app-check/internal-error'
  );
}

function invalidCredentialOrDependency(error: unknown): SecurityResult<never> {
  return isDependencyFailure(error)
    ? dependencyUnavailable('DEPENDENCY_FAILED')
    : authenticationRequired('CREDENTIAL_REJECTED');
}

function toIsoFromEpochSeconds(seconds: number): string {
  return new Date(seconds * 1_000).toISOString();
}

export class FirebaseIdentityVerifier implements IdentityVerifier {
  private readonly now: () => Date;
  private readonly loadModules: FirebaseAdminModuleLoader;
  private initialized?: Promise<SecurityResult<InitializedFirebase>>;

  constructor(private readonly config: FirebaseIdentityVerifierConfig) {
    this.now = config.now ?? (() => new Date());
    this.loadModules = config.loadModules ?? loadFirebaseAdminModules;
  }

  async verifyIdToken(token: string): Promise<SecurityResult<VerifiedIdentity>> {
    if (token.length === 0) {
      return authenticationRequired('CREDENTIAL_REJECTED');
    }

    const initialized = await this.getInitializedFirebase();
    if (!initialized.ok) {
      return initialized;
    }

    let decoded: unknown;
    try {
      // `true` is mandatory: Firebase checks token revocation in addition to signature/expiry.
      decoded = await initialized.value.auth.verifyIdToken(token, true);
    } catch (error) {
      return invalidCredentialOrDependency(error);
    }

    if (!isRecord(decoded)) {
      return authenticationRequired('CREDENTIAL_REJECTED');
    }

    return this.validateDecodedIdentity(decoded);
  }

  async verifyAppCheckToken(
    token: string,
    surface: ApplicationSurface,
  ): Promise<SecurityResult<VerifiedAppCheck>> {
    if (token.length === 0) {
      return authenticationRequired('APP_CHECK_REJECTED');
    }

    const allowedAppIds = this.config.allowedAppIds[surface];
    if (allowedAppIds === undefined || allowedAppIds.length === 0) {
      return dependencyUnavailable('DEPENDENCY_NOT_CONFIGURED');
    }

    const initialized = await this.getInitializedFirebase();
    if (!initialized.ok) {
      return initialized;
    }

    let decoded: unknown;
    try {
      decoded = await initialized.value.appCheck.verifyToken(token);
    } catch (error) {
      return isDependencyFailure(error)
        ? dependencyUnavailable('DEPENDENCY_FAILED')
        : authenticationRequired('APP_CHECK_REJECTED');
    }

    if (!isRecord(decoded)) {
      return authenticationRequired('APP_CHECK_REJECTED');
    }

    const appId = readString(decoded, 'appId') ?? readString(decoded, 'app_id');
    const expiresAtSeconds = readInteger(decoded, 'exp');
    const nowSeconds = Math.floor(this.now().getTime() / 1_000);
    if (appId === undefined || expiresAtSeconds === undefined || expiresAtSeconds <= nowSeconds) {
      return authenticationRequired('APP_CHECK_REJECTED');
    }
    if (!allowedAppIds.includes(appId)) {
      return authenticationRequired('APP_ID_NOT_ALLOWED');
    }

    return {
      ok: true,
      value: {
        appId,
        environment: this.config.environment,
        surface,
        expiresAt: toIsoFromEpochSeconds(expiresAtSeconds),
      },
    };
  }

  verifyBrowserCredentials(
    input: BrowserCredentialInput,
  ): Promise<SecurityResult<VerifiedBrowserIdentity>> {
    return verifyBrowserCredentialsIndependently(this, input);
  }

  private async getInitializedFirebase(): Promise<SecurityResult<InitializedFirebase>> {
    this.initialized ??= this.initializeFirebase();
    return this.initialized;
  }

  private async initializeFirebase(): Promise<SecurityResult<InitializedFirebase>> {
    try {
      const modules = await this.loadModules();
      const appName = `smart-fasal-${this.config.environment}-${this.config.projectId}`;
      const existingApp = modules.app.getApps().find((app) => app.name === appName);
      const app =
        existingApp ??
        modules.app.initializeApp(
          {
            credential: modules.app.applicationDefault(),
            projectId: this.config.projectId,
          },
          appName,
        );
      return {
        ok: true,
        value: {
          auth: modules.auth.getAuth(app),
          appCheck: modules.appCheck.getAppCheck(app),
        },
      };
    } catch {
      return dependencyUnavailable('DEPENDENCY_FAILED');
    }
  }

  private async validateDecodedIdentity(
    decoded: Readonly<Record<string, unknown>>,
  ): Promise<SecurityResult<VerifiedIdentity>> {
    const providerUid = readString(decoded, 'uid');
    const subjectClaim = readString(decoded, 'sub');
    const audience = readString(decoded, 'aud');
    const issuer = readString(decoded, 'iss');
    const environment = readString(decoded, 'environment');
    const securityVersion = readInteger(decoded, 'security_version');
    const issuedAtSeconds = readInteger(decoded, 'iat');
    const expiresAtSeconds = readInteger(decoded, 'exp');
    const nowSeconds = Math.floor(this.now().getTime() / 1_000);

    if (
      providerUid === undefined ||
      subjectClaim === undefined ||
      providerUid !== subjectClaim ||
      audience !== this.config.projectId ||
      issuer !== `https://securetoken.google.com/${this.config.projectId}` ||
      issuedAtSeconds === undefined ||
      issuedAtSeconds > nowSeconds + 60 ||
      expiresAtSeconds === undefined ||
      expiresAtSeconds <= nowSeconds ||
      securityVersion === undefined
    ) {
      return authenticationRequired('CREDENTIAL_REJECTED');
    }
    if (environment !== this.config.environment) {
      return authenticationRequired('ENVIRONMENT_MISMATCH');
    }

    let subject: SubjectSecurityRecord | null;
    try {
      subject = await this.config.resolveSubject(providerUid);
    } catch {
      return dependencyUnavailable('DEPENDENCY_FAILED');
    }

    if (subject?.status !== 'ACTIVE' || subject.subjectId.length === 0) {
      return authenticationRequired('CREDENTIAL_REJECTED');
    }
    if (subject.environment !== this.config.environment) {
      return authenticationRequired('ENVIRONMENT_MISMATCH');
    }
    if (subject.securityVersion !== securityVersion) {
      return authenticationRequired('SECURITY_VERSION_CHANGED');
    }

    const authenticationTime = readInteger(decoded, 'auth_time');
    const mfa =
      hasMfaClaim(decoded) && authenticationTime !== undefined
        ? {
            secondFactor: true as const,
            assuredAt: toIsoFromEpochSeconds(authenticationTime),
          }
        : undefined;

    return {
      ok: true,
      value: {
        subjectId: subject.subjectId,
        subjectType: subject.subjectType,
        providerUid,
        environment: this.config.environment,
        projectId: this.config.projectId,
        securityVersion,
        issuedAt: toIsoFromEpochSeconds(issuedAtSeconds),
        expiresAt: toIsoFromEpochSeconds(expiresAtSeconds),
        ...(mfa === undefined ? {} : { mfa }),
      },
    };
  }
}

export function createFirebaseIdentityVerifier(
  config: FirebaseIdentityVerifierConfig,
): SecurityResult<IdentityVerifier> {
  const configuredSurfaces = Object.values(config.allowedAppIds).filter(
    (appIds) => appIds.length > 0,
  );
  if (config.projectId.trim().length === 0 || configuredSurfaces.length === 0) {
    return dependencyUnavailable('DEPENDENCY_NOT_CONFIGURED');
  }

  return { ok: true, value: new FirebaseIdentityVerifier(config) };
}
