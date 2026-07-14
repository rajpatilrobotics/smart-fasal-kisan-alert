import { z } from 'zod';

import {
  DataModeSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';

export const RecommendationReadinessStateSchema = z.enum([
  'CONFIRMED',
  'UNKNOWN',
  'NEEDS_REVIEW',
  'STALE',
  'PROXY',
  'NOT_APPLICABLE',
]);

export const RecommendationRunStateSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED_RETRYABLE',
  'FAILED_TERMINAL',
  'CANCELLED',
  'EXPIRED',
]);

export const RecommendationResultStateSchema = z.enum([
  'READY',
  'NEEDS_INPUT',
  'NO_SAFE_RESULT',
  'FAILED',
]);

export const RecommendationGateOutcomeSchema = z.enum([
  'PASS',
  'FAIL',
  'UNKNOWN_BLOCKING',
  'NOT_APPLICABLE',
]);

export const RecommendationStartKindSchema = z.enum(['SOWING', 'TRANSPLANTING']);
export const RecommendationStartModeSchema = z.enum(['PROPOSED', 'ACTUAL']);

export const RecommendationRequestSchema = z
  .object({
    schemaVersion: z.literal('recommendation-request-v1'),
    planningSeasonKey: z.string().min(1).max(80),
    planningSeasonVersion: z.string().min(1).max(80),
    proposedStartWindow: z
      .object({
        kind: RecommendationStartKindSchema,
        earliestDate: z.iso.date(),
        latestDate: z.iso.date(),
        timezone: z.literal('Asia/Kolkata'),
      })
      .strict(),
    cultivationMethod: z.enum(['TRADITIONAL', 'ORGANIC', 'MIXED', 'UNKNOWN']),
    landAvailabilityWindow: z
      .object({
        availableFrom: z.iso.date(),
        availableUntil: z.iso.date(),
      })
      .strict(),
    confirmedAreaRef: z
      .object({
        plotId: UuidSchema,
        areaRevision: RevisionSchema,
      })
      .strict(),
    farmerConstraintRefs: z.array(z.string().min(1).max(120)).max(20),
    planningContextRevision: RevisionSchema,
  })
  .strict()
  .meta({ id: 'RecommendationRequest', 'x-data-classification': 'C3' });

