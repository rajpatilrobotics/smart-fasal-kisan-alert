// packages/contracts/src/advisory/index.ts
import { z as z2 } from "zod";

// packages/contracts/src/http/common.ts
import { z } from "zod";

// packages/contracts/src/vocabulary.ts
var DATA_CLASSIFICATIONS = ["C0", "C1", "C2", "C3", "C4", "P1"];
var DATA_MODES = ["LIVE", "RECORDED", "SIMULATED"];
var PROVENANCE_TYPES = [
  "SENSOR",
  "FARMER_REPORTED",
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
  "device_mode.change",
  "farmer.setup.write",
  "farmer.setup.complete",
  "farmer.farm.write",
  "farmer.plot.write",
  "farmer.evidence.read",
  "farmer.soil.write",
  "farmer.voice.setup",
  "farmer.recommendation.read",
  "farmer.recommendation.run",
  "farmer.recommendation.review_request",
  "farmer.recommendation.accept",
  "farmer.season.start_confirm",
  "farmer.calendar.read",
  "farmer.today.read",
  "farmer.advisory.read",
  "farmer.advisory.respond",
  "farmer.health.read",
  "farmer.health.write",
  "farmer.health.submit",
  "farmer.health.share_case",
  "farmer.case.read"
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
  "RATE_LIMITED",
  "SETUP_INCOMPLETE",
  "GPS_PERMISSION_DENIED",
  "HARDWARE_SKIPPED",
  "STALE_DATA",
  "PAYLOAD_TOO_LARGE",
  "SIGNATURE_INVALID",
  "REPLAY_DETECTED",
  "CHALLENGE_EXPIRED",
  "SOURCE_RIGHTS_OR_VERSION_INVALID",
  "NO_SAFE_RECOMMENDATION",
  "ADVISORY_EXPIRED",
  "ADVISORY_DEDUPLICATED",
  "ALERT_DELIVERY_DISABLED",
  "HEALTH_MEDIA_UNUSABLE",
  "HEALTH_MODEL_UNAVAILABLE",
  "CASE_SHARING_REQUIRED"
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

// packages/contracts/src/advisory/index.ts
var AdvisoryKindSchema = z2.enum([
  "DRY_SPELL_RISK",
  "IRRIGATION_NEEDED",
  "IRRIGATION_DELAY_RAIN_EXPECTED",
  "HEAVY_RAIN_WATERLOGGING_RISK",
  "HEAT_HUMIDITY_WEATHER_RISK",
  "LOW_SOIL_MOISTURE",
  "NUTRIENT_PH_GUIDANCE",
  "SENSOR_EVIDENCE_PROBLEM"
]);
var AdvisorySeveritySchema = z2.enum(["INFO", "WATCH", "ACTION", "URGENT"]);
var AdvisoryUrgencySchema = z2.enum([
  "TODAY",
  "NEXT_24_HOURS",
  "NEXT_2_TO_3_DAYS",
  "WHEN_POSSIBLE"
]);
var AdvisoryLifecycleStateSchema = z2.enum([
  "GENERATED",
  "ACTIVE",
  "ACKNOWLEDGED",
  "SNOOZED",
  "RESOLVED",
  "EXPIRED",
  "DEDUPLICATED"
]);
var AdvisoryEvidenceRefSchema = z2.object({
  evidenceId: UuidSchema,
  metricKey: z2.string().min(1).max(120),
  sourceName: z2.string().min(1).max(160),
  freshness: z2.enum(["CURRENT", "DATA_IS_OLD", "NO_RECENT_DATA", "UNAVAILABLE"]),
  quality: z2.enum(["TRUSTED", "USE_WITH_CAUTION", "TREND_ONLY", "DO_NOT_USE"]),
  dataMode: DataModeSchema,
  observedAt: TimestampSchema.optional(),
  limitation: z2.string().min(1).max(220).optional()
}).strict().meta({ id: "AdvisoryEvidenceRef", "x-data-classification": "C3" });
var AdvisoryReasonSchema = z2.object({
  code: z2.string().min(1).max(80),
  label: z2.string().min(1).max(180),
  contribution: z2.number().min(0).max(1)
}).strict().meta({ id: "AdvisoryReason", "x-data-classification": "C3" });
var AdvisoryActionSchema = z2.object({
  actionKind: z2.enum([
    "IRRIGATE",
    "DELAY_IRRIGATION",
    "MONITOR",
    "PROTECT_CROP",
    "CHECK_SENSOR",
    "CONSULT_RSK",
    "APPLY_NUTRIENT_WITH_CAUTION"
  ]),
  label: z2.string().min(1).max(180),
  timingLabel: z2.string().min(1).max(180),
  cannotDoAlternative: z2.string().min(1).max(220).optional()
}).strict().meta({ id: "AdvisoryAction", "x-data-classification": "C3" });
var AdvisoryAlertProjectionSchema = z2.object({
  alertId: UuidSchema,
  lifecycleState: z2.enum(["ACTIVE", "ACKNOWLEDGED", "SNOOZED", "RESOLVED", "EXPIRED"]),
  channel: z2.literal("IN_APP"),
  lastInteractionAt: TimestampSchema.optional()
}).strict().meta({ id: "AdvisoryAlertProjection", "x-data-classification": "C3" });
var AdvisoryResultResponseSchema = z2.object({
  advisoryId: UuidSchema,
  plotId: UuidSchema,
  kind: AdvisoryKindSchema,
  lifecycleState: AdvisoryLifecycleStateSchema,
  severity: AdvisorySeveritySchema,
  urgency: AdvisoryUrgencySchema,
  generatedAt: TimestampSchema,
  activeFrom: TimestampSchema,
  expiresAt: TimestampSchema,
  dataMode: DataModeSchema,
  resultVersion: RevisionSchema,
  etagRevision: RevisionSchema,
  snapshotChecksum: Sha256DigestSchema,
  ruleSetVersion: z2.string().min(1).max(120),
  riskScore: z2.number().min(0).max(100),
  confidenceScore: z2.number().min(0).max(100),
  title: z2.string().min(1).max(160),
  summary: z2.string().min(1).max(280),
  recommendedAction: AdvisoryActionSchema,
  why: z2.array(AdvisoryReasonSchema).min(1).max(8),
  evidenceRefs: z2.array(AdvisoryEvidenceRefSchema).min(1).max(16),
  limitations: z2.array(z2.string().min(1).max(220)).max(8),
  deduplicationKey: z2.string().min(1).max(160),
  supersedesAdvisoryId: UuidSchema.optional(),
  taskId: UuidSchema.optional(),
  alert: AdvisoryAlertProjectionSchema.optional()
}).strict().meta({ id: "AdvisoryResultResponse", "x-data-classification": "C3" });
var FarmerTodayResponseSchema = z2.object({
  generatedAt: TimestampSchema,
  locale: z2.enum(["mr-IN", "hi-IN", "en-IN"]),
  dataMode: DataModeSchema,
  cards: z2.array(AdvisoryResultResponseSchema).max(12),
  syncState: z2.enum(["SYNCED", "OFFLINE_CACHE", "WAITING_FOR_INTERNET", "LOCKED_RECOVERY"])
}).strict().meta({ id: "FarmerTodayResponse", "x-data-classification": "C3" });
var AdvisoryResponseRequestSchema = z2.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  response: z2.enum(["ACKNOWLEDGE", "SNOOZE", "MARK_ACTION_COMPLETED", "CANNOT_DO"]),
  snoozeUntil: TimestampSchema.optional(),
  note: z2.string().min(1).max(500).optional(),
  clientRecordedAt: TimestampSchema,
  timezone: z2.literal("Asia/Kolkata")
}).strict().meta({ id: "AdvisoryResponseRequest", "x-data-classification": "C3" });
var AdvisoryResponseReceiptSchema = z2.object({
  commandId: UuidSchema,
  disposition: z2.enum(["ACCEPTED", "ALREADY_ACCEPTED"]),
  advisoryId: UuidSchema,
  lifecycleState: AdvisoryLifecycleStateSchema,
  eventIds: z2.array(UuidSchema).min(1).max(4),
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "AdvisoryResponseReceipt", "x-data-classification": "C3" });

// packages/contracts/src/commands/index.ts
import { z as z5 } from "zod";

// packages/contracts/src/crop-health/index.ts
import { z as z3 } from "zod";
var HealthReportStateSchema = z3.enum([
  "DRAFT",
  "SUBMITTED",
  "TRIAGE_PENDING",
  "TRIAGED",
  "MODEL_UNAVAILABLE"
]);
var HealthQualityBandSchema = z3.enum(["USABLE", "LIMITED", "UNUSABLE"]);
var HealthTriageStateSchema = z3.enum(["SUPPORTED", "UNSUPPORTED", "UNCLEAR"]);
var HealthSeveritySchema = z3.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]);
var HealthConfidenceSchema = z3.enum(["LOW", "MEDIUM", "HIGH"]);
var HealthSpreadSchema = z3.enum(["NOT_SPREADING", "SPREADING", "FAST_SPREADING", "UNKNOWN"]);
var HealthCaseStatusSchema = z3.enum([
  "PENDING_EXPERT",
  "ASSIGNED",
  "AWAITING_FARMER",
  "REPLIED",
  "FOLLOW_UP_DUE",
  "RESOLVED",
  "CLOSED",
  "REOPENED"
]);
var HealthSharingDecisionSchema = z3.enum(["NOT_REQUESTED", "PENDING", "ALLOW", "DENY"]);
var HealthCategoryKeySchema = z3.enum([
  "RICE_LEAF_SPOT_POSSIBLE",
  "RICE_BLAST_POSSIBLE",
  "NUTRIENT_STRESS_POSSIBLE",
  "WATER_STRESS_POSSIBLE",
  "PEST_DAMAGE_POSSIBLE",
  "UNKNOWN_STRESS",
  "UNSUPPORTED_CROP_OR_PART"
]);
var HealthQuestionKeySchema = z3.enum([
  "crop",
  "cropStage",
  "affectedPart",
  "symptomStarted",
  "spread",
  "areaAffected",
  "recentWeather",
  "recentInput",
  "farmerConcern"
]);
var HealthAnswerSchema = z3.object({
  questionKey: HealthQuestionKeySchema,
  answer: z3.string().min(1).max(500).optional(),
  unknown: z3.boolean().default(false),
  language: z3.enum(["mr", "hi", "en"]),
  source: z3.enum(["VOICE_DRAFT", "TYPED", "GUIDED_CHOICE", "SYSTEM_CONTEXT"])
}).strict().superRefine((value, ctx) => {
  if (value.unknown && value.answer !== void 0) {
    ctx.addIssue({
      code: "custom",
      path: ["answer"],
      message: "Unknown answers must not also carry answer text."
    });
  }
  if (!value.unknown && value.answer === void 0) {
    ctx.addIssue({
      code: "custom",
      path: ["answer"],
      message: "Known answers require answer text."
    });
  }
}).meta({ id: "HealthAnswer", "x-data-classification": "C3" });
var HealthMediaViewSchema = z3.enum([
  "WHOLE_PLANT",
  "AFFECTED_LEAF_TOP",
  "AFFECTED_LEAF_UNDERSIDE",
  "STEM_OR_BASE",
  "FIELD_CONTEXT",
  "OTHER"
]);
var HealthMediaRefSchema = z3.object({
  assetId: UuidSchema,
  attachmentId: UuidSchema.optional(),
  requiredView: HealthMediaViewSchema,
  qualityBand: HealthQualityBandSchema,
  width: z3.int().positive().max(16384).optional(),
  height: z3.int().positive().max(16384).optional(),
  scannerVersion: z3.string().min(1).max(80).optional(),
  limitation: z3.string().min(1).max(220).optional()
}).strict().meta({ id: "HealthMediaRef", "x-data-classification": "C3" });
var HealthEvidenceQualitySchema = z3.object({
  qualityBand: HealthQualityBandSchema,
  usablePhotoCount: z3.int().min(0).max(6),
  limitedPhotoCount: z3.int().min(0).max(6),
  unusablePhotoCount: z3.int().min(0).max(6),
  missingRequiredContext: z3.array(HealthQuestionKeySchema).max(9),
  limitations: z3.array(z3.string().min(1).max(220)).max(8),
  validatorVersion: z3.string().min(1).max(80)
}).strict().meta({ id: "HealthEvidenceQuality", "x-data-classification": "C3" });
var HealthTriageCategorySchema = z3.object({
  categoryKey: HealthCategoryKeySchema,
  label: z3.string().min(1).max(120),
  confidence: HealthConfidenceSchema,
  evidenceRefs: z3.array(z3.string().min(1).max(120)).min(1).max(8),
  limitations: z3.array(z3.string().min(1).max(220)).max(4)
}).strict().meta({ id: "HealthTriageCategory", "x-data-classification": "C3" });
var HealthTriageResultSchema = z3.object({
  triageId: UuidSchema,
  reportId: UuidSchema,
  state: HealthTriageStateSchema,
  severity: HealthSeveritySchema,
  confidence: HealthConfidenceSchema,
  spread: HealthSpreadSchema,
  mandatoryEscalation: z3.boolean(),
  summary: z3.string().min(1).max(360),
  safeNextStep: z3.string().min(1).max(260),
  categories: z3.array(HealthTriageCategorySchema).max(3),
  evidenceQuality: HealthEvidenceQualitySchema,
  modelProvider: z3.enum(["NONE", "VERTEX_GEMINI", "FIXTURE"]),
  modelName: z3.string().min(1).max(120),
  modelVersion: z3.string().min(1).max(120),
  policyVersion: z3.string().min(1).max(120),
  dataMode: DataModeSchema,
  generatedAt: TimestampSchema,
  unavailableReason: z3.string().min(1).max(160).optional()
}).strict().superRefine((value, ctx) => {
  if (value.evidenceQuality.qualityBand === "LIMITED" && value.confidence === "HIGH") {
    ctx.addIssue({
      code: "custom",
      path: ["confidence"],
      message: "Limited evidence cannot produce high confidence."
    });
  }
  if (value.evidenceQuality.qualityBand === "UNUSABLE" && value.modelProvider !== "NONE") {
    ctx.addIssue({
      code: "custom",
      path: ["modelProvider"],
      message: "Unusable evidence must not be sent to a visual model."
    });
  }
}).meta({ id: "HealthTriageResult", "x-data-classification": "C3" });
var HealthVisionExtractionSchema = z3.object({
  schemaVersion: z3.literal("health-vision-extraction-v1"),
  modelName: z3.string().min(1).max(120),
  modelVersion: z3.string().min(1).max(120),
  state: HealthTriageStateSchema,
  visualQualityBand: HealthQualityBandSchema,
  observedParts: z3.array(z3.string().min(1).max(80)).max(6),
  observedSymptoms: z3.array(z3.string().min(1).max(120)).max(8),
  possibleCategories: z3.array(HealthTriageCategorySchema).max(3),
  limitations: z3.array(z3.string().min(1).max(220)).max(8),
  evidenceRefs: z3.array(z3.string().min(1).max(120)).max(12)
}).strict().meta({ id: "HealthVisionExtraction", "x-data-classification": "C3" });
var HealthReportDraftRequestSchema = z3.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  schemaVersion: z3.literal("health-report-draft-v1"),
  reportId: UuidSchema.optional(),
  cropName: z3.string().min(1).max(120),
  language: z3.enum(["mr", "hi", "en"]),
  symptomSummary: z3.string().min(1).max(800),
  answers: z3.array(HealthAnswerSchema).max(20),
  clientRecordedAt: TimestampSchema,
  timezone: z3.literal("Asia/Kolkata")
}).strict().meta({ id: "HealthReportDraftRequest", "x-data-classification": "C3" });
var AttachHealthMediaRequestSchema = z3.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  assetId: UuidSchema,
  requiredView: HealthMediaViewSchema,
  consentAccessVersion: z3.int().positive(),
  clientRecordedAt: TimestampSchema,
  timezone: z3.literal("Asia/Kolkata")
}).strict().meta({ id: "AttachHealthMediaRequest", "x-data-classification": "C3" });
var SubmitHealthReportRequestSchema = z3.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  clientSubmittedAt: TimestampSchema,
  timezone: z3.literal("Asia/Kolkata")
}).strict().meta({ id: "SubmitHealthReportRequest", "x-data-classification": "C3" });
var HealthReportResponseSchema = z3.object({
  reportId: UuidSchema,
  plotId: UuidSchema,
  farmId: UuidSchema.optional(),
  state: HealthReportStateSchema,
  cropName: z3.string().min(1).max(120),
  language: z3.enum(["mr", "hi", "en"]),
  symptomSummary: z3.string().min(1).max(800),
  answers: z3.array(HealthAnswerSchema).max(20),
  media: z3.array(HealthMediaRefSchema).max(6),
  quality: HealthEvidenceQualitySchema.optional(),
  triage: HealthTriageResultSchema.optional(),
  sharingDecision: HealthSharingDecisionSchema,
  caseId: UuidSchema.optional(),
  dataMode: DataModeSchema,
  resultVersion: RevisionSchema,
  etagRevision: RevisionSchema,
  reportChecksum: Sha256DigestSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  submittedAt: TimestampSchema.optional()
}).strict().meta({ id: "HealthReportResponse", "x-data-classification": "C3" });
var HealthReportListResponseSchema = z3.object({
  plotId: UuidSchema,
  generatedAt: TimestampSchema,
  reports: z3.array(HealthReportResponseSchema).max(50)
}).strict().meta({ id: "HealthReportListResponse", "x-data-classification": "C3" });
var HealthCaseSharingDecisionRequestSchema = z3.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  decision: z3.enum(["ALLOW", "DENY"]),
  policyVersionId: UuidSchema,
  consentAccessVersion: z3.int().positive(),
  clientRecordedAt: TimestampSchema,
  timezone: z3.literal("Asia/Kolkata")
}).strict().meta({ id: "HealthCaseSharingDecisionRequest", "x-data-classification": "C3" });
var HealthCaseSharingDecisionResponseSchema = z3.object({
  commandId: UuidSchema,
  disposition: z3.enum(["ACCEPTED", "ALREADY_ACCEPTED"]),
  reportId: UuidSchema,
  sharingDecision: z3.enum(["ALLOW", "DENY"]),
  caseId: UuidSchema.optional(),
  evidencePackId: UuidSchema.optional(),
  workItemId: UuidSchema.optional(),
  caseStatus: HealthCaseStatusSchema.optional(),
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "HealthCaseSharingDecisionResponse", "x-data-classification": "C3" });
var FarmerCaseSummarySchema = z3.object({
  caseId: UuidSchema,
  reportId: UuidSchema,
  plotId: UuidSchema,
  status: HealthCaseStatusSchema,
  severity: HealthSeveritySchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  dataMode: DataModeSchema,
  title: z3.string().min(1).max(160),
  pendingExpert: z3.boolean()
}).strict().meta({ id: "FarmerCaseSummary", "x-data-classification": "C3" });
var FarmerCaseResponseSchema = FarmerCaseSummarySchema.extend({
  accessVersion: z3.int().positive(),
  evidencePackExpiresAt: TimestampSchema,
  report: HealthReportResponseSchema,
  timeline: z3.array(
    z3.object({
      at: TimestampSchema,
      state: HealthCaseStatusSchema,
      label: z3.string().min(1).max(180)
    }).strict()
  ).min(1).max(20)
}).strict().meta({ id: "FarmerCaseResponse", "x-data-classification": "C3" });
var FarmerCaseListResponseSchema = z3.object({
  generatedAt: TimestampSchema,
  cases: z3.array(FarmerCaseSummarySchema).max(50)
}).strict().meta({ id: "FarmerCaseListResponse", "x-data-classification": "C3" });

