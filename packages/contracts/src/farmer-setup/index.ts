import { z } from 'zod';

import {
  JsonObjectSchema,
  RevisionSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';

export const SetupStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'COMPLETE',
  'NEEDS_REVIEW',
]);

export const FarmerLocaleSchema = z.enum(['mr-IN', 'hi-IN', 'en-IN']);
export const SetupLanguageSchema = z.enum(['mr', 'hi', 'en']);
export const DeviceModeSelectionSchema = z.enum(['PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED']);
export const SetupSyncStatusSchema = z.enum([
  'SAVED_ON_THIS_PHONE',
  'WAITING_FOR_INTERNET',
  'SYNCED',
  'CONFLICT',
  'LOCKED_RECOVERY',
  'REJECTED',
]);
export const AreaUnitSchema = z.enum(['SQUARE_METRE', 'HECTARE', 'ACRE', 'GUNTHA']);
export const LocationCaptureMethodSchema = z.enum([
  'GPS_POINT',
  'MANUAL_MAP',
  'VILLAGE_LANDMARK',
  'UNKNOWN',
]);
export const PlotGeometryKindSchema = z.enum(['NONE', 'POINT', 'POLYGON', 'VILLAGE_LANDMARK']);
export const SoilSourceSchema = z.enum([
  'SOIL_HEALTH_CARD',
  'LABORATORY',
  'FARMER_MANUAL',
  'SENSOR',
  'UNKNOWN',
]);
export const WaterSourceSchema = z.enum([
  'RAIN_FED',
  'WELL',
  'BOREWELL',
  'CANAL',
  'POND',
  'TANKER',
  'OTHER',
  'UNKNOWN',
]);
export const WaterAvailabilitySchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'SEASONAL', 'UNKNOWN']);
export const CropStageSchema = z.enum([
  'PLANNED',
  'SOWN',
  'TRANSPLANTED',
  'VEGETATIVE',
  'FLOWERING',
  'FRUITING',
  'HARVESTED',
  'UNKNOWN',
]);
export const OptionalHardwareStatusSchema = z.enum([
  'SKIPPED',
  'NOT_CONFIGURED',
  'RSK_SETUP_REQUIRED',
]);
export const SetupConsentScopeSchema = z.enum([
  'location.processing',
  'audio.storage',
  'case.sharing',
  'visit.access',
  'assisted_service.access',
  'channel.app_push',
  'channel.sms',
  'channel.ivr',
]);

