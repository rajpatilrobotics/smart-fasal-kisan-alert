import { createHash, randomUUID } from 'node:crypto';

import {
  evaluateAdvisory,
  recommendCrops,
  type AdvisoryInput,
  type AgronomyEvidence,
  type CropProfile,
  type RecommendationInput,
} from '@smart-fasal/agronomy';
import { canonicalize } from 'json-canonicalize';

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

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

export type EvidenceDataMode = 'LIVE' | 'RECORDED' | 'SIMULATED';
export type EvidenceQuality =
  'TRUSTED' | 'USE_WITH_CAUTION' | 'TREND_ONLY' | 'DO_NOT_USE' | 'PENDING';
export type EvidenceFreshness = 'CURRENT' | 'DATA_IS_OLD' | 'NO_RECENT_DATA' | 'UNAVAILABLE';
export type EvidenceValueState =
  | 'KNOWN'
  | 'UNKNOWN'
  | 'MISSING'
  | 'PROXY'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE'
  | 'WITHHELD'
  | 'UNAVAILABLE';

export interface EvidenceSource {
  sourceId: string;
  sourceName: string;
  provenanceType:
    | 'SENSOR'
    | 'FARMER_REPORTED'
    | 'FARMER_MANUAL'
    | 'RSK_MANUAL'
    | 'LABORATORY'
    | 'SOIL_HEALTH_CARD'
    | 'WEATHER'
    | 'SATELLITE'
    | 'PUBLIC_MARKET'
    | 'DERIVED';
  rightsLabel: string;
  sourceVersion: string;
}

export interface EvidenceRecord {
  evidenceId: string;
  plotId: string;
  kind:
    | 'WEATHER_FORECAST'
    | 'WEATHER_HISTORY'
    | 'EARTH_OBSERVATION'
    | 'SOIL_MEASUREMENT'
    | 'HARDWARE_TELEMETRY'
    | 'DEVICE_HEALTH';
  metricKey: string;
  value: {
    state: EvidenceValueState;
    originalValue?: string;
    originalUnit?: string;
    normalizedValue?: string;
    normalizedUnit: string;
  };
  observedAt?: string;
  receivedAt: string;
  forecastFor?: string;
  source: EvidenceSource;
  dataMode: EvidenceDataMode;
  quality: EvidenceQuality;
  freshness: EvidenceFreshness;
  decisionEligible: boolean;
  limitations: readonly string[];
  correctionOfEvidenceId?: string;
  invalidatedAt?: string;
  policyVersion: string;
  conversionVersion: string;
  calibrationVersion?: string;
}

export interface PlotEvidenceSummary {
  plotId: string;
  generatedAt: string;
  summaryVersion: number;
  cards: readonly {
    cardId: string;
    title: string;
    status: 'CURRENT' | 'STALE' | 'EMPTY' | 'OFFLINE' | 'DENIED' | 'CONFLICTING' | 'UNAVAILABLE';
    primary?: EvidenceRecord;
    records: readonly EvidenceRecord[];
  }[];
}

export interface SoilRecordInput {
  commandId: string;
  expectedRevision: number;
  measurement: {
    ph?: number | undefined;
    nitrogen?: number | undefined;
    phosphorus?: number | undefined;
    potassium?: number | undefined;
    unit: 'MG_PER_KG' | 'KG_PER_HECTARE' | 'UNKNOWN';
    source: 'SOIL_HEALTH_CARD' | 'LABORATORY' | 'FARMER_MANUAL' | 'SENSOR' | 'UNKNOWN';
    observedAt?: string | undefined;
    sourceReference: string;
    sourceRightsLabel: string;
    sourceVersion: string;
  };
  clientContext: {
    clientRecordedAt: string;
    timezone: 'Asia/Kolkata';
    dataModeClaim: EvidenceDataMode;
  };
}

export interface SoilRecordResult {
  commandId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED';
  soilRecordId: string;
  evidenceIds: readonly string[];
  revision: number;
  serverReceivedAt: string;
}

export interface EvidenceRepository {
  listByPlot(owner: FarmerSetupOwner, plotId: string): Promise<readonly EvidenceRecord[]>;
  appendSoilRecord(
    owner: FarmerSetupOwner,
    plotId: string,
    input: SoilRecordInput,
    records: readonly EvidenceRecord[],
    soilRecordId: string,
  ): Promise<SoilRecordResult>;
}

export class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly #records = new Map<string, EvidenceRecord[]>();
  readonly #receipts = new Map<string, SoilRecordResult>();

  async listByPlot(owner: FarmerSetupOwner, plotId: string): Promise<readonly EvidenceRecord[]> {
    await Promise.resolve();
    return structuredClone(this.#records.get(evidenceKey(owner, plotId)) ?? []);
  }

  async appendSoilRecord(
    owner: FarmerSetupOwner,
    plotId: string,
    input: SoilRecordInput,
    records: readonly EvidenceRecord[],
    soilRecordId: string,
  ): Promise<SoilRecordResult> {
    await Promise.resolve();
    const receiptKey = `${evidenceKey(owner, plotId)}:${input.commandId}`;
    const existing = this.#receipts.get(receiptKey);
    if (existing !== undefined) return { ...existing, disposition: 'ALREADY_ACCEPTED' };
    const key = evidenceKey(owner, plotId);
    this.#records.set(key, [...(this.#records.get(key) ?? []), ...structuredClone(records)]);
    const result: SoilRecordResult = {
      commandId: input.commandId,
      disposition: 'ACCEPTED',
      soilRecordId,
      evidenceIds: records.map((record) => record.evidenceId),
      revision: input.expectedRevision + 1,
      serverReceivedAt: records[0]?.receivedAt ?? new Date().toISOString(),
    };
    this.#receipts.set(receiptKey, result);
    return result;
  }
}

export class EvidenceService {
  constructor(
    private readonly repository: EvidenceRepository,
    private readonly setupRepository: FarmerSetupRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = randomUUID,
  ) {}

