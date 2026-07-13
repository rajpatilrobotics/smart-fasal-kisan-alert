import type {
  ClaimedOutboxEntry,
  OutboxClaimDispositionInput,
  OutboxTransaction,
} from '@smart-fasal/events';
import postgres from 'postgres';
import type { Sql, TransactionSql } from 'postgres';

import type { DomainWorkerEnvironment } from './config.js';
import type {
  DependencyReadiness,
  DependencyUnavailableCode,
  ReadinessAwareOutboxStore,
} from './worker.js';

const DOMAIN_WORKER_ROLE = 'sf_domain_worker' as const;
type Tx = TransactionSql<Record<string, never>>;

interface RolePostureRow {
  readonly current_role: string;
  readonly rolbypassrls: boolean;
  readonly rolcanlogin: boolean;
  readonly rolsuper: boolean;
}

interface RelationPostureRow {
  readonly owner_name: string;
  readonly relation_name: string;
  readonly relforcerowsecurity: boolean;
  readonly relrowsecurity: boolean;
  readonly schema_name: string;
}

interface ClaimedOutboxRow {
  readonly attempt_count: number | string;
  readonly claimed_by: string | null;
  readonly claim_token: string | null;
  readonly destination: string;
  readonly integration_event_id: string;
  readonly outbox_id: string;
}

interface IntegrationEventRow {
  readonly destination: string;
  readonly event_type: string;
  readonly integration_event_id: string;
  readonly payload: unknown;
}

interface DispositionRow {
  readonly outbox_id: string;
}

export interface WorkerSqlTransaction {
  setLocalRole(): Promise<void>;
  readRolePosture(): Promise<readonly RolePostureRow[]>;
  readRelationPosture(): Promise<readonly RelationPostureRow[]>;
  verifyOutboxAccess(): Promise<void>;
  claim(input: {
    readonly claimExpiresAt: Date;
    readonly claimToken: string;
    readonly limit: number;
    readonly now: Date;
    readonly workerId: string;
  }): Promise<readonly ClaimedOutboxRow[]>;
  readIntegrationEvents(
    integrationEventIds: readonly string[],
  ): Promise<readonly IntegrationEventRow[]>;
  markPublished(
    input: OutboxClaimDispositionInput & { readonly publishedAt: Date },
  ): Promise<readonly DispositionRow[]>;
  markRetry(
    input: OutboxClaimDispositionInput & {
      readonly availableAt: Date;
      readonly safeProblemCode: string;
    },
  ): Promise<readonly DispositionRow[]>;
}

export interface WorkerSqlPool {
  transaction<Result>(
    work: (transaction: WorkerSqlTransaction) => Promise<Result>,
  ): Promise<Result>;
  close(): Promise<void>;
}

export class DomainWorkerDependencyError extends Error {
  constructor(readonly code: DependencyUnavailableCode) {
    super('DOMAIN_WORKER_DEPENDENCY_UNAVAILABLE');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
  }
  return value;
}

function requiredAttempt(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || Number(parsed) < 1) {
    throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
  }
  return Number(parsed);
}

function requiredPayload(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
  return Object.freeze({ ...value });
}

export function validDomainWorkerRolePosture(rows: readonly RolePostureRow[]): boolean {
  const posture = rows[0];
  return (
    rows.length === 1 &&
    posture?.current_role === DOMAIN_WORKER_ROLE &&
    !posture.rolcanlogin &&
    !posture.rolbypassrls &&
    !posture.rolsuper
  );
}

export function validProtectedRelationPosture(rows: readonly RelationPostureRow[]): boolean {
  const requiredRelations = new Set(['platform.integration_event', 'platform.outbox']);
  if (rows.length !== requiredRelations.size) return false;
  for (const row of rows) {
    const relation = `${row.schema_name}.${row.relation_name}`;
    if (
      !requiredRelations.delete(relation) ||
      row.owner_name === DOMAIN_WORKER_ROLE ||
      !row.relrowsecurity ||
      !row.relforcerowsecurity
    ) {
      return false;
    }
  }
  return requiredRelations.size === 0;
}

