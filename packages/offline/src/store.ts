import Dexie from 'dexie';

import type {
  DeviceMode,
  SyncBatchResponse,
  SyncCommandDisposition,
  SyncCommandEnvelope,
} from '@smart-fasal/contracts/schemas';

import {
  createPartitionDatabaseName,
  decryptJson,
  encryptJson,
  sha256CanonicalJson,
} from './crypto.js';
import {
  FarmerOfflineDatabase,
  LOCAL_DATABASE_SCHEMA_VERSION,
  type AcknowledgementRow,
  type AdvisoryCacheRow,
  type ConflictRow,
  type LocalEventRow,
  type MediaBlobRow,
  type MediaUploadRow,
  type OutboxRow,
  type ProjectionAuthority,
  type ProjectionRow,
  type RecommendationDraftRow,
  type RecommendationResultCacheRow,
  type SyncStateRow,
  type TombstoneRow,
  type EvidenceCacheRow,
} from './database.js';
import {
  assertOpaquePartitionKey,
  type PartitionKeyContext,
  type PartitionKeyProvider,
} from './key-provider.js';

type SyncProjectionDelta = SyncBatchResponse['feedEvents'][number]['projectionDeltas'][number];

interface ProjectionVersionPayload {
  readonly authoritativeRevision: number;
  readonly dataMode: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadChecksum: string;
  readonly sourceFeedEventId?: string;
}

