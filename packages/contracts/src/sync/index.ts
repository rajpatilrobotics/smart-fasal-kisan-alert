import { z } from 'zod';

import {
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema,
  FarmerSetupDraftCommandTargetSchema,
  FarmerSetupCommandTargetSchema,
  FarmerPreferencesCommandTargetSchema,
  DeviceModeCommandTargetSchema,
} from '../commands/index.js';
import { MilestoneOneEventSchema, MilestoneTwoEventSchema } from '../events/index.js';
import {
  CompleteFarmerSetupPayloadSchema,
  DeviceModeChangePayloadSchema,
  SaveFarmerSetupDraftPayloadSchema,
  UpdateFarmerPreferencesPayloadSchema,
} from '../farmer-setup/index.js';
import {
  DataModeSchema,
  JsonObjectSchema,
  ProblemCodeSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
  UuidV7Schema,
} from '../http/common.js';
import { DEVICE_MODES } from '../vocabulary.js';

export const DeviceModeSchema = z.enum(DEVICE_MODES).meta({
  id: 'DeviceMode',
  'x-data-classification': 'C1',
});

export const SchemaVersionRangeSchema = z
  .object({ minimum: z.int().positive(), maximum: z.int().positive() })
  .strict()
  .refine((range) => range.minimum <= range.maximum, { message: 'Invalid version range' });

export const SyncStreamOpenRequestSchema = z
  .object({
    streamProtocolVersion: z.literal(1),
    clientBuild: z.string().min(1).max(80),
    localDatabaseSchemaVersion: z.int().positive(),
    stakeholder: z.literal('FARMER').optional(),
    deviceMode: DeviceModeSchema,
    commandVersions: SchemaVersionRangeSchema,
    clientEventVersions: SchemaVersionRangeSchema,
    projectionVersions: SchemaVersionRangeSchema,
    mediaVersions: SchemaVersionRangeSchema,
    priorStreamId: UuidSchema.optional(),
    priorCursor: z.string().min(1).max(2048).optional(),
  })
  .strict()
  .meta({ id: 'SyncStreamOpenRequest', 'x-data-classification': 'C2' });

export const SyncStreamOpenResponseSchema = z
  .object({
    streamId: UuidSchema,
    subjectDeviceBindingId: UuidSchema,
    stakeholder: z.literal('FARMER'),
    scope: z.literal('FARMER_SELF_SERVICE'),
    authorizationVersion: z.int().positive(),
    acceptedCommandVersions: SchemaVersionRangeSchema,
    acceptedClientEventVersions: SchemaVersionRangeSchema,
    acceptedProjectionVersions: SchemaVersionRangeSchema,
    acceptedMediaVersions: SchemaVersionRangeSchema,
    maximumBatchCommands: z.int().min(1).max(100),
    maximumBatchBytes: z.int().min(1).max(524_288),
    serverTime: TimestampSchema,
    serverTimeSignature: z.string().min(16).max(2048),
    cursor: z.string().min(1).max(2048),
    bootstrapRequired: z.boolean(),
  })
  .strict()
  .meta({ id: 'SyncStreamOpenResponse', 'x-data-classification': 'C2' });

const SyncCommandBaseSchema = z.object({
  commandId: UuidSchema,
  clientEventIds: z.array(UuidSchema).min(1).max(100),
  commandSchemaVersion: z.literal(1),
  expectedRevision: RevisionSchema,
  occurredAt: TimestampSchema,
  timezone: z.string().min(1).max(64),
  localSequence: z.int().positive(),
  causalCommandIds: z.array(UuidSchema).max(100),
  requestHash: Sha256DigestSchema,
});

export const SyncConsentCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z.literal('RecordConsentDecision'),
  target: ConsentDecisionCommandTargetSchema,
  payload: ConsentDecisionPayloadSchema,
})
  .strict()
  .meta({ id: 'SyncConsentCommandEnvelope', 'x-data-classification': 'C2' });

export const SyncSaveFarmerSetupDraftCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z.literal('SaveFarmerSetupDraft'),
  target: FarmerSetupDraftCommandTargetSchema,
  payload: SaveFarmerSetupDraftPayloadSchema,
})
  .strict()
  .meta({ id: 'SyncSaveFarmerSetupDraftCommandEnvelope', 'x-data-classification': 'C3' });

export const SyncCompleteFarmerSetupCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z.literal('CompleteFarmerSetup'),
  target: FarmerSetupCommandTargetSchema,
  payload: CompleteFarmerSetupPayloadSchema,
})
  .strict()
  .meta({ id: 'SyncCompleteFarmerSetupCommandEnvelope', 'x-data-classification': 'C3' });

export const SyncUpdateFarmerPreferencesCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z.literal('UpdateFarmerPreferences'),
  target: FarmerPreferencesCommandTargetSchema,
  payload: UpdateFarmerPreferencesPayloadSchema,
})
  .strict()
  .meta({ id: 'SyncUpdateFarmerPreferencesCommandEnvelope', 'x-data-classification': 'C2' });

export const SyncChangeDeviceModeCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z.literal('ChangeDeviceMode'),
  target: DeviceModeCommandTargetSchema,
  payload: DeviceModeChangePayloadSchema,
})
  .strict()
  .meta({ id: 'SyncChangeDeviceModeCommandEnvelope', 'x-data-classification': 'C2' });

export const SyncCommandEnvelopeSchema = z
  .discriminatedUnion('operation', [
    SyncConsentCommandEnvelopeSchema,
    SyncSaveFarmerSetupDraftCommandEnvelopeSchema,
    SyncCompleteFarmerSetupCommandEnvelopeSchema,
    SyncUpdateFarmerPreferencesCommandEnvelopeSchema,
    SyncChangeDeviceModeCommandEnvelopeSchema,
  ])
  .meta({ id: 'SyncCommandEnvelope', 'x-data-classification': 'C3' });

/** @deprecated M2 sync command source-compatible alias retained for 90-day compatibility. */
export const SyncCommandEnvelopeV2Schema = z
  .object({
    commandId: UuidSchema,
    clientEventIds: z.array(UuidSchema).min(1).max(100),
    operation: z.literal('RecordConsentDecision'),
    commandSchemaVersion: z.literal(1),
    target: ConsentDecisionCommandTargetSchema,
    expectedRevision: RevisionSchema,
    occurredAt: TimestampSchema,
    timezone: z.string().min(1).max(64),
    localSequence: z.int().positive(),
    causalCommandIds: z.array(UuidSchema).max(100),
    requestHash: Sha256DigestSchema,
    payload: ConsentDecisionPayloadSchema,
  })
  .strict()
  .meta({ id: 'SyncCommandEnvelopeV2', 'x-data-classification': 'C2' });

export const SyncBatchSchema = z
  .object({
    syncBatchVersion: z.literal(1),
    batchId: UuidSchema,
    streamId: UuidSchema,
    cursor: z.string().min(1).max(2048),
    clientBuild: z.string().min(1).max(80),
    commands: z.array(SyncCommandEnvelopeSchema).max(100),
    feedLimit: z.int().min(1).max(100),
  })
  .strict()
  .meta({ id: 'SyncBatch', 'x-data-classification': 'C2' });

const SyncDispositionBaseSchema = z.object({
  commandId: UuidSchema,
  clientEventIds: z.array(UuidSchema).min(1).max(100),
  acknowledgementId: UuidSchema,
  serverReceivedAt: TimestampSchema,
});

const SyncAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z.literal('ACCEPTED'),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z.array(UuidV7Schema).min(1).max(20),
}).strict();
const SyncAlreadyAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z.literal('ALREADY_ACCEPTED'),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z.array(UuidV7Schema).min(1).max(20),
}).strict();
const SyncRejectedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z.literal('REJECTED'),
  problemCode: ProblemCodeSchema,
  authoritativeRevision: RevisionSchema.optional(),
  serverEventIds: z.array(UuidV7Schema).max(0),
}).strict();
const SyncConflictDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z.literal('CONFLICT'),
  problemCode: ProblemCodeSchema,
  conflictId: UuidSchema,
  authoritativeRevision: RevisionSchema,
  serverEventIds: z.array(UuidV7Schema).max(0),
}).strict();

