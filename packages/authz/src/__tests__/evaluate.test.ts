import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CAPABILITY_REGISTRY,
  evaluateAuthorization,
  type AuthorizationDecision,
  type AuthorizationInput,
  type ConsentAccessContext,
  type RolePolicyContext,
} from '../index';
import {
  FUTURE,
  makeFarmerAuthorizationInput,
  makeRskAuthorizationInput,
  NOW,
  PAST,
} from './fixtures';

function expectDenied(
  decision: AuthorizationDecision,
  stage: Extract<AuthorizationDecision, { allowed: false }>['stage'],
  reason: Extract<AuthorizationDecision, { allowed: false }>['reason'],
): void {
  expect(decision).toMatchObject({ allowed: false, stage, reason });
}

function withConsent(
  input: AuthorizationInput,
  patch: Partial<ConsentAccessContext>,
): AuthorizationInput {
  const consent = input.requirement.consent;
  if (consent === undefined) {
    throw new Error('Test fixture requires consent.');
  }
  return {
    ...input,
    requirement: {
      ...input.requirement,
      consent: { ...consent, ...patch },
    },
  };
}

function withoutRoleOffice(context: RolePolicyContext): RolePolicyContext {
  return {
    id: context.id,
    active: context.active,
    subjectId: context.subjectId,
    environment: context.environment,
    roleType: context.roleType,
    expiresAt: context.expiresAt,
    authorizationVersion: context.authorizationVersion,
    currentAuthorizationVersion: context.currentAuthorizationVersion,
    capabilitySetVersion: context.capabilitySetVersion,
    currentCapabilitySetVersion: context.currentCapabilitySetVersion,
    capabilities: context.capabilities,
    ...(context.jurisdictionId === undefined ? {} : { jurisdictionId: context.jurisdictionId }),
  };
}

function withoutRoleJurisdiction(context: RolePolicyContext): RolePolicyContext {
  return {
    id: context.id,
    active: context.active,
    subjectId: context.subjectId,
    environment: context.environment,
    roleType: context.roleType,
    expiresAt: context.expiresAt,
    authorizationVersion: context.authorizationVersion,
    currentAuthorizationVersion: context.currentAuthorizationVersion,
    capabilitySetVersion: context.capabilitySetVersion,
    currentCapabilitySetVersion: context.currentCapabilitySetVersion,
    capabilities: context.capabilities,
    ...(context.officeId === undefined ? {} : { officeId: context.officeId }),
  };
}

function withoutConsentExpiry(input: AuthorizationInput): AuthorizationInput {
  const consent = input.requirement.consent;
  if (consent === undefined) {
    throw new Error('Test fixture requires consent.');
  }
  return {
    ...input,
    requirement: {
      ...input.requirement,
      consent: {
        scope: consent.scope,
        requiredScope: consent.requiredScope,
        state: consent.state,
        targetMatches: consent.targetMatches,
        presentedAccessVersion: consent.presentedAccessVersion,
        currentAccessVersion: consent.currentAccessVersion,
      },
    },
  };
}

