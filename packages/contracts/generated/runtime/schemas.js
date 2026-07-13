// packages/contracts/src/commands/index.ts
import { z as z2 } from "zod";

// packages/contracts/src/http/common.ts
import { z } from "zod";

// packages/contracts/src/vocabulary.ts
var DATA_CLASSIFICATIONS = ["C0", "C1", "C2", "C3", "C4", "P1"];
var DATA_MODES = ["LIVE", "RECORDED", "SIMULATED"];
var PROVENANCE_TYPES = [
  "SENSOR",
  "FARMER_MANUAL",
  "RSK_MANUAL",
  "LABORATORY",
  "SOIL_HEALTH_CARD",
  "WEATHER",
  "SATELLITE",
  "PUBLIC_MARKET",
  "DERIVED"
];
var ROLE_TYPES = ["FARMER", "RSK", "MP"];
var ACTOR_TYPES = [
  "FARMER",
  "RSK_STAFF",
  "MP_STAFF",
  "SYSTEM",
  "DEVICE",
  "PROVIDER"
];
var CONSENT_SCOPES = [
  "location.processing",
  "audio.storage",
  "case.sharing",
  "sensor.collection",
  "sensor.maintenance_location",
  "visit.access",
  "assisted_service.access",
  "channel.app_push",
  "channel.sms",
  "channel.ivr",
  "market.private_fields"
];
var PURPOSE_CODES = [
  "farmer.self_service",
  "case.expert_support",
  "field.visit",
  "sensor.maintenance",
  "assisted.service",
  "alert.delivery",
  "market.support",
  "data.rights"
];
var CAPABILITY_KEYS = [
  "case.response.draft",
  "case.care_plan.issue",
  "case.severe.resolve",
  "advisory.review.decide",
  "alert.draft",
  "alert.approve",
  "alert.publish",
  "alert.delivery.monitor",
  "alert.delivery.operate",
  "sensor.agronomic_invalidate",
  "template.draft",
  "template.approve",
  "template.publish",
  "calendar.review",
  "market.support",
  "market.mapping.review",
  "market.mapping.approve",
  "assisted_session.operate",
  "visit.manage",
  "visit.execute.field",
  "visit.execute.sensor",
  "visit.outcome.review",
  "audit.investigate_sensitive",
  "rsk.work.read",
  "rsk.work.operate",
  "rsk.work.assign",
  "rsk.protected_search",
  "rsk.access_grant.issue",
  "rsk.protected_disclose",
  "case.read",
  "case.evidence.request",
  "case.follow_up.record",
  "case.resolve.routine",
  "advisory.review.read",
  "outreach.operate",
  "sensor.issue.operate",
  "sensor.install",
  "sensor.calibration.record",
  "sensor.maintenance.execute",
  "template.read",
  "alert.read",
  "identity.role_context.select",
  "profile.correct",
  "device_mode.change"
];
var PROBLEM_CODES = [
  "AUTHENTICATION_REQUIRED",
  "AUTHORIZATION_DENIED",
  "MFA_REQUIRED",
  "AUTHORIZATION_VERSION_CHANGED",
  "CONSENT_OR_ACCESS_VERSION_CHANGED",
  "DEVICE_BINDING_MISMATCH",
  "IDEMPOTENCY_KEY_REUSED",
  "EXPECTED_REVISION_MISMATCH",
  "INVALID_STATE_TRANSITION",
  "TOMBSTONED_ENTITY",
  "SOURCE_VERSION_EXPIRED",
  "EVIDENCE_INSUFFICIENT",
  "SYNC_CURSOR_INVALID",
  "SYNC_CURSOR_EXPIRED",
  "SYNC_BOOTSTRAP_REQUIRED",
  "SYNC_SCHEMA_UNSUPPORTED",
  "SYNC_BATCH_ID_REUSED",
  "CAUSAL_DEPENDENCY_UNSATISFIED",
  "ASSIGNMENT_CHANGED",
  "CLOCK_UNTRUSTED",
  "MEDIA_INTEGRITY_MISMATCH",
  "MEDIA_NOT_VERIFIED",
  "UPLOAD_INTENT_EXPIRED",
  "VOICE_PROPOSAL_EXPIRED",
  "VOICE_PROPOSAL_HASH_MISMATCH",
  "VISUAL_REVIEW_REQUIRED",
  "RELEASE_INVALIDATED",
  "RELEASE_UNAVAILABLE",
  "DEPENDENCY_UNAVAILABLE",
  "FILTER_NOT_ALLOWLISTED",
  "COMPARISON_NOT_RELEASABLE",
  "BATCH_ID_PAYLOAD_MISMATCH",
  "RATE_LIMITED"
];
var CONSENT_STATES = ["MISSING", "ALLOWED", "DENIED", "EXPIRED", "WITHDRAWN"];
var COMMAND_DISPOSITIONS = [
  "ACCEPTED",
  "ALREADY_ACCEPTED",
  "REJECTED",
  "CONFLICT",
  "IN_PROGRESS"
];
var EVENT_CLASSES = [
  "CLIENT_LOCAL",
  "DOMAIN",
  "TECHNICAL",
  "COMMAND_RECEIPT",
  "AUDIT",
  "PRODUCT_TELEMETRY",
  "ANALYTICS_CANDIDATE",
  "ANALYTICS_SAFE"
];

