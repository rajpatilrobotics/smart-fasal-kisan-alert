import { describe, expect, it, vi } from 'vitest';

import type { AdvisoryRecord, FarmerSetupOwner } from '@smart-fasal/application';

import { AdvisorySql, PostgresAdvisoryRepository } from './advisory-repository';
import type { GuardedTransaction, ParameterizedStatement } from './index';

const owner: FarmerSetupOwner = {
  authorizationVersion: 1,
  environment: 'local',
  subjectId: '00000000-0000-4000-8000-000000000101',
};

const advisory = {
  advisoryId: '00000000-0000-4000-8000-000000000501',
  plotId: '00000000-0000-4000-8000-000000000401',
  kind: 'IRRIGATION_NEEDED',
  lifecycleState: 'ACTIVE',
  severity: 'ACTION',
  urgency: 'TODAY',
  generatedAt: '2026-07-14T09:00:00.000+05:30',
  activeFrom: '2026-07-14T09:00:00.000+05:30',
  expiresAt: '2026-07-15T09:00:00.000+05:30',
  dataMode: 'RECORDED',
  resultVersion: 1,
  etagRevision: 1,
  snapshotChecksum: `sha256:${'b'.repeat(64)}`,
  ruleSetVersion: 'raigad-advisory-rules-v1',
  riskScore: 92,
  confidenceScore: 86,
  title: 'Irrigation is needed',
  summary: 'Low soil moisture and dry forecast.',
  recommendedAction: {
    actionKind: 'IRRIGATE',
    label: 'Irrigate',
    timingLabel: 'Today',
  },
  why: [{ code: 'LOW_SOIL_MOISTURE', label: 'Soil moisture is low.', contribution: 1 }],
  evidenceRefs: [
    {
      evidenceId: '00000000-0000-4000-8000-000000000601',
      metricKey: 'soilMoisturePct',
      sourceName: 'Recorded fixture',
      freshness: 'CURRENT',
      quality: 'TRUSTED',
      dataMode: 'RECORDED',
    },
  ],
  limitations: [],
  deduplicationKey: 'plot:IRRIGATION_NEEDED:ACTION:IRRIGATE',
  alert: {
    alertId: '00000000-0000-4000-8000-000000000701',
    lifecycleState: 'ACTIVE',
    channel: 'IN_APP',
  },
} satisfies AdvisoryRecord['advisory'];

const record: AdvisoryRecord = {
  owner,
  plotId: advisory.plotId,
  advisory,
};

function fakeTransaction(rows: readonly Record<string, unknown>[] = []) {
  const statements: ParameterizedStatement[] = [];
  const transaction = {
    authorization: {
      authorizationVersion: 1,
      environment: 'local',
      jurisdictionId: '00000000-0000-0000-0000-000000000000',
      officeId: '00000000-0000-0000-0000-000000000000',
      purposeCode: 'farmer.self_service',
      roleContextId: '00000000-0000-4000-8000-000000000102',
      roleType: 'FARMER',
      subjectId: owner.subjectId,
    },
    execute: vi.fn((statement: ParameterizedStatement) => {
      statements.push(statement);
      return Promise.resolve(rows);
    }),
  } as unknown as GuardedTransaction;
  return { statements, transaction };
}

describe('AdvisorySql', () => {
  it('uses Farmer ownership predicates when loading advisories', () => {
    const statement = AdvisorySql.loadAdvisory(owner, advisory.advisoryId);
    expect(statement.text).toContain('farmer_subject_id = $2');
    expect(statement.text).toContain('advisory_payload');
    expect(statement.values).toEqual([owner.environment, owner.subjectId, advisory.advisoryId]);
  });

  it('persists advisory payload and in-app alert projection without external delivery channels', () => {
    const statement = AdvisorySql.saveAdvisory(record);
    expect(statement.text).toContain('insert into agronomy.advisory');
    expect(statement.text).toContain('insert into alert.policy_alert');
    expect(statement.text).toContain("'IN_APP'");
    expect(statement.text).not.toContain('SMS');
    expect(statement.text).not.toContain('WHATSAPP');
    expect(JSON.parse(String(statement.values[21]))).toMatchObject({
      advisoryId: advisory.advisoryId,
      kind: 'IRRIGATION_NEEDED',
    });
  });

  it('stores idempotent response receipts keyed by Farmer and command', () => {
    const statement = AdvisorySql.saveResponse(owner, {
      advisoryId: advisory.advisoryId,
      commandId: '00000000-0000-4000-8000-000000000801',
      disposition: 'ACCEPTED',
      eventIds: ['00000000-0000-4000-8000-000000000802'],
      lifecycleState: 'ACKNOWLEDGED',
      serverReceivedAt: '2026-07-14T09:05:00.000+05:30',
    });
    expect(statement.text).toContain('on conflict (environment, farmer_subject_id, command_id)');
    expect(JSON.parse(String(statement.values[8]))).toMatchObject({
      lifecycleState: 'ACKNOWLEDGED',
    });
  });
});

describe('PostgresAdvisoryRepository', () => {
  it('reconstructs persisted advisory payloads', async () => {
    const { transaction } = fakeTransaction([
      {
        advisory_payload: advisory,
        plot_id: advisory.plotId,
      },
    ]);
    const repository = new PostgresAdvisoryRepository(transaction);

    await expect(repository.loadAdvisory(owner, advisory.advisoryId)).resolves.toMatchObject({
      advisory: { advisoryId: advisory.advisoryId },
      plotId: advisory.plotId,
    });
    await expect(repository.listAdvisories(owner)).resolves.toHaveLength(1);
  });
});
