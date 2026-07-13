import { z } from 'zod';

/**
 * Standalone release-safe MP contracts.
 *
 * Keep this module independent from the operational contract graph: its generated runtime bundle
 * is loaded by mp-query-api and must never contain Farmer, RSK, consent, media or C3 schemas.
 */
export const PROBLEM_CODES = [
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_DENIED',
  'MFA_REQUIRED',
  'AUTHORIZATION_VERSION_CHANGED',
  'DEVICE_BINDING_MISMATCH',
  'INVALID_STATE_TRANSITION',
  'DEPENDENCY_UNAVAILABLE',
] as const;

export const UuidSchema = z.uuid();
const TimestampSchema = z.iso.datetime({ offset: true });
const ProblemCodeSchema = z.enum(PROBLEM_CODES);

export const HealthPayloadSchema = z
  .object({
    service: z.string().min(1).max(80),
    status: z.enum(['ok', 'not_ready']),
    timestamp: TimestampSchema,
  })
  .strict()
  .meta({ id: 'HealthPayload', 'x-data-classification': 'C0' });

const FieldErrorSchema = z
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

export const MpQueryContextResponseSchema = z
  .object({
    state: z.literal('UNAVAILABLE'),
    code: z.literal('DEPENDENCY_UNAVAILABLE'),
    availableMetricKeys: z.array(z.never()).max(0),
    activeRelease: z.null(),
  })
  .strict()
  .meta({ id: 'MpQueryContextResponse', 'x-data-classification': 'C1' });

export const MpUnavailableResultSchema = z
  .object({
    status: z.literal('UNAVAILABLE'),
    reasonCode: z.enum(['NO_ACTIVE_RELEASE', 'RELEASE_INVALID', 'RELEASE_STALE']),
  })
  .strict()
  .meta({ id: 'MpUnavailableResult', 'x-data-classification': 'C1' });

export const MpSuppressedResultSchema = z
  .object({
    status: z.literal('SUPPRESSED'),
    reasonCode: z.enum(['COHORT_TOO_SMALL', 'COMPLEMENTARY_SUPPRESSION', 'STICKY_SUPPRESSION']),
    methodologyId: z.string().min(1).max(120),
  })
  .strict()
  .meta({ id: 'MpSuppressedResult', 'x-data-classification': 'C1' });

export const MpSafeResultSchema = z.discriminatedUnion('status', [
  MpUnavailableResultSchema,
  MpSuppressedResultSchema,
]);

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
