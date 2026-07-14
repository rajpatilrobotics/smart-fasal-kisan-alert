import type {
  FarmerSetupOwner,
  RecommendationAcceptanceReceipt,
  RecommendationRecord,
  RecommendationRepository,
  RecommendationRunStatus,
  SeasonCalendar,
} from '@smart-fasal/application';

import type { GuardedTransaction, ParameterizedStatement } from './index';

function ownerValues(owner: FarmerSetupOwner): readonly [string, string] {
  return [owner.environment, owner.subjectId];
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function parseRun(row: Record<string, unknown> | undefined): RecommendationRunStatus | undefined {
  return object(row?.['status_payload']) as RecommendationRunStatus | undefined;
}

function parseRecommendation(
  owner: FarmerSetupOwner,
  row: Record<string, unknown> | undefined,
): RecommendationRecord | undefined {
  const recommendation = object(row?.['result_payload']);
  if (recommendation === undefined) return undefined;
  const plotId = row?.['plot_id'];
  if (typeof plotId !== 'string') return undefined;
  return {
    owner,
    plotId,
    recommendation: recommendation as RecommendationRecord['recommendation'],
  };
}

function parseAcceptance(
  row: Record<string, unknown> | undefined,
): RecommendationAcceptanceReceipt | undefined {
  return object(row?.['receipt_payload']) as RecommendationAcceptanceReceipt | undefined;
}

function parseCalendar(row: Record<string, unknown> | undefined): SeasonCalendar | undefined {
  return object(row?.['calendar_payload']) as SeasonCalendar | undefined;
}

export const RecommendationSql = {
  loadRun(owner: FarmerSetupOwner, operationId: string): ParameterizedStatement {
    return {
      text: `
        select status_payload
        from agronomy.recommendation_request
        where environment = $1 and farmer_subject_id = $2 and operation_id = $3
        limit 1
      `,
      values: [...ownerValues(owner), operationId],
    };
  },
  saveRun(owner: FarmerSetupOwner, status: RecommendationRunStatus): ParameterizedStatement {
    return {
      text: `
        update agronomy.recommendation_request
        set state = $4, status_payload = $5::jsonb
        where environment = $1 and farmer_subject_id = $2 and operation_id = $3
      `,
      values: [...ownerValues(owner), status.operationId, status.state, json(status)],
    };
  },
  loadRecommendation(owner: FarmerSetupOwner, recommendationId: string): ParameterizedStatement {
    return {
      text: `
        select plot_id::text, result_payload
        from agronomy.recommendation_result
        where environment = $1 and recommendation_id = $3
          and exists (
            select 1 from farm.plot p
            where p.environment = agronomy.recommendation_result.environment
              and p.plot_id = agronomy.recommendation_result.plot_id
              and p.farmer_subject_id = $2
          )
        limit 1
      `,
      values: [...ownerValues(owner), recommendationId],
    };
  },
  saveRecommendation(record: RecommendationRecord): ParameterizedStatement {
    return {
      text: `
        update agronomy.recommendation_result
        set result_payload = $4::jsonb
        where environment = $1 and recommendation_id = $3
      `,
      values: [
        record.owner.environment,
        record.owner.subjectId,
        record.recommendation.recommendationId,
        json(record.recommendation),
      ],
    };
  },
  loadAcceptance(owner: FarmerSetupOwner, commandId: string): ParameterizedStatement {
    return {
      text: `
        select receipt_payload
        from agronomy.recommendation_acceptance
        where environment = $1 and command_id = $3
          and exists (
            select 1 from agronomy.recommendation_result r
            join farm.plot p on p.environment = r.environment and p.plot_id = r.plot_id
            where r.environment = agronomy.recommendation_acceptance.environment
              and r.recommendation_id = agronomy.recommendation_acceptance.recommendation_id
              and p.farmer_subject_id = $2
          )
        limit 1
      `,
      values: [...ownerValues(owner), commandId],
    };
  },
  saveAcceptance(
    owner: FarmerSetupOwner,
    receipt: RecommendationAcceptanceReceipt,
  ): ParameterizedStatement {
    return {
      text: `
        update agronomy.recommendation_acceptance
        set receipt_payload = $4::jsonb
        where environment = $1 and command_id = $3
      `,
      values: [owner.environment, owner.subjectId, receipt.commandId, json(receipt)],
    };
  },
  loadCalendar(owner: FarmerSetupOwner, seasonId: string): ParameterizedStatement {
    return {
      text: `
        select c.calendar_payload
        from workflow.calendar c
        join agronomy.farm_season s on s.environment = c.environment and s.season_id = c.season_id
        join farm.plot p on p.environment = s.environment and p.plot_id = s.plot_id
        where c.environment = $1 and c.season_id = $3 and p.farmer_subject_id = $2
        limit 1
      `,
      values: [...ownerValues(owner), seasonId],
    };
  },
  saveCalendar(owner: FarmerSetupOwner, calendar: SeasonCalendar): ParameterizedStatement {
    return {
      text: `
        update workflow.calendar
        set calendar_payload = $4::jsonb
        where environment = $1 and season_id = $3
      `,
      values: [owner.environment, owner.subjectId, calendar.seasonId, json(calendar)],
    };
  },
} as const;

export class PostgresRecommendationRepository implements RecommendationRepository {
  constructor(private readonly transaction: GuardedTransaction) {}

  async loadRun(owner: FarmerSetupOwner, operationId: string) {
    const rows = await this.transaction.execute(RecommendationSql.loadRun(owner, operationId));
    return parseRun(rows[0]);
  }

  async saveRun(owner: FarmerSetupOwner, status: RecommendationRunStatus) {
    await this.transaction.execute(RecommendationSql.saveRun(owner, status));
  }

  async loadRecommendation(owner: FarmerSetupOwner, recommendationId: string) {
    const rows = await this.transaction.execute(
      RecommendationSql.loadRecommendation(owner, recommendationId),
    );
    return parseRecommendation(owner, rows[0]);
  }

  async saveRecommendation(record: RecommendationRecord) {
    await this.transaction.execute(RecommendationSql.saveRecommendation(record));
  }

  async loadAcceptance(owner: FarmerSetupOwner, commandId: string) {
    const rows = await this.transaction.execute(RecommendationSql.loadAcceptance(owner, commandId));
    return parseAcceptance(rows[0]);
  }

  async saveAcceptance(owner: FarmerSetupOwner, receipt: RecommendationAcceptanceReceipt) {
    await this.transaction.execute(RecommendationSql.saveAcceptance(owner, receipt));
  }

  async loadCalendar(owner: FarmerSetupOwner, seasonId: string) {
    const rows = await this.transaction.execute(RecommendationSql.loadCalendar(owner, seasonId));
    return parseCalendar(rows[0]);
  }

  async saveCalendar(owner: FarmerSetupOwner, calendar: SeasonCalendar) {
    await this.transaction.execute(RecommendationSql.saveCalendar(owner, calendar));
  }
}
