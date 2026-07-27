import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const platform = pgSchema('platform');
export const media = pgSchema('media');
export const voice = pgSchema('voice');
export const farm = pgSchema('farm');
export const evidence = pgSchema('evidence');
export const device = pgSchema('device');
export const workflow = pgSchema('workflow');

export const seedRuns = platform.table(
  'seed_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profile: text('profile').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('seed_runs_profile_created_idx').on(table.profile, table.createdAt)],
);

export const schemaCompatibility = platform.table('schema_compatibility', {
  component: text('component').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  minimumSupportedVersion: integer('minimum_supported_version').notNull(),
  maximumSupportedVersion: integer('maximum_supported_version').notNull(),
  supportedFrom: timestamp('supported_from', { withTimezone: true }).notNull(),
  supportedUntil: timestamp('supported_until', { withTimezone: true }).notNull(),
});

export const syncStreams = platform.table(
  'sync_stream',
  {
    streamId: uuid('stream_id').primaryKey(),
    environment: text('environment').notNull(),
    subjectId: uuid('subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    authorizationVersion: bigint('authorization_version', { mode: 'number' }).notNull(),
    deviceMode: text('device_mode').notNull(),
    cursor: text('cursor').notNull(),
    highWaterMark: text('high_water_mark').notNull(),
    state: text('state').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('sync_stream_owner_idx').on(
      table.environment,
      table.subjectId,
      table.subjectDeviceBindingId,
      table.openedAt,
    ),
  ],
);

export const mediaAssets = media.table(
  'asset',
  {
    assetId: uuid('asset_id').primaryKey(),
    intentId: uuid('intent_id').notNull(),
    environment: text('environment').notNull(),
    ownerSubjectId: uuid('owner_subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    purpose: text('purpose').notNull(),
    ownerType: text('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    storageObjectName: text('storage_object_name').notNull(),
    expectedGeneration: bigint('expected_generation', { mode: 'number' }).notNull(),
    expectedSha256: text('expected_sha256').notNull(),
    expectedSizeBytes: bigint('expected_size_bytes', { mode: 'number' }).notNull(),
    actualGeneration: bigint('actual_generation', { mode: 'number' }),
    finalizedSha256: text('finalized_sha256'),
    finalizedSizeBytes: bigint('finalized_size_bytes', { mode: 'number' }),
    verifiedSha256: text('verified_sha256'),
    verifiedSizeBytes: bigint('verified_size_bytes', { mode: 'number' }),
    verifiedMimeType: text('verified_mime_type'),
    state: text('state').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('media_asset_scan_queue_idx').on(table.state, table.updatedAt)],
);

export const voiceSessions = voice.table(
  'session',
  {
    sessionId: uuid('session_id').primaryKey(),
    environment: text('environment').notNull(),
    subjectId: uuid('subject_id').notNull(),
    subjectDeviceBindingId: uuid('subject_device_binding_id').notNull(),
    roleContextId: uuid('role_context_id').notNull(),
    authorizationVersion: bigint('authorization_version', { mode: 'number' }).notNull(),
    purposeCode: text('purpose_code').notNull(),
    origin: text('origin').notNull(),
    language: text('language').notNull(),
    visualRoute: text('visual_route').notNull(),
    contextIds: uuid('context_ids').array().notNull(),
    state: text('state').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('voice_session_owner_idx').on(table.environment, table.subjectId, table.createdAt),
  ],
);

export const farmerProfiles = farm.table('farmer_profile', {
  environment: text('environment').notNull(),
  farmerSubjectId: uuid('farmer_subject_id').notNull(),
  preferredLocale: text('preferred_locale').notNull(),
  timezone: text('timezone').notNull(),
  deviceMode: text('device_mode').notNull(),
  setupStatus: text('setup_status').notNull(),
  setupRevision: bigint('setup_revision', { mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const farms = farm.table(
  'farm',
  {
    environment: text('environment').notNull(),
    farmId: uuid('farm_id').primaryKey(),
    farmerSubjectId: uuid('farmer_subject_id').notNull(),
    name: text('name').notNull(),
    district: text('district').notNull(),
    taluka: text('taluka').notNull(),
    village: text('village').notNull(),
    farmingMethod: text('farming_method').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('farm_owner_idx').on(table.environment, table.farmerSubjectId)],
);

export const plots = farm.table(
  'plot',
  {
    environment: text('environment').notNull(),
    plotId: uuid('plot_id').primaryKey(),
    farmId: uuid('farm_id').notNull(),
    farmerSubjectId: uuid('farmer_subject_id').notNull(),
    name: text('name').notNull(),
    area: text('area').notNull(),
    areaUnit: text('area_unit').notNull(),
    normalizedAreaSquareMetres: text('normalized_area_square_metres').notNull(),
    areaConversionVersion: text('area_conversion_version').notNull(),
    locationMethod: text('location_method').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('plot_owner_idx').on(table.environment, table.farmerSubjectId)],
);

export const plotGeometryVersions = farm.table(
  'plot_geometry_version',
  {
    environment: text('environment').notNull(),
    plotId: uuid('plot_id').notNull(),
    geometryVersion: integer('geometry_version').notNull(),
    geometryKind: text('geometry_kind').notNull(),
    captureMethod: text('capture_method').notNull(),
    gpsPermission: text('gps_permission').notNull(),
    hasExactServerGeometry: integer('has_exact_server_geometry').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('plot_geometry_owner_idx').on(table.environment, table.plotId)],
);

export const evidenceRecords = evidence.table(
  'record',
  {
    environment: text('environment').notNull(),
    evidenceId: uuid('evidence_id').primaryKey(),
    farmerSubjectId: uuid('farmer_subject_id').notNull(),
    farmId: uuid('farm_id').notNull(),
    plotId: uuid('plot_id').notNull(),
    kind: text('kind').notNull(),
    metricKey: text('metric_key').notNull(),
    valueState: text('value_state').notNull(),
    originalValue: text('original_value'),
    originalUnit: text('original_unit'),
    normalizedValue: text('normalized_value'),
    normalizedUnit: text('normalized_unit').notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    forecastFor: timestamp('forecast_for', { withTimezone: true }),
    sourceKey: text('source_key').notNull(),
    sourceRef: text('source_ref').notNull(),
    sourceVersion: text('source_version').notNull(),
    rightsLabel: text('rights_label').notNull(),
    dataMode: text('data_mode').notNull(),
    quality: text('quality').notNull(),
    freshness: text('freshness').notNull(),
    decisionEligible: integer('decision_eligible').notNull(),
    limitations: text('limitations').array().notNull(),
    policyVersion: text('policy_version').notNull(),
    conversionVersion: text('conversion_version').notNull(),
    calibrationVersion: text('calibration_version'),
    correctionOfEvidenceId: uuid('correction_of_evidence_id'),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('evidence_record_plot_received_idx').on(
      table.environment,
      table.plotId,
      table.receivedAt,
    ),
  ],
);

export const deviceRawTelemetryReceipts = device.table(
  'raw_telemetry_receipt',
  {
    environment: text('environment').notNull(),
    receiptId: uuid('receipt_id').primaryKey(),
    batchId: uuid('batch_id').notNull(),
    channelId: uuid('channel_id').notNull(),
    payloadDigest: text('payload_digest').notNull(),
    trustState: text('trust_state').notNull(),
    state: text('state').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('device_receipt_batch_idx').on(table.environment, table.batchId)],
);

export const healthReports = workflow.table(
  'health_report',
  {
    environment: text('environment').notNull(),
    reportId: uuid('report_id').primaryKey(),
    farmerSubjectId: uuid('farmer_subject_id').notNull(),
    plotId: uuid('plot_id').notNull(),
    seasonId: uuid('season_id'),
    cropName: text('crop_name').notNull(),
    language: text('language').notNull(),
    symptomSummary: text('symptom_summary').notNull(),
    lifecycleState: text('lifecycle_state').notNull(),
    sharingDecision: text('sharing_decision').notNull(),
    dataMode: text('data_mode').notNull(),
    draftCommandId: uuid('draft_command_id').notNull(),
    submitCommandId: uuid('submit_command_id'),
    latestTriageId: uuid('latest_triage_id'),
    caseId: uuid('case_id'),
    reportChecksum: text('report_checksum').notNull(),
    resultVersion: bigint('result_version', { mode: 'number' }).notNull(),
    etagRevision: bigint('etag_revision', { mode: 'number' }).notNull(),
    sourceDeviceBindingId: uuid('source_device_binding_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (table) => [
    index('health_report_owner_plot_state_idx').on(
      table.environment,
      table.farmerSubjectId,
      table.plotId,
      table.lifecycleState,
      table.updatedAt,
    ),
  ],
);

export const healthMediaLinks = workflow.table(
  'health_media_link',
  {
    environment: text('environment').notNull(),
    reportId: uuid('report_id').notNull(),
    assetId: uuid('asset_id').notNull(),
    requiredView: text('required_view').notNull(),
    evidenceQuality: text('evidence_quality').notNull(),
    consentAccessVersion: bigint('consent_access_version', { mode: 'number' }).notNull(),
    scannerVersion: text('scanner_version'),
    limitation: text('limitation'),
    attachedAt: timestamp('attached_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('health_media_link_report_quality_idx').on(
      table.environment,
      table.reportId,
      table.evidenceQuality,
    ),
  ],
);

export const healthTriageResults = workflow.table(
  'triage_result',
  {
    environment: text('environment').notNull(),
    triageId: uuid('triage_id').primaryKey(),
    reportId: uuid('report_id').notNull(),
    evidenceQualityId: uuid('evidence_quality_id'),
    state: text('state').notNull(),
    severity: text('severity').notNull(),
    confidence: text('confidence').notNull(),
    spread: text('spread').notNull(),
    mandatoryEscalation: boolean('mandatory_escalation').notNull(),
    summary: text('summary').notNull(),
    safeNextStep: text('safe_next_step').notNull(),
    evidenceQualityBand: text('evidence_quality_band').notNull(),
    modelProvider: text('model_provider').notNull(),
    modelName: text('model_name').notNull(),
    modelVersion: text('model_version').notNull(),
    policyVersion: text('policy_version').notNull(),
    dataMode: text('data_mode').notNull(),
    unavailableReason: text('unavailable_reason'),
    resultPayload: jsonb('result_payload').$type<Record<string, unknown>>().notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('triage_result_report_generated_idx').on(
      table.environment,
      table.reportId,
      table.generatedAt,
    ),
  ],
);

export const cropHealthCases = workflow.table(
  'case',
  {
    environment: text('environment').notNull(),
    caseId: uuid('case_id').primaryKey(),
    reportId: uuid('report_id').notNull(),
    farmerSubjectId: uuid('farmer_subject_id').notNull(),
    plotId: uuid('plot_id').notNull(),
    triageId: uuid('triage_id').notNull(),
    status: text('status').notNull(),
    severity: text('severity').notNull(),
    sharingDecision: text('sharing_decision').notNull(),
    consentAccessVersion: bigint('consent_access_version', { mode: 'number' }).notNull(),
    policyVersionId: uuid('policy_version_id').notNull(),
    evidencePackExpiresAt: timestamp('evidence_pack_expires_at', { withTimezone: true }).notNull(),
    dataMode: text('data_mode').notNull(),
    title: text('title').notNull(),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('crop_health_case_owner_status_idx').on(
      table.environment,
      table.farmerSubjectId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const caseEvidencePacks = workflow.table(
  'case_evidence_pack',
  {
    environment: text('environment').notNull(),
    evidencePackId: uuid('evidence_pack_id').primaryKey(),
    caseId: uuid('case_id').notNull(),
    purposeCode: text('purpose_code').notNull(),
    consentAccessVersion: bigint('consent_access_version', { mode: 'number' }).notNull(),
    policyVersionId: uuid('policy_version_id').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    manifestChecksum: text('manifest_checksum').notNull(),
    itemCount: integer('item_count').notNull(),
    packPayload: jsonb('pack_payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('case_evidence_pack_expiry_idx').on(table.environment, table.expiresAt)],
);

export const workCaseLinks = workflow.table('work_case_link', {
  environment: text('environment').notNull(),
  workItemId: uuid('work_item_id').primaryKey(),
  caseId: uuid('case_id').notNull(),
  purposeCode: text('purpose_code').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});
