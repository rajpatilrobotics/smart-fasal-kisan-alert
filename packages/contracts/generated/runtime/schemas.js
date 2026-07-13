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
var DEVICE_MODES = ["PERSONAL", "TRUSTED_FAMILY", "RSK_ASSISTED"];
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
var SyncLifecyclePayloadSchema = z4.object({
  streamId: UuidSchema,
  batchId: UuidSchema.optional(),
  commandId: UuidSchema.optional(),
  conflictId: UuidSchema.optional(),
  disposition: z4.enum(["ACCEPTED", "ALREADY_ACCEPTED", "REJECTED", "CONFLICT"]).optional()
}).strict();
var SyncLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.enum([
    "sync.batch_started",
    "sync.event_accepted",
    "sync.event_already_accepted",
    "sync.event_rejected",
    "sync.conflict_detected",
    "sync.conflict_resolved"
  ]),
  payloadClassification: z4.literal("C2"),
  payload: SyncLifecyclePayloadSchema
}).strict();
var MediaUploadVerifiedPayloadSchema = z4.object({
  assetId: UuidSchema,
  derivativeId: UuidSchema,
  purpose: z4.enum([
    "CROP_HEALTH_IMAGE",
    "DIARY_MEDIA",
    "RSK_VISIT_EVIDENCE",
    "SENSOR_MAINTENANCE_EVIDENCE",
    "VOICE_OFFLINE_AUDIO"
  ]),
  sourceChecksum: Sha256DigestSchema,
  derivativeChecksum: Sha256DigestSchema,
  scannerVersion: z4.string().min(1).max(80)
}).strict();
var MediaUploadVerifiedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.literal("media.upload_verified"),
  payloadClassification: z4.literal("C2"),
  payload: MediaUploadVerifiedPayloadSchema
}).strict();
var VoiceLifecyclePayloadSchema = z4.object({
  sessionId: UuidSchema,
  proposalId: UuidSchema.optional(),
  offlineAudioRefId: UuidSchema.optional(),
  lifecycleState: z4.string().min(1).max(80),
  payloadHash: Sha256DigestSchema.optional(),
  detailCode: z4.string().min(1).max(80).optional()
}).strict();
var VoiceLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z4.enum([
    "voice.session_started",
    "voice.session_ended",
    "voice.intent_recognized",
    "voice.clarification_requested",
    "voice.proposal_created",
    "voice.proposal_cancelled",
    "voice.proposal_confirmed",
    "voice.proposal_corrected",
    "voice.proposal_expired",
    "voice.proposal_superseded",
    "voice.provider_failed",
    "voice.offline_audio_attached",
    "voice.offline_audio_transcription_started",
    "voice.offline_audio_needs_confirmation",
    "voice.offline_audio_declined",
    "voice.offline_audio_deleted"
  ]),
  payloadClassification: z4.enum(["C2", "C3"]),
  payload: VoiceLifecyclePayloadSchema
}).strict();
var MilestoneTwoEventSchema = z4.union([
  MilestoneOneEventSchema,
  SyncLifecycleEventSchema,
  MediaUploadVerifiedEventSchema,
  VoiceLifecycleEventSchema
]).meta({ id: "MilestoneTwoEvent", "x-data-classification": "C3" });

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
  },
  {
    method: "post",
    path: "/v1/sync/streams",
    operationId: "openFarmerSyncStream",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    requestSchema: "SyncStreamOpenRequest",
    responseSchema: "SyncStreamOpenResponse",
    problemCodes: [...AUTH_PROBLEMS, "DEVICE_BINDING_MISMATCH", "SYNC_SCHEMA_UNSUPPORTED"],
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "post",
    path: "/v1/sync/bootstrap",
    operationId: "bootstrapFarmerSync",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    requestSchema: "SyncBootstrapRequest",
    responseSchema: "SyncBootstrapResponse",
    problemCodes: [...AUTH_PROBLEMS, "SYNC_SCHEMA_UNSUPPORTED", "SYNC_CURSOR_INVALID"],
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "post",
    path: "/v1/sync/batches",
    operationId: "syncFarmerBatch",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    requestSchema: "SyncBatch",
    responseSchema: "SyncBatchResponseV2",
    problemCodes: [
      ...AUTH_PROBLEMS,
      "SYNC_BATCH_ID_REUSED",
      "SYNC_CURSOR_INVALID",
      "SYNC_BOOTSTRAP_REQUIRED",
      "SYNC_SCHEMA_UNSUPPORTED"
    ],
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "get",
    path: "/v1/sync/feed",
    operationId: "getFarmerSyncFeed",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "SyncFeedPageResponseV2",
    queryParameters: [
      {
        name: "streamId",
        description: "Current Farmer sync stream identifier",
        required: true,
        schema: { type: "string", format: "uuid" }
      },
      {
        name: "cursor",
        description: "Opaque cursor bound to the current stream and authorization",
        required: true,
        schema: { type: "string", minLength: 1, maxLength: 2048 }
      },
      {
        name: "limit",
        description: "Maximum number of feed items to return",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100, default: 100 }
      }
    ],
    problemCodes: [
      ...AUTH_PROBLEMS,
      "SYNC_CURSOR_INVALID",
      "SYNC_CURSOR_EXPIRED",
      "SYNC_BOOTSTRAP_REQUIRED"
    ],
    classification: "C2",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/sync/commands/{commandId}",
    operationId: "getFarmerSyncCommand",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "SyncCommandStatusResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "command-receipt"
  },
  {
    method: "get",
    path: "/v1/sync/conflicts",
    operationId: "listFarmerSyncConflicts",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "SyncConflictListResponse",
    problemCodes: AUTH_PROBLEMS,
    queryParameters: [
      {
        name: "cursor",
        description: "Opaque cursor for the next authorized conflict page",
        required: false,
        schema: { type: "string", minLength: 1, maxLength: 2048 }
      },
      {
        name: "limit",
        description: "Maximum number of conflicts to return",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100, default: 100 }
      }
    ],
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "get",
    path: "/v1/sync/conflicts/{conflictId}",
    operationId: "getFarmerSyncConflict",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "SyncConflict",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "post",
    path: "/v1/sync/conflicts/{conflictId}/resolutions",
    operationId: "resolveFarmerSyncConflict",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    requestSchema: "SyncConflictResolutionRequest",
    responseSchema: "SyncCommandStatusResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "INVALID_STATE_TRANSITION"],
    classification: "C2",
    retentionClass: "offline-compatibility"
  },
  {
    method: "post",
    path: "/v1/media/upload-intents",
    operationId: "createMediaUploadIntent",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "CreateMediaUploadIntentRequest",
    success: [
      {
        status: 201,
        description: "One-time quarantine upload initiation",
        mediaType: "json",
        responseSchema: "CreateMediaUploadIntentResponse"
      }
    ],
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED", "RATE_LIMITED"],
    classification: "C4",
    retentionClass: "media-quarantine"
  },
  {
    method: "post",
    path: "/v1/media/upload-intents/{intentId}:finalize",
    operationId: "finalizeMediaUploadIntent",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "FinalizeMediaUploadIntentRequest",
    success: [
      {
        status: 202,
        description: "Verification accepted",
        mediaType: "json",
        responseSchema: "MediaOperationAcceptedResponse"
      }
    ],
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "CONSENT_OR_ACCESS_VERSION_CHANGED",
      "MEDIA_INTEGRITY_MISMATCH",
      "UPLOAD_INTENT_EXPIRED"
    ],
    classification: "C3",
    retentionClass: "media-quarantine"
  },
  {
    method: "get",
    path: "/v1/media/assets/{assetId}/status",
    operationId: "getMediaAssetStatus",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    responseSchema: "MediaAssetStatusResponse",
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED"],
    classification: "C2",
    retentionClass: "none"
  },
  {
    method: "delete",
    path: "/v1/media/upload-intents/{intentId}",
    operationId: "cancelMediaUploadIntent",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    responseSchema: "CancelMediaUploadIntentResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "INVALID_STATE_TRANSITION"],
    classification: "C2",
    retentionClass: "media-quarantine"
  },
  {
    method: "get",
    path: "/v1/media/attachments/{attachmentId}/content",
    operationId: "streamMediaAttachment",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    rangeRequest: "single-byte",
    success: [
      { status: 200, description: "Complete generation-pinned attachment", mediaType: "binary" },
      { status: 206, description: "Single authorized byte range", mediaType: "binary" }
    ],
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED", "MEDIA_NOT_VERIFIED"],
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/internal/v1/media/assets/{assetId}:scan",
    operationId: "scanMediaAsset",
    surface: "internal",
    auth: "internal",
    requestSchema: "ScanMediaAssetRequest",
    success: [
      {
        status: 202,
        description: "Scan claimed by the media scanner",
        mediaType: "json",
        responseSchema: "MediaOperationAcceptedResponse"
      }
    ],
    problemCodes: [
      "AUTHENTICATION_REQUIRED",
      "AUTHORIZATION_DENIED",
      "DEPENDENCY_UNAVAILABLE",
      "MEDIA_INTEGRITY_MISMATCH"
    ],
    classification: "C3",
    retentionClass: "media-quarantine"
  },
  {
    method: "post",
    path: "/v1/voice/sessions",
    operationId: "createVoiceSession",
    surface: "voice",
    auth: "identity",
    roleContext: "required",
    requestSchema: "CreateVoiceSessionRequest",
    success: [
      {
        status: 201,
        description: "Bound one-time voice ticket",
        mediaType: "json",
        responseSchema: "CreateVoiceSessionResponse"
      }
    ],
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "RATE_LIMITED"],
    classification: "C4",
    retentionClass: "voice-session"
  },
  {
    method: "get",
    path: "/v1/realtime",
    operationId: "openVoiceRealtime",
    surface: "voice",
    auth: "voice-ticket",
    roleContext: "none",
    success: [
      { status: 101, description: "sfka.voice.v1 WebSocket upgrade", mediaType: "websocket" }
    ],
    problemCodes: [...AUTH_PROBLEMS, "RATE_LIMITED"],
    classification: "C4",
    retentionClass: "ephemeral-ticket"
  },
  {
    method: "post",
    path: "/v1/voice/sessions/{sessionId}/turns",
    operationId: "createVoiceTurn",
    surface: "voice",
    auth: "identity",
    roleContext: "required",
    requestSchema: "VoiceTurnRequest",
    responseSchema: "VoiceTurnResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "DEPENDENCY_UNAVAILABLE"],
    classification: "C4",
    retentionClass: "voice-session"
  },
  {
    method: "get",
    path: "/v1/voice/proposals/{proposalId}",
    operationId: "getVoiceProposal",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    responseSchema: "VoiceProposalResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "voice-proposal"
  },
  {
    method: "post",
    path: "/v1/voice/proposals/{proposalId}:confirm",
    operationId: "confirmVoiceProposal",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "ConfirmVoiceProposalRequest",
    responseSchema: "VoiceCommandStatusResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "VOICE_PROPOSAL_EXPIRED", "VOICE_PROPOSAL_HASH_MISMATCH"],
    classification: "C3",
    retentionClass: "command-receipt"
  },
  {
    method: "post",
    path: "/v1/voice/proposals/{proposalId}:correct",
    operationId: "correctVoiceProposal",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "CorrectVoiceProposalRequest",
    responseSchema: "VoiceProposalResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "VOICE_PROPOSAL_EXPIRED"],
    classification: "C3",
    retentionClass: "voice-proposal"
  },
  {
    method: "post",
    path: "/v1/voice/proposals/{proposalId}:cancel",
    operationId: "cancelVoiceProposal",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "CancelVoiceProposalRequest",
    responseSchema: "VoiceProposalResponse",
    command: { idempotency: true, expectedRevision: false },
    problemCodes: [...AUTH_PROBLEMS, "VOICE_PROPOSAL_EXPIRED"],
    classification: "C2",
    retentionClass: "voice-proposal"
  },
  {
    method: "get",
    path: "/v1/commands/{commandId}",
    operationId: "getVoiceCommandStatus",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    responseSchema: "VoiceCommandStatusResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "command-receipt"
  },
  {
    method: "post",
    path: "/v1/voice/offline-audio",
    operationId: "attachVoiceOfflineAudio",
    surface: "operational",
    auth: "identity",
    roleContext: "required",
    requestSchema: "AttachOfflineAudioRequest",
    responseSchema: "AttachOfflineAudioResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED", "MEDIA_NOT_VERIFIED"],
    classification: "C3",
    retentionClass: "voice-offline-audio"
  }
];

