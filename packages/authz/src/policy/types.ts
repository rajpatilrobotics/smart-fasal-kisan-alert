import type { ApplicationSurface, MfaAssurance, RuntimeEnvironment } from '../identity/index.js';
import type { SecurityProblemCode } from '../problems.js';

export type RoleType = 'FARMER' | 'RSK' | 'MP';
export type ConsentAccessState = 'MISSING' | 'ALLOWED' | 'DENIED' | 'EXPIRED' | 'WITHDRAWN';

export type AuthorizationStage =
  | 'IDENTITY_ENVIRONMENT'
  | 'ROLE_CONTEXT_VERSION'
  | 'SURFACE_DEVICE_APP_CHECK'
  | 'RESOURCE_SCOPE'
  | 'CAPABILITY'
  | 'PURPOSE'
  | 'CONSENT_ACCESS_VERSION'
  | 'ENTITY_STATE_REVISION'
  | 'FIELD_CLASSIFICATION'
  | 'AUDIT_BEFORE_DISCLOSE';

export type AuthorizationReason =
  | 'IDENTITY_REQUIRED'
  | 'IDENTITY_INACTIVE'
  | 'IDENTITY_EXPIRED'
  | 'ENVIRONMENT_MISMATCH'
  | 'SECURITY_VERSION_CHANGED'
  | 'ROLE_CONTEXT_INACTIVE'
  | 'ROLE_CONTEXT_EXPIRED'
  | 'ROLE_CONTEXT_SUBJECT_MISMATCH'
  | 'ROLE_TYPE_MISMATCH'
  | 'AUTHORIZATION_VERSION_CHANGED'
  | 'CAPABILITY_SET_VERSION_CHANGED'
  | 'MFA_REQUIRED'
  | 'SURFACE_MISMATCH'
  | 'APP_CHECK_REQUIRED'
  | 'APP_ID_NOT_ALLOWED'
  | 'DEVICE_BINDING_REQUIRED'
  | 'DEVICE_BINDING_MISMATCH'
  | 'MANAGED_DEVICE_REQUIRED'
  | 'OWNER_MISMATCH'
  | 'OFFICE_MISMATCH'
  | 'JURISDICTION_MISMATCH'
  | 'ASSIGNMENT_REQUIRED'
  | 'ASSIGNMENT_MISMATCH'
  | 'OPERATIONAL_SCOPE_FORBIDDEN'
  | 'UNKNOWN_CAPABILITY'
  | 'CAPABILITY_MISSING'
  | 'UNKNOWN_PURPOSE'
  | 'PURPOSE_MISMATCH'
  | 'UNKNOWN_CONSENT_SCOPE'
  | 'CONSENT_TARGET_MISMATCH'
  | 'ACCESS_VERSION_CHANGED'
  | 'CONSENT_MISSING'
  | 'CONSENT_EXPIRED'
  | 'CONSENT_DENIED'
  | 'CONSENT_WITHDRAWN'
  | 'CONSENT_STATE_INVALID'
  | 'ENTITY_STATE_INVALID'
  | 'EXPECTED_REVISION_MISMATCH'
  | 'FIELD_CLASSIFICATION_INVALID'
  | 'FIELD_CLASSIFICATION_FORBIDDEN'
  | 'DISCLOSURE_TARGET_INVALID'
  | 'ACCESS_GRANT_REQUIRED'
  | 'ACCESS_GRANT_MISMATCH'
  | 'ACCESS_GRANT_EXPIRED'
  | 'AUDIT_NOT_COMMITTED'
  | 'AUDIT_VERSION_STALE';

export interface IdentityPolicyContext {
  readonly authenticated: boolean;
  readonly active: boolean;
  readonly subjectId: string;
  readonly subjectType: 'FARMER' | 'STAFF';
  readonly environment: RuntimeEnvironment;
  readonly securityVersion: number;
  readonly currentSecurityVersion: number;
  readonly expiresAt: string;
  readonly mfa?: MfaAssurance;
}