describe('evaluateAuthorization', () => {
  it('allows an exact RSK assignment and returns the current versions', () => {
    expect(evaluateAuthorization(makeRskAuthorizationInput())).toEqual({
      allowed: true,
      authorizationVersion: 7,
      capabilitySetVersion: 3,
      accessVersion: 8,
    });
  });

  it('allows an owned Farmer resource without inventing staff authority', () => {
    expect(evaluateAuthorization(makeFarmerAuthorizationInput())).toEqual({
      allowed: true,
      authorizationVersion: 7,
      capabilitySetVersion: 3,
    });
  });

  it('evaluates identity and environment before every later failure', () => {
    const base = makeRskAuthorizationInput();
    const cases: readonly [AuthorizationInput, string][] = [
      [{ ...base, identity: { ...base.identity, authenticated: false } }, 'IDENTITY_REQUIRED'],
      [{ ...base, identity: { ...base.identity, active: false } }, 'IDENTITY_INACTIVE'],
      [{ ...base, identity: { ...base.identity, expiresAt: PAST } }, 'IDENTITY_EXPIRED'],
      [{ ...base, now: 'not-a-time' }, 'IDENTITY_EXPIRED'],
      [{ ...base, request: { ...base.request, environment: 'preview' } }, 'ENVIRONMENT_MISMATCH'],
      [
        { ...base, roleContext: { ...base.roleContext, environment: 'preview' } },
        'ENVIRONMENT_MISMATCH',
      ],
      [{ ...base, identity: { ...base.identity, securityVersion: 3 } }, 'SECURITY_VERSION_CHANGED'],
    ];

    for (const [input, reason] of cases) {
      const decision = evaluateAuthorization({
        ...input,
        requirement: { ...input.requirement, capabilities: ['not-an-admin-bypass'] },
      });
      expect(decision).toMatchObject({
        allowed: false,
        stage: 'IDENTITY_ENVIRONMENT',
        reason,
      });
    }
  });

  it('rejects stale or mismatched role contexts before request posture', () => {
    const base = makeRskAuthorizationInput();
    const cases: readonly [AuthorizationInput, string][] = [
      [{ ...base, roleContext: { ...base.roleContext, active: false } }, 'ROLE_CONTEXT_INACTIVE'],
      [{ ...base, roleContext: { ...base.roleContext, expiresAt: PAST } }, 'ROLE_CONTEXT_EXPIRED'],
      [
        { ...base, roleContext: { ...base.roleContext, subjectId: 'other-staff' } },
        'ROLE_CONTEXT_SUBJECT_MISMATCH',
      ],
      [{ ...base, identity: { ...base.identity, subjectType: 'FARMER' } }, 'ROLE_TYPE_MISMATCH'],
      [{ ...base, requirement: { ...base.requirement, roleType: 'MP' } }, 'ROLE_TYPE_MISMATCH'],
      [
        {
          ...base,
          roleContext: { ...base.roleContext, authorizationVersion: 6 },
        },
        'AUTHORIZATION_VERSION_CHANGED',
      ],
      [
        { ...base, request: { ...base.request, authorizationVersion: 6 } },
        'AUTHORIZATION_VERSION_CHANGED',
      ],
      [
        {
          ...base,
          roleContext: { ...base.roleContext, capabilitySetVersion: 2 },
        },
        'CAPABILITY_SET_VERSION_CHANGED',
      ],
    ];

    for (const [input, reason] of cases) {
      expect(evaluateAuthorization(input)).toMatchObject({
        allowed: false,
        stage: 'ROLE_CONTEXT_VERSION',
        reason,
      });
    }
  });

  it('rejects surface, App Check and device mismatches', () => {
    const base = makeRskAuthorizationInput();
    const cases: readonly [AuthorizationInput, string][] = [
      [{ ...base, request: { ...base.request, surface: 'MP' } }, 'SURFACE_MISMATCH'],
      [
        {
          ...base,
          request: {
            ...base.request,
            appCheck: { ...base.request.appCheck, valid: false },
          },
        },
        'APP_CHECK_REQUIRED',
      ],
      [
        {
          ...base,
          request: {
            ...base.request,
            appCheck: { ...base.request.appCheck, appId: 'other-app' },
          },
        },
        'APP_ID_NOT_ALLOWED',
      ],
      [
        {
          ...base,
          request: {
            ...base.request,
            device: { ...base.request.device, active: false },
          },
        },
        'DEVICE_BINDING_REQUIRED',
      ],
      [
        {
          ...base,
          request: {
            ...base.request,
            device: { ...base.request.device, boundSubjectId: 'other-staff' },
          },
        },
        'DEVICE_BINDING_MISMATCH',
      ],
      [
        {
          ...base,
          request: {
            ...base.request,
            device: { ...base.request.device, allowedSurfaces: ['FARMER'] },
          },
        },
        'DEVICE_BINDING_MISMATCH',
      ],
      [
        {
          ...base,
          request: {
            ...base.request,
            device: { ...base.request.device, managed: false },
          },
        },
        'MANAGED_DEVICE_REQUIRED',
      ],
    ];

    for (const [input, reason] of cases) {
      expect(evaluateAuthorization(input)).toMatchObject({
        allowed: false,
        stage: 'SURFACE_DEVICE_APP_CHECK',
        reason,
      });
    }
  });

  it('allows an operation whose route does not require a device binding', () => {
    const base = makeFarmerAuthorizationInput();
    const input: AuthorizationInput = {
      ...base,
      request: {
        ...base.request,
        device: {
          required: false,
          active: false,
          managed: false,
          allowedSurfaces: [],
        },
      },
    };
    expect(evaluateAuthorization(input).allowed).toBe(true);
  });

  it('enforces Farmer ownership for every opaque identifier', () => {
    const base = makeFarmerAuthorizationInput();
    const decision = evaluateAuthorization({
      ...base,
      resource: { ...base.resource, ownerSubjectId: 'farmer-2' },
    });
    expectDenied(decision, 'RESOURCE_SCOPE', 'OWNER_MISMATCH');
  });

  it('enforces RSK office, jurisdiction and assignment independently', () => {
    const base = makeRskAuthorizationInput();
    const assignment = base.resource.assignment;
    if (assignment === undefined) {
      throw new Error('Test fixture requires an assignment.');
    }
    const cases: readonly [AuthorizationInput, string][] = [
      [{ ...base, resource: { ...base.resource, officeId: 'office-2' } }, 'OFFICE_MISMATCH'],
      [{ ...base, roleContext: withoutRoleOffice(base.roleContext) }, 'OFFICE_MISMATCH'],
      [
        { ...base, resource: { ...base.resource, jurisdictionId: 'jurisdiction-2' } },
        'JURISDICTION_MISMATCH',
      ],
      [
        { ...base, roleContext: withoutRoleJurisdiction(base.roleContext) },
        'JURISDICTION_MISMATCH',
      ],
      [
        {
          ...base,
          resource: {
            ...base.resource,
            assignment: { ...assignment, active: false },
          },
        },
        'ASSIGNMENT_REQUIRED',
      ],
      [
        {
          ...base,
          resource: {
            ...base.resource,
            assignment: { ...assignment, staffSubjectId: 'other-staff' },
          },
        },
        'ASSIGNMENT_MISMATCH',
      ],
      [
        {
          ...base,
          resource: {
            ...base.resource,
            assignment: { ...assignment, roleContextId: 'other-context' },
          },
        },
        'ASSIGNMENT_MISMATCH',
      ],
      [
        {
          ...base,
          resource: {
            ...base.resource,
            assignment: { ...assignment, officeId: 'office-2' },
          },
        },
        'ASSIGNMENT_MISMATCH',
      ],
      [
        {
          ...base,
          resource: {
            ...base.resource,
            assignment: { ...assignment, jurisdictionId: 'jurisdiction-2' },
          },
        },
        'ASSIGNMENT_MISMATCH',
      ],
    ];

    for (const [input, reason] of cases) {
      expect(evaluateAuthorization(input)).toMatchObject({
        allowed: false,
        stage: 'RESOURCE_SCOPE',
        reason,
      });
    }
  });

  it('rejects operational identifiers on an MP release-only policy', () => {
    const base = makeFarmerAuthorizationInput();
    const input: AuthorizationInput = {
      ...base,
      identity: {
        ...base.identity,
        subjectType: 'STAFF',
      },
      roleContext: {
        id: 'mp-context',
        active: true,
        subjectId: base.identity.subjectId,
        environment: 'local',
        roleType: 'MP',
        expiresAt: FUTURE,
        authorizationVersion: 7,
        currentAuthorizationVersion: 7,
        capabilitySetVersion: 3,
        currentCapabilitySetVersion: 3,
        capabilities: [],
      },
      request: {
        ...base.request,
        surface: 'MP',
        purpose: 'data.rights',
        device: { ...base.request.device, allowedSurfaces: ['MP'], managed: true },
      },
      requirement: {
        ...base.requirement,
        roleType: 'MP',
        scope: 'MP_RELEASE',
        purpose: 'data.rights',
      },
    };
    expectDenied(evaluateAuthorization(input), 'RESOURCE_SCOPE', 'OPERATIONAL_SCOPE_FORBIDDEN');
  });

  it('uses only exact registered capability keys', () => {
    const base = makeRskAuthorizationInput();
    const unknownRequired = evaluateAuthorization({
      ...base,
      requirement: { ...base.requirement, capabilities: ['admin'] },
    });
    expectDenied(unknownRequired, 'CAPABILITY', 'UNKNOWN_CAPABILITY');

    const unknownGranted = evaluateAuthorization({
      ...base,
      roleContext: { ...base.roleContext, capabilities: ['rsk.work.read', 'admin'] },
    });
    expectDenied(unknownGranted, 'CAPABILITY', 'UNKNOWN_CAPABILITY');

    const missing = evaluateAuthorization({
      ...base,
      roleContext: { ...base.roleContext, capabilities: ['rsk.protected_search'] },
    });
    expectDenied(missing, 'CAPABILITY', 'CAPABILITY_MISSING');
  });

  it('rejects unknown and purpose-laundered requests', () => {
    const base = makeRskAuthorizationInput();
    expectDenied(
      evaluateAuthorization({
        ...base,
        request: { ...base.request, purpose: 'anything-goes' },
      }),
      'PURPOSE',
      'UNKNOWN_PURPOSE',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        requirement: { ...base.requirement, purpose: 'anything-goes' },
      }),
      'PURPOSE',
      'UNKNOWN_PURPOSE',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        request: { ...base.request, purpose: 'field.visit' },
      }),
      'PURPOSE',
      'PURPOSE_MISMATCH',
    );
  });

  it.each([
    ['MISSING', 'CONSENT_MISSING'],
    ['DENIED', 'CONSENT_DENIED'],
    ['WITHDRAWN', 'CONSENT_WITHDRAWN'],
    ['EXPIRED', 'CONSENT_EXPIRED'],
  ] as const)('preserves the distinct %s consent outcome', (state, reason) => {
    const decision = evaluateAuthorization(withConsent(makeRskAuthorizationInput(), { state }));
    expect(decision).toMatchObject({
      allowed: false,
      stage: 'CONSENT_ACCESS_VERSION',
      reason,
      consentState: state,
    });
  });

  it('fails closed for consent scope, target, version, state and expiry errors', () => {
    const base = makeRskAuthorizationInput();
    const cases: readonly [AuthorizationInput, string][] = [
      [withConsent(base, { scope: 'unknown.scope' }), 'UNKNOWN_CONSENT_SCOPE'],
      [withConsent(base, { requiredScope: 'unknown.scope' }), 'UNKNOWN_CONSENT_SCOPE'],
      [withConsent(base, { requiredScope: 'case.sharing' }), 'CONSENT_TARGET_MISMATCH'],
      [withConsent(base, { targetMatches: false }), 'CONSENT_TARGET_MISMATCH'],
      [withConsent(base, { presentedAccessVersion: 7 }), 'ACCESS_VERSION_CHANGED'],
      [withConsent(base, { state: 'UNKNOWN' }), 'CONSENT_STATE_INVALID'],
      [withConsent(base, { expiresAt: PAST }), 'CONSENT_EXPIRED'],
      [withConsent(base, { expiresAt: 'invalid' }), 'CONSENT_EXPIRED'],
      [withoutConsentExpiry(base), 'CONSENT_EXPIRED'],
    ];
    for (const [input, reason] of cases) {
      expect(evaluateAuthorization(input)).toMatchObject({
        allowed: false,
        stage: 'CONSENT_ACCESS_VERSION',
        reason,
      });
    }
  });

  it('checks entity state and revision after consent', () => {
    const base = makeRskAuthorizationInput();
    expectDenied(
      evaluateAuthorization({
        ...base,
        resource: { ...base.resource, lifecycleState: 'REVOKED' },
      }),
      'ENTITY_STATE_REVISION',
      'ENTITY_STATE_INVALID',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        requirement: { ...base.requirement, allowedEntityStates: [] },
      }),
      'ENTITY_STATE_REVISION',
      'ENTITY_STATE_INVALID',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        requirement: { ...base.requirement, expectedRevision: 4 },
      }),
      'ENTITY_STATE_REVISION',
      'EXPECTED_REVISION_MISMATCH',
    );
  });

  it('allows only explicitly classified response fields', () => {
    const base = makeRskAuthorizationInput();
    expectDenied(
      evaluateAuthorization({
        ...base,
        requirement: { ...base.requirement, allowedClassifications: ['SECRET'] },
      }),
      'FIELD_CLASSIFICATION',
      'FIELD_CLASSIFICATION_INVALID',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        resource: { ...base.resource, requestedClassifications: ['SECRET'] },
      }),
      'FIELD_CLASSIFICATION',
      'FIELD_CLASSIFICATION_INVALID',
    );
    expectDenied(
      evaluateAuthorization({
        ...base,
        resource: { ...base.resource, requestedClassifications: ['C3'] },
      }),
      'FIELD_CLASSIFICATION',
      'FIELD_CLASSIFICATION_FORBIDDEN',
    );
  });

  it('denies every generated cross-Farmer access attempt', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((subjectId) => subjectId !== 'farmer-1'),
        (subjectId) => {
          const base = makeFarmerAuthorizationInput();
          const decision = evaluateAuthorization({
            ...base,
            resource: { ...base.resource, ownerSubjectId: subjectId },
          });
          return !decision.allowed && decision.reason === 'OWNER_MISMATCH';
        },
      ),
    );
  });

  it('denies arbitrary non-registry capabilities instead of treating them as admin', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 40 })
          .filter((capability) => !CAPABILITY_REGISTRY.has(capability)),
        (capability) => {
          const base = makeRskAuthorizationInput();
          const decision = evaluateAuthorization({
            ...base,
            requirement: { ...base.requirement, capabilities: [capability] },
          });
          return !decision.allowed && decision.reason === 'UNKNOWN_CAPABILITY';
        },
      ),
    );
  });

  it('treats consent withdrawal as earlier than stale entity fields', () => {
    const withdrawn = withConsent(makeRskAuthorizationInput(), { state: 'WITHDRAWN' });
    const decision = evaluateAuthorization({
      ...withdrawn,
      resource: {
        ...withdrawn.resource,
        lifecycleState: 'INVALID',
        requestedClassifications: ['C4'],
      },
    });
    expectDenied(decision, 'CONSENT_ACCESS_VERSION', 'CONSENT_WITHDRAWN');
  });

  it('keeps the future timestamp fixture meaningful', () => {
    expect(Date.parse(FUTURE)).toBeGreaterThan(Date.parse(NOW));
  });
});
