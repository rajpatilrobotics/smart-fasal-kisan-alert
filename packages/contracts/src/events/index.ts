import { z } from 'zod';

import {
  ActorTypeSchema,
  ConsentScopeSchema,
  DataClassificationSchema,
  DataModeSchema,
  JsonObjectSchema,
  ProvenanceTypeSchema,
  PurposeCodeSchema,
  RoleTypeSchema,
  Sha256DigestSchema,
  TimestampSchema,
  TraceIdSchema,
  UuidSchema,
  UuidV7Schema,
} from '../http/common.js';
import eventCatalog from './catalog.json' with { type: 'json' };

const eventNames = eventCatalog.events.map((event) => event.name);

if (eventNames.length === 0) {
  throw new Error('The canonical event catalogue must not be empty.');
}

/** Every frozen name is accepted here; catalog status separately controls producer readiness. */
export const EventNameSchema = z.enum(eventNames as [string, ...string[]]);

const EventEnvelopeBaseSchema = z
  .object({
    eventId: UuidV7Schema,
    eventName: EventNameSchema,
    eventVersion: z.int().positive(),
    aggregateType: z.string().min(1).max(80),
    aggregateId: UuidSchema,
    aggregateRevision: z.int().positive(),
    eventOrdinal: z.int().positive(),
    occurredAt: TimestampSchema,
    clientRecordedAt: TimestampSchema.optional(),
    serverReceivedAt: TimestampSchema,
    committedAt: TimestampSchema,
    actorType: ActorTypeSchema,
    actorRef: UuidSchema.optional(),
    roleContextRef: UuidSchema.optional(),
    deviceRef: UuidSchema.optional(),
    jurisdictionId: UuidSchema.optional(),
    purposeCode: PurposeCodeSchema.optional(),
    consentAccessVersion: z.int().positive().optional(),
    dataMode: DataModeSchema,
    provenanceTypes: z.array(ProvenanceTypeSchema).min(1).max(9),
    modeDerivationVersion: z.string().min(1).max(80),
    correlationId: UuidSchema,
    causationId: UuidSchema.optional(),
    traceId: TraceIdSchema.optional(),
    producerService: z.string().min(1).max(80),
    producerBuild: z.string().min(1).max(120),
    payloadClassification: DataClassificationSchema,
    retentionClass: z.string().min(1).max(80),
    payloadSchemaVersion: z.int().positive(),
    payload: JsonObjectSchema,
    payloadChecksum: Sha256DigestSchema,
  })
  .strict();

export const EventEnvelopeSchema = EventEnvelopeBaseSchema.meta({
  id: 'EventEnvelope',
  'x-data-classification': 'C2',
});

export const RoleContextCreatedPayloadSchema = z
  .object({
    roleContextId: UuidSchema,
    subjectId: UuidSchema,
    roleType: RoleTypeSchema,
    authorizationVersion: z.int().positive(),
    capabilitySetVersion: z.int().positive(),
    expiresAt: TimestampSchema,
  })
  .strict();

export const RoleContextRevokedPayloadSchema = z
  .object({
    roleContextId: UuidSchema,
    subjectId: UuidSchema,
    authorizationVersion: z.int().positive(),
    reasonCode: z.enum(['USER_SWITCH', 'LOGOUT', 'GRANT_REVOKED', 'SECURITY_VERSION_CHANGED']),
  })
  .strict();

export const ConsentDecisionRecordedPayloadSchema = z
  .object({
    consentDecisionId: UuidSchema,
    subjectId: UuidSchema,
    scopeKey: ConsentScopeSchema,
    purposeKey: PurposeCodeSchema,
    targetKind: z.enum(['ACCOUNT', 'ASSISTED_FARMER_CONTEXT']),
    targetId: UuidSchema,
    decision: z.enum(['ALLOW', 'DENY', 'WITHDRAW']),
    accessVersion: z.int().positive(),
  })
  .strict();

export const RoleContextCreatedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.literal('identity.role_context_created'),
  payloadClassification: z.literal('C2'),
  payload: RoleContextCreatedPayloadSchema,
}).strict();