interface LocalProjectionOverlay {
  readonly commandId: string;
  readonly eventId: string;
  readonly dataMode: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

interface StoredProjectionPayload {
  readonly serverBase?: ProjectionVersionPayload;
  readonly localOverlays?: readonly LocalProjectionOverlay[];
  /** Read-only compatibility with the staged v1 local projection shape. */
  readonly localOverlay?: LocalProjectionOverlay;
}

function projectionOverlays(payload: StoredProjectionPayload): readonly LocalProjectionOverlay[] {
  if (payload.localOverlays !== undefined) return payload.localOverlays;
  return payload.localOverlay === undefined ? [] : [payload.localOverlay];
}

interface StoredSyncState {
  readonly streamId: string;
  readonly cursor: string;
  readonly highWaterMark: string;
  readonly authorizationVersion: number;
  readonly subjectDeviceBindingId: string;
  readonly scope: 'FARMER_SELF_SERVICE';
  readonly lastBatchId?: string;
  readonly lastServerTime?: string;
}

export interface VersionRange {
  readonly minimum: number;
  readonly maximum: number;
}

export interface SchemaCompatibility {
  readonly localDatabase: VersionRange;
  readonly command: VersionRange;
  readonly clientEvent: VersionRange;
  readonly projection: VersionRange;
  readonly media: VersionRange;
}

export const DEFAULT_SCHEMA_COMPATIBILITY: SchemaCompatibility = Object.freeze({
  localDatabase: { minimum: 1, maximum: LOCAL_DATABASE_SCHEMA_VERSION },
  command: { minimum: 1, maximum: 1 },
  clientEvent: { minimum: 1, maximum: 1 },
  projection: { minimum: 1, maximum: 1 },
  media: { minimum: 1, maximum: 1 },
});

interface FarmerOfflinePartitionBaseOptions {
  readonly environment: string;
  readonly subjectDeviceBindingId: string;
  readonly deviceMode: DeviceMode;
  readonly compatibility?: SchemaCompatibility;
}

export type FarmerOfflinePartitionOptions = FarmerOfflinePartitionBaseOptions &
  (
    | { readonly key: CryptoKey; readonly keyProvider?: never }
    | { readonly key?: never; readonly keyProvider: PartitionKeyProvider }
  );

export interface LocalCommitInput {
  readonly event: {
    readonly eventId: string;
    readonly eventName: string;
    readonly eventSchemaVersion: number;
    readonly commandId: string;
    readonly actorRef: string;
    readonly deviceRef: string;
    readonly localSequence: number;
    readonly aggregateType: string;
    readonly aggregateId: string;
    readonly occurredAt: string;
    readonly clientRecordedAt: string;
    readonly timezone: string;
    readonly baseRevision: number;
    readonly dataMode: string;
    readonly provenanceTypes: readonly string[];
    readonly correlationId: string;
    readonly payload: Readonly<Record<string, unknown>>;
  };
  readonly projection: {
    readonly projectionType: string;
    readonly projectionId: string;
    readonly projectionSchemaVersion: number;
    readonly dataMode: string;
    readonly payload: Readonly<Record<string, unknown>>;
  };
  readonly command: SyncCommandEnvelope;
  readonly priority?: number;
}

export interface LocalCommitReceipt {
  readonly eventId: string;
  readonly commandId: string;
  readonly state: 'SAVED_ON_THIS_PHONE';
}

export interface OfflineProjection {
  readonly projectionType: string;
  readonly projectionId: string;
  readonly authorityState: ProjectionAuthority;
  readonly authoritativeRevision: number;
  readonly payload: Readonly<Record<string, unknown>> | undefined;
}

export interface SyncStreamStateInput {
  readonly streamId: string;
  readonly cursor: string;
  readonly highWaterMark?: string;
  readonly authorizationVersion: number;
  readonly subjectDeviceBindingId: string;
  readonly scope: 'FARMER_SELF_SERVICE';
}

export interface SyncResponseApplyInput {
  readonly expectedBatchId: string;
  readonly response: SyncBatchResponse;
}

export interface SyncBootstrapSnapshot {
  readonly streamId: string;
  readonly snapshotSchemaVersion: number;
  readonly snapshotChecksum: string;
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly projections: readonly SyncProjectionDelta[];
  readonly tombstones: readonly {
    readonly projectionType: string;
    readonly projectionId: string;
    readonly deletionEpoch: number;
    readonly minimumResurrectionRevision: number;
  }[];
  readonly highWaterMark: string;
  readonly cursor: string;
  readonly authorizationVersion: number;
}

export async function calculateBootstrapSnapshotChecksum(
  snapshot: Pick<SyncBootstrapSnapshot, 'projections' | 'tombstones' | 'highWaterMark'>,
): Promise<string> {
  return sha256CanonicalJson({
    projections: snapshot.projections,
    tombstones: snapshot.tombstones,
    highWaterMark: snapshot.highWaterMark,
  });
}

export interface MediaReservationInput {
  readonly mediaId: string;
  readonly mediaSchemaVersion: number;
  readonly priority: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface EvidenceCacheInput {
  readonly plotId: string;
  readonly status: 'CURRENT' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface RecommendationDraftInput {
  readonly draftId: string;
  readonly plotId: string;
  readonly status:
    'SAVED_ON_THIS_PHONE' | 'WAITING_FOR_INTERNET' | 'EVALUATING' | 'REJECTED' | 'CONFLICT';
  readonly commandId: string;
  readonly contextRevision: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface RecommendationResultCacheInput {
  readonly recommendationId: string;
  readonly plotId: string;
  readonly status: 'CURRENT' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';
  readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
  readonly generatedAt: string;
  readonly freshnessLabel: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface AdvisoryCacheInput {
  readonly advisoryId: string;
  readonly plotId: string;
  readonly status: 'CURRENT' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';
  readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
  readonly generatedAt: string;
  readonly urgency: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface AdvisoryResponseLocalInput {
  readonly eventId: string;
  readonly commandId: string;
  readonly advisoryId: string;
  readonly expectedRevision: number;
  readonly response: 'ACKNOWLEDGE' | 'SNOOZE' | 'MARK_ACTION_COMPLETED' | 'CANNOT_DO';
  readonly snoozeUntil?: string;
  readonly note?: string;
  readonly clientRecordedAt: string;
  readonly timezone: 'Asia/Kolkata';
  readonly actorRef: string;
  readonly deviceRef: string;
  readonly localSequence: number;
  readonly correlationId: string;
  readonly dataMode?: 'LIVE' | 'RECORDED' | 'SIMULATED';
}

export type CompatibilityResult =
  | { readonly status: 'VERIFIED' }
  | { readonly status: 'LOCKED_RECOVERY'; readonly unsupported: readonly string[] };

export type UserSwitchResult =
  | { readonly status: 'SAFE_TO_SWITCH' }
  | { readonly status: 'BLOCKED_UNSYNCED'; readonly pendingItems: number }
  | { readonly status: 'LOCKED_RECOVERY'; readonly pendingItems: number };

export class LockedRecoveryRequiredError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
    this.name = 'LockedRecoveryRequiredError';
  }
}

function inRange(value: number, range: VersionRange): boolean {
  return Number.isInteger(value) && value >= range.minimum && value <= range.maximum;
}

function projectionKey(type: string, id: string): string {
  return `${type}\u0000${id}`;
}

export class FarmerOfflineStore {
  private constructor(
    private readonly database: FarmerOfflineDatabase,
    readonly databaseName: string,
    private readonly subjectDeviceBindingId: string,
    private readonly deviceMode: DeviceMode,
    private readonly key: CryptoKey,
    private readonly compatibility: SchemaCompatibility,
    private readonly keyProvider: PartitionKeyProvider | undefined,
    private readonly keyContext: PartitionKeyContext,
  ) {}

  static async open(options: FarmerOfflinePartitionOptions): Promise<FarmerOfflineStore> {
    const databaseName = await createPartitionDatabaseName(
      options.environment,
      options.subjectDeviceBindingId,
      options.deviceMode,
    );
    const keyContext: PartitionKeyContext = {
      databaseName,
      environment: options.environment,
      subjectDeviceBindingId: options.subjectDeviceBindingId,
      deviceMode: options.deviceMode,
    };
    const keyProvider = options.keyProvider;
    if (options.key !== undefined && options.environment !== 'local') {
      throw new Error('DEVICE_WRAPPED_PARTITION_KEY_REQUIRED');
    }
    let key = options.key;
    if (key === undefined) {
      if (keyProvider === undefined) throw new Error('DEVICE_WRAPPED_PARTITION_KEY_REQUIRED');
      key = await keyProvider.unlock(keyContext);
    }
    assertOpaquePartitionKey(key);
    const database = new FarmerOfflineDatabase(databaseName);
    try {
      await database.open();
    } catch (error) {
      database.close();
      if (error instanceof Error && error.name === 'VersionError') {
        throw new LockedRecoveryRequiredError('LOCAL_DATABASE_NEWER_THAN_CLIENT');
      }
      throw error;
    }
    const compatibility = options.compatibility ?? DEFAULT_SCHEMA_COMPATIBILITY;
    const store = new FarmerOfflineStore(
      database,
      databaseName,
      options.subjectDeviceBindingId,
      options.deviceMode,
      key,
      compatibility,
      keyProvider,
      keyContext,
    );
    try {
      await store.initialize();
      await store.verifySchemaCompatibility(compatibility);
      return store;
    } catch (error) {
      database.close();
      keyProvider?.lock(keyContext);
      throw error;
    }
  }

  close(): void {
    this.database.close();
    this.keyProvider?.lock(this.keyContext);
  }

  private aad(
    store: string,
    recordId: string,
    schemaVersion: number,
    index: Readonly<Record<string, boolean | number | string | null>>,
  ) {
    return { partition: this.databaseName, store, recordId, schemaVersion, index } as const;
  }

  private localEventAad(
    row: Pick<
      LocalEventRow,
      'eventId' | 'eventSchemaVersion' | 'commandId' | 'localSequence' | 'aggregateId' | 'state'
    >,
  ) {
    return this.aad('localEvents', row.eventId, row.eventSchemaVersion, {
      aggregateId: row.aggregateId,
      commandId: row.commandId,
      localSequence: row.localSequence,
      state: row.state,
    });
  }

  private projectionAad(
    row: Pick<
      ProjectionRow,
      | 'projectionKey'
      | 'projectionType'
      | 'projectionId'
      | 'projectionSchemaVersion'
      | 'authoritativeRevision'
      | 'authorityState'
      | 'localCommandId'
    >,
  ) {
    return this.aad('projections', row.projectionKey, row.projectionSchemaVersion, {
      authoritativeRevision: row.authoritativeRevision,
      authorityState: row.authorityState,
      localCommandId: row.localCommandId ?? null,
      projectionId: row.projectionId,
      projectionType: row.projectionType,
    });
  }

  private outboxAad(
    row: Pick<
      OutboxRow,
      | 'commandId'
      | 'commandSchemaVersion'
      | 'localSequence'
      | 'priority'
      | 'transportState'
      | 'attemptCount'
      | 'nextAttemptAt'
    >,
  ) {
    return this.aad('outbox', row.commandId, row.commandSchemaVersion, {
      attemptCount: row.attemptCount,
      localSequence: row.localSequence,
      nextAttemptAt: row.nextAttemptAt,
      priority: row.priority,
      transportState: row.transportState,
    });
  }

  private syncStateAad(state: SyncStateRow['state']) {
    return this.aad('syncState', 'farmer', 1, { state });
  }

  private mediaBlobAad(
    row: Pick<MediaBlobRow, 'mediaId' | 'mediaSchemaVersion' | 'status' | 'priority'>,
  ) {
    return this.aad('mediaBlobs', row.mediaId, row.mediaSchemaVersion, {
      priority: row.priority,
      status: row.status,
    });
  }

  private mediaUploadAad(
    row: Pick<MediaUploadRow, 'mediaId' | 'mediaSchemaVersion' | 'status' | 'nextAttemptAt'>,
  ) {
    return this.aad('mediaUploads', row.mediaId, row.mediaSchemaVersion, {
      nextAttemptAt: row.nextAttemptAt,
      status: row.status,
    });
  }

  private acknowledgementAad(
    row: Pick<AcknowledgementRow, 'commandId' | 'acknowledgementId' | 'disposition'>,
  ) {
    return this.aad('acknowledgements', row.commandId, 1, {
      acknowledgementId: row.acknowledgementId,
      disposition: row.disposition,
    });
  }

  private conflictAad(row: Pick<ConflictRow, 'conflictId' | 'commandId' | 'state' | 'createdAt'>) {
    return this.aad('conflicts', row.conflictId, 1, {
      commandId: row.commandId,
      createdAt: row.createdAt,
      state: row.state,
    });
  }

  private tombstoneAad(
    row: Pick<
      TombstoneRow,
      | 'projectionKey'
      | 'projectionType'
      | 'projectionId'
      | 'deletionEpoch'
      | 'minimumResurrectionRevision'
    >,
  ) {
    return this.aad('tombstones', row.projectionKey, 1, {
      deletionEpoch: row.deletionEpoch,
      minimumResurrectionRevision: row.minimumResurrectionRevision,
      projectionId: row.projectionId,
      projectionType: row.projectionType,
    });
  }

  private evidenceCacheAad(
    row: Pick<
      EvidenceCacheRow,
      'cacheKey' | 'projectionSchemaVersion' | 'plotId' | 'status' | 'updatedAt'
    >,
  ) {
    return this.aad('evidenceCache', row.cacheKey, row.projectionSchemaVersion, {
      plotId: row.plotId,
      status: row.status,
      updatedAt: row.updatedAt,
    });
  }

  private recommendationDraftAad(
    row: Pick<
      RecommendationDraftRow,
      | 'draftId'
      | 'plotId'
      | 'status'
      | 'commandId'
      | 'payloadHash'
      | 'contextRevision'
      | 'updatedAt'
    >,
  ) {
    return this.aad('recommendationDrafts', row.draftId, 1, {
      commandId: row.commandId,
      contextRevision: row.contextRevision,
      payloadHash: row.payloadHash,
      plotId: row.plotId,
      status: row.status,
      updatedAt: row.updatedAt,
    });
  }

  private recommendationResultAad(
    row: Pick<
      RecommendationResultCacheRow,
      'recommendationId' | 'plotId' | 'status' | 'dataMode' | 'generatedAt' | 'updatedAt'
    >,
  ) {
    return this.aad('recommendationResults', row.recommendationId, 1, {
      dataMode: row.dataMode,
      generatedAt: row.generatedAt,
      plotId: row.plotId,
      status: row.status,
      updatedAt: row.updatedAt,
    });
  }

  private advisoryCacheAad(
    row: Pick<
      AdvisoryCacheRow,
      'advisoryId' | 'plotId' | 'status' | 'dataMode' | 'generatedAt' | 'urgency' | 'updatedAt'
    >,
  ) {
    return this.aad('advisoryCache', row.advisoryId, 1, {
      dataMode: row.dataMode,
      generatedAt: row.generatedAt,
      plotId: row.plotId,
      status: row.status,
      urgency: row.urgency,
      updatedAt: row.updatedAt,
    });
  }

  private async initialize(): Promise<void> {
    const lock = await this.database.partitionLock.get('current');
    if (lock === undefined) {
      await this.database.partitionLock.put({
        id: 'current',
        deviceMode: this.deviceMode,
        state: 'UNLOCKED',
        updatedAt: Date.now(),
      });
    } else if (lock.deviceMode !== this.deviceMode) {
      await this.enterLockedRecovery('DEVICE_MODE_CHANGED');
    }
    const metadata = await this.database.cacheMetadata.get('database-schema');
    if (metadata === undefined) {
      await this.database.cacheMetadata.put({
        key: 'database-schema',
        databaseSchemaVersion: LOCAL_DATABASE_SCHEMA_VERSION,
        migrationState: 'STAGED',
        updatedAt: Date.now(),
      });
    }
    try {
      await this.verifyEncryptedIndexes();
    } catch {
      await this.enterLockedRecovery('LOCAL_INDEX_INTEGRITY_FAILED');
      throw new LockedRecoveryRequiredError('LOCAL_INDEX_INTEGRITY_FAILED');
    }
  }

  private async verifyEncryptedIndexes(): Promise<void> {
    const [
      localEvents,
      projections,
      outbox,
      syncStates,
      acknowledgements,
      conflicts,
      mediaBlobs,
      mediaUploads,
      tombstones,
      evidenceCache,
    ] = await Promise.all([
      this.database.localEvents.toArray(),
      this.database.projections.toArray(),
      this.database.outbox.toArray(),
      this.database.syncState.toArray(),
      this.database.acknowledgements.toArray(),
      this.database.conflicts.toArray(),
      this.database.mediaBlobs.toArray(),
      this.database.mediaUploads.toArray(),
      this.database.tombstones.toArray(),
      this.database.evidenceCache.toArray(),
    ]);
    await Promise.all([
      ...localEvents.map((row) => decryptJson(this.key, this.localEventAad(row), row.encrypted)),
      ...projections.map((row) => decryptJson(this.key, this.projectionAad(row), row.encrypted)),
      ...outbox.map((row) => decryptJson(this.key, this.outboxAad(row), row.encrypted)),
      ...syncStates.map((row) =>
        decryptJson(this.key, this.syncStateAad(row.state), row.encrypted),
      ),
      ...acknowledgements.map((row) =>
        decryptJson(this.key, this.acknowledgementAad(row), row.encrypted),
      ),
      ...conflicts.map((row) => decryptJson(this.key, this.conflictAad(row), row.encrypted)),
      ...mediaBlobs.map((row) => decryptJson(this.key, this.mediaBlobAad(row), row.encrypted)),
      ...mediaUploads.map((row) => decryptJson(this.key, this.mediaUploadAad(row), row.encrypted)),
      ...tombstones.map((row) => decryptJson(this.key, this.tombstoneAad(row), row.encrypted)),
      ...evidenceCache.map((row) =>
        decryptJson(this.key, this.evidenceCacheAad(row), row.encrypted),
      ),
    ]);
  }

  private async assertAccessible(): Promise<void> {
    const lock = await this.database.partitionLock.get('current');
    if (lock?.state !== 'UNLOCKED') {
      throw new LockedRecoveryRequiredError(lock?.reasonCode ?? 'PARTITION_LOCKED');
    }
  }

  async unlock(input: { readonly allowRecovery: boolean }): Promise<void> {
    const lock = await this.database.partitionLock.get('current');
    if (lock === undefined) throw new LockedRecoveryRequiredError('PARTITION_LOCK_MISSING');
    if (lock.state === 'LOCKED_RECOVERY') {
      if (!input.allowRecovery || lock.reasonCode !== 'UNSYNCED_WORK_AT_USER_SWITCH') {
        throw new LockedRecoveryRequiredError(lock.reasonCode ?? 'LOCKED_RECOVERY');
      }
    }
    await this.database.partitionLock.put({
      id: 'current',
      deviceMode: this.deviceMode,
      state: 'UNLOCKED',
      updatedAt: Date.now(),
    });
  }

  async enterLockedRecovery(reasonCode: string): Promise<void> {
    await this.database.partitionLock.put({
      id: 'current',
      deviceMode: this.deviceMode,
      state: 'LOCKED_RECOVERY',
      reasonCode,
      updatedAt: Date.now(),
    });
    const metadata = await this.database.cacheMetadata.get('database-schema');
    await this.database.cacheMetadata.put({
      key: 'database-schema',
      databaseSchemaVersion: metadata?.databaseSchemaVersion ?? LOCAL_DATABASE_SCHEMA_VERSION,
      migrationState: 'LOCKED_RECOVERY',
      updatedAt: Date.now(),
      details: [reasonCode],
    });
  }

  async verifySchemaCompatibility(
    compatibility: SchemaCompatibility,
  ): Promise<CompatibilityResult> {
    const unsupported: string[] = [];
    if (!inRange(LOCAL_DATABASE_SCHEMA_VERSION, compatibility.localDatabase)) {
      unsupported.push(`local-database:${String(LOCAL_DATABASE_SCHEMA_VERSION)}`);
    }
    for (const row of await this.database.localEvents.toArray()) {
      if (!inRange(row.eventSchemaVersion, compatibility.clientEvent)) {
        unsupported.push(`client-event:${String(row.eventSchemaVersion)}:${row.eventId}`);
      }
    }
    for (const row of await this.database.outbox.toArray()) {
      if (!inRange(row.commandSchemaVersion, compatibility.command)) {
        unsupported.push(`command:${String(row.commandSchemaVersion)}:${row.commandId}`);
      }
    }
    for (const row of await this.database.projections.toArray()) {
      if (!inRange(row.projectionSchemaVersion, compatibility.projection)) {
        unsupported.push(`projection:${String(row.projectionSchemaVersion)}:${row.projectionKey}`);
      }
    }
    for (const row of [
      ...(await this.database.mediaBlobs.toArray()),
      ...(await this.database.mediaUploads.toArray()),
    ]) {
      if (!inRange(row.mediaSchemaVersion, compatibility.media)) {
        unsupported.push(`media:${String(row.mediaSchemaVersion)}:${row.mediaId}`);
      }
    }
    if (unsupported.length > 0) {
      await this.enterLockedRecovery('SCHEMA_REQUIRES_MIGRATION');
      await this.database.cacheMetadata.put({
        key: 'database-schema',
        databaseSchemaVersion: LOCAL_DATABASE_SCHEMA_VERSION,
        migrationState: 'LOCKED_RECOVERY',
        updatedAt: Date.now(),
        details: unsupported,
      });
      return { status: 'LOCKED_RECOVERY', unsupported };
    }
    await this.database.cacheMetadata.put({
      key: 'database-schema',
      databaseSchemaVersion: LOCAL_DATABASE_SCHEMA_VERSION,
      migrationState: 'VERIFIED',
      updatedAt: Date.now(),
    });
    const lock = await this.database.partitionLock.get('current');
    if (lock?.state === 'LOCKED_RECOVERY' && lock.reasonCode === 'SCHEMA_REQUIRES_MIGRATION') {
      await this.database.partitionLock.put({
        id: 'current',
        deviceMode: this.deviceMode,
        state: 'LOCKED',
        reasonCode: 'FORWARD_MIGRATION_VERIFIED',
        updatedAt: Date.now(),
      });
    }
    return { status: 'VERIFIED' };
  }

  async isActivationReady(): Promise<boolean> {
    const [metadata, lock] = await Promise.all([
      this.database.cacheMetadata.get('database-schema'),
      this.database.partitionLock.get('current'),
    ]);
    return metadata?.migrationState === 'VERIFIED' && lock?.state !== 'LOCKED_RECOVERY';
  }

  async commitLocalAction(input: LocalCommitInput): Promise<LocalCommitReceipt> {
    await this.assertAccessible();
    if (
      input.event.commandId !== input.command.commandId ||
      input.event.localSequence !== input.command.localSequence
    ) {
      throw new TypeError('LOCAL_EVENT_COMMAND_IDENTITY_MISMATCH');
    }
    const eventIndex = {
      eventId: input.event.eventId,
      commandId: input.command.commandId,
      localSequence: input.event.localSequence,
      eventSchemaVersion: input.event.eventSchemaVersion,
      aggregateId: input.event.aggregateId,
      state: 'LOCALLY_COMMITTED' as const,
    };
    const outboxIndex = {
      commandId: input.command.commandId,
      commandSchemaVersion: input.command.commandSchemaVersion,
      localSequence: input.command.localSequence,
      priority: input.priority ?? 100,
      transportState: 'QUEUED' as const,
      attemptCount: 0,
      nextAttemptAt: 0,
    };
    const eventRow: LocalEventRow = {
      ...eventIndex,
      encrypted: await encryptJson(this.key, this.localEventAad(eventIndex), input.event),
    };
    const outboxRow: OutboxRow = {
      ...outboxIndex,
      encrypted: await encryptJson(this.key, this.outboxAad(outboxIndex), input.command),
    };
    const key = projectionKey(input.projection.projectionType, input.projection.projectionId);
    await this.database.transaction(
      'rw',
      this.database.localEvents,
      this.database.projections,
      this.database.outbox,
      async () => {
        await this.database.localEvents.add(eventRow);
        const current = await this.database.projections.get(key);
        const currentPayload: StoredProjectionPayload =
          current === undefined
            ? {}
            : await Dexie.waitFor(
                decryptJson<StoredProjectionPayload>(
                  this.key,
                  this.projectionAad(current),
                  current.encrypted,
                ),
              );
        const projectionPayload: StoredProjectionPayload = {
          ...(currentPayload.serverBase === undefined
            ? {}
            : { serverBase: currentPayload.serverBase }),
          localOverlays: [
            ...projectionOverlays(currentPayload),
            {
              commandId: input.command.commandId,
              eventId: input.event.eventId,
              dataMode: input.projection.dataMode,
              payload: input.projection.payload,
            },
          ],
        };
        const projectionIndex = {
          projectionKey: key,
          projectionType: input.projection.projectionType,
          projectionId: input.projection.projectionId,
          projectionSchemaVersion: input.projection.projectionSchemaVersion,
          authoritativeRevision: current?.authoritativeRevision ?? input.event.baseRevision,
          authorityState: 'CURRENT_LOCAL' as const,
          localCommandId: input.command.commandId,
        };
        await this.database.projections.put({
          ...projectionIndex,
          encrypted: await Dexie.waitFor(
            encryptJson(this.key, this.projectionAad(projectionIndex), projectionPayload),
          ),
        });
        await this.database.outbox.add(outboxRow);
      },
    );
    return {
      eventId: input.event.eventId,
      commandId: input.command.commandId,
      state: 'SAVED_ON_THIS_PHONE',
    };
  }

  async cacheEvidenceSummary(input: EvidenceCacheInput): Promise<void> {
    await this.assertAccessible();
    const updatedAt = Date.now();
    const row = {
      cacheKey: `plot:${input.plotId}:evidence-summary`,
      projectionSchemaVersion: 1,
      plotId: input.plotId,
      status: input.status,
      updatedAt,
    };
    await this.database.evidenceCache.put({
      ...row,
      encrypted: await encryptJson(this.key, this.evidenceCacheAad(row), input.payload),
    });
  }

  async readCachedEvidenceSummary(
    plotId: string,
  ): Promise<Readonly<Record<string, unknown>> | undefined> {
    await this.assertAccessible();
    const row = await this.database.evidenceCache.get(`plot:${plotId}:evidence-summary`);
    if (row === undefined) return undefined;
    return decryptJson(this.key, this.evidenceCacheAad(row), row.encrypted);
  }

  async saveRecommendationDraft(input: RecommendationDraftInput): Promise<void> {
    await this.assertAccessible();
    const updatedAt = Date.now();
    const row = {
      draftId: input.draftId,
      plotId: input.plotId,
      status: input.status,
      commandId: input.commandId,
      payloadHash: await sha256CanonicalJson(input.payload),
      contextRevision: input.contextRevision,
      updatedAt,
    };
    await this.database.recommendationDrafts.put({
      ...row,
      encrypted: await encryptJson(this.key, this.recommendationDraftAad(row), input.payload),
    });
  }

  async cacheRecommendationResult(input: RecommendationResultCacheInput): Promise<void> {
    await this.assertAccessible();
    const updatedAt = Date.now();
    const row = {
      recommendationId: input.recommendationId,
      plotId: input.plotId,
      status: input.status,
      dataMode: input.dataMode,
      generatedAt: input.generatedAt,
      freshnessLabel: input.freshnessLabel,
      updatedAt,
    };
    await this.database.recommendationResults.put({
      ...row,
      encrypted: await encryptJson(this.key, this.recommendationResultAad(row), input.payload),
    });
  }

  async readCachedRecommendationResult(
    recommendationId: string,
  ): Promise<Readonly<Record<string, unknown>> | undefined> {
    await this.assertAccessible();
    const row = await this.database.recommendationResults.get(recommendationId);
    if (row === undefined) return undefined;
    return decryptJson(this.key, this.recommendationResultAad(row), row.encrypted);
  }

  async cacheAdvisory(input: AdvisoryCacheInput): Promise<void> {
    await this.assertAccessible();
    const updatedAt = Date.now();
    const row = {
      advisoryId: input.advisoryId,
      plotId: input.plotId,
      status: input.status,
      dataMode: input.dataMode,
      generatedAt: input.generatedAt,
      urgency: input.urgency,
      updatedAt,
    };
    await this.database.advisoryCache.put({
      ...row,
      encrypted: await encryptJson(this.key, this.advisoryCacheAad(row), input.payload),
    });
  }

  async readCachedAdvisory(
    advisoryId: string,
  ): Promise<Readonly<Record<string, unknown>> | undefined> {
    await this.assertAccessible();
    const row = await this.database.advisoryCache.get(advisoryId);
    if (row === undefined) return undefined;
    return decryptJson(this.key, this.advisoryCacheAad(row), row.encrypted);
  }

  async saveAdvisoryResponse(input: AdvisoryResponseLocalInput): Promise<LocalCommitReceipt> {
    const payload = {
      response: input.response,
      ...(input.snoozeUntil === undefined ? {} : { snoozeUntil: input.snoozeUntil }),
      ...(input.note === undefined ? {} : { note: input.note }),
      clientRecordedAt: input.clientRecordedAt,
      timezone: input.timezone,
    } as const;
    const command = {
      commandId: input.commandId,
      clientEventIds: [input.eventId],
      operation: 'RespondToAdvisory',
      commandSchemaVersion: 1,
      target: { type: 'advisory', id: input.advisoryId },
      expectedRevision: input.expectedRevision,
      occurredAt: input.clientRecordedAt,
      timezone: input.timezone,
      localSequence: input.localSequence,
      causalCommandIds: [],
      requestHash: await sha256CanonicalJson({
        operation: 'RespondToAdvisory',
        commandSchemaVersion: 1,
        target: { type: 'advisory', id: input.advisoryId },
        expectedRevision: input.expectedRevision,
        payload,
      }),
      payload,
    } satisfies SyncCommandEnvelope;
    return this.commitLocalAction({
      event: {
        eventId: input.eventId,
        eventName: 'advisory.response_saved_local',
        eventSchemaVersion: 1,
        commandId: input.commandId,
        actorRef: input.actorRef,
        deviceRef: input.deviceRef,
        localSequence: input.localSequence,
        aggregateType: 'advisory',
        aggregateId: input.advisoryId,
        occurredAt: input.clientRecordedAt,
        clientRecordedAt: input.clientRecordedAt,
        timezone: input.timezone,
        baseRevision: input.expectedRevision,
        dataMode: input.dataMode ?? 'LIVE',
        provenanceTypes: ['FARMER_REPORTED'],
        correlationId: input.correlationId,
        payload,
      },
      projection: {
        projectionType: 'farmer.advisory.response',
        projectionId: input.advisoryId,
        projectionSchemaVersion: 1,
        dataMode: input.dataMode ?? 'LIVE',
        payload: {
          advisoryId: input.advisoryId,
          status: 'SAVED_ON_THIS_PHONE',
          response: input.response,
          clientRecordedAt: input.clientRecordedAt,
          ...(input.snoozeUntil === undefined ? {} : { snoozeUntil: input.snoozeUntil }),
        },
      },
      command,
      priority: 10,
    });
  }

  async getLocalEvent(eventId: string): Promise<LocalCommitInput['event'] | undefined> {
    await this.assertAccessible();
    const row = await this.database.localEvents.get(eventId);
    if (row === undefined) return undefined;
    return decryptJson(this.key, this.localEventAad(row), row.encrypted);
  }

  async getProjection(type: string, id: string): Promise<OfflineProjection | undefined> {
    await this.assertAccessible();
    const row = await this.database.projections.get(projectionKey(type, id));
    if (row === undefined) return undefined;
    const payload = await decryptJson<StoredProjectionPayload>(
      this.key,
      this.projectionAad(row),
      row.encrypted,
    );
    return {
      projectionType: row.projectionType,
      projectionId: row.projectionId,
      authorityState: row.authorityState,
      authoritativeRevision: row.authoritativeRevision,
      payload: projectionOverlays(payload).at(-1)?.payload ?? payload.serverBase?.payload,
    };
  }

  async listPendingCommands(): Promise<readonly SyncCommandEnvelope[]> {
    await this.assertAccessible();
    const rows = await this.database.outbox.orderBy('localSequence').toArray();
    const commands = await Promise.all(
      rows.map((row) =>
        decryptJson<SyncCommandEnvelope>(this.key, this.outboxAad(row), row.encrypted),
      ),
    );
    return commands.filter((_command, index) => rows[index]?.transportState === 'QUEUED');
  }

  async reserveMedia(input: MediaReservationInput): Promise<void> {
    await this.assertAccessible();
    const blobIndex = {
      mediaId: input.mediaId,
      mediaSchemaVersion: input.mediaSchemaVersion,
      status: 'RESERVED' as const,
      priority: input.priority,
    };
    const uploadIndex = {
      mediaId: input.mediaId,
      mediaSchemaVersion: input.mediaSchemaVersion,
      status: 'RESERVED' as const,
      nextAttemptAt: 0,
    };
    const blobEncrypted = await encryptJson(this.key, this.mediaBlobAad(blobIndex), input.payload);
    const uploadEncrypted = await encryptJson(this.key, this.mediaUploadAad(uploadIndex), {
      mediaId: input.mediaId,
      status: 'RESERVED',
    });
    await this.database.transaction(
      'rw',
      this.database.mediaBlobs,
      this.database.mediaUploads,
      async () => {
        await this.database.mediaBlobs.add({ ...blobIndex, encrypted: blobEncrypted });
        await this.database.mediaUploads.add({ ...uploadIndex, encrypted: uploadEncrypted });
      },
    );
  }

  async setSyncStream(input: SyncStreamStateInput): Promise<void> {
    await this.assertAccessible();
    if (input.subjectDeviceBindingId !== this.subjectDeviceBindingId) {
      throw new LockedRecoveryRequiredError('SUBJECT_DEVICE_BINDING_MISMATCH');
    }
    const payload: StoredSyncState = {
      streamId: input.streamId,
      cursor: input.cursor,
      highWaterMark: input.highWaterMark ?? input.cursor,
      authorizationVersion: input.authorizationVersion,
      subjectDeviceBindingId: input.subjectDeviceBindingId,
      scope: input.scope,
    };
    await this.database.syncState.put({
      id: 'farmer',
      state: 'ACTIVE',
      encrypted: await encryptJson(this.key, this.syncStateAad('ACTIVE'), payload),
    });
  }

  async getSyncState(): Promise<StoredSyncState | undefined> {
    await this.assertAccessible();
    const row = await this.database.syncState.get('farmer');
    if (row === undefined) return undefined;
    return decryptJson(this.key, this.syncStateAad(row.state), row.encrypted);
  }

  private validateResponseBinding(
    expectedBatchId: string,
    response: SyncBatchResponse,
    state: StoredSyncState,
  ): void {
    if (response.batchId !== expectedBatchId) throw new Error('SYNC_RESPONSE_BATCH_MISMATCH');
    if (response.authorizationVersion !== state.authorizationVersion) {
      throw new Error('SYNC_AUTHORIZATION_VERSION_MISMATCH');
    }
  }

  private async validateProjectionChecksums(deltas: readonly SyncProjectionDelta[]): Promise<void> {
    for (const delta of deltas) {
      if (delta.payloadChecksum !== (await sha256CanonicalJson(delta.payload))) {
        throw new Error('SYNC_PROJECTION_CHECKSUM_MISMATCH');
      }
    }
  }

  private async applyProjectionDelta(
    feedEventId: string,
    delta: SyncProjectionDelta,
    dispositions: ReadonlyMap<string, SyncCommandDisposition>,
  ): Promise<void> {
    const key = projectionKey(delta.projectionType, delta.projectionId);
    const current = await this.database.projections.get(key);
    const currentPayload =
      current === undefined
        ? ({} satisfies StoredProjectionPayload)
        : await Dexie.waitFor(
            decryptJson<StoredProjectionPayload>(
              this.key,
              this.projectionAad(current),
              current.encrypted,
            ),
          );
    const remainingOverlays = projectionOverlays(currentPayload).filter((overlay) => {
      const disposition = dispositions.get(overlay.commandId)?.disposition;
      return disposition !== 'ACCEPTED' && disposition !== 'ALREADY_ACCEPTED';
    });
    const keepLocal = remainingOverlays.length > 0;
    const needsReconciliation = remainingOverlays.some((overlay) => {
      const disposition = dispositions.get(overlay.commandId)?.disposition;
      return disposition === 'REJECTED' || disposition === 'CONFLICT';
    });

    if (delta.changeType === 'TOMBSTONE') {
      const tombstonePayload = {
        projectionType: delta.projectionType,
        projectionId: delta.projectionId,
        deletionEpoch: delta.authoritativeRevision,
        minimumResurrectionRevision: delta.authoritativeRevision,
      };
      const tombstoneIndex = {
        projectionKey: key,
        projectionType: delta.projectionType,
        projectionId: delta.projectionId,
        deletionEpoch: delta.authoritativeRevision,
        minimumResurrectionRevision: delta.authoritativeRevision,
      };
      await this.database.tombstones.put({
        ...tombstoneIndex,
        encrypted: await Dexie.waitFor(
          encryptJson(this.key, this.tombstoneAad(tombstoneIndex), tombstonePayload),
        ),
      });
    }

    const payload: StoredProjectionPayload = {
      ...(delta.changeType === 'UPSERT'
        ? {
            serverBase: {
              authoritativeRevision: delta.authoritativeRevision,
              dataMode: delta.dataMode,
              payload: delta.payload,
              payloadChecksum: delta.payloadChecksum,
              sourceFeedEventId: feedEventId,
            },
          }
        : {}),
      ...(keepLocal ? { localOverlays: remainingOverlays } : {}),
    };
    const authorityState: ProjectionAuthority = keepLocal
      ? needsReconciliation || delta.changeType === 'TOMBSTONE'
        ? 'NEEDS_RECONCILIATION'
        : 'CURRENT_LOCAL'
      : delta.changeType === 'TOMBSTONE'
        ? 'TOMBSTONED'
        : 'SERVER_CONFIRMED';
    const latestOverlay = remainingOverlays.at(-1);
    const projectionIndex = {
      projectionKey: key,
      projectionType: delta.projectionType,
      projectionId: delta.projectionId,
      projectionSchemaVersion: delta.projectionSchemaVersion,
      authoritativeRevision: delta.authoritativeRevision,
      authorityState,
      ...(latestOverlay === undefined ? {} : { localCommandId: latestOverlay.commandId }),
    };
    await this.database.projections.put({
      ...projectionIndex,
      encrypted: await Dexie.waitFor(
        encryptJson(this.key, this.projectionAad(projectionIndex), payload),
      ),
    });
  }

  async applySyncResponse(input: SyncResponseApplyInput): Promise<void> {
    await this.assertAccessible();
    await this.verifyEncryptedIndexes();
    const expectedBatchId = input.expectedBatchId;
    const response = structuredClone(input.response);
    const preflightState = await this.getSyncState();
    if (preflightState === undefined) throw new Error('SYNC_STREAM_NOT_OPEN');
    this.validateResponseBinding(expectedBatchId, response, preflightState);
    const unsupportedProjection = response.feedEvents
      .flatMap((event) => event.projectionDeltas)
      .find((delta) => !inRange(delta.projectionSchemaVersion, this.compatibility.projection));
    if (unsupportedProjection !== undefined) {
      await this.enterLockedRecovery('SCHEMA_REQUIRES_MIGRATION');
      throw new LockedRecoveryRequiredError('SCHEMA_REQUIRES_MIGRATION');
    }
    await this.validateProjectionChecksums(
      response.feedEvents.flatMap((event) => event.projectionDeltas),
    );
    await this.database.transaction(
      'rw',
      [
        this.database.projections,
        this.database.outbox,
        this.database.acknowledgements,
        this.database.conflicts,
        this.database.tombstones,
        this.database.syncState,
      ],
      async () => {
        const stateRow = await this.database.syncState.get('farmer');
        if (stateRow === undefined) throw new Error('SYNC_STREAM_NOT_OPEN');
        const state = await Dexie.waitFor(
          decryptJson<StoredSyncState>(
            this.key,
            this.syncStateAad(stateRow.state),
            stateRow.encrypted,
          ),
        );
        this.validateResponseBinding(expectedBatchId, response, state);
        const dispositions = new Map(
          response.dispositions.map((disposition) => [disposition.commandId, disposition]),
        );
        for (const disposition of response.dispositions) {
          const acknowledgementIndex = {
            commandId: disposition.commandId,
            acknowledgementId: disposition.acknowledgementId,
            disposition: disposition.disposition,
          };
          const acknowledgement: AcknowledgementRow = {
            ...acknowledgementIndex,
            encrypted: await Dexie.waitFor(
              encryptJson(this.key, this.acknowledgementAad(acknowledgementIndex), disposition),
            ),
          };
          await this.database.acknowledgements.put(acknowledgement);
          const outbox = await this.database.outbox.get(disposition.commandId);
          if (outbox === undefined) continue;
          if (
            disposition.disposition === 'ACCEPTED' ||
            disposition.disposition === 'ALREADY_ACCEPTED'
          ) {
            await this.database.outbox.delete(disposition.commandId);
          } else {
            const command = await Dexie.waitFor(
              decryptJson<SyncCommandEnvelope>(this.key, this.outboxAad(outbox), outbox.encrypted),
            );
            const nextOutbox = {
              ...outbox,
              transportState: disposition.disposition,
            };
            await this.database.outbox.put({
              ...nextOutbox,
              encrypted: await Dexie.waitFor(
                encryptJson(this.key, this.outboxAad(nextOutbox), command),
              ),
            });
          }
          if (disposition.disposition === 'CONFLICT') {
            const conflictIndex = {
              conflictId: disposition.conflictId,
              commandId: disposition.commandId,
              state: 'OPEN' as const,
              createdAt: Date.now(),
            };
            const conflict: ConflictRow = {
              ...conflictIndex,
              encrypted: await Dexie.waitFor(
                encryptJson(this.key, this.conflictAad(conflictIndex), disposition),
              ),
            };
            await this.database.conflicts.put(conflict);
          }
          if (disposition.disposition === 'REJECTED' || disposition.disposition === 'CONFLICT') {
            const affected = (await this.database.projections.toArray()).filter(
              (projection) => projection.localCommandId === disposition.commandId,
            );
            for (const projection of affected) {
              const payload = await Dexie.waitFor(
                decryptJson<StoredProjectionPayload>(
                  this.key,
                  this.projectionAad(projection),
                  projection.encrypted,
                ),
              );
              const nextProjection = {
                ...projection,
                authorityState: 'NEEDS_RECONCILIATION' as const,
              };
              await this.database.projections.put({
                ...nextProjection,
                encrypted: await Dexie.waitFor(
                  encryptJson(this.key, this.projectionAad(nextProjection), payload),
                ),
              });
            }
          }
        }
        for (const feedEvent of response.feedEvents) {
          for (const delta of feedEvent.projectionDeltas) {
            await this.applyProjectionDelta(feedEvent.feedEventId, delta, dispositions);
          }
        }
        const nextState: StoredSyncState = {
          ...state,
          cursor: response.nextCursor,
          highWaterMark: response.highWaterMark,
          authorizationVersion: response.authorizationVersion,
          lastBatchId: response.batchId,
          lastServerTime: response.serverTime,
        };
        const encrypted = await Dexie.waitFor(
          encryptJson(this.key, this.syncStateAad('ACTIVE'), nextState),
        );
        // The cursor is deliberately the final write in this transaction.
        await this.database.syncState.put({ id: 'farmer', state: 'ACTIVE', encrypted });
      },
    );
  }

  async applyBootstrap(snapshot: SyncBootstrapSnapshot): Promise<void> {
    await this.assertAccessible();
    await this.verifyEncryptedIndexes();
    const safeSnapshot = structuredClone(snapshot);
    const preflightState = await this.getSyncState();
    if (preflightState === undefined) throw new Error('SYNC_STREAM_NOT_OPEN');
    if (preflightState.streamId !== safeSnapshot.streamId) throw new Error('SYNC_STREAM_MISMATCH');
    if (preflightState.authorizationVersion !== safeSnapshot.authorizationVersion) {
      throw new Error('SYNC_AUTHORIZATION_VERSION_MISMATCH');
    }
    const generatedAt = Date.parse(safeSnapshot.generatedAt);
    const expiresAt = Date.parse(safeSnapshot.expiresAt);
    const now = Date.now();
    if (
      !Number.isFinite(generatedAt) ||
      !Number.isFinite(expiresAt) ||
      generatedAt > now + 60_000 ||
      expiresAt <= now ||
      expiresAt <= generatedAt
    ) {
      throw new Error('SYNC_BOOTSTRAP_EXPIRED');
    }
    await this.validateProjectionChecksums(safeSnapshot.projections);
    if (
      safeSnapshot.snapshotChecksum !== (await calculateBootstrapSnapshotChecksum(safeSnapshot))
    ) {
      throw new Error('SYNC_BOOTSTRAP_CHECKSUM_MISMATCH');
    }
    if (
      !inRange(safeSnapshot.snapshotSchemaVersion, this.compatibility.projection) ||
      safeSnapshot.projections.some(
        (projection) => !inRange(projection.projectionSchemaVersion, this.compatibility.projection),
      )
    ) {
      await this.enterLockedRecovery('SCHEMA_REQUIRES_MIGRATION');
      throw new LockedRecoveryRequiredError('SCHEMA_REQUIRES_MIGRATION');
    }
    await this.database.transaction(
      'rw',
      this.database.projections,
      this.database.tombstones,
      this.database.syncState,
      async () => {
        const stateRow = await this.database.syncState.get('farmer');
        if (stateRow === undefined) throw new Error('SYNC_STREAM_NOT_OPEN');
        const state = await Dexie.waitFor(
          decryptJson<StoredSyncState>(
            this.key,
            this.syncStateAad(stateRow.state),
            stateRow.encrypted,
          ),
        );
        if (state.streamId !== safeSnapshot.streamId) throw new Error('SYNC_STREAM_MISMATCH');
        if (state.authorizationVersion !== safeSnapshot.authorizationVersion) {
          throw new Error('SYNC_AUTHORIZATION_VERSION_MISMATCH');
        }

        for (const row of await this.database.projections.toArray()) {
          const payload = await Dexie.waitFor(
            decryptJson<StoredProjectionPayload>(this.key, this.projectionAad(row), row.encrypted),
          );
          const localOverlays = projectionOverlays(payload);
          if (localOverlays.length === 0) {
            await this.database.projections.delete(row.projectionKey);
          } else {
            const latestOverlay = localOverlays.at(-1);
            if (latestOverlay === undefined) throw new Error('LOCAL_PROJECTION_OVERLAY_MISSING');
            const nextProjection = {
              ...row,
              authorityState: 'CURRENT_LOCAL' as const,
              localCommandId: latestOverlay.commandId,
            };
            await this.database.projections.put({
              ...nextProjection,
              encrypted: await Dexie.waitFor(
                encryptJson(this.key, this.projectionAad(nextProjection), { localOverlays }),
              ),
            });
          }
        }
        for (const delta of safeSnapshot.projections) {
          await this.applyProjectionDelta('bootstrap', delta, new Map());
        }
        for (const tombstone of safeSnapshot.tombstones) {
          const key = projectionKey(tombstone.projectionType, tombstone.projectionId);
          const row: TombstoneRow = {
            projectionKey: key,
            projectionType: tombstone.projectionType,
            projectionId: tombstone.projectionId,
            deletionEpoch: tombstone.deletionEpoch,
            minimumResurrectionRevision: tombstone.minimumResurrectionRevision,
            encrypted: await Dexie.waitFor(
              encryptJson(
                this.key,
                this.tombstoneAad({
                  projectionKey: key,
                  projectionType: tombstone.projectionType,
                  projectionId: tombstone.projectionId,
                  deletionEpoch: tombstone.deletionEpoch,
                  minimumResurrectionRevision: tombstone.minimumResurrectionRevision,
                }),
                tombstone,
              ),
            ),
          };
          await this.database.tombstones.put(row);
          const projection = await this.database.projections.get(key);
          if (projection !== undefined) {
            const payload = await Dexie.waitFor(
              decryptJson<StoredProjectionPayload>(
                this.key,
                this.projectionAad(projection),
                projection.encrypted,
              ),
            );
            const nextProjection = {
              ...projection,
              authorityState: 'NEEDS_RECONCILIATION' as const,
            };
            await this.database.projections.put({
              ...nextProjection,
              encrypted: await Dexie.waitFor(
                encryptJson(this.key, this.projectionAad(nextProjection), payload),
              ),
            });
          }
        }
        const nextState: StoredSyncState = {
          ...state,
          cursor: safeSnapshot.cursor,
          highWaterMark: safeSnapshot.highWaterMark,
          authorizationVersion: safeSnapshot.authorizationVersion,
          lastServerTime: safeSnapshot.generatedAt,
        };
        const encrypted = await Dexie.waitFor(
          encryptJson(this.key, this.syncStateAad('ACTIVE'), nextState),
        );
        // Bootstrap also advances its cursor only after every preserved/rebuilt projection write.
        await this.database.syncState.put({ id: 'farmer', state: 'ACTIVE', encrypted });
      },
    );
  }

  async prepareForUserSwitch(input: {
    readonly authorizeLockedRecovery: boolean;
  }): Promise<UserSwitchResult> {
    await this.assertAccessible();
    await this.verifyEncryptedIndexes();
    const [outboxCount, pendingMediaCount] = await Promise.all([
      this.database.outbox.count(),
      this.database.mediaUploads.where('status').notEqual('VERIFIED').count(),
    ]);
    const pendingItems = outboxCount + pendingMediaCount;
    if (pendingItems === 0) {
      await this.database.partitionLock.put({
        id: 'current',
        deviceMode: this.deviceMode,
        state: 'LOCKED',
        reasonCode: 'USER_SWITCH',
        updatedAt: Date.now(),
      });
      return { status: 'SAFE_TO_SWITCH' };
    }
    if (this.deviceMode !== 'PERSONAL' && !input.authorizeLockedRecovery) {
      return { status: 'BLOCKED_UNSYNCED', pendingItems };
    }
    await this.enterLockedRecovery('UNSYNCED_WORK_AT_USER_SWITCH');
    return { status: 'LOCKED_RECOVERY', pendingItems };
  }

  async retentionCounts(): Promise<{
    readonly localEvents: number;
    readonly outbox: number;
    readonly conflicts: number;
    readonly mediaBlobs: number;
    readonly mediaUploads: number;
    readonly tombstones: number;
  }> {
    const [localEvents, outbox, conflicts, mediaBlobs, mediaUploads, tombstones] =
      await Promise.all([
        this.database.localEvents.count(),
        this.database.outbox.count(),
        this.database.conflicts.count(),
        this.database.mediaBlobs.count(),
        this.database.mediaUploads.count(),
        this.database.tombstones.count(),
      ]);
    return { localEvents, outbox, conflicts, mediaBlobs, mediaUploads, tombstones };
  }
}

export const openFarmerOfflinePartition = (
  options: FarmerOfflinePartitionOptions,
): Promise<FarmerOfflineStore> => FarmerOfflineStore.open(options);