  async summarize(owner: FarmerSetupOwner, plotId: string): Promise<PlotEvidenceSummary> {
    await this.assertPlotOwned(owner, plotId);
    const generatedAt = this.now().toISOString();
    const records = await this.repository.listByPlot(owner, plotId);
    const seeded =
      records.length === 0 ? this.simulatedRaigadEvidence(plotId, generatedAt) : records;
    return {
      plotId,
      generatedAt,
      summaryVersion: 1,
      cards: [
        this.card('weather', 'Weather status', seeded, ['WEATHER_FORECAST', 'WEATHER_HISTORY']),
        this.card('earth', 'Earth observation', seeded, ['EARTH_OBSERVATION']),
        this.card('soil', 'Soil status', seeded, ['SOIL_MEASUREMENT', 'HARDWARE_TELEMETRY']),
      ],
    };
  }

  async recordSoil(
    owner: FarmerSetupOwner,
    plotId: string,
    input: SoilRecordInput,
  ): Promise<SoilRecordResult> {
    await this.assertPlotOwned(owner, plotId);
    const receivedAt = this.now().toISOString();
    const soilRecordId = this.id();
    const source = sourceForSoil(input);
    const records = soilEvidenceFromMeasurement({
      input,
      plotId,
      receivedAt,
      source,
      id: this.id,
    });
    return this.repository.appendSoilRecord(owner, plotId, input, records, soilRecordId);
  }

  private async assertPlotOwned(owner: FarmerSetupOwner, plotId: string): Promise<void> {
    const setup = await this.setupRepository.load(owner);
    const owned = setup?.draft?.farms.some((farm) =>
      farm.plots.some((plot) => plot.plotId === plotId),
    );
    if (!owned) throw new Error('AUTHORIZATION_DENIED');
  }

  private card(
    cardId: string,
    title: string,
    records: readonly EvidenceRecord[],
    kinds: readonly EvidenceRecord['kind'][],
  ): PlotEvidenceSummary['cards'][number] {
    const selected = records.filter((record) => kinds.includes(record.kind));
    const hasConflict = selected.some((record) => record.value.state === 'CONFLICTING');
    const hasUnavailable = selected.some((record) => record.freshness === 'UNAVAILABLE');
    const hasStale = selected.some((record) => record.freshness === 'DATA_IS_OLD');
    return {
      cardId,
      title,
      status:
        selected.length === 0
          ? 'EMPTY'
          : hasConflict
            ? 'CONFLICTING'
            : hasUnavailable
              ? 'UNAVAILABLE'
              : hasStale
                ? 'STALE'
                : 'CURRENT',
      ...(selected[0] === undefined ? {} : { primary: selected[0] }),
      records: selected,
    };
  }

  private simulatedRaigadEvidence(plotId: string, receivedAt: string): readonly EvidenceRecord[] {
    const source = {
      sourceId: 'raigad-demo-fixture-2026-m4',
      sourceName: 'Raigad demo fixture',
      provenanceType: 'WEATHER' as const,
      rightsLabel: 'Synthetic demo data',
      sourceVersion: 'fixture-v1',
    };
    return [
      knownEvidence({
        evidenceId: this.id(),
        plotId,
        kind: 'WEATHER_FORECAST',
        metricKey: 'forecast_rainfall_24h',
        normalizedValue: '18.4',
        normalizedUnit: 'MILLIMETRE',
        receivedAt,
        forecastFor: receivedAt,
        source,
        dataMode: 'SIMULATED',
        quality: 'USE_WITH_CAUTION',
        freshness: 'CURRENT',
        decisionEligible: false,
        limitations: ['Demo-safe simulated forecast; not a live provider response.'],
      }),
      knownEvidence({
        evidenceId: this.id(),
        plotId,
        kind: 'EARTH_OBSERVATION',
        metricKey: 'sentinel2_ndvi_proxy',
        normalizedValue: '0.61',
        normalizedUnit: 'INDEX',
        receivedAt,
        observedAt: receivedAt,
        source: {
          ...source,
          provenanceType: 'SATELLITE',
          sourceName: 'Simulated Sentinel-2 fixture',
        },
        dataMode: 'SIMULATED',
        quality: 'USE_WITH_CAUTION',
        freshness: 'CURRENT',
        decisionEligible: false,
        limitations: [
          'Fixture-backed Earth observation proposal; no Earth Engine credential used.',
        ],
      }),
    ];
  }
}

function evidenceKey(owner: FarmerSetupOwner, plotId: string): string {
  return `${owner.environment}:${owner.subjectId}:${plotId}`;
}

function sourceForSoil(input: SoilRecordInput): EvidenceSource {
  const provenanceType =
    input.measurement.source === 'UNKNOWN' ? 'FARMER_MANUAL' : input.measurement.source;
  return {
    sourceId: input.measurement.sourceReference,
    sourceName: input.measurement.source,
    provenanceType,
    rightsLabel: input.measurement.sourceRightsLabel,
    sourceVersion: input.measurement.sourceVersion,
  };
}

function knownEvidence(
  input: Omit<EvidenceRecord, 'value' | 'policyVersion' | 'conversionVersion'> & {
    normalizedValue: string;
    normalizedUnit: string;
  },
): EvidenceRecord {
  return {
    ...input,
    value: {
      state: 'KNOWN',
      originalValue: input.normalizedValue,
      originalUnit: input.normalizedUnit,
      normalizedValue: input.normalizedValue,
      normalizedUnit: input.normalizedUnit,
    },
    policyVersion: 'evidence-m4-v1',
    conversionVersion: 'unit-conversion-m4-v1',
  };
}