// packages/contracts/src/farmer-setup/index.ts
import { z as z4 } from "zod";
var SetupStatusSchema = z4.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "COMPLETE",
  "NEEDS_REVIEW"
]);
var FarmerLocaleSchema = z4.enum(["mr-IN", "hi-IN", "en-IN"]);
var SetupLanguageSchema = z4.enum(["mr", "hi", "en"]);
var DeviceModeSelectionSchema = z4.enum(["PERSONAL", "TRUSTED_FAMILY", "RSK_ASSISTED"]);
var SetupSyncStatusSchema = z4.enum([
  "SAVED_ON_THIS_PHONE",
  "WAITING_FOR_INTERNET",
  "SYNCED",
  "CONFLICT",
  "LOCKED_RECOVERY",
  "REJECTED"
]);
var AreaUnitSchema = z4.enum(["SQUARE_METRE", "HECTARE", "ACRE", "GUNTHA"]);
var LocationCaptureMethodSchema = z4.enum([
  "GPS_POINT",
  "MANUAL_MAP",
  "VILLAGE_LANDMARK",
  "UNKNOWN"
]);
var PlotGeometryKindSchema = z4.enum(["NONE", "POINT", "POLYGON", "VILLAGE_LANDMARK"]);
var SoilSourceSchema = z4.enum([
  "SOIL_HEALTH_CARD",
  "LABORATORY",
  "FARMER_MANUAL",
  "SENSOR",
  "UNKNOWN"
]);
var WaterSourceSchema = z4.enum([
  "RAIN_FED",
  "WELL",
  "BOREWELL",
  "CANAL",
  "POND",
  "TANKER",
  "OTHER",
  "UNKNOWN"
]);
var WaterAvailabilitySchema = z4.enum(["HIGH", "MEDIUM", "LOW", "SEASONAL", "UNKNOWN"]);
var CropStageSchema = z4.enum([
  "PLANNED",
  "SOWN",
  "TRANSPLANTED",
  "VEGETATIVE",
  "FLOWERING",
  "FRUITING",
  "HARVESTED",
  "UNKNOWN"
]);
var OptionalHardwareStatusSchema = z4.enum([
  "SKIPPED",
  "NOT_CONFIGURED",
  "RSK_SETUP_REQUIRED"
]);
var SetupConsentScopeSchema = z4.enum([
  "location.processing",
  "audio.storage",
  "case.sharing",
  "visit.access",
  "assisted_service.access",
  "channel.app_push",
  "channel.sms",
  "channel.ivr"
]);
var FarmerProfileSetupSchema = z4.object({
  displayName: z4.string().min(1).max(160).optional(),
  preferredLocale: FarmerLocaleSchema,
  timezone: z4.literal("Asia/Kolkata"),
  accessibility: z4.object({
    voicePrompts: z4.boolean(),
    largeTargets: z4.boolean(),
    highContrast: z4.boolean()
  }).strict()
}).strict().meta({ id: "FarmerProfileSetup", "x-data-classification": "C3" });
var RaigadLocationSchema = z4.object({
  district: z4.literal("Raigad"),
  taluka: z4.string().min(1).max(120),
  village: z4.string().min(1).max(160),
  landmark: z4.string().min(1).max(240).optional()
}).strict().meta({ id: "RaigadLocation", "x-data-classification": "C2" });
var PlotGeometrySummarySchema = z4.object({
  geometryVersion: z4.int().positive(),
  kind: PlotGeometryKindSchema,
  captureMethod: LocationCaptureMethodSchema,
  gpsPermission: z4.enum(["GRANTED", "DENIED", "PROMPT", "UNKNOWN"]),
  hasExactServerGeometry: z4.boolean(),
  recordedAt: TimestampSchema
}).strict().meta({ id: "PlotGeometrySummary", "x-data-classification": "C2" });
var PlotSetupSchema = z4.object({
  plotId: UuidSchema,
  farmId: UuidSchema,
  name: z4.string().min(1).max(120),
  area: z4.number().positive().max(1e6),
  areaUnit: AreaUnitSchema,
  normalizedAreaSquareMetres: z4.number().positive().max(1e7),
  areaConversionVersion: z4.literal("area-v1"),
  locationMethod: LocationCaptureMethodSchema,
  geometry: PlotGeometrySummarySchema,
  revision: RevisionSchema
}).strict().meta({ id: "PlotSetup", "x-data-classification": "C3" });
var FarmSetupSchema = z4.object({
  farmId: UuidSchema,
  name: z4.string().min(1).max(120),
  location: RaigadLocationSchema,
  farmingMethod: z4.enum(["TRADITIONAL", "ORGANIC", "MIXED", "UNKNOWN"]),
  plots: z4.array(PlotSetupSchema).max(50),
  revision: RevisionSchema
}).strict().meta({ id: "FarmSetup", "x-data-classification": "C3" });
var SoilMeasurementSchema = z4.object({
  ph: z4.number().min(0).max(14).optional(),
  nitrogen: z4.number().min(0).max(9999).optional(),
  phosphorus: z4.number().min(0).max(9999).optional(),
  potassium: z4.number().min(0).max(9999).optional(),
  unit: z4.enum(["MG_PER_KG", "KG_PER_HECTARE", "UNKNOWN"]),
  source: SoilSourceSchema,
  observedAt: TimestampSchema.optional()
}).strict().meta({ id: "SoilMeasurement", "x-data-classification": "C3" });
var WaterContextSchema = z4.object({
  sources: z4.array(WaterSourceSchema).min(1).max(8),
  availability: WaterAvailabilitySchema,
  reliability: z4.enum(["RELIABLE", "SOMETIMES", "UNRELIABLE", "UNKNOWN"]),
  storage: z4.enum(["NONE", "SMALL_TANK", "FARM_POND", "OTHER", "UNKNOWN"]),
  rainfed: z4.boolean()
}).strict().meta({ id: "WaterContext", "x-data-classification": "C3" });
var CropDeclarationSchema = z4.object({
  cropName: z4.string().min(1).max(120),
  variety: z4.string().min(1).max(120).optional(),
  sowingOrTransplantDate: z4.iso.date().optional(),
  stage: CropStageSchema,
  planned: z4.boolean()
}).strict().meta({ id: "CropDeclaration", "x-data-classification": "C3" });
var CropHistoryRecordSchema = z4.object({
  cropName: z4.string().min(1).max(120),
  seasonLabel: z4.string().min(1).max(120),
  year: z4.int().min(2e3).max(2100),
  notes: z4.string().max(500).optional()
}).strict().meta({ id: "CropHistoryRecord", "x-data-classification": "C3" });
var SetupConsentsSchema = z4.object({
  decisions: z4.array(
    z4.object({
      scopeKey: SetupConsentScopeSchema,
      decision: z4.enum(["ALLOW", "DENY", "WITHDRAW"]),
      decidedAt: TimestampSchema
    }).strict()
  )
}).strict().meta({ id: "SetupConsents", "x-data-classification": "C2" });
var FarmerSetupDraftSchema = z4.object({
  draftId: UuidSchema,
  status: SetupStatusSchema,
  profile: FarmerProfileSetupSchema,
  deviceMode: DeviceModeSelectionSchema,
  consents: SetupConsentsSchema,
  farms: z4.array(FarmSetupSchema).min(0).max(10),
  soilByPlot: z4.record(UuidSchema, SoilMeasurementSchema),
  waterByPlot: z4.record(UuidSchema, WaterContextSchema),
  cropHistoryByPlot: z4.record(UuidSchema, z4.array(CropHistoryRecordSchema).max(20)),
  currentCropByPlot: z4.record(UuidSchema, CropDeclarationSchema),
  hardwareStatus: OptionalHardwareStatusSchema,
  syncStatus: SetupSyncStatusSchema,
  revision: RevisionSchema,
  checksum: Sha256DigestSchema,
  updatedAt: TimestampSchema
}).strict().meta({ id: "FarmerSetupDraft", "x-data-classification": "C3" });
var FarmerSetupSummarySchema = z4.object({
  status: SetupStatusSchema,
  activeDraft: FarmerSetupDraftSchema.optional(),
  completedAt: TimestampSchema.optional(),
  conflictCount: z4.int().nonnegative(),
  syncStatus: SetupSyncStatusSchema
}).strict().meta({ id: "FarmerSetupSummary", "x-data-classification": "C3" });
var MyFarmResponseSchema = z4.object({
  setup: FarmerSetupSummarySchema,
  farms: z4.array(FarmSetupSchema).max(10),
  totals: z4.object({
    farms: z4.int().nonnegative(),
    plots: z4.int().nonnegative(),
    normalizedAreaSquareMetres: z4.number().nonnegative()
  }).strict(),
  currentCropByPlot: z4.record(UuidSchema, CropDeclarationSchema),
  generatedAt: TimestampSchema
}).strict().meta({ id: "MyFarmResponse", "x-data-classification": "C3" });
var SaveFarmerSetupDraftPayloadSchema = z4.object({
  draft: FarmerSetupDraftSchema.omit({
    checksum: true,
    revision: true,
    syncStatus: true,
    updatedAt: true
  })
}).strict().meta({ id: "SaveFarmerSetupDraftPayload", "x-data-classification": "C3" });
var CompleteFarmerSetupPayloadSchema = z4.object({
  draftId: UuidSchema,
  acceptedDraftRevision: RevisionSchema,
  acceptedDraftChecksum: Sha256DigestSchema
}).strict().meta({ id: "CompleteFarmerSetupPayload", "x-data-classification": "C3" });
var UpdateFarmerPreferencesPayloadSchema = z4.object({
  preferredLocale: FarmerLocaleSchema,
  timezone: z4.literal("Asia/Kolkata"),
  voicePrompts: z4.boolean()
}).strict().meta({ id: "UpdateFarmerPreferencesPayload", "x-data-classification": "C2" });
var DeviceModeChangePayloadSchema = z4.object({
  nextDeviceMode: DeviceModeSelectionSchema,
  localPrivateWorkState: z4.enum(["NONE", "SYNCED", "LOCKED_RECOVERY_REQUIRED"])
}).strict().meta({ id: "DeviceModeChangePayload", "x-data-classification": "C2" });
var SetupVoiceReadResponseSchema = z4.object({
  setup: FarmerSetupSummarySchema,
  myFarm: MyFarmResponseSchema.optional(),
  mode: z4.enum(["LIVE", "RECORDED", "SIMULATED"])
}).strict().meta({ id: "SetupVoiceReadResponse", "x-data-classification": "C3" });
var SetupVoiceProposalPayloadSchema = z4.object({
  targetPath: z4.string().min(1).max(160),
  proposedValue: JsonObjectSchema,
  reason: z4.string().min(1).max(240)
}).strict().meta({ id: "SetupVoiceProposalPayload", "x-data-classification": "C3" });

