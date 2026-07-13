import type { SecurityResult } from '../problems.js';

export const RUNTIME_ENVIRONMENTS = ['local', 'preview', 'staging', 'demo', 'production'] as const;

export const APPLICATION_SURFACES = ['FARMER', 'RSK', 'MP'] as const;

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number];
export type ApplicationSurface = (typeof APPLICATION_SURFACES)[number];

export interface MfaAssurance {
  readonly secondFactor: true;
  readonly assuredAt: string;
}

export interface VerifiedIdentity {
  /** Internal stable subject. Provider UIDs and custom claims never grant authorization. */
  readonly subjectId: string;
  /** Authoritative server-side subject class. Token claims never populate this value. */
  readonly subjectType: 'FARMER' | 'STAFF';
  readonly providerUid: string;
  readonly environment: RuntimeEnvironment;
  readonly projectId: string;
  readonly securityVersion: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly mfa?: MfaAssurance;
}

export interface VerifiedAppCheck {
  readonly appId: string;
  readonly environment: RuntimeEnvironment;
  readonly surface: ApplicationSurface;
  readonly expiresAt: string;
}

export interface BrowserCredentialInput {
  readonly idToken: string;
  readonly appCheckToken: string;
  readonly surface: ApplicationSurface;
}

export interface VerifiedBrowserIdentity {
  readonly identity: VerifiedIdentity;
  readonly appCheck: VerifiedAppCheck;
}

export interface IdentityVerifier {
  verifyIdToken(token: string): Promise<SecurityResult<VerifiedIdentity>>;
  verifyAppCheckToken(
    token: string,
    surface: ApplicationSurface,
  ): Promise<SecurityResult<VerifiedAppCheck>>;
  verifyBrowserCredentials(
    input: BrowserCredentialInput,
  ): Promise<SecurityResult<VerifiedBrowserIdentity>>;
}

export async function verifyBrowserCredentialsIndependently(
  verifier: Pick<IdentityVerifier, 'verifyIdToken' | 'verifyAppCheckToken'>,
  input: BrowserCredentialInput,
): Promise<SecurityResult<VerifiedBrowserIdentity>> {
  // Start both checks before observing either result. App Check is independent from identity.
  const identityPromise = verifier.verifyIdToken(input.idToken);
  const appCheckPromise = verifier.verifyAppCheckToken(input.appCheckToken, input.surface);
  const [identity, appCheck] = await Promise.all([identityPromise, appCheckPromise]);

  if (!identity.ok) {
    return identity;
  }
  if (!appCheck.ok) {
    return appCheck;
  }

  return { ok: true, value: { identity: identity.value, appCheck: appCheck.value } };
}
