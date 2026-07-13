import { describe, expect, it, vi } from 'vitest';

import type {
  IdentityVerifier as CoreIdentityVerifier,
  VerifiedIdentity,
} from '@smart-fasal/authz';

import {
  createDomainCredentialAdapters,
  createProductionIdentityBoundary,
  providerSubjectDigest,
} from './production-identity.js';

const NOW = new Date('2026-07-13T08:00:00.000Z');

function coreIdentity(overrides: Partial<VerifiedIdentity> = {}): VerifiedIdentity {
  return {
    subjectId: '10000000-0000-4000-8000-000000000001',
    subjectType: 'STAFF',
    providerUid: 'provider-uid-never-leaves-adapter',
    environment: 'local',
    projectId: 'project-test',
    securityVersion: 3,
    issuedAt: '2026-07-13T07:30:00.000Z',
    expiresAt: '2026-07-13T09:00:00.000Z',
    mfa: { secondFactor: true, assuredAt: '2026-07-13T07:55:00.000Z' },
    ...overrides,
  };
}

function coreVerifier(identity = coreIdentity()): CoreIdentityVerifier {
  return {
    verifyIdToken: vi.fn(() => Promise.resolve({ ok: true as const, value: identity })),
    verifyAppCheckToken: vi.fn((_token: string, surface: 'FARMER' | 'RSK' | 'MP') =>
      Promise.resolve({
        ok: true as const,
        value: {
          appId: `${surface.toLowerCase()}-app`,
          environment: 'local' as const,
          surface,
          expiresAt: '2026-07-13T09:00:00.000Z',
        },
      }),
    ),
    verifyBrowserCredentials: vi.fn(),
  };
}

describe('production Firebase credential adapter', () => {
  it('keeps the provider UID private and derives current staff MFA from assurance time', async () => {
    const core = coreVerifier();
    const adapters = createDomainCredentialAdapters({
      environment: 'local',
      staffMfaMaximumAgeSeconds: 900,
      verifiers: { RSK: core },
      now: () => NOW,
    });

    const identity = await adapters.identityVerifier.verifyIdToken('id-token', {
      checkRevoked: true,
      environment: 'local',
      surface: 'RSK',
    });
    expect(identity).toEqual({
      subjectId: '10000000-0000-4000-8000-000000000001',
      subjectType: 'STAFF',
      environment: 'local',
      expiresAt: '2026-07-13T09:00:00.000Z',
      securityVersion: 3,
      mfaState: 'CURRENT',
    });
    expect(identity).not.toHaveProperty('providerUid');
  });

  it('marks stale staff assurance expired and Farmer assurance not required', async () => {
    const stale = createDomainCredentialAdapters({
      environment: 'local',
      staffMfaMaximumAgeSeconds: 300,
      verifiers: {
        RSK: coreVerifier(
          coreIdentity({ mfa: { secondFactor: true, assuredAt: '2026-07-13T07:00:00.000Z' } }),
        ),
        FARMER: coreVerifier(coreIdentity({ subjectType: 'FARMER' })),
      },
      now: () => NOW,
    });

    await expect(
      stale.identityVerifier.verifyIdToken('staff', {
        checkRevoked: true,
        environment: 'local',
        surface: 'RSK',
      }),
    ).resolves.toMatchObject({ mfaState: 'EXPIRED' });
    await expect(
      stale.identityVerifier.verifyIdToken('farmer', {
        checkRevoked: true,
        environment: 'local',
        surface: 'FARMER',
      }),
    ).resolves.toMatchObject({ mfaState: 'NOT_REQUIRED' });
  });

  it('preserves missing production configuration as typed Unavailable', async () => {
    const boundary = createProductionIdentityBoundary({
      environment: 'local',
      firebaseProjectId: undefined,
      appIds: { farmer: [], rsk: [], mp: [] },
      databaseUrls: { farmer: undefined, rsk: undefined },
      staffMfaMaximumAgeSeconds: 900,
    });

    expect(boundary.configured).toBe(false);
    await expect(
      boundary.appCheckVerifier.verifyAppCheckToken('token', {
        environment: 'local',
        surface: 'FARMER',
      }),
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      status: 503,
    });
    await boundary.close();
  });

  it('rejects a cross-environment request before invoking Firebase', async () => {
    const core = coreVerifier();
    const verifyIdToken = vi.spyOn(core, 'verifyIdToken');
    const adapters = createDomainCredentialAdapters({
      environment: 'staging',
      staffMfaMaximumAgeSeconds: 900,
      verifiers: { FARMER: core },
    });

    await expect(
      adapters.identityVerifier.verifyIdToken('token', {
        checkRevoked: true,
        environment: 'production',
        surface: 'FARMER',
      }),
    ).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe('identity lookup digest', () => {
  it('is deterministic, provider-bound and never contains the raw provider UID', () => {
    const digest = providerSubjectDigest('synthetic-provider-uid');
    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(digest).toBe(providerSubjectDigest('synthetic-provider-uid'));
    expect(digest).not.toContain('synthetic-provider-uid');
  });
});
