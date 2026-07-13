import { describe, expect, it, vi } from 'vitest';

import {
  DomainWorkerDependencyError,
  mapClaimedEntries,
  PostgresOutboxStore,
  validDomainWorkerRolePosture,
  validProtectedRelationPosture,
  type WorkerSqlPool,
  type WorkerSqlTransaction,
} from './postgres-outbox-store.js';

const OUTBOX_ID = '00000000-0000-4000-8000-000000000101';
const EVENT_ID = '00000000-0000-4000-8000-000000000102';
const CLAIM_TOKEN = '00000000-0000-4000-8000-000000000103';

function createSqlHarness(options: { readonly validRole?: boolean } = {}) {
  const calls: string[] = [];
  const transaction: WorkerSqlTransaction = {
    setLocalRole() {
      calls.push('set-local-role');
      return Promise.resolve();
    },
    readRolePosture() {
      calls.push('read-role-posture');
      return Promise.resolve([
        {
          current_role: options.validRole === false ? 'login_owner' : 'sf_domain_worker',
          rolbypassrls: false,
          rolcanlogin: false,
          rolsuper: false,
        },
      ]);
    },
    readRelationPosture() {
      calls.push('read-relation-posture');
      return Promise.resolve([
        {
          owner_name: 'sf_migrator',
          relation_name: 'integration_event',
          relforcerowsecurity: true,
          relrowsecurity: true,
          schema_name: 'platform',
        },
        {
          owner_name: 'sf_migrator',
          relation_name: 'outbox',
          relforcerowsecurity: true,
          relrowsecurity: true,
          schema_name: 'platform',
        },
      ]);
    },
    verifyOutboxAccess() {
      calls.push('verify-outbox-access');
      return Promise.resolve();
    },
    claim() {
      calls.push('claim');
      return Promise.resolve([
        {
          attempt_count: 2,
          claimed_by: 'domain-worker:test',
          claim_token: CLAIM_TOKEN,
          destination: 'provider-test',
          integration_event_id: EVENT_ID,
          outbox_id: OUTBOX_ID,
        },
      ]);
    },
    readIntegrationEvents() {
      calls.push('read-integration-event');
      return Promise.resolve([
        {
          destination: 'provider-test',
          event_type: 'consent.decision_recorded',
          integration_event_id: EVENT_ID,
          payload: { accessVersion: 2 },
        },
      ]);
    },
    markPublished() {
      calls.push('mark-published');
      return Promise.resolve([{ outbox_id: OUTBOX_ID }]);
    },
    markRetry() {
      calls.push('mark-retry');
      return Promise.resolve([]);
    },
  };
  const pool: WorkerSqlPool = {
    close: vi.fn(() => Promise.resolve()),
    transaction: (work) => work(transaction),
  };
  return { calls, pool, transaction };
}

describe('Postgres outbox role boundary', () => {
  it('accepts only the exact non-login, non-owner worker posture', () => {
    expect(
      validDomainWorkerRolePosture([
        {
          current_role: 'sf_domain_worker',
          rolbypassrls: false,
          rolcanlogin: false,
          rolsuper: false,
        },
      ]),
    ).toBe(true);
    expect(
      validDomainWorkerRolePosture([
        {
          current_role: 'sf_domain_worker',
          rolbypassrls: true,
          rolcanlogin: false,
          rolsuper: false,
        },
      ]),
    ).toBe(false);
    expect(
      validProtectedRelationPosture([
        {
          owner_name: 'sf_migrator',
          relation_name: 'integration_event',
          relforcerowsecurity: true,
          relrowsecurity: true,
          schema_name: 'platform',
        },
        {
          owner_name: 'sf_domain_worker',
          relation_name: 'outbox',
          relforcerowsecurity: true,
          relrowsecurity: true,
          schema_name: 'platform',
        },
      ]),
    ).toBe(false);
    expect(
      validDomainWorkerRolePosture([
        {
          current_role: 'login_owner',
          rolbypassrls: false,
          rolcanlogin: true,
          rolsuper: false,
        },
      ]),
    ).toBe(false);
  });

  it('sets and validates the transaction-local role before any outbox access', async () => {
    const harness = createSqlHarness();
    const store = new PostgresOutboxStore({ environment: 'local', pool: harness.pool });

    await expect(store.checkReadiness()).resolves.toEqual({ available: true });
    expect(harness.calls).toEqual([
      'set-local-role',
      'read-role-posture',
      'read-relation-posture',
      'verify-outbox-access',
    ]);
  });

  it('returns typed unavailable readiness and never reaches outbox access for bad posture', async () => {
    const harness = createSqlHarness({ validRole: false });
    const store = new PostgresOutboxStore({ environment: 'local', pool: harness.pool });

    await expect(store.checkReadiness()).resolves.toEqual({
      available: false,
      code: 'ROLE_POSTURE_INVALID',
    });
    expect(harness.calls).toEqual(['set-local-role', 'read-role-posture']);
  });
});