export const RecommendationReadinessResponseSchema = z
  .object({
    plotId: UuidSchema,
    generatedAt: TimestampSchema,
    planningContextRevision: RevisionSchema,
    groups: z
      .object({
        ready: z.array(
          z
            .object({
              key: z.string().min(1).max(120),
              label: z.string().min(1).max(160),
              state: RecommendationReadinessStateSchema,
            })
            .strict(),
        ),
        needsAttention: z.array(
          z
            .object({
              key: z.string().min(1).max(120),
              label: z.string().min(1).max(160),
              state: RecommendationReadinessStateSchema,
              action: z.string().min(1).max(220),
            })
            .strict(),
        ),
        optionalImprovements: z.array(
          z
            .object({
              key: z.string().min(1).max(120),
              label: z.string().min(1).max(160),
              state: RecommendationReadinessStateSchema,
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict()
  .meta({ id: 'RecommendationReadinessResponse', 'x-data-classification': 'C3' });

export const RecommendationRunAcceptedResponseSchema = z
  .object({
    operationId: UuidSchema,
    state: RecommendationRunStateSchema,
    acceptedAt: TimestampSchema,
    estimatedCompletionSeconds: z.int().positive().max(600),
  })
  .strict()
  .meta({ id: 'RecommendationRunAcceptedResponse', 'x-data-classification': 'C2' });

export const RecommendationRunStatusResponseSchema = z
  .object({
    operationId: UuidSchema,
    state: RecommendationRunStateSchema,
    recommendationId: UuidSchema.optional(),
    problemCode: z.string().min(1).max(120).optional(),
    updatedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'RecommendationRunStatusResponse', 'x-data-classification': 'C2' });

export const RecommendationEvidenceRefSchema = z
  .object({
    evidenceId: UuidSchema,
    metricKey: z.string().min(1).max(120),
    sourceName: z.string().min(1).max(160),
    freshness: z.enum(['CURRENT', 'DATA_IS_OLD', 'NO_RECENT_DATA', 'UNAVAILABLE']),
    quality: z.enum(['TRUSTED', 'USE_WITH_CAUTION', 'TREND_ONLY', 'DO_NOT_USE']),
    dataMode: DataModeSchema,
  })
  .strict()
  .meta({ id: 'RecommendationEvidenceRef', 'x-data-classification': 'C3' });

export const RecommendationCandidateSchema = z
  .object({
    candidateId: UuidSchema,
    cropProfileId: z.string().min(1).max(120),
    cropName: z.string().min(1).max(120),
    rank: z.int().positive().max(3),
    suitabilityScore: z.number().min(0).max(100),
    confidenceScore: z.number().min(0).max(100),
    waterSafetyScore: z.number().min(0).max(100),
    seasonFitScore: z.number().min(0).max(100),
    durationDays: z.int().positive().max(400),
    reasons: z.array(z.string().min(1).max(220)).min(1).max(3),
    risks: z.array(z.string().min(1).max(220)).max(3),
    warnings: z.array(z.string().min(1).max(220)).max(4),
    evidenceRefs: z.array(RecommendationEvidenceRefSchema).max(12),
  })
  .strict()
  .meta({ id: 'RecommendationCandidate', 'x-data-classification': 'C3' });

export const RecommendationGateResultSchema = z
  .object({
    cropProfileId: z.string().min(1).max(120),
    gateKey: z.string().min(1).max(120),
    outcome: RecommendationGateOutcomeSchema,
    reason: z.string().min(1).max(220),
  })
  .strict()
  .meta({ id: 'RecommendationGateResult', 'x-data-classification': 'C3' });

export const RecommendationResultResponseSchema = z
  .object({
    recommendationId: UuidSchema,
    plotId: UuidSchema,
    state: RecommendationResultStateSchema,
    generatedAt: TimestampSchema,
    expiresAt: TimestampSchema,
    dataMode: DataModeSchema,
    resultVersion: RevisionSchema,
    etagRevision: RevisionSchema,
    snapshotChecksum: Sha256DigestSchema,
    ruleSetVersion: z.string().min(1).max(120),
    profileSetVersion: z.string().min(1).max(120),
    templateSetVersion: z.string().min(1).max(120),
    candidates: z.array(RecommendationCandidateSchema).max(3),
    blockers: z.array(z.string().min(1).max(220)).max(12),
    excluded: z.array(RecommendationGateResultSchema).max(40),
    modeExplanation: z.string().min(1).max(240),
    comparisonRows: z.array(
      z
        .object({
          key: z.string().min(1).max(80),
          label: z.string().min(1).max(120),
          values: z.record(z.string(), z.string().min(1).max(120)),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ id: 'RecommendationResultResponse', 'x-data-classification': 'C3' });

export const RecommendationReviewRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    reason: z.string().min(1).max(500),
  })
  .strict()
  .meta({ id: 'RecommendationReviewRequest', 'x-data-classification': 'C3' });

export const RecommendationAcceptanceRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    candidateId: UuidSchema,
    start: z
      .object({
        mode: RecommendationStartModeSchema,
        kind: RecommendationStartKindSchema,
        date: z.iso.date(),
        timezone: z.literal('Asia/Kolkata'),
      })
      .strict(),
  })
  .strict()
  .meta({ id: 'RecommendationAcceptanceRequest', 'x-data-classification': 'C3' });

export const RecommendationAcceptanceResponseSchema = z
  .object({
    commandId: UuidSchema,
    disposition: z.enum(['ACCEPTED', 'ALREADY_ACCEPTED']),
    acceptanceId: UuidSchema,
    seasonId: UuidSchema,
    calendarId: UuidSchema,
    taskIds: z.array(UuidSchema).min(1).max(20),
    seasonState: z.enum(['PLANNED_AWAITING_START', 'ACTIVE']),
    serverReceivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'RecommendationAcceptanceResponse', 'x-data-classification': 'C3' });

export const SeasonStartConfirmationRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    actualStartDate: z.iso.date(),
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'SeasonStartConfirmationRequest', 'x-data-classification': 'C3' });

export const SeasonCalendarResponseSchema = z
  .object({
    seasonId: UuidSchema,
    calendarId: UuidSchema,
    generatedAt: TimestampSchema,
    tasks: z.array(
      z
        .object({
          taskId: UuidSchema,
          title: z.string().min(1).max(160),
          dueDate: z.iso.date(),
          state: z.enum(['PLANNED', 'ACTIVE', 'DONE', 'CANNOT_DO']),
          source: z.literal('RECOMMENDATION_ACCEPTANCE'),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ id: 'SeasonCalendarResponse', 'x-data-classification': 'C3' });

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;
export type RecommendationReadinessResponse = z.infer<typeof RecommendationReadinessResponseSchema>;
export type RecommendationRunAcceptedResponse = z.infer<
  typeof RecommendationRunAcceptedResponseSchema
>;
export type RecommendationRunStatusResponse = z.infer<typeof RecommendationRunStatusResponseSchema>;
export type RecommendationResultResponse = z.infer<typeof RecommendationResultResponseSchema>;
export type RecommendationCandidate = z.infer<typeof RecommendationCandidateSchema>;
export type RecommendationReviewRequest = z.infer<typeof RecommendationReviewRequestSchema>;
export type RecommendationAcceptanceRequest = z.infer<typeof RecommendationAcceptanceRequestSchema>;
export type RecommendationAcceptanceResponse = z.infer<
  typeof RecommendationAcceptanceResponseSchema
>;
export type SeasonStartConfirmationRequest = z.infer<typeof SeasonStartConfirmationRequestSchema>;
export type SeasonCalendarResponse = z.infer<typeof SeasonCalendarResponseSchema>;
