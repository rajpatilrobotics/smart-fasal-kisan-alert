import type { ApplicationSurface } from '../identity/index.js';
import {
  isRegisteredCapability,
  isRegisteredConsentScope,
  isRegisteredDataClassification,
  isRegisteredPurpose,
} from '../registry.js';
import type {
  AuthorizationDecision,
  AuthorizationInput,
  AuthorizationReason,
  AuthorizationStage,
  ConsentAccessContext,
  ConsentAccessState,
  RoleType,
} from './types.js';

const SURFACE_ROLE: Readonly<Record<ApplicationSurface, RoleType>> = {
  FARMER: 'FARMER',
  RSK: 'RSK',
  MP: 'MP',
};

function deny(
  problemCode: Extract<AuthorizationDecision, { readonly allowed: false }>['problemCode'],
  stage: AuthorizationStage,
  reason: AuthorizationReason,
  consentState?: Exclude<ConsentAccessState, 'ALLOWED'>,
): AuthorizationDecision {
  return {
    allowed: false,
    problemCode,
    stage,
    reason,
    ...(consentState === undefined ? {} : { consentState }),
  };
}

function timestamp(value: string): number | undefined {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function subjectTypeAllowsRole(subjectType: 'FARMER' | 'STAFF', roleType: RoleType): boolean {
  return subjectType === 'FARMER' ? roleType === 'FARMER' : roleType === 'RSK' || roleType === 'MP';
}

function evaluateConsent(
  consent: ConsentAccessContext,
  now: number,
): AuthorizationDecision | undefined {
  if (
    !isRegisteredConsentScope(consent.scope) ||
    !isRegisteredConsentScope(consent.requiredScope)
  ) {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'UNKNOWN_CONSENT_SCOPE');
  }
  if (consent.scope !== consent.requiredScope || !consent.targetMatches) {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_TARGET_MISMATCH');
  }
  if (consent.presentedAccessVersion !== consent.currentAccessVersion) {
    return deny(
      'CONSENT_OR_ACCESS_VERSION_CHANGED',
      'CONSENT_ACCESS_VERSION',
      'ACCESS_VERSION_CHANGED',
    );
  }

  if (consent.state === 'MISSING') {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_MISSING', 'MISSING');
  }
  if (consent.state === 'DENIED') {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_DENIED', 'DENIED');
  }
  if (consent.state === 'WITHDRAWN') {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_WITHDRAWN', 'WITHDRAWN');
  }
  if (consent.state === 'EXPIRED') {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_EXPIRED', 'EXPIRED');
  }
  if (consent.state !== 'ALLOWED') {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_STATE_INVALID');
  }

  const expiresAt = consent.expiresAt === undefined ? undefined : timestamp(consent.expiresAt);
  if (expiresAt === undefined || expiresAt <= now) {
    return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'CONSENT_EXPIRED', 'EXPIRED');
  }
  return undefined;
}

/**
 * Evaluates one protected operation in the locked order. It never loads data,
 * implies a capability from a role name, or treats App Check as authority.
 */