// packages/contracts/src/commands/index.ts
var ClientContextSchema = z5.object({
  clientRecordedAt: TimestampSchema,
  timezone: z5.string().min(1).max(64),
  dataModeClaim: z5.enum(["LIVE", "RECORDED", "SIMULATED"])
}).strict();
var CommandTargetSchema = z5.object({
  type: z5.enum([
    "roleContext",
    "consentDecision",
    "accessGrant",
    "farmerSetupDraft",
    "farmerSetup",
    "farmerPreferences",
    "deviceMode",
    "advisory",
    "healthReport",
    "healthCaseSharing"
  ]),
  id: UuidSchema
}).strict();
var RoleContextCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("roleContext")
}).strict();
var ConsentDecisionCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("consentDecision")
}).strict();
var AccessGrantCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("accessGrant")
}).strict();
var FarmerSetupDraftCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("farmerSetupDraft")
}).strict();
var FarmerSetupCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("farmerSetup")
}).strict();
var FarmerPreferencesCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("farmerPreferences")
}).strict();
var DeviceModeCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("deviceMode")
}).strict();
var AdvisoryCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("advisory")
}).strict();
var HealthReportCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("healthReport")
}).strict();
var HealthCaseSharingCommandTargetSchema = CommandTargetSchema.extend({
  type: z5.literal("healthCaseSharing")
}).strict();
var SelectRoleContextPayloadSchema = z5.object({
  roleGrantId: UuidSchema,
  officeId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional()
}).strict();
var ConsentDecisionPayloadSchema = z5.object({
  decision: z5.enum(["ALLOW", "DENY", "WITHDRAW"]),
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z5.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  policyVersionId: UuidSchema,
  expiresAt: TimestampSchema.optional()
}).strict();
var AccessGrantPayloadSchema = z5.object({
  targetKind: z5.literal("ASSISTED_FARMER_CONTEXT"),
  targetId: UuidSchema,
  farmerSubjectId: UuidSchema,
  purposeKey: z5.literal("assisted.service"),
  consentAccessVersion: z5.int().positive(),
  expiresAt: TimestampSchema
}).strict();
function commandEnvelope(operation, target, payload) {
  return z5.object({
    commandSchemaVersion: z5.literal(1),
    operation: z5.literal(operation),
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
var SaveFarmerSetupDraftCommandSchema = commandEnvelope(
  "SaveFarmerSetupDraft",
  FarmerSetupDraftCommandTargetSchema,
  SaveFarmerSetupDraftPayloadSchema
).meta({ id: "SaveFarmerSetupDraftCommand", "x-data-classification": "C3" });
var CompleteFarmerSetupCommandSchema = commandEnvelope(
  "CompleteFarmerSetup",
  FarmerSetupCommandTargetSchema,
  CompleteFarmerSetupPayloadSchema
).meta({ id: "CompleteFarmerSetupCommand", "x-data-classification": "C3" });
var UpdateFarmerPreferencesCommandSchema = commandEnvelope(
  "UpdateFarmerPreferences",
  FarmerPreferencesCommandTargetSchema,
  UpdateFarmerPreferencesPayloadSchema
).meta({ id: "UpdateFarmerPreferencesCommand", "x-data-classification": "C2" });
var ChangeDeviceModeCommandSchema = commandEnvelope(
  "ChangeDeviceMode",
  DeviceModeCommandTargetSchema,
  DeviceModeChangePayloadSchema
).meta({ id: "ChangeDeviceModeCommand", "x-data-classification": "C2" });
var RespondToAdvisoryCommandSchema = commandEnvelope(
  "RespondToAdvisory",
  AdvisoryCommandTargetSchema,
  AdvisoryResponseRequestSchema.omit({ commandId: true, expectedRevision: true })
).meta({ id: "RespondToAdvisoryCommand", "x-data-classification": "C3" });
var SaveHealthReportDraftCommandSchema = commandEnvelope(
  "SaveHealthReportDraft",
  HealthReportCommandTargetSchema,
  HealthReportDraftRequestSchema.omit({ commandId: true, expectedRevision: true })
).meta({ id: "SaveHealthReportDraftCommand", "x-data-classification": "C3" });
var AttachHealthMediaCommandSchema = commandEnvelope(
  "AttachHealthMedia",
  HealthReportCommandTargetSchema,
  AttachHealthMediaRequestSchema.omit({ commandId: true, expectedRevision: true })
).meta({ id: "AttachHealthMediaCommand", "x-data-classification": "C3" });
var SubmitHealthReportCommandSchema = commandEnvelope(
  "SubmitHealthReport",
  HealthReportCommandTargetSchema,
  SubmitHealthReportRequestSchema.omit({ commandId: true, expectedRevision: true })
).meta({ id: "SubmitHealthReportCommand", "x-data-classification": "C3" });
var DecideHealthCaseSharingCommandSchema = commandEnvelope(
  "DecideHealthCaseSharing",
  HealthCaseSharingCommandTargetSchema,
  HealthCaseSharingDecisionRequestSchema.omit({ commandId: true, expectedRevision: true })
).meta({ id: "DecideHealthCaseSharingCommand", "x-data-classification": "C3" });
var CommandEnvelopeSchema = z5.discriminatedUnion("operation", [
  SelectRoleContextCommandSchema,
  RecordConsentDecisionCommandSchema,
  IssueAccessGrantCommandSchema,
  SaveFarmerSetupDraftCommandSchema,
  CompleteFarmerSetupCommandSchema,
  UpdateFarmerPreferencesCommandSchema,
  ChangeDeviceModeCommandSchema,
  RespondToAdvisoryCommandSchema,
  SaveHealthReportDraftCommandSchema,
  AttachHealthMediaCommandSchema,
  SubmitHealthReportCommandSchema,
  DecideHealthCaseSharingCommandSchema
]).meta({ id: "CommandEnvelope", "x-data-classification": "C2" });
var CommandSchema = CommandEnvelopeSchema;
var CommandDispositionSchema = z5.enum(COMMAND_DISPOSITIONS);
var CommandResultSchema = z5.object({
  commandId: UuidSchema,
  disposition: CommandDispositionSchema,
  result: z5.object({
    type: z5.enum([
      "roleContext",
      "consentDecision",
      "accessGrant",
      "farmerSetupDraft",
      "farmerSetup",
      "farmerPreferences",
      "deviceMode",
      "advisory",
      "healthReport",
      "healthCaseSharing"
    ]),
    id: UuidSchema,
    revision: RevisionSchema
  }).strict().optional(),
  eventIds: z5.array(UuidSchema).max(20),
  syncAcknowledgementId: UuidSchema.optional(),
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "CommandResult", "x-data-classification": "C2" });

// packages/contracts/src/device/index.ts
import { z as z6 } from "zod";
var DeviceBatchReceiptSchema = z6.object({
  batchId: UuidSchema,
  state: z6.enum(["DURABLY_ACCEPTED", "ALREADY_ACCEPTED", "REJECTED"]),
  receivedAt: TimestampSchema,
  explicitlyNotAgronomicTrust: z6.literal(true)
}).strict().meta({ id: "DeviceBatchReceipt", "x-data-classification": "C1" });

// packages/contracts/src/evidence/index.ts
import { z as z7 } from "zod";
var EvidenceKindSchema = z7.enum([
  "WEATHER_FORECAST",
  "WEATHER_HISTORY",
  "EARTH_OBSERVATION",
  "SOIL_MEASUREMENT",
  "HARDWARE_TELEMETRY",
  "DEVICE_HEALTH"
]);
var EvidenceQualitySchema = z7.enum([
  "TRUSTED",
  "USE_WITH_CAUTION",
  "TREND_ONLY",
  "DO_NOT_USE",
  "PENDING"
]);
var EvidenceFreshnessSchema = z7.enum([
  "CURRENT",
  "DATA_IS_OLD",
  "NO_RECENT_DATA",
  "UNAVAILABLE"
]);
var EvidenceValueStateSchema = z7.enum([
  "KNOWN",
  "UNKNOWN",
  "MISSING",
  "PROXY",
  "CONFLICTING",
  "NOT_APPLICABLE",
  "WITHHELD",
  "UNAVAILABLE"
]);
var EvidenceUnitSchema = z7.enum([
  "CELSIUS",
  "PERCENT",
  "MILLIMETRE",
  "PH",
  "MG_PER_KG",
  "KG_PER_HECTARE",
  "MICROSIEMENS_PER_CM",
  "INDEX",
  "HEALTH_STATE",
  "UNKNOWN"
]);
var EvidenceSourceSchema = z7.object({
  sourceId: z7.string().min(1).max(160),
  sourceName: z7.string().min(1).max(160),
  provenanceType: ProvenanceTypeSchema,
  rightsLabel: z7.string().min(1).max(160),
  sourceVersion: z7.string().min(1).max(120)
}).strict().meta({ id: "EvidenceSource", "x-data-classification": "C2" });
var EvidenceValueSchema = z7.object({
  state: EvidenceValueStateSchema,
  originalValue: z7.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/).optional(),
  originalUnit: EvidenceUnitSchema.optional(),
  normalizedValue: z7.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/).optional(),
  normalizedUnit: EvidenceUnitSchema
}).strict().superRefine((value, context) => {
  if (value.state === "KNOWN" && value.normalizedValue === void 0) {
    context.addIssue({
      code: "custom",
      message: "Known evidence requires a normalized decimal-string value."
    });
  }
  if (value.state !== "KNOWN" && value.normalizedValue === "0") {
    context.addIssue({
      code: "custom",
      message: "Missing or unavailable values must not be encoded as zero."
    });
  }
}).meta({ id: "EvidenceValue", "x-data-classification": "C3" });
var EvidenceRecordSchema = z7.object({
  evidenceId: UuidSchema,
  plotId: UuidSchema,
  kind: EvidenceKindSchema,
  metricKey: z7.string().min(1).max(120),
  value: EvidenceValueSchema,
  observedAt: TimestampSchema.optional(),
  receivedAt: TimestampSchema,
  forecastFor: TimestampSchema.optional(),
  source: EvidenceSourceSchema,
  dataMode: DataModeSchema,
  quality: EvidenceQualitySchema,
  freshness: EvidenceFreshnessSchema,
  decisionEligible: z7.boolean(),
  limitations: z7.array(z7.string().min(1).max(220)).max(12).default([]),
  correctionOfEvidenceId: UuidSchema.optional(),
  invalidatedAt: TimestampSchema.optional(),
  policyVersion: z7.string().min(1).max(120),
  conversionVersion: z7.string().min(1).max(120),
  calibrationVersion: z7.string().min(1).max(120).optional()
}).strict().meta({ id: "EvidenceRecord", "x-data-classification": "C3" });
var EvidenceSummaryCardSchema = z7.object({
  cardId: z7.string().min(1).max(80),
  title: z7.string().min(1).max(120),
  status: z7.enum([
    "CURRENT",
    "STALE",
    "EMPTY",
    "OFFLINE",
    "DENIED",
    "CONFLICTING",
    "UNAVAILABLE"
  ]),
  primary: EvidenceRecordSchema.optional(),
  records: z7.array(EvidenceRecordSchema).max(12)
}).strict().meta({ id: "EvidenceSummaryCard", "x-data-classification": "C3" });
var PlotEvidenceSummarySchema = z7.object({
  plotId: UuidSchema,
  generatedAt: TimestampSchema,
  summaryVersion: RevisionSchema,
  cards: z7.array(EvidenceSummaryCardSchema).max(12)
}).strict().meta({ id: "PlotEvidenceSummary", "x-data-classification": "C3" });
var CreateSoilRecordRequestSchema = z7.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  measurement: SoilMeasurementSchema.extend({
    sourceReference: z7.string().min(1).max(200),
    sourceRightsLabel: z7.string().min(1).max(160),
    sourceVersion: z7.string().min(1).max(120)
  }).strict(),
  clientContext: z7.object({
    clientRecordedAt: TimestampSchema,
    timezone: z7.literal("Asia/Kolkata"),
    dataModeClaim: DataModeSchema
  }).strict()
}).strict().meta({ id: "CreateSoilRecordRequest", "x-data-classification": "C3" });
var SoilRecordResponseSchema = z7.object({
  commandId: UuidSchema,
  disposition: z7.enum(["ACCEPTED", "ALREADY_ACCEPTED"]),
  soilRecordId: UuidSchema,
  evidenceIds: z7.array(UuidSchema).min(1).max(8),
  revision: RevisionSchema,
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "SoilRecordResponse", "x-data-classification": "C3" });
var DeviceChallengeRequestSchema = z7.object({
  deviceId: z7.string().min(1).max(160),
  channelId: z7.string().min(1).max(160),
  clientNonce: z7.string().min(16).max(128)
}).strict().meta({ id: "DeviceChallengeRequest", "x-data-classification": "C1" });
var DeviceChallengeResponseSchema = z7.object({
  challengeId: UuidSchema,
  serverNonce: z7.string().min(16).max(128),
  expiresAt: TimestampSchema,
  algorithm: z7.literal("SFKA-HMAC-SHA256-v1")
}).strict().meta({ id: "DeviceChallengeResponse", "x-data-classification": "C1" });
var DeviceObservationSchema = z7.object({
  observationId: UuidSchema,
  observedAt: TimestampSchema,
  signal: z7.enum([
    "SOIL_MOISTURE",
    "AIR_TEMPERATURE",
    "AIR_HUMIDITY",
    "SOIL_PH",
    "SOIL_EC",
    "NITROGEN",
    "PHOSPHORUS",
    "POTASSIUM",
    "BATTERY",
    "RADIO",
    "CLOCK_HEALTH"
  ]),
  value: z7.string().min(1).max(80),
  unit: EvidenceUnitSchema
}).strict().meta({ id: "DeviceObservation", "x-data-classification": "C2" });
var DeviceBatchRequestSchema = z7.object({
  batchId: UuidSchema,
  deviceId: z7.string().min(1).max(160),
  channelId: z7.string().min(1).max(160),
  challengeId: UuidSchema,
  payloadDigest: Sha256DigestSchema,
  signature: z7.string().regex(/^sha256=[0-9a-f]{64}$/),
  observations: z7.array(DeviceObservationSchema).min(1).max(500)
}).strict().meta({ id: "DeviceBatchRequest", "x-data-classification": "C2" });
var DeviceReceiptResponseSchema = z7.object({
  receiptId: UuidSchema,
  batchId: UuidSchema,
  state: z7.enum(["PENDING", "DURABLY_ACCEPTED", "ALREADY_ACCEPTED", "REJECTED"]),
  trustState: z7.literal("PENDING"),
  explicitlyNotAgronomicTrust: z7.literal(true),
  receivedAt: TimestampSchema
}).strict().meta({ id: "DeviceReceiptResponse", "x-data-classification": "C1" });
var EarthJobExecuteRequestSchema = z7.object({
  jobId: UuidSchema,
  plotId: UuidSchema,
  geometryVersion: z7.int().positive(),
  dataset: z7.enum(["CHIRPS", "SENTINEL_2", "SENTINEL_1", "ERA5_LAND", "ELEVATION", "LAND_COVER"]),
  windowStart: TimestampSchema,
  windowEnd: TimestampSchema,
  reducer: z7.string().min(1).max(80),
  scaleMetres: z7.int().positive().max(1e4),
  mode: DataModeSchema
}).strict().meta({ id: "EarthJobExecuteRequest", "x-data-classification": "C3" });
var EarthJobExecuteResponseSchema = z7.object({
  jobId: UuidSchema,
  state: z7.enum(["PROPOSED", "UNAVAILABLE", "RETRYABLE_FAILURE"]),
  snapshotChecksum: Sha256DigestSchema.optional(),
  evidence: z7.array(EvidenceRecordSchema).max(24),
  limitations: z7.array(z7.string().min(1).max(220)).max(12),
  generatedAt: TimestampSchema
}).strict().meta({ id: "EarthJobExecuteResponse", "x-data-classification": "C3" });

