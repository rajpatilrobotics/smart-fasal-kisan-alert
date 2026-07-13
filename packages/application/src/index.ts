import { createHash } from 'node:crypto';

import { canonicalize } from 'json-canonicalize';

export interface SemanticCommand {
  commandId: string;
  commandSchemaVersion: number;
  operation: string;
  target: { type: string; id: string };
  expectedRevision: number;
  payload: unknown;
}

export interface CommandPrincipal {
  environment: string;
  subjectId: string;
  authorizationVersion: number;
}

export interface SafeCommandReceipt {
  commandId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED';
  result?: { type: string; id: string; revision: number };
  eventIds: readonly string[];
  serverReceivedAt: string;
}

export interface StoredCommandExecution {
  principalId: string;
  commandId: string;
  commandHash: string;
  operation: string;
  authorizationVersion: number;
  state: 'IN_PROGRESS' | 'COMPLETE' | 'REJECTED';
  safeReceipt?: SafeCommandReceipt;
}

export interface AtomicCommandEffect {
  mutation: Readonly<Record<string, unknown>>;
  auditFacts: readonly Readonly<Record<string, unknown>>[];
  sourceEvents: readonly Readonly<Record<string, unknown>>[];
  integrationEvents: readonly Readonly<Record<string, unknown>>[];
  outboxEntries: readonly Readonly<Record<string, unknown>>[];
  result?: SafeCommandReceipt['result'];
  eventIds: readonly string[];
}

export interface AtomicCommandCommit {
  execution: StoredCommandExecution & { state: 'COMPLETE'; safeReceipt: SafeCommandReceipt };
  effect: AtomicCommandEffect;
}

export interface CommandUnitOfWork {
  /** Serializes an environment-bound principal/command key even before a receipt row exists. */
  lockExecution(principalId: string, commandId: string): Promise<void>;
  findExecution(
    principalId: string,
    commandId: string,
  ): Promise<StoredCommandExecution | undefined>;
  currentRevision(target: SemanticCommand['target']): Promise<number>;
  commitAtomic(commit: AtomicCommandCommit): Promise<void>;
}

export interface CommandStore {
  transaction<Result>(work: (unitOfWork: CommandUnitOfWork) => Promise<Result>): Promise<Result>;
}

export interface ExecuteCommandOptions {
  command: SemanticCommand;
  principal: CommandPrincipal;
  store: CommandStore;
  /** Re-evaluates current authority inside the locked transaction, including for receipt replay. */
  authorize: (unitOfWork: CommandUnitOfWork) => boolean | Promise<boolean>;
  prepareEffect: () => AtomicCommandEffect;
  now?: () => Date;
}

export type CommandProblemCode =
  | 'AUTHORIZATION_DENIED'
  | 'AUTHORIZATION_VERSION_CHANGED'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'EXPECTED_REVISION_MISMATCH'
  | 'IDEMPOTENCY_KEY_REUSED';

export class CommandRejectedError extends Error {
  constructor(readonly code: CommandProblemCode) {
    super(code);
    this.name = 'CommandRejectedError';
  }
}

export function hashSemanticCommand(command: SemanticCommand): string {
  const semanticBody = canonicalize({
    operation: command.operation,
    commandSchemaVersion: command.commandSchemaVersion,
    target: command.target,
    expectedRevision: command.expectedRevision,
    payload: command.payload,
  });
  return createHash('sha256').update(semanticBody, 'utf8').digest('hex');
}

export function environmentBoundPrincipal(principal: CommandPrincipal): string {
  return `${principal.environment}:${principal.subjectId}`;
}

export async function executeCommand(options: ExecuteCommandOptions): Promise<SafeCommandReceipt> {
  const commandHash = hashSemanticCommand(options.command);
  const principalId = environmentBoundPrincipal(options.principal);
  const now = options.now ?? (() => new Date());

  return options.store.transaction(async (unitOfWork) => {
    await unitOfWork.lockExecution(principalId, options.command.commandId);
    if (!(await options.authorize(unitOfWork))) {
      throw new CommandRejectedError('AUTHORIZATION_DENIED');
    }

    const existing = await unitOfWork.findExecution(principalId, options.command.commandId);
    if (existing) return replay(existing, commandHash, options.principal.authorizationVersion);

    const currentRevision = await unitOfWork.currentRevision(options.command.target);
    if (currentRevision !== options.command.expectedRevision) {
      throw new CommandRejectedError('EXPECTED_REVISION_MISMATCH');
    }

    const effect = options.prepareEffect();
    validateAtomicEffect(effect);
    const receipt: SafeCommandReceipt = {
      commandId: options.command.commandId,
      disposition: 'ACCEPTED',
      ...(effect.result ? { result: effect.result } : {}),
      eventIds: effect.eventIds,
      serverReceivedAt: now().toISOString(),
    };
    await unitOfWork.commitAtomic({
      execution: {
        principalId,
        commandId: options.command.commandId,
        commandHash,
        operation: options.command.operation,
        authorizationVersion: options.principal.authorizationVersion,
        state: 'COMPLETE',
        safeReceipt: receipt,
      },
      effect,
    });
    return receipt;
  });
}

