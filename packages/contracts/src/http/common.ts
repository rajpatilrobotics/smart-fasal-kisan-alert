import { z } from 'zod';

import {
  ACTOR_TYPES,
  CAPABILITY_KEYS,
  CONSENT_SCOPES,
  CONSENT_STATES,
  DATA_CLASSIFICATIONS,
  DATA_MODES,
  PROVENANCE_TYPES,
  PROBLEM_CODES,
  PURPOSE_CODES,
  ROLE_TYPES,
} from '../vocabulary.js';

export const UuidSchema = z.uuid();
export const UuidV7Schema = z.uuidv7();
export const TimestampSchema = z.iso.datetime({ offset: true });
export const RevisionSchema = z.int().nonnegative();
export const Sha256DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
export const TraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/);

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isJsonValue(value: unknown, seen = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;

  seen.add(value);
  let valid: boolean;
  if (Array.isArray(value)) {
    valid = value.every((item) => isJsonValue(item, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    valid =
      (prototype === Object.prototype || prototype === null) &&
      Object.values(value).every((item) => isJsonValue(item, seen));
  }
  seen.delete(value);
  return valid;
}

export const JsonValueSchema = z
  .custom<JsonValue>((value) => isJsonValue(value), { message: 'Expected a JSON wire value' })
  .meta({ id: 'JsonValue' });

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);

export const DataClassificationSchema = z.enum(DATA_CLASSIFICATIONS);
export const DataModeSchema = z.enum(DATA_MODES);
export const ProvenanceTypeSchema = z.enum(PROVENANCE_TYPES);
export const RoleTypeSchema = z.enum(ROLE_TYPES);
export const ActorTypeSchema = z.enum(ACTOR_TYPES);
export const CapabilityKeySchema = z.enum(CAPABILITY_KEYS);
export const ConsentScopeSchema = z.enum(CONSENT_SCOPES);
export const PurposeCodeSchema = z.enum(PURPOSE_CODES);
export const ConsentStateSchema = z.enum(CONSENT_STATES);
export const ProblemCodeSchema = z.enum(PROBLEM_CODES);

export const HealthStatusSchema = z.enum(['ok', 'not_ready']);
export const HealthPayloadSchema = z
  .object({
    service: z.string().min(1).max(80),
    status: HealthStatusSchema,
    timestamp: TimestampSchema,
  })
  .strict()
  .meta({ id: 'HealthPayload', 'x-data-classification': 'C0' });

export const FieldErrorSchema = z
  .object({
    field: z.string().min(1).max(120),
    code: z.string().min(1).max(80),
  })
  .strict();

export const ProblemDetailsSchema = z
  .object({
    type: z.string().url(),
    title: z.string().min(1).max(160),
    status: z.int().min(400).max(599),
    code: ProblemCodeSchema,
    correlationId: UuidSchema,
    retryable: z.boolean(),
    detail: z.string().min(1).max(500).optional(),
    fieldErrors: z.array(FieldErrorSchema).max(25).default([]),
  })
  .strict()
  .meta({ id: 'ProblemDetails', 'x-data-classification': 'C1' });

export const UnavailableSchema = z
  .object({
    state: z.literal('UNAVAILABLE'),
    code: z.literal('DEPENDENCY_UNAVAILABLE'),
    correlationId: UuidSchema,
    retryable: z.boolean(),
  })
  .strict()
  .meta({ id: 'Unavailable', 'x-data-classification': 'C1' });

export const AuthorizationContextSchema = z
  .object({
    environment: z.enum(['local', 'preview', 'staging', 'demo', 'production']),
    subjectId: UuidSchema,
    roleContextId: UuidSchema,
    roleType: RoleTypeSchema,
    officeId: UuidSchema.optional(),
    jurisdictionId: UuidSchema.optional(),
    purposeCode: PurposeCodeSchema,
    authorizationVersion: z.int().positive(),
    capabilitySetVersion: z.int().positive(),
    capabilities: z.array(CapabilityKeySchema).max(CAPABILITY_KEYS.length),
  })
  .strict()
  .meta({ id: 'AuthorizationContext', 'x-data-classification': 'C2' });

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type AuthorizationContext = z.infer<typeof AuthorizationContextSchema>;