export const RoleContextRevokedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.literal('identity.role_context_revoked'),
  payloadClassification: z.literal('C2'),
  payload: RoleContextRevokedPayloadSchema,
}).strict();

export const ConsentDecisionRecordedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.literal('consent.decision_recorded'),
  payloadClassification: z.literal('C2'),
  payload: ConsentDecisionRecordedPayloadSchema,
}).strict();

export const MilestoneOneEventSchema = z
  .discriminatedUnion('eventName', [
    RoleContextCreatedEventSchema,
    RoleContextRevokedEventSchema,
    ConsentDecisionRecordedEventSchema,
  ])
  .meta({ id: 'MilestoneOneEvent', 'x-data-classification': 'C2' });

export const SyncLifecyclePayloadSchema = z
  .object({
    streamId: UuidSchema,
    batchId: UuidSchema.optional(),
    commandId: UuidSchema.optional(),
    conflictId: UuidSchema.optional(),
    disposition: z.enum(['ACCEPTED', 'ALREADY_ACCEPTED', 'REJECTED', 'CONFLICT']).optional(),
  })
  .strict();
export const SyncLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.enum([
    'sync.batch_started',
    'sync.event_accepted',
    'sync.event_already_accepted',
    'sync.event_rejected',
    'sync.conflict_detected',
    'sync.conflict_resolved',
  ]),
  payloadClassification: z.literal('C2'),
  payload: SyncLifecyclePayloadSchema,
}).strict();
export const MediaUploadVerifiedPayloadSchema = z
  .object({
    assetId: UuidSchema,
    derivativeId: UuidSchema,
    purpose: z.enum([
      'CROP_HEALTH_IMAGE',
      'DIARY_MEDIA',
      'RSK_VISIT_EVIDENCE',
      'SENSOR_MAINTENANCE_EVIDENCE',
      'VOICE_OFFLINE_AUDIO',
    ]),
    sourceChecksum: Sha256DigestSchema,
    derivativeChecksum: Sha256DigestSchema,
    scannerVersion: z.string().min(1).max(80),
  })
  .strict();
export const MediaUploadVerifiedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.literal('media.upload_verified'),
  payloadClassification: z.literal('C2'),
  payload: MediaUploadVerifiedPayloadSchema,
}).strict();
export const VoiceLifecyclePayloadSchema = z
  .object({
    sessionId: UuidSchema,
    proposalId: UuidSchema.optional(),
    offlineAudioRefId: UuidSchema.optional(),
    lifecycleState: z.string().min(1).max(80),
    payloadHash: Sha256DigestSchema.optional(),
    detailCode: z.string().min(1).max(80).optional(),
  })
  .strict();
export const VoiceLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z.enum([
    'voice.session_started',
    'voice.session_ended',
    'voice.intent_recognized',
    'voice.clarification_requested',
    'voice.proposal_created',
    'voice.proposal_cancelled',
    'voice.proposal_confirmed',
    'voice.proposal_corrected',
    'voice.proposal_expired',
    'voice.proposal_superseded',
    'voice.provider_failed',
    'voice.offline_audio_attached',
    'voice.offline_audio_transcription_started',
    'voice.offline_audio_needs_confirmation',
    'voice.offline_audio_declined',
    'voice.offline_audio_deleted',
  ]),
  payloadClassification: z.enum(['C2', 'C3']),
  payload: VoiceLifecyclePayloadSchema,
}).strict();
/** Reserved M2 wire schemas. They do not claim an executable producer or atomic outbox. */
export const MilestoneTwoEventSchema = z
  .union([
    MilestoneOneEventSchema,
    SyncLifecycleEventSchema,
    MediaUploadVerifiedEventSchema,
    VoiceLifecycleEventSchema,
  ])
  .meta({ id: 'MilestoneTwoEvent', 'x-data-classification': 'C3' });

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type MilestoneOneEvent = z.infer<typeof MilestoneOneEventSchema>;
export type MilestoneTwoEvent = z.infer<typeof MilestoneTwoEventSchema>;