function soilEvidenceFromMeasurement(input: {
  input: SoilRecordInput;
  plotId: string;
  receivedAt: string;
  source: EvidenceSource;
  id: () => string;
}): readonly EvidenceRecord[] {
  const measurement = input.input.measurement;
  const dataMode = input.input.clientContext.dataModeClaim;
  const quality: EvidenceQuality =
    measurement.source === 'SENSOR'
      ? 'PENDING'
      : measurement.observedAt
        ? 'USE_WITH_CAUTION'
        : 'DO_NOT_USE';
  const observedAt = measurement.observedAt ?? input.input.clientContext.clientRecordedAt;
  const entries = [
    ['soil_ph', measurement.ph, 'PH'],
    ['nitrogen', measurement.nitrogen, measurement.unit],
    ['phosphorus', measurement.phosphorus, measurement.unit],
    ['potassium', measurement.potassium, measurement.unit],
  ] as const;
  return entries.flatMap(([metricKey, value, unit]) => {
    if (value === undefined) return [];
    return [
      {
        evidenceId: input.id(),
        plotId: input.plotId,
        kind: 'SOIL_MEASUREMENT',
        metricKey,
        value: {
          state: 'KNOWN',
          originalValue: String(value),
          originalUnit: unit,
          normalizedValue: String(value),
          normalizedUnit: unit,
        },
        observedAt,
        receivedAt: input.receivedAt,
        source: input.source,
        dataMode,
        quality:
          metricKey === 'nitrogen' || metricKey === 'phosphorus' || metricKey === 'potassium'
            ? 'TREND_ONLY'
            : quality,
        freshness: measurement.observedAt ? 'CURRENT' : 'DATA_IS_OLD',
        decisionEligible: false,
        limitations: [
          'Milestone 4 evidence only; crop recommendation and advisory decisions are out of scope.',
        ],
        policyVersion: 'evidence-m4-v1',
        conversionVersion: 'unit-conversion-m4-v1',
        ...(measurement.source === 'SENSOR' ? { calibrationVersion: 'pending-m8-validation' } : {}),
      },
    ];
  });
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

export interface RecommendationRunRequest {
  schemaVersion: 'recommendation-request-v1';
  planningSeasonKey: string;
  planningSeasonVersion: string;
  proposedStartWindow: {
    kind: 'SOWING' | 'TRANSPLANTING';
    earliestDate: string;
    latestDate: string;
    timezone: 'Asia/Kolkata';
  };
  cultivationMethod: 'TRADITIONAL' | 'ORGANIC' | 'MIXED' | 'UNKNOWN';
  landAvailabilityWindow: { availableFrom: string; availableUntil: string };
  confirmedAreaRef: { plotId: string; areaRevision: number };
  farmerConstraintRefs: readonly string[];
  planningContextRevision: number;
}

export interface RecommendationRunReceipt {
  operationId: string;
  state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_TERMINAL';
  acceptedAt: string;
  estimatedCompletionSeconds: number;
}

export interface RecommendationRunStatus {
  operationId: string;
  state: 'SUCCEEDED' | 'FAILED_TERMINAL';
  recommendationId?: string;
  problemCode?: string;
  updatedAt: string;
}

export interface RecommendationAcceptanceInput {
  commandId: string;
  expectedRevision: number;
  candidateId: string;
  start: {
    mode: 'PROPOSED' | 'ACTUAL';
    kind: 'SOWING' | 'TRANSPLANTING';
    date: string;
    timezone: 'Asia/Kolkata';
  };
}

export interface RecommendationAcceptanceReceipt {
  commandId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED';
  acceptanceId: string;
  seasonId: string;
  calendarId: string;
  taskIds: readonly string[];
  seasonState: 'PLANNED_AWAITING_START' | 'ACTIVE';
  serverReceivedAt: string;
}

export interface SeasonCalendar {
  seasonId: string;
  calendarId: string;
  generatedAt: string;
  tasks: readonly {
    taskId: string;
    title: string;
    dueDate: string;
    state: 'PLANNED' | 'ACTIVE' | 'DONE' | 'CANNOT_DO';
    source: 'RECOMMENDATION_ACCEPTANCE';
  }[];
}

export interface RecommendationRecord {
  recommendation: ReturnType<typeof recommendCrops>;
  owner: FarmerSetupOwner;
  plotId: string;
}

export interface AdvisoryRecord {
  advisory: ReturnType<typeof evaluateAdvisory>;
  owner: FarmerSetupOwner;
  plotId: string;
}

export interface AdvisoryResponseInput {
  commandId: string;
  expectedRevision: number;
  response: 'ACKNOWLEDGE' | 'SNOOZE' | 'MARK_ACTION_COMPLETED' | 'CANNOT_DO';
  snoozeUntil?: string;
  note?: string;
  clientRecordedAt: string;
  timezone: 'Asia/Kolkata';
}

export interface AdvisoryResponseReceipt {
  commandId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED';
  advisoryId: string;
  lifecycleState: ReturnType<typeof evaluateAdvisory>['lifecycleState'];
  eventIds: readonly string[];
  serverReceivedAt: string;
}

export interface AdvisoryEvidenceProvider {
  buildInput(input: {
    readonly owner: FarmerSetupOwner;
    readonly plotId: string;
    readonly generatedAt: string;
    readonly id: () => string;
  }): Promise<Omit<AdvisoryInput, 'advisoryId' | 'alertId' | 'taskId' | 'previousActiveAdvisory'>>;
}

export interface AdvisoryRepository {
  loadAdvisory(owner: FarmerSetupOwner, advisoryId: string): Promise<AdvisoryRecord | undefined>;
  listAdvisories(owner: FarmerSetupOwner): Promise<readonly AdvisoryRecord[]>;
  loadByDeduplicationKey(
    owner: FarmerSetupOwner,
    deduplicationKey: string,
  ): Promise<AdvisoryRecord | undefined>;
  saveAdvisory(record: AdvisoryRecord): Promise<void>;
  loadResponse(
    owner: FarmerSetupOwner,
    commandId: string,
  ): Promise<AdvisoryResponseReceipt | undefined>;
  saveResponse(owner: FarmerSetupOwner, receipt: AdvisoryResponseReceipt): Promise<void>;
}

export class AdvisoryRejectedError extends Error {
  constructor(
    readonly code: 'AUTHORIZATION_DENIED' | 'ADVISORY_EXPIRED' | 'INVALID_STATE_TRANSITION',
  ) {
    super(code);
    this.name = 'AdvisoryRejectedError';
  }
}

export class AdvisoryService {
  constructor(
    private readonly setupRepository: FarmerSetupRepository,
    private readonly advisoryRepository: AdvisoryRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = randomUUID,
    private readonly evidenceProvider: AdvisoryEvidenceProvider = new RecordedRaigadAdvisoryEvidenceProvider(),
  ) {}

  async today(owner: FarmerSetupOwner) {
    const record = await this.setupRepository.load(owner);
    const plotId = record?.draft?.farms[0]?.plots[0]?.plotId;
    if (plotId === undefined) {
      return {
        generatedAt: this.now().toISOString(),
        locale: record?.draft?.profile.preferredLocale ?? 'mr-IN',
        dataMode: 'SIMULATED' as const,
        cards: [],
        syncState: 'SYNCED' as const,
      };
    }
    const generated = await this.evaluatePlot(owner, plotId);
    const cards = (await this.advisoryRepository.listAdvisories(owner))
      .map((item) => item.advisory)
      .filter((item) => item.lifecycleState === 'ACTIVE' || item.lifecycleState === 'DEDUPLICATED')
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, 12);
    return {
      generatedAt: generated.generatedAt,
      locale: record?.draft?.profile.preferredLocale ?? 'mr-IN',
      dataMode: generated.dataMode,
      cards,
      syncState: 'SYNCED' as const,
    };
  }

  async evaluatePlot(owner: FarmerSetupOwner, plotId: string) {
    await this.assertPlotOwned(owner, plotId);
    const generatedAt = this.now().toISOString();
    const advisoryId = this.id();
    const alertId = this.id();
    const taskId = this.id();
    const base = await this.evidenceProvider.buildInput({
      owner,
      plotId,
      generatedAt,
      id: this.id,
    });
    const probe = evaluateAdvisory({ ...base, advisoryId, alertId, taskId });
    const previous = await this.advisoryRepository.loadByDeduplicationKey(
      owner,
      probe.deduplicationKey,
    );
    const advisory =
      previous === undefined
        ? probe
        : evaluateAdvisory({
            ...base,
            advisoryId,
            alertId,
            taskId,
            previousActiveAdvisory: previous.advisory,
          });
    await this.advisoryRepository.saveAdvisory({ advisory, owner, plotId });
    return advisory;
  }

  async advisory(owner: FarmerSetupOwner, advisoryId: string) {
    const record = await this.advisoryRepository.loadAdvisory(owner, advisoryId);
    if (record === undefined) throw new AdvisoryRejectedError('AUTHORIZATION_DENIED');
    await this.assertPlotOwned(owner, record.plotId);
    return record.advisory;
  }

  async respond(input: {
    owner: FarmerSetupOwner;
    advisoryId: string;
    request: AdvisoryResponseInput;
  }): Promise<AdvisoryResponseReceipt> {
    const replay = await this.advisoryRepository.loadResponse(input.owner, input.request.commandId);
    if (replay !== undefined) return { ...replay, disposition: 'ALREADY_ACCEPTED' };

    const record = await this.advisoryRepository.loadAdvisory(input.owner, input.advisoryId);
    if (record === undefined) throw new AdvisoryRejectedError('AUTHORIZATION_DENIED');
    if (record.advisory.etagRevision !== input.request.expectedRevision) {
      throw new AdvisoryRejectedError('INVALID_STATE_TRANSITION');
    }
    if (Date.parse(record.advisory.expiresAt) <= this.now().getTime()) {
      throw new AdvisoryRejectedError('ADVISORY_EXPIRED');
    }

    const lifecycleState: AdvisoryResponseReceipt['lifecycleState'] =
      input.request.response === 'ACKNOWLEDGE'
        ? 'ACKNOWLEDGED'
        : input.request.response === 'SNOOZE'
          ? 'SNOOZED'
          : input.request.response === 'MARK_ACTION_COMPLETED'
            ? 'RESOLVED'
            : 'ACTIVE';
    const updated = {
      ...record.advisory,
      lifecycleState,
      etagRevision: record.advisory.etagRevision + 1,
      alert: record.advisory.alert
        ? {
            ...record.advisory.alert,
            lifecycleState:
              lifecycleState === 'ACKNOWLEDGED' ||
              lifecycleState === 'SNOOZED' ||
              lifecycleState === 'RESOLVED'
                ? lifecycleState
                : record.advisory.alert.lifecycleState,
            lastInteractionAt: this.now().toISOString(),
          }
        : undefined,
    };
    await this.advisoryRepository.saveAdvisory({ ...record, advisory: updated });
    const receipt: AdvisoryResponseReceipt = {
      commandId: input.request.commandId,
      disposition: 'ACCEPTED',
      advisoryId: input.advisoryId,
      lifecycleState,
      eventIds: [this.id()],
      serverReceivedAt: this.now().toISOString(),
    };
    await this.advisoryRepository.saveResponse(input.owner, receipt);
    return receipt;
  }

  private async assertPlotOwned(owner: FarmerSetupOwner, plotId: string): Promise<void> {
    const record = await this.setupRepository.load(owner);
    const ownsPlot = record?.draft?.farms.some((farm) =>
      farm.plots.some((plot) => plot.plotId === plotId),
    );
    if (!ownsPlot) throw new AdvisoryRejectedError('AUTHORIZATION_DENIED');
  }
}

