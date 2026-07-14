import { z } from 'zod';

import {
  DataModeSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';

export const AdvisoryKindSchema = z.enum([
  'DRY_SPELL_RISK',
  'IRRIGATION_NEEDED',
  'IRRIGATION_DELAY_RAIN_EXPECTED',
  'HEAVY_RAIN_WATERLOGGING_RISK',
  'HEAT_HUMIDITY_WEATHER_RISK',
  'LOW_SOIL_MOISTURE',
  'NUTRIENT_PH_GUIDANCE',
  'SENSOR_EVIDENCE_PROBLEM',
]);

export const AdvisorySeveritySchema = z.enum(['INFO', 'WATCH', 'ACTION', 'URGENT']);
export const AdvisoryUrgencySchema = z.enum([
  'TODAY',
  'NEXT_24_HOURS',
  'NEXT_2_TO_3_DAYS',
  'WHEN_POSSIBLE',
]);
export const AdvisoryLifecycleStateSchema = z.enum([
  'GENERATED',
  'ACTIVE',
  'ACKNOWLEDGED',
  'SNOOZED',
  'RESOLVED',
  'EXPIRED',
  'DEDUPLICATED',
]);

export const AdvisoryEvidenceRefSchema = z
  .object({
    evidenceId: UuidSchema,
    metricKey: z.string().min(1).max(120),
    sourceName: z.string().min(1).max(160),
    freshness: z.enum(['CURRENT', 'DATA_IS_OLD', 'NO_RECENT_DATA', 'UNAVAILABLE']),
    quality: z.enum(['TRUSTED', 'USE_WITH_CAUTION', 'TREND_ONLY', 'DO_NOT_USE']),
    dataMode: DataModeSchema,
    observedAt: TimestampSchema.optional(),
    limitation: z.string().min(1).max(220).optional(),
  })
  .strict()
  .meta({ id: 'AdvisoryEvidenceRef', 'x-data-classification': 'C3' });

export const AdvisoryReasonSchema = z
  .object({
    code: z.string().min(1).max(80),
    label: z.string().min(1).max(180),
    contribution: z.number().min(0).max(1),
  })
  .strict()
  .meta({ id: 'AdvisoryReason', 'x-data-classification': 'C3' });

export const AdvisoryActionSchema = z
  .object({
    actionKind: z.enum([
      'IRRIGATE',
      'DELAY_IRRIGATION',
      'MONITOR',
      'PROTECT_CROP',
      'CHECK_SENSOR',
      'CONSULT_RSK',
      'APPLY_NUTRIENT_WITH_CAUTION',
    ]),
    label: z.string().min(1).max(180),
    timingLabel: z.string().min(1).max(180),
    cannotDoAlternative: z.string().min(1).max(220).optional(),
  })
  .strict()
  .meta({ id: 'AdvisoryAction', 'x-data-classification': 'C3' });

export const AdvisoryAlertProjectionSchema = z
  .object({
    alertId: UuidSchema,
    lifecycleState: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'EXPIRED']),
    channel: z.literal('IN_APP'),
    lastInteractionAt: TimestampSchema.optional(),
  })
  .strict()
  .meta({ id: 'AdvisoryAlertProjection', 'x-data-classification': 'C3' });

export const AdvisoryResultResponseSchema = z
  .object({
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
    ruleSetVersion: z.string().min(1).max(120),
    riskScore: z.number().min(0).max(100),
    confidenceScore: z.number().min(0).max(100),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(280),
    recommendedAction: AdvisoryActionSchema,
    why: z.array(AdvisoryReasonSchema).min(1).max(8),
    evidenceRefs: z.array(AdvisoryEvidenceRefSchema).min(1).max(16),
    limitations: z.array(z.string().min(1).max(220)).max(8),
    deduplicationKey: z.string().min(1).max(160),
    supersedesAdvisoryId: UuidSchema.optional(),
    taskId: UuidSchema.optional(),
    alert: AdvisoryAlertProjectionSchema.optional(),
  })
  .strict()
  .meta({ id: 'AdvisoryResultResponse', 'x-data-classification': 'C3' });

export const FarmerTodayResponseSchema = z
  .object({
    generatedAt: TimestampSchema,
    locale: z.enum(['mr-IN', 'hi-IN', 'en-IN']),
    dataMode: DataModeSchema,
    cards: z.array(AdvisoryResultResponseSchema).max(12),
    syncState: z.enum(['SYNCED', 'OFFLINE_CACHE', 'WAITING_FOR_INTERNET', 'LOCKED_RECOVERY']),
  })
  .strict()
  .meta({ id: 'FarmerTodayResponse', 'x-data-classification': 'C3' });

export const AdvisoryResponseRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    response: z.enum(['ACKNOWLEDGE', 'SNOOZE', 'MARK_ACTION_COMPLETED', 'CANNOT_DO']),
    snoozeUntil: TimestampSchema.optional(),
    note: z.string().min(1).max(500).optional(),
    clientRecordedAt: TimestampSchema,
    timezone: z.literal('Asia/Kolkata'),
  })
  .strict()
  .meta({ id: 'AdvisoryResponseRequest', 'x-data-classification': 'C3' });

export const AdvisoryResponseReceiptSchema = z
  .object({
    commandId: UuidSchema,
    disposition: z.enum(['ACCEPTED', 'ALREADY_ACCEPTED']),
    advisoryId: UuidSchema,
    lifecycleState: AdvisoryLifecycleStateSchema,
    eventIds: z.array(UuidSchema).min(1).max(4),
    serverReceivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'AdvisoryResponseReceipt', 'x-data-classification': 'C3' });

export type AdvisoryResultResponse = z.infer<typeof AdvisoryResultResponseSchema>;
export type FarmerTodayResponse = z.infer<typeof FarmerTodayResponseSchema>;
export type AdvisoryResponseRequest = z.infer<typeof AdvisoryResponseRequestSchema>;
export type AdvisoryResponseReceipt = z.infer<typeof AdvisoryResponseReceiptSchema>;
