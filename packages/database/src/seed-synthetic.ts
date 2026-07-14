import { createDatabaseClient } from './client';
import { seedRuns } from './schema';

const client = createDatabaseClient();
const environment = process.env['SMART_FASAL_ENVIRONMENT'] ?? 'local';

try {
  await client.db.insert(seedRuns).values({
    profile: 'synthetic-foundation',
    metadata: {
      containsPersonalData: false,
      purpose: 'Milestone 0 environment verification',
    },
  });
  await seedMilestoneFiveRaigadDemo();
} finally {
  await client.close();
}

async function seedMilestoneFiveRaigadDemo(): Promise<void> {
  const now = '2026-07-14T09:00:00+05:30';
  const farmerId = '00000000-0000-4000-8000-000000000101';
  const farmId = '00000000-0000-4000-8000-000000000201';
  const plotId = '00000000-0000-4000-8000-000000000401';
  const requestId = '00000000-0000-4000-8000-000000000901';
  const operationId = '00000000-0000-4000-8000-000000000902';
  const snapshotId = '00000000-0000-4000-8000-000000000903';
  const recommendationId = '00000000-0000-4000-8000-000000000904';
  const candidateId = '00000000-0000-4000-8000-000000000905';
  const seasonId = '00000000-0000-4000-8000-000000000906';
  const calendarId = '00000000-0000-4000-8000-000000000907';
  const acceptanceId = '00000000-0000-4000-8000-000000000908';
  const commandId = '00000000-0000-4000-8000-000000000909';
  const evidenceId = '00000000-0000-4000-8000-000000000910';
  const taskId = '00000000-0000-4000-8000-000000000911';
  const checksum = `sha256:${'1'.repeat(64)}`;
  const recommendationPayload = {
    recommendationId,
    plotId,
    state: 'READY',
    generatedAt: now,
    expiresAt: '2026-07-21T09:00:00+05:30',
    dataMode: 'RECORDED',
    resultVersion: 1,
    etagRevision: 1,
    snapshotChecksum: checksum,
    ruleSetVersion: 'raigad-recommendation-rules-v1',
    profileSetVersion: 'raigad-crop-profiles-v1-proposed',
    templateSetVersion: 'raigad-calendar-template-v1',
    candidates: [
      {
        candidateId,
        cropProfileId: 'raigad-rice-kharif-v1',
        cropName: 'Rice',
        rank: 1,
        suitabilityScore: 86.95,
        confidenceScore: 82.5,
        waterSafetyScore: 88,
        seasonFitScore: 92,
        durationDays: 120,
        reasons: ['Fits the Raigad kharif window.'],
        risks: ['If monsoon breaks, confirm water before transplanting.'],
        warnings: ['Needs reliable water through the season.'],
        evidenceRefs: [
          {
            evidenceId,
            metricKey: 'weather.decision_rainfall',
            sourceName: 'Raigad recorded decision weather',
            freshness: 'CURRENT',
            quality: 'USE_WITH_CAUTION',
            dataMode: 'RECORDED',
          },
        ],
      },
    ],
    blockers: [],
    excluded: [],
    modeExplanation: 'Decision mode is RECORDED from server-derived evidence.',
    comparisonRows: [],
  };
  const calendarPayload = {
    seasonId,
    calendarId,
    generatedAt: now,
    tasks: [
      {
        taskId,
        title: 'Prepare field for Rice',
        dueDate: '2026-07-20',
        state: 'PLANNED',
        source: 'RECOMMENDATION_ACCEPTANCE',
      },
    ],
  };

  await client.sql.begin(async (sql) => {
    await sql`
      insert into farm.farmer_profile (
        environment, farmer_subject_id, preferred_locale, timezone, device_mode,
        setup_status, setup_revision, updated_at
      )
      select ${environment}, ${farmerId}, 'mr-IN', 'Asia/Kolkata', 'PERSONAL', 'COMPLETE', 1, ${now}
      where not exists (
        select 1 from farm.farmer_profile
        where environment = ${environment} and farmer_subject_id = ${farmerId}
      )
    `;
    await sql`
      insert into farm.farm (
        environment, farm_id, farmer_subject_id, name, district, taluka, village,
        farming_method, revision, updated_at
      )
      select ${environment}, ${farmId}, ${farmerId}, 'Raigad demo farm', 'Raigad', 'Alibag',
        'Poynad', 'TRADITIONAL', 1, ${now}
      where not exists (
        select 1 from farm.farm where environment = ${environment} and farm_id = ${farmId}
      )
    `;
    await sql`
      insert into farm.plot (
        environment, plot_id, farm_id, farmer_subject_id, name, area, area_unit,
        normalized_area_square_metres, area_conversion_version, location_method, revision, updated_at
      )
      select ${environment}, ${plotId}, ${farmId}, ${farmerId}, 'Plot 1', '1', 'ACRE',
        '4046.86', 'area-v1', 'VILLAGE_LANDMARK', 1, ${now}
      where not exists (
        select 1 from farm.plot where environment = ${environment} and plot_id = ${plotId}
      )
    `;
    await sql`
      insert into evidence.record (
        environment, evidence_id, farmer_subject_id, farm_id, plot_id, kind, metric_key,
        value_state, original_value, original_unit, normalized_value, normalized_unit, observed_at,
        received_at, forecast_for, source_key, source_ref, source_version, rights_label, data_mode,
        quality, freshness, decision_eligible, limitations, policy_version, conversion_version,
        calibration_version, correction_of_evidence_id, invalidated_at, created_at
      )
      select ${environment}, ${evidenceId}, ${farmerId}, ${farmId}, ${plotId}, 'WEATHER',
        'weather.decision_rainfall', 'KNOWN', '18.4', 'MILLIMETRE', '18.4', 'MILLIMETRE',
        ${now}, ${now}, ${now}, 'raigad-recorded-weather', 'm5-demo', 'v1',
        'MODEL_INPUT_ALLOWED', 'RECORDED', 'USE_WITH_CAUTION', 'CURRENT', 1,
        array['Recorded demo evidence; not live weather.'], 'evidence-policy-v1',
        'conversion-v1', null, null, null, ${now}
      where not exists (
        select 1 from evidence.record where environment = ${environment} and evidence_id = ${evidenceId}
      )
    `;
    await sql`
      insert into agronomy.evidence_snapshot (
        environment, evidence_snapshot_id, farmer_subject_id, plot_id, snapshot_checksum,
        as_of, expires_at, data_mode, rule_set_key, rule_set_version, profile_set_version
      )
      select ${environment}, ${snapshotId}, ${farmerId}, ${plotId}, ${checksum}, ${now},
        '2026-07-21T09:00:00+05:30', 'RECORDED', 'raigad-recommendation-rules',
        'raigad-recommendation-rules-v1', 'raigad-crop-profiles-v1-proposed'
      where not exists (
        select 1 from agronomy.evidence_snapshot
        where environment = ${environment} and evidence_snapshot_id = ${snapshotId}
      )
    `;
    await sql`
      insert into agronomy.evidence_snapshot_item (
        environment, evidence_snapshot_id, evidence_id, source_rights_label, quality, freshness, data_mode
      )
      select ${environment}, ${snapshotId}, ${evidenceId}, 'MODEL_INPUT_ALLOWED',
        'USE_WITH_CAUTION', 'CURRENT', 'RECORDED'
      where not exists (
        select 1 from agronomy.evidence_snapshot_item
        where environment = ${environment} and evidence_snapshot_id = ${snapshotId} and evidence_id = ${evidenceId}
      )
    `;
    await sql`
      insert into agronomy.recommendation_request (
        environment, recommendation_request_id, operation_id, farmer_subject_id, plot_id,
        request_schema_version, planning_context_revision, payload_checksum, state, status_payload
      )
      select ${environment}, ${requestId}, ${operationId}, ${farmerId}, ${plotId},
        'recommendation-request-v1', 1, ${checksum}, 'SUCCEEDED',
        ${sql.json({ operationId, state: 'SUCCEEDED', recommendationId, updatedAt: now })}
      where not exists (
        select 1 from agronomy.recommendation_request
        where environment = ${environment} and recommendation_request_id = ${requestId}
      )
    `;
    await sql`
      insert into agronomy.recommendation_result (
        environment, recommendation_id, recommendation_request_id, evidence_snapshot_id, plot_id,
        state, data_mode, result_version, snapshot_checksum, generated_at, expires_at, result_payload
      )
      select ${environment}, ${recommendationId}, ${requestId}, ${snapshotId}, ${plotId},
        'READY', 'RECORDED', 1, ${checksum}, ${now}, '2026-07-21T09:00:00+05:30',
        ${sql.json(recommendationPayload)}
      where not exists (
        select 1 from agronomy.recommendation_result
        where environment = ${environment} and recommendation_id = ${recommendationId}
      )
    `;
    await sql`
      insert into agronomy.recommendation_candidate (
        environment, recommendation_id, candidate_id, crop_profile_id, rank, suitability_score,
        confidence_score, water_safety_score, season_fit_score
      )
      select ${environment}, ${recommendationId}, ${candidateId}, 'raigad-rice-kharif-v1',
        1, 86.95, 82.5, 88, 92
      where not exists (
        select 1 from agronomy.recommendation_candidate
        where environment = ${environment} and candidate_id = ${candidateId}
      )
    `;
    await sql`
      insert into agronomy.recommendation_acceptance (
        environment, acceptance_id, recommendation_id, candidate_id, command_id, start_mode,
        start_kind, start_date, receipt_payload
      )
      select ${environment}, ${acceptanceId}, ${recommendationId}, ${candidateId}, ${commandId},
        'PROPOSED', 'SOWING', '2026-07-20',
        ${sql.json({
          commandId,
          disposition: 'ACCEPTED',
          acceptanceId,
          seasonId,
          calendarId,
          taskIds: [taskId],
          seasonState: 'PLANNED_AWAITING_START',
          serverReceivedAt: now,
        })}
      where not exists (
        select 1 from agronomy.recommendation_acceptance
        where environment = ${environment} and acceptance_id = ${acceptanceId}
      )
    `;
    await sql`
      insert into agronomy.farm_season (environment, season_id, plot_id, recommendation_id, state)
      select ${environment}, ${seasonId}, ${plotId}, ${recommendationId}, 'PLANNED_AWAITING_START'
      where not exists (
        select 1 from agronomy.farm_season where environment = ${environment} and season_id = ${seasonId}
      )
    `;
    await sql`
      insert into workflow.calendar (
        environment, calendar_id, season_id, template_key, template_version, calendar_payload
      )
      select ${environment}, ${calendarId}, ${seasonId}, 'raigad-calendar-template',
        'raigad-calendar-template-v1', ${sql.json(calendarPayload)}
      where not exists (
        select 1 from workflow.calendar where environment = ${environment} and calendar_id = ${calendarId}
      )
    `;
    await sql`
      insert into workflow.task (environment, task_id, calendar_id, title, due_date, state, source)
      select ${environment}, ${taskId}, ${calendarId}, 'Prepare field for Rice',
        '2026-07-20', 'PLANNED', 'RECOMMENDATION_ACCEPTANCE'
      where not exists (
        select 1 from workflow.task where environment = ${environment} and task_id = ${taskId}
      )
    `;
  });

  await client.db.insert(seedRuns).values({
    profile: 'synthetic-milestone-5-raigad-recommendation',
    metadata: {
      containsPersonalData: false,
      environment,
      farmId,
      plotId,
      recommendationId,
      seasonId,
      mode: 'RECORDED',
      purpose: 'Milestone 5 Raigad crop recommendation and season setup demo',
    },
  });
}
