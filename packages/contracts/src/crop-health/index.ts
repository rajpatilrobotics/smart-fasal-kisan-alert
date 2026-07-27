import { z } from 'zod';

import {
  DataModeSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';

export const HealthReportStateSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'TRIAGE_PENDING',
  'TRIAGED',
  'MODEL_UNAVAILABLE',
]);
export const HealthQualityBandSchema = z.enum(['USABLE', 'LIMITED', 'UNUSABLE']);
export const HealthTriageStateSchema = z.enum(['SUPPORTED', 'UNSUPPORTED', 'UNCLEAR']);
export const HealthSeveritySchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);
export const HealthConfidenceSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const HealthSpreadSchema = z.enum(['NOT_SPREADING', 'SPREADING', 'FAST_SPREADING', 'UNKNOWN']);
export const HealthCaseStatusSchema = z.enum([
  'PENDING_EXPERT',
  'ASSIGNED',
  'AWAITING_FARMER',
  'REPLIED',
  'FOLLOW_UP_DUE',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]);
export const HealthSharingDecisionSchema = z.enum(['NOT_REQUESTED', 'PENDING', 'ALLOW', 'DENY']);

export const HealthCategoryKeySchema = z.enum([
  'RICE_LEAF_SPOT_POSSIBLE',
  'RICE_BLAST_POSSIBLE',
  'NUTRIENT_STRESS_POSSIBLE',
  'WATER_STRESS_POSSIBLE',
  'PEST_DAMAGE_POSSIBLE',
  'UNKNOWN_STRESS',
  'UNSUPPORTED_CROP_OR_PART',
]);

export const HealthQuestionKeySchema = z.enum([
  'crop',
  'cropStage',
  'affectedPart',
  'symptomStarted',
  'spread',
  'areaAffected',
  'recentWeather',
  'recentInput',
  'farmerConcern',
]);

export const HealthAnswerSchema = z
  .object({
    questionKey: HealthQuestionKeySchema,
    answer: z.string().min(1).max(500).optional(),
    unknown: z.boolean().default(false),
    language: z.enum(['mr', 'hi', 'en']),
    source: z.enum(['VOICE_DRAFT', 'TYPED', 'GUIDED_CHOICE', 'SYSTEM_CONTEXT']),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.unknown && value.answer !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'Unknown answers must not also carry answer text.',
      });
    }
    if (!value.unknown && value.answer === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'Known answers require answer text.',
      });
    }
  })
  .meta({ id: 'HealthAnswer', 'x-data-classification': 'C3' });

export const HealthMediaViewSchema = z.enum([
  'WHOLE_PLANT',
  'AFFECTED_LEAF_TOP',
  'AFFECTED_LEAF_UNDERSIDE',
  'STEM_OR_BASE',
  'FIELD_CONTEXT',
  'OTHER',
]);

export const HealthMediaRefSchema = z
  .object({
    assetId: UuidSchema,
    attachmentId: UuidSchema.optional(),
    requiredView: HealthMediaViewSchema,
    qualityBand: HealthQualityBandSchema,
    width: z.int().positive().max(16_384).optional(),
    height: z.int().positive().max(16_384).optional(),
    scannerVersion: z.string().min(1).max(80).optional(),
    limitation: z.string().min(1).max(220).optional(),
  })
  .strict()
  .meta({ id: 'HealthMediaRef', 'x-data-classification': 'C3' });

export const HealthEvidenceQualitySchema = z
  .object({
    qualityBand: HealthQualityBandSchema,
    usablePhotoCount: z.int().min(0).max(6),
    limitedPhotoCount: z.int().min(0).max(6),
    unusablePhotoCount: z.int().min(0).max(6),
    missingRequiredContext: z.array(HealthQuestionKeySchema).max(9),
    limitations: z.array(z.string().min(1).max(220)).max(8),
    validatorVersion: z.string().min(1).max(80),
  })
  .strict()
  .meta({ id: 'HealthEvidenceQuality', 'x-data-classification': 'C3' });