// packages/contracts/src/http/common.ts
var UuidSchema = z.uuid();
var UuidV7Schema = z.uuidv7();
var TimestampSchema = z.iso.datetime({ offset: true });
var RevisionSchema = z.int().nonnegative();
var Sha256DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
var TraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/);
function isJsonValue(value, seen = /* @__PURE__ */ new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  let valid;
  if (Array.isArray(value)) {
    valid = value.every((item) => isJsonValue(item, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    valid = (prototype === Object.prototype || prototype === null) && Object.values(value).every((item) => isJsonValue(item, seen));
  }
  seen.delete(value);
  return valid;
}
var JsonValueSchema = z.custom((value) => isJsonValue(value), { message: "Expected a JSON wire value" }).meta({ id: "JsonValue" });
var JsonObjectSchema = z.record(z.string(), JsonValueSchema);
var DataClassificationSchema = z.enum(DATA_CLASSIFICATIONS);
var DataModeSchema = z.enum(DATA_MODES);
var ProvenanceTypeSchema = z.enum(PROVENANCE_TYPES);
var RoleTypeSchema = z.enum(ROLE_TYPES);
var ActorTypeSchema = z.enum(ACTOR_TYPES);
var CapabilityKeySchema = z.enum(CAPABILITY_KEYS);
var ConsentScopeSchema = z.enum(CONSENT_SCOPES);
var PurposeCodeSchema = z.enum(PURPOSE_CODES);
var ConsentStateSchema = z.enum(CONSENT_STATES);
var ProblemCodeSchema = z.enum(PROBLEM_CODES);
var HealthStatusSchema = z.enum(["ok", "not_ready"]);
var HealthPayloadSchema = z.object({
  service: z.string().min(1).max(80),
  status: HealthStatusSchema,
  timestamp: TimestampSchema
}).strict().meta({ id: "HealthPayload", "x-data-classification": "C0" });
var FieldErrorSchema = z.object({
  field: z.string().min(1).max(120),
  code: z.string().min(1).max(80)
}).strict();
var ProblemDetailsSchema = z.object({
  type: z.string().url(),
  title: z.string().min(1).max(160),
  status: z.int().min(400).max(599),
  code: ProblemCodeSchema,
  correlationId: UuidSchema,
  retryable: z.boolean(),
  detail: z.string().min(1).max(500).optional(),
  fieldErrors: z.array(FieldErrorSchema).max(25).default([])
}).strict().meta({ id: "ProblemDetails", "x-data-classification": "C1" });
var UnavailableSchema = z.object({
  state: z.literal("UNAVAILABLE"),
  code: z.literal("DEPENDENCY_UNAVAILABLE"),
  correlationId: UuidSchema,
  retryable: z.boolean()
}).strict().meta({ id: "Unavailable", "x-data-classification": "C1" });
var AuthorizationContextSchema = z.object({
  environment: z.enum(["local", "preview", "staging", "demo", "production"]),
  subjectId: UuidSchema,
  roleContextId: UuidSchema,
  roleType: RoleTypeSchema,
  officeId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional(),
  purposeCode: PurposeCodeSchema,
  authorizationVersion: z.int().positive(),
  capabilitySetVersion: z.int().positive(),
  capabilities: z.array(CapabilityKeySchema).max(CAPABILITY_KEYS.length)
}).strict().meta({ id: "AuthorizationContext", "x-data-classification": "C2" });

// packages/contracts/src/commands/index.ts
var ClientContextSchema = z2.object({
  clientRecordedAt: TimestampSchema,
  timezone: z2.string().min(1).max(64),
  dataModeClaim: z2.enum(["LIVE", "RECORDED", "SIMULATED"])
}).strict();
var CommandTargetSchema = z2.object({
  type: z2.enum(["roleContext", "consentDecision", "accessGrant"]),
  id: UuidSchema
}).strict();
var RoleContextCommandTargetSchema = CommandTargetSchema.extend({
  type: z2.literal("roleContext")
}).strict();
var ConsentDecisionCommandTargetSchema = CommandTargetSchema.extend({
  type: z2.literal("consentDecision")
}).strict();
var AccessGrantCommandTargetSchema = CommandTargetSchema.extend({
  type: z2.literal("accessGrant")
}).strict();
var SelectRoleContextPayloadSchema = z2.object({
  roleGrantId: UuidSchema,
  officeId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional()
}).strict();
var ConsentDecisionPayloadSchema = z2.object({
  decision: z2.enum(["ALLOW", "DENY", "WITHDRAW"]),
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z2.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  policyVersionId: UuidSchema,
  expiresAt: TimestampSchema.optional()
}).strict();
var AccessGrantPayloadSchema = z2.object({
  targetKind: z2.literal("ASSISTED_FARMER_CONTEXT"),
  targetId: UuidSchema,
  farmerSubjectId: UuidSchema,
  purposeKey: z2.literal("assisted.service"),
  consentAccessVersion: z2.int().positive(),
  expiresAt: TimestampSchema
}).strict();
function commandEnvelope(operation, target, payload) {
  return z2.object({
    commandSchemaVersion: z2.literal(1),
    operation: z2.literal(operation),
    target,
    expectedRevision: RevisionSchema,
    payload,
    clientContext: ClientContextSchema
  }).strict();
}
var SelectRoleContextCommandSchema = commandEnvelope(
  "SelectRoleContext",
  RoleContextCommandTargetSchema,
  SelectRoleContextPayloadSchema
).meta({ id: "SelectRoleContextCommand", "x-data-classification": "C2" });
var RecordConsentDecisionCommandSchema = commandEnvelope(
  "RecordConsentDecision",
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema
).meta({ id: "RecordConsentDecisionCommand", "x-data-classification": "C2" });
var IssueAccessGrantCommandSchema = commandEnvelope(
  "IssueAccessGrant",
  AccessGrantCommandTargetSchema,
  AccessGrantPayloadSchema
).meta({ id: "IssueAccessGrantCommand", "x-data-classification": "C2" });
var CommandEnvelopeSchema = z2.discriminatedUnion("operation", [
  SelectRoleContextCommandSchema,
  RecordConsentDecisionCommandSchema,
  IssueAccessGrantCommandSchema
]).meta({ id: "CommandEnvelope", "x-data-classification": "C2" });
var CommandSchema = CommandEnvelopeSchema;
var CommandDispositionSchema = z2.enum(COMMAND_DISPOSITIONS);
var CommandResultSchema = z2.object({
  commandId: UuidSchema,
  disposition: CommandDispositionSchema,
  result: z2.object({
    type: z2.enum(["roleContext", "consentDecision", "accessGrant"]),
    id: UuidSchema,
    revision: RevisionSchema
  }).strict().optional(),
  eventIds: z2.array(UuidSchema).max(20),
  syncAcknowledgementId: UuidSchema.optional(),
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "CommandResult", "x-data-classification": "C2" });

// packages/contracts/src/device/index.ts
import { z as z3 } from "zod";
var DeviceBatchReceiptSchema = z3.object({
  batchId: UuidSchema,
  state: z3.enum(["DURABLY_ACCEPTED", "ALREADY_ACCEPTED", "REJECTED"]),
  receivedAt: TimestampSchema,
  explicitlyNotAgronomicTrust: z3.literal(true)
}).strict().meta({ id: "DeviceBatchReceipt", "x-data-classification": "C1" });

// packages/contracts/src/events/index.ts
import { z as z4 } from "zod";

// packages/contracts/src/events/catalog.json
var catalog_default = {
  contractVersion: "1.0.0",
  events: [
    {
      name: "farmer.setup_saved_local",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "farmer.setup_saved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "farmer.preferences_changed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "farmer.setup_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "identity.role_context_created",
      eventClass: "TECHNICAL",
      version: 1,
      status: "executable"
    },
    {
      name: "identity.role_context_revoked",
      eventClass: "TECHNICAL",
      version: 1,
      status: "executable"
    },
    {
      name: "identity.device_mode_changed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "consent.decision_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "farm.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "farm.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "plot.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "plot.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "soil_record.added",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "water_context.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "farm.crop_history_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "profile.snapshot_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "season.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "season.start_confirmed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "season.activated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "harvest.window_confirmed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "harvest.readiness_updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "harvest.actual_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "today.briefing_generated",
      eventClass: "PRODUCT_TELEMETRY",
      version: 1,
      status: "reserved"
    },
    {
      name: "today.briefing_played",
      eventClass: "PRODUCT_TELEMETRY",
      version: 1,
      status: "reserved"
    },
    {
      name: "today.primary_action_selected",
      eventClass: "PRODUCT_TELEMETRY",
      version: 1,
      status: "reserved"
    },
    {
      name: "today.card_opened",
      eventClass: "PRODUCT_TELEMETRY",
      version: 1,
      status: "reserved"
    },
    {
      name: "evidence.validated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "evidence.snapshot_created",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "evidence.snapshot_finalized",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "evidence.snapshot_invalidated",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "evidence.freshness_changed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.input_rejected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.generated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.no_safe_result",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.review_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.accepted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "recommendation.superseded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "decision.impact_review_requested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "decision.impact_review_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "dry_spell.evaluated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.evaluated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.no_action",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.review_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.review_claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.consent_checked",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.evidence_accessed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.review_decided",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.issued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.publication_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.publication_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.publication_retried",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.publication_blocked",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.published",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.recalculated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.replaced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.disputed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "farmer.response_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "constraint.recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.version_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.submitted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.reviewed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.approved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.changes_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.activation_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.activation_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.published",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.retired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "template.rolled_back",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.instantiated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_changed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_replaced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_partially_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_blocked",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.task_cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.reminder_scheduled_local",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.reminder_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.review_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.review_claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.review_evidence_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.review_decided",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.change_application_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.change_application_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "calendar.change_applied",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.entry_saved_local",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.activity_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.observation_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.entry_corrected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.entry_voided",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.batch_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.event_accepted",
      eventClass: "COMMAND_RECEIPT",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.event_already_accepted",
      eventClass: "COMMAND_RECEIPT",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.event_rejected",
      eventClass: "COMMAND_RECEIPT",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.conflict_detected",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sync.conflict_resolved",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "media.upload_verified",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "diary.media_attached",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "health_media.attached",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.media_attached",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_retrieved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_preparation_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_ready",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_expired",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.export_artifact_deleted",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_item_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_item_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.deletion_ledger_committed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.restore_ledger_verified",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "data.tombstone_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "health_report.saved",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "health_media.queued",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "health_report.synced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "health_report.triage_ready",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "triage.completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "triage.escalated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "triage.escalation_sharing_declined",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.contact_access_authorized",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.evidence_accessed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.evidence_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.care_plan_issued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.visit_scheduled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.follow_up_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.closed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "case.reopened",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_assigned",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_resumed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_waiting",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_scheduled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_reopened",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "rsk.work_marked_duplicate",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.assigned",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.contact_access_checked",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.contact_revealed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.attempted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.response_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.follow_up_scheduled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "outreach.resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "contact.correction_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_incident_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_incident_triaged",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_mitigation_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_incident_resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_incident_reopened",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_exception_resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.retry_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.alternate_channel_selected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.provider_noncritical_pause_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.search_attempted",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.protected_data_accessed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.farmer_verified",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.consent_checked",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.session_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.session_revoked",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.mutation_confirmed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.receipt_issued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.client_data_purged",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "assisted.recovery_locked",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.approved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.scheduled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.assigned",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.accepted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.consent_checked",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.location_accessed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.pack_issued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.observation_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.farmer_response_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.saved_offline",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.synced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.outcome_reviewed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.closed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.access_revoked",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "visit.client_data_purged",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.consent_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.consent_withdrawn",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.collection_stopped",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.location_access_revoked",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.deassigned",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.removal_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.installed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.activated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.device_registered",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.calibration_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.batch_rejected",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.batch_durably_accepted",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.observation_received",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.observation_normalized",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.trust_interval_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.interval_flagged",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.issue_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.issue_triaged",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.issue_mitigation_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.issue_resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.issue_reopened",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.location_accessed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.interval_invalidated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.advice_impact_reviewed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_saved_offline",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_observation_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_validation_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_closed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.returned_to_service",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.maintenance_media_attached",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "sensor.credential_revoked",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_submitted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_approved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.changes_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_rejected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.publication_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.publication_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.draft_published",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.version_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.cohort_frozen",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.attempt_queued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.provider_accepted",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivered",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_failed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.delivery_unknown",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.attempt_expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.recipient_reached",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.opened_or_heard",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.acknowledged",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.response_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.replaced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.corrected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.push_registration_created",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.push_registration_rotated",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "alert.push_registration_revoked",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.raw_record_archived",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_decided",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_approved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_rejected",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_superseded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_rollback_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.mapping_rolled_back",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.reprocessing_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.reprocessing_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.reprocessing_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.comparison_replaced",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_paused",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_resumed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_cancelled",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_triggered",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_cooldown_started",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.watch_rearmed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_claimed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_information_requested",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_response_issued",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_follow_up_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_resolved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.support_closed",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "market.sale_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.session_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.session_ended",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.intent_recognized",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.clarification_requested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_created",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_cancelled",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_confirmed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_corrected",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_expired",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.proposal_superseded",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.provider_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.offline_audio_attached",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.offline_audio_transcription_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.offline_audio_needs_confirmation",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.offline_audio_declined",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "voice.offline_audio_deleted",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.invocation_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.invocation_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.invocation_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.output_validation_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.extraction_accepted",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.extraction_rejected",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "ai.explanation_published",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "model.kill_switch_activated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "model.alias_rolled_back",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "external.import_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "external.import_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "external.import_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "external.raw_artifact_deleted",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.forecast_edition_ingested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.forecast_edition_expired",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.freshness_changed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.warning_version_ingested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.warning_corrected",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "weather.warning_cancelled",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.job_requested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.job_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.job_completed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.job_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.job_cancelled",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.snapshot_created",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.snapshot_expired",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.snapshot_invalidated",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "earth.location_consent_blocked",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.candidate_recorded",
      eventClass: "ANALYTICS_CANDIDATE",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.candidate_corrected",
      eventClass: "ANALYTICS_CANDIDATE",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.candidate_withdrawn",
      eventClass: "ANALYTICS_CANDIDATE",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.safe_fact_recorded",
      eventClass: "ANALYTICS_SAFE",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.safe_fact_corrected",
      eventClass: "ANALYTICS_SAFE",
      version: 1,
      status: "reserved"
    },
    {
      name: "analytics.safe_fact_retracted",
      eventClass: "ANALYTICS_SAFE",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_started",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_validated",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_signed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_activated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_invalidated",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.release_expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "privacy.cell_suppressed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.aggregate_query_completed",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.aggregate_query_refused",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.safe_rollup_returned",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_generation_requested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_generation_failed",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_export_requested",
      eventClass: "TECHNICAL",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_draft_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_snapshot_saved",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_exported",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "mp.briefing_export_refused",
      eventClass: "AUDIT",
      version: 1,
      status: "reserved"
    }
  ]
};

// packages/contracts/src/events/index.ts
var eventNames = catalog_default.events.map((event) => event.name);
if (eventNames.length === 0) {
  throw new Error("The canonical event catalogue must not be empty.");
}
var EventNameSchema = z4.enum(eventNames);
var EventEnvelopeBaseSchema = z4.object({
  eventId: UuidV7Schema,
  eventName: EventNameSchema,
  eventVersion: z4.int().positive(),
  aggregateType: z4.string().min(1).max(80),
  aggregateId: UuidSchema,
  aggregateRevision: z4.int().positive(),
  eventOrdinal: z4.int().positive(),
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
  consentAccessVersion: z4.int().positive().optional(),
  dataMode: DataModeSchema,
  provenanceTypes: z4.array(ProvenanceTypeSchema).min(1).max(9),
  modeDerivationVersion: z4.string().min(1).max(80),
  correlationId: UuidSchema,
  causationId: UuidSchema.optional(),
  traceId: TraceIdSchema.optional(),
  producerService: z4.string().min(1).max(80),
  producerBuild: z4.string().min(1).max(120),
  payloadClassification: DataClassificationSchema,
  retentionClass: z4.string().min(1).max(80),
  payloadSchemaVersion: z4.int().positive(),
  payload: JsonObjectSchema,
  payloadChecksum: Sha256DigestSchema
}).strict();
var EventEnvelopeSchema = EventEnvelopeBaseSchema.meta({
  id: "EventEnvelope",
  "x-data-classification": "C2"
});
var RoleContextCreatedPayloadSchema = z4.object({
  roleContextId: UuidSchema,
  subjectId: UuidSchema,
  roleType: RoleTypeSchema,
  authorizationVersion: z4.int().positive(),
  capabilitySetVersion: z4.int().positive(),
  expiresAt: TimestampSchema
}).strict();
var RoleContextRevokedPayloadSchema = z4.object({
  roleContextId: UuidSchema,
  subjectId: UuidSchema,
  authorizationVersion: z4.int().positive(),
  reasonCode: z4.enum(["USER_SWITCH", "LOGOUT", "GRANT_REVOKED", "SECURITY_VERSION_CHANGED"])
}).strict();
var ConsentDecisionRecordedPayloadSchema = z4.object({
  consentDecisionId: UuidSchema,
  subjectId: UuidSchema,
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z4.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  decision: z4.enum(["ALLOW", "DENY", "WITHDRAW"]),
  accessVersion: z4.int().positive()
}).strict();
var RoleContextCreatedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.literal("identity.role_context_created"),
  payloadClassification: z4.literal("C2"),
  payload: RoleContextCreatedPayloadSchema
}).strict();
var RoleContextRevokedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.literal("identity.role_context_revoked"),
  payloadClassification: z4.literal("C2"),
  payload: RoleContextRevokedPayloadSchema
}).strict();
var ConsentDecisionRecordedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.literal("consent.decision_recorded"),
  payloadClassification: z4.literal("C2"),
  payload: ConsentDecisionRecordedPayloadSchema
}).strict();
var MilestoneOneEventSchema = z4.discriminatedUnion("eventName", [
  RoleContextCreatedEventSchema,
  RoleContextRevokedEventSchema,
  ConsentDecisionRecordedEventSchema
]).meta({ id: "MilestoneOneEvent", "x-data-classification": "C2" });