// packages/contracts/src/media/index.ts
import { z as z6 } from "zod";
var MediaPurposeSchema = z6.enum([
  "CROP_HEALTH_IMAGE",
  "DIARY_MEDIA",
  "RSK_VISIT_EVIDENCE",
  "SENSOR_MAINTENANCE_EVIDENCE",
  "VOICE_OFFLINE_AUDIO"
]);
var MediaOwnerContextSchema = z6.discriminatedUnion("ownerType", [
  z6.object({ ownerType: z6.literal("HEALTH_REPORT"), ownerId: UuidSchema }).strict(),
  z6.object({ ownerType: z6.literal("DIARY_ENTRY"), ownerId: UuidSchema }).strict(),
  z6.object({ ownerType: z6.literal("RSK_VISIT"), ownerId: UuidSchema }).strict(),
  z6.object({ ownerType: z6.literal("SENSOR_MAINTENANCE"), ownerId: UuidSchema }).strict(),
  z6.object({ ownerType: z6.literal("VOICE_SESSION"), ownerId: UuidSchema }).strict()
]);
var MediaVerificationStateSchema = z6.enum([
  "INTENT_ISSUED",
  "UPLOADED_UNVERIFIED",
  "SCANNING",
  "VERIFIED",
  "ATTACHED",
  "FAILED_RETRYABLE",
  "REJECTED",
  "EXPIRED",
  "CANCELLED"
]);
var MediaFailureCodeSchema = z6.enum([
  "GENERATION_MISMATCH",
  "SIZE_MISMATCH",
  "CHECKSUM_MISMATCH",
  "MIME_MISMATCH",
  "UNSUPPORTED_CODEC",
  "DECODER_REJECTED",
  "POLYGLOT_REJECTED",
  "MALWARE_REJECTED",
  "DIMENSION_LIMIT_EXCEEDED",
  "DURATION_LIMIT_EXCEEDED",
  "CONSENT_OR_ACCESS_VERSION_CHANGED"
]);
var CreateMediaUploadIntentRequestSchema = z6.object({
  mediaProtocolVersion: z6.literal(1),
  purpose: MediaPurposeSchema,
  owner: MediaOwnerContextSchema,
  expectedSha256: Sha256DigestSchema,
  claimedMimeType: z6.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/webm;codecs=opus",
    "audio/wav"
  ]),
  declaredSizeBytes: z6.int().positive().max(15 * 1024 * 1024),
  declaredWidth: z6.int().positive().max(16384).optional(),
  declaredHeight: z6.int().positive().max(16384).optional(),
  declaredDurationSeconds: z6.number().positive().max(120).optional(),
  consentAccessVersion: z6.int().positive()
}).strict().superRefine((value, ctx) => {
  const expectedOwnerType = {
    CROP_HEALTH_IMAGE: "HEALTH_REPORT",
    DIARY_MEDIA: "DIARY_ENTRY",
    RSK_VISIT_EVIDENCE: "RSK_VISIT",
    SENSOR_MAINTENANCE_EVIDENCE: "SENSOR_MAINTENANCE",
    VOICE_OFFLINE_AUDIO: "VOICE_SESSION"
  }[value.purpose];
  if (value.owner.ownerType !== expectedOwnerType) {
    ctx.addIssue({
      code: "custom",
      path: ["owner", "ownerType"],
      message: "Owner type does not match media purpose."
    });
  }
  const imagePurpose = value.purpose !== "VOICE_OFFLINE_AUDIO";
  const imageMime = value.claimedMimeType.startsWith("image/");
  if (imagePurpose !== imageMime) {
    ctx.addIssue({
      code: "custom",
      path: ["claimedMimeType"],
      message: "MIME type does not match media purpose."
    });
  }
  const maximumBytes = value.purpose === "CROP_HEALTH_IMAGE" || value.purpose === "DIARY_MEDIA" || value.purpose === "VOICE_OFFLINE_AUDIO" ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
  if (value.declaredSizeBytes > maximumBytes) {
    ctx.addIssue({
      code: "custom",
      path: ["declaredSizeBytes"],
      message: "Declared size exceeds the purpose limit."
    });
  }
  if (imagePurpose) {
    if (value.declaredWidth === void 0 || value.declaredHeight === void 0) {
      ctx.addIssue({
        code: "custom",
        path: ["declaredWidth"],
        message: "Image dimensions are required."
      });
    }
    if (value.declaredDurationSeconds !== void 0) {
      ctx.addIssue({
        code: "custom",
        path: ["declaredDurationSeconds"],
        message: "Images cannot declare audio duration."
      });
    }
  } else if (value.declaredWidth !== void 0 || value.declaredHeight !== void 0) {
    ctx.addIssue({
      code: "custom",
      path: ["declaredWidth"],
      message: "Audio cannot declare image dimensions."
    });
  }
}).meta({ id: "CreateMediaUploadIntentRequest", "x-data-classification": "C3" });
var CreateMediaUploadIntentResponseSchema = z6.object({
  intentId: UuidSchema,
  assetId: UuidSchema,
  state: z6.literal("INTENT_ISSUED"),
  resumableUploadUri: z6.string().url().max(4096),
  generationPrecondition: z6.string().regex(/^[0-9]+$/),
  expiresAt: TimestampSchema
}).strict().meta({ id: "CreateMediaUploadIntentResponse", "x-data-classification": "C4" });
var FinalizeMediaUploadIntentRequestSchema = z6.object({
  objectGeneration: z6.string().regex(/^[0-9]+$/),
  sha256: Sha256DigestSchema,
  finalSizeBytes: z6.int().positive().max(15 * 1024 * 1024)
}).strict().meta({ id: "FinalizeMediaUploadIntentRequest", "x-data-classification": "C3" });
var MediaOperationAcceptedResponseSchema = z6.object({
  operationId: UuidSchema,
  assetId: UuidSchema,
  state: z6.literal("SCANNING"),
  acceptedAt: TimestampSchema
}).strict().meta({ id: "MediaOperationAcceptedResponse", "x-data-classification": "C2" });
var MediaAssetStatusResponseSchema = z6.object({
  assetId: UuidSchema,
  purpose: MediaPurposeSchema,
  state: MediaVerificationStateSchema,
  revision: z6.int().nonnegative(),
  failureCode: MediaFailureCodeSchema.optional(),
  verifiedMimeType: z6.string().min(1).max(120).optional(),
  verifiedSizeBytes: z6.int().positive().optional(),
  derivativeSha256: Sha256DigestSchema.optional(),
  updatedAt: TimestampSchema
}).strict().meta({ id: "MediaAssetStatusResponse", "x-data-classification": "C2" });
var CancelMediaUploadIntentResponseSchema = z6.object({
  intentId: UuidSchema,
  state: z6.literal("CANCELLED"),
  cancelledAt: TimestampSchema
}).strict().meta({ id: "CancelMediaUploadIntentResponse", "x-data-classification": "C2" });
var ScanMediaAssetRequestSchema = z6.object({
  scanRequestVersion: z6.literal(1),
  assetId: UuidSchema,
  storageEventId: UuidSchema
}).strict().meta({ id: "ScanMediaAssetRequest", "x-data-classification": "C1" });
var AttachOfflineAudioRequestSchema = z6.object({
  assetId: UuidSchema,
  localCaptureId: UuidSchema,
  language: z6.enum(["mr", "hi", "en"]),
  sessionId: UuidSchema,
  audioConsentVersion: z6.int().positive(),
  expectedSessionRevision: z6.int().nonnegative()
}).strict().meta({ id: "AttachOfflineAudioRequest", "x-data-classification": "C3" });
var AttachOfflineAudioResponseSchema = z6.object({
  offlineAudioRefId: UuidSchema,
  attachmentId: UuidSchema,
  state: z6.literal("TRANSCRIPTION_PENDING"),
  expiresAt: TimestampSchema
}).strict().meta({ id: "AttachOfflineAudioResponse", "x-data-classification": "C3" });

