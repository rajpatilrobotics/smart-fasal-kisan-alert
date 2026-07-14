import type {
  AdvisoryRecord,
  AdvisoryRepository,
  AdvisoryResponseReceipt,
  FarmerSetupOwner,
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

function parseAdvisory(
  owner: FarmerSetupOwner,
  row: Record<string, unknown> | undefined,
): AdvisoryRecord | undefined {
  const advisory = object(row?.['advisory_payload']);
  const plotId = row?.['plot_id'];
  if (advisory === undefined || typeof plotId !== 'string') return undefined;
  return {
    owner,
    plotId,
    advisory: advisory as AdvisoryRecord['advisory'],
  };
}

function parseResponse(
  row: Record<string, unknown> | undefined,
): AdvisoryResponseReceipt | undefined {
  return object(row?.['receipt_payload']) as AdvisoryResponseReceipt | undefined;
}

export const AdvisorySql = {
  loadAdvisory(owner: FarmerSetupOwner, advisoryId: string): ParameterizedStatement {
    return {
      text: `
        select plot_id::text, advisory_payload
        from agronomy.advisory
        where environment = $1 and advisory_id = $3 and farmer_subject_id = $2
        limit 1
      `,
      values: [...ownerValues(owner), advisoryId],
    };
  },

  listAdvisories(owner: FarmerSetupOwner): ParameterizedStatement {
    return {
      text: `
        select plot_id::text, advisory_payload
        from agronomy.advisory
        where environment = $1 and farmer_subject_id = $2
          and lifecycle_state in ('ACTIVE', 'DEDUPLICATED', 'ACKNOWLEDGED', 'SNOOZED')
        order by generated_at desc
        limit 50
      `,
      values: ownerValues(owner),
    };
  },

  loadByDeduplicationKey(owner: FarmerSetupOwner, deduplicationKey: string): ParameterizedStatement {
    return {
      text: `
        select plot_id::text, advisory_payload
        from agronomy.advisory
        where environment = $1 and farmer_subject_id = $2
          and deduplication_key = $3
          and lifecycle_state = 'ACTIVE'
        order by generated_at desc
        limit 1
      `,
      values: [...ownerValues(owner), deduplicationKey],
    };
  },

  saveAdvisory(record: AdvisoryRecord): ParameterizedStatement {
    const advisory = record.advisory;
    return {
      text: `
        with evaluation as (
          insert into agronomy.advisory_evaluation (
            environment,
            advisory_evaluation_id,
            farmer_subject_id,
            plot_id,
            rule_set_version,
            evaluated_at,
            data_mode,
            snapshot_checksum,
            outcome
          )
          values ($1, $3, $2, $4, $5, $6::timestamptz, $7, $8, $9)
          on conflict (environment, advisory_evaluation_id) do nothing
          returning advisory_evaluation_id
        ),
        upsert_advisory as (
          insert into agronomy.advisory (
            environment,
            advisory_id,
            advisory_evaluation_id,
            farmer_subject_id,
            plot_id,
            kind,
            lifecycle_state,
            severity,
            urgency,
            risk_score,
            confidence_score,
            deduplication_key,
            result_version,
            etag_revision,
            generated_at,
            active_from,
            expires_at,
            supersedes_advisory_id,
            advisory_payload
          )
          values (
            $1,
            $3,
            $3,
            $2,
            $4,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $6::timestamptz,
            $19::timestamptz,
            $20::timestamptz,
            $21,
            $22::jsonb
          )
          on conflict (environment, advisory_id) do update set
            lifecycle_state = excluded.lifecycle_state,
            etag_revision = excluded.etag_revision,
            advisory_payload = excluded.advisory_payload
          returning advisory_id
        )
        insert into alert.policy_alert (
          environment,
          alert_id,
          advisory_id,
          farmer_subject_id,
          channel,
          lifecycle_state,
          severity,
          expires_at,
          last_interaction_at
        )
        values ($1, $23, $3, $2, 'IN_APP', $24, $12, $20::timestamptz, $25::timestamptz)
        on conflict (environment, alert_id) do update set
          lifecycle_state = excluded.lifecycle_state,
          last_interaction_at = excluded.last_interaction_at
      `,
      values: [
        record.owner.environment,
        record.owner.subjectId,
        advisory.advisoryId,
        record.plotId,
        advisory.ruleSetVersion,
        advisory.generatedAt,
        advisory.dataMode,
        advisory.snapshotChecksum,
        advisory.lifecycleState === 'DEDUPLICATED' ? 'DEDUPLICATED' : 'ACTION',
        advisory.kind,
        advisory.lifecycleState,
        advisory.severity,
        advisory.urgency,
        advisory.riskScore,
        advisory.confidenceScore,
        advisory.deduplicationKey,
        advisory.resultVersion,
        advisory.etagRevision,
        advisory.activeFrom,
        advisory.expiresAt,
        advisory.supersedesAdvisoryId ?? null,
        json(advisory),
        advisory.alert?.alertId ?? advisory.advisoryId,
        advisory.alert?.lifecycleState ?? 'ACTIVE',
        advisory.alert?.lastInteractionAt ?? null,
      ],
    };
  },

  loadResponse(owner: FarmerSetupOwner, commandId: string): ParameterizedStatement {
    return {
      text: `
        select receipt_payload
        from agronomy.advisory_response
        where environment = $1 and farmer_subject_id = $2 and command_id = $3
        limit 1
      `,
      values: [...ownerValues(owner), commandId],
    };
  },

  saveResponse(owner: FarmerSetupOwner, receipt: AdvisoryResponseReceipt): ParameterizedStatement {
    return {
      text: `
        insert into agronomy.advisory_response (
          environment,
          advisory_response_id,
          advisory_id,
          farmer_subject_id,
          command_id,
          response,
          client_recorded_at,
          server_received_at,
          receipt_payload
        )
        values ($1, $3, $4, $2, $5, $6, $7::timestamptz, $8::timestamptz, $9::jsonb)
        on conflict (environment, farmer_subject_id, command_id) do update set
          receipt_payload = excluded.receipt_payload
      `,
      values: [
        owner.environment,
        owner.subjectId,
        receipt.eventIds[0] ?? receipt.commandId,
        receipt.advisoryId,
        receipt.commandId,
        receipt.lifecycleState === 'ACKNOWLEDGED'
          ? 'ACKNOWLEDGE'
          : receipt.lifecycleState === 'SNOOZED'
            ? 'SNOOZE'
            : receipt.lifecycleState === 'RESOLVED'
              ? 'MARK_ACTION_COMPLETED'
              : 'CANNOT_DO',
        receipt.serverReceivedAt,
        receipt.serverReceivedAt,
        json(receipt),
      ],
    };
  },
} as const;

export class PostgresAdvisoryRepository implements AdvisoryRepository {
  constructor(private readonly transaction: GuardedTransaction) {}

  async loadAdvisory(owner: FarmerSetupOwner, advisoryId: string) {
    const rows = await this.transaction.execute(AdvisorySql.loadAdvisory(owner, advisoryId));
    return parseAdvisory(owner, rows[0]);
  }

  async listAdvisories(owner: FarmerSetupOwner) {
    const rows = await this.transaction.execute(AdvisorySql.listAdvisories(owner));
    return rows.flatMap((row) => {
      const parsed = parseAdvisory(owner, row);
      return parsed === undefined ? [] : [parsed];
    });
  }

  async loadByDeduplicationKey(owner: FarmerSetupOwner, deduplicationKey: string) {
    const rows = await this.transaction.execute(
      AdvisorySql.loadByDeduplicationKey(owner, deduplicationKey),
    );
    return parseAdvisory(owner, rows[0]);
  }

  async saveAdvisory(record: AdvisoryRecord) {
    await this.transaction.execute(AdvisorySql.saveAdvisory(record));
  }

  async loadResponse(owner: FarmerSetupOwner, commandId: string) {
    const rows = await this.transaction.execute(AdvisorySql.loadResponse(owner, commandId));
    return parseResponse(rows[0]);
  }

  async saveResponse(owner: FarmerSetupOwner, receipt: AdvisoryResponseReceipt) {
    await this.transaction.execute(AdvisorySql.saveResponse(owner, receipt));
  }
}