// packages/contracts/src/http/auth.ts
import { z as z5 } from "zod";
var ReturnStateRequestSchema = z5.object({
  routeKey: z5.enum(["FARMER_HOME", "RSK_HOME", "MP_HOME"])
}).strict().meta({ id: "ReturnStateRequest", "x-data-classification": "C1" });
var ReturnStateResponseSchema = z5.object({
  returnStateId: UuidSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "ReturnStateResponse", "x-data-classification": "C4" });
var RoleSummarySchema = z5.object({
  roleGrantId: UuidSchema,
  roleType: RoleTypeSchema,
  officeId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional(),
  destination: z5.enum(["/farmer/today", "/rsk/work", "/mp/overview"]),
  capabilitySetVersion: z5.int().positive()
}).strict();
var SessionResponseSchema = z5.object({
  subjectId: UuidSchema,
  subjectType: z5.enum(["FARMER", "STAFF"]),
  environment: z5.enum(["local", "preview", "staging", "demo", "production"]),
  mfaState: z5.enum(["NOT_REQUIRED", "CURRENT", "REQUIRED", "EXPIRED"]),
  deviceBindingState: z5.enum(["ACTIVE", "REQUIRED", "REVOKED"]),
  authorizationVersion: z5.int().positive(),
  capabilitySetVersion: z5.int().positive(),
  activeRoleContext: AuthorizationContextSchema.optional(),
  roles: z5.array(RoleSummarySchema).max(12)
}).strict().meta({ id: "SessionResponse", "x-data-classification": "C2" });
var RoleContextResponseSchema = z5.object({
  roleContext: AuthorizationContextSchema,
  issuedAt: TimestampSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "RoleContextResponse", "x-data-classification": "C2" });
