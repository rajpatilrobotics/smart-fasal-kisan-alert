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

export interface FarmerSetupOwner {
  environment: string;
  subjectId: string;
  authorizationVersion: number;
}

export interface FarmerSetupDraft {
  draftId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETE' | 'NEEDS_REVIEW';
  profile: {
    displayName?: string | undefined;
    preferredLocale: 'mr-IN' | 'hi-IN' | 'en-IN';
    timezone: 'Asia/Kolkata';
    accessibility: { voicePrompts: boolean; largeTargets: boolean; highContrast: boolean };
  };
  deviceMode: 'PERSONAL' | 'TRUSTED_FAMILY' | 'RSK_ASSISTED';
  consents: { decisions: readonly unknown[] };
  farms: readonly {
    farmId: string;
    name: string;
    location: {
      district: 'Raigad';
      taluka: string;
      village: string;
      landmark?: string | undefined;
    };
    farmingMethod: 'TRADITIONAL' | 'ORGANIC' | 'MIXED' | 'UNKNOWN';
    plots: readonly {
      plotId: string;
      farmId: string;
      name: string;
      area: number;
      areaUnit: 'SQUARE_METRE' | 'HECTARE' | 'ACRE' | 'GUNTHA';
      normalizedAreaSquareMetres: number;
      areaConversionVersion: 'area-v1';
      locationMethod: 'GPS_POINT' | 'MANUAL_MAP' | 'VILLAGE_LANDMARK' | 'UNKNOWN';
      geometry: { gpsPermission: 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN' };
      revision: number;
    }[];
    revision: number;
  }[];
  soilByPlot: Record<string, unknown>;
  waterByPlot: Record<string, unknown>;
  cropHistoryByPlot: Record<string, unknown>;
  currentCropByPlot: Record<string, unknown>;
  hardwareStatus: 'SKIPPED' | 'NOT_CONFIGURED' | 'RSK_SETUP_REQUIRED';
  syncStatus:
    | 'SAVED_ON_THIS_PHONE'
    | 'WAITING_FOR_INTERNET'
    | 'SYNCED'
    | 'CONFLICT'
    | 'LOCKED_RECOVERY'
    | 'REJECTED';
  revision: number;
  checksum: string;
  updatedAt: string;
}

export interface MyFarmResponse {
  setup: {
    status: FarmerSetupDraft['status'];
    activeDraft?: FarmerSetupDraft;
    completedAt?: string;
    conflictCount: number;
    syncStatus: FarmerSetupDraft['syncStatus'];
  };
  farms: FarmerSetupDraft['farms'];
  totals: { farms: number; plots: number; normalizedAreaSquareMetres: number };
  currentCropByPlot: Record<string, unknown>;
  generatedAt: string;
}

export interface FarmerSetupRecord {
  owner: FarmerSetupOwner;
  draft?: FarmerSetupDraft;
  completedAt?: string;
}

export interface FarmerSetupRepository {
  load(owner: FarmerSetupOwner): Promise<FarmerSetupRecord | undefined>;
  save(record: FarmerSetupRecord): Promise<void>;
}

export type FarmerSetupCommandResult =
  | {
      disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED';
      draft: FarmerSetupDraft;
      myFarm: MyFarmResponse;
    }
  | {
      disposition: 'CONFLICT';
      conflict: {
        reason: FarmerSetupConflictReason;
        authoritativeRevision: number;
      };
    };

export function checksumSetupDraft(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalize(value), 'utf8').digest('hex')}`;
}

type FarmerSetupConflictReason =
  | 'EXPECTED_REVISION_MISMATCH'
  | 'OWNER_CHANGED'
  | 'SETUP_INCOMPLETE'
  | 'CONSENT_OR_ACCESS_VERSION_CHANGED';

export function finalizeSetupDraft(
  input: Omit<FarmerSetupDraft, 'checksum' | 'revision' | 'syncStatus' | 'updatedAt'> & {
    revision: number;
    syncStatus: FarmerSetupDraft['syncStatus'];
    updatedAt: string;
  },
): FarmerSetupDraft {
  const normalizedFarms = input.farms.map((farm) => ({
    ...farm,
    plots: farm.plots.map((plot) => ({
      ...plot,
      normalizedAreaSquareMetres: normalizeArea(plot.area, plot.areaUnit),
      areaConversionVersion: 'area-v1' as const,
    })),
  }));
  const draftWithoutChecksum = {
    ...input,
    farms: normalizedFarms,
  };
  return {
    ...draftWithoutChecksum,
    checksum: checksumSetupDraft(draftWithoutChecksum),
  };
}

export class FarmerSetupService {
  constructor(
    private readonly repository: FarmerSetupRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async bootstrap(owner: FarmerSetupOwner): Promise<MyFarmResponse> {
    const record = await this.repository.load(owner);
    return myFarmFromRecord(record ?? { owner }, this.now().toISOString());
  }

  async saveDraft(input: {
    owner: FarmerSetupOwner;
    expectedRevision: number;
    draft: Omit<FarmerSetupDraft, 'checksum' | 'revision' | 'syncStatus' | 'updatedAt'>;
  }): Promise<FarmerSetupCommandResult> {
    const current = await this.repository.load(input.owner);
    if (current && current.owner.subjectId !== input.owner.subjectId) {
      return conflict('OWNER_CHANGED', current.draft?.revision ?? 0);
    }
    const currentRevision = current?.draft?.revision ?? 0;
    if (currentRevision !== input.expectedRevision) {
      return conflict('EXPECTED_REVISION_MISMATCH', currentRevision);
    }
    const validation = validateSetup({
      preferredLocale: input.draft.profile.preferredLocale,
      deviceMode: input.draft.deviceMode,
      farms: input.draft.farms.map((farm) => ({
        farmId: farm.farmId,
        name: farm.name,
        location: farm.location,
        plots: farm.plots,
      })),
      hardwareStatus: input.draft.hardwareStatus,
      gpsPermission:
        input.draft.farms[0]?.plots[0]?.geometry.gpsPermission === 'DENIED' ? 'DENIED' : 'UNKNOWN',
    });
    const draft = finalizeSetupDraft({
      ...input.draft,
      status: validation.status,
      revision: currentRevision + 1,
      syncStatus: 'SYNCED',
      updatedAt: this.now().toISOString(),
    });
    await this.repository.save({
      owner: input.owner,
      draft,
      ...(current?.completedAt === undefined ? {} : { completedAt: current.completedAt }),
    });
    return {
      disposition: currentRevision === draft.revision ? 'ALREADY_ACCEPTED' : 'ACCEPTED',
      draft,
      myFarm: myFarmFromRecord({ owner: input.owner, draft }, this.now().toISOString()),
    };
  }

  async complete(input: {
    owner: FarmerSetupOwner;
    expectedRevision: number;
    draftId: string;
    acceptedDraftRevision: number;
    acceptedDraftChecksum: string;
  }): Promise<FarmerSetupCommandResult> {
    const current = await this.repository.load(input.owner);
    const draft = current?.draft;
    if (!draft) return conflict('SETUP_INCOMPLETE', 0);
    if (
      draft.revision !== input.expectedRevision ||
      draft.revision !== input.acceptedDraftRevision
    ) {
      return conflict('EXPECTED_REVISION_MISMATCH', draft.revision);
    }
    if (draft.draftId !== input.draftId || draft.checksum !== input.acceptedDraftChecksum) {
      return conflict('CONSENT_OR_ACCESS_VERSION_CHANGED', draft.revision);
    }
    const validation = validateSetup({
      preferredLocale: draft.profile.preferredLocale,
      deviceMode: draft.deviceMode,
      farms: draft.farms.map((farm) => ({
        farmId: farm.farmId,
        name: farm.name,
        location: farm.location,
        plots: farm.plots,
      })),
      hardwareStatus: draft.hardwareStatus,
      gpsPermission:
        draft.farms[0]?.plots[0]?.geometry.gpsPermission === 'DENIED' ? 'DENIED' : 'UNKNOWN',
    });
    if (validation.issues.length > 0) return conflict('SETUP_INCOMPLETE', draft.revision);
    const completed = finalizeSetupDraft({
      ...draft,
      status: 'COMPLETE',
      revision: draft.revision + 1,
      syncStatus: 'SYNCED',
      updatedAt: this.now().toISOString(),
    });
    const completedAt = this.now().toISOString();
    await this.repository.save({ owner: input.owner, draft: completed, completedAt });
    return {
      disposition: 'ACCEPTED',
      draft: completed,
      myFarm: myFarmFromRecord({ owner: input.owner, draft: completed, completedAt }, completedAt),
    };
  }
}

function conflict(
  reason: FarmerSetupConflictReason,
  authoritativeRevision: number,
): FarmerSetupCommandResult {
  return { disposition: 'CONFLICT', conflict: { reason, authoritativeRevision } };
}

export function myFarmFromRecord(record: FarmerSetupRecord, generatedAt: string): MyFarmResponse {
  const draft = record.draft;
  const farms = draft?.farms ?? [];
  const plots = farms.flatMap((farm) => farm.plots);
  const myFarm = {
    setup: {
      status: draft?.status ?? 'NOT_STARTED',
      ...(draft === undefined ? {} : { activeDraft: draft }),
      ...(record.completedAt === undefined ? {} : { completedAt: record.completedAt }),
      conflictCount: 0,
      syncStatus: draft?.syncStatus ?? 'SYNCED',
    },
    farms,
    totals: {
      farms: farms.length,
      plots: plots.length,
      normalizedAreaSquareMetres:
        Math.round(plots.reduce((sum, plot) => sum + plot.normalizedAreaSquareMetres, 0) * 100) /
        100,
    },
    currentCropByPlot: draft?.currentCropByPlot ?? {},
    generatedAt,
  };
  return myFarm;
}

function normalizeArea(area: number, unit: 'SQUARE_METRE' | 'HECTARE' | 'ACRE' | 'GUNTHA'): number {
  const factor = { SQUARE_METRE: 1, HECTARE: 10_000, ACRE: 4_046.8564224, GUNTHA: 101.17141056 }[
    unit
  ];
  return Math.round(area * factor * 100) / 100;
}

function validateSetup(input: {
  preferredLocale: string;
  deviceMode: string;
  farms: readonly {
    name: string;
    location: { district: string; taluka: string; village: string };
    plots: readonly {
      name: string;
      area: number;
      areaUnit: 'SQUARE_METRE' | 'HECTARE' | 'ACRE' | 'GUNTHA';
      locationMethod: string;
    }[];
  }[];
  hardwareStatus: string;
  gpsPermission: 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN';
}): { status: FarmerSetupDraft['status']; issues: readonly string[] } {
  const issues: string[] = [];
  if (!['mr-IN', 'hi-IN', 'en-IN'].includes(input.preferredLocale)) issues.push('locale');
  if (!['PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED'].includes(input.deviceMode))
    issues.push('device');
  if (!['SKIPPED', 'NOT_CONFIGURED', 'RSK_SETUP_REQUIRED'].includes(input.hardwareStatus)) {
    issues.push('hardware');
  }
  for (const farm of input.farms) {
    if (farm.location.district !== 'Raigad') issues.push('district');
    if (farm.plots.length === 0) issues.push('plots');
    for (const plot of farm.plots) {
      if (!plot.name.trim()) issues.push('plot.name');
      if (input.gpsPermission === 'DENIED' && plot.locationMethod === 'GPS_POINT') {
        issues.push('gps.denied');
      }
    }
  }
  return { status: issues.length === 0 ? 'READY_FOR_REVIEW' : 'IN_PROGRESS', issues };
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
