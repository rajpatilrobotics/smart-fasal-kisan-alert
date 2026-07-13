import { createHmac } from 'node:crypto';

import { AuthorizationContextSchema } from '@smart-fasal/contracts/schemas';
import postgres, { type Sql, type TransactionSql } from 'postgres';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type AuthorizationDecision,
  type AuthorizationRequest,
  type RequestAuthorizer,
  type VerifiedRequestBoundary,
} from './boundary.js';
import type { DeploymentEnvironment } from './config.js';
import type {
  AssistedAccessSnapshot,
  AtomicDomainCommandCommit,
  AuditFactRecord,
  ConsentSnapshot,
  CurrentAuthoritySnapshot,
  DisclosureSnapshot,
  EncryptedProtectedFields,
  GuardedDomainSqlPort,
  GuardedDomainSqlTransaction,
  ProtectedDisclosureSqlPort,
  ProtectedDisclosureSqlTransaction,
  ProtectedFieldDecryptor,
  ReturnStateProtector,
  ReturnStateSqlPort,
  ReturnStateSqlTransaction,
  RoleContextRevocationSnapshot,
  RoleGrantSnapshot,
  SourceEventStorageFact,
  StoredCommandSnapshot,
} from './production-operations.js';

type RuntimeRole = 'sf_farmer_api' | 'sf_rsk_api';
type AuthStateRole = 'sf_auth_state_writer';
type Tx = TransactionSql<Record<string, never>>;
type PurposeCode = NonNullable<VerifiedRequestBoundary['authorization']>['purposeCode'];

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const READINESS_TIMEOUT_MS = 2_500;

interface RolePostureRow {
  current_role: string;
  rolcanlogin: boolean;
  rolbypassrls: boolean;
  rolsuper: boolean;
}

function authorizationDenied(code: Exclude<AuthorizationDecision, { allowed: true }>['code']) {
  return { allowed: false as const, code };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw dependencyUnavailable();
  return value;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : requiredString(value);
}

function requiredInteger(value: unknown): number {
  const converted = typeof value === 'string' ? Number(value) : value;
  if (!Number.isSafeInteger(converted) || Number(converted) < 0) throw dependencyUnavailable();
  return Number(converted);
}

function requiredBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw dependencyUnavailable();
  return value;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw dependencyUnavailable();
  }
  return [...value];
}

function parseRoleGrant(value: unknown): RoleGrantSnapshot {
  const row = record(value);
  if (row === undefined) throw dependencyUnavailable();
  const roleType = requiredString(row['roleType']);
  const destination = requiredString(row['destination']);
  const defaultPurposeCode = requiredString(row['defaultPurposeCode']);
  if (!['FARMER', 'RSK', 'MP'].includes(roleType)) throw dependencyUnavailable();
  if (!['/farmer/today', '/rsk/work', '/mp/overview'].includes(destination)) {
    throw dependencyUnavailable();
  }
  const officeId = optionalString(row['officeId']);
  const jurisdictionId = optionalString(row['jurisdictionId']);
  return {
    roleGrantId: requiredString(row['roleGrantId']),
    subjectId: requiredString(row['subjectId']),
    roleType: roleType as RoleGrantSnapshot['roleType'],
    ...(officeId === undefined ? {} : { officeId }),
    ...(jurisdictionId === undefined ? {} : { jurisdictionId }),
    destination: destination as RoleGrantSnapshot['destination'],
    authorizationVersion: requiredInteger(row['authorizationVersion']),
    capabilitySetVersion: requiredInteger(row['capabilitySetVersion']),
    capabilities: stringArray(row['capabilities']) as RoleGrantSnapshot['capabilities'],
    defaultPurposeCode: defaultPurposeCode as RoleGrantSnapshot['defaultPurposeCode'],
    active: requiredBoolean(row['active']),
  };
}

export function parseCurrentAuthoritySnapshot(value: unknown): CurrentAuthoritySnapshot {
  const row = record(value);
  if (row === undefined) throw dependencyUnavailable();
  const subjectType = requiredString(row['subjectType']);
  const environment = requiredString(row['environment']);
  const status = requiredString(row['status']);
  const deviceBindingState = requiredString(row['deviceBindingState']);
  if (!['FARMER', 'STAFF'].includes(subjectType)) throw dependencyUnavailable();
  if (!['local', 'preview', 'staging', 'demo', 'production'].includes(environment)) {
    throw dependencyUnavailable();
  }
  if (!['ACTIVE', 'DISABLED', 'DELETED'].includes(status)) throw dependencyUnavailable();
  if (!['ACTIVE', 'REQUIRED', 'REVOKED'].includes(deviceBindingState)) {
    throw dependencyUnavailable();
  }
  const activeRoleContext =
    row['activeRoleContext'] === undefined
      ? undefined
      : AuthorizationContextSchema.safeParse(row['activeRoleContext']);
  if (activeRoleContext !== undefined && !activeRoleContext.success) throw dependencyUnavailable();
  const rolesValue = row['roles'];
  if (!Array.isArray(rolesValue)) throw dependencyUnavailable();
  const farmerProfileRow = record(row['farmerProfile']);
  const locale =
    farmerProfileRow === undefined ? undefined : requiredString(farmerProfileRow['locale']);
  const onboardingState =
    farmerProfileRow === undefined
      ? undefined
      : requiredString(farmerProfileRow['onboardingState']);
  if (locale !== undefined && !['mr', 'hi', 'en'].includes(locale)) throw dependencyUnavailable();
  if (
    onboardingState !== undefined &&
    !['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'].includes(onboardingState)
  ) {
    throw dependencyUnavailable();
  }
  return {
    subjectId: requiredString(row['subjectId']),
    subjectType: subjectType as CurrentAuthoritySnapshot['subjectType'],
    environment: environment as CurrentAuthoritySnapshot['environment'],
    securityVersion: requiredInteger(row['securityVersion']),
    authorizationVersion: requiredInteger(row['authorizationVersion']),
    status: status as CurrentAuthoritySnapshot['status'],
    deviceBindingState: deviceBindingState as CurrentAuthoritySnapshot['deviceBindingState'],
    capabilitySetVersion: requiredInteger(row['capabilitySetVersion']),
    roles: rolesValue.map(parseRoleGrant),
    ...(activeRoleContext?.success === true ? { activeRoleContext: activeRoleContext.data } : {}),
    ...(locale === undefined || onboardingState === undefined
      ? {}
      : {
          farmerProfile: {
            locale: locale as 'mr' | 'hi' | 'en',
            onboardingState: onboardingState as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE',
          },
        }),
  };
}