export function mapClaimedEntries(
  outboxRows: readonly ClaimedOutboxRow[],
  integrationRows: readonly IntegrationEventRow[],
): readonly ClaimedOutboxEntry[] {
  const events = new Map<string, IntegrationEventRow>();
  for (const row of integrationRows) {
    const integrationEventId = requiredString(row.integration_event_id);
    if (events.has(integrationEventId)) {
      throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
    }
    events.set(integrationEventId, row);
  }
  if (events.size !== outboxRows.length) {
    throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
  }

  return outboxRows.map((outbox) => {
    const integrationEventId = requiredString(outbox.integration_event_id);
    const event = events.get(integrationEventId);
    if (
      event === undefined ||
      requiredString(event.destination) !== requiredString(outbox.destination)
    ) {
      throw new DomainWorkerDependencyError('OUTBOX_STORE_UNAVAILABLE');
    }
    return Object.freeze({
      attemptCount: requiredAttempt(outbox.attempt_count),
      claimedBy: requiredString(outbox.claimed_by),
      claimToken: requiredString(outbox.claim_token),
      destination: requiredString(outbox.destination),
      eventType: requiredString(event.event_type),
      integrationEventId,
      outboxId: requiredString(outbox.outbox_id),
      payload: requiredPayload(event.payload),
    });
  });
}

function createPostgresPool(
  databaseUrl: string,
  environment: DomainWorkerEnvironment,
): WorkerSqlPool {
  const sql: Sql = postgres(databaseUrl, {
    max: 2,
    prepare: false,
    connection: {
      application_name: 'smart-fasal-domain-worker',
      idle_in_transaction_session_timeout: 5_000,
      lock_timeout: 1_000,
      statement_timeout: 4_000,
    },
  });

  function transactionPort(transaction: Tx): WorkerSqlTransaction {
    return {
      async setLocalRole() {
        await transaction`select set_config('role', ${DOMAIN_WORKER_ROLE}, true)`;
      },
      readRolePosture: () =>
        transaction<RolePostureRow[]>`
          select current_user as current_role, rolcanlogin, rolbypassrls, rolsuper
          from pg_catalog.pg_roles
          where rolname = current_user
        `,
      readRelationPosture: () =>
        transaction<RelationPostureRow[]>`
          select namespace.nspname as schema_name,
                 relation.relname as relation_name,
                 owner.rolname as owner_name,
                 relation.relrowsecurity,
                 relation.relforcerowsecurity
          from pg_catalog.pg_class relation
          join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
          join pg_catalog.pg_roles owner on owner.oid = relation.relowner
          where (namespace.nspname, relation.relname) in (
            ('platform', 'integration_event'),
            ('platform', 'outbox')
          )
          order by namespace.nspname, relation.relname
        `,
      async verifyOutboxAccess() {
        await transaction`select outbox_id from platform.outbox where false`;
      },
      claim: (input) =>
        transaction<ClaimedOutboxRow[]>`
          with candidates as (
            select outbox_id
            from platform.outbox
            where environment = ${environment}
              and (
                (state in ('PENDING', 'FAILED') and available_at <= ${input.now})
                or (state = 'CLAIMED' and claim_expires_at < ${input.now})
              )
            order by available_at, outbox_id
            for update skip locked
            limit ${input.limit}
          )
          update platform.outbox as outbox
          set state = 'CLAIMED',
              claimed_by = ${input.workerId},
              claim_expires_at = ${input.claimExpiresAt},
              claim_token = ${input.claimToken}::uuid,
              attempt_count = outbox.attempt_count + 1
          from candidates
          where outbox.outbox_id = candidates.outbox_id
          returning outbox.outbox_id, outbox.integration_event_id, outbox.destination,
                    outbox.attempt_count, outbox.claimed_by, outbox.claim_token
        `,
      readIntegrationEvents(integrationEventIds) {
        if (integrationEventIds.length === 0) return Promise.resolve([]);
        return transaction<IntegrationEventRow[]>`
          select integration_event_id, destination, event_type, payload
          from platform.integration_event
          where environment = ${environment}
            and integration_event_id = any(${transaction.array([...integrationEventIds])}::uuid[])
        `;
      },
      markPublished: (input) =>
        transaction<DispositionRow[]>`
          update platform.outbox
          set state = 'PUBLISHED',
              published_at = ${input.publishedAt},
              claimed_by = null,
              claim_expires_at = null,
              claim_token = null
          where outbox_id = ${input.outboxId}::uuid
            and environment = ${environment}
            and state = 'CLAIMED'
            and claimed_by = ${input.workerId}
            and claim_token = ${input.claimToken}::uuid
            and attempt_count = ${input.attemptCount}
          returning outbox_id
        `,
      markRetry: (input) =>
        transaction<DispositionRow[]>`
          update platform.outbox
          set state = 'FAILED',
              available_at = ${input.availableAt},
              last_safe_problem_code = ${input.safeProblemCode},
              claimed_by = null,
              claim_expires_at = null,
              claim_token = null
          where outbox_id = ${input.outboxId}::uuid
            and environment = ${environment}
            and state = 'CLAIMED'
            and claimed_by = ${input.workerId}
            and claim_token = ${input.claimToken}::uuid
            and attempt_count = ${input.attemptCount}
          returning outbox_id
        `,
    };
  }

  async function executeTransaction<Result>(
    work: (transaction: WorkerSqlTransaction) => Promise<Result>,
  ): Promise<Result> {
    // postgres.js unwraps array-shaped transaction callback results at the type level. Wrapping
    // the application result keeps this generic OutboxStore transaction exact without a cast.
    const wrapped = await sql.begin(async (transaction) => ({
      value: await work(transactionPort(transaction as Tx)),
    }));
    return wrapped.value;
  }

  return {
    transaction: executeTransaction,
    close: () => sql.end({ timeout: 5 }),
  };
}