export const HealthTriageCategorySchema = z
  .object({
    categoryKey: HealthCategoryKeySchema,
    label: z.string().min(1).max(120),
    confidence: HealthConfidenceSchema,
    evidenceRefs: z.array(z.string().min(1).max(120)).min(1).max(8),
    limitations: z.array(z.string().min(1).max(220)).max(4),
  })
  .strict()
  .meta({ id: 'HealthTriageCategory', 'x-data-classification': 'C3' });

export const HealthTriageResultSchema = z
  .object({
    triageId: UuidSchema,
    reportId: UuidSchema,
    state: HealthTriageStateSchema,
    severity: HealthSeveritySchema,
    confidence: HealthConfidenceSchema,
    spread: HealthSpreadSchema,
    mandatoryEscalation: z.boolean(),
    summary: z.string().min(1).max(360),
    safeNextStep: z.string().min(1).max(260),
    categories: z.array(HealthTriageCategorySchema).max(3),
    evidenceQuality: HealthEvidenceQualitySchema,
    modelProvider: z.enum(['NONE', 'VERTEX_GEMINI', 'FIXTURE']),
    modelName: z.string().min(1).max(120),
    modelVersion: z.string().min(1).max(120),
    policyVersion: z.string().min(1).max(120),
    dataMode: DataModeSchema,
    generatedAt: TimestampSchema,
    unavailableReason: z.string().min(1).max(160).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.evidenceQuality.qualityBand === 'LIMITED' && value.confidence === 'HIGH') {
      ctx.addIssue({
        code: 'custom',
        path: ['confidence'],
        message: 'Limited evidence cannot produce high confidence.',
      });
    }
    if (value.evidenceQuality.qualityBand === 'UNUSABLE' && value.modelProvider !== 'NONE') {
      ctx.addIssue({
        code: 'custom',
        path: ['modelProvider'],
        message: 'Unusable evidence must not be sent to a visual model.',
      });
    }
  })
  .meta({ id: 'HealthTriageResult', 'x-data-classification': 'C3' });

export const HealthVisionExtractionSchema = z
  .object({
    schemaVersion: z.literal('health-vision-extraction-v1'),
    modelName: z.string().min(1).max(120),
    modelVersion: z.string().min(1).max(120),
    state: HealthTriageStateSchema,
    visualQualityBand: HealthQualityBandSchema,
    observedParts: z.array(z.string().min(1).max(80)).max(6),
    observedSymptoms: z.array(z.string().min(1).max(120)).max(8),
    possibleCategories: z.array(HealthTriageCategorySchema).max(3),
    limitations: z.array(z.string().min(1).max(220)).max(8),
    evidenceRefs: z.array(z.string().min(1).max(120)).max(12),
  })
  .strict()
  .meta({ id: 'HealthVisionExtraction', 'x-data-classification': 'C3' });

export const HealthReportDraftRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    schemaVersion: z.literal('health-report-draft-v1'),
    reportId: UuidSchema.optional(),
    cropName: z.string().min(1).max(120),
    language: z.enum(['mr', 'hi', 'en']),
    symptomSummary: z.string().min(1).max(800),
    answers: z.array(HealthAnswerSchema).max(20),
    clientRecordedAt: TimestampSchema,
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'HealthReportDraftRequest', 'x-data-classification': 'C3' });

export const AttachHealthMediaRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    assetId: UuidSchema,
    requiredView: HealthMediaViewSchema,
    consentAccessVersion: z.int().positive(),
    clientRecordedAt: TimestampSchema,
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'AttachHealthMediaRequest', 'x-data-classification': 'C3' });

export const SubmitHealthReportRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    clientSubmittedAt: TimestampSchema,
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'SubmitHealthReportRequest', 'x-data-classification': 'C3' });

