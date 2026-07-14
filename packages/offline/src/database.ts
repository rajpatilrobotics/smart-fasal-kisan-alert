import Dexie, { type Table } from 'dexie';

import type { DeviceMode } from '@smart-fasal/contracts/schemas';

import type { EncryptedEnvelope } from './crypto.js';

export const LOCAL_DATABASE_SCHEMA_VERSION = 4;

export interface LocalEventRow {
  eventId: string;
  commandId: string;
  localSequence: number;
  eventSchemaVersion: number;
  aggregateId: string;
  state: 'LOCALLY_COMMITTED';
  encrypted: EncryptedEnvelope;
}

export type ProjectionAuthority =
  'CURRENT_LOCAL' | 'SERVER_CONFIRMED' | 'NEEDS_RECONCILIATION' | 'INVALID' | 'TOMBSTONED';

export interface ProjectionRow {
  projectionKey: string;
  projectionType: string;
  projectionId: string;
  projectionSchemaVersion: number;
  authoritativeRevision: number;
  authorityState: ProjectionAuthority;
  localCommandId?: string;
  encrypted: EncryptedEnvelope;
}

export type OutboxTransportState = 'QUEUED' | 'SYNCING' | 'AUTH_BLOCKED' | 'REJECTED' | 'CONFLICT';

export interface OutboxRow {
  commandId: string;
  commandSchemaVersion: number;
  localSequence: number;
  priority: number;
  transportState: OutboxTransportState;
  attemptCount: number;
  nextAttemptAt: number;
  encrypted: EncryptedEnvelope;
}

export interface SyncStateRow {
  id: 'farmer';
  state: 'ACTIVE' | 'AUTH_BLOCKED' | 'LOCKED_RECOVERY';
  encrypted: EncryptedEnvelope;
}

export interface ConflictRow {
  conflictId: string;
  commandId: string;
  state: 'OPEN' | 'RESOLUTION_PENDING' | 'RESOLVED' | 'LOCKED_RECOVERY';
  createdAt: number;
  encrypted: EncryptedEnvelope;
}

export interface AcknowledgementRow {
  commandId: string;
  acknowledgementId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED' | 'REJECTED' | 'CONFLICT';
  encrypted: EncryptedEnvelope;
}

export interface MediaBlobRow {
  mediaId: string;
  mediaSchemaVersion: number;
  status: 'RESERVED' | 'PENDING' | 'LOCKED_RECOVERY';
  priority: number;
  encrypted: EncryptedEnvelope;
}

export interface MediaUploadRow {
  mediaId: string;
  mediaSchemaVersion: number;
  status: 'RESERVED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'LOCKED_RECOVERY';
  nextAttemptAt: number;
  encrypted: EncryptedEnvelope;
}

export interface TombstoneRow {
  projectionKey: string;
  projectionType: string;
  projectionId: string;
  deletionEpoch: number;
  minimumResurrectionRevision: number;
  encrypted: EncryptedEnvelope;
}

export interface ScheduledReminderRow {
  reminderId: string;
  dueAt: number;
  state: 'SCHEDULED' | 'DELIVERED' | 'CANCELLED';
  encrypted: EncryptedEnvelope;
}

export interface CacheMetadataRow {
  key: string;
  databaseSchemaVersion: number;
  migrationState: 'STAGED' | 'VERIFIED' | 'LOCKED_RECOVERY';
  updatedAt: number;
  details?: readonly string[];
}

export interface PartitionLockRow {
  id: 'current';
  deviceMode: DeviceMode;
  state: 'UNLOCKED' | 'LOCKED' | 'LOCKED_RECOVERY';
  reasonCode?: string;
  updatedAt: number;
}

export interface PurgeReceiptRow {
  receiptId: string;
  state: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: number;
  encrypted: EncryptedEnvelope;
}

export interface EvidenceCacheRow {
  cacheKey: string;
  projectionSchemaVersion: number;
  plotId: string;
  status: 'CURRENT' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';
  updatedAt: number;
  encrypted: EncryptedEnvelope;
}

export interface RecommendationDraftRow {
  draftId: string;
  plotId: string;
  status: 'SAVED_ON_THIS_PHONE' | 'WAITING_FOR_INTERNET' | 'EVALUATING' | 'REJECTED' | 'CONFLICT';
  commandId: string;
  payloadHash: string;
  contextRevision: number;
  updatedAt: number;
  encrypted: EncryptedEnvelope;
}

export interface RecommendationResultCacheRow {
  recommendationId: string;
  plotId: string;
  status: 'CURRENT' | 'STALE' | 'OFFLINE' | 'UNAVAILABLE';
  dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
  generatedAt: string;
  freshnessLabel: string;
  updatedAt: number;
  encrypted: EncryptedEnvelope;
}

const VERSION_ONE_STORES = {
  localEvents: '&eventId,commandId,localSequence,eventSchemaVersion',
  projections: '&projectionKey,projectionType,projectionId,authorityState,projectionSchemaVersion',
  outbox: '&commandId,transportState,priority,localSequence,commandSchemaVersion',
  syncState: '&id,state',
  conflicts: '&conflictId,commandId,state,createdAt',
  acknowledgements: '&commandId,&acknowledgementId,disposition',
  mediaBlobs: '&mediaId,status,priority,mediaSchemaVersion',
  mediaUploads: '&mediaId,status,nextAttemptAt,mediaSchemaVersion',
  tombstones: '&projectionKey,projectionType,projectionId,deletionEpoch',
  cacheMetadata: '&key,migrationState',
  partitionLock: '&id,state,deviceMode',
};

export class FarmerOfflineDatabase extends Dexie {
  localEvents!: Table<LocalEventRow, string>;
  projections!: Table<ProjectionRow, string>;
  outbox!: Table<OutboxRow, string>;
  syncState!: Table<SyncStateRow, string>;
  conflicts!: Table<ConflictRow, string>;
  acknowledgements!: Table<AcknowledgementRow, string>;
  mediaBlobs!: Table<MediaBlobRow, string>;
  mediaUploads!: Table<MediaUploadRow, string>;
  tombstones!: Table<TombstoneRow, string>;
  scheduledReminders!: Table<ScheduledReminderRow, string>;
  cacheMetadata!: Table<CacheMetadataRow, string>;
  partitionLock!: Table<PartitionLockRow, string>;
  purgeReceipts!: Table<PurgeReceiptRow, string>;
  evidenceCache!: Table<EvidenceCacheRow, string>;
  recommendationDrafts!: Table<RecommendationDraftRow, string>;
  recommendationResults!: Table<RecommendationResultCacheRow, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores(VERSION_ONE_STORES);
    this.version(LOCAL_DATABASE_SCHEMA_VERSION)
      .stores({
        ...VERSION_ONE_STORES,
        projections:
          '&projectionKey,projectionType,projectionId,authorityState,projectionSchemaVersion,localCommandId',
        scheduledReminders: '&reminderId,dueAt,state',
        purgeReceipts: '&receiptId,state,createdAt',
        evidenceCache: '&cacheKey,plotId,status,updatedAt,projectionSchemaVersion',
        recommendationDrafts:
          '&draftId,plotId,status,commandId,payloadHash,contextRevision,updatedAt',
        recommendationResults: '&recommendationId,plotId,status,dataMode,generatedAt,updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction.table<CacheMetadataRow>('cacheMetadata').put({
          key: 'database-schema',
          databaseSchemaVersion: LOCAL_DATABASE_SCHEMA_VERSION,
          migrationState: 'STAGED',
          updatedAt: Date.now(),
        });
      });
  }
}
