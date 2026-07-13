export type SecurityProblemCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHORIZATION_DENIED'
  | 'MFA_REQUIRED'
  | 'AUTHORIZATION_VERSION_CHANGED'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
  | 'EXPECTED_REVISION_MISMATCH'
  | 'DEPENDENCY_UNAVAILABLE';

export type SecurityProblemReason =
  | 'CREDENTIAL_REJECTED'
  | 'DEPENDENCY_NOT_CONFIGURED'
  | 'DEPENDENCY_FAILED'
  | 'FAKE_MODE_FORBIDDEN'
  | 'ENVIRONMENT_MISMATCH'
  | 'SECURITY_VERSION_CHANGED'
  | 'APP_CHECK_REJECTED'
  | 'APP_ID_NOT_ALLOWED';

export interface SecurityProblem {
  readonly code: SecurityProblemCode;
  readonly status: 401 | 403 | 409 | 503;
  readonly title: string;
  readonly detail: string;
  readonly retryable: boolean;
  readonly reason: SecurityProblemReason;
}

export type SecurityResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problem: SecurityProblem };

export function authenticationRequired(
  reason: Extract<
    SecurityProblemReason,
    | 'CREDENTIAL_REJECTED'
    | 'ENVIRONMENT_MISMATCH'
    | 'SECURITY_VERSION_CHANGED'
    | 'APP_CHECK_REJECTED'
    | 'APP_ID_NOT_ALLOWED'
  >,
): SecurityResult<never> {
  return {
    ok: false,
    problem: {
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
      title: 'Authentication required',
      detail: 'The supplied application credential could not be accepted.',
      retryable: false,
      reason,
    },
  };
}

export function dependencyUnavailable(
  reason: Extract<
    SecurityProblemReason,
    'DEPENDENCY_NOT_CONFIGURED' | 'DEPENDENCY_FAILED' | 'FAKE_MODE_FORBIDDEN'
  >,
): SecurityResult<never> {
  return {
    ok: false,
    problem: {
      code: 'DEPENDENCY_UNAVAILABLE',
      status: 503,
      title: 'Identity verification unavailable',
      detail: 'The configured identity verifier is unavailable.',
      retryable: reason === 'DEPENDENCY_FAILED',
      reason,
    },
  };
}
