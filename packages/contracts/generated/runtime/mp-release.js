// packages/contracts/src/mp-release.ts
import { z } from "zod";
var PROBLEM_CODES = [
  "AUTHENTICATION_REQUIRED",
  "AUTHORIZATION_DENIED",
  "MFA_REQUIRED",
  "AUTHORIZATION_VERSION_CHANGED",
  "DEVICE_BINDING_MISMATCH",
  "INVALID_STATE_TRANSITION",
  "DEPENDENCY_UNAVAILABLE"
];
var UuidSchema = z.uuid();
var TimestampSchema = z.iso.datetime({ offset: true });
var ProblemCodeSchema = z.enum(PROBLEM_CODES);
var HealthPayloadSchema = z.object({
  service: z.string().min(1).max(80),
  status: z.enum(["ok", "not_ready"]),
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
var MpQueryContextResponseSchema = z.object({
  state: z.literal("UNAVAILABLE"),
  code: z.literal("DEPENDENCY_UNAVAILABLE"),
  availableMetricKeys: z.array(z.never()).max(0),
  activeRelease: z.null()
}).strict().meta({ id: "MpQueryContextResponse", "x-data-classification": "C1" });
var MpUnavailableResultSchema = z.object({
  status: z.literal("UNAVAILABLE"),
  reasonCode: z.enum(["NO_ACTIVE_RELEASE", "RELEASE_INVALID", "RELEASE_STALE"])
}).strict().meta({ id: "MpUnavailableResult", "x-data-classification": "C1" });
var MpSuppressedResultSchema = z.object({
  status: z.literal("SUPPRESSED"),
  reasonCode: z.enum(["COHORT_TOO_SMALL", "COMPLEMENTARY_SUPPRESSION", "STICKY_SUPPRESSION"]),
  methodologyId: z.string().min(1).max(120)
}).strict().meta({ id: "MpSuppressedResult", "x-data-classification": "C1" });
var MpSafeResultSchema = z.discriminatedUnion("status", [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema
]);
export {
  HealthPayloadSchema,
  MpQueryContextResponseSchema,
  MpSafeResultSchema,
  MpSuppressedResultSchema,
  MpUnavailableResultSchema,
  PROBLEM_CODES,
  ProblemDetailsSchema,
  UuidSchema
};