function replay(
  existing: StoredCommandExecution,
  commandHash: string,
  currentAuthorizationVersion: number,
): SafeCommandReceipt {
  if (existing.commandHash !== commandHash) {
    throw new CommandRejectedError('IDEMPOTENCY_KEY_REUSED');
  }
  if (existing.authorizationVersion !== currentAuthorizationVersion) {
    throw new CommandRejectedError('AUTHORIZATION_VERSION_CHANGED');
  }
  if (existing.state !== 'COMPLETE' || !existing.safeReceipt) {
    throw new CommandRejectedError('DEPENDENCY_UNAVAILABLE');
  }
  return { ...existing.safeReceipt, disposition: 'ALREADY_ACCEPTED' };
}

function validateAtomicEffect(effect: AtomicCommandEffect): void {
  const aligned =
    effect.sourceEvents.length > 0 &&
    effect.eventIds.length === effect.sourceEvents.length &&
    effect.integrationEvents.length > 0 &&
    effect.outboxEntries.length === effect.integrationEvents.length;
  if (!aligned)
    throw new TypeError('Atomic command effect must include source, integration and outbox facts');
}

export interface DisclosureAuthorizationSnapshot {
  subjectId: string;
  granteeSubjectId: string;
  targetId: string;
  authorizationVersion: number;
  accessVersion: number;
  grantId: string;
  grantState: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  consentState: 'GRANTED' | 'MISSING' | 'EXPIRED' | 'DENIED' | 'WITHDRAWN';
  roleContextId: string;
  officeId: string;
  jurisdictionId: string;
  purposeCode: string;
}

export interface ProtectedFields {
  displayName: string;
  contact: string;
}

export interface DisclosureTransaction {
  lockAuthorizationSnapshot(targetId: string): Promise<DisclosureAuthorizationSnapshot>;
  appendAuditFact(fact: Readonly<Record<string, unknown>>): Promise<void>;
  readProtectedFields(targetId: string): Promise<ProtectedFields>;
}

