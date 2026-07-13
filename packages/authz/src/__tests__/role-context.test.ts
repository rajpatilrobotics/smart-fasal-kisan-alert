import { describe, expect, it } from 'vitest';

import {
  evaluateRoleContextCreation,
  type IdentityPolicyContext,
  type RoleContextCreationInput,
  type RoleGrantContext,
} from '../index';
import { FUTURE, makeRoleContextCreationInput, NOW, PAST } from './fixtures';

function withoutMfa(identity: IdentityPolicyContext): IdentityPolicyContext {
  return {
    authenticated: identity.authenticated,
    active: identity.active,
    subjectId: identity.subjectId,
    subjectType: identity.subjectType,
    environment: identity.environment,
    securityVersion: identity.securityVersion,
    currentSecurityVersion: identity.currentSecurityVersion,
    expiresAt: identity.expiresAt,
  };
}

function withoutRskScope(grant: RoleGrantContext): RoleGrantContext {
  return {
    active: grant.active,
    subjectId: grant.subjectId,
    environment: grant.environment,
    roleType: grant.roleType,
    expiresAt: grant.expiresAt,
    authorizationVersion: grant.authorizationVersion,
    capabilitySetVersion: grant.capabilitySetVersion,
    capabilities: grant.capabilities,
  };
}

function expectReason(input: RoleContextCreationInput, reason: string): void {
  expect(evaluateRoleContextCreation(input)).toMatchObject({ allowed: false, reason });
}