// packages/contracts/src/events/index.ts
import { z as z8 } from "zod";

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
      status: "executable"
    },
    {
      name: "farmer.preferences_changed",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "farmer.setup_completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
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
      status: "executable"
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
      status: "executable"
    },
    {
      name: "farm.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "plot.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "plot.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "soil_record.added",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "water_context.updated",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "farm.crop_history_recorded",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "profile.snapshot_created",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
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
      name: "advisory.expired",
      eventClass: "DOMAIN",
      version: 1,
      status: "reserved"
    },
    {
      name: "advisory.deduplicated",
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
      status: "executable"
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
      status: "executable"
    },
    {
      name: "health_media.queued",
      eventClass: "CLIENT_LOCAL",
      version: 1,
      status: "executable"
    },
    {
      name: "health_report.synced",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "health_report.triage_ready",
      eventClass: "TECHNICAL",
      version: 1,
      status: "executable"
    },
    {
      name: "triage.completed",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "triage.escalated",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "triage.escalation_sharing_declined",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
    },
    {
      name: "case.created",
      eventClass: "DOMAIN",
      version: 1,
      status: "executable"
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
      status: "executable"
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
var EventNameSchema = z8.enum(eventNames);
var EventEnvelopeBaseSchema = z8.object({
  eventId: UuidV7Schema,
  eventName: EventNameSchema,
  eventVersion: z8.int().positive(),
  aggregateType: z8.string().min(1).max(80),
  aggregateId: UuidSchema,
  aggregateRevision: z8.int().positive(),
  eventOrdinal: z8.int().positive(),
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
  consentAccessVersion: z8.int().positive().optional(),
  dataMode: DataModeSchema,
  provenanceTypes: z8.array(ProvenanceTypeSchema).min(1).max(9),
  modeDerivationVersion: z8.string().min(1).max(80),
  correlationId: UuidSchema,
  causationId: UuidSchema.optional(),
  traceId: TraceIdSchema.optional(),
  producerService: z8.string().min(1).max(80),
  producerBuild: z8.string().min(1).max(120),
  payloadClassification: DataClassificationSchema,
  retentionClass: z8.string().min(1).max(80),
  payloadSchemaVersion: z8.int().positive(),
  payload: JsonObjectSchema,
  payloadChecksum: Sha256DigestSchema
}).strict();
var EventEnvelopeSchema = EventEnvelopeBaseSchema.meta({
  id: "EventEnvelope",
  "x-data-classification": "C2"
});
var RoleContextCreatedPayloadSchema = z8.object({
  roleContextId: UuidSchema,
  subjectId: UuidSchema,
  roleType: RoleTypeSchema,
  authorizationVersion: z8.int().positive(),
  capabilitySetVersion: z8.int().positive(),
  expiresAt: TimestampSchema
}).strict();
var RoleContextRevokedPayloadSchema = z8.object({
  roleContextId: UuidSchema,
  subjectId: UuidSchema,
  authorizationVersion: z8.int().positive(),
  reasonCode: z8.enum(["USER_SWITCH", "LOGOUT", "GRANT_REVOKED", "SECURITY_VERSION_CHANGED"])
}).strict();
var ConsentDecisionRecordedPayloadSchema = z8.object({
  consentDecisionId: UuidSchema,
  subjectId: UuidSchema,
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z8.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  decision: z8.enum(["ALLOW", "DENY", "WITHDRAW"]),
  accessVersion: z8.int().positive()
}).strict();
var RoleContextCreatedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("identity.role_context_created"),
  payloadClassification: z8.literal("C2"),
  payload: RoleContextCreatedPayloadSchema
}).strict();
var RoleContextRevokedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("identity.role_context_revoked"),
  payloadClassification: z8.literal("C2"),
  payload: RoleContextRevokedPayloadSchema
}).strict();
var ConsentDecisionRecordedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("consent.decision_recorded"),
  payloadClassification: z8.literal("C2"),
  payload: ConsentDecisionRecordedPayloadSchema
}).strict();
var MilestoneOneEventSchema = z8.discriminatedUnion("eventName", [
  RoleContextCreatedEventSchema,
  RoleContextRevokedEventSchema,
  ConsentDecisionRecordedEventSchema
]).meta({ id: "MilestoneOneEvent", "x-data-classification": "C2" });
var SyncLifecyclePayloadSchema = z8.object({
  streamId: UuidSchema,
  batchId: UuidSchema.optional(),
  commandId: UuidSchema.optional(),
  conflictId: UuidSchema.optional(),
  disposition: z8.enum(["ACCEPTED", "ALREADY_ACCEPTED", "REJECTED", "CONFLICT"]).optional()
}).strict();
var SyncLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum([
    "sync.batch_started",
    "sync.event_accepted",
    "sync.event_already_accepted",
    "sync.event_rejected",
    "sync.conflict_detected",
    "sync.conflict_resolved"
  ]),
  payloadClassification: z8.literal("C2"),
  payload: SyncLifecyclePayloadSchema
}).strict();
var MediaUploadVerifiedPayloadSchema = z8.object({
  assetId: UuidSchema,
  derivativeId: UuidSchema,
  purpose: z8.enum([
    "CROP_HEALTH_IMAGE",
    "DIARY_MEDIA",
    "RSK_VISIT_EVIDENCE",
    "SENSOR_MAINTENANCE_EVIDENCE",
    "VOICE_OFFLINE_AUDIO"
  ]),
  sourceChecksum: Sha256DigestSchema,
  derivativeChecksum: Sha256DigestSchema,
  scannerVersion: z8.string().min(1).max(80)
}).strict();
var MediaUploadVerifiedEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("media.upload_verified"),
  payloadClassification: z8.literal("C2"),
  payload: MediaUploadVerifiedPayloadSchema
}).strict();
var VoiceLifecyclePayloadSchema = z8.object({
  sessionId: UuidSchema,
  proposalId: UuidSchema.optional(),
  offlineAudioRefId: UuidSchema.optional(),
  lifecycleState: z8.string().min(1).max(80),
  payloadHash: Sha256DigestSchema.optional(),
  detailCode: z8.string().min(1).max(80).optional()
}).strict();
var VoiceLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum([
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
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: VoiceLifecyclePayloadSchema
}).strict();
var MilestoneTwoEventSchema = z8.union([
  MilestoneOneEventSchema,
  SyncLifecycleEventSchema,
  MediaUploadVerifiedEventSchema,
  VoiceLifecycleEventSchema
]).meta({ id: "MilestoneTwoEvent", "x-data-classification": "C3" });
var FarmerSetupLifecyclePayloadSchema = z8.object({
  draftId: UuidSchema.optional(),
  farmId: UuidSchema.optional(),
  plotId: UuidSchema.optional(),
  setupStatus: z8.enum(["NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "COMPLETE", "NEEDS_REVIEW"]).optional(),
  revision: z8.int().nonnegative()
}).strict();
var FarmerSetupLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum([
    "farmer.setup_saved",
    "farmer.preferences_changed",
    "farmer.setup_completed",
    "identity.device_mode_changed",
    "farm.created",
    "farm.updated",
    "plot.created",
    "plot.updated",
    "soil_record.added",
    "water_context.updated",
    "farm.crop_history_recorded",
    "profile.snapshot_created"
  ]),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: FarmerSetupLifecyclePayloadSchema
}).strict();
var MilestoneThreeEventSchema = z8.union([MilestoneTwoEventSchema, FarmerSetupLifecycleEventSchema]).meta({ id: "MilestoneThreeEvent", "x-data-classification": "C3" });
var HealthReportLifecyclePayloadSchema = z8.object({
  reportId: UuidSchema,
  plotId: UuidSchema,
  state: z8.enum(["DRAFT", "SUBMITTED", "TRIAGE_PENDING", "TRIAGED", "MODEL_UNAVAILABLE"]),
  revision: z8.int().nonnegative(),
  mediaCount: z8.int().min(0).max(6).optional(),
  qualityBand: z8.enum(["USABLE", "LIMITED", "UNUSABLE"]).optional()
}).strict();
var HealthMediaLifecyclePayloadSchema = z8.object({
  reportId: UuidSchema,
  assetId: UuidSchema,
  attachmentId: UuidSchema.optional(),
  qualityBand: z8.enum(["USABLE", "LIMITED", "UNUSABLE"]).optional(),
  requiredView: z8.string().min(1).max(80).optional()
}).strict();
var TriageLifecyclePayloadSchema = z8.object({
  triageId: UuidSchema,
  reportId: UuidSchema,
  caseId: UuidSchema.optional(),
  state: z8.enum(["SUPPORTED", "UNSUPPORTED", "UNCLEAR"]),
  severity: z8.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  confidence: z8.enum(["LOW", "MEDIUM", "HIGH"]),
  mandatoryEscalation: z8.boolean(),
  dataMode: DataModeSchema,
  modelProvider: z8.enum(["NONE", "VERTEX_GEMINI", "FIXTURE"])
}).strict();
var CaseLifecyclePayloadSchema = z8.object({
  caseId: UuidSchema,
  reportId: UuidSchema,
  evidencePackId: UuidSchema.optional(),
  status: z8.enum([
    "PENDING_EXPERT",
    "ASSIGNED",
    "AWAITING_FARMER",
    "REPLIED",
    "FOLLOW_UP_DUE",
    "RESOLVED",
    "CLOSED",
    "REOPENED"
  ]),
  severity: z8.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]),
  consentAccessVersion: z8.int().positive()
}).strict();
var RskWorkLifecyclePayloadSchema = z8.object({
  workItemId: UuidSchema,
  caseId: UuidSchema,
  purpose: z8.literal("case.expert_support"),
  status: z8.literal("PENDING_EXPERT"),
  consentAccessVersion: z8.int().positive()
}).strict();
var HealthReportLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum(["health_report.saved", "health_report.synced", "health_report.triage_ready"]),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: HealthReportLifecyclePayloadSchema
}).strict();
var HealthMediaLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum(["health_media.queued", "health_media.attached"]),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: HealthMediaLifecyclePayloadSchema
}).strict();
var TriageLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.enum([
    "triage.completed",
    "triage.escalated",
    "triage.escalation_sharing_declined"
  ]),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: TriageLifecyclePayloadSchema
}).strict();
var CaseLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("case.created"),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: CaseLifecyclePayloadSchema
}).strict();
var RskWorkLifecycleEventSchema = EventEnvelopeBaseSchema.extend({
  eventName: z8.literal("rsk.work_created"),
  payloadClassification: z8.enum(["C2", "C3"]),
  payload: RskWorkLifecyclePayloadSchema
}).strict();
var MilestoneSevenEventSchema = z8.union([
  MilestoneThreeEventSchema,
  HealthReportLifecycleEventSchema,
  HealthMediaLifecycleEventSchema,
  TriageLifecycleEventSchema,
  CaseLifecycleEventSchema,
  RskWorkLifecycleEventSchema
]).meta({ id: "MilestoneSevenEvent", "x-data-classification": "C3" });

// packages/contracts/src/http/auth.ts
import { z as z9 } from "zod";
var ReturnStateRequestSchema = z9.object({
  routeKey: z9.enum(["FARMER_HOME", "RSK_HOME", "MP_HOME"])
}).strict().meta({ id: "ReturnStateRequest", "x-data-classification": "C1" });
var ReturnStateResponseSchema = z9.object({
  returnStateId: UuidSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "ReturnStateResponse", "x-data-classification": "C4" });
var RoleSummarySchema = z9.object({
  roleGrantId: UuidSchema,
  roleType: RoleTypeSchema,
  officeId: UuidSchema.optional(),
  jurisdictionId: UuidSchema.optional(),
  destination: z9.enum(["/farmer/today", "/rsk/work", "/mp/overview"]),
  capabilitySetVersion: z9.int().positive()
}).strict();
var SessionResponseSchema = z9.object({
  subjectId: UuidSchema,
  subjectType: z9.enum(["FARMER", "STAFF"]),
  environment: z9.enum(["local", "preview", "staging", "demo", "production"]),
  mfaState: z9.enum(["NOT_REQUIRED", "CURRENT", "REQUIRED", "EXPIRED"]),
  deviceBindingState: z9.enum(["ACTIVE", "REQUIRED", "REVOKED"]),
  authorizationVersion: z9.int().positive(),
  capabilitySetVersion: z9.int().positive(),
  activeRoleContext: AuthorizationContextSchema.optional(),
  roles: z9.array(RoleSummarySchema).max(12)
}).strict().meta({ id: "SessionResponse", "x-data-classification": "C2" });
var RoleContextResponseSchema = z9.object({
  roleContext: AuthorizationContextSchema,
  issuedAt: TimestampSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "RoleContextResponse", "x-data-classification": "C2" });
