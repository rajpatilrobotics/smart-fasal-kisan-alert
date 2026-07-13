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

export interface DeterministicCredentialFixture {
  readonly idToken: string;
  readonly appCheckToken: string;
  readonly identity: VerifiedIdentity;
  readonly appCheck: VerifiedAppCheck;
}

export interface DeterministicIdentityVerifierConfig {
  readonly mode: 'fake';
  readonly environment: RuntimeEnvironment;
  readonly fixtures: readonly DeterministicCredentialFixture[];
  readonly now?: () => Date;
}

class DeterministicIdentityVerifier implements IdentityVerifier {
  private readonly identities = new Map<string, VerifiedIdentity>();
  private readonly appChecks = new Map<string, VerifiedAppCheck>();

  constructor(private readonly config: DeterministicIdentityVerifierConfig) {
    for (const fixture of config.fixtures) {
      this.identities.set(fixture.idToken, fixture.identity);
      this.appChecks.set(fixture.appCheckToken, fixture.appCheck);
    }
  }

  verifyIdToken(token: string): Promise<SecurityResult<VerifiedIdentity>> {
    const identity = this.identities.get(token);
    if (identity === undefined) {
      return Promise.resolve(authenticationRequired('CREDENTIAL_REJECTED'));
    }
    if (identity.environment !== this.config.environment) {
      return Promise.resolve(authenticationRequired('ENVIRONMENT_MISMATCH'));
    }
    if (!isFuture(identity.expiresAt, this.config.now?.() ?? new Date())) {
      return Promise.resolve(authenticationRequired('CREDENTIAL_REJECTED'));
    }
    return Promise.resolve({ ok: true, value: identity });
  }

  verifyAppCheckToken(
    token: string,
    surface: ApplicationSurface,
  ): Promise<SecurityResult<VerifiedAppCheck>> {
    const appCheck = this.appChecks.get(token);
    if (appCheck === undefined) {
      return Promise.resolve(authenticationRequired('APP_CHECK_REJECTED'));
    }
    if (appCheck.environment !== this.config.environment) {
      return Promise.resolve(authenticationRequired('ENVIRONMENT_MISMATCH'));
    }
    if (appCheck.surface !== surface) {
      return Promise.resolve(authenticationRequired('APP_ID_NOT_ALLOWED'));
    }
    if (!isFuture(appCheck.expiresAt, this.config.now?.() ?? new Date())) {
      return Promise.resolve(authenticationRequired('APP_CHECK_REJECTED'));
    }
    return Promise.resolve({ ok: true, value: appCheck });
  }

  verifyBrowserCredentials(
    input: BrowserCredentialInput,
  ): Promise<SecurityResult<VerifiedBrowserIdentity>> {
    return verifyBrowserCredentialsIndependently(this, input);
  }
}

function isFuture(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

export function createDeterministicIdentityVerifier(
  config: DeterministicIdentityVerifierConfig,
): SecurityResult<IdentityVerifier> {
  if (config.environment !== 'local') {
    return dependencyUnavailable('FAKE_MODE_FORBIDDEN');
  }
  return { ok: true, value: new DeterministicIdentityVerifier(config) };
}
