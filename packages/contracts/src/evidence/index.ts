import { z } from 'zod';

import {
  DataModeSchema,
  ProvenanceTypeSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';
import { SoilMeasurementSchema } from '../farmer-setup/index.js';

export const EvidenceKindSchema = z.enum([
  'WEATHER_FORECAST',
  'WEATHER_HISTORY',
  'EARTH_OBSERVATION',
  'SOIL_MEASUREMENT',
  'HARDWARE_TELEMETRY',
  'DEVICE_HEALTH',
]);

export const EvidenceQualitySchema = z.enum([
  'TRUSTED',
  'USE_WITH_CAUTION',
  'TREND_ONLY',
  'DO_NOT_USE',
  'PENDING',
]);

export const EvidenceFreshnessSchema = z.enum([
  'CURRENT',
  'DATA_IS_OLD',
  'NO_RECENT_DATA',
  'UNAVAILABLE',
]);

export const EvidenceValueStateSchema = z.enum([
  'KNOWN',
  'UNKNOWN',
  'MISSING',
  'PROXY',
  'CONFLICTING',
  'NOT_APPLICABLE',
  'WITHHELD',
  'UNAVAILABLE',
]);

export const EvidenceUnitSchema = z.enum([
  'CELSIUS',
  'PERCENT',
  'MILLIMETRE',
  'PH',
  'MG_PER_KG',
  'KG_PER_HECTARE',
  'MICROSIEMENS_PER_CM',
  'INDEX',
  'HEALTH_STATE',
  'UNKNOWN',
]);

export const EvidenceSourceSchema = z
  .object({
    sourceId: z.string().min(1).max(160),
    sourceName: z.string().min(1).max(160),
    provenanceType: ProvenanceTypeSchema,
    rightsLabel: z.string().min(1).max(160),
    sourceVersion: z.string().min(1).max(120),
  })
  .strict()
  .meta({ id: 'EvidenceSource', 'x-data-classification': 'C2' });

export const EvidenceValueSchema = z
  .object({
    state: EvidenceValueStateSchema,
    originalValue: z
      .string()
      .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
      .optional(),
    originalUnit: EvidenceUnitSchema.optional(),
    normalizedValue: z
      .string()
      .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/)
      .optional(),
    normalizedUnit: EvidenceUnitSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === 'KNOWN' && value.normalizedValue === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Known evidence requires a normalized decimal-string value.',
      });
    }
    if (value.state !== 'KNOWN' && value.normalizedValue === '0') {
      context.addIssue({
        code: 'custom',
        message: 'Missing or unavailable values must not be encoded as zero.',
      });
    }
  })
  .meta({ id: 'EvidenceValue', 'x-data-classification': 'C3' });

export const EvidenceRecordSchema = z
  .object({
    evidenceId: UuidSchema,
    plotId: UuidSchema,
    kind: EvidenceKindSchema,
    metricKey: z.string().min(1).max(120),
    value: EvidenceValueSchema,
    observedAt: TimestampSchema.optional(),
    receivedAt: TimestampSchema,
    forecastFor: TimestampSchema.optional(),
    source: EvidenceSourceSchema,
    dataMode: DataModeSchema,
    quality: EvidenceQualitySchema,
    freshness: EvidenceFreshnessSchema,
    decisionEligible: z.boolean(),
    limitations: z.array(z.string().min(1).max(220)).max(12).default([]),
    correctionOfEvidenceId: UuidSchema.optional(),
    invalidatedAt: TimestampSchema.optional(),
    policyVersion: z.string().min(1).max(120),
    conversionVersion: z.string().min(1).max(120),
    calibrationVersion: z.string().min(1).max(120).optional(),
  })
  .strict()
  .meta({ id: 'EvidenceRecord', 'x-data-classification': 'C3' });

export const EvidenceSummaryCardSchema = z
  .object({
    cardId: z.string().min(1).max(80),
    title: z.string().min(1).max(120),
    status: z.enum([
      'CURRENT',
      'STALE',
      'EMPTY',
      'OFFLINE',
      'DENIED',
      'CONFLICTING',
      'UNAVAILABLE',
    ]),
    primary: EvidenceRecordSchema.optional(),
    records: z.array(EvidenceRecordSchema).max(12),
  })
  .strict()
  .meta({ id: 'EvidenceSummaryCard', 'x-data-classification': 'C3' });

export const PlotEvidenceSummarySchema = z
  .object({
    plotId: UuidSchema,
    generatedAt: TimestampSchema,
    summaryVersion: RevisionSchema,
    cards: z.array(EvidenceSummaryCardSchema).max(12),
  })
  .strict()
  .meta({ id: 'PlotEvidenceSummary', 'x-data-classification': 'C3' });