export interface RecommendationEvidencePackage {
  readonly evidence: readonly AgronomyEvidence[];
  readonly cropProfiles: readonly CropProfile[];
  readonly ruleSetVersion: string;
  readonly profileSetVersion: string;
  readonly templateSetVersion: string;
}

export interface RecommendationEvidenceProvider {
  buildPackage(input: {
    readonly owner: FarmerSetupOwner;
    readonly plotId: string;
    readonly request: RecommendationRunRequest;
    readonly generatedAt: string;
    readonly id: () => string;
  }): Promise<RecommendationEvidencePackage>;
}

export interface RecommendationRepository {
  loadRun(
    owner: FarmerSetupOwner,
    operationId: string,
  ): Promise<RecommendationRunStatus | undefined>;
  saveRun(owner: FarmerSetupOwner, status: RecommendationRunStatus): Promise<void>;
  loadRecommendation(
    owner: FarmerSetupOwner,
    recommendationId: string,
  ): Promise<RecommendationRecord | undefined>;
  saveRecommendation(record: RecommendationRecord): Promise<void>;
  loadAcceptance(
    owner: FarmerSetupOwner,
    commandId: string,
  ): Promise<RecommendationAcceptanceReceipt | undefined>;
  saveAcceptance(owner: FarmerSetupOwner, receipt: RecommendationAcceptanceReceipt): Promise<void>;
  loadCalendar(owner: FarmerSetupOwner, seasonId: string): Promise<SeasonCalendar | undefined>;
  saveCalendar(owner: FarmerSetupOwner, calendar: SeasonCalendar): Promise<void>;
}