describe('evaluateRoleContextCreation', () => {
  it('allows current Farmer, RSK and MP server grants', () => {
    const farmer = makeRoleContextCreationInput('FARMER');
    expect(
      evaluateRoleContextCreation({ ...farmer, identity: withoutMfa(farmer.identity) }),
    ).toMatchObject({ allowed: true, authorizationVersion: 2, capabilitySetVersion: 6 });
    expect(evaluateRoleContextCreation(makeRoleContextCreationInput('RSK'))).toMatchObject({
      allowed: true,
    });
    expect(evaluateRoleContextCreation(makeRoleContextCreationInput('MP'))).toMatchObject({
      allowed: true,
    });
  });

  it('rejects invalid identity state before inspecting a grant', () => {
    const base = makeRoleContextCreationInput();
    const cases: readonly [RoleContextCreationInput, string][] = [
      [{ ...base, identity: { ...base.identity, authenticated: false } }, 'IDENTITY_REQUIRED'],
      [{ ...base, identity: { ...base.identity, active: false } }, 'IDENTITY_INACTIVE'],
      [{ ...base, identity: { ...base.identity, expiresAt: PAST } }, 'IDENTITY_EXPIRED'],
      [{ ...base, now: 'invalid' }, 'IDENTITY_EXPIRED'],
      [{ ...base, requestedEnvironment: 'preview' }, 'ENVIRONMENT_MISMATCH'],
      [{ ...base, grant: { ...base.grant, environment: 'preview' } }, 'ENVIRONMENT_MISMATCH'],
      [{ ...base, identity: { ...base.identity, securityVersion: 1 } }, 'SECURITY_VERSION_CHANGED'],
    ];
    for (const [input, reason] of cases) {
      expectReason({ ...input, grant: { ...input.grant, capabilities: ['admin'] } }, reason);
    }
  });

  it('requires an active matching server grant', () => {
    const base = makeRoleContextCreationInput();
    expectReason({ ...base, grant: { ...base.grant, active: false } }, 'ROLE_CONTEXT_INACTIVE');
    expectReason({ ...base, grant: { ...base.grant, expiresAt: PAST } }, 'ROLE_CONTEXT_EXPIRED');
    expectReason(
      { ...base, grant: { ...base.grant, subjectId: 'other-staff' } },
      'ROLE_CONTEXT_SUBJECT_MISMATCH',
    );
    expectReason({ ...base, requestedRoleType: 'MP' }, 'ROLE_TYPE_MISMATCH');
    expectReason({ ...base, grant: withoutRskScope(base.grant) }, 'ROLE_TYPE_MISMATCH');
  });

  it('uses authoritative subject type to prevent cross-surface role selection', () => {
    const rsk = makeRoleContextCreationInput('RSK');
    expectReason(
      { ...rsk, identity: { ...rsk.identity, subjectType: 'FARMER' } },
      'ROLE_TYPE_MISMATCH',
    );

    const farmer = makeRoleContextCreationInput('FARMER');
    expectReason(
      { ...farmer, identity: { ...farmer.identity, subjectType: 'STAFF' } },
      'ROLE_TYPE_MISMATCH',
    );
  });

  it('requires fresh second-factor assurance for staff but not Farmers', () => {
    const base = makeRoleContextCreationInput();
    expect(evaluateRoleContextCreation({ ...base, identity: withoutMfa(base.identity) })).toEqual({
      allowed: false,
      problemCode: 'MFA_REQUIRED',
      stage: 'ROLE_CONTEXT_VERSION',
      reason: 'MFA_REQUIRED',
    });
    expectReason(
      {
        ...base,
        identity: {
          ...base.identity,
          mfa: { secondFactor: true, assuredAt: PAST },
        },
        maximumMfaAgeSeconds: 60,
      },
      'MFA_REQUIRED',
    );
    expectReason(
      {
        ...base,
        identity: {
          ...base.identity,
          mfa: { secondFactor: true, assuredAt: FUTURE },
        },
      },
      'MFA_REQUIRED',
    );
    expectReason({ ...base, maximumMfaAgeSeconds: 0 }, 'MFA_REQUIRED');
  });

  it('requires the matching surface, App Check and staff device posture', () => {
    const base = makeRoleContextCreationInput();
    const cases: readonly [RoleContextCreationInput, string][] = [
      [{ ...base, requestedSurface: 'MP' }, 'SURFACE_MISMATCH'],
      [{ ...base, appCheck: { ...base.appCheck, valid: false } }, 'APP_CHECK_REQUIRED'],
      [{ ...base, appCheck: { ...base.appCheck, appId: 'other-app' } }, 'APP_ID_NOT_ALLOWED'],
      [{ ...base, device: { ...base.device, active: false } }, 'DEVICE_BINDING_REQUIRED'],
      [
        { ...base, device: { ...base.device, boundSubjectId: 'other-staff' } },
        'DEVICE_BINDING_MISMATCH',
      ],
      [{ ...base, device: { ...base.device, allowedSurfaces: ['MP'] } }, 'DEVICE_BINDING_MISMATCH'],
      [{ ...base, device: { ...base.device, managed: false } }, 'MANAGED_DEVICE_REQUIRED'],
    ];
    for (const [input, reason] of cases) {
      expectReason(input, reason);
    }
  });

  it('can evaluate an explicitly device-independent Farmer context route', () => {
    const base = makeRoleContextCreationInput('FARMER');
    const input: RoleContextCreationInput = {
      ...base,
      identity: withoutMfa(base.identity),
      device: {
        required: false,
        active: false,
        managed: false,
        allowedSurfaces: [],
      },
    };
    expect(evaluateRoleContextCreation(input).allowed).toBe(true);
  });

  it('does not infer role selection from admin-like or unrelated capabilities', () => {
    const base = makeRoleContextCreationInput();
    expectReason(
      { ...base, grant: { ...base.grant, capabilities: ['admin'] } },
      'UNKNOWN_CAPABILITY',
    );
    expectReason(
      { ...base, grant: { ...base.grant, capabilities: ['rsk.work.read'] } },
      'CAPABILITY_MISSING',
    );
  });

  it('uses the fixed reference time', () => {
    expect(NOW).toBe('2026-07-13T10:00:00.000Z');
  });
});
