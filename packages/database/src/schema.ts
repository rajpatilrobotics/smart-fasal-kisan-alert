import {
  bigint,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const platform = pgSchema('platform');
export const media = pgSchema('media');
export const voice = pgSchema('voice');

export const seedRuns = platform.table(
  'seed_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profile: text('profile').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('seed_runs_profile_created_idx').on(table.profile, table.createdAt)],
);

export const schemaCompatibility = platform.table('schema_compatibility', {
  component: text('component').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  minimumSupportedVersion: integer('minimum_supported_version').notNull(),
  maximumSupportedVersion: integer('maximum_supported_version').notNull(),
  supportedFrom: timestamp('supported_from', { withTimezone: true }).notNull(),
  supportedUntil: timestamp('supported_until', { withTimezone: true }).notNull(),
});

export const syncStreams = platform.table(
  'sync_stream',
  {
    streamId: uuid('stream_id').primaryKey(),
    environment: text('environment').notNull(),
    subjectId: uuid('subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    authorizationVersion: bigint('authorization_version', { mode: 'number' }).notNull(),
    deviceMode: text('device_mode').notNull(),
    cursor: text('cursor').notNull(),
    highWaterMark: text('high_water_mark').notNull(),
    state: text('state').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('sync_stream_owner_idx').on(
      table.environment,
      table.subjectId,
      table.subjectDeviceBindingId,
      table.openedAt,
    ),
  ],
);

export const mediaAssets = media.table(
  'asset',
  {
    assetId: uuid('asset_id').primaryKey(),
    intentId: uuid('intent_id').notNull(),
    environment: text('environment').notNull(),
    ownerSubjectId: uuid('owner_subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    purpose: text('purpose').notNull(),
    ownerType: text('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    storageObjectName: text('storage_object_name').notNull(),
    expectedGeneration: bigint('expected_generation', { mode: 'number' }).notNull(),
    expectedSha256: text('expected_sha256').notNull(),
    expectedSizeBytes: bigint('expected_size_bytes', { mode: 'number' }).notNull(),
    actualGeneration: bigint('actual_generation', { mode: 'number' }),
    finalizedSha256: text('finalized_sha256'),
    finalizedSizeBytes: bigint('finalized_size_bytes', { mode: 'number' }),
    verifiedSha256: text('verified_sha256'),
    verifiedSizeBytes: bigint('verified_size_bytes', { mode: 'number' }),
    verifiedMimeType: text('verified_mime_type'),
    state: text('state').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('media_asset_scan_queue_idx').on(table.state, table.updatedAt)],
);

export const voiceSessions = voice.table(
  'session',
  {
    sessionId: uuid('session_id').primaryKey(),
    environment: text('environment').notNull(),
    subjectId: uuid('subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    roleContextId: uuid('role_context_id').notNull(),
    authorizationVersion: bigint('authorization_version', { mode: 'number' }).notNull(),
    purposeCode: text('purpose_code').notNull(),
    origin: text('origin').notNull(),
    language: text('language').notNull(),
    visualRoute: text('visual_route').notNull(),
    contextIds: uuid('context_ids').array().notNull(),
    state: text('state').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('voice_session_owner_idx').on(table.environment, table.subjectId, table.createdAt),
  ],
);