export class RecommendationRejectedError extends Error {
  constructor(readonly code: 'AUTHORIZATION_DENIED' | 'INVALID_STATE_TRANSITION') {
    super(code);
    this.name = 'RecommendationRejectedError';
  }
}

export class RecommendationService {
  constructor(
    private readonly setupRepository: FarmerSetupRepository,
    private readonly recommendationRepository: RecommendationRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = randomUUID,
    private readonly evidenceProvider: RecommendationEvidenceProvider = new RecordedRaigadRecommendationEvidenceProvider(),
  ) {}

  async readiness(owner: FarmerSetupOwner, plotId: string) {
    await this.assertPlotOwned(owner, plotId);
    return {
      plotId,
      generatedAt: this.now().toISOString(),
      planningContextRevision: 1,
      groups: {
        ready: [
          { key: 'plot_context', label: 'Plot and area are confirmed', state: 'CONFIRMED' },
          { key: 'water_context', label: 'Water context is available', state: 'CONFIRMED' },
          { key: 'soil_context', label: 'Soil record is available', state: 'CONFIRMED' },
        ],
        needsAttention: [],
        optionalImprovements: [
          { key: 'hardware', label: 'Hardware evidence is optional', state: 'NOT_APPLICABLE' },
        ],
      },
    };
  }

  async createRun(input: {
    owner: FarmerSetupOwner;
    operationId: string;
    plotId: string;
    request: RecommendationRunRequest;
  }): Promise<RecommendationRunReceipt> {
    await this.assertPlotOwned(input.owner, input.plotId);
    const existing = await this.recommendationRepository.loadRun(input.owner, input.operationId);
    const acceptedAt = this.now().toISOString();
    if (existing !== undefined) {
      return {
        operationId: input.operationId,
        state: existing.state,
        acceptedAt,
        estimatedCompletionSeconds: 1,
      };
    }
    const recommendationId = this.id();
    const evidencePackage = await this.evidenceProvider.buildPackage({
      owner: input.owner,
      plotId: input.plotId,
      request: input.request,
      generatedAt: acceptedAt,
      id: this.id,
    });
    const recommendation = recommendCrops(
      recommendationEngineInput({
        recommendationId,
        plotId: input.plotId,
        request: input.request,
        generatedAt: acceptedAt,
        evidencePackage,
      }),
    );
    await this.recommendationRepository.saveRecommendation({
      recommendation,
      owner: input.owner,
      plotId: input.plotId,
    });
    await this.recommendationRepository.saveRun(input.owner, {
      operationId: input.operationId,
      state: 'SUCCEEDED',
      recommendationId,
      updatedAt: acceptedAt,
    });
    return {
      operationId: input.operationId,
      state: 'SUCCEEDED',
      acceptedAt,
      estimatedCompletionSeconds: 1,
    };
  }

  async runStatus(owner: FarmerSetupOwner, operationId: string): Promise<RecommendationRunStatus> {
    const existing = await this.recommendationRepository.loadRun(owner, operationId);
    return (
      existing ?? {
        operationId,
        state: 'FAILED_TERMINAL',
        problemCode: 'DEPENDENCY_UNAVAILABLE',
        updatedAt: this.now().toISOString(),
      }
    );
  }

  async recommendation(owner: FarmerSetupOwner, recommendationId: string) {
    const record = await this.recommendationRepository.loadRecommendation(owner, recommendationId);
    if (record === undefined) throw new RecommendationRejectedError('AUTHORIZATION_DENIED');
    return record.recommendation;
  }

  async requestReview(input: {
    owner: FarmerSetupOwner;
    recommendationId: string;
    commandId: string;
    expectedRevision: number;
  }): Promise<SafeCommandReceipt> {
    await this.recommendation(input.owner, input.recommendationId);
    return {
      commandId: input.commandId,
      disposition: 'ACCEPTED',
      result: {
        type: 'rskWorkItem',
        id: input.recommendationId,
        revision: input.expectedRevision + 1,
      },
      eventIds: [this.id()],
      serverReceivedAt: this.now().toISOString(),
    };
  }

  async accept(input: {
    owner: FarmerSetupOwner;
    recommendationId: string;
    request: RecommendationAcceptanceInput;
  }): Promise<RecommendationAcceptanceReceipt> {
    const replay = await this.recommendationRepository.loadAcceptance(
      input.owner,
      input.request.commandId,
    );
    if (replay !== undefined) return { ...replay, disposition: 'ALREADY_ACCEPTED' };

    const record = await this.recommendationRepository.loadRecommendation(
      input.owner,
      input.recommendationId,
    );
    if (record?.recommendation.state !== 'READY') {
      throw new RecommendationRejectedError('INVALID_STATE_TRANSITION');
    }
    const candidate = record.recommendation.candidates.find(
      (item) => item.candidateId === input.request.candidateId,
    );
    if (candidate === undefined) throw new RecommendationRejectedError('INVALID_STATE_TRANSITION');

    const acceptanceId = this.id();
    const seasonId = this.id();
    const calendarId = this.id();
    const taskIds = [this.id(), this.id(), this.id()];
    const seasonState = input.request.start.mode === 'ACTUAL' ? 'ACTIVE' : 'PLANNED_AWAITING_START';
    const calendar: SeasonCalendar = {
      seasonId,
      calendarId,
      generatedAt: this.now().toISOString(),
      tasks: [
        {
          taskId: taskIds[0] ?? this.id(),
          title: `Prepare field for ${candidate.cropName}`,
          dueDate: input.request.start.date,
          state: seasonState === 'ACTIVE' ? 'ACTIVE' : 'PLANNED',
          source: 'RECOMMENDATION_ACCEPTANCE',
        },
        {
          taskId: taskIds[1] ?? this.id(),
          title: 'Check water availability before sowing',
          dueDate: input.request.start.date,
          state: 'PLANNED',
          source: 'RECOMMENDATION_ACCEPTANCE',
        },
        {
          taskId: taskIds[2] ?? this.id(),
          title: 'Record first field observation',
          dueDate: input.request.start.date,
          state: 'PLANNED',
          source: 'RECOMMENDATION_ACCEPTANCE',
        },
      ],
    };
    const receipt: RecommendationAcceptanceReceipt = {
      commandId: input.request.commandId,
      disposition: 'ACCEPTED',
      acceptanceId,
      seasonId,
      calendarId,
      taskIds,
      seasonState,
      serverReceivedAt: this.now().toISOString(),
    };
    await this.recommendationRepository.saveAcceptance(input.owner, receipt);
    await this.recommendationRepository.saveCalendar(input.owner, calendar);
    return receipt;
  }

