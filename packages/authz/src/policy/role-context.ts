import type { ApplicationSurface, RuntimeEnvironment } from '../identity/index.js';
import { isRegisteredCapability } from '../registry.js';
import type {
  AppCheckPosture,
  AuthorizationDecision,
  AuthorizationReason,
  AuthorizationStage,
  DevicePosture,
  IdentityPolicyContext,
  RoleType,
} from './types.js';

export interface RoleGrantContext {
  readonly active: boolean;
  readonly subjectId: string;
  readonly environment: RuntimeEnvironment;
  readonly roleType: RoleType;
  readonly expiresAt: string;
  readonly authorizationVersion: number;
  readonly capabilitySetVersion: number;
  readonly capabilities: readonly string[];
  readonly officeId?: string;
  readonly jurisdictionId?: string;
}

export interface RoleContextCreationInput {
  readonly now: string;
  readonly identity: IdentityPolicyContext;
  readonly requestedEnvironment: RuntimeEnvironment;
  readonly requestedSurface: ApplicationSurface;
  readonly requestedRoleType: RoleType;
  readonly grant: RoleGrantContext;
  readonly appCheck: AppCheckPosture;
  readonly device: DevicePosture;
  readonly maximumMfaAgeSeconds: number;
}

function deny(
  problemCode: Extract<AuthorizationDecision, { readonly allowed: false }>['problemCode'],
  stage: AuthorizationStage,
  reason: AuthorizationReason,
): AuthorizationDecision {
  return { allowed: false, problemCode, stage, reason };
}

function parseTimestamp(value: string): number | undefined {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function subjectTypeAllowsRole(subjectType: 'FARMER' | 'STAFF', roleType: RoleType): boolean {
  return subjectType === 'FARMER' ? roleType === 'FARMER' : roleType === 'RSK' || roleType === 'MP';
}

function hasCurrentMfa(input: RoleContextCreationInput, now: number): boolean {
  const assurance = input.identity.mfa;
  const assuredAt = assurance === undefined ? undefined : parseTimestamp(assurance.assuredAt);
  return (
    assurance?.secondFactor === true &&
    assuredAt !== undefined &&
    assuredAt <= now &&
    input.maximumMfaAgeSeconds > 0 &&
    now - assuredAt <= input.maximumMfaAgeSeconds * 1_000
  );
}

/** Creates authority only from the current server grant; token claims are intentionally absent. */
export function evaluateRoleContextCreation(
  input: RoleContextCreationInput,
): AuthorizationDecision {
  const now = parseTimestamp(input.now);
  const identityExpiry = parseTimestamp(input.identity.expiresAt);

  // 1. Identity and environment.
  if (!input.identity.authenticated || input.identity.subjectId.length === 0) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'IDENTITY_REQUIRED');
  }
  if (!input.identity.active) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'IDENTITY_INACTIVE');
  }
  if (now === undefined || identityExpiry === undefined || identityExpiry <= now) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'IDENTITY_EXPIRED');
  }
  if (
    input.identity.environment !== input.requestedEnvironment ||
    input.identity.environment !== input.grant.environment
  ) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'ENVIRONMENT_MISMATCH');
  }
  if (input.identity.securityVersion !== input.identity.currentSecurityVersion) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'SECURITY_VERSION_CHANGED');
  }

  // 2. Current server-side role grant and MFA assurance.
  const grantExpiry = parseTimestamp(input.grant.expiresAt);
  if (!input.grant.active) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_INACTIVE');
  }
  if (grantExpiry === undefined || grantExpiry <= now) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_EXPIRED');
  }
  if (input.grant.subjectId !== input.identity.subjectId) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_SUBJECT_MISMATCH');
  }
  if (!subjectTypeAllowsRole(input.identity.subjectType, input.requestedRoleType)) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_TYPE_MISMATCH');
  }
  if (
    input.grant.roleType !== input.requestedRoleType ||
    (input.requestedRoleType === 'RSK' &&
      (input.grant.officeId === undefined || input.grant.jurisdictionId === undefined))
  ) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_TYPE_MISMATCH');
  }
  if (
    (input.requestedRoleType === 'RSK' || input.requestedRoleType === 'MP') &&
    !hasCurrentMfa(input, now)
  ) {
    return deny('MFA_REQUIRED', 'ROLE_CONTEXT_VERSION', 'MFA_REQUIRED');
  }

  // 3. The requested app surface and browser posture must match the grant.
  if (input.requestedSurface !== input.requestedRoleType) {
    return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'SURFACE_MISMATCH');
  }
  if (!input.appCheck.valid) {
    return deny('AUTHENTICATION_REQUIRED', 'SURFACE_DEVICE_APP_CHECK', 'APP_CHECK_REQUIRED');
  }
  if (!input.appCheck.allowedAppIds.includes(input.appCheck.appId)) {
    return deny('AUTHENTICATION_REQUIRED', 'SURFACE_DEVICE_APP_CHECK', 'APP_ID_NOT_ALLOWED');
  }
  if (input.device.required) {
    if (!input.device.active) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'DEVICE_BINDING_REQUIRED');
    }
    if (
      input.device.boundSubjectId !== input.identity.subjectId ||
      !input.device.allowedSurfaces.includes(input.requestedSurface)
    ) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'DEVICE_BINDING_MISMATCH');
    }
    if (
      (input.requestedRoleType === 'RSK' || input.requestedRoleType === 'MP') &&
      !input.device.managed
    ) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'MANAGED_DEVICE_REQUIRED');
    }
  }

  // 5. `identity.role_context.select` is exact and cannot be implied by an admin label.
  if (input.grant.capabilities.some((capability) => !isRegisteredCapability(capability))) {
    return deny('AUTHORIZATION_DENIED', 'CAPABILITY', 'UNKNOWN_CAPABILITY');
  }
  if (!input.grant.capabilities.includes('identity.role_context.select')) {
    return deny('AUTHORIZATION_DENIED', 'CAPABILITY', 'CAPABILITY_MISSING');
  }

  return {
    allowed: true,
    authorizationVersion: input.grant.authorizationVersion,
    capabilitySetVersion: input.grant.capabilitySetVersion,
  };
}