async function setRoleAndCheck(transaction: Tx, role: RuntimeRole | AuthStateRole): Promise<void> {
  await transaction`select set_config('role', ${role}, true)`;
  const rows = await transaction<RolePostureRow[]>`
    select current_user as current_role, rolcanlogin, rolbypassrls, rolsuper
    from pg_catalog.pg_roles where rolname = current_user
  `;
  const posture = rows[0];
  if (
    posture?.current_role !== role ||
    posture.rolcanlogin ||
    posture.rolbypassrls ||
    posture.rolsuper
  ) {
    throw dependencyUnavailable();
  }
}

async function bindRequestContext(
  transaction: Tx,
  role: RuntimeRole,
  boundary: VerifiedRequestBoundary,
  purposeCode?: PurposeCode,
  contextOverride?: NonNullable<VerifiedRequestBoundary['authorization']>,
): Promise<void> {
  const identity = boundary.identity;
  if (identity === undefined) throw dependencyUnavailable();
  const context = contextOverride ?? boundary.authorization;
  const surface = role === 'sf_farmer_api' ? 'FARMER' : 'RSK';
  const purpose =
    purposeCode ??
    context?.purposeCode ??
    (surface === 'FARMER' ? 'farmer.self_service' : 'assisted.service');
  await transaction`select
    set_config('app.environment', ${boundary.environment}, true),
    set_config('app.surface', ${surface}, true),
    set_config('app.subject_id', ${identity.subjectId}, true),
    set_config('app.role_context_id', ${context?.roleContextId ?? NIL_UUID}, true),
    set_config('app.role_type', ${context?.roleType ?? surface}, true),
    set_config('app.purpose_code', ${purpose}, true),
    set_config('app.office_id', ${context?.officeId ?? NIL_UUID}, true),
    set_config('app.jurisdiction_id', ${context?.jurisdictionId ?? NIL_UUID}, true),
    set_config('app.authorization_version', ${String(context?.authorizationVersion ?? 0)}, true)
  `;
}

class RuntimePool {
  readonly sql: Sql;

  constructor(
    databaseUrl: string,
    readonly role: RuntimeRole,
  ) {
    this.sql = postgres(databaseUrl, { max: 4, prepare: false, connect_timeout: 2 });
  }

  async transaction<Result>(work: (transaction: Tx) => Promise<Result>): Promise<Result> {
    return (await this.sql.begin(async (transaction) => {
      await setRoleAndCheck(transaction, this.role);
      return work(transaction);
    })) as Result;
  }

  close(): Promise<void> {
    return this.sql.end({ timeout: 5 });
  }

  async ready(): Promise<boolean> {
    return boundedReadinessProbe(() =>
      this.transaction(async (transaction) => {
        await transaction`select 1`;
      }),
    );
  }
}

class AuthStatePool {
  readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 2, prepare: false, connect_timeout: 2 });
  }

  async transaction<Result>(work: (transaction: Tx) => Promise<Result>): Promise<Result> {
    return (await this.sql.begin(async (transaction) => {
      await setRoleAndCheck(transaction, 'sf_auth_state_writer');
      return work(transaction);
    })) as Result;
  }

  close(): Promise<void> {
    return this.sql.end({ timeout: 5 });
  }

  async ready(): Promise<boolean> {
    return boundedReadinessProbe(() =>
      this.transaction(async (transaction) => {
        await transaction`select 1`;
      }),
    );
  }
}

async function boundedReadinessProbe(work: () => Promise<void>): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          resolve(false);
        }, READINESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

async function loadAuthority(
  pool: RuntimePool,
  request: AuthorizationRequest,
): Promise<CurrentAuthoritySnapshot | undefined> {
  return pool.transaction(async (transaction) => {
    const rows = await transaction<{ snapshot: unknown }[]>`
      select identity.current_authority_snapshot(
        ${request.identity.subjectId}::uuid,
        ${request.identity.environment},
        ${request.installationId},
        ${request.appCheck.appId},
        ${request.roleContextId ?? NIL_UUID}::uuid
      ) as snapshot
    `;
    const snapshot = rows[0]?.snapshot;
    return snapshot === null || snapshot === undefined
      ? undefined
      : parseCurrentAuthoritySnapshot(snapshot);
  });
}

function expectedSurface(request: AuthorizationRequest): 'FARMER' | 'RSK' | undefined {
  if (request.surface === 'farmer') return 'FARMER';
  if (request.surface === 'rsk') return 'RSK';
  return request.identity.subjectType === 'FARMER' ? 'FARMER' : 'RSK';
}