var ConsentRecordSchema = z5.object({
  consentDecisionId: UuidSchema.optional(),
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z5.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  state: ConsentStateSchema,
  accessVersion: z5.int().positive(),
  expiresAt: TimestampSchema.optional()
}).strict();
var ConsentListResponseSchema = z5.object({
  items: z5.array(ConsentRecordSchema).max(100),
  revision: RevisionSchema
}).strict().meta({ id: "ConsentListResponse", "x-data-classification": "C2" });
var FarmerBootstrapResponseSchema = z5.object({
  subjectId: UuidSchema,
  locale: z5.enum(["mr", "hi", "en"]),
  onboardingState: z5.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]),
  authorizationVersion: z5.int().positive(),
  capabilities: z5.array(CapabilityKeySchema).max(10),
  farmContextState: z5.literal("UNAVAILABLE_UNTIL_SETUP")
}).strict().meta({ id: "FarmerBootstrapResponse", "x-data-classification": "C2" });
var RskBootstrapResponseSchema = z5.object({
  subjectId: UuidSchema,
  officeId: UuidSchema,
  jurisdictionId: UuidSchema,
  authorizationVersion: z5.int().positive(),
  capabilities: z5.array(CapabilityKeySchema).max(50),
  workState: z5.literal("UNAVAILABLE_UNTIL_WORK_MILESTONE")
}).strict().meta({ id: "RskBootstrapResponse", "x-data-classification": "C1" });
var ProtectedDisclosureRequestSchema = z5.object({
  targetKind: z5.literal("ASSISTED_FARMER_CONTEXT"),
  targetId: UuidSchema,
  purposeKey: z5.literal("assisted.service"),
  expectedAccessVersion: z5.int().positive(),
  fieldSet: z5.literal("CONTACT")
}).strict().meta({ id: "ProtectedDisclosureRequest", "x-data-classification": "C2" });
var ProtectedDisclosureResponseSchema = z5.object({
  targetId: UuidSchema,
  accessVersion: z5.int().positive(),
  fields: z5.object({
    displayName: z5.string().min(1).max(160),
    contact: z5.string().min(1).max(160)
  }).strict(),
  auditedAt: TimestampSchema
}).strict().meta({ id: "ProtectedDisclosureResponse", "x-data-classification": "C3" });
var MpQueryContextResponseSchema = z5.object({
  state: z5.literal("UNAVAILABLE"),
  code: z5.literal("DEPENDENCY_UNAVAILABLE"),
  availableMetricKeys: z5.array(z5.never()).max(0),
  activeRelease: z5.null()
}).strict().meta({ id: "MpQueryContextResponse", "x-data-classification": "C1" });