describe('Postgres outbox mapping and fencing', () => {
  it('maps only the claimed outbox and minimized integration-event fields', async () => {
    const harness = createSqlHarness();
    const store = new PostgresOutboxStore({ environment: 'local', pool: harness.pool });

    const result = await store.transaction(async (transaction) => {
      const entries = await transaction.claim({
        claimExpiresAt: new Date('2026-07-13T08:00:05.000Z'),
        claimToken: CLAIM_TOKEN,
        limit: 10,
        now: new Date('2026-07-13T08:00:00.000Z'),
        workerId: 'domain-worker:test',
      });
      const published = await transaction.markPublished({
        attemptCount: 2,
        claimToken: CLAIM_TOKEN,
        outboxId: OUTBOX_ID,
        publishedAt: new Date('2026-07-13T08:00:01.000Z'),
        workerId: 'domain-worker:test',
      });
      const staleRetry = await transaction.markRetry({
        attemptCount: 1,
        availableAt: new Date('2026-07-13T08:00:02.000Z'),
        claimToken: CLAIM_TOKEN,
        outboxId: OUTBOX_ID,
        safeProblemCode: 'PROVIDER_UNAVAILABLE',
        workerId: 'stale-worker',
      });
      return { entries, published, staleRetry };
    });

    expect(result).toEqual({
      entries: [
        {
          attemptCount: 2,
          claimedBy: 'domain-worker:test',
          claimToken: CLAIM_TOKEN,
          destination: 'provider-test',
          eventType: 'consent.decision_recorded',
          integrationEventId: EVENT_ID,
          outboxId: OUTBOX_ID,
          payload: { accessVersion: 2 },
        },
      ],
      published: true,
      staleRetry: false,
    });
    expect(harness.calls).toEqual([
      'set-local-role',
      'read-role-posture',
      'read-relation-posture',
      'verify-outbox-access',
      'claim',
      'read-integration-event',
      'mark-published',
      'mark-retry',
    ]);
  });

  it('rejects a missing or destination-mismatched integration event', () => {
    expect(() => mapClaimedEntries([], [])).not.toThrow();
    expect(() =>
      mapClaimedEntries(
        [
          {
            attempt_count: 1,
            claimed_by: 'domain-worker:test',
            claim_token: CLAIM_TOKEN,
            destination: 'provider-a',
            integration_event_id: EVENT_ID,
            outbox_id: OUTBOX_ID,
          },
        ],
        [],
      ),
    ).toThrow(DomainWorkerDependencyError);
    expect(() =>
      mapClaimedEntries(
        [
          {
            attempt_count: 1,
            claimed_by: 'domain-worker:test',
            claim_token: CLAIM_TOKEN,
            destination: 'provider-a',
            integration_event_id: EVENT_ID,
            outbox_id: OUTBOX_ID,
          },
        ],
        [
          {
            destination: 'provider-b',
            event_type: 'consent.decision_recorded',
            integration_event_id: EVENT_ID,
            payload: {},
          },
        ],
      ),
    ).toThrow(DomainWorkerDependencyError);
  });
});
