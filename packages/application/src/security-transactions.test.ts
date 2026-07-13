import { describe, expect, it, vi } from 'vitest';

import {
  discloseProtectedFields,
  REVOCATION_OPERATIONS_BY_SCOPE,
  withdrawConsent,
  type DisclosureStore,
  type WithdrawalCommit,
  type ConsentScopeKey,
} from './index';

const snapshot = {
  subjectId: 'farmer-1',
  granteeSubjectId: 'staff-1',
  targetId: 'target-1',
  authorizationVersion: 7,
  accessVersion: 3,
  grantId: 'grant-1',
  grantState: 'ACTIVE' as const,
  consentState: 'GRANTED' as const,
  roleContextId: 'context-1',
  officeId: 'office-1',
  jurisdictionId: 'jurisdiction-1',
  purposeCode: 'assisted.service',
};

describe('audit-before-disclose transaction', () => {
  it('writes the allow audit before reading protected fields and returns only after commit', async () => {
    const order: string[] = [];
    const store: DisclosureStore = {
      transaction: async (work) => {
        order.push('begin');
        const result = await work({
          lockAuthorizationSnapshot: () => Promise.resolve(snapshot),
          appendAuditFact: () => {
            order.push('audit');
            return Promise.resolve();
          },
          readProtectedFields: () => {
            order.push('read');
            return Promise.resolve({ displayName: 'Protected', contact: 'Protected' });
          },
        });
        order.push('commit');
        return result;
      },
    };
    await expect(
      discloseProtectedFields({
        store,
        targetId: snapshot.targetId,
        expectedAuthorizationVersion: 7,
        expectedAccessVersion: 3,
        authorize: () => ({ allowed: true, code: 'AUTHORIZED' }),
        auditBase: { purpose: 'assisted.service' },
      }),
    ).resolves.toMatchObject({ outcome: 'ALLOWED' });
    expect(order).toEqual(['begin', 'audit', 'read', 'commit']);
  });

  it.each([
    ['withdrawal', { ...snapshot, accessVersion: 4 }],
    ['authorization change', { ...snapshot, authorizationVersion: 8 }],
  ])('returns no protected fields after %s', async (_case, changed) => {
    const read = vi.fn();
    const audit = vi.fn();
    const store: DisclosureStore = {
      transaction: (work) =>
        work({
          lockAuthorizationSnapshot: () => Promise.resolve(changed),
          appendAuditFact: audit,
          readProtectedFields: read,
        }),
    };
    const result = await discloseProtectedFields({
      store,
      targetId: snapshot.targetId,
      expectedAuthorizationVersion: 7,
      expectedAccessVersion: 3,
      authorize: () => ({ allowed: true, code: 'AUTHORIZED' }),
      auditBase: {},
    });
    expect(result).toEqual({ outcome: 'DENIED', code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'DENY' }));
    expect(read).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('fields');
  });

  it('returns no protected fields when the audit insert fails', async () => {
    const read = vi.fn();
    const store: DisclosureStore = {
      transaction: (work) =>
        work({
          lockAuthorizationSnapshot: () => Promise.resolve(snapshot),
          appendAuditFact: () => Promise.reject(new Error('audit unavailable')),
          readProtectedFields: read,
        }),
    };
    await expect(
      discloseProtectedFields({
        store,
        targetId: snapshot.targetId,
        expectedAuthorizationVersion: 7,
        expectedAccessVersion: 3,
        authorize: () => ({ allowed: true, code: 'AUTHORIZED' }),
        auditBase: {},
      }),
    ).rejects.toThrow('audit unavailable');
    expect(read).not.toHaveBeenCalled();
  });
});