var ConsentRecordSchema = z9.object({
  consentDecisionId: UuidSchema.optional(),
  scopeKey: ConsentScopeSchema,
  purposeKey: PurposeCodeSchema,
  targetKind: z9.enum(["ACCOUNT", "ASSISTED_FARMER_CONTEXT"]),
  targetId: UuidSchema,
  state: ConsentStateSchema,
  accessVersion: z9.int().positive(),
  expiresAt: TimestampSchema.optional()
}).strict();
var ConsentListResponseSchema = z9.object({
  items: z9.array(ConsentRecordSchema).max(100),
  revision: RevisionSchema
}).strict().meta({ id: "ConsentListResponse", "x-data-classification": "C2" });
var FarmerBootstrapResponseSchema = z9.object({
  subjectId: UuidSchema,
  locale: z9.enum(["mr", "hi", "en"]),
  onboardingState: z9.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "READY_FOR_REVIEW",
    "COMPLETE",
    "NEEDS_REVIEW"
  ]),
  authorizationVersion: z9.int().positive(),
  capabilities: z9.array(CapabilityKeySchema).max(10),
  farmContextState: z9.enum(["UNAVAILABLE_UNTIL_SETUP", "AVAILABLE"]),
  deviceMode: DeviceModeSelectionSchema,
  setup: FarmerSetupSummarySchema,
  myFarm: MyFarmResponseSchema.optional()
}).strict().meta({ id: "FarmerBootstrapResponse", "x-data-classification": "C3" });
var RskBootstrapResponseSchema = z9.object({
  subjectId: UuidSchema,
  officeId: UuidSchema,
  jurisdictionId: UuidSchema,
  authorizationVersion: z9.int().positive(),
  capabilities: z9.array(CapabilityKeySchema).max(50),
  workState: z9.literal("UNAVAILABLE_UNTIL_WORK_MILESTONE")
}).strict().meta({ id: "RskBootstrapResponse", "x-data-classification": "C1" });
var ProtectedDisclosureRequestSchema = z9.object({
  targetKind: z9.literal("ASSISTED_FARMER_CONTEXT"),
  targetId: UuidSchema,
  purposeKey: z9.literal("assisted.service"),
  expectedAccessVersion: z9.int().positive(),
  fieldSet: z9.literal("CONTACT")
}).strict().meta({ id: "ProtectedDisclosureRequest", "x-data-classification": "C2" });
var ProtectedDisclosureResponseSchema = z9.object({
  targetId: UuidSchema,
  accessVersion: z9.int().positive(),
  fields: z9.object({
    displayName: z9.string().min(1).max(160),
    contact: z9.string().min(1).max(160)
  }).strict(),
  auditedAt: TimestampSchema
}).strict().meta({ id: "ProtectedDisclosureResponse", "x-data-classification": "C3" });
var MpQueryContextResponseSchema = z9.object({
  state: z9.literal("UNAVAILABLE"),
  code: z9.literal("DEPENDENCY_UNAVAILABLE"),
  availableMetricKeys: z9.array(z9.never()).max(0),
  activeRelease: z9.null()
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
    method: "post",
    path: "/v1/farmer/setup-drafts",
    operationId: "saveFarmerSetupDraft",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.setup.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "EXPECTED_REVISION_MISMATCH",
      "CONSENT_OR_ACCESS_VERSION_CHANGED"
    ],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "post",
    path: "/v1/farmer/setup:complete",
    operationId: "completeFarmerSetup",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.setup.complete",
    requestSchema: "CompleteFarmerSetupCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH", "SETUP_INCOMPLETE"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "get",
    path: "/v1/farmer/my-farm",
    operationId: "getMyFarm",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "MyFarmResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/farms",
    operationId: "listFarmerFarms",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "MyFarmResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/farms",
    operationId: "createFarmerFarm",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.farm.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "get",
    path: "/v1/farmer/farms/{farmId}",
    operationId: "getFarmerFarm",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "FarmSetup",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "patch",
    path: "/v1/farmer/farms/{farmId}",
    operationId: "updateFarmerFarm",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.farm.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "post",
    path: "/v1/farmer/farms/{farmId}/plots",
    operationId: "createFarmerPlot",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.plot.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "get",
    path: "/v1/farmer/plots/{plotId}",
    operationId: "getFarmerPlot",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    responseSchema: "FarmSetup",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/plots/{plotId}/evidence-summary",
    operationId: "getFarmerPlotEvidenceSummary",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.evidence.read",
    responseSchema: "PlotEvidenceSummary",
    problemCodes: [...AUTH_PROBLEMS, "STALE_DATA"],
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/today",
    operationId: "getFarmerToday",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.today.read",
    responseSchema: "FarmerTodayResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/advisories",
    operationId: "listFarmerAdvisories",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.advisory.read",
    responseSchema: "FarmerTodayResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/advisories/{advisoryId}",
    operationId: "getFarmerAdvisory",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.advisory.read",
    responseSchema: "AdvisoryResultResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/advisories/{advisoryId}/responses",
    operationId: "respondToFarmerAdvisory",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.advisory.respond",
    requestSchema: "AdvisoryResponseRequest",
    responseSchema: "AdvisoryResponseReceipt",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH", "ADVISORY_EXPIRED"],
    classification: "C3",
    retentionClass: "advisory-response"
  },
  {
    method: "get",
    path: "/v1/farmer/plots/{plotId}/health",
    operationId: "listFarmerHealthReports",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.read",
    responseSchema: "HealthReportListResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/plots/{plotId}/health-reports",
    operationId: "saveFarmerHealthReportDraft",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.write",
    requestSchema: "HealthReportDraftRequest",
    responseSchema: "HealthReportResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "health-report"
  },
  {
    method: "post",
    path: "/v1/farmer/health-reports/{reportId}/media",
    operationId: "attachFarmerHealthMedia",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.write",
    requestSchema: "AttachHealthMediaRequest",
    responseSchema: "HealthReportResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "EXPECTED_REVISION_MISMATCH",
      "MEDIA_NOT_VERIFIED",
      "HEALTH_MEDIA_UNUSABLE"
    ],
    classification: "C3",
    retentionClass: "health-media"
  },
  {
    method: "post",
    path: "/v1/farmer/health-reports/{reportId}:submit",
    operationId: "submitFarmerHealthReport",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.submit",
    requestSchema: "SubmitHealthReportRequest",
    responseSchema: "HealthReportResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "EXPECTED_REVISION_MISMATCH",
      "HEALTH_MEDIA_UNUSABLE",
      "HEALTH_MODEL_UNAVAILABLE"
    ],
    classification: "C3",
    retentionClass: "health-report"
  },
  {
    method: "get",
    path: "/v1/farmer/health-reports/{reportId}",
    operationId: "getFarmerHealthReport",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.read",
    responseSchema: "HealthReportResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/health-reports/{reportId}/case-sharing-decisions",
    operationId: "decideFarmerHealthCaseSharing",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.health.share_case",
    requestSchema: "HealthCaseSharingDecisionRequest",
    responseSchema: "HealthCaseSharingDecisionResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH", "CASE_SHARING_REQUIRED"],
    classification: "C3",
    retentionClass: "case-sharing"
  },
  {
    method: "get",
    path: "/v1/farmer/cases",
    operationId: "listFarmerCases",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.case.read",
    responseSchema: "FarmerCaseListResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/cases/{caseId}",
    operationId: "getFarmerCase",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.case.read",
    responseSchema: "FarmerCaseResponse",
    problemCodes: [...AUTH_PROBLEMS, "CONSENT_OR_ACCESS_VERSION_CHANGED"],
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/plots/{plotId}/recommendation-readiness",
    operationId: "getFarmerRecommendationReadiness",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.read",
    responseSchema: "RecommendationReadinessResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/plots/{plotId}/recommendation-runs",
    operationId: "createFarmerRecommendationRun",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.run",
    requestSchema: "RecommendationRequest",
    responseSchema: "RecommendationRunAcceptedResponse",
    success: [
      {
        status: 202,
        description: "Accepted",
        mediaType: "json",
        responseSchema: "RecommendationRunAcceptedResponse"
      }
    ],
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "EXPECTED_REVISION_MISMATCH",
      "EVIDENCE_INSUFFICIENT",
      "SOURCE_RIGHTS_OR_VERSION_INVALID"
    ],
    classification: "C3",
    retentionClass: "recommendation-request"
  },
  {
    method: "get",
    path: "/v1/farmer/recommendation-runs/{operationId}",
    operationId: "getFarmerRecommendationRun",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.read",
    responseSchema: "RecommendationRunStatusResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "none"
  },
  {
    method: "get",
    path: "/v1/farmer/recommendations/{recommendationId}",
    operationId: "getFarmerRecommendation",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.read",
    responseSchema: "RecommendationResultResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/recommendations/{recommendationId}/review-requests",
    operationId: "createFarmerRecommendationReviewRequest",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.review_request",
    requestSchema: "RecommendationReviewRequest",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "recommendation-review"
  },
  {
    method: "post",
    path: "/v1/farmer/recommendations/{recommendationId}/acceptances",
    operationId: "acceptFarmerRecommendation",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.recommendation.accept",
    requestSchema: "RecommendationAcceptanceRequest",
    responseSchema: "RecommendationAcceptanceResponse",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [
      ...AUTH_PROBLEMS,
      "EXPECTED_REVISION_MISMATCH",
      "SOURCE_VERSION_EXPIRED",
      "SOURCE_RIGHTS_OR_VERSION_INVALID"
    ],
    classification: "C3",
    retentionClass: "recommendation-acceptance"
  },
  {
    method: "post",
    path: "/v1/farmer/seasons/{seasonId}/start-confirmations",
    operationId: "confirmFarmerSeasonStart",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.season.start_confirm",
    requestSchema: "SeasonStartConfirmationRequest",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "season"
  },
  {
    method: "get",
    path: "/v1/farmer/seasons/{seasonId}/calendar",
    operationId: "getFarmerSeasonCalendar",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.calendar.read",
    responseSchema: "SeasonCalendarResponse",
    problemCodes: AUTH_PROBLEMS,
    classification: "C3",
    retentionClass: "none"
  },
  {
    method: "post",
    path: "/v1/farmer/plots/{plotId}/soil-records",
    operationId: "createFarmerSoilRecord",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.soil.write",
    requestSchema: "CreateSoilRecordRequest",
    responseSchema: "SoilRecordResponse",
    success: [
      {
        status: 202,
        description: "Soil evidence record accepted",
        mediaType: "json",
        responseSchema: "SoilRecordResponse"
      }
    ],
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "farmer-evidence"
  },
  {
    method: "patch",
    path: "/v1/farmer/plots/{plotId}",
    operationId: "updateFarmerPlot",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.plot.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "EXPECTED_REVISION_MISMATCH"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "post",
    path: "/v1/farmer/plots/{plotId}/geometry-versions",
    operationId: "createFarmerPlotGeometryVersion",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "farmer.plot.write",
    requestSchema: "SaveFarmerSetupDraftCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "GPS_PERMISSION_DENIED"],
    classification: "C3",
    retentionClass: "farmer-setup"
  },
  {
    method: "patch",
    path: "/v1/farmer/preferences",
    operationId: "updateFarmerPreferences",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "profile.correct",
    requestSchema: "UpdateFarmerPreferencesCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: AUTH_PROBLEMS,
    classification: "C2",
    retentionClass: "farmer-profile"
  },
  {
    method: "post",
    path: "/v1/farmer/device-mode-changes",
    operationId: "changeFarmerDeviceMode",
    surface: "farmer",
    auth: "farmer",
    purpose: "farmer.self_service",
    capability: "device_mode.change",
    requestSchema: "ChangeDeviceModeCommand",
    responseSchema: "CommandResult",
    command: { idempotency: true, expectedRevision: true },
    problemCodes: [...AUTH_PROBLEMS, "DEVICE_BINDING_MISMATCH"],
    classification: "C2",
    retentionClass: "device-binding"
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
    method: "post",
    path: "/ingest/v1/challenges",
    operationId: "createDeviceIngestChallenge",
    surface: "device",
    auth: "none",
    roleContext: "none",
    requestSchema: "DeviceChallengeRequest",
    responseSchema: "DeviceChallengeResponse",
    problemCodes: ["RATE_LIMITED", "DEPENDENCY_UNAVAILABLE"],
    classification: "C1",
    retentionClass: "device-ingest"
  },
  {
    method: "post",
    path: "/ingest/v1/batches",
    operationId: "createDeviceIngestBatch",
    surface: "device",
    auth: "none",
    roleContext: "none",
    requestSchema: "DeviceBatchRequest",
    responseSchema: "DeviceReceiptResponse",
    success: [
      {
        status: 202,
        description: "Telemetry batch durably accepted",
        mediaType: "json",
        responseSchema: "DeviceReceiptResponse"
      }
    ],
    problemCodes: [
      "RATE_LIMITED",
      "PAYLOAD_TOO_LARGE",
      "SIGNATURE_INVALID",
      "REPLAY_DETECTED",
      "CHALLENGE_EXPIRED",
      "DEPENDENCY_UNAVAILABLE"
    ],
    classification: "C2",
    retentionClass: "device-ingest"
  },
  {
    method: "get",
    path: "/ingest/v1/receipts/{receiptId}",
    operationId: "getDeviceIngestReceipt",
    surface: "device",
    auth: "none",
    roleContext: "none",
    responseSchema: "DeviceReceiptResponse",
    problemCodes: ["AUTHORIZATION_DENIED", "DEPENDENCY_UNAVAILABLE"],
    classification: "C1",
    retentionClass: "device-ingest"
  },
  {
    method: "post",
    path: "/internal/v1/intelligence/earth-jobs/{jobId}:execute",
    operationId: "executeEarthObservationJob",
    surface: "internal",
    auth: "internal",
    roleContext: "none",
    requestSchema: "EarthJobExecuteRequest",
    responseSchema: "EarthJobExecuteResponse",
    problemCodes: ["AUTHORIZATION_DENIED", "DEPENDENCY_UNAVAILABLE"],
    classification: "C3",
    retentionClass: "earth-observation"
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
import { z as z10 } from "zod";
var MediaPurposeSchema = z10.enum([
  "CROP_HEALTH_IMAGE",
  "DIARY_MEDIA",
  "RSK_VISIT_EVIDENCE",
  "SENSOR_MAINTENANCE_EVIDENCE",
  "VOICE_OFFLINE_AUDIO"
]);
var MediaOwnerContextSchema = z10.discriminatedUnion("ownerType", [
  z10.object({ ownerType: z10.literal("HEALTH_REPORT"), ownerId: UuidSchema }).strict(),
  z10.object({ ownerType: z10.literal("DIARY_ENTRY"), ownerId: UuidSchema }).strict(),
  z10.object({ ownerType: z10.literal("RSK_VISIT"), ownerId: UuidSchema }).strict(),
  z10.object({ ownerType: z10.literal("SENSOR_MAINTENANCE"), ownerId: UuidSchema }).strict(),
  z10.object({ ownerType: z10.literal("VOICE_SESSION"), ownerId: UuidSchema }).strict()
]);
var MediaVerificationStateSchema = z10.enum([
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
var MediaFailureCodeSchema = z10.enum([
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
var CreateMediaUploadIntentRequestSchema = z10.object({
  mediaProtocolVersion: z10.literal(1),
  purpose: MediaPurposeSchema,
  owner: MediaOwnerContextSchema,
  expectedSha256: Sha256DigestSchema,
  claimedMimeType: z10.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "audio/webm;codecs=opus",
    "audio/wav"
  ]),
  declaredSizeBytes: z10.int().positive().max(15 * 1024 * 1024),
  declaredWidth: z10.int().positive().max(16384).optional(),
  declaredHeight: z10.int().positive().max(16384).optional(),
  declaredDurationSeconds: z10.number().positive().max(120).optional(),
  consentAccessVersion: z10.int().positive()
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
var CreateMediaUploadIntentResponseSchema = z10.object({
  intentId: UuidSchema,
  assetId: UuidSchema,
  state: z10.literal("INTENT_ISSUED"),
  resumableUploadUri: z10.string().url().max(4096),
  generationPrecondition: z10.string().regex(/^[0-9]+$/),
  expiresAt: TimestampSchema
}).strict().meta({ id: "CreateMediaUploadIntentResponse", "x-data-classification": "C4" });
var FinalizeMediaUploadIntentRequestSchema = z10.object({
  objectGeneration: z10.string().regex(/^[0-9]+$/),
  sha256: Sha256DigestSchema,
  finalSizeBytes: z10.int().positive().max(15 * 1024 * 1024)
}).strict().meta({ id: "FinalizeMediaUploadIntentRequest", "x-data-classification": "C3" });
var MediaOperationAcceptedResponseSchema = z10.object({
  operationId: UuidSchema,
  assetId: UuidSchema,
  state: z10.literal("SCANNING"),
  acceptedAt: TimestampSchema
}).strict().meta({ id: "MediaOperationAcceptedResponse", "x-data-classification": "C2" });
var MediaAssetStatusResponseSchema = z10.object({
  assetId: UuidSchema,
  purpose: MediaPurposeSchema,
  state: MediaVerificationStateSchema,
  revision: z10.int().nonnegative(),
  failureCode: MediaFailureCodeSchema.optional(),
  verifiedMimeType: z10.string().min(1).max(120).optional(),
  verifiedSizeBytes: z10.int().positive().optional(),
  derivativeSha256: Sha256DigestSchema.optional(),
  updatedAt: TimestampSchema
}).strict().meta({ id: "MediaAssetStatusResponse", "x-data-classification": "C2" });
var CancelMediaUploadIntentResponseSchema = z10.object({
  intentId: UuidSchema,
  state: z10.literal("CANCELLED"),
  cancelledAt: TimestampSchema
}).strict().meta({ id: "CancelMediaUploadIntentResponse", "x-data-classification": "C2" });
var ScanMediaAssetRequestSchema = z10.object({
  scanRequestVersion: z10.literal(1),
  assetId: UuidSchema,
  storageEventId: UuidSchema
}).strict().meta({ id: "ScanMediaAssetRequest", "x-data-classification": "C1" });
var AttachOfflineAudioRequestSchema = z10.object({
  assetId: UuidSchema,
  localCaptureId: UuidSchema,
  language: z10.enum(["mr", "hi", "en"]),
  sessionId: UuidSchema,
  audioConsentVersion: z10.int().positive(),
  expectedSessionRevision: z10.int().nonnegative()
}).strict().meta({ id: "AttachOfflineAudioRequest", "x-data-classification": "C3" });
var AttachOfflineAudioResponseSchema = z10.object({
  offlineAudioRefId: UuidSchema,
  attachmentId: UuidSchema,
  state: z10.literal("TRANSCRIPTION_PENDING"),
  expiresAt: TimestampSchema
}).strict().meta({ id: "AttachOfflineAudioResponse", "x-data-classification": "C3" });

// packages/contracts/src/privacy/index.ts
import { z as z11 } from "zod";
var MpUnavailableResultSchema = z11.object({
  status: z11.literal("UNAVAILABLE"),
  reasonCode: z11.enum(["NO_ACTIVE_RELEASE", "RELEASE_INVALID", "RELEASE_STALE"])
}).strict().meta({ id: "MpUnavailableResult", "x-data-classification": "C1" });
var MpSuppressedResultSchema = z11.object({
  status: z11.literal("SUPPRESSED"),
  reasonCode: z11.enum(["COHORT_TOO_SMALL", "COMPLEMENTARY_SUPPRESSION", "STICKY_SUPPRESSION"]),
  methodologyId: z11.string().min(1).max(120)
}).strict().meta({ id: "MpSuppressedResult", "x-data-classification": "C1" });
var MpSafeResultSchema = z11.discriminatedUnion("status", [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema
]);

// packages/contracts/src/recommendation/index.ts
import { z as z12 } from "zod";
var RecommendationReadinessStateSchema = z12.enum([
  "CONFIRMED",
  "UNKNOWN",
  "NEEDS_REVIEW",
  "STALE",
  "PROXY",
  "NOT_APPLICABLE"
]);
var RecommendationRunStateSchema = z12.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED_RETRYABLE",
  "FAILED_TERMINAL",
  "CANCELLED",
  "EXPIRED"
]);
var RecommendationResultStateSchema = z12.enum([
  "READY",
  "NEEDS_INPUT",
  "NO_SAFE_RESULT",
  "FAILED"
]);
var RecommendationGateOutcomeSchema = z12.enum([
  "PASS",
  "FAIL",
  "UNKNOWN_BLOCKING",
  "NOT_APPLICABLE"
]);
var RecommendationStartKindSchema = z12.enum(["SOWING", "TRANSPLANTING"]);
var RecommendationStartModeSchema = z12.enum(["PROPOSED", "ACTUAL"]);
var RecommendationRequestSchema = z12.object({
  schemaVersion: z12.literal("recommendation-request-v1"),
  planningSeasonKey: z12.string().min(1).max(80),
  planningSeasonVersion: z12.string().min(1).max(80),
  proposedStartWindow: z12.object({
    kind: RecommendationStartKindSchema,
    earliestDate: z12.iso.date(),
    latestDate: z12.iso.date(),
    timezone: z12.literal("Asia/Kolkata")
  }).strict(),
  cultivationMethod: z12.enum(["TRADITIONAL", "ORGANIC", "MIXED", "UNKNOWN"]),
  landAvailabilityWindow: z12.object({
    availableFrom: z12.iso.date(),
    availableUntil: z12.iso.date()
  }).strict(),
  confirmedAreaRef: z12.object({
    plotId: UuidSchema,
    areaRevision: RevisionSchema
  }).strict(),
  farmerConstraintRefs: z12.array(z12.string().min(1).max(120)).max(20),
  planningContextRevision: RevisionSchema
}).strict().meta({ id: "RecommendationRequest", "x-data-classification": "C3" });
var RecommendationReadinessResponseSchema = z12.object({
  plotId: UuidSchema,
  generatedAt: TimestampSchema,
  planningContextRevision: RevisionSchema,
  groups: z12.object({
    ready: z12.array(
      z12.object({
        key: z12.string().min(1).max(120),
        label: z12.string().min(1).max(160),
        state: RecommendationReadinessStateSchema
      }).strict()
    ),
    needsAttention: z12.array(
      z12.object({
        key: z12.string().min(1).max(120),
        label: z12.string().min(1).max(160),
        state: RecommendationReadinessStateSchema,
        action: z12.string().min(1).max(220)
      }).strict()
    ),
    optionalImprovements: z12.array(
      z12.object({
        key: z12.string().min(1).max(120),
        label: z12.string().min(1).max(160),
        state: RecommendationReadinessStateSchema
      }).strict()
    )
  }).strict()
}).strict().meta({ id: "RecommendationReadinessResponse", "x-data-classification": "C3" });
var RecommendationRunAcceptedResponseSchema = z12.object({
  operationId: UuidSchema,
  state: RecommendationRunStateSchema,
  acceptedAt: TimestampSchema,
  estimatedCompletionSeconds: z12.int().positive().max(600)
}).strict().meta({ id: "RecommendationRunAcceptedResponse", "x-data-classification": "C2" });
var RecommendationRunStatusResponseSchema = z12.object({
  operationId: UuidSchema,
  state: RecommendationRunStateSchema,
  recommendationId: UuidSchema.optional(),
  problemCode: z12.string().min(1).max(120).optional(),
  updatedAt: TimestampSchema
}).strict().meta({ id: "RecommendationRunStatusResponse", "x-data-classification": "C2" });
var RecommendationEvidenceRefSchema = z12.object({
  evidenceId: UuidSchema,
  metricKey: z12.string().min(1).max(120),
  sourceName: z12.string().min(1).max(160),
  freshness: z12.enum(["CURRENT", "DATA_IS_OLD", "NO_RECENT_DATA", "UNAVAILABLE"]),
  quality: z12.enum(["TRUSTED", "USE_WITH_CAUTION", "TREND_ONLY", "DO_NOT_USE"]),
  dataMode: DataModeSchema
}).strict().meta({ id: "RecommendationEvidenceRef", "x-data-classification": "C3" });
var RecommendationCandidateSchema = z12.object({
  candidateId: UuidSchema,
  cropProfileId: z12.string().min(1).max(120),
  cropName: z12.string().min(1).max(120),
  rank: z12.int().positive().max(3),
  suitabilityScore: z12.number().min(0).max(100),
  confidenceScore: z12.number().min(0).max(100),
  waterSafetyScore: z12.number().min(0).max(100),
  seasonFitScore: z12.number().min(0).max(100),
  durationDays: z12.int().positive().max(400),
  reasons: z12.array(z12.string().min(1).max(220)).min(1).max(3),
  risks: z12.array(z12.string().min(1).max(220)).max(3),
  warnings: z12.array(z12.string().min(1).max(220)).max(4),
  evidenceRefs: z12.array(RecommendationEvidenceRefSchema).max(12)
}).strict().meta({ id: "RecommendationCandidate", "x-data-classification": "C3" });
var RecommendationGateResultSchema = z12.object({
  cropProfileId: z12.string().min(1).max(120),
  gateKey: z12.string().min(1).max(120),
  outcome: RecommendationGateOutcomeSchema,
  reason: z12.string().min(1).max(220)
}).strict().meta({ id: "RecommendationGateResult", "x-data-classification": "C3" });
var RecommendationResultResponseSchema = z12.object({
  recommendationId: UuidSchema,
  plotId: UuidSchema,
  state: RecommendationResultStateSchema,
  generatedAt: TimestampSchema,
  expiresAt: TimestampSchema,
  dataMode: DataModeSchema,
  resultVersion: RevisionSchema,
  etagRevision: RevisionSchema,
  snapshotChecksum: Sha256DigestSchema,
  ruleSetVersion: z12.string().min(1).max(120),
  profileSetVersion: z12.string().min(1).max(120),
  templateSetVersion: z12.string().min(1).max(120),
  candidates: z12.array(RecommendationCandidateSchema).max(3),
  blockers: z12.array(z12.string().min(1).max(220)).max(12),
  excluded: z12.array(RecommendationGateResultSchema).max(40),
  modeExplanation: z12.string().min(1).max(240),
  comparisonRows: z12.array(
    z12.object({
      key: z12.string().min(1).max(80),
      label: z12.string().min(1).max(120),
      values: z12.record(z12.string(), z12.string().min(1).max(120))
    }).strict()
  )
}).strict().meta({ id: "RecommendationResultResponse", "x-data-classification": "C3" });
var RecommendationReviewRequestSchema = z12.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  reason: z12.string().min(1).max(500)
}).strict().meta({ id: "RecommendationReviewRequest", "x-data-classification": "C3" });
var RecommendationAcceptanceRequestSchema = z12.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  candidateId: UuidSchema,
  start: z12.object({
    mode: RecommendationStartModeSchema,
    kind: RecommendationStartKindSchema,
    date: z12.iso.date(),
    timezone: z12.literal("Asia/Kolkata")
  }).strict()
}).strict().meta({ id: "RecommendationAcceptanceRequest", "x-data-classification": "C3" });
var RecommendationAcceptanceResponseSchema = z12.object({
  commandId: UuidSchema,
  disposition: z12.enum(["ACCEPTED", "ALREADY_ACCEPTED"]),
  acceptanceId: UuidSchema,
  seasonId: UuidSchema,
  calendarId: UuidSchema,
  taskIds: z12.array(UuidSchema).min(1).max(20),
  seasonState: z12.enum(["PLANNED_AWAITING_START", "ACTIVE"]),
  serverReceivedAt: TimestampSchema
}).strict().meta({ id: "RecommendationAcceptanceResponse", "x-data-classification": "C3" });
var SeasonStartConfirmationRequestSchema = z12.object({
  commandId: UuidSchema,
  expectedRevision: RevisionSchema,
  actualStartDate: z12.iso.date(),
  timezone: z12.literal("Asia/Kolkata")
}).strict().meta({ id: "SeasonStartConfirmationRequest", "x-data-classification": "C3" });
var SeasonCalendarResponseSchema = z12.object({
  seasonId: UuidSchema,
  calendarId: UuidSchema,
  generatedAt: TimestampSchema,
  tasks: z12.array(
    z12.object({
      taskId: UuidSchema,
      title: z12.string().min(1).max(160),
      dueDate: z12.iso.date(),
      state: z12.enum(["PLANNED", "ACTIVE", "DONE", "CANNOT_DO"]),
      source: z12.literal("RECOMMENDATION_ACCEPTANCE")
    }).strict()
  )
}).strict().meta({ id: "SeasonCalendarResponse", "x-data-classification": "C3" });

