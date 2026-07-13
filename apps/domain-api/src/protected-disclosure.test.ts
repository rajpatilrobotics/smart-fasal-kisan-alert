import { describe, expect, it, vi } from 'vitest';

import type {
  DisclosureAuthorizationSnapshot,
  DisclosureStore,
  DisclosureTransaction,
} from '@smart-fasal/application';

import type {
  ProtectedDisclosureAuthorizationResource,
  VerifiedRequestBoundary,
} from './boundary.js';
import { createTransactionalProtectedDisclosureService } from './protected-disclosure.js';

const STAFF_ID = '10000000-0000-4000-8000-000000000001';
const FARMER_ID = '10000000-0000-4000-8000-000000000002';
const TARGET_ID = '10000000-0000-4000-8000-000000000003';
const ROLE_CONTEXT_ID = '10000000-0000-4000-8000-000000000004';
const GRANT_ID = '10000000-0000-4000-8000-000000000005';
const OFFICE_ID = '10000000-0000-4000-8000-000000000006';
const JURISDICTION_ID = '10000000-0000-4000-8000-000000000007';
const CORRELATION_ID = '10000000-0000-4000-8000-000000000008';
const FUTURE = '2099-01-01T00:00:00.000Z';
const NOW = '2026-07-13T08:00:00.000Z';

const resource: ProtectedDisclosureAuthorizationResource = {
  targetKind: 'ASSISTED_FARMER_CONTEXT',
  targetId: TARGET_ID,
  purposeKey: 'assisted.service',
  expectedAccessVersion: 3,
  fieldSet: 'CONTACT',
};

const snapshot: DisclosureAuthorizationSnapshot = {
  subjectId: FARMER_ID,
  granteeSubjectId: STAFF_ID,
  targetId: TARGET_ID,
  authorizationVersion: 7,
  accessVersion: 3,
  grantId: GRANT_ID,
  grantState: 'ACTIVE',
  consentState: 'GRANTED',
  roleContextId: ROLE_CONTEXT_ID,
  officeId: OFFICE_ID,
  jurisdictionId: JURISDICTION_ID,
  purposeCode: 'assisted.service',
};

const authorization: NonNullable<VerifiedRequestBoundary['authorization']> = {
  environment: 'local',
  subjectId: STAFF_ID,
  roleContextId: ROLE_CONTEXT_ID,
  roleType: 'RSK',
  officeId: OFFICE_ID,
  jurisdictionId: JURISDICTION_ID,
  purposeCode: 'assisted.service',
  authorizationVersion: 7,
  capabilitySetVersion: 1,
  capabilities: ['rsk.protected_disclose', 'assisted_session.operate'],
};

const boundary: VerifiedRequestBoundary = {
  correlationId: CORRELATION_ID,
  environment: 'local',
  installationId: 'installation.test.1',
  clientBuild: 'test',
  appCheck: { appId: 'rsk-app', environment: 'local', expiresAt: FUTURE },
  identity: {
    subjectId: STAFF_ID,
    subjectType: 'STAFF',
    environment: 'local',
    expiresAt: FUTURE,
    securityVersion: 1,
    mfaState: 'CURRENT',
  },
  authorization,
};

function disclosureStore(
  current: DisclosureAuthorizationSnapshot,
  order: string[],
  auditFailure = false,
): { store: DisclosureStore; read: ReturnType<typeof vi.fn>; audit: ReturnType<typeof vi.fn> } {
  const read = vi.fn(() => {
    order.push('read');
    return Promise.resolve({ displayName: 'Protected', contact: 'Protected' });
  });
  const audit = vi.fn(() => {
    order.push('audit');
    return auditFailure
      ? Promise.reject(new Error('audit unavailable'))
      : Promise.resolve(undefined);
  });
  const transaction: DisclosureTransaction = {
    lockAuthorizationSnapshot: () => Promise.resolve(current),
    appendAuditFact: audit,
    readProtectedFields: read,
  };
  return {
    store: {
      async transaction(work) {
        order.push('begin');
        const result = await work(transaction);
        order.push('commit');
        return result;
      },
    },
    read,
    audit,
  };
}

describe('transactional protected disclosure service', () => {
  it('commits the allow Audit fact before reading and only then returns protected fields', async () => {
    const order: string[] = [];
    const { store } = disclosureStore(snapshot, order);
    const service = createTransactionalProtectedDisclosureService({
      store,
      now: () => new Date(NOW),
    });

    await expect(service.disclose({ boundary, resource })).resolves.toEqual({
      allowed: true,
      response: {
        targetId: TARGET_ID,
        accessVersion: 3,
        fields: { displayName: 'Protected', contact: 'Protected' },
        auditedAt: NOW,
      },
    });
    expect(order).toEqual(['begin', 'audit', 'read', 'commit']);
  });

  it('returns no protected fields after withdrawal or an access-version race', async () => {
    const order: string[] = [];
    const { store, read, audit } = disclosureStore(
      { ...snapshot, consentState: 'WITHDRAWN', accessVersion: 4 },
      order,
    );
    const service = createTransactionalProtectedDisclosureService({ store });

    await expect(service.disclose({ boundary, resource })).resolves.toEqual({
      allowed: false,
      code: 'CONSENT_OR_ACCESS_VERSION_CHANGED',
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'DENY' }));
    expect(read).not.toHaveBeenCalled();
  });

  it('returns no protected fields when the Audit write fails', async () => {
    const order: string[] = [];
    const { store, read } = disclosureStore(snapshot, order, true);
    const service = createTransactionalProtectedDisclosureService({ store });

    await expect(service.disclose({ boundary, resource })).rejects.toThrow('audit unavailable');
    expect(read).not.toHaveBeenCalled();
    expect(order).toEqual(['begin', 'audit']);
  });

  it('requires both the disclosure and owning assisted-session capability', async () => {
    const order: string[] = [];
    const { store, read } = disclosureStore(snapshot, order);
    const service = createTransactionalProtectedDisclosureService({ store });
    const missingOwnerCapability: VerifiedRequestBoundary = {
      ...boundary,
      authorization: {
        ...authorization,
        capabilities: ['rsk.protected_disclose'],
      },
    };

    await expect(service.disclose({ boundary: missingOwnerCapability, resource })).resolves.toEqual(
      { allowed: false, code: 'AUTHORIZATION_DENIED' },
    );
    expect(read).not.toHaveBeenCalled();
  });
});