// packages/contracts/src/http/routes.ts
var APP_CHECK_PROBLEMS = [
  "AUTHENTICATION_REQUIRED",
  "AUTHORIZATION_DENIED",
  "DEPENDENCY_UNAVAILABLE"
];
var AUTH_PROBLEMS = [...APP_CHECK_PROBLEMS, "AUTHORIZATION_VERSION_CHANGED"];
var ROUTES = [
  {
    method: "get",
    path: "/health/live",
    operationId: "getLiveness",
    surface: "common",
    auth: "none",
    responseSchema: "HealthPayload",
    problemCodes: [],
    classification: "C0",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/health/ready",
    operationId: "getReadiness",
    surface: "common",
    auth: "none",
    responseSchema: "HealthPayload",
    problemCodes: ["DEPENDENCY_UNAVAILABLE"],
    classification: "C0",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/system/reachability",
    operationId: "getReachability",
    surface: "common",
    auth: "none",
    responseSchema: "HealthPayload",
    problemCodes: [],
    classification: "C0",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/auth/return-states",
    operationId: "createReturnState",
    surface: "common",
    auth: "app-check",
    requestSchema: "ReturnStateRequest",
    responseSchema: "ReturnStateResponse",
    problemCodes: [...APP_CHECK_PROBLEMS, "RATE_LIMITED"],
    classification: "C4",
    retentionClass: "ephemeral-ticket"
  },
  {
    method: "get",
    path: "/v1/auth/session",
    operationId: "getAuthSession",
    surface: "common",
    auth: "identity",
    responseSchema: "SessionResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "session"
  },
  {
    method: "get",
    path: "/v1/auth/roles",
    operationId: "listRoles",
    surface: "common",
    auth: "identity",
    responseSchema: "SessionResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "session"
  },
  {
    method: "post",
    path: "/v1/auth/role-contexts",
    operationId: "selectRoleContext",
    surface: "common",
    auth: "identity",
    capability: "identity.role_context.select",
    requestSchema: "SelectRoleContextCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "MFA_REQUIRED"],
    classification: "C2",
    retentionClass: "command-receipt"
  },
  {
    method: "delete",
    path: "/v1/auth/role-contexts/{roleContextId}",
    operationId: "revokeRoleContext",
    surface: "common",
    auth: "identity",
    capability: "identity.role_context.select",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "command-receipt"
  },
  {
    method: "get",
    path: "/v1/farmer/bootstrap",
    operationId: "getFarmerBootstrap",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "FarmerBootstrapResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/consents",
    operationId: "listFarmerConsents",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "ConsentListResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/consent-decisions",
    operationId: "recordConsentDecision",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    requestSchema: "RecordConsentDecisionCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "consent"
  },
  {
    method: "get",
    path: "/v1/rsk/bootstrap",
    operationId: "getRskBootstrap",
    surface: "rsk",
    auth: "rsk",
    responseSchema: "RskBootstrapResponse",
    problemCodes: [...AUTH_PROBLEMS, "MFA_REQUIRED"],
    classification: "C1",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/rsk/access-grants",
    operationId: "issueRskAccessGrant",
    surface: "rsk",
    auth: "rsk",
    capability: "rsk.access_grant.issue",
    purpose: "assisted.service",
    requestSchema: "IssueAccessGrantCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED"],
    classification: "C2",
    retentionClass: "access-grant"
  },
  {
    method: "post",
    path: "/v1/rsk/protected-disclosures",
    operationId: "createRskProtectedDisclosure",
    surface: "rsk",
    auth: "rsk",
    capability: "rsk.protected_disclose",
    purpose: "assisted.service",
    requestSchema: "ProtectedDisclosureRequest",
    responseSchema: "ProtectedDisclosureResponse",
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED"],
    classification: "C3",
    retentionClass: "audit"
  },
  {
    method: "get",
    path: "/v1/mp/query-context",
    operationId: "getMpQueryContext",
    surface: "mp",
    auth: "mp",
    responseSchema: "MpQueryContextResponse",
    problemCodes: [...AUTH_PROBLEMS, "MFA_REQUIRED", "DEPENDENCY_UNAVAILABLE"],
    classification: "C1",
    retentionClass: "none"
  }
];

