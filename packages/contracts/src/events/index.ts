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

/** Every frozen name is accepted here; only MilestoneOneEventSchema is executable in M1. */
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

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type MilestoneOneEvent = z.infer<typeof MilestoneOneEventSchema>;
