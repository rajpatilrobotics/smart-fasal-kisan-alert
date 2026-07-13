import { z } from 'zod';

import {
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema,
} from '../commands/index.js';
import { MilestoneOneEventSchema } from '../events/index.js';
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

/** M1 sync is Farmer-only and can transport only the M1 Farmer consent command. */
export const SyncCommandEnvelopeSchema = z
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
  .meta({ id: 'SyncCommandEnvelope', 'x-data-classification': 'C2' });

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

const SyncDispositionBaseSchema = z
  .object({
    commandId: UuidSchema,
    clientEventIds: z.array(UuidSchema).min(1).max(100),
    acknowledgementId: UuidSchema,
    serverReceivedAt: TimestampSchema,
  })
  .strict();

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

export const SyncProjectionDeltaSchema = z
  .object({
    projectionType: z.string().min(1).max(80),
    projectionId: UuidSchema,
    projectionSchemaVersion: z.int().positive(),
    authoritativeRevision: RevisionSchema,
    changeType: z.enum(['UPSERT', 'TOMBSTONE']),
    dataMode: DataModeSchema,
    payloadClassification: z.enum(['C0', 'C1', 'C2']),
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

export type SyncCommandEnvelope = z.infer<typeof SyncCommandEnvelopeSchema>;
export type SyncCommandDisposition = z.infer<typeof SyncCommandDispositionSchema>;
export type SyncBatch = z.infer<typeof SyncBatchSchema>;
export type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;
