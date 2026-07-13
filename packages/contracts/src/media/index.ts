import { z } from 'zod';

import { Sha256DigestSchema, TimestampSchema, UuidSchema } from '../http/common.js';

export const MediaPurposeSchema = z.enum([
  'CROP_HEALTH_IMAGE',
  'DIARY_MEDIA',
  'RSK_VISIT_EVIDENCE',
  'SENSOR_MAINTENANCE_EVIDENCE',
  'VOICE_OFFLINE_AUDIO',
]);
export const MediaOwnerContextSchema = z.discriminatedUnion('ownerType', [
  z.object({ ownerType: z.literal('HEALTH_REPORT'), ownerId: UuidSchema }).strict(),
  z.object({ ownerType: z.literal('DIARY_ENTRY'), ownerId: UuidSchema }).strict(),
  z.object({ ownerType: z.literal('RSK_VISIT'), ownerId: UuidSchema }).strict(),
  z.object({ ownerType: z.literal('SENSOR_MAINTENANCE'), ownerId: UuidSchema }).strict(),
  z.object({ ownerType: z.literal('VOICE_SESSION'), ownerId: UuidSchema }).strict(),
]);
export const MediaVerificationStateSchema = z.enum([
  'INTENT_ISSUED',
  'UPLOADED_UNVERIFIED',
  'SCANNING',
  'VERIFIED',
  'ATTACHED',
  'FAILED_RETRYABLE',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
]);
export const MediaFailureCodeSchema = z.enum([
  'GENERATION_MISMATCH',
  'SIZE_MISMATCH',
  'CHECKSUM_MISMATCH',
  'MIME_MISMATCH',
  'UNSUPPORTED_CODEC',
  'DECODER_REJECTED',
  'POLYGLOT_REJECTED',
  'MALWARE_REJECTED',
  'DIMENSION_LIMIT_EXCEEDED',
  'DURATION_LIMIT_EXCEEDED',
  'CONSENT_OR_ACCESS_VERSION_CHANGED',
]);
export const CreateMediaUploadIntentRequestSchema = z
  .object({
    mediaProtocolVersion: z.literal(1),
    purpose: MediaPurposeSchema,
    owner: MediaOwnerContextSchema,
    expectedSha256: Sha256DigestSchema,
    claimedMimeType: z.enum([
      'image/jpeg',
      'image/png',
      'image/webp',
      'audio/webm;codecs=opus',
      'audio/wav',
    ]),
    declaredSizeBytes: z
      .int()
      .positive()
      .max(15 * 1024 * 1024),
    declaredWidth: z.int().positive().max(16_384).optional(),
    declaredHeight: z.int().positive().max(16_384).optional(),
    declaredDurationSeconds: z.number().positive().max(120).optional(),
    consentAccessVersion: z.int().positive(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expectedOwnerType = {
      CROP_HEALTH_IMAGE: 'HEALTH_REPORT',
      DIARY_MEDIA: 'DIARY_ENTRY',
      RSK_VISIT_EVIDENCE: 'RSK_VISIT',
      SENSOR_MAINTENANCE_EVIDENCE: 'SENSOR_MAINTENANCE',
      VOICE_OFFLINE_AUDIO: 'VOICE_SESSION',
    }[value.purpose];
    if (value.owner.ownerType !== expectedOwnerType) {
      ctx.addIssue({
        code: 'custom',
        path: ['owner', 'ownerType'],
        message: 'Owner type does not match media purpose.',
      });
    }
    const imagePurpose = value.purpose !== 'VOICE_OFFLINE_AUDIO';
    const imageMime = value.claimedMimeType.startsWith('image/');
    if (imagePurpose !== imageMime) {
      ctx.addIssue({
        code: 'custom',
        path: ['claimedMimeType'],
        message: 'MIME type does not match media purpose.',
      });
    }
    const maximumBytes =
      value.purpose === 'CROP_HEALTH_IMAGE' ||
      value.purpose === 'DIARY_MEDIA' ||
      value.purpose === 'VOICE_OFFLINE_AUDIO'
        ? 10 * 1024 * 1024
        : 15 * 1024 * 1024;
    if (value.declaredSizeBytes > maximumBytes) {
      ctx.addIssue({
        code: 'custom',
        path: ['declaredSizeBytes'],
        message: 'Declared size exceeds the purpose limit.',
      });
    }
    if (imagePurpose) {
      if (value.declaredWidth === undefined || value.declaredHeight === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['declaredWidth'],
          message: 'Image dimensions are required.',
        });
      }
      if (value.declaredDurationSeconds !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['declaredDurationSeconds'],
          message: 'Images cannot declare audio duration.',
        });
      }
    } else if (value.declaredWidth !== undefined || value.declaredHeight !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['declaredWidth'],
        message: 'Audio cannot declare image dimensions.',
      });
    }
  })
  .meta({ id: 'CreateMediaUploadIntentRequest', 'x-data-classification': 'C3' });