// packages/contracts/src/privacy/index.ts
import { z as z6 } from "zod";
var MpUnavailableResultSchema = z6.object({
  status: z6.literal("UNAVAILABLE"),
  reasonCode: z6.enum(["NO_ACTIVE_RELEASE", "RELEASE_INVALID", "RELEASE_STALE"])
}).strict().meta({ id: "MpUnavailableResult", "x-data-classification": "C1" });
var MpSuppressedResultSchema = z6.object({
  status: z6.literal("SUPPRESSED"),
  reasonCode: z6.enum(["COHORT_TOO_SMALL", "COMPLEMENTARY_SUPPRESSION", "STICKY_SUPPRESSION"]),
  methodologyId: z6.string().min(1).max(120)
}).strict().meta({ id: "MpSuppressedResult", "x-data-classification": "C1" });
var MpSafeResultSchema = z6.discriminatedUnion("status", [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema
]);

// packages/contracts/src/sync/index.ts
import { z as z7 } from "zod";
var SyncCommandEnvelopeSchema = z7.object({
  commandId: UuidSchema,
  clientEventIds: z7.array(UuidSchema).min(1).max(100),
  operation: z7.literal("RecordConsentDecision"),
  commandSchemaVersion: z7.literal(1),
  target: ConsentDecisionCommandTargetSchema,
  expectedRevision: RevisionSchema,
  occurredAt: TimestampSchema,
  timezone: z7.string().min(1).max(64),
  localSequence: z7.int().positive(),
  causalCommandIds: z7.array(UuidSchema).max(100),
  requestHash: Sha256DigestSchema,
  payload: ConsentDecisionPayloadSchema
}).strict().meta({ id: "SyncCommandEnvelope", "x-data-classification": "C2" });
var SyncBatchSchema = z7.object({
  syncBatchVersion: z7.literal(1),
  batchId: UuidSchema,
  streamId: UuidSchema,
  cursor: z7.string().min(1).max(2048),
  clientBuild: z7.string().min(1).max(80),
  commands: z7.array(SyncCommandEnvelopeSchema).max(100),
  feedLimit: z7.int().min(1).max(100)
}).strict().meta({ id: "SyncBatch", "x-data-classification": "C2" });
var SyncDispositionBaseSchema = z7.object({
  commandId: UuidSchema,
  clientEventIds: z7.array(UuidSchema).min(1).max(100),
  acknowledgementId: UuidSchema,
  serverReceivedAt: TimestampSchema
}).strict();
var SyncAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z7.literal("ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z7.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncAlreadyAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z7.literal("ALREADY_ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z7.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncRejectedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z7.literal("REJECTED"),
  problemCode: ProblemCodeSchema,
  authoritativeRevision: RevisionSchema.optional(),
  serverEventIds: z7.array(UuidV7Schema).max(0)
}).strict();
var SyncConflictDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z7.literal("CONFLICT"),
  problemCode: ProblemCodeSchema,
  conflictId: UuidSchema,
  authoritativeRevision: RevisionSchema,
  serverEventIds: z7.array(UuidV7Schema).max(0)
}).strict();
var SyncCommandDispositionSchema = z7.discriminatedUnion("disposition", [
  SyncAcceptedDispositionSchema,
  SyncAlreadyAcceptedDispositionSchema,
  SyncRejectedDispositionSchema,
  SyncConflictDispositionSchema
]).meta({ id: "SyncCommandDisposition", "x-data-classification": "C2" });
var SyncIntegrationEventSchema = MilestoneOneEventSchema;
var SyncProjectionDeltaSchema = z7.object({
  projectionType: z7.string().min(1).max(80),
  projectionId: UuidSchema,
  projectionSchemaVersion: z7.int().positive(),
  authoritativeRevision: RevisionSchema,
  changeType: z7.enum(["UPSERT", "TOMBSTONE"]),
  dataMode: DataModeSchema,
  payloadClassification: z7.enum(["C0", "C1", "C2"]),
  payload: JsonObjectSchema,
  payloadChecksum: Sha256DigestSchema
}).strict().meta({ id: "SyncProjectionDelta", "x-data-classification": "C2" });
var SyncFeedEventSchema = z7.object({
  feedEventId: UuidV7Schema,
  sequence: z7.int().positive(),
  integrationEvent: SyncIntegrationEventSchema,
  projectionDeltas: z7.array(SyncProjectionDeltaSchema).max(100)
}).strict().meta({ id: "SyncFeedEvent", "x-data-classification": "C2" });
var SyncBatchResponseSchema = z7.object({
  batchId: UuidSchema,
  dispositions: z7.array(SyncCommandDispositionSchema).max(100),
  feedEvents: z7.array(SyncFeedEventSchema).max(100),
  nextCursor: z7.string().min(1).max(2048),
  highWaterMark: z7.string().min(1).max(2048),
  hasMore: z7.boolean(),
  serverTime: TimestampSchema,
  authorizationVersion: z7.int().positive()
}).strict().meta({ id: "SyncBatchResponse", "x-data-classification": "C2" });