// packages/contracts/src/privacy/index.ts
import { z as z7 } from "zod";
var MpUnavailableResultSchema = z7.object({
  status: z7.literal("UNAVAILABLE"),
  reasonCode: z7.enum(["NO_ACTIVE_RELEASE", "RELEASE_INVALID", "RELEASE_STALE"])
}).strict().meta({ id: "MpUnavailableResult", "x-data-classification": "C1" });
var MpSuppressedResultSchema = z7.object({
  status: z7.literal("SUPPRESSED"),
  reasonCode: z7.enum(["COHORT_TOO_SMALL", "COMPLEMENTARY_SUPPRESSION", "STICKY_SUPPRESSION"]),
  methodologyId: z7.string().min(1).max(120)
}).strict().meta({ id: "MpSuppressedResult", "x-data-classification": "C1" });
var MpSafeResultSchema = z7.discriminatedUnion("status", [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema
]);

// packages/contracts/src/sync/index.ts
import { z as z8 } from "zod";
var DeviceModeSchema = z8.enum(DEVICE_MODES).meta({
  id: "DeviceMode",
  "x-data-classification": "C1"
});
var SchemaVersionRangeSchema = z8.object({ minimum: z8.int().positive(), maximum: z8.int().positive() }).strict().refine((range) => range.minimum <= range.maximum, { message: "Invalid version range" });
var SyncStreamOpenRequestSchema = z8.object({
  streamProtocolVersion: z8.literal(1),
  clientBuild: z8.string().min(1).max(80),
  localDatabaseSchemaVersion: z8.int().positive(),
  stakeholder: z8.literal("FARMER").optional(),
  deviceMode: DeviceModeSchema,
  commandVersions: SchemaVersionRangeSchema,
  clientEventVersions: SchemaVersionRangeSchema,
  projectionVersions: SchemaVersionRangeSchema,
  mediaVersions: SchemaVersionRangeSchema,
  priorStreamId: UuidSchema.optional(),
  priorCursor: z8.string().min(1).max(2048).optional()
}).strict().meta({ id: "SyncStreamOpenRequest", "x-data-classification": "C2" });
var SyncStreamOpenResponseSchema = z8.object({
  streamId: UuidSchema,
  subjectDeviceBindingId: UuidSchema,
  stakeholder: z8.literal("FARMER"),
  scope: z8.literal("FARMER_SELF_SERVICE"),
  authorizationVersion: z8.int().positive(),
  acceptedCommandVersions: SchemaVersionRangeSchema,
  acceptedClientEventVersions: SchemaVersionRangeSchema,
  acceptedProjectionVersions: SchemaVersionRangeSchema,
  acceptedMediaVersions: SchemaVersionRangeSchema,
  maximumBatchCommands: z8.int().min(1).max(100),
  maximumBatchBytes: z8.int().min(1).max(524288),
  serverTime: TimestampSchema,
  serverTimeSignature: z8.string().min(16).max(2048),
  cursor: z8.string().min(1).max(2048),
  bootstrapRequired: z8.boolean()
}).strict().meta({ id: "SyncStreamOpenResponse", "x-data-classification": "C2" });
var SyncCommandEnvelopeSchema = z8.object({
  commandId: UuidSchema,
  clientEventIds: z8.array(UuidSchema).min(1).max(100),
  operation: z8.literal("RecordConsentDecision"),
  commandSchemaVersion: z8.literal(1),
  target: ConsentDecisionCommandTargetSchema,
  expectedRevision: RevisionSchema,
  occurredAt: TimestampSchema,
  timezone: z8.string().min(1).max(64),
  localSequence: z8.int().positive(),
  causalCommandIds: z8.array(UuidSchema).max(100),
  requestHash: Sha256DigestSchema,
  payload: ConsentDecisionPayloadSchema
}).strict().meta({ id: "SyncCommandEnvelope", "x-data-classification": "C2" });
var SyncBatchSchema = z8.object({
  syncBatchVersion: z8.literal(1),
  batchId: UuidSchema,
  streamId: UuidSchema,
  cursor: z8.string().min(1).max(2048),
  clientBuild: z8.string().min(1).max(80),
  commands: z8.array(SyncCommandEnvelopeSchema).max(100),
  feedLimit: z8.int().min(1).max(100)
}).strict().meta({ id: "SyncBatch", "x-data-classification": "C2" });
var SyncDispositionBaseSchema = z8.object({
  commandId: UuidSchema,
  clientEventIds: z8.array(UuidSchema).min(1).max(100),
  acknowledgementId: UuidSchema,
  serverReceivedAt: TimestampSchema
});
var SyncAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z8.literal("ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z8.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncAlreadyAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z8.literal("ALREADY_ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z8.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncRejectedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z8.literal("REJECTED"),
  problemCode: ProblemCodeSchema,
  authoritativeRevision: RevisionSchema.optional(),
  serverEventIds: z8.array(UuidV7Schema).max(0)
}).strict();
var SyncConflictDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z8.literal("CONFLICT"),
  problemCode: ProblemCodeSchema,
  conflictId: UuidSchema,
  authoritativeRevision: RevisionSchema,
  serverEventIds: z8.array(UuidV7Schema).max(0)
}).strict();
var SyncCommandDispositionSchema = z8.discriminatedUnion("disposition", [
  SyncAcceptedDispositionSchema,
  SyncAlreadyAcceptedDispositionSchema,
  SyncRejectedDispositionSchema,
  SyncConflictDispositionSchema
]).meta({ id: "SyncCommandDisposition", "x-data-classification": "C2" });
var SyncIntegrationEventSchema = MilestoneOneEventSchema;
var SyncIntegrationEventV2Schema = MilestoneTwoEventSchema;
var SyncProjectionDeltaSchema = z8.object({
  projectionType: z8.string().min(1).max(80),
  projectionId: UuidSchema,
  projectionSchemaVersion: z8.int().positive(),
  authoritativeRevision: RevisionSchema,
  changeType: z8.enum(["UPSERT", "TOMBSTONE"]),
  dataMode: DataModeSchema,
  payloadClassification: z8.enum(["C0", "C1", "C2"]),
  payload: JsonObjectSchema,
  payloadChecksum: Sha256DigestSchema
}).strict().meta({ id: "SyncProjectionDelta", "x-data-classification": "C2" });
var SyncFeedEventSchema = z8.object({
  feedEventId: UuidV7Schema,
  sequence: z8.int().positive(),
  integrationEvent: SyncIntegrationEventSchema,
  projectionDeltas: z8.array(SyncProjectionDeltaSchema).max(100)
}).strict().meta({ id: "SyncFeedEvent", "x-data-classification": "C2" });
var SyncFeedEventV2Schema = SyncFeedEventSchema.extend({
  integrationEvent: SyncIntegrationEventV2Schema
}).strict().meta({ id: "SyncFeedEventV2", "x-data-classification": "C3" });
var SyncBatchResponseSchema = z8.object({
  batchId: UuidSchema,
  dispositions: z8.array(SyncCommandDispositionSchema).max(100),
  feedEvents: z8.array(SyncFeedEventSchema).max(100),
  nextCursor: z8.string().min(1).max(2048),
  highWaterMark: z8.string().min(1).max(2048),
  hasMore: z8.boolean(),
  serverTime: TimestampSchema,
  authorizationVersion: z8.int().positive()
}).strict().meta({ id: "SyncBatchResponse", "x-data-classification": "C2" });
var SyncBatchResponseV2Schema = SyncBatchResponseSchema.extend({
  feedEvents: z8.array(SyncFeedEventV2Schema).max(100)
}).strict().meta({ id: "SyncBatchResponseV2", "x-data-classification": "C3" });
var SyncBootstrapRequestSchema = z8.object({
  bootstrapVersion: z8.literal(1),
  streamId: UuidSchema,
  localDatabaseSchemaVersion: z8.int().positive(),
  supportedProjectionVersions: SchemaVersionRangeSchema
}).strict().meta({ id: "SyncBootstrapRequest", "x-data-classification": "C2" });
var SyncTombstoneSchema = z8.object({
  projectionType: z8.string().min(1).max(80),
  projectionId: UuidSchema,
  deletionEpoch: z8.int().positive(),
  minimumResurrectionRevision: RevisionSchema
}).strict();
var SyncBootstrapResponseSchema = z8.object({
  streamId: UuidSchema,
  snapshotSchemaVersion: z8.int().positive(),
  snapshotChecksum: Sha256DigestSchema,
  generatedAt: TimestampSchema,
  expiresAt: TimestampSchema,
  projections: z8.array(SyncProjectionDeltaSchema).max(5e3),
  tombstones: z8.array(SyncTombstoneSchema).max(5e3),
  highWaterMark: z8.string().min(1).max(2048),
  cursor: z8.string().min(1).max(2048),
  authorizationVersion: z8.int().positive()
}).strict().meta({ id: "SyncBootstrapResponse", "x-data-classification": "C2" });
var SyncFeedPageResponseSchema = SyncBatchResponseSchema.omit({
  batchId: true,
  dispositions: true
}).meta({ id: "SyncFeedPageResponse", "x-data-classification": "C2" });
var SyncFeedPageResponseV2Schema = SyncBatchResponseV2Schema.omit({
  batchId: true,
  dispositions: true
}).meta({ id: "SyncFeedPageResponseV2", "x-data-classification": "C3" });
var SyncCommandStatusResponseSchema = z8.object({ command: SyncCommandDispositionSchema }).strict().meta({ id: "SyncCommandStatusResponse", "x-data-classification": "C2" });
var SyncConflictTypeSchema = z8.enum([
  "EXPECTED_REVISION_MISMATCH",
  "DUPLICATE_LOGICAL_ACTION",
  "CONCURRENT_MUTABLE_FIELD",
  "TASK_ACTUAL_VS_PLAN_CHANGE",
  "CROP_STAGE_DISAGREEMENT",
  "TOMBSTONED_ENTITY",
  "ASSIGNMENT_CHANGED",
  "CONSENT_OR_ACCESS_VERSION_CHANGED",
  "CLOCK_UNTRUSTED",
  "MEDIA_INTEGRITY_MISMATCH",
  "SCHEMA_REQUIRES_MIGRATION"
]);
var SyncConflictSchema = z8.object({
  conflictId: UuidSchema,
  conflictType: SyncConflictTypeSchema,
  revision: RevisionSchema,
  commandId: UuidSchema,
  clientEventIds: z8.array(UuidSchema).min(1).max(100),
  targetType: z8.string().min(1).max(80),
  targetId: UuidSchema,
  localRevision: RevisionSchema,
  authoritativeRevision: RevisionSchema,
  localSummary: JsonObjectSchema,
  authoritativeSummary: JsonObjectSchema,
  allowedActions: z8.array(z8.enum(["CREATE_NEW_COMMAND", "KEEP_BOTH_FACTS", "DISCARD_LOCAL_PROPOSAL"])).min(1).max(3),
  state: z8.enum(["OPEN", "RESOLUTION_PENDING", "RESOLVED", "LOCKED_RECOVERY"]),
  createdAt: TimestampSchema
}).strict().meta({ id: "SyncConflict", "x-data-classification": "C2" });
var SyncConflictListResponseSchema = z8.object({
  conflicts: z8.array(SyncConflictSchema).max(100),
  nextCursor: z8.string().max(2048).optional()
}).strict().meta({ id: "SyncConflictListResponse", "x-data-classification": "C2" });
var SyncConflictResolutionRequestSchema = z8.object({
  resolutionSchemaVersion: z8.literal(1),
  conflictId: UuidSchema,
  expectedConflictRevision: RevisionSchema,
  action: z8.enum(["CREATE_NEW_COMMAND", "KEEP_BOTH_FACTS", "DISCARD_LOCAL_PROPOSAL"]),
  resolutionCommandId: UuidSchema,
  payloadHash: Sha256DigestSchema
}).strict().meta({ id: "SyncConflictResolutionRequest", "x-data-classification": "C2" });

