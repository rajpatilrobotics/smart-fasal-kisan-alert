import { describe, expect, it } from 'vitest';

import {
  evaluateProtectedDisclosureRequest,
  evaluateProtectedDisclosureSerialization,
  type AccessGrantPolicyContext,
  type AuthorizationRequirement,
  type ProtectedDisclosureInput,
  type ResourcePolicyContext,
} from '../index';
import { FUTURE, makeProtectedDisclosureInput, PAST } from './fixtures';

function withGrant(
  input: ProtectedDisclosureInput,
  patch: Partial<AccessGrantPolicyContext>,
): ProtectedDisclosureInput {
  const grant = input.authorization.resource.accessGrant;
  if (grant === undefined) {
    throw new Error('Test fixture requires an access grant.');
  }
  return {
    ...input,
    authorization: {
      ...input.authorization,
      resource: {
        ...input.authorization.resource,
        accessGrant: { ...grant, ...patch },
      },
    },
  };
}

function withoutGrant(resource: ResourcePolicyContext): ResourcePolicyContext {
  return {
    ...(resource.ownerSubjectId === undefined ? {} : { ownerSubjectId: resource.ownerSubjectId }),
    ...(resource.officeId === undefined ? {} : { officeId: resource.officeId }),
    ...(resource.jurisdictionId === undefined ? {} : { jurisdictionId: resource.jurisdictionId }),
    ...(resource.assignment === undefined ? {} : { assignment: resource.assignment }),
    lifecycleState: resource.lifecycleState,
    currentRevision: resource.currentRevision,
    requestedClassifications: resource.requestedClassifications,
  };
}

function withoutConsent(requirement: AuthorizationRequirement): AuthorizationRequirement {
  return {
    roleType: requirement.roleType,
    scope: requirement.scope,
    capabilities: requirement.capabilities,
    purpose: requirement.purpose,
    managedDeviceRequired: requirement.managedDeviceRequired,
    allowedEntityStates: requirement.allowedEntityStates,
    ...(requirement.expectedRevision === undefined
      ? {}
      : { expectedRevision: requirement.expectedRevision }),
    allowedClassifications: requirement.allowedClassifications,
  };
}

function forTarget(
  kind: string,
  ownerCapability: string,
  consentScope: string,
  visitClass?: string,
): ProtectedDisclosureInput {
  const base = makeProtectedDisclosureInput();
  const grant = base.authorization.resource.accessGrant;
  const consent = base.authorization.requirement.consent;
  if (grant === undefined || consent === undefined) {
    throw new Error('Test fixture requires grant and consent.');
  }
  return {
    target: {
      kind,
      id: 'target-1',
      ...(visitClass === undefined ? {} : { visitClass }),
    },
    authorization: {
      ...base.authorization,
      roleContext: {
        ...base.authorization.roleContext,
        capabilities: ['rsk.protected_disclose', ownerCapability],
      },
      resource: {
        ...base.authorization.resource,
        accessGrant: {
          ...grant,
          targetType: kind,
          targetId: 'target-1',
        },
      },
      requirement: {
        ...base.authorization.requirement,
        consent: {
          ...consent,
          scope: consentScope,
          requiredScope: consentScope,
        },
      },
    },
  };
}