// packages/contracts/src/voice/index.ts
import { z as z8 } from "zod";
var VoiceDelegationSchema = z8.object({
  subjectId: UuidSchema,
  roleContextId: UuidSchema,
  roleType: RoleTypeSchema,
  purpose: PurposeCodeSchema,
  toolKey: z8.string().min(1).max(120),
  consentAccessVersion: z8.int().positive(),
  sessionId: UuidSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "VoiceDelegation", "x-data-classification": "C4" });
export {
  ACTOR_TYPES,
  AccessGrantCommandTargetSchema,
  AccessGrantPayloadSchema,
  ActorTypeSchema,
  AuthorizationContextSchema,
  CAPABILITY_KEYS,
  COMMAND_DISPOSITIONS,
  CONSENT_SCOPES,
  CONSENT_STATES,
  CapabilityKeySchema,
  ClientContextSchema,
  CommandDispositionSchema,
  CommandEnvelopeSchema,
  CommandResultSchema,
  CommandSchema,
  CommandTargetSchema,
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema,
  ConsentDecisionRecordedEventSchema,
  ConsentDecisionRecordedPayloadSchema,
  ConsentListResponseSchema,
  ConsentRecordSchema,
  ConsentScopeSchema,
  ConsentStateSchema,
  DATA_CLASSIFICATIONS,
  DATA_MODES,
  DataClassificationSchema,
  DataModeSchema,
  DeviceBatchReceiptSchema,
  EVENT_CLASSES,
  EventEnvelopeSchema,
  EventNameSchema,
  FarmerBootstrapResponseSchema,
  FieldErrorSchema,
  HealthPayloadSchema,
  HealthStatusSchema,
  IssueAccessGrantCommandSchema,
  JsonObjectSchema,
  JsonValueSchema,
  MilestoneOneEventSchema,
  MpQueryContextResponseSchema,
  MpSafeResultSchema,
  MpSuppressedResultSchema,
  MpUnavailableResultSchema,
  PROBLEM_CODES,
  PROVENANCE_TYPES,
  PURPOSE_CODES,
  ProblemCodeSchema,
  ProblemDetailsSchema,
  ProtectedDisclosureRequestSchema,
  ProtectedDisclosureResponseSchema,
  ProvenanceTypeSchema,
  PurposeCodeSchema,
  ROLE_TYPES,
  ROUTES,
  RecordConsentDecisionCommandSchema,
  ReturnStateRequestSchema,
  ReturnStateResponseSchema,
  RevisionSchema,
  RoleContextCommandTargetSchema,
  RoleContextCreatedEventSchema,
  RoleContextCreatedPayloadSchema,
  RoleContextResponseSchema,
  RoleContextRevokedEventSchema,
  RoleContextRevokedPayloadSchema,
  RoleSummarySchema,
  RoleTypeSchema,
  RskBootstrapResponseSchema,
  SelectRoleContextCommandSchema,
  SelectRoleContextPayloadSchema,
  SessionResponseSchema,
  Sha256DigestSchema,
  SyncBatchResponseSchema,
  SyncBatchSchema,
  SyncCommandDispositionSchema,
  SyncCommandEnvelopeSchema,
  SyncFeedEventSchema,
  SyncIntegrationEventSchema,
  SyncProjectionDeltaSchema,
  TimestampSchema,
  TraceIdSchema,
  UnavailableSchema,
  UuidSchema,
  UuidV7Schema,
  VoiceDelegationSchema
};