// packages/contracts/src/sync/index.ts
import { z as z13 } from "zod";
var DeviceModeSchema = z13.enum(DEVICE_MODES).meta({
  id: "DeviceMode",
  "x-data-classification": "C1"
});
var SchemaVersionRangeSchema = z13.object({ minimum: z13.int().positive(), maximum: z13.int().positive() }).strict().refine((range) => range.minimum <= range.maximum, { message: "Invalid version range" });
var SyncStreamOpenRequestSchema = z13.object({
  streamProtocolVersion: z13.literal(1),
  clientBuild: z13.string().min(1).max(80),
  localDatabaseSchemaVersion: z13.int().positive(),
  stakeholder: z13.literal("FARMER").optional(),
  deviceMode: DeviceModeSchema,
  commandVersions: SchemaVersionRangeSchema,
  clientEventVersions: SchemaVersionRangeSchema,
  projectionVersions: SchemaVersionRangeSchema,
  mediaVersions: SchemaVersionRangeSchema,
  priorStreamId: UuidSchema.optional(),
  priorCursor: z13.string().min(1).max(2048).optional()
}).strict().meta({ id: "SyncStreamOpenRequest", "x-data-classification": "C2" });
var SyncStreamOpenResponseSchema = z13.object({
  streamId: UuidSchema,
  subjectDeviceBindingId: UuidSchema,
  stakeholder: z13.literal("FARMER"),
  scope: z13.literal("FARMER_SELF_SERVICE"),
  authorizationVersion: z13.int().positive(),
  acceptedCommandVersions: SchemaVersionRangeSchema,
  acceptedClientEventVersions: SchemaVersionRangeSchema,
  acceptedProjectionVersions: SchemaVersionRangeSchema,
  acceptedMediaVersions: SchemaVersionRangeSchema,
  maximumBatchCommands: z13.int().min(1).max(100),
  maximumBatchBytes: z13.int().min(1).max(524288),
  serverTime: TimestampSchema,
  serverTimeSignature: z13.string().min(16).max(2048),
  cursor: z13.string().min(1).max(2048),
  bootstrapRequired: z13.boolean()
}).strict().meta({ id: "SyncStreamOpenResponse", "x-data-classification": "C2" });
var SyncCommandBaseSchema = z13.object({
  commandId: UuidSchema,
  clientEventIds: z13.array(UuidSchema).min(1).max(100),
  commandSchemaVersion: z13.literal(1),
  expectedRevision: RevisionSchema,
  occurredAt: TimestampSchema,
  timezone: z13.string().min(1).max(64),
  localSequence: z13.int().positive(),
  causalCommandIds: z13.array(UuidSchema).max(100),
  requestHash: Sha256DigestSchema
});
var SyncConsentCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("RecordConsentDecision"),
  target: ConsentDecisionCommandTargetSchema,
  payload: ConsentDecisionPayloadSchema
}).strict().meta({ id: "SyncConsentCommandEnvelope", "x-data-classification": "C2" });
var SyncSaveFarmerSetupDraftCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("SaveFarmerSetupDraft"),
  target: FarmerSetupDraftCommandTargetSchema,
  payload: SaveFarmerSetupDraftPayloadSchema
}).strict().meta({ id: "SyncSaveFarmerSetupDraftCommandEnvelope", "x-data-classification": "C3" });
var SyncCompleteFarmerSetupCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("CompleteFarmerSetup"),
  target: FarmerSetupCommandTargetSchema,
  payload: CompleteFarmerSetupPayloadSchema
}).strict().meta({ id: "SyncCompleteFarmerSetupCommandEnvelope", "x-data-classification": "C3" });
var SyncUpdateFarmerPreferencesCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("UpdateFarmerPreferences"),
  target: FarmerPreferencesCommandTargetSchema,
  payload: UpdateFarmerPreferencesPayloadSchema
}).strict().meta({ id: "SyncUpdateFarmerPreferencesCommandEnvelope", "x-data-classification": "C2" });
var SyncChangeDeviceModeCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("ChangeDeviceMode"),
  target: DeviceModeCommandTargetSchema,
  payload: DeviceModeChangePayloadSchema
}).strict().meta({ id: "SyncChangeDeviceModeCommandEnvelope", "x-data-classification": "C2" });
var SyncRespondToAdvisoryCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("RespondToAdvisory"),
  target: AdvisoryCommandTargetSchema,
  payload: AdvisoryResponseRequestSchema.omit({ commandId: true, expectedRevision: true })
}).strict().meta({ id: "SyncRespondToAdvisoryCommandEnvelope", "x-data-classification": "C3" });
var SyncSaveHealthReportDraftCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("SaveHealthReportDraft"),
  target: HealthReportCommandTargetSchema,
  payload: HealthReportDraftRequestSchema.omit({ commandId: true, expectedRevision: true })
}).strict().meta({ id: "SyncSaveHealthReportDraftCommandEnvelope", "x-data-classification": "C3" });
var SyncAttachHealthMediaCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("AttachHealthMedia"),
  target: HealthReportCommandTargetSchema,
  payload: AttachHealthMediaRequestSchema.omit({ commandId: true, expectedRevision: true })
}).strict().meta({ id: "SyncAttachHealthMediaCommandEnvelope", "x-data-classification": "C3" });
var SyncSubmitHealthReportCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("SubmitHealthReport"),
  target: HealthReportCommandTargetSchema,
  payload: SubmitHealthReportRequestSchema.omit({ commandId: true, expectedRevision: true })
}).strict().meta({ id: "SyncSubmitHealthReportCommandEnvelope", "x-data-classification": "C3" });
var SyncDecideHealthCaseSharingCommandEnvelopeSchema = SyncCommandBaseSchema.extend({
  operation: z13.literal("DecideHealthCaseSharing"),
  target: HealthCaseSharingCommandTargetSchema,
  payload: HealthCaseSharingDecisionRequestSchema.omit({
    commandId: true,
    expectedRevision: true
  })
}).strict().meta({ id: "SyncDecideHealthCaseSharingCommandEnvelope", "x-data-classification": "C3" });
var SyncCommandEnvelopeSchema = z13.discriminatedUnion("operation", [
  SyncConsentCommandEnvelopeSchema,
  SyncSaveFarmerSetupDraftCommandEnvelopeSchema,
  SyncCompleteFarmerSetupCommandEnvelopeSchema,
  SyncUpdateFarmerPreferencesCommandEnvelopeSchema,
  SyncChangeDeviceModeCommandEnvelopeSchema,
  SyncRespondToAdvisoryCommandEnvelopeSchema,
  SyncSaveHealthReportDraftCommandEnvelopeSchema,
  SyncAttachHealthMediaCommandEnvelopeSchema,
  SyncSubmitHealthReportCommandEnvelopeSchema,
  SyncDecideHealthCaseSharingCommandEnvelopeSchema
]).meta({ id: "SyncCommandEnvelope", "x-data-classification": "C3" });
var SyncCommandEnvelopeV2Schema = z13.object({
  commandId: UuidSchema,
  clientEventIds: z13.array(UuidSchema).min(1).max(100),
  operation: z13.literal("RecordConsentDecision"),
  commandSchemaVersion: z13.literal(1),
  target: ConsentDecisionCommandTargetSchema,
  expectedRevision: RevisionSchema,
  occurredAt: TimestampSchema,
  timezone: z13.string().min(1).max(64),
  localSequence: z13.int().positive(),
  causalCommandIds: z13.array(UuidSchema).max(100),
  requestHash: Sha256DigestSchema,
  payload: ConsentDecisionPayloadSchema
}).strict().meta({ id: "SyncCommandEnvelopeV2", "x-data-classification": "C2" });
var SyncBatchSchema = z13.object({
  syncBatchVersion: z13.literal(1),
  batchId: UuidSchema,
  streamId: UuidSchema,
  cursor: z13.string().min(1).max(2048),
  clientBuild: z13.string().min(1).max(80),
  commands: z13.array(SyncCommandEnvelopeSchema).max(100),
  feedLimit: z13.int().min(1).max(100)
}).strict().meta({ id: "SyncBatch", "x-data-classification": "C2" });
var SyncDispositionBaseSchema = z13.object({
  commandId: UuidSchema,
  clientEventIds: z13.array(UuidSchema).min(1).max(100),
  acknowledgementId: UuidSchema,
  serverReceivedAt: TimestampSchema
});
var SyncAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z13.literal("ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z13.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncAlreadyAcceptedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z13.literal("ALREADY_ACCEPTED"),
  authoritativeRevision: RevisionSchema,
  serverEventIds: z13.array(UuidV7Schema).min(1).max(20)
}).strict();
var SyncRejectedDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z13.literal("REJECTED"),
  problemCode: ProblemCodeSchema,
  authoritativeRevision: RevisionSchema.optional(),
  serverEventIds: z13.array(UuidV7Schema).max(0)
}).strict();
var SyncConflictDispositionSchema = SyncDispositionBaseSchema.extend({
  disposition: z13.literal("CONFLICT"),
  problemCode: ProblemCodeSchema,
  conflictId: UuidSchema,
  authoritativeRevision: RevisionSchema,
  serverEventIds: z13.array(UuidV7Schema).max(0)
}).strict();
var SyncCommandDispositionSchema = z13.discriminatedUnion("disposition", [
  SyncAcceptedDispositionSchema,
  SyncAlreadyAcceptedDispositionSchema,
  SyncRejectedDispositionSchema,
  SyncConflictDispositionSchema
]).meta({ id: "SyncCommandDisposition", "x-data-classification": "C2" });
var SyncIntegrationEventSchema = MilestoneOneEventSchema;
var SyncIntegrationEventV2Schema = MilestoneSevenEventSchema;
var SyncProjectionDeltaSchema = z13.object({
  projectionType: z13.string().min(1).max(80),
  projectionId: UuidSchema,
  projectionSchemaVersion: z13.int().positive(),
  authoritativeRevision: RevisionSchema,
  changeType: z13.enum(["UPSERT", "TOMBSTONE"]),
  dataMode: DataModeSchema,
  payloadClassification: z13.enum(["C0", "C1", "C2", "C3"]),
  payload: JsonObjectSchema,
  payloadChecksum: Sha256DigestSchema
}).strict().meta({ id: "SyncProjectionDelta", "x-data-classification": "C2" });
var SyncFeedEventSchema = z13.object({
  feedEventId: UuidV7Schema,
  sequence: z13.int().positive(),
  integrationEvent: SyncIntegrationEventSchema,
  projectionDeltas: z13.array(SyncProjectionDeltaSchema).max(100)
}).strict().meta({ id: "SyncFeedEvent", "x-data-classification": "C2" });
var SyncFeedEventV2Schema = SyncFeedEventSchema.extend({
  integrationEvent: SyncIntegrationEventV2Schema
}).strict().meta({ id: "SyncFeedEventV2", "x-data-classification": "C3" });
var SyncBatchResponseSchema = z13.object({
  batchId: UuidSchema,
  dispositions: z13.array(SyncCommandDispositionSchema).max(100),
  feedEvents: z13.array(SyncFeedEventSchema).max(100),
  nextCursor: z13.string().min(1).max(2048),
  highWaterMark: z13.string().min(1).max(2048),
  hasMore: z13.boolean(),
  serverTime: TimestampSchema,
  authorizationVersion: z13.int().positive()
}).strict().meta({ id: "SyncBatchResponse", "x-data-classification": "C2" });
var SyncBatchResponseV2Schema = SyncBatchResponseSchema.extend({
  feedEvents: z13.array(SyncFeedEventV2Schema).max(100)
}).strict().meta({ id: "SyncBatchResponseV2", "x-data-classification": "C3" });
var SyncBootstrapRequestSchema = z13.object({
  bootstrapVersion: z13.literal(1),
  streamId: UuidSchema,
  localDatabaseSchemaVersion: z13.int().positive(),
  supportedProjectionVersions: SchemaVersionRangeSchema
}).strict().meta({ id: "SyncBootstrapRequest", "x-data-classification": "C2" });
var SyncTombstoneSchema = z13.object({
  projectionType: z13.string().min(1).max(80),
  projectionId: UuidSchema,
  deletionEpoch: z13.int().positive(),
  minimumResurrectionRevision: RevisionSchema
}).strict();
var SyncBootstrapResponseSchema = z13.object({
  streamId: UuidSchema,
  snapshotSchemaVersion: z13.int().positive(),
  snapshotChecksum: Sha256DigestSchema,
  generatedAt: TimestampSchema,
  expiresAt: TimestampSchema,
  projections: z13.array(SyncProjectionDeltaSchema).max(5e3),
  tombstones: z13.array(SyncTombstoneSchema).max(5e3),
  highWaterMark: z13.string().min(1).max(2048),
  cursor: z13.string().min(1).max(2048),
  authorizationVersion: z13.int().positive()
}).strict().meta({ id: "SyncBootstrapResponse", "x-data-classification": "C2" });
var SyncFeedPageResponseSchema = SyncBatchResponseSchema.omit({
  batchId: true,
  dispositions: true
}).meta({ id: "SyncFeedPageResponse", "x-data-classification": "C2" });
var SyncFeedPageResponseV2Schema = SyncBatchResponseV2Schema.omit({
  batchId: true,
  dispositions: true
}).meta({ id: "SyncFeedPageResponseV2", "x-data-classification": "C3" });
var SyncCommandStatusResponseSchema = z13.object({ command: SyncCommandDispositionSchema }).strict().meta({ id: "SyncCommandStatusResponse", "x-data-classification": "C2" });
var SyncConflictTypeSchema = z13.enum([
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
var SyncConflictSchema = z13.object({
  conflictId: UuidSchema,
  conflictType: SyncConflictTypeSchema,
  revision: RevisionSchema,
  commandId: UuidSchema,
  clientEventIds: z13.array(UuidSchema).min(1).max(100),
  targetType: z13.string().min(1).max(80),
  targetId: UuidSchema,
  localRevision: RevisionSchema,
  authoritativeRevision: RevisionSchema,
  localSummary: JsonObjectSchema,
  authoritativeSummary: JsonObjectSchema,
  allowedActions: z13.array(z13.enum(["CREATE_NEW_COMMAND", "KEEP_BOTH_FACTS", "DISCARD_LOCAL_PROPOSAL"])).min(1).max(3),
  state: z13.enum(["OPEN", "RESOLUTION_PENDING", "RESOLVED", "LOCKED_RECOVERY"]),
  createdAt: TimestampSchema
}).strict().meta({ id: "SyncConflict", "x-data-classification": "C2" });
var SyncConflictListResponseSchema = z13.object({
  conflicts: z13.array(SyncConflictSchema).max(100),
  nextCursor: z13.string().max(2048).optional()
}).strict().meta({ id: "SyncConflictListResponse", "x-data-classification": "C2" });
var SyncConflictResolutionRequestSchema = z13.object({
  resolutionSchemaVersion: z13.literal(1),
  conflictId: UuidSchema,
  expectedConflictRevision: RevisionSchema,
  action: z13.enum(["CREATE_NEW_COMMAND", "KEEP_BOTH_FACTS", "DISCARD_LOCAL_PROPOSAL"]),
  resolutionCommandId: UuidSchema,
  payloadHash: Sha256DigestSchema
}).strict().meta({ id: "SyncConflictResolutionRequest", "x-data-classification": "C2" });

// packages/contracts/src/voice/index.ts
import { z as z14 } from "zod";
var VoiceLanguageSchema = z14.enum(["mr", "hi", "en"]);
var VoiceSessionStateSchema = z14.enum([
  "CREATED",
  "READY",
  "RECONNECTING",
  "EXPIRING",
  "CLOSED",
  "UNAVAILABLE"
]);
var VoiceDelegationSchema = z14.object({
  subjectId: UuidSchema,
  roleContextId: UuidSchema,
  roleType: RoleTypeSchema,
  purpose: PurposeCodeSchema,
  toolKey: z14.string().min(1).max(120),
  consentAccessVersion: z14.int().positive(),
  sessionId: UuidSchema,
  expiresAt: TimestampSchema
}).strict().meta({ id: "VoiceDelegation", "x-data-classification": "C4" });
var CreateVoiceSessionRequestSchema = z14.object({
  protocolVersion: z14.literal(1),
  language: VoiceLanguageSchema,
  visualRoute: z14.string().min(1).max(240).regex(/^\//),
  contextIds: z14.array(UuidSchema).max(8),
  audioCapabilities: z14.object({ realtime: z14.boolean(), httpsAudio: z14.boolean(), offlineAudio: z14.boolean() }).strict()
}).strict().meta({ id: "CreateVoiceSessionRequest", "x-data-classification": "C2" });
var CreateVoiceSessionResponseSchema = z14.object({
  sessionId: UuidSchema,
  state: z14.literal("CREATED"),
  websocketEndpoint: z14.string().url().refine((value) => value.startsWith("wss://")),
  singleUseTicket: z14.string().regex(/^[A-Za-z0-9_-]{32,512}$/),
  ticketExpiresAt: TimestampSchema,
  sessionExpiresAt: TimestampSchema,
  protocolVersion: z14.literal(1),
  httpsTurnsEndpoint: z14.string().min(1).max(512)
}).strict().meta({ id: "CreateVoiceSessionResponse", "x-data-classification": "C4" });
var VoiceTurnRequestSchema = z14.object({
  turnId: UuidSchema,
  input: z14.discriminatedUnion("type", [
    z14.object({ type: z14.literal("TEXT"), text: z14.string().min(1).max(2e3) }).strict(),
    z14.object({
      type: z14.literal("AUDIO"),
      mimeType: z14.enum(["audio/webm;codecs=opus", "audio/wav"]),
      sha256: Sha256DigestSchema,
      bytesBase64: z14.string().min(4).max(35e4)
    }).strict()
  ]),
  clientSequence: z14.int().positive(),
  acknowledgedServerSequence: z14.int().nonnegative()
}).strict().meta({ id: "VoiceTurnRequest", "x-data-classification": "C4" });
var VoiceTurnResponseSchema = z14.object({
  turnId: UuidSchema,
  sessionId: UuidSchema,
  state: z14.enum([
    "HELP",
    "UNAVAILABLE",
    "NEEDS_CLARIFICATION",
    "PROPOSAL_PENDING",
    "RESULT_READY"
  ]),
  messageKey: z14.string().min(1).max(120),
  proposalId: UuidSchema.optional(),
  result: z14.discriminatedUnion("resultType", [
    z14.object({
      resultType: z14.literal("RECOMMENDATION_READ"),
      recommendationId: UuidSchema,
      summary: z14.string().min(1).max(600),
      openDetailsRoute: z14.string().min(1).max(240).regex(/^\//),
      dataMode: z14.enum(["LIVE", "RECORDED", "SIMULATED"]),
      sourceGeneratedAt: TimestampSchema
    }).strict(),
    z14.object({
      resultType: z14.literal("ADVISORY_READ"),
      advisoryId: UuidSchema,
      summary: z14.string().min(1).max(600),
      openDetailsRoute: z14.string().min(1).max(240).regex(/^\//),
      dataMode: z14.enum(["LIVE", "RECORDED", "SIMULATED"]),
      sourceGeneratedAt: TimestampSchema
    }).strict(),
    z14.object({
      resultType: z14.literal("HEALTH_REPORT_READ"),
      reportId: UuidSchema,
      summary: z14.string().min(1).max(600),
      openDetailsRoute: z14.string().min(1).max(240).regex(/^\//),
      dataMode: z14.enum(["LIVE", "RECORDED", "SIMULATED"]),
      sourceGeneratedAt: TimestampSchema,
      triageState: z14.enum(["SUPPORTED", "UNSUPPORTED", "UNCLEAR", "PENDING"])
    }).strict(),
    z14.object({
      resultType: z14.literal("CASE_READ"),
      caseId: UuidSchema,
      summary: z14.string().min(1).max(600),
      openDetailsRoute: z14.string().min(1).max(240).regex(/^\//),
      dataMode: z14.enum(["LIVE", "RECORDED", "SIMULATED"]),
      sourceGeneratedAt: TimestampSchema,
      caseStatus: z14.string().min(1).max(80)
    }).strict()
  ]).optional(),
  serverSequence: z14.int().positive(),
  acknowledgedClientSequence: z14.int().nonnegative()
}).strict().meta({ id: "VoiceTurnResponse", "x-data-classification": "C2" });
var VoiceProposalStateSchema = z14.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "SUPERSEDED",
  "EXPIRED",
  "EXECUTING",
  "COMPLETE",
  "FAILED"
]);
var VoiceProposalResponseSchema = z14.object({
  proposalId: UuidSchema,
  sessionId: UuidSchema,
  revision: RevisionSchema,
  state: VoiceProposalStateSchema,
  toolKey: z14.string().min(1).max(120),
  payloadHash: Sha256DigestSchema,
  readBack: JsonObjectSchema,
  expiresAt: TimestampSchema,
  commandId: UuidSchema.optional()
}).strict().meta({ id: "VoiceProposalResponse", "x-data-classification": "C3" });
var VoiceProposalActionBaseSchema = z14.object({
  proposalId: UuidSchema,
  expectedProposalRevision: RevisionSchema,
  commandId: UuidSchema
});
var ConfirmVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({
  payloadHash: Sha256DigestSchema
}).strict().meta({ id: "ConfirmVoiceProposalRequest", "x-data-classification": "C3" });
var CorrectVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({
  correction: JsonObjectSchema
}).strict().meta({ id: "CorrectVoiceProposalRequest", "x-data-classification": "C3" });
var CancelVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.strict().meta({
  id: "CancelVoiceProposalRequest",
  "x-data-classification": "C2"
});
var VoiceCommandStatusResponseSchema = z14.object({
  commandId: UuidSchema,
  state: z14.enum(["UNKNOWN", "IN_PROGRESS", "ACCEPTED", "REJECTED"]),
  receiptReference: UuidSchema.optional()
}).strict().meta({ id: "VoiceCommandStatusResponse", "x-data-classification": "C2" });
var VoiceControlFrameSchema = z14.object({
  protocolVersion: z14.literal(1),
  sessionId: UuidSchema,
  messageId: UuidSchema,
  sequence: z14.int().positive(),
  acknowledgedSequence: z14.int().nonnegative(),
  type: z14.enum([
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
var M5_VOICE_TOOL_KEYS = ["farmer.recommendation.read"];
var M7_VOICE_TOOL_KEYS = [
  "farmer.recommendation.read",
  "farmer.advisory.read",
  "farmer.health.read",
  "farmer.case.read"
];
export {
  ACTOR_TYPES,
  AccessGrantCommandTargetSchema,
  AccessGrantPayloadSchema,
  ActorTypeSchema,
  AdvisoryActionSchema,
  AdvisoryAlertProjectionSchema,
  AdvisoryCommandTargetSchema,
  AdvisoryEvidenceRefSchema,
  AdvisoryKindSchema,
  AdvisoryLifecycleStateSchema,
  AdvisoryReasonSchema,
  AdvisoryResponseReceiptSchema,
  AdvisoryResponseRequestSchema,
  AdvisoryResultResponseSchema,
  AdvisorySeveritySchema,
  AdvisoryUrgencySchema,
  AreaUnitSchema,
  AttachHealthMediaCommandSchema,
  AttachHealthMediaRequestSchema,
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
  CaseLifecycleEventSchema,
  CaseLifecyclePayloadSchema,
  ChangeDeviceModeCommandSchema,
  ClientContextSchema,
  CommandDispositionSchema,
  CommandEnvelopeSchema,
  CommandResultSchema,
  CommandSchema,
  CommandTargetSchema,
  CompleteFarmerSetupCommandSchema,
  CompleteFarmerSetupPayloadSchema,
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
  CreateSoilRecordRequestSchema,
  CreateVoiceSessionRequestSchema,
  CreateVoiceSessionResponseSchema,
  CropDeclarationSchema,
  CropHistoryRecordSchema,
  CropStageSchema,
  DATA_CLASSIFICATIONS,
  DATA_MODES,
  DEVICE_MODES,
  DataClassificationSchema,
  DataModeSchema,
  DecideHealthCaseSharingCommandSchema,
  DeviceBatchReceiptSchema,
  DeviceBatchRequestSchema,
  DeviceChallengeRequestSchema,
  DeviceChallengeResponseSchema,
  DeviceModeChangePayloadSchema,
  DeviceModeCommandTargetSchema,
  DeviceModeSchema,
  DeviceModeSelectionSchema,
  DeviceObservationSchema,
  DeviceReceiptResponseSchema,
  EVENT_CLASSES,
  EarthJobExecuteRequestSchema,
  EarthJobExecuteResponseSchema,
  EventEnvelopeSchema,
  EventNameSchema,
  EvidenceFreshnessSchema,
  EvidenceKindSchema,
  EvidenceQualitySchema,
  EvidenceRecordSchema,
  EvidenceSourceSchema,
  EvidenceSummaryCardSchema,
  EvidenceUnitSchema,
  EvidenceValueSchema,
  EvidenceValueStateSchema,
  FarmSetupSchema,
  FarmerBootstrapResponseSchema,
  FarmerCaseListResponseSchema,
  FarmerCaseResponseSchema,
  FarmerCaseSummarySchema,
  FarmerLocaleSchema,
  FarmerPreferencesCommandTargetSchema,
  FarmerProfileSetupSchema,
  FarmerSetupCommandTargetSchema,
  FarmerSetupDraftCommandTargetSchema,
  FarmerSetupDraftSchema,
  FarmerSetupLifecycleEventSchema,
  FarmerSetupLifecyclePayloadSchema,
  FarmerSetupSummarySchema,
  FarmerTodayResponseSchema,
  FieldErrorSchema,
  FinalizeMediaUploadIntentRequestSchema,
  HealthAnswerSchema,
  HealthCaseSharingCommandTargetSchema,
  HealthCaseSharingDecisionRequestSchema,
  HealthCaseSharingDecisionResponseSchema,
  HealthCaseStatusSchema,
  HealthCategoryKeySchema,
  HealthConfidenceSchema,
  HealthEvidenceQualitySchema,
  HealthMediaLifecycleEventSchema,
  HealthMediaLifecyclePayloadSchema,
  HealthMediaRefSchema,
  HealthMediaViewSchema,
  HealthPayloadSchema,
  HealthQualityBandSchema,
  HealthQuestionKeySchema,
  HealthReportCommandTargetSchema,
  HealthReportDraftRequestSchema,
  HealthReportLifecycleEventSchema,
  HealthReportLifecyclePayloadSchema,
  HealthReportListResponseSchema,
  HealthReportResponseSchema,
  HealthReportStateSchema,
  HealthSeveritySchema,
  HealthSharingDecisionSchema,
  HealthSpreadSchema,
  HealthStatusSchema,
  HealthTriageCategorySchema,
  HealthTriageResultSchema,
  HealthTriageStateSchema,
  HealthVisionExtractionSchema,
  IssueAccessGrantCommandSchema,
  JsonObjectSchema,
  JsonValueSchema,
  LocationCaptureMethodSchema,
  M2_VOICE_TOOL_KEYS,
  M5_VOICE_TOOL_KEYS,
  M7_VOICE_TOOL_KEYS,
  MediaAssetStatusResponseSchema,
  MediaFailureCodeSchema,
  MediaOperationAcceptedResponseSchema,
  MediaOwnerContextSchema,
  MediaPurposeSchema,
  MediaUploadVerifiedEventSchema,
  MediaUploadVerifiedPayloadSchema,
  MediaVerificationStateSchema,
  MilestoneOneEventSchema,
  MilestoneSevenEventSchema,
  MilestoneThreeEventSchema,
  MilestoneTwoEventSchema,
  MpQueryContextResponseSchema,
  MpSafeResultSchema,
  MpSuppressedResultSchema,
  MpUnavailableResultSchema,
  MyFarmResponseSchema,
  OptionalHardwareStatusSchema,
  PROBLEM_CODES,
  PROVENANCE_TYPES,
  PURPOSE_CODES,
  PlotEvidenceSummarySchema,
  PlotGeometryKindSchema,
  PlotGeometrySummarySchema,
  PlotSetupSchema,
  ProblemCodeSchema,
  ProblemDetailsSchema,
  ProtectedDisclosureRequestSchema,
  ProtectedDisclosureResponseSchema,
  ProvenanceTypeSchema,
  PurposeCodeSchema,
  ROLE_TYPES,
  ROUTES,
  RaigadLocationSchema,
  RecommendationAcceptanceRequestSchema,
  RecommendationAcceptanceResponseSchema,
  RecommendationCandidateSchema,
  RecommendationEvidenceRefSchema,
  RecommendationGateOutcomeSchema,
  RecommendationGateResultSchema,
  RecommendationReadinessResponseSchema,
  RecommendationReadinessStateSchema,
  RecommendationRequestSchema,
  RecommendationResultResponseSchema,
  RecommendationResultStateSchema,
  RecommendationReviewRequestSchema,
  RecommendationRunAcceptedResponseSchema,
  RecommendationRunStateSchema,
  RecommendationRunStatusResponseSchema,
  RecommendationStartKindSchema,
  RecommendationStartModeSchema,
  RecordConsentDecisionCommandSchema,
  RespondToAdvisoryCommandSchema,
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
  RskWorkLifecycleEventSchema,
  RskWorkLifecyclePayloadSchema,
  SaveFarmerSetupDraftCommandSchema,
  SaveFarmerSetupDraftPayloadSchema,
  SaveHealthReportDraftCommandSchema,
  ScanMediaAssetRequestSchema,
  SchemaVersionRangeSchema,
  SeasonCalendarResponseSchema,
  SeasonStartConfirmationRequestSchema,
  SelectRoleContextCommandSchema,
  SelectRoleContextPayloadSchema,
  SessionResponseSchema,
  SetupConsentScopeSchema,
  SetupConsentsSchema,
  SetupLanguageSchema,
  SetupStatusSchema,
  SetupSyncStatusSchema,
  SetupVoiceProposalPayloadSchema,
  SetupVoiceReadResponseSchema,
  Sha256DigestSchema,
  SoilMeasurementSchema,
  SoilRecordResponseSchema,
  SoilSourceSchema,
  SubmitHealthReportCommandSchema,
  SubmitHealthReportRequestSchema,
  SyncAttachHealthMediaCommandEnvelopeSchema,
  SyncBatchResponseSchema,
  SyncBatchResponseV2Schema,
  SyncBatchSchema,
  SyncBootstrapRequestSchema,
  SyncBootstrapResponseSchema,
  SyncChangeDeviceModeCommandEnvelopeSchema,
  SyncCommandDispositionSchema,
  SyncCommandEnvelopeSchema,
  SyncCommandEnvelopeV2Schema,
  SyncCommandStatusResponseSchema,
  SyncCompleteFarmerSetupCommandEnvelopeSchema,
  SyncConflictListResponseSchema,
  SyncConflictResolutionRequestSchema,
  SyncConflictSchema,
  SyncConflictTypeSchema,
  SyncConsentCommandEnvelopeSchema,
  SyncDecideHealthCaseSharingCommandEnvelopeSchema,
  SyncFeedEventSchema,
  SyncFeedEventV2Schema,
  SyncFeedPageResponseSchema,
  SyncFeedPageResponseV2Schema,
  SyncIntegrationEventSchema,
  SyncIntegrationEventV2Schema,
  SyncLifecycleEventSchema,
  SyncLifecyclePayloadSchema,
  SyncProjectionDeltaSchema,
  SyncRespondToAdvisoryCommandEnvelopeSchema,
  SyncSaveFarmerSetupDraftCommandEnvelopeSchema,
  SyncSaveHealthReportDraftCommandEnvelopeSchema,
  SyncStreamOpenRequestSchema,
  SyncStreamOpenResponseSchema,
  SyncSubmitHealthReportCommandEnvelopeSchema,
  SyncTombstoneSchema,
  SyncUpdateFarmerPreferencesCommandEnvelopeSchema,
  TimestampSchema,
  TraceIdSchema,
  TriageLifecycleEventSchema,
  TriageLifecyclePayloadSchema,
  UnavailableSchema,
  UpdateFarmerPreferencesCommandSchema,
  UpdateFarmerPreferencesPayloadSchema,
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
  VoiceTurnResponseSchema,
  WaterAvailabilitySchema,
  WaterContextSchema,
  WaterSourceSchema
};