  async confirmSeasonStart(input: {
    owner: FarmerSetupOwner;
    seasonId: string;
    commandId: string;
    expectedRevision: number;
  }): Promise<SafeCommandReceipt> {
    const calendar = await this.recommendationRepository.loadCalendar(input.owner, input.seasonId);
    if (calendar === undefined) throw new RecommendationRejectedError('AUTHORIZATION_DENIED');
    return {
      commandId: input.commandId,
      disposition: 'ACCEPTED',
      result: { type: 'season', id: input.seasonId, revision: input.expectedRevision + 1 },
      eventIds: [this.id()],
      serverReceivedAt: this.now().toISOString(),
    };
  }

  async calendar(owner: FarmerSetupOwner, seasonId: string): Promise<SeasonCalendar> {
    const calendar = await this.recommendationRepository.loadCalendar(owner, seasonId);
    if (calendar === undefined) throw new RecommendationRejectedError('AUTHORIZATION_DENIED');
    return calendar;
  }

  private async assertPlotOwned(owner: FarmerSetupOwner, plotId: string): Promise<void> {
    const record = await this.setupRepository.load(owner);
    const ownsPlot = record?.draft?.farms.some((farm) =>
      farm.plots.some((plot) => plot.plotId === plotId),
    );
    if (!ownsPlot) throw new RecommendationRejectedError('AUTHORIZATION_DENIED');
  }
}

export class InMemoryRecommendationRepository implements RecommendationRepository {
  readonly #runs = new Map<string, RecommendationRunStatus>();
  readonly #recommendations = new Map<string, RecommendationRecord>();
  readonly #acceptances = new Map<string, RecommendationAcceptanceReceipt>();
  readonly #calendars = new Map<string, SeasonCalendar>();