function createPostgresRequestAuthorizer(options: {
  environment: DeploymentEnvironment;
  farmer?: RuntimePool;
  rsk?: RuntimePool;
  appIds: Readonly<{ farmer: readonly string[]; rsk: readonly string[]; mp: readonly string[] }>;
}): RequestAuthorizer {
  return {
    async authorize(request) {
      if (
        request.identity.environment !== options.environment ||
        request.appCheck.environment !== options.environment ||
        options.appIds.mp.includes(request.appCheck.appId)
      ) {
        return authorizationDenied('AUTHORIZATION_DENIED');
      }
      const surface = expectedSurface(request);
      if (
        surface === undefined ||
        (surface === 'FARMER' && request.identity.subjectType !== 'FARMER') ||
        (surface === 'RSK' && request.identity.subjectType !== 'STAFF')
      ) {
        return authorizationDenied('AUTHORIZATION_DENIED');
      }
      const allowedAppIds = surface === 'FARMER' ? options.appIds.farmer : options.appIds.rsk;
      if (!allowedAppIds.includes(request.appCheck.appId)) {
        return authorizationDenied('AUTHORIZATION_DENIED');
      }
      const pool = surface === 'FARMER' ? options.farmer : options.rsk;
      if (pool === undefined) throw dependencyUnavailable();
      const authority = await loadAuthority(pool, request);
      if (authority?.status !== 'ACTIVE') {
        return authorizationDenied('AUTHORIZATION_VERSION_CHANGED');
      }
      if (
        authority.subjectId !== request.identity.subjectId ||
        authority.subjectType !== request.identity.subjectType ||
        authority.environment !== options.environment ||
        authority.securityVersion !== request.identity.securityVersion
      ) {
        return authorizationDenied('AUTHORIZATION_VERSION_CHANGED');
      }

      const preContext = [
        'getAuthSession',
        'listRoles',
        'selectRoleContext',
        'revokeRoleContext',
      ].includes(request.operationId);
      if (preContext) {
        if (
          request.operationId === 'selectRoleContext' &&
          authority.deviceBindingState !== 'ACTIVE'
        ) {
          return authorizationDenied('DEVICE_BINDING_MISMATCH');
        }
        if (
          surface === 'RSK' &&
          request.operationId === 'selectRoleContext' &&
          request.identity.mfaState !== 'CURRENT'
        ) {
          return authorizationDenied('MFA_REQUIRED');
        }
        return { allowed: true };
      }

      if (authority.deviceBindingState !== 'ACTIVE') {
        return authorizationDenied('DEVICE_BINDING_MISMATCH');
      }
      const context = authority.activeRoleContext;
      if (context === undefined) {
        return authorizationDenied('AUTHORIZATION_VERSION_CHANGED');
      }
      if (
        context.subjectId !== authority.subjectId ||
        context.environment !== authority.environment ||
        context.authorizationVersion !== authority.authorizationVersion
      ) {
        return authorizationDenied('AUTHORIZATION_VERSION_CHANGED');
      }
      if (
        context.roleType !== surface ||
        (request.purpose !== undefined && context.purposeCode !== request.purpose) ||
        (request.capability !== undefined &&
          !context.capabilities.includes(request.capability as never))
      ) {
        return authorizationDenied('AUTHORIZATION_DENIED');
      }
      if (surface === 'RSK' && request.identity.mfaState !== 'CURRENT') {
        return authorizationDenied('MFA_REQUIRED');
      }
      return { allowed: true, context };
    },
  };
}

function parseStoredCommand(value: unknown): StoredCommandSnapshot | undefined {
  const row = record(value);
  if (row === undefined) return undefined;
  const state = requiredString(row['state']);
  if (!['IN_PROGRESS', 'COMPLETE', 'REJECTED'].includes(state)) throw dependencyUnavailable();
  const receipt = record(row['safeReceipt']);
  const startedAt = optionalString(row['startedAt']);
  return {
    commandHash: requiredString(row['commandHash']),
    authorizationVersion: requiredInteger(row['authorizationVersion']),
    state: state as StoredCommandSnapshot['state'],
    ...(receipt === undefined
      ? {}
      : { safeReceipt: receipt as unknown as NonNullable<StoredCommandSnapshot['safeReceipt']> }),
    ...(startedAt === undefined ? {} : { startedAt }),
  };
}

