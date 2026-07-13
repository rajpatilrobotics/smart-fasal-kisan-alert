import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  REVOCATION_OPERATIONS_BY_SCOPE,
  hashSemanticCommand,
  type RevocationOperationKind,
  type SafeCommandReceipt,
  type SemanticCommand,
} from '@smart-fasal/application';
import {
  MilestoneOneEventSchema,
  IssueAccessGrantCommandSchema,
  RecordConsentDecisionCommandSchema,
  ReturnStateRequestSchema,
  RoleContextCreatedPayloadSchema,
  RoleContextRevokedPayloadSchema,
  SelectRoleContextCommandSchema,
  ConsentDecisionRecordedPayloadSchema,
  type AuthorizationContext,
} from '@smart-fasal/contracts/schemas';
import { canonicalize } from 'json-canonicalize';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type DomainOperationAdapter,
  type DomainOperationRequest,
  type ProtectedDisclosureService,
  type VerifiedRequestBoundary,
} from './boundary.js';

type CapabilityKey = AuthorizationContext['capabilities'][number];
type ConsentScopeKey = keyof typeof REVOCATION_OPERATIONS_BY_SCOPE;
type ConsentState = 'MISSING' | 'ALLOWED' | 'DENIED' | 'EXPIRED' | 'WITHDRAWN';
type PurposeCode = AuthorizationContext['purposeCode'];
type RuntimeDatabaseRole = 'sf_farmer_api' | 'sf_rsk_api';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_RETURN_STATE_TTL_MS = 5 * 60 * 1_000;
const EVENT_RETENTION_POLICY_KEY = 'event-default';
const COMMAND_RETENTION_POLICY_KEY = 'command-recovery';
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

type CommandOperationReceipt =
  | SafeCommandReceipt
  | {
      commandId: string;
      disposition: 'IN_PROGRESS';
      eventIds: readonly string[];
      serverReceivedAt: string;
    };

