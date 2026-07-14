import { describe, expect, it, vi } from 'vitest';

import type {
  FarmerSetupOwner,
  RecommendationRecord,
  RecommendationRunStatus,
  SeasonCalendar,
} from '@smart-fasal/application';

import type { GuardedTransaction, ParameterizedStatement } from './index';
import { PostgresRecommendationRepository, RecommendationSql } from './recommendation-repository';

const owner: FarmerSetupOwner = {
  authorizationVersion: 1,
  environment: 'local',
  subjectId: '00000000-0000-4000-8000-000000000101',
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

describe('RecommendationSql', () => {
  it('uses Farmer ownership predicates when loading a recommendation', () => {
    const statement = RecommendationSql.loadRecommendation(
      owner,
      '00000000-0000-4000-8000-000000000901',
    );
    expect(statement.text).toContain('p.farmer_subject_id = $2');
    expect(statement.text).toContain('result_payload');
    expect(statement.values).toEqual([
      owner.environment,
      owner.subjectId,
      '00000000-0000-4000-8000-000000000901',
    ]);
  });

  it('updates run status payload without inventing a Plot row', () => {
    const status: RecommendationRunStatus = {
      operationId: '00000000-0000-4000-8000-000000000902',
      recommendationId: '00000000-0000-4000-8000-000000000903',
      state: 'SUCCEEDED',
      updatedAt: '2026-07-14T09:00:00.000+05:30',
    };
    const statement = RecommendationSql.saveRun(owner, status);
    expect(statement.text).toContain('update agronomy.recommendation_request');
    expect(statement.text).not.toContain('insert into agronomy.recommendation_request');
    expect(JSON.parse(String(statement.values[4]))).toEqual(status);
  });
});

describe('PostgresRecommendationRepository', () => {
  it('reconstructs persisted recommendation and calendar payloads', async () => {
    const recommendation = {
      recommendationId: '00000000-0000-4000-8000-000000000903',
      state: 'READY',
    } as RecommendationRecord['recommendation'];
    const calendar: SeasonCalendar = {
      calendarId: '00000000-0000-4000-8000-000000000904',
      generatedAt: '2026-07-14T09:00:00.000+05:30',
      seasonId: '00000000-0000-4000-8000-000000000905',
      tasks: [],
    };
    const { transaction } = fakeTransaction([
      {
        calendar_payload: calendar,
        plot_id: '00000000-0000-4000-8000-000000000401',
        result_payload: recommendation,
      },
    ]);
    const repository = new PostgresRecommendationRepository(transaction);

    await expect(
      repository.loadRecommendation(owner, '00000000-0000-4000-8000-000000000903'),
    ).resolves.toMatchObject({ recommendation });
    await expect(
      repository.loadCalendar(owner, '00000000-0000-4000-8000-000000000905'),
    ).resolves.toEqual(calendar);
  });
});