export class PostgresOutboxStore implements ReadinessAwareOutboxStore {
  readonly #pool: WorkerSqlPool;

  constructor(options: {
    readonly databaseUrl?: string;
    readonly environment: DomainWorkerEnvironment;
    readonly pool?: WorkerSqlPool;
  }) {
    if (options.pool !== undefined) {
      this.#pool = options.pool;
      return;
    }
    if (options.databaseUrl === undefined) {
      throw new DomainWorkerDependencyError('DATABASE_CONFIGURATION_MISSING');
    }
    this.#pool = createPostgresPool(options.databaseUrl, options.environment);
  }

  async checkReadiness(): Promise<DependencyReadiness> {
    try {
      await this.#pool.transaction(async (transaction) => {
        await this.#authorizeTransaction(transaction);
      });
      return { available: true };
    } catch (error) {
      return {
        available: false,
        code:
          error instanceof DomainWorkerDependencyError ? error.code : 'OUTBOX_STORE_UNAVAILABLE',
      };
    }
  }

  transaction<Result>(work: (transaction: OutboxTransaction) => Promise<Result>): Promise<Result> {
    return this.#pool.transaction(async (transaction) => {
      await this.#authorizeTransaction(transaction);
      const outboxTransaction: OutboxTransaction = {
        claim: async (input) => {
          const outboxRows = await transaction.claim(input);
          const integrationRows = await transaction.readIntegrationEvents(
            outboxRows.map((row) => row.integration_event_id),
          );
          return mapClaimedEntries(outboxRows, integrationRows);
        },
        markPublished: async (input) => (await transaction.markPublished(input)).length === 1,
        markRetry: async (input) => (await transaction.markRetry(input)).length === 1,
      };
      return work(outboxTransaction);
    });
  }

  close(): Promise<void> {
    return this.#pool.close();
  }

  async #authorizeTransaction(transaction: WorkerSqlTransaction): Promise<void> {
    await transaction.setLocalRole();
    const posture = await transaction.readRolePosture();
    if (!validDomainWorkerRolePosture(posture)) {
      throw new DomainWorkerDependencyError('ROLE_POSTURE_INVALID');
    }
    const relations = await transaction.readRelationPosture();
    if (!validProtectedRelationPosture(relations)) {
      throw new DomainWorkerDependencyError('ROLE_POSTURE_INVALID');
    }
    await transaction.verifyOutboxAccess();
  }
}