export interface DisclosureStore {
  transaction<Result>(
    work: (transaction: DisclosureTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export type DisclosureResult =
  | { outcome: 'ALLOWED'; fields: ProtectedFields; accessVersion: number }
  | { outcome: 'DENIED'; code: string };

export async function discloseProtectedFields(input: {
  store: DisclosureStore;
  targetId: string;
  expectedAuthorizationVersion: number;
  expectedAccessVersion: number;
  authorize: (snapshot: DisclosureAuthorizationSnapshot) => { allowed: boolean; code: string };
  auditBase: Readonly<Record<string, unknown>>;
}): Promise<DisclosureResult> {
  return input.store.transaction(async (transaction) => {
    const snapshot = await transaction.lockAuthorizationSnapshot(input.targetId);
    const versionCurrent =
      snapshot.authorizationVersion === input.expectedAuthorizationVersion &&
      snapshot.accessVersion === input.expectedAccessVersion;
    const decision = versionCurrent
      ? input.authorize(snapshot)
      : { allowed: false, code: 'CONSENT_OR_ACCESS_VERSION_CHANGED' };

    await transaction.appendAuditFact({
      ...input.auditBase,
      targetId: input.targetId,
      authorizationVersion: snapshot.authorizationVersion,
      accessVersion: snapshot.accessVersion,
      outcome: decision.allowed ? 'ALLOW' : 'DENY',
      reasonCode: decision.code,
    });

    if (!decision.allowed) return { outcome: 'DENIED', code: decision.code };
    const fields = await transaction.readProtectedFields(input.targetId);
    return { outcome: 'ALLOWED', fields, accessVersion: snapshot.accessVersion };
  });
}

export interface ConsentStateSnapshot {
  subjectId: string;
  scopeKey: ConsentScopeKey;
  purposeKey: string;
  targetKind: 'ACCOUNT' | 'ASSISTED_FARMER_CONTEXT';
  targetId: string;
  accessVersion: number;
}

export type ConsentScopeKey =
  | 'location.processing'
  | 'audio.storage'
  | 'case.sharing'
  | 'sensor.collection'
  | 'sensor.maintenance_location'
  | 'visit.access'
  | 'assisted_service.access'
  | 'channel.app_push'
  | 'channel.sms'
  | 'channel.ivr'
  | 'market.private_fields';

export type RevocationOperationKind =
  | 'REVOKE_LOCATION_PROCESSING'
  | 'CANCEL_QUEUED_EARTH_AI_WORK'
  | 'DELETE_STORED_AUDIO'
  | 'CANCEL_QUEUED_MEDIA_AI_WORK'
  | 'REVOKE_CASE_SHARING'
  | 'CANCEL_QUEUED_CASE_AI_WORK'
  | 'STOP_SENSOR_COLLECTION'
  | 'DEASSIGN_SENSOR'
  | 'REVOKE_MAINTENANCE_LOCATION'
  | 'REVOKE_VISIT_ACCESS'
  | 'REVOKE_OFFLINE_PACKS'
  | 'REVOKE_ASSISTED_SESSIONS'
  | 'REVOKE_ACCESS_GRANTS'
  | 'REVOKE_PUSH_REGISTRATIONS'
  | 'CANCEL_QUEUED_PUSH_DELIVERIES'
  | 'CANCEL_QUEUED_SMS_DELIVERIES'
  | 'CANCEL_QUEUED_IVR_DELIVERIES'
  | 'REVOKE_MARKET_PRIVATE_FIELDS'
  | 'CANCEL_QUEUED_MARKET_SUPPORT_WORK';

export const REVOCATION_OPERATIONS_BY_SCOPE: Readonly<
  Record<ConsentScopeKey, readonly RevocationOperationKind[]>
> = Object.freeze({
  'location.processing': ['REVOKE_LOCATION_PROCESSING', 'CANCEL_QUEUED_EARTH_AI_WORK'],
  'audio.storage': ['DELETE_STORED_AUDIO', 'CANCEL_QUEUED_MEDIA_AI_WORK'],
  'case.sharing': ['REVOKE_CASE_SHARING', 'CANCEL_QUEUED_CASE_AI_WORK'],
  'sensor.collection': ['STOP_SENSOR_COLLECTION', 'DEASSIGN_SENSOR'],
  'sensor.maintenance_location': ['REVOKE_MAINTENANCE_LOCATION'],
  'visit.access': ['REVOKE_VISIT_ACCESS', 'REVOKE_OFFLINE_PACKS'],
  'assisted_service.access': [
    'REVOKE_ASSISTED_SESSIONS',
    'REVOKE_ACCESS_GRANTS',
    'REVOKE_OFFLINE_PACKS',
  ],
  'channel.app_push': ['REVOKE_PUSH_REGISTRATIONS', 'CANCEL_QUEUED_PUSH_DELIVERIES'],
  'channel.sms': ['CANCEL_QUEUED_SMS_DELIVERIES'],
  'channel.ivr': ['CANCEL_QUEUED_IVR_DELIVERIES'],
  'market.private_fields': ['REVOKE_MARKET_PRIVATE_FIELDS', 'CANCEL_QUEUED_MARKET_SUPPORT_WORK'],
});

export interface WithdrawalCommit {
  previous: ConsentStateSnapshot;
  nextAccessVersion: number;
  decision: 'WITHDRAW';
  invalidateRoleContexts: boolean;
  invalidateAccessGrants: boolean;
  revocationOperations: readonly RevocationOperationKind[];
  eventType: 'consent.decision_recorded';
  enqueueOutbox: true;
}

export interface ConsentWithdrawalStore {
  transaction<Result>(
    work: (transaction: {
      lockCurrentState(
        key: Omit<ConsentStateSnapshot, 'accessVersion'>,
      ): Promise<ConsentStateSnapshot>;
      commitWithdrawal(commit: WithdrawalCommit): Promise<void>;
    }) => Promise<Result>,
  ): Promise<Result>;
}

export async function withdrawConsent(input: {
  store: ConsentWithdrawalStore;
  key: Omit<ConsentStateSnapshot, 'accessVersion'>;
  expectedAccessVersion: number;
}): Promise<WithdrawalCommit> {
  const revocationOperations = (
    REVOCATION_OPERATIONS_BY_SCOPE as Readonly<
      Partial<Record<string, readonly RevocationOperationKind[]>>
    >
  )[input.key.scopeKey];
  if (revocationOperations === undefined) {
    throw new TypeError('Consent scopes must be withdrawn independently');
  }
  return input.store.transaction(async (transaction) => {
    const current = await transaction.lockCurrentState(input.key);
    if (current.accessVersion !== input.expectedAccessVersion) {
      throw new CommandRejectedError('CONSENT_OR_ACCESS_VERSION_CHANGED');
    }
    const commit: WithdrawalCommit = {
      previous: current,
      nextAccessVersion: current.accessVersion + 1,
      decision: 'WITHDRAW',
      invalidateRoleContexts: current.scopeKey === 'assisted_service.access',
      invalidateAccessGrants: current.scopeKey === 'assisted_service.access',
      revocationOperations,
      eventType: 'consent.decision_recorded',
      enqueueOutbox: true,
    };
    await transaction.commitWithdrawal(commit);
    return commit;
  });
}