function uuidV7(): string {
  const timestamp = Date.now().toString(16).padStart(12, '0').slice(-12);
  const entropy = randomBytes(10).toString('hex');
  const variant = ((Number.parseInt(entropy.charAt(3), 16) & 0x3) | 0x8).toString(16);
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}-7${entropy.slice(0, 3)}-${variant}${entropy.slice(4, 7)}-${entropy.slice(7, 19)}`;
}

const DEFAULT_ID_SOURCE: ProductionIdSource = {
  next: (kind = 'UUID') => (kind === 'UUID_V7' ? uuidV7() : randomUUID()),
};

export interface ProductionIdSource {
  next(kind?: 'UUID' | 'UUID_V7'): string;
}

export interface ReturnStateProtector {
  /** Returns a one-way digest. The raw state value must never reach SQL or logs. */
  digest(input: {
    returnStateId: string;
    environment: string;
    appId: string;
    origin: string;
    routeKey: 'FARMER_HOME' | 'RSK_HOME' | 'MP_HOME';
  }): Promise<string>;
  /** Stable HMAC-only limiter key; raw installation/origin values never reach the table. */
  rateLimitDigest(input: {
    environment: string;
    appId: string;
    origin: string;
    installationId: string;
  }): Promise<string>;
}

export interface ReturnStateSqlTransaction {
  insert(input: {
    returnStateRecordId: string;
    routeKey: 'FARMER_HOME' | 'RSK_HOME' | 'MP_HOME';
    environment: string;
    appId: string;
    origin: string;
    opaqueStateHash: string;
    rateLimitKey: string;
    expiresAt: string;
    createdAt: string;
  }): Promise<void>;
}

/** A dedicated auth-state writer; it is not an MP operational database role. */
export interface ReturnStateSqlPort {
  readonly purpose: 'ephemeral-auth-state';
  transaction<Result>(
    work: (transaction: ReturnStateSqlTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export interface RoleGrantSnapshot {
  roleGrantId: string;
  subjectId: string;
  roleType: 'FARMER' | 'RSK' | 'MP';
  officeId?: string;
  jurisdictionId?: string;
  destination: '/farmer/today' | '/rsk/work' | '/mp/overview';
  authorizationVersion: number;
  capabilitySetVersion: number;
  capabilities: readonly CapabilityKey[];
  defaultPurposeCode: PurposeCode;
  active: boolean;
}

export interface CurrentAuthoritySnapshot {
  subjectId: string;
  subjectType: 'FARMER' | 'STAFF';
  environment: 'local' | 'preview' | 'staging' | 'demo' | 'production';
  securityVersion: number;
  authorizationVersion: number;
  status: 'ACTIVE' | 'DISABLED' | 'DELETED';
  deviceBindingState: 'ACTIVE' | 'REQUIRED' | 'REVOKED';
  capabilitySetVersion: number;
  roles: readonly RoleGrantSnapshot[];
  activeRoleContext?: AuthorizationContext;
  farmerProfile?: {
    locale: 'mr' | 'hi' | 'en';
    onboardingState: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  };
}

export interface StoredCommandSnapshot {
  commandHash: string;
  authorizationVersion: number;
  state: 'IN_PROGRESS' | 'COMPLETE' | 'REJECTED';
  safeReceipt?: SafeCommandReceipt;
  startedAt?: string;
}

export interface ConsentSnapshot {
  consentDecisionId?: string;
  subjectId: string;
  scopeKey: ConsentScopeKey;
  purposeKey: PurposeCode;
  targetKind: 'ACCOUNT' | 'ASSISTED_FARMER_CONTEXT';
  targetId: string;
  state: ConsentState;
  accessVersion: number;
  expiresAt?: string;
}

export interface AssistedAccessSnapshot {
  farmerSubjectId: string;
  targetId: string;
  officeId: string;
  jurisdictionId: string;
  consentState: ConsentState;
  consentAccessVersion: number;
  consentExpiresAt?: string;
  assignmentState: 'ASSIGNED' | 'UNASSIGNED';
}

export interface RoleContextRevocationSnapshot {
  roleContextId: string;
  subjectId: string;
  roleType: 'FARMER' | 'RSK';
  authorizationVersion: number;
  revision: number;
  revoked: boolean;
  purposeCode?: PurposeCode;
  jurisdictionId?: string;
}

export interface DisclosureSnapshot {
  subjectId: string;
  granteeSubjectId: string;
  targetId: string;
  authorizationVersion: number;
  accessVersion: number;
  grantId: string;
  grantState: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  consentState: ConsentState;
  roleContextId: string;
  officeId: string;
  jurisdictionId: string;
  purposeCode: PurposeCode;
}

export interface EncryptedProtectedFields {
  encryptedDisplayName: Uint8Array;
  encryptedContact: Uint8Array;
  keyReference: string;
}

export interface ProtectedFieldDecryptor {
  decrypt(input: EncryptedProtectedFields): Promise<{ displayName: string; contact: string }>;
}

export interface AuditFactRecord {
  action: string;
  entityType: string;
  entityId: string;
  outcome: 'ALLOW' | 'DENY';
  reasonCode: string;
  correlationId: string;
  beforeRevision?: number;
  afterRevision?: number;
}

/**
 * Canonical immutable EventEnvelope plus the storage-only class/environment/owner routing fields.
 * Publishers forward this envelope and must never reconstruct immutable metadata later.
 */
export interface SourceEventStorageFact {
  eventId: string;
  eventClass: 'DOMAIN' | 'TECHNICAL';
  eventName:
    'identity.role_context_created' | 'identity.role_context_revoked' | 'consent.decision_recorded';
  aggregateId: string;
  aggregateType: 'RoleContext' | 'ConsentDecision';
  aggregateRevision: number;
  eventOrdinal: number;
  eventVersion: 1;
  environment: 'local' | 'preview' | 'staging' | 'demo' | 'production';
  ownerSubjectId: string;
  payload: Readonly<Record<string, unknown>>;
  payloadClassification: 'C2';
  retentionPolicyKey: typeof EVENT_RETENTION_POLICY_KEY;
  occurredAt: string;
  clientRecordedAt?: string;
  serverReceivedAt: string;
  recordedAt: string;
  committedAt: string;
  actorType: 'FARMER' | 'RSK_STAFF';
  actorRef: string;
  roleContextRef?: string;
  deviceRef?: string;
  jurisdictionId?: string;
  purposeCode?: PurposeCode;
  consentAccessVersion?: number;
  dataMode: 'LIVE' | 'SIMULATED';
  provenanceTypes: readonly ('FARMER_MANUAL' | 'RSK_MANUAL')[];
  modeDerivationVersion: 'm1-command-environment-v1';
  correlationId: string;
  causationId: string;
  producerService: 'domain-api';
  producerBuild: string;
  retentionClass: typeof EVENT_RETENTION_POLICY_KEY;
  payloadSchemaVersion: 1;
  payloadChecksum: string;
}

export interface IntegrationEventRecord {
  integrationEventId: string;
  sourceEventId: string;
  destination: 'domain-events';
  eventName: SourceEventStorageFact['eventName'];
  environment: SourceEventStorageFact['environment'];
  ownerSubjectId: string;
  payload: Readonly<Record<string, unknown>>;
  payloadClassification: 'C2';
  occurredAt: string;
}

export interface OutboxRecord {
  outboxId: string;
  integrationEventId: string;
  destination: IntegrationEventRecord['destination'];
  ownerSubjectId: string;
  environment: SourceEventStorageFact['environment'];
  state: 'PENDING';
  availableAt: string;
}

export type CommandMutation =
  | {
      kind: 'CREATE_ROLE_CONTEXT';
      roleContextId: string;
      roleGrantId: string;
      subjectId: string;
      roleType: 'FARMER' | 'RSK';
      officeId?: string;
      jurisdictionId?: string;
      authorizationVersion: number;
      capabilitySetVersion: number;
      purposeCode: PurposeCode;
      issuedAt: string;
      expiresAt: string;
    }
  | {
      kind: 'REVOKE_ROLE_CONTEXT';
      roleContextId: string;
      reasonCode: 'LOGOUT';
      revokedAt: string;
    }
  | {
      kind: 'RECORD_CONSENT_DECISION';
      consentDecisionId: string;
      subjectId: string;
      scopeKey: ConsentScopeKey;
      purposeKey: PurposeCode;
      targetKind: 'ACCOUNT' | 'ASSISTED_FARMER_CONTEXT';
      targetId: string;
      decision: 'ALLOW' | 'DENY' | 'WITHDRAW';
      state: Exclude<ConsentState, 'MISSING' | 'EXPIRED'>;
      policyVersionId: string;
      accessVersion: number;
      expiresAt?: string;
      actorSubjectId: string;
      recordedAt: string;
      invalidateRoleContexts: boolean;
      invalidateAccessGrants: boolean;
      revocationOperations: readonly RevocationOperationKind[];
    }
  | {
      kind: 'ISSUE_ACCESS_GRANT';
      accessGrantId: string;
      farmerSubjectId: string;
      targetId: string;
      granteeSubjectId: string;
      officeId: string;
      jurisdictionId: string;
      purposeCode: 'assisted.service';
      accessVersion: number;
      expiresAt: string;
      createdAt: string;
      accessGrantEvent: {
        eventType: 'ISSUED';
        grantVersion: 1;
        accessVersion: number;
        recordedAt: string;
        correlationId: string;
      };
    };

export interface AtomicDomainCommandCommit {
  command: {
    environment: string;
    principalId: string;
    commandId: string;
    commandHash: string;
    operation: string;
    expectedRevision: number;
    authorizationVersion: number;
    state: 'COMPLETE';
    safeReceipt: SafeCommandReceipt;
    retentionPolicyKey: typeof COMMAND_RETENTION_POLICY_KEY;
  };
  mutation: CommandMutation;
  auditFacts: readonly AuditFactRecord[];
  sourceEvents: readonly SourceEventStorageFact[];
  integrationEvents: readonly IntegrationEventRecord[];
  outbox: readonly OutboxRecord[];
}

export interface GuardedDomainSqlTransaction {
  lockCurrentAuthority(): Promise<CurrentAuthoritySnapshot>;
  lockRoleGrant(roleGrantId: string): Promise<RoleGrantSnapshot | undefined>;
  lockRoleContextForRevocation(
    roleContextId: string,
  ): Promise<RoleContextRevocationSnapshot | undefined>;
  lockCommand(principalId: string, commandId: string): Promise<void>;
  findCommand(principalId: string, commandId: string): Promise<StoredCommandSnapshot | undefined>;
  currentRevision(target: SemanticCommand['target']): Promise<number>;
  listConsents(subjectId: string): Promise<{ items: readonly ConsentSnapshot[]; revision: number }>;
  lockConsent(input: {
    subjectId: string;
    scopeKey: ConsentScopeKey;
    purposeKey: PurposeCode;
    targetKind: 'ACCOUNT' | 'ASSISTED_FARMER_CONTEXT';
    targetId: string;
  }): Promise<ConsentSnapshot | undefined>;
  consentTargetOwnedBy(subjectId: string, targetId: string): Promise<boolean>;
  consentPolicyIsCurrent(input: {
    policyVersionId: string;
    scopeKey: ConsentScopeKey;
    purposeKey: PurposeCode;
    at: string;
  }): Promise<boolean>;
  lockAssistedAccess(input: {
    farmerSubjectId: string;
    targetId: string;
  }): Promise<AssistedAccessSnapshot | undefined>;
  commitCommand(commit: AtomicDomainCommandCommit): Promise<void>;
}

export interface GuardedDomainSqlPort {
  readonly role: RuntimeDatabaseRole;
  /**
   * The implementation must bind only transaction-local authorization settings and must roll
   * back the complete callback on error. It must never expose a raw pooled client.
   */
  transaction<Result>(
    request: {
      boundary: VerifiedRequestBoundary;
      purposeCode?: PurposeCode;
    },
    work: (transaction: GuardedDomainSqlTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export interface ProtectedDisclosureSqlTransaction {
  lockCurrentAuthority(): Promise<CurrentAuthoritySnapshot>;
  lockDisclosure(targetId: string): Promise<DisclosureSnapshot | undefined>;
  appendAuditFact(fact: AuditFactRecord): Promise<void>;
  readEncryptedProtectedFields(targetId: string): Promise<EncryptedProtectedFields | undefined>;
}

/** Deliberately narrower than the mutation/query transaction and incapable of arbitrary SQL. */
export interface ProtectedDisclosureSqlPort {
  readonly role: 'sf_rsk_api';
  transaction<Result>(
    request: { boundary: VerifiedRequestBoundary; purposeCode: 'assisted.service' },
    work: (transaction: ProtectedDisclosureSqlTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export interface ProductionDomainCompositionOptions {
  returnState?: ReturnStateSqlPort;
  returnStateProtector?: ReturnStateProtector;
  farmer?: GuardedDomainSqlPort;
  rsk?: GuardedDomainSqlPort;
  protectedDisclosure?: ProtectedDisclosureSqlPort;
  protectedFieldDecryptor?: ProtectedFieldDecryptor;
  /** App IDs owned by the isolated MP surface; identity operations fail closed for these IDs. */
  mpAppIds?: readonly string[];
  now?: () => Date;
  ids?: ProductionIdSource;
  roleContextLifetimeMs?: number;
  returnStateLifetimeMs?: number;
  producerBuild?: string;
  milestoneTwoOperations?: DomainOperationAdapter;
  milestoneThreeOperations?: DomainOperationAdapter;
  /** Production must never report ready with the process-local M2 simulator. */
  requireDurableMilestoneTwo?: boolean;
}

export interface ProductionDomainComposition {
  operations: DomainOperationAdapter;
  protectedDisclosure: ProtectedDisclosureService;
  ready(): boolean;
}

function problem(
  code:
    | 'AUTHENTICATION_REQUIRED'
    | 'AUTHORIZATION_DENIED'
    | 'MFA_REQUIRED'
    | 'AUTHORIZATION_VERSION_CHANGED'
    | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
    | 'DEVICE_BINDING_MISMATCH'
    | 'IDEMPOTENCY_KEY_REUSED'
    | 'EXPECTED_REVISION_MISMATCH'
    | 'INVALID_STATE_TRANSITION',
): ApiBoundaryProblem {
  const status =
    code === 'AUTHENTICATION_REQUIRED'
      ? 401
      : code === 'IDEMPOTENCY_KEY_REUSED' ||
          code === 'EXPECTED_REVISION_MISMATCH' ||
          code === 'AUTHORIZATION_VERSION_CHANGED' ||
          code === 'CONSENT_OR_ACCESS_VERSION_CHANGED'
        ? 409
        : code === 'INVALID_STATE_TRANSITION'
          ? 400
          : 403;
  return new ApiBoundaryProblem({
    code,
    status,
    title:
      code === 'MFA_REQUIRED'
        ? 'Current staff MFA is required.'
        : code === 'AUTHENTICATION_REQUIRED'
          ? 'Valid authentication is required.'
          : code === 'INVALID_STATE_TRANSITION'
            ? 'The requested state transition is invalid.'
            : 'The request cannot be authorized in the current state.',
  });
}

function requiredIdentity(boundary: VerifiedRequestBoundary) {
  if (boundary.identity === undefined) throw problem('AUTHENTICATION_REQUIRED');
  return boundary.identity;
}

function commandId(boundary: VerifiedRequestBoundary): string {
  if (boundary.idempotencyKey === undefined) throw problem('INVALID_STATE_TRANSITION');
  return boundary.idempotencyKey;
}

function principalId(boundary: VerifiedRequestBoundary): string {
  return `${boundary.environment}:${requiredIdentity(boundary).subjectId}`;
}

function assertCurrentIdentity(
  boundary: VerifiedRequestBoundary,
  authority: CurrentAuthoritySnapshot,
): void {
  const identity = requiredIdentity(boundary);
  if (
    authority.status !== 'ACTIVE' ||
    authority.subjectId !== identity.subjectId ||
    authority.subjectType !== identity.subjectType ||
    authority.environment !== boundary.environment ||
    authority.environment !== identity.environment ||
    authority.securityVersion !== identity.securityVersion
  ) {
    throw problem('AUTHORIZATION_VERSION_CHANGED');
  }
}

function assertActiveDevice(authority: CurrentAuthoritySnapshot): void {
  if (authority.deviceBindingState !== 'ACTIVE') throw problem('DEVICE_BINDING_MISMATCH');
}

function assertCurrentContext(
  boundary: VerifiedRequestBoundary,
  authority: CurrentAuthoritySnapshot,
  expected: {
    roleType: 'FARMER' | 'RSK';
    purposeCode: PurposeCode;
    capabilities?: readonly CapabilityKey[];
  },
): AuthorizationContext {
  assertCurrentIdentity(boundary, authority);
  assertActiveDevice(authority);
  const supplied = boundary.authorization;
  const current = authority.activeRoleContext;
  if (
    supplied === undefined ||
    current === undefined ||
    supplied.environment !== authority.environment ||
    supplied.subjectId !== authority.subjectId ||
    supplied.roleContextId !== current.roleContextId ||
    supplied.roleType !== expected.roleType ||
    current.roleType !== expected.roleType ||
    supplied.purposeCode !== expected.purposeCode ||
    current.purposeCode !== expected.purposeCode ||
    supplied.authorizationVersion !== authority.authorizationVersion ||
    current.authorizationVersion !== authority.authorizationVersion ||
    supplied.capabilitySetVersion !== current.capabilitySetVersion ||
    supplied.officeId !== current.officeId ||
    supplied.jurisdictionId !== current.jurisdictionId
  ) {
    throw problem('AUTHORIZATION_VERSION_CHANGED');
  }
  for (const capability of expected.capabilities ?? []) {
    if (!current.capabilities.includes(capability)) throw problem('AUTHORIZATION_DENIED');
  }
  if (expected.roleType === 'RSK') {
    const identity = requiredIdentity(boundary);
    if (identity.subjectType !== 'STAFF') throw problem('AUTHORIZATION_DENIED');
    if (identity.mfaState !== 'CURRENT') throw problem('MFA_REQUIRED');
    if (current.officeId === undefined || current.jurisdictionId === undefined) {
      throw problem('AUTHORIZATION_DENIED');
    }
  }
  return current;
}

function portForBoundary(
  options: ProductionDomainCompositionOptions,
  boundary: VerifiedRequestBoundary,
): GuardedDomainSqlPort {
  if (options.mpAppIds?.includes(boundary.appCheck.appId) === true) {
    throw dependencyUnavailable();
  }
  const identity = requiredIdentity(boundary);
  const port = identity.subjectType === 'FARMER' ? options.farmer : options.rsk;
  if (port === undefined) throw dependencyUnavailable();
  const expectedRole: RuntimeDatabaseRole =
    identity.subjectType === 'FARMER' ? 'sf_farmer_api' : 'sf_rsk_api';
  if (port.role !== expectedRole) throw dependencyUnavailable();
  return port;
}

function safeReceiptReplay(
  existing: StoredCommandSnapshot,
  expectedHash: string,
  authorizationVersion: number,
  commandIdValue: string,
): CommandOperationReceipt {
  if (existing.commandHash !== expectedHash) throw problem('IDEMPOTENCY_KEY_REUSED');
  if (existing.authorizationVersion !== authorizationVersion) {
    throw problem('AUTHORIZATION_VERSION_CHANGED');
  }
  if (existing.state === 'IN_PROGRESS') {
    if (existing.startedAt === undefined) throw dependencyUnavailable();
    return {
      commandId: commandIdValue,
      disposition: 'IN_PROGRESS',
      eventIds: [],
      serverReceivedAt: existing.startedAt,
    };
  }
  if (existing.state !== 'COMPLETE' || existing.safeReceipt === undefined) {
    throw problem('INVALID_STATE_TRANSITION');
  }
  return { ...existing.safeReceipt, disposition: 'ALREADY_ACCEPTED' };
}

function validatedEventPayload(
  eventName: SourceEventStorageFact['eventName'],
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  try {
    switch (eventName) {
      case 'identity.role_context_created':
        return RoleContextCreatedPayloadSchema.parse(payload);
      case 'identity.role_context_revoked':
        return RoleContextRevokedPayloadSchema.parse(payload);
      case 'consent.decision_recorded':
        return ConsentDecisionRecordedPayloadSchema.parse(payload);
    }
  } catch {
    throw dependencyUnavailable();
  }
}

function sourceAndDelivery(input: {
  ids: ProductionIdSource;
  eventClass: SourceEventStorageFact['eventClass'];
  eventName: SourceEventStorageFact['eventName'];
  environment: SourceEventStorageFact['environment'];
  aggregateType: SourceEventStorageFact['aggregateType'];
  aggregateId: string;
  aggregateRevision: number;
  ownerSubjectId: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: string;
  correlationId: string;
  causationId: string;
  boundary: VerifiedRequestBoundary;
  clientRecordedAt?: string;
  purposeCode?: PurposeCode;
  consentAccessVersion?: number;
  roleContextRef?: string;
  jurisdictionId?: string;
  producerBuild: string;
}): {
  source: SourceEventStorageFact;
  integration: IntegrationEventRecord;
  outbox: OutboxRecord;
} {
  const eventId = input.ids.next('UUID_V7');
  if (!UUID_V7_PATTERN.test(eventId)) throw dependencyUnavailable();
  const integrationEventId = input.ids.next('UUID');
  const payload = validatedEventPayload(input.eventName, input.payload);
  const payloadChecksum = `sha256:${createHash('sha256')
    .update(canonicalize(payload), 'utf8')
    .digest('hex')}`;
  const identity = requiredIdentity(input.boundary);
  const actorType =
    identity.subjectType === 'FARMER' ? ('FARMER' as const) : ('RSK_STAFF' as const);
  const provenanceTypes = [
    identity.subjectType === 'FARMER' ? ('FARMER_MANUAL' as const) : ('RSK_MANUAL' as const),
  ];
  const dataMode = input.environment === 'production' ? ('LIVE' as const) : ('SIMULATED' as const);
  const installationId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      input.boundary.installationId,
    )
      ? input.boundary.installationId
      : undefined;
  const roleContextRef = input.roleContextRef ?? input.boundary.authorization?.roleContextId;
  const jurisdictionId = input.jurisdictionId ?? input.boundary.authorization?.jurisdictionId;
  const canonical = MilestoneOneEventSchema.parse({
    eventId,
    eventName: input.eventName,
    eventVersion: 1,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    aggregateRevision: input.aggregateRevision,
    eventOrdinal: input.aggregateRevision,
    occurredAt: input.occurredAt,
    ...(input.clientRecordedAt === undefined ? {} : { clientRecordedAt: input.clientRecordedAt }),
    serverReceivedAt: input.occurredAt,
    committedAt: input.occurredAt,
    actorType,
    actorRef: identity.subjectId,
    ...(roleContextRef === undefined ? {} : { roleContextRef }),
    ...(installationId === undefined ? {} : { deviceRef: installationId }),
    ...(jurisdictionId === undefined ? {} : { jurisdictionId }),
    ...(input.purposeCode === undefined ? {} : { purposeCode: input.purposeCode }),
    ...(input.consentAccessVersion === undefined
      ? {}
      : { consentAccessVersion: input.consentAccessVersion }),
    dataMode,
    provenanceTypes,
    modeDerivationVersion: 'm1-command-environment-v1',
    correlationId: input.correlationId,
    causationId: input.causationId,
    producerService: 'domain-api',
    producerBuild: input.producerBuild,
    payloadClassification: 'C2',
    retentionClass: EVENT_RETENTION_POLICY_KEY,
    payloadSchemaVersion: 1,
    payload,
    payloadChecksum,
  });
  return {
    source: {
      ...canonical,
      eventId,
      eventClass: input.eventClass,
      aggregateType: input.aggregateType,
      environment: input.environment,
      ownerSubjectId: input.ownerSubjectId,
      retentionPolicyKey: EVENT_RETENTION_POLICY_KEY,
      recordedAt: input.occurredAt,
    } as SourceEventStorageFact,
    integration: {
      integrationEventId,
      sourceEventId: eventId,
      destination: 'domain-events',
      eventName: input.eventName,
      environment: input.environment,
      ownerSubjectId: input.ownerSubjectId,
      payload,
      payloadClassification: 'C2',
      occurredAt: input.occurredAt,
    },
    outbox: {
      outboxId: input.ids.next('UUID'),
      integrationEventId,
      destination: 'domain-events',
      ownerSubjectId: input.ownerSubjectId,
      environment: input.environment,
      state: 'PENDING',
      availableAt: input.occurredAt,
    },
  };
}

function atomicCommit(input: {
  boundary: VerifiedRequestBoundary;
  semanticCommand: SemanticCommand;
  authorizationVersion: number;
  receipt: SafeCommandReceipt;
  mutation: CommandMutation;
  auditFacts?: readonly AuditFactRecord[];
  delivery?: ReturnType<typeof sourceAndDelivery>;
}): AtomicDomainCommandCommit {
  return {
    command: {
      environment: input.boundary.environment,
      principalId: principalId(input.boundary),
      commandId: input.semanticCommand.commandId,
      commandHash: hashSemanticCommand(input.semanticCommand),
      operation: input.semanticCommand.operation,
      expectedRevision: input.semanticCommand.expectedRevision,
      authorizationVersion: input.authorizationVersion,
      state: 'COMPLETE',
      safeReceipt: input.receipt,
      retentionPolicyKey: COMMAND_RETENTION_POLICY_KEY,
    },
    mutation: input.mutation,
    auditFacts: input.auditFacts ?? [],
    sourceEvents: input.delivery === undefined ? [] : [input.delivery.source],
    integrationEvents: input.delivery === undefined ? [] : [input.delivery.integration],
    outbox: input.delivery === undefined ? [] : [input.delivery.outbox],
  };
}

async function inPortTransaction<Result>(
  port: GuardedDomainSqlPort,
  boundary: VerifiedRequestBoundary,
  purposeCode: PurposeCode | undefined,
  work: (transaction: GuardedDomainSqlTransaction) => Promise<Result>,
): Promise<Result> {
  try {
    return await port.transaction(
      { boundary, ...(purposeCode === undefined ? {} : { purposeCode }) },
      work,
    );
  } catch (error) {
    if (error instanceof ApiBoundaryProblem) throw error;
    throw dependencyUnavailable();
  }
}

function sessionResponse(
  boundary: VerifiedRequestBoundary,
  authority: CurrentAuthoritySnapshot,
): Readonly<Record<string, unknown>> {
  assertCurrentIdentity(boundary, authority);
  return {
    subjectId: authority.subjectId,
    subjectType: authority.subjectType,
    environment: authority.environment,
    mfaState: requiredIdentity(boundary).mfaState,
    deviceBindingState: authority.deviceBindingState,
    authorizationVersion: authority.authorizationVersion,
    capabilitySetVersion: authority.capabilitySetVersion,
    ...(authority.activeRoleContext === undefined
      ? {}
      : { activeRoleContext: authority.activeRoleContext }),
    roles: authority.roles
      .filter((role) => role.active)
      .map((role) => ({
        roleGrantId: role.roleGrantId,
        roleType: role.roleType,
        ...(role.officeId === undefined ? {} : { officeId: role.officeId }),
        ...(role.jurisdictionId === undefined ? {} : { jurisdictionId: role.jurisdictionId }),
        destination: role.destination,
        capabilitySetVersion: role.capabilitySetVersion,
      })),
  };
}

function requireBody<T>(schema: { parse(value: unknown): T }, request: DomainOperationRequest): T {
  try {
    return schema.parse(request.body);
  } catch {
    throw problem('INVALID_STATE_TRANSITION');
  }
}

function assertExpectedRevision(boundary: VerifiedRequestBoundary, expectedRevision: number): void {
  if (boundary.expectedRevision === undefined || boundary.expectedRevision !== expectedRevision) {
    throw problem('EXPECTED_REVISION_MISMATCH');
  }
}

function validFutureTimestamp(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}

function assertRoleGrantSelection(
  boundary: VerifiedRequestBoundary,
  authority: CurrentAuthoritySnapshot,
  grant: RoleGrantSnapshot | undefined,
  payload: { officeId?: string | undefined; jurisdictionId?: string | undefined },
): asserts grant is RoleGrantSnapshot & { roleType: 'FARMER' | 'RSK' } {
  assertCurrentIdentity(boundary, authority);
  assertActiveDevice(authority);
  if (grant?.authorizationVersion !== authority.authorizationVersion) {
    throw problem('AUTHORIZATION_VERSION_CHANGED');
  }
  if (
    !grant.active ||
    grant.subjectId !== authority.subjectId ||
    grant.roleType === 'MP' ||
    !grant.capabilities.includes('identity.role_context.select') ||
    grant.officeId !== payload.officeId ||
    grant.jurisdictionId !== payload.jurisdictionId
  ) {
    throw problem('AUTHORIZATION_DENIED');
  }
  const identity = requiredIdentity(boundary);
  if (grant.roleType === 'FARMER') {
    if (identity.subjectType !== 'FARMER') throw problem('AUTHORIZATION_DENIED');
  } else {
    if (identity.subjectType !== 'STAFF') throw problem('AUTHORIZATION_DENIED');
    if (identity.mfaState !== 'CURRENT') throw problem('MFA_REQUIRED');
    if (grant.officeId === undefined || grant.jurisdictionId === undefined) {
      throw problem('AUTHORIZATION_DENIED');
    }
  }
}

async function executeReturnState(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
  now: Date,
): Promise<Readonly<Record<string, unknown>>> {
  const store = options.returnState;
  const protector = options.returnStateProtector;
  const origin = request.boundary.origin;
  if (store === undefined || protector === undefined || origin === undefined) {
    throw dependencyUnavailable();
  }
  const body = requireBody(ReturnStateRequestSchema, request);
  const ids = options.ids ?? DEFAULT_ID_SOURCE;
  const returnStateId = ids.next('UUID');
  const returnStateRecordId = ids.next('UUID');
  const expiresAt = new Date(
    now.getTime() + (options.returnStateLifetimeMs ?? DEFAULT_RETURN_STATE_TTL_MS),
  ).toISOString();
  let opaqueStateHash: string;
  let rateLimitKey: string;
  try {
    [opaqueStateHash, rateLimitKey] = await Promise.all([
      protector.digest({
        returnStateId,
        environment: request.boundary.environment,
        appId: request.boundary.appCheck.appId,
        origin,
        routeKey: body.routeKey,
      }),
      protector.rateLimitDigest({
        environment: request.boundary.environment,
        appId: request.boundary.appCheck.appId,
        origin,
        installationId: request.boundary.installationId,
      }),
    ]);
    if (!/^[0-9a-f]{64}$/u.test(opaqueStateHash) || !/^[0-9a-f]{64}$/u.test(rateLimitKey)) {
      throw new Error('invalid digest');
    }
    await store.transaction((transaction) =>
      transaction.insert({
        returnStateRecordId,
        routeKey: body.routeKey,
        environment: request.boundary.environment,
        appId: request.boundary.appCheck.appId,
        origin,
        opaqueStateHash,
        rateLimitKey,
        expiresAt,
        createdAt: now.toISOString(),
      }),
    );
  } catch (error) {
    if (error instanceof ApiBoundaryProblem) throw error;
    throw dependencyUnavailable();
  }
  return { returnStateId, expiresAt };
}

async function executeSession(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
): Promise<Readonly<Record<string, unknown>>> {
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, undefined, async (transaction) =>
    sessionResponse(request.boundary, await transaction.lockCurrentAuthority()),
  );
}

async function executeSelectRoleContext(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
  now: Date,
  ids: ProductionIdSource,
): Promise<CommandOperationReceipt> {
  const body = requireBody(SelectRoleContextCommandSchema, request);
  const id = commandId(request.boundary);
  const semanticCommand: SemanticCommand = {
    commandId: id,
    commandSchemaVersion: body.commandSchemaVersion,
    operation: body.operation,
    target: body.target,
    expectedRevision: body.expectedRevision,
    payload: body.payload,
  };
  const hash = hashSemanticCommand(semanticCommand);
  const principal = principalId(request.boundary);
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, undefined, async (transaction) => {
    await transaction.lockCommand(principal, id);
    const authority = await transaction.lockCurrentAuthority();
    const grant = await transaction.lockRoleGrant(body.payload.roleGrantId);
    assertRoleGrantSelection(request.boundary, authority, grant, body.payload);
    const existing = await transaction.findCommand(principal, id);
    if (existing !== undefined) {
      return safeReceiptReplay(existing, hash, authority.authorizationVersion, id);
    }
    if ((await transaction.currentRevision(body.target)) !== body.expectedRevision) {
      throw problem('EXPECTED_REVISION_MISMATCH');
    }
    const issuedAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + (options.roleContextLifetimeMs ?? 15 * 60 * 1_000),
    ).toISOString();
    const delivery = sourceAndDelivery({
      ids,
      eventClass: 'TECHNICAL',
      eventName: 'identity.role_context_created',
      environment: request.boundary.environment,
      aggregateType: 'RoleContext',
      aggregateId: body.target.id,
      aggregateRevision: body.expectedRevision + 1,
      ownerSubjectId: authority.subjectId,
      payload: {
        roleContextId: body.target.id,
        subjectId: authority.subjectId,
        roleType: grant.roleType,
        authorizationVersion: authority.authorizationVersion,
        capabilitySetVersion: grant.capabilitySetVersion,
        expiresAt,
      },
      occurredAt: issuedAt,
      correlationId: request.boundary.correlationId,
      causationId: id,
      boundary: request.boundary,
      clientRecordedAt: body.clientContext.clientRecordedAt,
      purposeCode: grant.defaultPurposeCode,
      roleContextRef: body.target.id,
      ...(grant.jurisdictionId === undefined ? {} : { jurisdictionId: grant.jurisdictionId }),
      producerBuild: options.producerBuild ?? 'domain-api-development',
    });
    const receipt: SafeCommandReceipt = {
      commandId: id,
      disposition: 'ACCEPTED',
      result: { type: 'roleContext', id: body.target.id, revision: body.expectedRevision + 1 },
      eventIds: [delivery.source.eventId],
      serverReceivedAt: issuedAt,
    };
    await transaction.commitCommand(
      atomicCommit({
        boundary: request.boundary,
        semanticCommand,
        authorizationVersion: authority.authorizationVersion,
        receipt,
        mutation: {
          kind: 'CREATE_ROLE_CONTEXT',
          roleContextId: body.target.id,
          roleGrantId: grant.roleGrantId,
          subjectId: authority.subjectId,
          roleType: grant.roleType,
          ...(grant.officeId === undefined ? {} : { officeId: grant.officeId }),
          ...(grant.jurisdictionId === undefined ? {} : { jurisdictionId: grant.jurisdictionId }),
          authorizationVersion: authority.authorizationVersion,
          capabilitySetVersion: grant.capabilitySetVersion,
          purposeCode: grant.defaultPurposeCode,
          issuedAt,
          expiresAt,
        },
        delivery,
      }),
    );
    return receipt;
  });
}

async function executeRevokeRoleContext(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
  now: Date,
  ids: ProductionIdSource,
): Promise<CommandOperationReceipt> {
  const roleContextId = request.params?.['roleContextId'];
  if (roleContextId === undefined) throw problem('INVALID_STATE_TRANSITION');
  const id = commandId(request.boundary);
  const semanticCommand: SemanticCommand = {
    commandId: id,
    commandSchemaVersion: request.boundary.clientSchemaVersion ?? 1,
    operation: 'RevokeRoleContext',
    target: { type: 'roleContext', id: roleContextId },
    expectedRevision: 0,
    payload: { reasonCode: 'LOGOUT' },
  };
  const hash = hashSemanticCommand(semanticCommand);
  const principal = principalId(request.boundary);
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, undefined, async (transaction) => {
    await transaction.lockCommand(principal, id);
    const authority = await transaction.lockCurrentAuthority();
    assertCurrentIdentity(request.boundary, authority);
    const existing = await transaction.findCommand(principal, id);
    if (existing !== undefined) {
      return safeReceiptReplay(existing, hash, authority.authorizationVersion, id);
    }
    const context = await transaction.lockRoleContextForRevocation(roleContextId);
    if (
      context?.subjectId !== authority.subjectId ||
      context.authorizationVersion !== authority.authorizationVersion
    ) {
      throw problem('AUTHORIZATION_DENIED');
    }
    if (context.revoked) throw problem('AUTHORIZATION_VERSION_CHANGED');
    const occurredAt = now.toISOString();
    const delivery = sourceAndDelivery({
      ids,
      eventClass: 'TECHNICAL',
      eventName: 'identity.role_context_revoked',
      environment: request.boundary.environment,
      aggregateType: 'RoleContext',
      aggregateId: roleContextId,
      aggregateRevision: context.revision + 1,
      ownerSubjectId: authority.subjectId,
      payload: {
        roleContextId,
        subjectId: authority.subjectId,
        authorizationVersion: authority.authorizationVersion,
        reasonCode: 'LOGOUT',
      },
      occurredAt,
      correlationId: request.boundary.correlationId,
      causationId: id,
      boundary: request.boundary,
      purposeCode:
        context.purposeCode ??
        (context.roleType === 'FARMER' ? 'farmer.self_service' : 'assisted.service'),
      roleContextRef: roleContextId,
      ...(context.jurisdictionId === undefined ? {} : { jurisdictionId: context.jurisdictionId }),
      producerBuild: options.producerBuild ?? 'domain-api-development',
    });
    const receipt: SafeCommandReceipt = {
      commandId: id,
      disposition: 'ACCEPTED',
      result: { type: 'roleContext', id: roleContextId, revision: context.revision + 1 },
      eventIds: [delivery.source.eventId],
      serverReceivedAt: occurredAt,
    };
    await transaction.commitCommand(
      atomicCommit({
        boundary: request.boundary,
        semanticCommand,
        authorizationVersion: authority.authorizationVersion,
        receipt,
        mutation: {
          kind: 'REVOKE_ROLE_CONTEXT',
          roleContextId,
          reasonCode: 'LOGOUT',
          revokedAt: occurredAt,
        },
        delivery,
      }),
    );
    return receipt;
  });
}

async function executeFarmerBootstrap(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
): Promise<Readonly<Record<string, unknown>>> {
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, 'farmer.self_service', async (transaction) => {
    const authority = await transaction.lockCurrentAuthority();
    const context = assertCurrentContext(request.boundary, authority, {
      roleType: 'FARMER',
      purposeCode: 'farmer.self_service',
    });
    if (authority.farmerProfile === undefined) throw dependencyUnavailable();
    return {
      subjectId: authority.subjectId,
      locale: authority.farmerProfile.locale,
      onboardingState: authority.farmerProfile.onboardingState,
      authorizationVersion: authority.authorizationVersion,
      capabilities: context.capabilities,
      farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
    };
  });
}

async function executeConsentList(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
): Promise<Readonly<Record<string, unknown>>> {
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, 'farmer.self_service', async (transaction) => {
    const authority = await transaction.lockCurrentAuthority();
    assertCurrentContext(request.boundary, authority, {
      roleType: 'FARMER',
      purposeCode: 'farmer.self_service',
    });
    const list = await transaction.listConsents(authority.subjectId);
    return {
      items: list.items.map((item) => ({
        ...(item.consentDecisionId === undefined
          ? {}
          : { consentDecisionId: item.consentDecisionId }),
        scopeKey: item.scopeKey,
        purposeKey: item.purposeKey,
        targetKind: item.targetKind,
        targetId: item.targetId,
        state: item.state,
        accessVersion: item.accessVersion,
        ...(item.expiresAt === undefined ? {} : { expiresAt: item.expiresAt }),
      })),
      revision: list.revision,
    };
  });
}

async function executeConsentDecision(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
  now: Date,
  ids: ProductionIdSource,
): Promise<CommandOperationReceipt> {
  const body = requireBody(RecordConsentDecisionCommandSchema, request);
  assertExpectedRevision(request.boundary, body.expectedRevision);
  const id = commandId(request.boundary);
  const semanticCommand: SemanticCommand = {
    commandId: id,
    commandSchemaVersion: body.commandSchemaVersion,
    operation: body.operation,
    target: body.target,
    expectedRevision: body.expectedRevision,
    payload: body.payload,
  };
  const hash = hashSemanticCommand(semanticCommand);
  const principal = principalId(request.boundary);
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, 'farmer.self_service', async (transaction) => {
    await transaction.lockCommand(principal, id);
    const authority = await transaction.lockCurrentAuthority();
    assertCurrentContext(request.boundary, authority, {
      roleType: 'FARMER',
      purposeCode: 'farmer.self_service',
    });
    const existing = await transaction.findCommand(principal, id);
    if (existing !== undefined) {
      return safeReceiptReplay(existing, hash, authority.authorizationVersion, id);
    }
    if ((await transaction.currentRevision(body.target)) !== body.expectedRevision) {
      throw problem('EXPECTED_REVISION_MISMATCH');
    }
    const payload = body.payload;
    if (
      payload.targetKind === 'ACCOUNT'
        ? payload.targetId !== authority.subjectId
        : !(await transaction.consentTargetOwnedBy(authority.subjectId, payload.targetId))
    ) {
      throw problem('AUTHORIZATION_DENIED');
    }
    const at = now.toISOString();
    if (
      !(await transaction.consentPolicyIsCurrent({
        policyVersionId: payload.policyVersionId,
        scopeKey: payload.scopeKey,
        purposeKey: payload.purposeKey,
        at,
      }))
    ) {
      throw problem('INVALID_STATE_TRANSITION');
    }
    const current = await transaction.lockConsent({
      subjectId: authority.subjectId,
      scopeKey: payload.scopeKey,
      purposeKey: payload.purposeKey,
      targetKind: payload.targetKind,
      targetId: payload.targetId,
    });
    if (payload.expiresAt !== undefined && !validFutureTimestamp(payload.expiresAt, now)) {
      throw problem('INVALID_STATE_TRANSITION');
    }
    if (payload.decision === 'WITHDRAW' && current?.state !== 'ALLOWED') {
      throw problem('INVALID_STATE_TRANSITION');
    }
    const nextAccessVersion = (current?.accessVersion ?? 0) + 1;
    const decisionId = ids.next();
    const state =
      payload.decision === 'ALLOW'
        ? ('ALLOWED' as const)
        : payload.decision === 'DENY'
          ? ('DENIED' as const)
          : ('WITHDRAWN' as const);
    const withdrawal = payload.decision === 'WITHDRAW';
    const invalidatesAssistedAccess = withdrawal && payload.scopeKey === 'assisted_service.access';
    const revocationOperations = withdrawal ? REVOCATION_OPERATIONS_BY_SCOPE[payload.scopeKey] : [];
    const delivery = sourceAndDelivery({
      ids,
      eventClass: 'DOMAIN',
      eventName: 'consent.decision_recorded',
      environment: request.boundary.environment,
      aggregateType: 'ConsentDecision',
      aggregateId: payload.targetId,
      aggregateRevision: body.expectedRevision + 1,
      ownerSubjectId: authority.subjectId,
      payload: {
        consentDecisionId: decisionId,
        subjectId: authority.subjectId,
        scopeKey: payload.scopeKey,
        purposeKey: payload.purposeKey,
        targetKind: payload.targetKind,
        targetId: payload.targetId,
        decision: payload.decision,
        accessVersion: nextAccessVersion,
      },
      occurredAt: at,
      correlationId: request.boundary.correlationId,
      causationId: id,
      boundary: request.boundary,
      clientRecordedAt: body.clientContext.clientRecordedAt,
      purposeCode: 'farmer.self_service',
      consentAccessVersion: nextAccessVersion,
      producerBuild: options.producerBuild ?? 'domain-api-development',
    });
    const receipt: SafeCommandReceipt = {
      commandId: id,
      disposition: 'ACCEPTED',
      result: {
        type: 'consentDecision',
        id: decisionId,
        revision: body.expectedRevision + 1,
      },
      eventIds: [delivery.source.eventId],
      serverReceivedAt: at,
    };
    await transaction.commitCommand(
      atomicCommit({
        boundary: request.boundary,
        semanticCommand,
        authorizationVersion: authority.authorizationVersion,
        receipt,
        mutation: {
          kind: 'RECORD_CONSENT_DECISION',
          consentDecisionId: decisionId,
          subjectId: authority.subjectId,
          scopeKey: payload.scopeKey,
          purposeKey: payload.purposeKey,
          targetKind: payload.targetKind,
          targetId: payload.targetId,
          decision: payload.decision,
          state,
          policyVersionId: payload.policyVersionId,
          accessVersion: nextAccessVersion,
          ...(payload.expiresAt === undefined ? {} : { expiresAt: payload.expiresAt }),
          actorSubjectId: authority.subjectId,
          recordedAt: at,
          invalidateRoleContexts: invalidatesAssistedAccess,
          invalidateAccessGrants: invalidatesAssistedAccess,
          revocationOperations,
        },
        auditFacts: [
          {
            action: 'consent.decision.record',
            entityType: payload.targetKind,
            entityId: payload.targetId,
            outcome: 'ALLOW',
            reasonCode: `CONSENT_${payload.decision}`,
            correlationId: request.boundary.correlationId,
            beforeRevision: body.expectedRevision,
            afterRevision: body.expectedRevision + 1,
          },
        ],
        delivery,
      }),
    );
    return receipt;
  });
}

async function executeRskBootstrap(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
): Promise<Readonly<Record<string, unknown>>> {
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, 'assisted.service', async (transaction) => {
    const authority = await transaction.lockCurrentAuthority();
    const context = assertCurrentContext(request.boundary, authority, {
      roleType: 'RSK',
      purposeCode: 'assisted.service',
    });
    if (context.officeId === undefined || context.jurisdictionId === undefined) {
      throw problem('AUTHORIZATION_DENIED');
    }
    return {
      subjectId: authority.subjectId,
      officeId: context.officeId,
      jurisdictionId: context.jurisdictionId,
      authorizationVersion: authority.authorizationVersion,
      capabilities: context.capabilities,
      workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    };
  });
}

async function executeAccessGrant(
  options: ProductionDomainCompositionOptions,
  request: DomainOperationRequest,
  now: Date,
): Promise<CommandOperationReceipt> {
  const body = requireBody(IssueAccessGrantCommandSchema, request);
  assertExpectedRevision(request.boundary, body.expectedRevision);
  const id = commandId(request.boundary);
  const semanticCommand: SemanticCommand = {
    commandId: id,
    commandSchemaVersion: body.commandSchemaVersion,
    operation: body.operation,
    target: body.target,
    expectedRevision: body.expectedRevision,
    payload: body.payload,
  };
  const hash = hashSemanticCommand(semanticCommand);
  const principal = principalId(request.boundary);
  const port = portForBoundary(options, request.boundary);
  return inPortTransaction(port, request.boundary, 'assisted.service', async (transaction) => {
    await transaction.lockCommand(principal, id);
    const authority = await transaction.lockCurrentAuthority();
    const context = assertCurrentContext(request.boundary, authority, {
      roleType: 'RSK',
      purposeCode: 'assisted.service',
      capabilities: ['rsk.access_grant.issue', 'assisted_session.operate'],
    });
    const existing = await transaction.findCommand(principal, id);
    if (existing !== undefined) {
      return safeReceiptReplay(existing, hash, authority.authorizationVersion, id);
    }
    if ((await transaction.currentRevision(body.target)) !== body.expectedRevision) {
      throw problem('EXPECTED_REVISION_MISMATCH');
    }
    const target = await transaction.lockAssistedAccess({
      farmerSubjectId: body.payload.farmerSubjectId,
      targetId: body.payload.targetId,
    });
    if (
      target?.assignmentState !== 'ASSIGNED' ||
      target.officeId !== context.officeId ||
      target.jurisdictionId !== context.jurisdictionId ||
      target.consentState !== 'ALLOWED' ||
      target.consentAccessVersion !== body.payload.consentAccessVersion ||
      !validFutureTimestamp(body.payload.expiresAt, now) ||
      (target.consentExpiresAt !== undefined &&
        (!validFutureTimestamp(target.consentExpiresAt, now) ||
          Date.parse(body.payload.expiresAt) > Date.parse(target.consentExpiresAt)))
    ) {
      throw problem('CONSENT_OR_ACCESS_VERSION_CHANGED');
    }
    const occurredAt = now.toISOString();
    const receipt: SafeCommandReceipt = {
      commandId: id,
      disposition: 'ACCEPTED',
      result: {
        type: 'accessGrant',
        id: body.target.id,
        revision: body.expectedRevision + 1,
      },
      eventIds: [],
      serverReceivedAt: occurredAt,
    };
    // Document 07 governs this command as access_grant + access_grant_event + Audit. The frozen
    // executable event catalogue has no access-grant platform event, so inventing or mislabelling
    // one would break the canonical contract; source/integration/outbox facts remain empty here.
    await transaction.commitCommand(
      atomicCommit({
        boundary: request.boundary,
        semanticCommand,
        authorizationVersion: authority.authorizationVersion,
        receipt,
        mutation: {
          kind: 'ISSUE_ACCESS_GRANT',
          accessGrantId: body.target.id,
          farmerSubjectId: body.payload.farmerSubjectId,
          targetId: body.payload.targetId,
          granteeSubjectId: authority.subjectId,
          officeId: context.officeId ?? NIL_UUID,
          jurisdictionId: context.jurisdictionId ?? NIL_UUID,
          purposeCode: 'assisted.service',
          accessVersion: body.payload.consentAccessVersion,
          expiresAt: body.payload.expiresAt,
          createdAt: occurredAt,
          accessGrantEvent: {
            eventType: 'ISSUED',
            grantVersion: 1,
            accessVersion: body.payload.consentAccessVersion,
            recordedAt: occurredAt,
            correlationId: request.boundary.correlationId,
          },
        },
        auditFacts: [
          {
            action: 'rsk.access_grant.issue',
            entityType: 'ASSISTED_FARMER_CONTEXT',
            entityId: body.payload.targetId,
            outcome: 'ALLOW',
            reasonCode: 'ACCESS_GRANT_ISSUED',
            correlationId: request.boundary.correlationId,
            beforeRevision: body.expectedRevision,
            afterRevision: body.expectedRevision + 1,
          },
        ],
      }),
    );
    return receipt;
  });
}

function disclosureDenial(
  code:
    | 'AUTHORIZATION_DENIED'
    | 'AUTHORIZATION_VERSION_CHANGED'
    | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
    | 'MFA_REQUIRED',
) {
  return { allowed: false as const, code };
}

type DisclosureDenialCode = ReturnType<typeof disclosureDenial>['code'];

function disclosureContextDenial(error: ApiBoundaryProblem): DisclosureDenialCode {
  return error.code === 'MFA_REQUIRED'
    ? 'MFA_REQUIRED'
    : error.code === 'AUTHORIZATION_VERSION_CHANGED'
      ? 'AUTHORIZATION_VERSION_CHANGED'
      : 'AUTHORIZATION_DENIED';
}

async function appendDisclosureAudit(
  transaction: ProtectedDisclosureSqlTransaction,
  input: {
    boundary: VerifiedRequestBoundary;
    entityType: 'ASSISTED_FARMER_CONTEXT';
    entityId: string;
    outcome: 'ALLOW' | 'DENY';
    reasonCode: string;
  },
): Promise<void> {
  await transaction.appendAuditFact({
    action: 'rsk.protected_disclosure',
    entityType: input.entityType,
    entityId: input.entityId,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    correlationId: input.boundary.correlationId,
  });
}

function createProtectedDisclosureService(
  options: ProductionDomainCompositionOptions,
  now: () => Date,
): ProtectedDisclosureService {
  return {
    async disclose({ boundary, resource }) {
      const port = options.protectedDisclosure;
      const decryptor = options.protectedFieldDecryptor;
      if (port === undefined || decryptor === undefined) {
        throw dependencyUnavailable();
      }
      try {
        const audited = await port.transaction(
          { boundary, purposeCode: 'assisted.service' },
          async (transaction) => {
            const authority = await transaction.lockCurrentAuthority();
            let context: AuthorizationContext;
            try {
              context = assertCurrentContext(boundary, authority, {
                roleType: 'RSK',
                purposeCode: 'assisted.service',
                capabilities: ['rsk.protected_disclose', 'assisted_session.operate'],
              });
            } catch (error) {
              if (error instanceof ApiBoundaryProblem) {
                const code = disclosureContextDenial(error);
                await appendDisclosureAudit(transaction, {
                  boundary,
                  entityType: resource.targetKind,
                  entityId: resource.targetId,
                  outcome: 'DENY',
                  reasonCode: code,
                });
                return { ready: false as const, result: disclosureDenial(code) };
              }
              throw error;
            }
            const snapshot = await transaction.lockDisclosure(resource.targetId);
            const auditedAt = now().toISOString();
            let denial:
              | 'AUTHORIZATION_DENIED'
              | 'AUTHORIZATION_VERSION_CHANGED'
              | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
              | undefined;
            if (
              snapshot?.targetId !== resource.targetId ||
              snapshot.granteeSubjectId !== authority.subjectId ||
              snapshot.roleContextId !== context.roleContextId ||
              snapshot.officeId !== context.officeId ||
              snapshot.jurisdictionId !== context.jurisdictionId ||
              snapshot.purposeCode !== resource.purposeKey
            ) {
              denial = 'AUTHORIZATION_DENIED';
            } else if (snapshot.authorizationVersion !== authority.authorizationVersion) {
              denial = 'AUTHORIZATION_VERSION_CHANGED';
            } else if (
              snapshot.accessVersion !== resource.expectedAccessVersion ||
              snapshot.grantState !== 'ACTIVE' ||
              snapshot.consentState !== 'ALLOWED'
            ) {
              denial = 'CONSENT_OR_ACCESS_VERSION_CHANGED';
            }
            await appendDisclosureAudit(transaction, {
              boundary,
              entityType: resource.targetKind,
              entityId: resource.targetId,
              outcome: denial === undefined ? 'ALLOW' : 'DENY',
              reasonCode: denial ?? 'AUTHORIZED',
            });
            if (denial !== undefined) {
              return { ready: false as const, result: disclosureDenial(denial) };
            }
            const encrypted = await transaction.readEncryptedProtectedFields(resource.targetId);
            if (encrypted === undefined) throw dependencyUnavailable();
            return {
              ready: true as const,
              encrypted,
              auditedAt,
            };
          },
        );
        if (!audited.ready) return audited.result;

        // KMS/provider decryption is deliberately outside every database transaction.
        const fields = await decryptor.decrypt(audited.encrypted);
        if (
          fields.displayName.trim().length === 0 ||
          fields.contact.trim().length === 0 ||
          fields.displayName.length > 160 ||
          fields.contact.length > 160
        ) {
          throw dependencyUnavailable();
        }

        // Recheck after decryption so a withdrawal/version change during the provider call
        // still returns no protected fields.
        return await port.transaction(
          { boundary, purposeCode: 'assisted.service' },
          async (transaction) => {
            const authority = await transaction.lockCurrentAuthority();
            let context: AuthorizationContext;
            try {
              context = assertCurrentContext(boundary, authority, {
                roleType: 'RSK',
                purposeCode: 'assisted.service',
                capabilities: ['rsk.protected_disclose', 'assisted_session.operate'],
              });
            } catch (error) {
              if (!(error instanceof ApiBoundaryProblem)) throw error;
              const code = disclosureContextDenial(error);
              await appendDisclosureAudit(transaction, {
                boundary,
                entityType: resource.targetKind,
                entityId: resource.targetId,
                outcome: 'DENY',
                reasonCode: code,
              });
              return disclosureDenial(code);
            }

            const snapshot = await transaction.lockDisclosure(resource.targetId);
            let denial: DisclosureDenialCode | undefined;
            if (
              snapshot?.targetId !== resource.targetId ||
              snapshot.granteeSubjectId !== authority.subjectId ||
              snapshot.roleContextId !== context.roleContextId ||
              snapshot.officeId !== context.officeId ||
              snapshot.jurisdictionId !== context.jurisdictionId ||
              snapshot.purposeCode !== resource.purposeKey
            ) {
              denial = 'AUTHORIZATION_DENIED';
            } else if (snapshot.authorizationVersion !== authority.authorizationVersion) {
              denial = 'AUTHORIZATION_VERSION_CHANGED';
            } else if (
              snapshot.accessVersion !== resource.expectedAccessVersion ||
              snapshot.grantState !== 'ACTIVE' ||
              snapshot.consentState !== 'ALLOWED'
            ) {
              denial = 'CONSENT_OR_ACCESS_VERSION_CHANGED';
            }

            if (denial !== undefined) {
              await appendDisclosureAudit(transaction, {
                boundary,
                entityType: resource.targetKind,
                entityId: resource.targetId,
                outcome: 'DENY',
                reasonCode: denial,
              });
              return disclosureDenial(denial);
            }

            return {
              allowed: true as const,
              response: {
                targetId: resource.targetId,
                accessVersion: resource.expectedAccessVersion,
                fields,
                auditedAt: audited.auditedAt,
              },
            };
          },
        );
      } catch (error) {
        if (error instanceof ApiBoundaryProblem) throw error;
        throw dependencyUnavailable();
      }
    },
  };
}

export function createProductionDomainComposition(
  options: ProductionDomainCompositionOptions,
): ProductionDomainComposition {
  const now = options.now ?? (() => new Date());
  const ids = options.ids ?? DEFAULT_ID_SOURCE;
  const operations: DomainOperationAdapter = {
    async execute(request) {
      const at = now();
      switch (request.operationId) {
        case 'createReturnState':
          return executeReturnState(options, request, at);
        case 'getAuthSession':
        case 'listRoles':
          return executeSession(options, request);
        case 'selectRoleContext':
          return executeSelectRoleContext(options, request, at, ids);
        case 'revokeRoleContext':
          return executeRevokeRoleContext(options, request, at, ids);
        case 'getFarmerBootstrap':
          return executeFarmerBootstrap(options, request);
        case 'listFarmerConsents':
          return executeConsentList(options, request);
        case 'recordConsentDecision':
          return executeConsentDecision(options, request, at, ids);
        case 'saveFarmerSetupDraft':
        case 'completeFarmerSetup':
        case 'getMyFarm':
        case 'listFarmerFarms':
        case 'createFarmerFarm':
        case 'getFarmerFarm':
        case 'updateFarmerFarm':
        case 'createFarmerPlot':
        case 'getFarmerPlot':
        case 'updateFarmerPlot':
        case 'createFarmerPlotGeometryVersion':
        case 'updateFarmerPreferences':
        case 'changeFarmerDeviceMode':
          if (options.milestoneThreeOperations === undefined) throw dependencyUnavailable();
          return options.milestoneThreeOperations.execute(request);
        case 'getRskBootstrap':
          return executeRskBootstrap(options, request);
        case 'issueRskAccessGrant':
          return executeAccessGrant(options, request, at);
        case 'createRskProtectedDisclosure':
          // This route can only use the separately supplied narrow disclosure service.
          throw dependencyUnavailable();
        case 'openFarmerSyncStream':
        case 'bootstrapFarmerSync':
        case 'syncFarmerBatch':
        case 'getFarmerSyncFeed':
        case 'getFarmerSyncCommand':
        case 'listFarmerSyncConflicts':
        case 'getFarmerSyncConflict':
        case 'resolveFarmerSyncConflict':
        case 'createMediaUploadIntent':
        case 'finalizeMediaUploadIntent':
        case 'getMediaAssetStatus':
        case 'cancelMediaUploadIntent':
        case 'streamMediaAttachment':
          if (options.milestoneTwoOperations === undefined) throw dependencyUnavailable();
          return options.milestoneTwoOperations.execute(request);
      }
    },
  };
  return {
    operations,
    protectedDisclosure: createProtectedDisclosureService(options, now),
    ready: () =>
      options.returnState !== undefined &&
      options.returnStateProtector !== undefined &&
      options.farmer?.role === 'sf_farmer_api' &&
      options.rsk?.role === 'sf_rsk_api' &&
      options.protectedDisclosure?.role === 'sf_rsk_api' &&
      options.milestoneThreeOperations !== undefined &&
      options.milestoneTwoOperations !== undefined &&
      (!options.requireDurableMilestoneTwo ||
        ('persistence' in options.milestoneTwoOperations &&
          options.milestoneTwoOperations.persistence === 'postgresql')),
  };
}