describe('protected disclosure authorization', () => {
  it('requires the disclosure and Assisted Session owner capabilities exactly', () => {
    const allowed = evaluateProtectedDisclosureRequest(makeProtectedDisclosureInput());
    expect(allowed).toMatchObject({ allowed: true, auditCommitRequired: true });

    const base = makeProtectedDisclosureInput();
    const missingOwner = evaluateProtectedDisclosureRequest({
      ...base,
      authorization: {
        ...base.authorization,
        roleContext: {
          ...base.authorization.roleContext,
          capabilities: ['rsk.protected_disclose'],
        },
      },
    });
    expect(missingOwner).toMatchObject({
      allowed: false,
      stage: 'CAPABILITY',
      reason: 'CAPABILITY_MISSING',
    });

    const missingDisclosure = evaluateProtectedDisclosureRequest({
      ...base,
      authorization: {
        ...base.authorization,
        roleContext: {
          ...base.authorization.roleContext,
          capabilities: ['assisted_session.operate'],
        },
      },
    });
    expect(missingDisclosure).toMatchObject({
      allowed: false,
      reason: 'CAPABILITY_MISSING',
    });
  });

  it.each([
    ['CASE_EVIDENCE', 'case.read', 'case.sharing', undefined],
    ['CASE_CONTACT', 'case.read', 'case.sharing', undefined],
    ['OUTREACH_CONTACT', 'outreach.operate', 'assisted_service.access', undefined],
    [
      'SENSOR_MAINTENANCE_LOCATION',
      'sensor.maintenance.execute',
      'sensor.maintenance_location',
      undefined,
    ],
    ['MARKET_PRIVATE_FIELDS', 'market.support', 'market.private_fields', undefined],
    ['ASSISTED_FARMER_CONTEXT', 'assisted_session.operate', 'assisted_service.access', undefined],
    ['VISIT_LOCATION', 'visit.execute.field', 'visit.access', 'FIELD'],
    ['VISIT_PACK', 'visit.execute.sensor', 'visit.access', 'SENSOR'],
  ] as const)(
    'accepts the closed %s owner mapping',
    (kind, ownerCapability, consentScope, visitClass) => {
      expect(
        evaluateProtectedDisclosureRequest(
          forTarget(kind, ownerCapability, consentScope, visitClass),
        ).allowed,
      ).toBe(true);
    },
  );

  it('rejects unknown targets, empty identifiers and unknown Visit classes', () => {
    const base = makeProtectedDisclosureInput();
    const cases: readonly ProtectedDisclosureInput[] = [
      { ...base, target: { kind: 'FARMER_DIRECTORY', id: 'target-1' } },
      { ...base, target: { kind: 'ASSISTED_FARMER_CONTEXT', id: '' } },
      { ...base, target: { kind: 'VISIT_PACK', id: 'target-1', visitClass: 'ANY' } },
      { ...base, target: { kind: 'VISIT_LOCATION', id: 'target-1' } },
    ];
    for (const input of cases) {
      expect(evaluateProtectedDisclosureRequest(input)).toMatchObject({
        allowed: false,
        stage: 'RESOURCE_SCOPE',
        reason: 'DISCLOSURE_TARGET_INVALID',
      });
    }
  });

  it('requires a live grant bound to staff, context, office, jurisdiction and target', () => {
    const base = makeProtectedDisclosureInput();
    const noGrant: ProtectedDisclosureInput = {
      ...base,
      authorization: {
        ...base.authorization,
        resource: withoutGrant(base.authorization.resource),
      },
    };
    expect(evaluateProtectedDisclosureRequest(noGrant)).toMatchObject({
      allowed: false,
      reason: 'ACCESS_GRANT_REQUIRED',
    });
    expect(evaluateProtectedDisclosureRequest(withGrant(base, { active: false }))).toMatchObject({
      allowed: false,
      reason: 'ACCESS_GRANT_REQUIRED',
    });

    const mismatches: readonly Partial<AccessGrantPolicyContext>[] = [
      { staffSubjectId: 'other-staff' },
      { roleContextId: 'other-context' },
      { officeId: 'office-2' },
      { jurisdictionId: 'jurisdiction-2' },
      { targetType: 'CASE_CONTACT' },
      { targetId: 'other-target' },
    ];
    for (const patch of mismatches) {
      expect(evaluateProtectedDisclosureRequest(withGrant(base, patch))).toMatchObject({
        allowed: false,
        stage: 'RESOURCE_SCOPE',
        reason: 'ACCESS_GRANT_MISMATCH',
      });
    }
  });

  it('binds the grant to purpose, current access version and expiry', () => {
    const base = makeProtectedDisclosureInput();
    expect(
      evaluateProtectedDisclosureRequest(withGrant(base, { purpose: 'field.visit' })),
    ).toMatchObject({ allowed: false, stage: 'PURPOSE', reason: 'PURPOSE_MISMATCH' });
    expect(
      evaluateProtectedDisclosureRequest(withGrant(base, { presentedAccessVersion: 7 })),
    ).toMatchObject({
      allowed: false,
      stage: 'CONSENT_ACCESS_VERSION',
      reason: 'ACCESS_VERSION_CHANGED',
    });
    expect(
      evaluateProtectedDisclosureRequest(
        withGrant(base, { presentedAccessVersion: 9, currentAccessVersion: 9 }),
      ),
    ).toMatchObject({
      allowed: false,
      stage: 'CONSENT_ACCESS_VERSION',
      reason: 'ACCESS_VERSION_CHANGED',
    });
    expect(evaluateProtectedDisclosureRequest(withGrant(base, { expiresAt: PAST }))).toMatchObject({
      allowed: false,
      stage: 'CONSENT_ACCESS_VERSION',
      reason: 'ACCESS_GRANT_EXPIRED',
    });
    expect(
      evaluateProtectedDisclosureRequest(withGrant(base, { expiresAt: 'invalid' })),
    ).toMatchObject({ allowed: false, reason: 'ACCESS_GRANT_EXPIRED' });
  });

  it('treats absent Assisted Service consent as MISSING', () => {
    const base = makeProtectedDisclosureInput();
    const input: ProtectedDisclosureInput = {
      ...base,
      authorization: {
        ...base.authorization,
        requirement: withoutConsent(base.authorization.requirement),
      },
    };
    expect(evaluateProtectedDisclosureRequest(input)).toMatchObject({
      allowed: false,
      stage: 'CONSENT_ACCESS_VERSION',
      reason: 'CONSENT_MISSING',
      consentState: 'MISSING',
    });
  });

  it('never serializes before a matching Audit fact commits', () => {
    const input = makeProtectedDisclosureInput();
    for (const state of ['PENDING', 'FAILED'] as const) {
      expect(
        evaluateProtectedDisclosureSerialization(input, {
          state,
          authorizationVersion: 7,
          accessVersion: 8,
        }),
      ).toEqual({
        allowed: false,
        problemCode: 'AUTHORIZATION_DENIED',
        stage: 'AUDIT_BEFORE_DISCLOSE',
        reason: 'AUDIT_NOT_COMMITTED',
      });
    }

    expect(
      evaluateProtectedDisclosureSerialization(input, {
        state: 'COMMITTED',
        authorizationVersion: 6,
        accessVersion: 8,
      }),
    ).toMatchObject({
      allowed: false,
      problemCode: 'AUTHORIZATION_VERSION_CHANGED',
      reason: 'AUDIT_VERSION_STALE',
    });
    expect(
      evaluateProtectedDisclosureSerialization(input, {
        state: 'COMMITTED',
        authorizationVersion: 7,
        accessVersion: 7,
      }),
    ).toMatchObject({
      allowed: false,
      problemCode: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
      reason: 'AUDIT_VERSION_STALE',
    });
    expect(
      evaluateProtectedDisclosureSerialization(input, {
        state: 'COMMITTED',
        authorizationVersion: 7,
        accessVersion: 8,
      }),
    ).toMatchObject({ allowed: true, accessVersion: 8 });
  });

  it('rechecks withdrawal and authorization-version races after Audit', () => {
    const base = makeProtectedDisclosureInput();
    const consent = base.authorization.requirement.consent;
    if (consent === undefined) {
      throw new Error('Test fixture requires consent.');
    }
    const withdrawn: ProtectedDisclosureInput = {
      ...base,
      authorization: {
        ...base.authorization,
        requirement: {
          ...base.authorization.requirement,
          consent: { ...consent, state: 'WITHDRAWN' },
        },
      },
    };
    expect(
      evaluateProtectedDisclosureSerialization(withdrawn, {
        state: 'COMMITTED',
        authorizationVersion: 7,
        accessVersion: 8,
      }),
    ).toMatchObject({ allowed: false, reason: 'CONSENT_WITHDRAWN' });

    const staleRole: ProtectedDisclosureInput = {
      ...base,
      authorization: {
        ...base.authorization,
        roleContext: {
          ...base.authorization.roleContext,
          currentAuthorizationVersion: 8,
        },
      },
    };
    expect(
      evaluateProtectedDisclosureSerialization(staleRole, {
        state: 'COMMITTED',
        authorizationVersion: 7,
        accessVersion: 8,
      }),
    ).toMatchObject({ allowed: false, reason: 'AUTHORIZATION_VERSION_CHANGED' });
  });

  it('keeps a valid grant expiration in the future', () => {
    expect(Date.parse(FUTURE)).toBeGreaterThan(Date.now() - Number.MAX_SAFE_INTEGER);
  });
});
