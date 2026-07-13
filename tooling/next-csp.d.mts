export interface NonceContentSecurityPolicyOptions {
  connectOrigins?: readonly (string | undefined)[];
  frameOrigins?: readonly (string | undefined)[];
  nonce?: string;
  production?: boolean;
}

export interface FirebaseBrowserPolicyOrigins {
  connectOrigins: readonly string[];
  frameOrigins: readonly string[];
}

export interface NonceContentSecurityPolicy {
  contentSecurityPolicy: string;
  nonce: string;
}

export function createNonceContentSecurityPolicy(
  options?: NonceContentSecurityPolicyOptions,
): NonceContentSecurityPolicy;

export function firebaseBrowserPolicyOrigins(
  authDomain: string | undefined,
): FirebaseBrowserPolicyOrigins;