describe('consent withdrawal', () => {
  it('advances access version and atomically schedules every revocation effect', async () => {
    let committed: WithdrawalCommit | undefined;
    const result = await withdrawConsent({
      store: {
        transaction: (work) =>
          work({
            lockCurrentState: (key) => Promise.resolve({ ...key, accessVersion: 3 }),
            commitWithdrawal: (commit) => {
              committed = commit;
              return Promise.resolve();
            },
          }),
      },
      key: {
        subjectId: 'farmer-1',
        scopeKey: 'assisted_service.access',
        purposeKey: 'assisted.service',
        targetKind: 'ASSISTED_FARMER_CONTEXT',
        targetId: 'target-1',
      },
      expectedAccessVersion: 3,
    });
    expect(result.nextAccessVersion).toBe(4);
    expect(result).toMatchObject({
      invalidateRoleContexts: true,
      invalidateAccessGrants: true,
      eventType: 'consent.decision_recorded',
      enqueueOutbox: true,
    });
    expect(result.revocationOperations).toEqual([
      'REVOKE_ASSISTED_SESSIONS',
      'REVOKE_ACCESS_GRANTS',
      'REVOKE_OFFLINE_PACKS',
    ]);
    expect(committed).toEqual(result);
  });

  it('has a non-empty, scope-specific revocation plan for every registered scope', () => {
    const scopes: readonly ConsentScopeKey[] = [
      'location.processing',
      'audio.storage',
      'case.sharing',
      'sensor.collection',
      'sensor.maintenance_location',
      'visit.access',
      'assisted_service.access',
      'channel.app_push',
      'channel.sms',
      'channel.ivr',
      'market.private_fields',
    ];
    expect(Object.keys(REVOCATION_OPERATIONS_BY_SCOPE).sort()).toEqual([...scopes].sort());
    expect(scopes.every((scope) => REVOCATION_OPERATIONS_BY_SCOPE[scope].length > 0)).toBe(true);
    expect(REVOCATION_OPERATIONS_BY_SCOPE['sensor.collection']).toEqual([
      'STOP_SENSOR_COLLECTION',
      'DEASSIGN_SENSOR',
    ]);
    expect(REVOCATION_OPERATIONS_BY_SCOPE['channel.app_push']).toContain(
      'REVOKE_PUSH_REGISTRATIONS',
    );
  });

  it('does not invalidate unrelated assisted grants for a channel-only withdrawal', async () => {
    const result = await withdrawConsent({
      store: {
        transaction: (work) =>
          work({
            lockCurrentState: (key) => Promise.resolve({ ...key, accessVersion: 5 }),
            commitWithdrawal: () => Promise.resolve(),
          }),
      },
      key: {
        subjectId: 'farmer-1',
        scopeKey: 'channel.sms',
        purposeKey: 'alert.delivery',
        targetKind: 'ACCOUNT',
        targetId: 'target-1',
      },
      expectedAccessVersion: 5,
    });

    expect(result.revocationOperations).toEqual(['CANCEL_QUEUED_SMS_DELIVERIES']);
    expect(result.invalidateRoleContexts).toBe(false);
    expect(result.invalidateAccessGrants).toBe(false);
  });

  it('rejects combined withdrawal input', async () => {
    await expect(
      withdrawConsent({
        store: { transaction: vi.fn() },
        key: {
          subjectId: 'farmer-1',
          scopeKey: 'accept.all' as ConsentScopeKey,
          purposeKey: 'farmer.self_service',
          targetKind: 'ACCOUNT',
          targetId: 'target-1',
        },
        expectedAccessVersion: 1,
      }),
    ).rejects.toThrow('independently');
  });

  it('preserves the distinct access-version change outcome during a withdrawal race', async () => {
    await expect(
      withdrawConsent({
        store: {
          transaction: (work) =>
            work({
              lockCurrentState: (key) => Promise.resolve({ ...key, accessVersion: 6 }),
              commitWithdrawal: () => Promise.resolve(),
            }),
        },
        key: {
          subjectId: 'farmer-1',
          scopeKey: 'channel.sms',
          purposeKey: 'alert.delivery',
          targetKind: 'ACCOUNT',
          targetId: 'target-1',
        },
        expectedAccessVersion: 5,
      }),
    ).rejects.toMatchObject({ code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' });
  });
});