export const SyncCommandDispositionSchema = z
  .discriminatedUnion('disposition', [
    SyncAcceptedDispositionSchema,
    SyncAlreadyAcceptedDispositionSchema,
    SyncRejectedDispositionSchema,
    SyncConflictDispositionSchema,
  ])
  .meta({ id: 'SyncCommandDisposition', 'x-data-classification': 'C2' });

export const SyncIntegrationEventSchema = MilestoneOneEventSchema;
export const SyncIntegrationEventV2Schema = MilestoneTwoEventSchema;

export const SyncProjectionDeltaSchema = z
  .object({
    projectionType: z.string().min(1).max(80),
    projectionId: UuidSchema,
    projectionSchemaVersion: z.int().positive(),
    authoritativeRevision: RevisionSchema,
    changeType: z.enum(['UPSERT', 'TOMBSTONE']),
    dataMode: DataModeSchema,
    payloadClassification: z.enum(['C0', 'C1', 'C2', 'C3']),
    payload: JsonObjectSchema,
    payloadChecksum: Sha256DigestSchema,
  })
  .strict()
  .meta({ id: 'SyncProjectionDelta', 'x-data-classification': 'C2' });

export const SyncFeedEventSchema = z
  .object({
    feedEventId: UuidV7Schema,
    sequence: z.int().positive(),
    integrationEvent: SyncIntegrationEventSchema,
    projectionDeltas: z.array(SyncProjectionDeltaSchema).max(100),
  })
  .strict()
  .meta({ id: 'SyncFeedEvent', 'x-data-classification': 'C2' });

export const SyncFeedEventV2Schema = SyncFeedEventSchema.extend({
  integrationEvent: SyncIntegrationEventV2Schema,
})
  .strict()
  .meta({ id: 'SyncFeedEventV2', 'x-data-classification': 'C3' });

export const SyncBatchResponseSchema = z
  .object({
    batchId: UuidSchema,
    dispositions: z.array(SyncCommandDispositionSchema).max(100),
    feedEvents: z.array(SyncFeedEventSchema).max(100),
    nextCursor: z.string().min(1).max(2048),
    highWaterMark: z.string().min(1).max(2048),
    hasMore: z.boolean(),
    serverTime: TimestampSchema,
    authorizationVersion: z.int().positive(),
  })
  .strict()
  .meta({ id: 'SyncBatchResponse', 'x-data-classification': 'C2' });

export const SyncBatchResponseV2Schema = SyncBatchResponseSchema.extend({
  feedEvents: z.array(SyncFeedEventV2Schema).max(100),
})
  .strict()
  .meta({ id: 'SyncBatchResponseV2', 'x-data-classification': 'C3' });

export const SyncBootstrapRequestSchema = z
  .object({
    bootstrapVersion: z.literal(1),
    streamId: UuidSchema,
    localDatabaseSchemaVersion: z.int().positive(),
    supportedProjectionVersions: SchemaVersionRangeSchema,
  })
  .strict()
  .meta({ id: 'SyncBootstrapRequest', 'x-data-classification': 'C2' });

export const SyncTombstoneSchema = z
  .object({
    projectionType: z.string().min(1).max(80),
    projectionId: UuidSchema,
    deletionEpoch: z.int().positive(),
    minimumResurrectionRevision: RevisionSchema,
  })
  .strict();

export const SyncBootstrapResponseSchema = z
  .object({
    streamId: UuidSchema,
    snapshotSchemaVersion: z.int().positive(),
    snapshotChecksum: Sha256DigestSchema,
    generatedAt: TimestampSchema,
    expiresAt: TimestampSchema,
    projections: z.array(SyncProjectionDeltaSchema).max(5_000),
    tombstones: z.array(SyncTombstoneSchema).max(5_000),
    highWaterMark: z.string().min(1).max(2048),
    cursor: z.string().min(1).max(2048),
    authorizationVersion: z.int().positive(),
  })
  .strict()
  .meta({ id: 'SyncBootstrapResponse', 'x-data-classification': 'C2' });