export const CreateSoilRecordRequestSchema = z
  .object({
    commandId: UuidSchema,
    expectedRevision: RevisionSchema,
    measurement: SoilMeasurementSchema.extend({
      sourceReference: z.string().min(1).max(200),
      sourceRightsLabel: z.string().min(1).max(160),
      sourceVersion: z.string().min(1).max(120),
    }).strict(),
    clientContext: z
      .object({
        clientRecordedAt: TimestampSchema,
        timezone: z.literal('Asia/Kolkata'),
        dataModeClaim: DataModeSchema,
      })
      .strict(),
  })
  .strict()
  .meta({ id: 'CreateSoilRecordRequest', 'x-data-classification': 'C3' });

export const SoilRecordResponseSchema = z
  .object({
    commandId: UuidSchema,
    disposition: z.enum(['ACCEPTED', 'ALREADY_ACCEPTED']),
    soilRecordId: UuidSchema,
    evidenceIds: z.array(UuidSchema).min(1).max(8),
    revision: RevisionSchema,
    serverReceivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'SoilRecordResponse', 'x-data-classification': 'C3' });

export const DeviceChallengeRequestSchema = z
  .object({
    deviceId: z.string().min(1).max(160),
    channelId: z.string().min(1).max(160),
    clientNonce: z.string().min(16).max(128),
  })
  .strict()
  .meta({ id: 'DeviceChallengeRequest', 'x-data-classification': 'C1' });

export const DeviceChallengeResponseSchema = z
  .object({
    challengeId: UuidSchema,
    serverNonce: z.string().min(16).max(128),
    expiresAt: TimestampSchema,
    algorithm: z.literal('SFKA-HMAC-SHA256-v1'),
  })
  .strict()
  .meta({ id: 'DeviceChallengeResponse', 'x-data-classification': 'C1' });

export const DeviceObservationSchema = z
  .object({
    observationId: UuidSchema,
    observedAt: TimestampSchema,
    signal: z.enum([
      'SOIL_MOISTURE',
      'AIR_TEMPERATURE',
      'AIR_HUMIDITY',
      'SOIL_PH',
      'SOIL_EC',
      'NITROGEN',
      'PHOSPHORUS',
      'POTASSIUM',
      'BATTERY',
      'RADIO',
      'CLOCK_HEALTH',
    ]),
    value: z.string().min(1).max(80),
    unit: EvidenceUnitSchema,
  })
  .strict()
  .meta({ id: 'DeviceObservation', 'x-data-classification': 'C2' });

export const DeviceBatchRequestSchema = z
  .object({
    batchId: UuidSchema,
    deviceId: z.string().min(1).max(160),
    channelId: z.string().min(1).max(160),
    challengeId: UuidSchema,
    payloadDigest: Sha256DigestSchema,
    signature: z.string().regex(/^sha256=[0-9a-f]{64}$/),
    observations: z.array(DeviceObservationSchema).min(1).max(500),
  })
  .strict()
  .meta({ id: 'DeviceBatchRequest', 'x-data-classification': 'C2' });

export const DeviceReceiptResponseSchema = z
  .object({
    receiptId: UuidSchema,
    batchId: UuidSchema,
    state: z.enum(['PENDING', 'DURABLY_ACCEPTED', 'ALREADY_ACCEPTED', 'REJECTED']),
    trustState: z.literal('PENDING'),
    explicitlyNotAgronomicTrust: z.literal(true),
    receivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'DeviceReceiptResponse', 'x-data-classification': 'C1' });

export const EarthJobExecuteRequestSchema = z
  .object({
    jobId: UuidSchema,
    plotId: UuidSchema,
    geometryVersion: z.int().positive(),
    dataset: z.enum(['CHIRPS', 'SENTINEL_2', 'SENTINEL_1', 'ERA5_LAND', 'ELEVATION', 'LAND_COVER']),
    windowStart: TimestampSchema,
    windowEnd: TimestampSchema,
    reducer: z.string().min(1).max(80),
    scaleMetres: z.int().positive().max(10_000),
    mode: DataModeSchema,
  })
  .strict()
  .meta({ id: 'EarthJobExecuteRequest', 'x-data-classification': 'C3' });

export const EarthJobExecuteResponseSchema = z
  .object({
    jobId: UuidSchema,
    state: z.enum(['PROPOSED', 'UNAVAILABLE', 'RETRYABLE_FAILURE']),
    snapshotChecksum: Sha256DigestSchema.optional(),
    evidence: z.array(EvidenceRecordSchema).max(24),
    limitations: z.array(z.string().min(1).max(220)).max(12),
    generatedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'EarthJobExecuteResponse', 'x-data-classification': 'C3' });

export type PlotEvidenceSummary = z.infer<typeof PlotEvidenceSummarySchema>;
export type CreateSoilRecordRequest = z.infer<typeof CreateSoilRecordRequestSchema>;
export type DeviceBatchRequest = z.infer<typeof DeviceBatchRequestSchema>;