export function evaluateAuthorization(input: AuthorizationInput): AuthorizationDecision {
  const now = timestamp(input.now);
  const identityExpiry = timestamp(input.identity.expiresAt);

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
    input.identity.environment !== input.request.environment ||
    input.identity.environment !== input.roleContext.environment
  ) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'ENVIRONMENT_MISMATCH');
  }
  if (input.identity.securityVersion !== input.identity.currentSecurityVersion) {
    return deny('AUTHENTICATION_REQUIRED', 'IDENTITY_ENVIRONMENT', 'SECURITY_VERSION_CHANGED');
  }

  // 2. Role context and all authority versions.
  const roleExpiry = timestamp(input.roleContext.expiresAt);
  if (!input.roleContext.active) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_INACTIVE');
  }
  if (roleExpiry === undefined || roleExpiry <= now) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_EXPIRED');
  }
  if (input.roleContext.subjectId !== input.identity.subjectId) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_CONTEXT_SUBJECT_MISMATCH');
  }
  if (!subjectTypeAllowsRole(input.identity.subjectType, input.roleContext.roleType)) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_TYPE_MISMATCH');
  }
  if (input.roleContext.roleType !== input.requirement.roleType) {
    return deny('AUTHORIZATION_DENIED', 'ROLE_CONTEXT_VERSION', 'ROLE_TYPE_MISMATCH');
  }
  if (
    input.roleContext.authorizationVersion !== input.roleContext.currentAuthorizationVersion ||
    input.request.authorizationVersion !== input.roleContext.currentAuthorizationVersion
  ) {
    return deny(
      'AUTHORIZATION_VERSION_CHANGED',
      'ROLE_CONTEXT_VERSION',
      'AUTHORIZATION_VERSION_CHANGED',
    );
  }
  if (input.roleContext.capabilitySetVersion !== input.roleContext.currentCapabilitySetVersion) {
    return deny(
      'AUTHORIZATION_VERSION_CHANGED',
      'ROLE_CONTEXT_VERSION',
      'CAPABILITY_SET_VERSION_CHANGED',
    );
  }

  // 3. Surface, App Check and device posture.
  if (SURFACE_ROLE[input.request.surface] !== input.roleContext.roleType) {
    return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'SURFACE_MISMATCH');
  }
  if (!input.request.appCheck.valid) {
    return deny('AUTHENTICATION_REQUIRED', 'SURFACE_DEVICE_APP_CHECK', 'APP_CHECK_REQUIRED');
  }
  if (!input.request.appCheck.allowedAppIds.includes(input.request.appCheck.appId)) {
    return deny('AUTHENTICATION_REQUIRED', 'SURFACE_DEVICE_APP_CHECK', 'APP_ID_NOT_ALLOWED');
  }
  if (input.request.device.required) {
    if (!input.request.device.active) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'DEVICE_BINDING_REQUIRED');
    }
    if (
      input.request.device.boundSubjectId !== input.identity.subjectId ||
      !input.request.device.allowedSurfaces.includes(input.request.surface)
    ) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'DEVICE_BINDING_MISMATCH');
    }
    if (input.requirement.managedDeviceRequired && !input.request.device.managed) {
      return deny('AUTHORIZATION_DENIED', 'SURFACE_DEVICE_APP_CHECK', 'MANAGED_DEVICE_REQUIRED');
    }
  }

  // 4. Farmer ownership or exact staff office/jurisdiction/assignment.
  if (
    input.requirement.scope === 'OWNER' &&
    input.resource.ownerSubjectId !== input.identity.subjectId
  ) {
    return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'OWNER_MISMATCH');
  }
  if (input.requirement.scope === 'RSK_SCOPE') {
    if (
      input.roleContext.officeId === undefined ||
      input.resource.officeId !== input.roleContext.officeId
    ) {
      return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'OFFICE_MISMATCH');
    }
    if (
      input.roleContext.jurisdictionId === undefined ||
      input.resource.jurisdictionId !== input.roleContext.jurisdictionId
    ) {
      return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'JURISDICTION_MISMATCH');
    }

    const assignment = input.resource.assignment;
    if (assignment?.required === true) {
      if (!assignment.active) {
        return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'ASSIGNMENT_REQUIRED');
      }
      if (
        assignment.staffSubjectId !== input.identity.subjectId ||
        assignment.roleContextId !== input.roleContext.id ||
        assignment.officeId !== input.roleContext.officeId ||
        assignment.jurisdictionId !== input.roleContext.jurisdictionId
      ) {
        return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'ASSIGNMENT_MISMATCH');
      }
    }
  }
  if (
    input.requirement.scope === 'MP_RELEASE' &&
    (input.resource.ownerSubjectId !== undefined ||
      input.resource.officeId !== undefined ||
      input.resource.jurisdictionId !== undefined)
  ) {
    return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'OPERATIONAL_SCOPE_FORBIDDEN');
  }
  if (input.requirement.resourceKindRegistered === false) {
    return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'DISCLOSURE_TARGET_INVALID');
  }
  if (input.requirement.accessGrant !== undefined) {
    const grant = input.resource.accessGrant;
    if (!grant?.active) {
      return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'ACCESS_GRANT_REQUIRED');
    }
    if (
      grant.staffSubjectId !== input.identity.subjectId ||
      grant.roleContextId !== input.roleContext.id ||
      grant.officeId !== input.roleContext.officeId ||
      grant.jurisdictionId !== input.roleContext.jurisdictionId ||
      grant.targetType !== input.requirement.accessGrant.targetType ||
      grant.targetId !== input.requirement.accessGrant.targetId
    ) {
      return deny('AUTHORIZATION_DENIED', 'RESOURCE_SCOPE', 'ACCESS_GRANT_MISMATCH');
    }
  }

  // 5. Exact registered capabilities. Unknown/admin-like values never imply another key.
  if (
    input.requirement.capabilities.some((capability) => !isRegisteredCapability(capability)) ||
    input.roleContext.capabilities.some((capability) => !isRegisteredCapability(capability))
  ) {
    return deny('AUTHORIZATION_DENIED', 'CAPABILITY', 'UNKNOWN_CAPABILITY');
  }
  if (
    input.requirement.capabilities.some(
      (capability) => !input.roleContext.capabilities.includes(capability),
    )
  ) {
    return deny('AUTHORIZATION_DENIED', 'CAPABILITY', 'CAPABILITY_MISSING');
  }

  // 6. Declared, registered, exact purpose.
  if (
    !isRegisteredPurpose(input.request.purpose) ||
    !isRegisteredPurpose(input.requirement.purpose)
  ) {
    return deny('AUTHORIZATION_DENIED', 'PURPOSE', 'UNKNOWN_PURPOSE');
  }
  if (input.request.purpose !== input.requirement.purpose) {
    return deny('AUTHORIZATION_DENIED', 'PURPOSE', 'PURPOSE_MISMATCH');
  }
  if (
    input.requirement.accessGrant !== undefined &&
    input.resource.accessGrant?.purpose !== input.request.purpose
  ) {
    return deny('AUTHORIZATION_DENIED', 'PURPOSE', 'PURPOSE_MISMATCH');
  }

  // 7. Consent and current monotonic access version.
  if (input.requirement.consent !== undefined) {
    const consentDecision = evaluateConsent(input.requirement.consent, now);
    if (consentDecision !== undefined) {
      return consentDecision;
    }
  }
  if (input.requirement.accessGrant !== undefined) {
    const grant = input.resource.accessGrant;
    if (grant === undefined) {
      return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'ACCESS_GRANT_REQUIRED');
    }
    if (grant.presentedAccessVersion !== grant.currentAccessVersion) {
      return deny(
        'CONSENT_OR_ACCESS_VERSION_CHANGED',
        'CONSENT_ACCESS_VERSION',
        'ACCESS_VERSION_CHANGED',
      );
    }
    if (
      input.requirement.consent !== undefined &&
      grant.currentAccessVersion !== input.requirement.consent.currentAccessVersion
    ) {
      return deny(
        'CONSENT_OR_ACCESS_VERSION_CHANGED',
        'CONSENT_ACCESS_VERSION',
        'ACCESS_VERSION_CHANGED',
      );
    }
    const grantExpiry = timestamp(grant.expiresAt);
    if (grantExpiry === undefined || grantExpiry <= now) {
      return deny('AUTHORIZATION_DENIED', 'CONSENT_ACCESS_VERSION', 'ACCESS_GRANT_EXPIRED');
    }
  }

  // 8. Current lifecycle and optimistic revision.
  if (
    input.requirement.allowedEntityStates.length === 0 ||
    !input.requirement.allowedEntityStates.includes(input.resource.lifecycleState)
  ) {
    return deny('AUTHORIZATION_DENIED', 'ENTITY_STATE_REVISION', 'ENTITY_STATE_INVALID');
  }
  if (
    input.requirement.expectedRevision !== undefined &&
    input.requirement.expectedRevision !== input.resource.currentRevision
  ) {
    return deny(
      'EXPECTED_REVISION_MISMATCH',
      'ENTITY_STATE_REVISION',
      'EXPECTED_REVISION_MISMATCH',
    );
  }

  // 9. Minimum field set and explicit classification allowlist.
  if (
    input.requirement.allowedClassifications.some(
      (classification) => !isRegisteredDataClassification(classification),
    ) ||
    input.resource.requestedClassifications.some(
      (classification) => !isRegisteredDataClassification(classification),
    )
  ) {
    return deny('AUTHORIZATION_DENIED', 'FIELD_CLASSIFICATION', 'FIELD_CLASSIFICATION_INVALID');
  }
  if (
    input.resource.requestedClassifications.some(
      (classification) => !input.requirement.allowedClassifications.includes(classification),
    )
  ) {
    return deny('AUTHORIZATION_DENIED', 'FIELD_CLASSIFICATION', 'FIELD_CLASSIFICATION_FORBIDDEN');
  }

  return {
    allowed: true,
    authorizationVersion: input.roleContext.currentAuthorizationVersion,
    capabilitySetVersion: input.roleContext.currentCapabilitySetVersion,
    ...(input.requirement.consent === undefined
      ? {}
      : { accessVersion: input.requirement.consent.currentAccessVersion }),
  };
}