export const FarmerProfileSetupSchema = z
  .object({
    displayName: z.string().min(1).max(160).optional(),
    preferredLocale: FarmerLocaleSchema,
    timezone: z.literal('Asia/Kolkata'),
    accessibility: z
      .object({
        voicePrompts: z.boolean(),
        largeTargets: z.boolean(),
        highContrast: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .meta({ id: 'FarmerProfileSetup', 'x-data-classification': 'C3' });

export const RaigadLocationSchema = z
  .object({
    district: z.literal('Raigad'),
    taluka: z.string().min(1).max(120),
    village: z.string().min(1).max(160),
    landmark: z.string().min(1).max(240).optional(),
  })
  .strict()
  .meta({ id: 'RaigadLocation', 'x-data-classification': 'C2' });

export const PlotGeometrySummarySchema = z
  .object({
    geometryVersion: z.int().positive(),
    kind: PlotGeometryKindSchema,
    captureMethod: LocationCaptureMethodSchema,
    gpsPermission: z.enum(['GRANTED', 'DENIED', 'PROMPT', 'UNKNOWN']),
    hasExactServerGeometry: z.boolean(),
    recordedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'PlotGeometrySummary', 'x-data-classification': 'C2' });

export const PlotSetupSchema = z
  .object({
    plotId: UuidSchema,
    farmId: UuidSchema,
    name: z.string().min(1).max(120),
    area: z.number().positive().max(1_000_000),
    areaUnit: AreaUnitSchema,
    normalizedAreaSquareMetres: z.number().positive().max(10_000_000),
    areaConversionVersion: z.literal('area-v1'),
    locationMethod: LocationCaptureMethodSchema,
    geometry: PlotGeometrySummarySchema,
    revision: RevisionSchema,
  })
  .strict()
  .meta({ id: 'PlotSetup', 'x-data-classification': 'C3' });

export const FarmSetupSchema = z
  .object({
    farmId: UuidSchema,
    name: z.string().min(1).max(120),
    location: RaigadLocationSchema,
    farmingMethod: z.enum(['TRADITIONAL', 'ORGANIC', 'MIXED', 'UNKNOWN']),
    plots: z.array(PlotSetupSchema).max(50),
    revision: RevisionSchema,
  })
  .strict()
  .meta({ id: 'FarmSetup', 'x-data-classification': 'C3' });

export const SoilMeasurementSchema = z
  .object({
    ph: z.number().min(0).max(14).optional(),
    nitrogen: z.number().min(0).max(9_999).optional(),
    phosphorus: z.number().min(0).max(9_999).optional(),
    potassium: z.number().min(0).max(9_999).optional(),
    unit: z.enum(['MG_PER_KG', 'KG_PER_HECTARE', 'UNKNOWN']),
    source: SoilSourceSchema,
    observedAt: TimestampSchema.optional(),
  })
  .strict()
  .meta({ id: 'SoilMeasurement', 'x-data-classification': 'C3' });

export const WaterContextSchema = z
  .object({
    sources: z.array(WaterSourceSchema).min(1).max(8),
    availability: WaterAvailabilitySchema,
    reliability: z.enum(['RELIABLE', 'SOMETIMES', 'UNRELIABLE', 'UNKNOWN']),
    storage: z.enum(['NONE', 'SMALL_TANK', 'FARM_POND', 'OTHER', 'UNKNOWN']),
    rainfed: z.boolean(),
  })
  .strict()
  .meta({ id: 'WaterContext', 'x-data-classification': 'C3' });

export const CropDeclarationSchema = z
  .object({
    cropName: z.string().min(1).max(120),
    variety: z.string().min(1).max(120).optional(),
    sowingOrTransplantDate: z.iso.date().optional(),
    stage: CropStageSchema,
    planned: z.boolean(),
  })
  .strict()
  .meta({ id: 'CropDeclaration', 'x-data-classification': 'C3' });

export const CropHistoryRecordSchema = z
  .object({
    cropName: z.string().min(1).max(120),
    seasonLabel: z.string().min(1).max(120),
    year: z.int().min(2000).max(2100),
    notes: z.string().max(500).optional(),
  })
  .strict()
  .meta({ id: 'CropHistoryRecord', 'x-data-classification': 'C3' });

export const SetupConsentsSchema = z
  .object({
    decisions: z.array(
      z
        .object({
          scopeKey: SetupConsentScopeSchema,
          decision: z.enum(['ALLOW', 'DENY', 'WITHDRAW']),
          decidedAt: TimestampSchema,
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ id: 'SetupConsents', 'x-data-classification': 'C2' });

export const FarmerSetupDraftSchema = z
  .object({
    draftId: UuidSchema,
    status: SetupStatusSchema,
    profile: FarmerProfileSetupSchema,
    deviceMode: DeviceModeSelectionSchema,
    consents: SetupConsentsSchema,
    farms: z.array(FarmSetupSchema).min(0).max(10),
    soilByPlot: z.record(UuidSchema, SoilMeasurementSchema),
    waterByPlot: z.record(UuidSchema, WaterContextSchema),
    cropHistoryByPlot: z.record(UuidSchema, z.array(CropHistoryRecordSchema).max(20)),
    currentCropByPlot: z.record(UuidSchema, CropDeclarationSchema),
    hardwareStatus: OptionalHardwareStatusSchema,
    syncStatus: SetupSyncStatusSchema,
    revision: RevisionSchema,
    checksum: Sha256DigestSchema,
    updatedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'FarmerSetupDraft', 'x-data-classification': 'C3' });

export const FarmerSetupSummarySchema = z
  .object({
    status: SetupStatusSchema,
    activeDraft: FarmerSetupDraftSchema.optional(),
    completedAt: TimestampSchema.optional(),
    conflictCount: z.int().nonnegative(),
    syncStatus: SetupSyncStatusSchema,
  })
  .strict()
  .meta({ id: 'FarmerSetupSummary', 'x-data-classification': 'C3' });

export const MyFarmResponseSchema = z
  .object({
    setup: FarmerSetupSummarySchema,
    farms: z.array(FarmSetupSchema).max(10),
    totals: z
      .object({
        farms: z.int().nonnegative(),
        plots: z.int().nonnegative(),
        normalizedAreaSquareMetres: z.number().nonnegative(),
      })
      .strict(),
    currentCropByPlot: z.record(UuidSchema, CropDeclarationSchema),
    generatedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'MyFarmResponse', 'x-data-classification': 'C3' });

export const SaveFarmerSetupDraftPayloadSchema = z
  .object({
    draft: FarmerSetupDraftSchema.omit({
      checksum: true,
      revision: true,
      syncStatus: true,
      updatedAt: true,
    }),
  })
  .strict()
  .meta({ id: 'SaveFarmerSetupDraftPayload', 'x-data-classification': 'C3' });

export const CompleteFarmerSetupPayloadSchema = z
  .object({
    draftId: UuidSchema,
    acceptedDraftRevision: RevisionSchema,
    acceptedDraftChecksum: Sha256DigestSchema,
  })
  .strict()
  .meta({ id: 'CompleteFarmerSetupPayload', 'x-data-classification': 'C3' });

export const UpdateFarmerPreferencesPayloadSchema = z
  .object({
    preferredLocale: FarmerLocaleSchema,
    timezone: z.literal('Asia/Kolkata'),
    voicePrompts: z.boolean(),
  })
  .strict()
  .meta({ id: 'UpdateFarmerPreferencesPayload', 'x-data-classification': 'C2' });

export const DeviceModeChangePayloadSchema = z
  .object({
    nextDeviceMode: DeviceModeSelectionSchema,
    localPrivateWorkState: z.enum(['NONE', 'SYNCED', 'LOCKED_RECOVERY_REQUIRED']),
  })
  .strict()
  .meta({ id: 'DeviceModeChangePayload', 'x-data-classification': 'C2' });

export const SetupVoiceReadResponseSchema = z
  .object({
    setup: FarmerSetupSummarySchema,
    myFarm: MyFarmResponseSchema.optional(),
    mode: z.enum(['LIVE', 'RECORDED', 'SIMULATED']),
  })
  .strict()
  .meta({ id: 'SetupVoiceReadResponse', 'x-data-classification': 'C3' });

export const SetupVoiceProposalPayloadSchema = z
  .object({
    targetPath: z.string().min(1).max(160),
    proposedValue: JsonObjectSchema,
    reason: z.string().min(1).max(240),
  })
  .strict()
  .meta({ id: 'SetupVoiceProposalPayload', 'x-data-classification': 'C3' });

export type FarmerSetupDraft = z.infer<typeof FarmerSetupDraftSchema>;
export type FarmSetup = z.infer<typeof FarmSetupSchema>;
export type PlotSetup = z.infer<typeof PlotSetupSchema>;
export type MyFarmResponse = z.infer<typeof MyFarmResponseSchema>;