export const SyncFeedPageResponseSchema = SyncBatchResponseSchema.omit({
  batchId: true,
  dispositions: true,
}).meta({ id: 'SyncFeedPageResponse', 'x-data-classification': 'C2' });
export const SyncFeedPageResponseV2Schema = SyncBatchResponseV2Schema.omit({
  batchId: true,
  dispositions: true,
}).meta({ id: 'SyncFeedPageResponseV2', 'x-data-classification': 'C3' });
export const SyncCommandStatusResponseSchema = z
  .object({ command: SyncCommandDispositionSchema })
  .strict()
  .meta({ id: 'SyncCommandStatusResponse', 'x-data-classification': 'C2' });

export const SyncConflictTypeSchema = z.enum([
  'EXPECTED_REVISION_MISMATCH',
  'DUPLICATE_LOGICAL_ACTION',
  'CONCURRENT_MUTABLE_FIELD',
  'TASK_ACTUAL_VS_PLAN_CHANGE',
  'CROP_STAGE_DISAGREEMENT',
  'TOMBSTONED_ENTITY',
  'ASSIGNMENT_CHANGED',
  'CONSENT_OR_ACCESS_VERSION_CHANGED',
  'CLOCK_UNTRUSTED',
  'MEDIA_INTEGRITY_MISMATCH',
  'SCHEMA_REQUIRES_MIGRATION',
]);
export const SyncConflictSchema = z
  .object({
    conflictId: UuidSchema,
    conflictType: SyncConflictTypeSchema,
    revision: RevisionSchema,
    commandId: UuidSchema,
    clientEventIds: z.array(UuidSchema).min(1).max(100),
    targetType: z.string().min(1).max(80),
    targetId: UuidSchema,
    localRevision: RevisionSchema,
    authoritativeRevision: RevisionSchema,
    localSummary: JsonObjectSchema,
    authoritativeSummary: JsonObjectSchema,
    allowedActions: z
      .array(z.enum(['CREATE_NEW_COMMAND', 'KEEP_BOTH_FACTS', 'DISCARD_LOCAL_PROPOSAL']))
      .min(1)
      .max(3),
    state: z.enum(['OPEN', 'RESOLUTION_PENDING', 'RESOLVED', 'LOCKED_RECOVERY']),
    createdAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'SyncConflict', 'x-data-classification': 'C2' });
export const SyncConflictListResponseSchema = z
  .object({
    conflicts: z.array(SyncConflictSchema).max(100),
    nextCursor: z.string().max(2048).optional(),
  })
  .strict()
  .meta({ id: 'SyncConflictListResponse', 'x-data-classification': 'C2' });
export const SyncConflictResolutionRequestSchema = z
  .object({
    resolutionSchemaVersion: z.literal(1),
    conflictId: UuidSchema,
    expectedConflictRevision: RevisionSchema,
    action: z.enum(['CREATE_NEW_COMMAND', 'KEEP_BOTH_FACTS', 'DISCARD_LOCAL_PROPOSAL']),
    resolutionCommandId: UuidSchema,
    payloadHash: Sha256DigestSchema,
  })
  .strict()
  .meta({ id: 'SyncConflictResolutionRequest', 'x-data-classification': 'C2' });

export type DeviceMode = z.infer<typeof DeviceModeSchema>;
export type SyncCommandEnvelope = z.infer<typeof SyncCommandEnvelopeSchema>;
export type SyncCommandDisposition = z.infer<typeof SyncCommandDispositionSchema>;
export type SyncBatch = z.infer<typeof SyncBatchSchema>;
export type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;
export type SyncBatchResponseV2 = z.infer<typeof SyncBatchResponseV2Schema>;
export type SyncBootstrapResponse = z.infer<typeof SyncBootstrapResponseSchema>;
export type SyncStreamOpenResponse = z.infer<typeof SyncStreamOpenResponseSchema>;