export const HealthReportResponseSchema = z
  .object({
    reportId: UuidSchema,
    plotId: UuidSchema,
    farmId: UuidSchema.optional(),
    state: HealthReportStateSchema,
    cropName: z.string().min(1).max(120),
    language: z.enum(['mr', 'hi', 'en']),
    symptomSummary: z.string().min(1).max(800),
    answers: z.array(HealthAnswerSchema).max(20),
    media: z.array(HealthMediaRefSchema).max(6),
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
    submittedAt: TimestampSchema.optional(),
  })
  .strict()
  .meta({ id: 'HealthReportResponse', 'x-data-classification': 'C3' });

export const HealthReportListResponseSchema = z
  .object({
    plotId: UuidSchema,
    generatedAt: TimestampSchema,
    reports: z.array(HealthReportResponseSchema).max(50),
  })
  .strict()
  .meta({ id: 'HealthReportListResponse', 'x-data-classification': 'C3' });

export const HealthCaseSharingDecisionRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    decision: z.enum(['ALLOW', 'DENY']),
    policyVersionId: UuidSchema,
    consentAccessVersion: z.int().positive(),
    clientRecordedAt: TimestampSchema,
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'HealthCaseSharingDecisionRequest', 'x-data-classification': 'C3' });

export const HealthCaseSharingDecisionResponseSchema = z
  .object({
    commandId: UuidSchema,
    disposition: z.enum(['ACCEPTED', 'ALREADY_ACCEPTED']),
    reportId: UuidSchema,
    sharingDecision: z.enum(['ALLOW', 'DENY']),
    caseId: UuidSchema.optional(),
    evidencePackId: UuidSchema.optional(),
    workItemId: UuidSchema.optional(),
    caseStatus: HealthCaseStatusSchema.optional(),
    serverReceivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'HealthCaseSharingDecisionResponse', 'x-data-classification': 'C3' });

export const FarmerCaseSummarySchema = z
  .object({
    caseId: UuidSchema,
    reportId: UuidSchema,
    plotId: UuidSchema,
    status: HealthCaseStatusSchema,
    severity: HealthSeveritySchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    dataMode: DataModeSchema,
    title: z.string().min(1).max(160),
    pendingExpert: z.boolean(),
  })
  .strict()
  .meta({ id: 'FarmerCaseSummary', 'x-data-classification': 'C3' });

export const FarmerCaseResponseSchema = FarmerCaseSummarySchema.extend({
  accessVersion: z.int().positive(),
  evidencePackExpiresAt: TimestampSchema,
  report: HealthReportResponseSchema,
  timeline: z
    .array(
      z
        .object({
          at: TimestampSchema,
          state: HealthCaseStatusSchema,
          label: z.string().min(1).max(180),
        })
        .strict(),
    )
    .min(1)
    .max(20),
})
  .strict()
  .meta({ id: 'FarmerCaseResponse', 'x-data-classification': 'C3' });

export const FarmerCaseListResponseSchema = z
  .object({
    generatedAt: TimestampSchema,
    cases: z.array(FarmerCaseSummarySchema).max(50),
  })
  .strict()
  .meta({ id: 'FarmerCaseListResponse', 'x-data-classification': 'C3' });

export type HealthReportResponse = z.infer<typeof HealthReportResponseSchema>;
export type HealthReportListResponse = z.infer<typeof HealthReportListResponseSchema>;
export type HealthReportDraftRequest = z.infer<typeof HealthReportDraftRequestSchema>;
export type AttachHealthMediaRequest = z.infer<typeof AttachHealthMediaRequestSchema>;
export type SubmitHealthReportRequest = z.infer<typeof SubmitHealthReportRequestSchema>;
export type HealthTriageResult = z.infer<typeof HealthTriageResultSchema>;
export type HealthVisionExtraction = z.infer<typeof HealthVisionExtractionSchema>;
export type HealthCaseSharingDecisionRequest = z.infer<
  typeof HealthCaseSharingDecisionRequestSchema
>;
export type HealthCaseSharingDecisionResponse = z.infer<
  typeof HealthCaseSharingDecisionResponseSchema
>;
export type FarmerCaseListResponse = z.infer<typeof FarmerCaseListResponseSchema>;
export type FarmerCaseResponse = z.infer<typeof FarmerCaseResponseSchema>;