function parseConsent(row: Record<string, unknown>): ConsentSnapshot {
  const state = requiredString(row['state']);
  const targetKind = requiredString(row['target_kind'] ?? row['targetKind']);
  if (!['MISSING', 'ALLOWED', 'DENIED', 'EXPIRED', 'WITHDRAWN'].includes(state)) {
    throw dependencyUnavailable();
  }
  if (!['ACCOUNT', 'ASSISTED_FARMER_CONTEXT'].includes(targetKind)) throw dependencyUnavailable();
  const consentDecisionId = optionalString(row['consent_decision_id'] ?? row['consentDecisionId']);
  const expiresAt = optionalString(row['expires_at'] ?? row['expiresAt']);
  return {
    ...(consentDecisionId === undefined ? {} : { consentDecisionId }),
    subjectId: requiredString(row['subject_id'] ?? row['subjectId']),
    scopeKey: requiredString(row['scope_key'] ?? row['scopeKey']) as ConsentSnapshot['scopeKey'],
    purposeKey: requiredString(
      row['purpose_key'] ?? row['purposeKey'],
    ) as ConsentSnapshot['purposeKey'],
    targetKind: targetKind as ConsentSnapshot['targetKind'],
    targetId: requiredString(row['target_id'] ?? row['targetId']),
    state: state as ConsentSnapshot['state'],
    accessVersion: requiredInteger(row['access_version'] ?? row['accessVersion']),
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

async function loadCurrentAuthority(
  transaction: Tx,
  boundary: VerifiedRequestBoundary,
  requestedContextId?: string,
): Promise<CurrentAuthoritySnapshot> {
  const identity = boundary.identity;
  if (identity === undefined) throw dependencyUnavailable();
  const rows = await transaction<{ snapshot: unknown }[]>`
    select identity.current_authority_snapshot(
      ${identity.subjectId}::uuid,
      ${boundary.environment},
      ${boundary.installationId},
      ${boundary.appCheck.appId},
      ${requestedContextId ?? boundary.roleContextId ?? boundary.authorization?.roleContextId ?? NIL_UUID}::uuid
    ) as snapshot
  `;
  const snapshot = rows[0]?.snapshot;
  if (snapshot === null || snapshot === undefined) throw dependencyUnavailable();
  return parseCurrentAuthoritySnapshot(snapshot);
}

async function appendAuditFact(transaction: Tx, fact: AuditFactRecord): Promise<void> {
  await transaction`
    select audit.write_fact(
      ${fact.action}, ${fact.entityType}, ${fact.entityId}::uuid, ${fact.outcome},
      ${fact.reasonCode}, ${fact.correlationId}::uuid,
      ${fact.beforeRevision ?? null}::bigint, ${fact.afterRevision ?? null}::bigint
    )
  `;
}

async function insertSourceEvent(transaction: Tx, event: SourceEventStorageFact): Promise<void> {
  const table =
    event.eventClass === 'DOMAIN' ? 'platform.domain_event' : 'platform.technical_event';
  await transaction`
    insert into ${transaction(table)} (
      event_id, environment, owner_subject_id, event_type, event_version,
      aggregate_type, aggregate_id, aggregate_revision, event_ordinal,
      client_recorded_at, server_received_at, committed_at, actor_type, actor_ref,
      role_context_ref, device_ref, jurisdiction_id, purpose_code, consent_access_version,
      data_mode, provenance_types, mode_derivation_version, payload, classification,
      retention_policy_id, occurred_at, recorded_at, correlation_id, causation_id,
      producer_service, producer_build, retention_class, payload_schema_version, payload_checksum
    ) values (
      ${event.eventId}::uuid, ${event.environment}, ${event.ownerSubjectId}::uuid,
      ${event.eventName}, ${event.eventVersion}, ${event.aggregateType}, ${event.aggregateId}::uuid,
      ${event.aggregateRevision}, ${event.eventOrdinal}, ${event.clientRecordedAt ?? null}::timestamptz,
      ${event.serverReceivedAt}::timestamptz, ${event.committedAt}::timestamptz,
      ${event.actorType}, ${event.actorRef}::uuid, ${event.roleContextRef ?? null}::uuid,
      ${event.deviceRef ?? null}::uuid, ${event.jurisdictionId ?? null}::uuid,
      ${event.purposeCode ?? null}, ${event.consentAccessVersion ?? null}::bigint,
      ${event.dataMode}, ${[...event.provenanceTypes]}::text[], ${event.modeDerivationVersion},
      ${transaction.json(event.payload as never)}::jsonb,
      ${event.payloadClassification},
      (select retention_policy_id from platform.retention_policy
       where policy_key = ${event.retentionPolicyKey} and effective_at <= statement_timestamp()
       order by version desc limit 1),
      ${event.occurredAt}::timestamptz, ${event.recordedAt}::timestamptz,
      ${event.correlationId}::uuid, ${event.causationId}::uuid,
      ${event.producerService}, ${event.producerBuild}, ${event.retentionClass},
      ${event.payloadSchemaVersion}, ${event.payloadChecksum}
    )
  `;
}

class PostgresGuardedDomainPort implements GuardedDomainSqlPort {
  readonly role: RuntimeRole;

  constructor(private readonly pool: RuntimePool) {
    this.role = pool.role;
  }

  transaction<Result>(
    request: { boundary: VerifiedRequestBoundary; purposeCode?: PurposeCode },
    work: (transaction: GuardedDomainSqlTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.pool.transaction(async (sql) => {
      await bindRequestContext(sql, this.role, request.boundary, request.purposeCode);
      const bindSelectedContext = async (
        roleContextId: string,
      ): Promise<CurrentAuthoritySnapshot> => {
        const authority = await loadCurrentAuthority(sql, request.boundary, roleContextId);
        const context = authority.activeRoleContext;
        if (context === undefined) throw dependencyUnavailable();
        await bindRequestContext(sql, this.role, request.boundary, context.purposeCode, context);
        return authority;
      };

      const transaction: GuardedDomainSqlTransaction = {
        lockCurrentAuthority: () => loadCurrentAuthority(sql, request.boundary),
        async lockRoleGrant(roleGrantId) {
          const identity = request.boundary.identity;
          if (identity === undefined) throw dependencyUnavailable();
          const rows = await sql<{ snapshot: unknown }[]>`
            select identity.role_grant_snapshot(
              ${identity.subjectId}::uuid, ${request.boundary.environment}, ${roleGrantId}::uuid
            ) as snapshot
          `;
          const value = rows[0]?.snapshot;
          return value === null || value === undefined ? undefined : parseRoleGrant(value);
        },
        async lockRoleContextForRevocation(roleContextId) {
          const identity = request.boundary.identity;
          if (identity === undefined) throw dependencyUnavailable();
          const rows = await sql<{ snapshot: unknown }[]>`
            select identity.owned_role_context_snapshot(
              ${identity.subjectId}::uuid, ${request.boundary.environment}, ${roleContextId}::uuid
            ) as snapshot
          `;
          const value = record(rows[0]?.snapshot);
          if (value === undefined) return undefined;
          const roleType = requiredString(value['roleType']);
          if (!['FARMER', 'RSK'].includes(roleType)) throw dependencyUnavailable();
          const revoked = requiredBoolean(value['revoked']);
          if (!revoked) await bindSelectedContext(roleContextId);
          const purposeCode = optionalString(value['purposeCode']);
          const jurisdictionId = optionalString(value['jurisdictionId']);
          return {
            roleContextId: requiredString(value['roleContextId']),
            subjectId: requiredString(value['subjectId']),
            roleType: roleType as RoleContextRevocationSnapshot['roleType'],
            authorizationVersion: requiredInteger(value['authorizationVersion']),
            revision: requiredInteger(value['revision']),
            revoked,
            ...(purposeCode === undefined
              ? {}
              : {
                  purposeCode: purposeCode as NonNullable<
                    RoleContextRevocationSnapshot['purposeCode']
                  >,
                }),
            ...(jurisdictionId === undefined ? {} : { jurisdictionId }),
          };
        },
        async lockCommand(principalId, commandId) {
          const subjectId = request.boundary.identity?.subjectId;
          if (
            subjectId === undefined ||
            principalId !== `${request.boundary.environment}:${subjectId}`
          ) {
            throw dependencyUnavailable();
          }
          await sql`select pg_advisory_xact_lock(hashtextextended(${`${principalId}:${commandId}`}, 0))`;
        },
        async findCommand(_principalId, commandId) {
          const identity = request.boundary.identity;
          if (identity === undefined) throw dependencyUnavailable();
          const rows = await sql<{ snapshot: unknown }[]>`
            select platform.precontext_command_snapshot(
              ${identity.subjectId}::uuid, ${request.boundary.environment}, ${commandId}::uuid
            ) as snapshot
          `;
          return parseStoredCommand(rows[0]?.snapshot);
        },
        async currentRevision(target) {
          const identity = request.boundary.identity;
          if (identity === undefined) throw dependencyUnavailable();
          const rows = await sql<{ revision: string | number }[]>`
            select platform.command_target_revision(
              ${identity.subjectId}::uuid, ${request.boundary.environment},
              ${target.type}, ${target.id}::uuid
            ) as revision
          `;
          return requiredInteger(rows[0]?.revision);
        },
        async listConsents(subjectId) {
          const rows = await sql<Record<string, unknown>[]>`
            select subject_id, scope_key, purpose_key, target_kind, target_id,
                   consent_decision_id,
                   case when state = 'ALLOWED' and expires_at <= statement_timestamp()
                        then 'EXPIRED' else state end as state,
                   access_version,
                   case when expires_at is null then null else expires_at::text end as expires_at
            from consent.current_state
            where subject_id = ${subjectId}::uuid
            order by scope_key, purpose_key, target_kind, target_id
          `;
          const items = rows.map(parseConsent);
          return {
            items,
            revision: items.reduce((maximum, item) => Math.max(maximum, item.accessVersion), 0),
          };
        },
        async lockConsent(input) {
          const rows = await sql<Record<string, unknown>[]>`
            select subject_id, scope_key, purpose_key, target_kind, target_id,
                   consent_decision_id,
                   case when state = 'ALLOWED' and expires_at <= statement_timestamp()
                        then 'EXPIRED' else state end as state,
                   access_version,
                   case when expires_at is null then null else expires_at::text end as expires_at
            from consent.current_state
            where subject_id = ${input.subjectId}::uuid
              and scope_key = ${input.scopeKey} and purpose_key = ${input.purposeKey}
              and target_kind = ${input.targetKind} and target_id = ${input.targetId}::uuid
            for update
          `;
          return rows[0] === undefined ? undefined : parseConsent(rows[0]);
        },
        async consentTargetOwnedBy(subjectId, targetId) {
          const rows = await sql<{ owned: boolean }[]>`
            select exists (
              select 1 from identity.assisted_context
              where assisted_context_id = ${targetId}::uuid and farmer_subject_id = ${subjectId}::uuid
                and assignment_state <> 'CLOSED'
            ) as owned
          `;
          return rows[0]?.owned === true;
        },
        async consentPolicyIsCurrent(input) {
          const rows = await sql<{ current: boolean }[]>`
            select exists (
              select 1 from consent.policy_version
              where policy_version_id = ${input.policyVersionId}::uuid
                and scope_key = ${input.scopeKey} and purpose_key = ${input.purposeKey}
                and effective_at <= ${input.at}::timestamptz
                and (retired_at is null or retired_at > ${input.at}::timestamptz)
            ) as current
          `;
          return rows[0]?.current === true;
        },
        async lockAssistedAccess(input) {
          const rows = await sql<Record<string, unknown>[]>`
            select assisted.farmer_subject_id, assisted.assisted_context_id as target_id,
                   assisted.office_id, assisted.jurisdiction_id, assisted.assignment_state,
                   case when consent_state.state = 'ALLOWED'
                              and consent_state.expires_at <= statement_timestamp()
                        then 'EXPIRED'
                        else coalesce(consent_state.state, 'MISSING') end as consent_state,
                   coalesce(consent_state.access_version, 0) as consent_access_version,
                   case when consent_state.expires_at is null then null
                        else consent_state.expires_at::text end as consent_expires_at
            from identity.assisted_context assisted
            left join consent.current_state consent_state
              on consent_state.subject_id = assisted.farmer_subject_id
             and consent_state.scope_key = 'assisted_service.access'
             and consent_state.purpose_key = 'assisted.service'
             and consent_state.target_kind = 'ASSISTED_FARMER_CONTEXT'
             and consent_state.target_id = assisted.assisted_context_id
            where assisted.assisted_context_id = ${input.targetId}::uuid
              and assisted.farmer_subject_id = ${input.farmerSubjectId}::uuid
            for update of assisted
          `;
          const row = rows[0];
          if (row === undefined) return undefined;
          const assignmentState = requiredString(row['assignment_state']);
          const consentState = requiredString(row['consent_state']);
          if (!['ASSIGNED', 'UNASSIGNED'].includes(assignmentState)) return undefined;
          if (!['MISSING', 'ALLOWED', 'DENIED', 'EXPIRED', 'WITHDRAWN'].includes(consentState)) {
            throw dependencyUnavailable();
          }
          const consentExpiresAt = optionalString(row['consent_expires_at']);
          return {
            farmerSubjectId: requiredString(row['farmer_subject_id']),
            targetId: requiredString(row['target_id']),
            officeId: requiredString(row['office_id']),
            jurisdictionId: requiredString(row['jurisdiction_id']),
            consentState: consentState as AssistedAccessSnapshot['consentState'],
            consentAccessVersion: requiredInteger(row['consent_access_version']),
            ...(consentExpiresAt === undefined ? {} : { consentExpiresAt }),
            assignmentState: assignmentState as AssistedAccessSnapshot['assignmentState'],
          };
        },
        commitCommand: (commit) =>
          commitAtomicDomainCommand({
            sql,
            boundary: request.boundary,
            commit,
            bindSelectedContext,
          }),
      };
      return work(transaction);
    });
  }
}

async function applyMutationBeforeFacts(input: {
  sql: Tx;
  boundary: VerifiedRequestBoundary;
  commit: AtomicDomainCommandCommit;
  bindSelectedContext: (roleContextId: string) => Promise<CurrentAuthoritySnapshot>;
}): Promise<void> {
  const { sql, boundary, commit } = input;
  const mutation = commit.mutation;
  switch (mutation.kind) {
    case 'CREATE_ROLE_CONTEXT':
      await sql`
        select identity.create_role_context(
          ${mutation.roleContextId}::uuid, ${mutation.roleGrantId}::uuid,
          ${mutation.subjectId}::uuid, ${boundary.environment}, ${mutation.purposeCode},
          ${mutation.issuedAt}::timestamptz, ${mutation.expiresAt}::timestamptz,
          ${boundary.correlationId}::uuid,
          ${boundary.identity?.mfaState === 'CURRENT'}
        )
      `;
      await input.bindSelectedContext(mutation.roleContextId);
      return;
    case 'RECORD_CONSENT_DECISION':
      await sql`
        insert into consent.decision (
          consent_decision_id, subject_id, scope_key, purpose_key, target_kind, target_id,
          decision, policy_version_id, access_version, expires_at, actor_subject_id,
          recorded_at, correlation_id
        ) values (
          ${mutation.consentDecisionId}::uuid, ${mutation.subjectId}::uuid,
          ${mutation.scopeKey}, ${mutation.purposeKey}, ${mutation.targetKind},
          ${mutation.targetId}::uuid, ${mutation.decision}, ${mutation.policyVersionId}::uuid,
          ${mutation.accessVersion}, ${mutation.expiresAt ?? null}::timestamptz,
          ${mutation.actorSubjectId}::uuid, ${mutation.recordedAt}::timestamptz,
          ${boundary.correlationId}::uuid
        )
      `;
      await sql`
        insert into consent.current_state (
          subject_id, scope_key, purpose_key, target_kind, target_id,
          consent_decision_id, state, access_version, expires_at, updated_at
        ) values (
          ${mutation.subjectId}::uuid, ${mutation.scopeKey}, ${mutation.purposeKey},
          ${mutation.targetKind}, ${mutation.targetId}::uuid,
          ${mutation.consentDecisionId}::uuid, ${mutation.state}, ${mutation.accessVersion},
          ${mutation.expiresAt ?? null}::timestamptz, ${mutation.recordedAt}::timestamptz
        ) on conflict (subject_id, scope_key, purpose_key, target_kind, target_id)
        do update set
          consent_decision_id = excluded.consent_decision_id,
          state = excluded.state,
          access_version = excluded.access_version,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
        where consent.current_state.access_version < excluded.access_version
      `;
      for (const operationKind of mutation.revocationOperations) {
        await sql`
          insert into consent.revocation_operation (
            subject_id, scope_key, purpose_key, target_kind, target_id,
            access_version, operation_kind, state, created_at
          ) values (
            ${mutation.subjectId}::uuid, ${mutation.scopeKey}, ${mutation.purposeKey},
            ${mutation.targetKind}, ${mutation.targetId}::uuid, ${mutation.accessVersion},
            ${operationKind}, 'PENDING', ${mutation.recordedAt}::timestamptz
          )
        `;
      }
      if (mutation.invalidateAccessGrants) {
        await sql`
          select consent.revoke_subject_access_grants(
            ${mutation.subjectId}::uuid, ${mutation.scopeKey}, ${mutation.purposeKey},
            ${mutation.targetKind}, ${mutation.targetId}::uuid, ${mutation.accessVersion},
            ${boundary.correlationId}::uuid
          )
        `;
      }
      return;
    case 'ISSUE_ACCESS_GRANT':
      await sql`
        select consent.issue_access_grant(
          ${mutation.accessGrantId}::uuid, ${mutation.farmerSubjectId}::uuid,
          ${mutation.targetId}::uuid, ${mutation.accessVersion},
          ${mutation.expiresAt}::timestamptz, ${boundary.correlationId}::uuid
        )
      `;
      return;
    case 'REVOKE_ROLE_CONTEXT':
      await input.bindSelectedContext(mutation.roleContextId);
      return;
  }
}

async function applyMutationAfterFacts(input: {
  sql: Tx;
  boundary: VerifiedRequestBoundary;
  commit: AtomicDomainCommandCommit;
}): Promise<void> {
  const mutation = input.commit.mutation;
  if (mutation.kind === 'REVOKE_ROLE_CONTEXT') {
    const subjectId = input.boundary.identity?.subjectId;
    if (subjectId === undefined) throw dependencyUnavailable();
    await input.sql`
      select identity.revoke_role_context(
        ${mutation.roleContextId}::uuid, ${subjectId}::uuid, ${input.boundary.environment},
        ${mutation.revokedAt}::timestamptz, ${input.boundary.correlationId}::uuid
      )
    `;
  }
  if (mutation.kind === 'RECORD_CONSENT_DECISION' && mutation.invalidateRoleContexts) {
    await input.sql`
      select identity.invalidate_subject_role_contexts(
        ${mutation.subjectId}::uuid, ${input.boundary.correlationId}::uuid
      )
    `;
  }
}

async function commitAtomicDomainCommand(input: {
  sql: Tx;
  boundary: VerifiedRequestBoundary;
  commit: AtomicDomainCommandCommit;
  bindSelectedContext: (roleContextId: string) => Promise<CurrentAuthoritySnapshot>;
}): Promise<void> {
  const { sql, boundary, commit } = input;
  const identity = boundary.identity;
  const expectedPrincipal =
    identity === undefined ? undefined : `${boundary.environment}:${identity.subjectId}`;
  if (
    identity === undefined ||
    commit.command.environment !== boundary.environment ||
    commit.command.principalId !== expectedPrincipal ||
    commit.sourceEvents.some(
      (event) =>
        event.environment !== boundary.environment || event.ownerSubjectId !== identity.subjectId,
    ) ||
    commit.integrationEvents.some(
      (event) =>
        event.environment !== boundary.environment || event.ownerSubjectId !== identity.subjectId,
    ) ||
    commit.outbox.some(
      (entry) =>
        entry.environment !== boundary.environment || entry.ownerSubjectId !== identity.subjectId,
    )
  ) {
    throw dependencyUnavailable();
  }
  const bindSelectedContext = input.bindSelectedContext;
  await applyMutationBeforeFacts({
    sql,
    boundary,
    commit,
    bindSelectedContext,
  });
  const boundVersion = await sql<{ authorization_version: string | number }[]>`
    select platform.request_bigint('app.authorization_version') as authorization_version
  `;
  if (
    requiredInteger(boundVersion[0]?.authorization_version) !== commit.command.authorizationVersion
  ) {
    throw dependencyUnavailable();
  }

  for (const fact of commit.auditFacts) await appendAuditFact(sql, fact);

  await sql`
    insert into platform.command_execution (
      environment, principal_id, command_id, operation, command_hash,
      expected_revision, state, safe_receipt, authorization_version,
      started_at, completed_at, retain_until
    ) values (
      ${commit.command.environment}, ${commit.command.principalId},
      ${commit.command.commandId}::uuid, ${commit.command.operation},
      ${commit.command.commandHash}, ${commit.command.expectedRevision},
      ${commit.command.state},
      ${sql.json(commit.command.safeReceipt as never)}::jsonb,
      ${commit.command.authorizationVersion}, statement_timestamp(), statement_timestamp(),
      statement_timestamp() + make_interval(days => (
        select duration_days from platform.retention_policy
        where policy_key = ${commit.command.retentionPolicyKey}
          and effective_at <= statement_timestamp()
        order by version desc limit 1
      ))
    )
  `;

  for (const event of commit.sourceEvents) await insertSourceEvent(sql, event);
  for (const event of commit.integrationEvents) {
    await sql`
      insert into platform.integration_event (
        integration_event_id, environment, owner_subject_id, source_event_id,
        destination, event_type, payload, classification, occurred_at
      ) values (
        ${event.integrationEventId}::uuid, ${event.environment}, ${event.ownerSubjectId}::uuid,
        ${event.sourceEventId}::uuid, ${event.destination}, ${event.eventName},
        ${sql.json(event.payload as never)}::jsonb,
        ${event.payloadClassification}, ${event.occurredAt}::timestamptz
      )
    `;
  }
  for (const entry of commit.outbox) {
    await sql`
      insert into platform.outbox (
        outbox_id, environment, owner_subject_id, integration_event_id,
        destination, state, available_at
      ) values (
        ${entry.outboxId}::uuid, ${entry.environment}, ${entry.ownerSubjectId}::uuid,
        ${entry.integrationEventId}::uuid, ${entry.destination}, ${entry.state},
        ${entry.availableAt}::timestamptz
      )
    `;
  }
  await applyMutationAfterFacts({ sql, boundary, commit });
}

class PostgresProtectedDisclosurePort implements ProtectedDisclosureSqlPort {
  readonly role = 'sf_rsk_api' as const;

  constructor(private readonly pool: RuntimePool) {
    if (pool.role !== this.role) throw dependencyUnavailable();
  }

  transaction<Result>(
    request: { boundary: VerifiedRequestBoundary; purposeCode: 'assisted.service' },
    work: (transaction: ProtectedDisclosureSqlTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.pool.transaction(async (sql) => {
      await bindRequestContext(sql, this.role, request.boundary, request.purposeCode);
      const transaction: ProtectedDisclosureSqlTransaction = {
        lockCurrentAuthority: () => loadCurrentAuthority(sql, request.boundary),
        async lockDisclosure(targetId) {
          const rows = await sql<{ snapshot: unknown }[]>`
            select consent.disclosure_snapshot(${targetId}::uuid) as snapshot
          `;
          const row = record(rows[0]?.snapshot);
          if (row === undefined) return undefined;
          const grantState = requiredString(row['grantState']);
          const consentState = requiredString(row['consentState']);
          if (!['ACTIVE', 'EXPIRED', 'REVOKED'].includes(grantState)) throw dependencyUnavailable();
          if (!['MISSING', 'ALLOWED', 'DENIED', 'EXPIRED', 'WITHDRAWN'].includes(consentState)) {
            throw dependencyUnavailable();
          }
          return {
            subjectId: requiredString(row['subjectId']),
            granteeSubjectId: requiredString(row['granteeSubjectId']),
            targetId: requiredString(row['targetId']),
            authorizationVersion: requiredInteger(row['authorizationVersion']),
            accessVersion: requiredInteger(row['accessVersion']),
            grantId: requiredString(row['grantId']),
            grantState: grantState as DisclosureSnapshot['grantState'],
            consentState: consentState as DisclosureSnapshot['consentState'],
            roleContextId: requiredString(row['roleContextId']),
            officeId: requiredString(row['officeId']),
            jurisdictionId: requiredString(row['jurisdictionId']),
            purposeCode: requiredString(row['purposeCode']) as DisclosureSnapshot['purposeCode'],
          };
        },
        appendAuditFact: (fact) => appendAuditFact(sql, fact),
        async readEncryptedProtectedFields(targetId) {
          const rows = await sql<
            {
              encrypted_display_name: Uint8Array | null;
              encrypted_contact: Uint8Array | null;
              key_reference: string;
            }[]
          >`
            select encrypted_display_name, encrypted_contact, key_reference
            from identity.read_protected_fields_after_audit(
              ${targetId}::uuid, ${request.boundary.correlationId}::uuid
            )
          `;
          const row = rows[0];
          if (
            row?.encrypted_display_name === null ||
            row?.encrypted_display_name === undefined ||
            row.encrypted_contact === null
          ) {
            return undefined;
          }
          return {
            encryptedDisplayName: row.encrypted_display_name,
            encryptedContact: row.encrypted_contact,
            keyReference: row.key_reference,
          } satisfies EncryptedProtectedFields;
        },
      };
      return work(transaction);
    });
  }
}

class PostgresReturnStatePort implements ReturnStateSqlPort {
  readonly purpose = 'ephemeral-auth-state' as const;

  constructor(private readonly pool: AuthStatePool) {}

  transaction<Result>(
    work: (transaction: ReturnStateSqlTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.pool.transaction((sql) =>
      work({
        async insert(input) {
          try {
            await sql`
              select identity.create_auth_return_state(
                ${input.returnStateRecordId}::uuid, ${input.routeKey}, ${input.environment},
                ${input.appId}, ${input.origin}, ${input.opaqueStateHash}, ${input.rateLimitKey},
                ${input.expiresAt}::timestamptz, ${input.createdAt}::timestamptz
              )
            `;
          } catch (error) {
            const problem = translateReturnStateSqlError(error);
            if (problem !== undefined) throw problem;
            throw error;
          }
        },
      }),
    );
  }
}

/** Maps only the dedicated SQLSTATE; messages/details are deliberately ignored. */
export function translateReturnStateSqlError(error: unknown): ApiBoundaryProblem | undefined {
  if (record(error)?.['code'] !== 'P4290') return undefined;
  return new ApiBoundaryProblem({
    code: 'RATE_LIMITED',
    status: 429,
    title: 'Too many return-state requests.',
    retryable: true,
  });
}

export function createHmacReturnStateProtector(secret: string): ReturnStateProtector {
  if (Buffer.byteLength(secret, 'utf8') < 32)
    throw new TypeError('Return-state HMAC secret is too short.');
  const digest = (label: string, values: readonly string[]): string => {
    const hmac = createHmac('sha256', secret).update(label, 'utf8');
    for (const value of values) hmac.update('\0', 'utf8').update(value, 'utf8');
    return hmac.digest('hex');
  };
  return {
    digest: (input) =>
      Promise.resolve(
        digest('smart-fasal:return-state:v1', [
          input.returnStateId,
          input.environment,
          input.appId,
          input.origin,
          input.routeKey,
        ]),
      ),
    rateLimitDigest: (input) =>
      Promise.resolve(
        digest('smart-fasal:return-state-rate:v1', [
          input.environment,
          input.appId,
          input.origin,
          input.installationId,
        ]),
      ),
  };
}

export interface ProductionPostgresBoundary {
  authorizer: RequestAuthorizer;
  farmer?: GuardedDomainSqlPort;
  rsk?: GuardedDomainSqlPort;
  protectedDisclosure?: ProtectedDisclosureSqlPort;
  protectedFieldDecryptor?: ProtectedFieldDecryptor;
  returnState?: ReturnStateSqlPort;
  returnStateProtector?: ReturnStateProtector;
  configured: boolean;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export function createProductionPostgresBoundary(options: {
  environment: DeploymentEnvironment;
  databaseUrls: Readonly<{
    farmer?: string | undefined;
    rsk?: string | undefined;
    authState?: string | undefined;
  }>;
  appIds: Readonly<{ farmer: readonly string[]; rsk: readonly string[]; mp: readonly string[] }>;
  returnStateHmacSecret?: string | undefined;
  protectedFieldDecryptor?: ProtectedFieldDecryptor | undefined;
}): ProductionPostgresBoundary {
  const farmerPool =
    options.databaseUrls.farmer === undefined
      ? undefined
      : new RuntimePool(options.databaseUrls.farmer, 'sf_farmer_api');
  const rskPool =
    options.databaseUrls.rsk === undefined
      ? undefined
      : new RuntimePool(options.databaseUrls.rsk, 'sf_rsk_api');
  const authStatePool =
    options.databaseUrls.authState === undefined
      ? undefined
      : new AuthStatePool(options.databaseUrls.authState);
  const returnStateProtector =
    options.returnStateHmacSecret === undefined
      ? undefined
      : createHmacReturnStateProtector(options.returnStateHmacSecret);
  const farmer = farmerPool === undefined ? undefined : new PostgresGuardedDomainPort(farmerPool);
  const rsk = rskPool === undefined ? undefined : new PostgresGuardedDomainPort(rskPool);
  const protectedDisclosure =
    rskPool === undefined ? undefined : new PostgresProtectedDisclosurePort(rskPool);
  const returnState =
    authStatePool === undefined ? undefined : new PostgresReturnStatePort(authStatePool);
  const configured =
    farmer !== undefined &&
    rsk !== undefined &&
    protectedDisclosure !== undefined &&
    returnState !== undefined &&
    returnStateProtector !== undefined &&
    options.appIds.farmer.length > 0 &&
    options.appIds.rsk.length > 0;
  return {
    authorizer: createPostgresRequestAuthorizer({
      environment: options.environment,
      appIds: options.appIds,
      ...(farmerPool === undefined ? {} : { farmer: farmerPool }),
      ...(rskPool === undefined ? {} : { rsk: rskPool }),
    }),
    ...(farmer === undefined ? {} : { farmer }),
    ...(rsk === undefined ? {} : { rsk }),
    ...(protectedDisclosure === undefined ? {} : { protectedDisclosure }),
    ...(options.protectedFieldDecryptor === undefined
      ? {}
      : { protectedFieldDecryptor: options.protectedFieldDecryptor }),
    ...(returnState === undefined ? {} : { returnState }),
    ...(returnStateProtector === undefined ? {} : { returnStateProtector }),
    configured,
    // KMS/decryption is an optional provider dependency in M1. Its route returns typed
    // Unavailable when no decryptor is injected; readiness probes only mandatory database roles.
    ready: async () => {
      if (
        !configured ||
        farmerPool === undefined ||
        rskPool === undefined ||
        authStatePool === undefined
      ) {
        return false;
      }
      const results = await Promise.all([
        farmerPool.ready(),
        rskPool.ready(),
        authStatePool.ready(),
      ]);
      return results.every(Boolean);
    },
    close: async () => {
      await Promise.all(
        [farmerPool, rskPool, authStatePool]
          .filter((pool): pool is RuntimePool | AuthStatePool => pool !== undefined)
          .map(async (pool) => pool.close()),
      );
    },
  };
}
