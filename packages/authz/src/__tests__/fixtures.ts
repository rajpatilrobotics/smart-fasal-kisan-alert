import type {
  AuthorizationInput,
  ProtectedDisclosureInput,
  RoleContextCreationInput,
} from '../index';

export const NOW = '2026-07-13T10:00:00.000Z';
export const FUTURE = '2026-07-13T11:00:00.000Z';
export const PAST = '2026-07-13T09:00:00.000Z';

export function makeRskAuthorizationInput(): AuthorizationInput {
  return {
    now: NOW,
    identity: {
      authenticated: true,
      active: true,
      subjectId: 'staff-1',
      subjectType: 'STAFF',
      environment: 'local',
      securityVersion: 4,
      currentSecurityVersion: 4,
      expiresAt: FUTURE,
      mfa: { secondFactor: true, assuredAt: NOW },
    },
    roleContext: {
      id: 'role-context-1',
      active: true,
      subjectId: 'staff-1',
      environment: 'local',
      roleType: 'RSK',
      expiresAt: FUTURE,
      authorizationVersion: 7,
      currentAuthorizationVersion: 7,
      capabilitySetVersion: 3,
      currentCapabilitySetVersion: 3,
      capabilities: ['rsk.work.read'],
      officeId: 'office-1',
      jurisdictionId: 'jurisdiction-1',
    },
    request: {
      environment: 'local',
      surface: 'RSK',
      purpose: 'assisted.service',
      authorizationVersion: 7,
      appCheck: {
        valid: true,
        appId: 'rsk-local-app',
        allowedAppIds: ['rsk-local-app'],
      },
      device: {
        required: true,
        active: true,
        boundSubjectId: 'staff-1',
        managed: true,
        allowedSurfaces: ['RSK'],
      },
    },
    resource: {
      officeId: 'office-1',
      jurisdictionId: 'jurisdiction-1',
      assignment: {
        required: true,
        active: true,
        staffSubjectId: 'staff-1',
        roleContextId: 'role-context-1',
        officeId: 'office-1',
        jurisdictionId: 'jurisdiction-1',
      },
      lifecycleState: 'ACTIVE',
      currentRevision: 5,
      requestedClassifications: ['C2'],
    },
    requirement: {
      roleType: 'RSK',
      scope: 'RSK_SCOPE',
      capabilities: ['rsk.work.read'],
      purpose: 'assisted.service',
      managedDeviceRequired: true,
      consent: {
        scope: 'assisted_service.access',
        requiredScope: 'assisted_service.access',
        state: 'ALLOWED',
        targetMatches: true,
        presentedAccessVersion: 8,
        currentAccessVersion: 8,
        expiresAt: FUTURE,
      },
      allowedEntityStates: ['ACTIVE'],
      expectedRevision: 5,
      allowedClassifications: ['C2'],
    },
  };
}

export function makeFarmerAuthorizationInput(): AuthorizationInput {
  const base = makeRskAuthorizationInput();
  return {
    ...base,
    identity: {
      authenticated: true,
      active: true,
      subjectId: 'farmer-1',
      subjectType: 'FARMER',
      environment: 'local',
      securityVersion: 4,
      currentSecurityVersion: 4,
      expiresAt: FUTURE,
    },
    roleContext: {
      id: 'role-context-1',
      active: true,
      subjectId: 'farmer-1',
      environment: 'local',
      roleType: 'FARMER',
      expiresAt: FUTURE,
      authorizationVersion: 7,
      currentAuthorizationVersion: 7,
      capabilitySetVersion: 3,
      currentCapabilitySetVersion: 3,
      capabilities: [],
    },
    request: {
      ...base.request,
      surface: 'FARMER',
      purpose: 'farmer.self_service',
      device: {
        ...base.request.device,
        boundSubjectId: 'farmer-1',
        managed: false,
        allowedSurfaces: ['FARMER'],
      },
    },
    resource: {
      ownerSubjectId: 'farmer-1',
      lifecycleState: 'ACTIVE',
      currentRevision: 2,
      requestedClassifications: ['C2'],
    },
    requirement: {
      roleType: 'FARMER',
      scope: 'OWNER',
      capabilities: [],
      purpose: 'farmer.self_service',
      managedDeviceRequired: false,
      allowedEntityStates: ['ACTIVE'],
      expectedRevision: 2,
      allowedClassifications: ['C2'],
    },
  };
}

export function makeRoleContextCreationInput(
  roleType: 'FARMER' | 'RSK' | 'MP' = 'RSK',
): RoleContextCreationInput {
  return {
    now: NOW,
    identity: {
      authenticated: true,
      active: true,
      subjectId: 'staff-1',
      subjectType: roleType === 'FARMER' ? 'FARMER' : 'STAFF',
      environment: 'local',
      securityVersion: 2,
      currentSecurityVersion: 2,
      expiresAt: FUTURE,
      mfa: { secondFactor: true, assuredAt: NOW },
    },
    requestedEnvironment: 'local',
    requestedSurface: roleType,
    requestedRoleType: roleType,
    grant: {
      active: true,
      subjectId: 'staff-1',
      environment: 'local',
      roleType,
      expiresAt: FUTURE,
      authorizationVersion: 2,
      capabilitySetVersion: 6,
      capabilities: ['identity.role_context.select'],
      ...(roleType === 'RSK' ? { officeId: 'office-1', jurisdictionId: 'jurisdiction-1' } : {}),
    },
    appCheck: {
      valid: true,
      appId: `${roleType.toLowerCase()}-local-app`,
      allowedAppIds: [`${roleType.toLowerCase()}-local-app`],
    },
    device: {
      required: true,
      active: true,
      boundSubjectId: 'staff-1',
      managed: roleType !== 'FARMER',
      allowedSurfaces: [roleType],
    },
    maximumMfaAgeSeconds: 900,
  };
}

export function makeProtectedDisclosureInput(): ProtectedDisclosureInput {
  const base = makeRskAuthorizationInput();
  return {
    target: { kind: 'ASSISTED_FARMER_CONTEXT', id: 'assisted-session-1' },
    authorization: {
      ...base,
      roleContext: {
        ...base.roleContext,
        capabilities: ['rsk.protected_disclose', 'assisted_session.operate'],
      },
      resource: {
        ...base.resource,
        assignment: { required: false, active: false },
        accessGrant: {
          active: true,
          staffSubjectId: 'staff-1',
          roleContextId: 'role-context-1',
          officeId: 'office-1',
          jurisdictionId: 'jurisdiction-1',
          targetType: 'ASSISTED_FARMER_CONTEXT',
          targetId: 'assisted-session-1',
          purpose: 'assisted.service',
          presentedAccessVersion: 8,
          currentAccessVersion: 8,
          expiresAt: FUTURE,
        },
        requestedClassifications: ['C3'],
      },
      requirement: {
        ...base.requirement,
        capabilities: [],
        allowedClassifications: ['C3'],
      },
    },
  };
}