// packages/contracts/src/voice/index.ts
import { z as z9 } from "zod";
var VoiceLanguageSchema = z9.enum(["mr", "hi", "en"]);
var VoiceSessionStateSchema = z9.enum(["CREATED", "READY", "RECONNECTING", "EXPIRING", "CLOSED", "UNAVAILABLE"]);
var VoiceDelegationSchema = z9.object({
  subjectId: UuidSchema,
  roleContextId: UuidSchema,
  roleType: RoleTypeSchema,
  purpose: PurposeCodeSchema,
  toolKey: z9.string().min(1).max(120),
  consentAccessVersion: z9.int().positive(),
  sessionId: UuidSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "VoiceDelegation", "x-data-classification": "C4" });
var CreateVoiceSessionRequestSchema = z9.object({
  protocolVersion: z9.literal(1),
  language: VoiceLanguageSchema,
  visualRoute: z9.string().min(1).max(240).regex(/^\//),
  contextIds: z9.array(UuidSchema).max(8),
  audioCapabilities: z9.object({ realtime: z9.boolean(), httpsAudio: z9.boolean(), offlineAudio: z9.boolean() }).strict()
}).strict().meta({ id: "CreateVoiceSessionRequest", "x-data-classification": "C2" });
var CreateVoiceSessionResponseSchema = z9.object({
  sessionId: UuidSchema,
  state: z9.literal("CREATED"),
  websocketEndpoint: z9.string().url().refine((value) => value.startsWith("wss://")),
  singleUseTicket: z9.string().regex(/^[A-Za-z0-9_-]{32,512}$/),
  ticketExpiresAt: TimestampSchema,
  sessionExpiresAt: TimestampSchema,
  protocolVersion: z9.literal(1),
  httpsTurnsEndpoint: z9.string().min(1).max(512)
}).strict().meta({ id: "CreateVoiceSessionResponse", "x-data-classification": "C4" });
var VoiceTurnRequestSchema = z9.object({
  turnId: UuidSchema,
  input: z9.discriminatedUnion("type", [
    z9.object({ type: z9.literal("TEXT"), text: z9.string().min(1).max(2e3) }).strict(),
    z9.object({
      type: z9.literal("AUDIO"),
      mimeType: z9.enum(["audio/webm;codecs=opus", "audio/wav"]),
      sha256: Sha256DigestSchema,
      bytesBase64: z9.string().min(4).max(35e4)
    }).strict()
  ]),
  clientSequence: z9.int().positive(),
  acknowledgedServerSequence: z9.int().nonnegative()
}).strict().meta({ id: "VoiceTurnRequest", "x-data-classification": "C4" });
var VoiceTurnResponseSchema = z9.object({
  turnId: UuidSchema,
  sessionId: UuidSchema,
  state: z9.enum(["HELP", "UNAVAILABLE", "NEEDS_CLARIFICATION", "PROPOSAL_PENDING"]),
  messageKey: z9.string().min(1).max(120),
  proposalId: UuidSchema.optional(),
  serverSequence: z9.int().positive(),
  acknowledgedClientSequence: z9.int().nonnegative()
}).strict().meta({ id: "VoiceTurnResponse", "x-data-classification": "C2" });
var VoiceProposalStateSchema = z9.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "SUPERSEDED",
  "EXPIRED",
  "EXECUTING",
  "COMPLETE",
  "FAILED"
]);
var VoiceProposalResponseSchema = z9.object({
  proposalId: UuidSchema,
  sessionId: UuidSchema,
  revision: RevisionSchema,
  state: VoiceProposalStateSchema,
  toolKey: z9.string().min(1).max(120),
  payloadHash: Sha256DigestSchema,
  readBack: JsonObjectSchema,
  expiresAt: TimestampSchema,
  commandId: UuidSchema.optional()
}).strict().meta({ id: "VoiceProposalResponse", "x-data-classification": "C3" });
var VoiceProposalActionBaseSchema = z9.object({
  proposalId: UuidSchema,
  expectedProposalRevision: RevisionSchema,
  commandId: UuidSchema
});
var ConfirmVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({ payloadHash: Sha256DigestSchema }).strict().meta({ id: "ConfirmVoiceProposalRequest", "x-data-classification": "C3" });
var CorrectVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({ correction: JsonObjectSchema }).strict().meta({ id: "CorrectVoiceProposalRequest", "x-data-classification": "C3" });
var CancelVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.strict().meta({
  id: "CancelVoiceProposalRequest",
  "x-data-classification": "C2"
});
var VoiceCommandStatusResponseSchema = z9.object({
  commandId: UuidSchema,
  state: z9.enum(["UNKNOWN", "IN_PROGRESS", "ACCEPTED", "REJECTED"]),
  receiptReference: UuidSchema.optional()
}).strict().meta({ id: "VoiceCommandStatusResponse", "x-data-classification": "C2" });
var VoiceControlFrameSchema = z9.object({
  protocolVersion: z9.literal(1),
  sessionId: UuidSchema,
  messageId: UuidSchema,
  sequence: z9.int().positive(),
  acknowledgedSequence: z9.int().nonnegative(),
  type: z9.enum([
    "session.start",
    "audio.end",
    "barge_in",
    "proposal.confirm",
    "proposal.correct",
    "proposal.cancel",
    "transport.ack",
    "transport.resync_request",
    "ping",
    "session.close",
    "session.ready",
    "state.changed",
    "transcript.partial",
    "transcript.final",
    "clarification",
    "tool.proposal",
    "proposal.state",
    "command.state",
    "validated.result",
    "audio.metadata",
    "transport.resync",
    "error",
    "session.expiring",
    "session.closed"
  ]),
  payload: JsonObjectSchema
}).strict().meta({ id: "VoiceControlFrame", "x-data-classification": "C4" });
var M2_VOICE_TOOL_KEYS = [];
export {
  ACTOR_TYPES,
  AccessGrantCommandTargetSchema,
  AccessGrantPayloadSchema,
  ActorTypeSchema,
  AttachOfflineAudioRequestSchema,
  AttachOfflineAudioResponseSchema,
  AuthorizationContextSchema,
  CAPABILITY_KEYS,
  COMMAND_DISPOSITIONS,
  CONSENT_SCOPES,
  CONSENT_STATES,
  CancelMediaUploadIntentResponseSchema,
  CancelVoiceProposalRequestSchema,
  CapabilityKeySchema,
  ClientContextSchema,
  CommandDispositionSchema,
  CommandEnvelopeSchema,
  CommandResultSchema,
  CommandSchema,
  CommandTargetSchema,
  ConfirmVoiceProposalRequestSchema,
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema,
  ConsentDecisionRecordedEventSchema,
  ConsentDecisionRecordedPayloadSchema,
  ConsentListResponseSchema,
  ConsentRecordSchema,
  ConsentScopeSchema,
  ConsentStateSchema,
  CorrectVoiceProposalRequestSchema,
  CreateMediaUploadIntentRequestSchema,
  CreateMediaUploadIntentResponseSchema,
  CreateVoiceSessionRequestSchema,
  CreateVoiceSessionResponseSchema,
  DATA_CLASSIFICATIONS,
  DATA_MODES,
  DEVICE_MODES,
  DataClassificationSchema,
  DataModeSchema,
  DeviceBatchReceiptSchema,
  DeviceModeSchema,
  EVENT_CLASSES,
  EventEnvelopeSchema,
  EventNameSchema,
  FarmerBootstrapResponseSchema,
  FieldErrorSchema,
  FinalizeMediaUploadIntentRequestSchema,
  HealthPayloadSchema,
  HealthStatusSchema,
  IssueAccessGrantCommandSchema,
  JsonObjectSchema,
  JsonValueSchema,
  M2_VOICE_TOOL_KEYS,
  MediaAssetStatusResponseSchema,
  MediaFailureCodeSchema,
  MediaOperationAcceptedResponseSchema,
  MediaOwnerContextSchema,
  MediaPurposeSchema,
  MediaUploadVerifiedEventSchema,
  MediaUploadVerifiedPayloadSchema,
  MediaVerificationStateSchema,
  MilestoneOneEventSchema,
  MilestoneTwoEventSchema,
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
  ScanMediaAssetRequestSchema,
  SchemaVersionRangeSchema,
  SelectRoleContextCommandSchema,
  SelectRoleContextPayloadSchema,
  SessionResponseSchema,
  Sha256DigestSchema,
  SyncBatchResponseSchema,
  SyncBatchResponseV2Schema,
  SyncBatchSchema,
  SyncBootstrapRequestSchema,
  SyncBootstrapResponseSchema,
  SyncCommandDispositionSchema,
  SyncCommandEnvelopeSchema,
  SyncCommandStatusResponseSchema,
  SyncConflictListResponseSchema,
  SyncConflictResolutionRequestSchema,
  SyncConflictSchema,
  SyncConflictTypeSchema,
  SyncFeedEventSchema,
  SyncFeedEventV2Schema,
  SyncFeedPageResponseSchema,
  SyncFeedPageResponseV2Schema,
  SyncIntegrationEventSchema,
  SyncIntegrationEventV2Schema,
  SyncLifecycleEventSchema,
  SyncLifecyclePayloadSchema,
  SyncProjectionDeltaSchema,
  SyncStreamOpenRequestSchema,
  SyncStreamOpenResponseSchema,
  SyncTombstoneSchema,
  TimestampSchema,
  TraceIdSchema,
  UnavailableSchema,
  UuidSchema,
  UuidV7Schema,
  VoiceCommandStatusResponseSchema,
  VoiceControlFrameSchema,
  VoiceDelegationSchema,
  VoiceLanguageSchema,
  VoiceLifecycleEventSchema,
  VoiceLifecyclePayloadSchema,
  VoiceProposalResponseSchema,
  VoiceProposalStateSchema,
  VoiceSessionStateSchema,
  VoiceTurnRequestSchema,
  VoiceTurnResponseSchema
};