  async loadRun(owner: FarmerSetupOwner, operationId: string) {
    await Promise.resolve();
    return cloneJson(this.#runs.get(key(owner, operationId)));
  }

  async saveRun(owner: FarmerSetupOwner, status: RecommendationRunStatus) {
    await Promise.resolve();
    this.#runs.set(key(owner, status.operationId), cloneJson(status));
  }

  async loadRecommendation(owner: FarmerSetupOwner, recommendationId: string) {
    await Promise.resolve();
    return cloneJson(this.#recommendations.get(key(owner, recommendationId)));
  }

  async saveRecommendation(record: RecommendationRecord) {
    await Promise.resolve();
    this.#recommendations.set(
      key(record.owner, record.recommendation.recommendationId),
      cloneJson(record),
    );
  }

  async loadAcceptance(owner: FarmerSetupOwner, commandId: string) {
    await Promise.resolve();
    return cloneJson(this.#acceptances.get(key(owner, commandId)));
  }

  async saveAcceptance(owner: FarmerSetupOwner, receipt: RecommendationAcceptanceReceipt) {
    await Promise.resolve();
    this.#acceptances.set(key(owner, receipt.commandId), cloneJson(receipt));
  }

  async loadCalendar(owner: FarmerSetupOwner, seasonId: string) {
    await Promise.resolve();
    return cloneJson(this.#calendars.get(key(owner, seasonId)));
  }

  async saveCalendar(owner: FarmerSetupOwner, calendar: SeasonCalendar) {
    await Promise.resolve();
    this.#calendars.set(key(owner, calendar.seasonId), cloneJson(calendar));
  }
}

export class InMemoryAdvisoryRepository implements AdvisoryRepository {
  readonly #advisories = new Map<string, AdvisoryRecord>();
  readonly #responses = new Map<string, AdvisoryResponseReceipt>();

  async loadAdvisory(owner: FarmerSetupOwner, advisoryId: string) {
    await Promise.resolve();
    return cloneJson(this.#advisories.get(key(owner, advisoryId)));
  }

  async listAdvisories(owner: FarmerSetupOwner) {
    await Promise.resolve();
    return [...this.#advisories.values()]
      .filter(
        (record) =>
          record.owner.environment === owner.environment &&
          record.owner.subjectId === owner.subjectId,
      )
      .map((record) => cloneJson(record));
  }

  async loadByDeduplicationKey(owner: FarmerSetupOwner, deduplicationKey: string) {
    await Promise.resolve();
    const record = [...this.#advisories.values()].find(
      (item) =>
        item.owner.environment === owner.environment &&
        item.owner.subjectId === owner.subjectId &&
        item.advisory.deduplicationKey === deduplicationKey &&
        item.advisory.lifecycleState === 'ACTIVE',
    );
    return cloneJson(record);
  }

  async saveAdvisory(record: AdvisoryRecord) {
    await Promise.resolve();
    this.#advisories.set(key(record.owner, record.advisory.advisoryId), cloneJson(record));
  }

  async loadResponse(owner: FarmerSetupOwner, commandId: string) {
    await Promise.resolve();
    return cloneJson(this.#responses.get(key(owner, commandId)));
  }

  async saveResponse(owner: FarmerSetupOwner, receipt: AdvisoryResponseReceipt) {
    await Promise.resolve();
    this.#responses.set(key(owner, receipt.commandId), cloneJson(receipt));
  }
}

export class RecordedRaigadAdvisoryEvidenceProvider implements AdvisoryEvidenceProvider {
  constructor(
    private readonly scenario:
      | 'LOW_MOISTURE_DRY_FORECAST'
      | 'RAIN_EXPECTED_DELAY'
      | 'NUTRIENT_DEFICIENCY'
      | 'STALE_SENSOR' = 'LOW_MOISTURE_DRY_FORECAST',
  ) {}

  async buildInput(input: {
    readonly plotId: string;
    readonly generatedAt: string;
    readonly id: () => string;
  }): Promise<Omit<AdvisoryInput, 'advisoryId' | 'alertId' | 'taskId' | 'previousActiveAdvisory'>> {
    await Promise.resolve();
    return {
      plotId: input.plotId,
      generatedAt: input.generatedAt,
      activeFrom: input.generatedAt,
      expiresAt: new Date(Date.parse(input.generatedAt) + 24 * 60 * 60 * 1000).toISOString(),
      ruleSetVersion: 'raigad-advisory-rules-v1',
      crop: {
        cropName: 'Rice',
        cropStage: 'VEGETATIVE',
        sowingDate: '2026-06-20',
        irrigationAvailable: true,
      },
      evidence: recordedAdvisoryEvidence(this.scenario, input.id),
      shadowRiskScore: { modelVersion: 'shadow-risk-v0', score: 51 },
    };
  }
}

function key(owner: FarmerSetupOwner, id: string): string {
  return `${owner.environment}:${owner.subjectId}:${id}`;
}

function recordedAdvisoryEvidence(
  scenario: ConstructorParameters<typeof RecordedRaigadAdvisoryEvidenceProvider>[0],
  id: () => string,
): AdvisoryInput['evidence'] {
  const base = (
    metricKey: string,
    numericValue: number,
    extra: Partial<AdvisoryInput['evidence'][number]> = {},
  ) => ({
    evidenceId: id(),
    metricKey,
    numericValue,
    state: 'KNOWN' as const,
    dataMode: 'RECORDED' as const,
    quality: 'TRUSTED' as const,
    freshness: 'CURRENT' as const,
    sourceName: 'Raigad recorded Milestone 6 scenario',
    decisionEligible: true,
    rights: 'MODEL_INPUT_ALLOWED' as const,
    observedAt: '2026-07-14T08:30:00.000+05:30',
    ...extra,
  });
  if (scenario === 'RAIN_EXPECTED_DELAY') {
    return [base('rainfallForecast48hMm', 30), base('soilMoisturePct', 32)];
  }
  if (scenario === 'NUTRIENT_DEFICIENCY') {
    return [base('npkDeficitScore', 72), base('phStressScore', 48)];
  }
  if (scenario === 'STALE_SENSOR') {
    return [
      base('sensorAgeHours', 80, {
        dataMode: 'LIVE',
        freshness: 'DATA_IS_OLD',
        limitation: 'Sensor packet is stale; LIVE evidence is unavailable for this decision.',
      }),
    ];
  }
  return [
    base('drySpellDays', 6),
    base('rainfallHistory7dMm', 2),
    base('rainfallForecast48hMm', 1),
    base('soilMoisturePct', 12),
  ];
}

function recommendationEngineInput(input: {
  recommendationId: string;
  plotId: string;
  request: RecommendationRunRequest;
  generatedAt: string;
  evidencePackage: RecommendationEvidencePackage;
}): RecommendationInput {
  return {
    recommendationId: input.recommendationId,
    plotId: input.plotId,
    planningSeasonKey: input.request.planningSeasonKey,
    cultivationMethod: input.request.cultivationMethod,
    generatedAt: input.generatedAt,
    expiresAt: new Date(Date.parse(input.generatedAt) + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ruleSetVersion: input.evidencePackage.ruleSetVersion,
    profileSetVersion: input.evidencePackage.profileSetVersion,
    templateSetVersion: input.evidencePackage.templateSetVersion,
    evidence: input.evidencePackage.evidence,
    cropProfiles: input.evidencePackage.cropProfiles,
  };
}

export class RecordedRaigadRecommendationEvidenceProvider implements RecommendationEvidenceProvider {
  async buildPackage(input: {
    readonly request: RecommendationRunRequest;
    readonly id: () => string;
  }): Promise<RecommendationEvidencePackage> {
    await Promise.resolve();
    return {
      ruleSetVersion: 'raigad-recommendation-rules-v1',
      profileSetVersion: 'raigad-crop-profiles-v1-proposed',
      templateSetVersion: 'raigad-calendar-template-v1',
      evidence: [
        {
          evidenceId: input.id(),
          metricKey: 'soil.ph',
          state: 'KNOWN',
          dataMode: 'SIMULATED',
          quality: 'TRUSTED',
          freshness: 'CURRENT',
          sourceName: 'raigad-recommendation-m5-v1 soil',
          decisionEligible: true,
          rights: 'MODEL_INPUT_ALLOWED',
        },
        {
          evidenceId: input.id(),
          metricKey: 'water.availability',
          state: 'KNOWN',
          dataMode: 'SIMULATED',
          quality: 'TRUSTED',
          freshness: 'CURRENT',
          sourceName: 'raigad-recommendation-m5-v1 water',
          decisionEligible: true,
          rights: 'MODEL_INPUT_ALLOWED',
        },
        {
          evidenceId: input.id(),
          metricKey: 'weather.decision_rainfall',
          state: 'KNOWN',
          dataMode: 'SIMULATED',
          quality: 'USE_WITH_CAUTION',
          freshness: 'CURRENT',
          sourceName: 'raigad-recommendation-m5-v1 retained weather',
          decisionEligible: true,
          rights: 'MODEL_INPUT_ALLOWED',
        },
      ],
      cropProfiles: [
        {
          cropProfileId: 'raigad-rice-kharif-v1',
          cropName: 'Rice',
          supportedSeasonKeys: [input.request.planningSeasonKey],
          supportedMethods: [input.request.cultivationMethod],
          durationDays: 120,
          waterNeed: 'HIGH',
          regionalValidationScore: 82,
          componentScores: {
            soil: 82,
            water: 88,
            weather: 90,
            season: 92,
            satellite: 76,
            local: 82,
          },
          reasons: [
            'Fits the Raigad kharif window.',
            'Water context supports paddy on this Plot.',
            'Soil context is within the proposed profile range.',
          ],
          risks: ['If monsoon breaks, confirm water before transplanting.'],
        },
        {
          cropProfileId: 'raigad-groundnut-kharif-v1',
          cropName: 'Groundnut',
          supportedSeasonKeys: [input.request.planningSeasonKey],
          supportedMethods: [input.request.cultivationMethod],
          durationDays: 105,
          waterNeed: 'MEDIUM',
          regionalValidationScore: 74,
          componentScores: {
            soil: 78,
            water: 72,
            weather: 76,
            season: 80,
            satellite: 78,
            local: 76,
          },
          reasons: [
            'Moderate water demand.',
            'Duration fits the declared land availability window.',
          ],
          risks: ['Heavy rainfall can increase disease risk.'],
        },
        {
          cropProfileId: 'raigad-tur-kharif-v1',
          cropName: 'Tur',
          supportedSeasonKeys: [input.request.planningSeasonKey],
          supportedMethods: [input.request.cultivationMethod],
          durationDays: 165,
          waterNeed: 'LOW',
          regionalValidationScore: 68,
          componentScores: {
            soil: 72,
            water: 80,
            weather: 70,
            season: 74,
            satellite: 70,
            local: 68,
          },
          reasons: ['Lower water demand.', 'Useful fallback if water becomes uncertain.'],
          risks: ['Longer duration than the top crop.'],
        },
      ],
    };
  }
}

export class LiveUnavailableRecommendationEvidenceProvider implements RecommendationEvidenceProvider {
  async buildPackage(input: { readonly id: () => string }): Promise<RecommendationEvidencePackage> {
    await Promise.resolve();
    return {
      ruleSetVersion: 'raigad-recommendation-rules-v1',
      profileSetVersion: 'raigad-crop-profiles-v1-proposed',
      templateSetVersion: 'raigad-calendar-template-v1',
      evidence: ['soil.live', 'water.live', 'weather.live', 'earth.live'].map((metricKey) => ({
        evidenceId: input.id(),
        metricKey,
        state: 'MISSING',
        dataMode: 'LIVE',
        quality: 'DO_NOT_USE',
        freshness: 'UNAVAILABLE',
        sourceName: `${metricKey} provider unavailable`,
        decisionEligible: false,
        rights: 'MODEL_INPUT_ALLOWED',
      })),
      cropProfiles: [],
    };
  }
}

export interface LiveHttpRecommendationProviderEndpoint {
  readonly name: 'soil' | 'water' | 'weather' | 'earth';
  readonly url: string;
  readonly authorizationHeader?: string;
}

export interface LiveHttpRecommendationEvidenceProviderOptions {
  readonly endpoints: readonly LiveHttpRecommendationProviderEndpoint[];
  readonly timeoutMilliseconds?: number;
  readonly fetch?: typeof fetch;
}

export class LiveHttpRecommendationEvidenceProvider implements RecommendationEvidenceProvider {
  readonly #endpoints: readonly LiveHttpRecommendationProviderEndpoint[];
  readonly #fetch: typeof fetch;
  readonly #timeoutMilliseconds: number;
  readonly #unavailable = new LiveUnavailableRecommendationEvidenceProvider();

  constructor(options: LiveHttpRecommendationEvidenceProviderOptions) {
    this.#endpoints = options.endpoints;
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMilliseconds = options.timeoutMilliseconds ?? 2_500;
  }

  async buildPackage(input: {
    readonly owner: FarmerSetupOwner;
    readonly plotId: string;
    readonly request: RecommendationRunRequest;
    readonly generatedAt: string;
    readonly id: () => string;
  }): Promise<RecommendationEvidencePackage> {
    if (this.#endpoints.length === 0) {
      return await this.#unavailable.buildPackage(input);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.#timeoutMilliseconds);
    try {
      const responses = await Promise.all(
        this.#endpoints.map(async (endpoint) => {
          const response = await this.#fetch(endpoint.url, {
            body: JSON.stringify({
              environment: input.owner.environment,
              generatedAt: input.generatedAt,
              planningSeasonKey: input.request.planningSeasonKey,
              plotId: input.plotId,
            }),
            headers: {
              'Content-Type': 'application/json',
              ...(endpoint.authorizationHeader === undefined
                ? {}
                : { Authorization: endpoint.authorizationHeader }),
            },
            method: 'POST',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`RECOMMENDATION_PROVIDER_${endpoint.name}_FAILED`);
          return await response.json();
        }),
      );
      const merged = mergeProviderEvidencePackages(responses);
      return merged ?? (await this.#unavailable.buildPackage(input));
    } catch {
      return await this.#unavailable.buildPackage(input);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mergeProviderEvidencePackages(
  responses: readonly unknown[],
): RecommendationEvidencePackage | undefined {
  const packages = responses.flatMap((response) => {
    if (typeof response !== 'object' || response === null || Array.isArray(response)) return [];
    const candidate = response as Partial<RecommendationEvidencePackage>;
    if (
      typeof candidate.ruleSetVersion !== 'string' ||
      typeof candidate.profileSetVersion !== 'string' ||
      typeof candidate.templateSetVersion !== 'string' ||
      !Array.isArray(candidate.evidence) ||
      !Array.isArray(candidate.cropProfiles)
    ) {
      return [];
    }
    return [candidate as RecommendationEvidencePackage];
  });
  const first = packages[0];
  if (first === undefined) return undefined;
  return {
    ruleSetVersion: first.ruleSetVersion,
    profileSetVersion: first.profileSetVersion,
    templateSetVersion: first.templateSetVersion,
    evidence: packages.flatMap((item) => item.evidence),
    cropProfiles: first.cropProfiles,
  };
}