export const CreateMediaUploadIntentResponseSchema = z
  .object({
    intentId: UuidSchema,
    assetId: UuidSchema,
    state: z.literal('INTENT_ISSUED'),
    resumableUploadUri: z.string().url().max(4096),
    generationPrecondition: z.string().regex(/^[0-9]+$/),
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'CreateMediaUploadIntentResponse', 'x-data-classification': 'C4' });
export const FinalizeMediaUploadIntentRequestSchema = z
  .object({
    objectGeneration: z.string().regex(/^[0-9]+$/),
    sha256: Sha256DigestSchema,
    finalSizeBytes: z
      .int()
      .positive()
      .max(15 * 1024 * 1024),
  })
  .strict()
  .meta({ id: 'FinalizeMediaUploadIntentRequest', 'x-data-classification': 'C3' });
export const MediaOperationAcceptedResponseSchema = z
  .object({
    operationId: UuidSchema,
    assetId: UuidSchema,
    state: z.literal('SCANNING'),
    acceptedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'MediaOperationAcceptedResponse', 'x-data-classification': 'C2' });
export const MediaAssetStatusResponseSchema = z
  .object({
    assetId: UuidSchema,
    purpose: MediaPurposeSchema,
    state: MediaVerificationStateSchema,
    revision: z.int().nonnegative(),
    failureCode: MediaFailureCodeSchema.optional(),
    verifiedMimeType: z.string().min(1).max(120).optional(),
    verifiedSizeBytes: z.int().positive().optional(),
    derivativeSha256: Sha256DigestSchema.optional(),
    updatedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'MediaAssetStatusResponse', 'x-data-classification': 'C2' });
export const CancelMediaUploadIntentResponseSchema = z
  .object({
    intentId: UuidSchema,
    state: z.literal('CANCELLED'),
    cancelledAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'CancelMediaUploadIntentResponse', 'x-data-classification': 'C2' });
export const ScanMediaAssetRequestSchema = z
  .object({
    scanRequestVersion: z.literal(1),
    assetId: UuidSchema,
    storageEventId: UuidSchema,
  })
  .strict()
  .meta({ id: 'ScanMediaAssetRequest', 'x-data-classification': 'C1' });
export const AttachOfflineAudioRequestSchema = z
  .object({
    assetId: UuidSchema,
    localCaptureId: UuidSchema,
    language: z.enum(['mr', 'hi', 'en']),
    sessionId: UuidSchema,
    audioConsentVersion: z.int().positive(),
    expectedSessionRevision: z.int().nonnegative(),
  })
  .strict()
  .meta({ id: 'AttachOfflineAudioRequest', 'x-data-classification': 'C3' });
export const AttachOfflineAudioResponseSchema = z
  .object({
    offlineAudioRefId: UuidSchema,
    attachmentId: UuidSchema,
    state: z.literal('TRANSCRIPTION_PENDING'),
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'AttachOfflineAudioResponse', 'x-data-classification': 'C3' });

export type MediaPurpose = z.infer<typeof MediaPurposeSchema>;
export type MediaVerificationState = z.infer<typeof MediaVerificationStateSchema>;