export interface RolePolicyContext {
  readonly id: string;
  readonly active: boolean;
  readonly subjectId: string;
  readonly environment: RuntimeEnvironment;
  readonly roleType: RoleType;
  readonly expiresAt: string;
  readonly authorizationVersion: number;
  readonly currentAuthorizationVersion: number;
  readonly capabilitySetVersion: number;
  readonly currentCapabilitySetVersion: number;
  readonly capabilities: readonly string[];
  readonly officeId?: string;
  readonly jurisdictionId?: string;
}

export interface AppCheckPosture {
  readonly valid: boolean;
  readonly appId: string;
  readonly allowedAppIds: readonly string[];
}

export interface DevicePosture {
  readonly required: boolean;
  readonly active: boolean;
  readonly boundSubjectId?: string;
  readonly managed: boolean;
  readonly allowedSurfaces: readonly ApplicationSurface[];
}

export interface AuthorizationRequestContext {
  readonly environment: RuntimeEnvironment;
  readonly surface: ApplicationSurface;
  readonly purpose: string;
  readonly authorizationVersion: number;
  readonly appCheck: AppCheckPosture;
  readonly device: DevicePosture;
}

export interface AssignmentScope {
  readonly required: boolean;
  readonly active: boolean;
  readonly staffSubjectId?: string;
  readonly roleContextId?: string;
  readonly officeId?: string;
  readonly jurisdictionId?: string;
}

export interface AccessGrantPolicyContext {
  readonly active: boolean;
  readonly staffSubjectId: string;
  readonly roleContextId: string;
  readonly officeId: string;
  readonly jurisdictionId: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly purpose: string;
  readonly presentedAccessVersion: number;
  readonly currentAccessVersion: number;
  readonly expiresAt: string;
}

export interface ResourcePolicyContext {
  readonly ownerSubjectId?: string;
  readonly officeId?: string;
  readonly jurisdictionId?: string;
  readonly assignment?: AssignmentScope;
  readonly accessGrant?: AccessGrantPolicyContext;
  readonly lifecycleState: string;
  readonly currentRevision: number;
  readonly requestedClassifications: readonly string[];
}

export interface ConsentAccessContext {
  readonly scope: string;
  readonly requiredScope: string;
  readonly state: string;
  readonly targetMatches: boolean;
  readonly presentedAccessVersion: number;
  readonly currentAccessVersion: number;
  readonly expiresAt?: string;
}

export interface AuthorizationRequirement {
  readonly roleType: RoleType;
  readonly scope: 'OWNER' | 'RSK_SCOPE' | 'MP_RELEASE';
  readonly capabilities: readonly string[];
  readonly purpose: string;
  readonly managedDeviceRequired: boolean;
  readonly resourceKindRegistered?: boolean;
  readonly accessGrant?: {
    readonly targetType: string;
    readonly targetId: string;
  };
  readonly consent?: ConsentAccessContext;
  readonly allowedEntityStates: readonly string[];
  readonly expectedRevision?: number;
  readonly allowedClassifications: readonly string[];
}

export interface AuthorizationInput {
  readonly now: string;
  readonly identity: IdentityPolicyContext;
  readonly roleContext: RolePolicyContext;
  readonly request: AuthorizationRequestContext;
  readonly resource: ResourcePolicyContext;
  readonly requirement: AuthorizationRequirement;
}

export type AuthorizationDecision =
  | {
      readonly allowed: true;
      readonly authorizationVersion: number;
      readonly capabilitySetVersion: number;
      readonly accessVersion?: number;
    }
  | {
      readonly allowed: false;
      readonly problemCode: SecurityProblemCode;
      readonly stage: AuthorizationStage;
      readonly reason: AuthorizationReason;
      readonly consentState?: Exclude<ConsentAccessState, 'ALLOWED'>;
    };
