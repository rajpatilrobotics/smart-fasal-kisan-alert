-- Milestone 5: Smart Crop Recommendation Engine, acceptance and minimum Calendar foundation.
-- Forward-only. Google display weather remains excluded from decision snapshots.
-- Missing decision rights must surface as SOURCE_RIGHTS_OR_VERSION_INVALID.

create schema if not exists agronomy;
create schema if not exists workflow;

create table agronomy.crop_profile_version (
  environment text not null,
  crop_profile_id text not null,
  version text not null,
  crop_name text not null,
  geography_key text not null,
  season_key text not null,
  status text not null check (status in ('PROPOSED', 'APPROVED', 'EXPIRED')),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, crop_profile_id, version)
);

create table agronomy.rule_set_version (
  environment text not null,
  rule_set_key text not null,
  version text not null,
  status text not null check (status in ('PROPOSED', 'APPROVED', 'EXPIRED')),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, rule_set_key, version)
);

create table agronomy.calendar_template_version (
  environment text not null,
  template_key text not null,
  version text not null,
  status text not null check (status in ('PROPOSED', 'APPROVED', 'EXPIRED')),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, template_key, version)
);

create table evidence.decision_weather_edition (
  environment text not null,
  decision_weather_edition_id uuid not null,
  plot_id uuid not null,
  source_key text not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  retained_until timestamptz not null,
  model_input_rights_label text not null,
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, decision_weather_edition_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table agronomy.evidence_snapshot (
  environment text not null,
  evidence_snapshot_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  snapshot_checksum text not null check (snapshot_checksum ~ '^sha256:[0-9a-f]{64}$'),
  as_of timestamptz not null,
  expires_at timestamptz not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  rule_set_key text not null,
  rule_set_version text not null,
  profile_set_version text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, evidence_snapshot_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table agronomy.evidence_snapshot_item (
  environment text not null,
  evidence_snapshot_id uuid not null,
  evidence_id uuid not null,
  source_rights_label text not null,
  quality text not null check (quality in ('TRUSTED', 'USE_WITH_CAUTION', 'TREND_ONLY', 'DO_NOT_USE')),
  freshness text not null check (freshness in ('CURRENT', 'DATA_IS_OLD', 'NO_RECENT_DATA', 'UNAVAILABLE')),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  primary key (environment, evidence_snapshot_id, evidence_id),
  foreign key (environment, evidence_snapshot_id) references agronomy.evidence_snapshot(environment, evidence_snapshot_id),
  foreign key (environment, evidence_id) references evidence.record(environment, evidence_id),
  check (freshness <> 'UNAVAILABLE' and quality <> 'DO_NOT_USE')
);

create table agronomy.recommendation_request (
  environment text not null,
  recommendation_request_id uuid not null,
  operation_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  request_schema_version text not null check (request_schema_version = 'recommendation-request-v1'),
  planning_context_revision bigint not null check (planning_context_revision >= 0),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  state text not null check (state in ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_TERMINAL', 'CANCELLED', 'EXPIRED')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, recommendation_request_id),
  unique (environment, operation_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table agronomy.recommendation_result (
  environment text not null,
  recommendation_id uuid not null,
  recommendation_request_id uuid not null,
  evidence_snapshot_id uuid not null,
  plot_id uuid not null,
  state text not null check (state in ('READY', 'NEEDS_INPUT', 'NO_SAFE_RESULT', 'FAILED')),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  result_version bigint not null check (result_version > 0),
  snapshot_checksum text not null check (snapshot_checksum ~ '^sha256:[0-9a-f]{64}$'),
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  superseded_by_recommendation_id uuid,
  primary key (environment, recommendation_id),
  foreign key (environment, recommendation_request_id) references agronomy.recommendation_request(environment, recommendation_request_id),
  foreign key (environment, evidence_snapshot_id) references agronomy.evidence_snapshot(environment, evidence_snapshot_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table agronomy.recommendation_candidate (
  environment text not null,
  recommendation_id uuid not null,
  candidate_id uuid not null,
  crop_profile_id text not null,
  rank integer not null check (rank between 1 and 3),
  suitability_score numeric(9, 6) not null check (suitability_score between 0 and 100),
  confidence_score numeric(9, 6) not null check (confidence_score between 0 and 100),
  water_safety_score numeric(9, 6) not null check (water_safety_score between 0 and 100),
  season_fit_score numeric(9, 6) not null check (season_fit_score between 0 and 100),
  primary key (environment, candidate_id),
  unique (environment, recommendation_id, rank),
  foreign key (environment, recommendation_id) references agronomy.recommendation_result(environment, recommendation_id)
);

create table agronomy.recommendation_gate_result (
  environment text not null,
  recommendation_id uuid not null,
  crop_profile_id text not null,
  gate_key text not null,
  outcome text not null check (outcome in ('PASS', 'FAIL', 'UNKNOWN_BLOCKING', 'NOT_APPLICABLE')),
  reason text not null,
  primary key (environment, recommendation_id, crop_profile_id, gate_key),
  foreign key (environment, recommendation_id) references agronomy.recommendation_result(environment, recommendation_id)
);

create table agronomy.recommendation_acceptance (
  environment text not null,
  acceptance_id uuid not null,
  recommendation_id uuid not null,
  candidate_id uuid not null,
  command_id uuid not null,
  start_mode text not null check (start_mode in ('PROPOSED', 'ACTUAL')),
  start_kind text not null check (start_kind in ('SOWING', 'TRANSPLANTING')),
  start_date date not null,
  accepted_at timestamptz not null default statement_timestamp(),
  primary key (environment, acceptance_id),
  unique (environment, recommendation_id, command_id),
  unique (environment, recommendation_id),
  foreign key (environment, recommendation_id) references agronomy.recommendation_result(environment, recommendation_id),
  foreign key (environment, candidate_id) references agronomy.recommendation_candidate(environment, candidate_id)
);

create table agronomy.farm_season (
  environment text not null,
  season_id uuid not null,
  plot_id uuid not null,
  recommendation_id uuid not null,
  state text not null check (state in ('PLANNED_AWAITING_START', 'ACTIVE')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, season_id),
  unique (environment, recommendation_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, recommendation_id) references agronomy.recommendation_result(environment, recommendation_id)
);

create table workflow.calendar (
  environment text not null,
  calendar_id uuid not null,
  season_id uuid not null,
  template_key text not null,
  template_version text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, calendar_id),
  unique (environment, season_id),
  foreign key (environment, season_id) references agronomy.farm_season(environment, season_id)
);

create table workflow.task (
  environment text not null,
  task_id uuid not null,
  calendar_id uuid not null,
  title text not null,
  due_date date not null,
  state text not null check (state in ('PLANNED', 'ACTIVE', 'DONE', 'CANNOT_DO')),
  source text not null check (source = 'RECOMMENDATION_ACCEPTANCE'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, task_id),
  foreign key (environment, calendar_id) references workflow.calendar(environment, calendar_id)
);

create table workflow.rsk_work_item (
  environment text not null,
  work_item_id uuid not null,
  work_type text not null check (work_type = 'RECOMMENDATION_REVIEW'),
  state text not null check (state in ('OPEN', 'ASSIGNED', 'CLOSED')),
  purpose_code text not null check (purpose_code = 'case.expert_support'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, work_item_id)
);

create table workflow.work_recommendation_link (
  environment text not null,
  work_item_id uuid not null,
  recommendation_id uuid not null,
  primary key (environment, work_item_id),
  foreign key (environment, work_item_id) references workflow.rsk_work_item(environment, work_item_id),
  foreign key (environment, recommendation_id) references agronomy.recommendation_result(environment, recommendation_id)
);

do $$
declare
  relation regclass;
begin
  foreach relation in array array[
    'agronomy.crop_profile_version'::regclass,
    'agronomy.rule_set_version'::regclass,
    'agronomy.calendar_template_version'::regclass,
    'evidence.decision_weather_edition'::regclass,
    'agronomy.evidence_snapshot'::regclass,
    'agronomy.evidence_snapshot_item'::regclass,
    'agronomy.recommendation_request'::regclass,
    'agronomy.recommendation_result'::regclass,
    'agronomy.recommendation_candidate'::regclass,
    'agronomy.recommendation_gate_result'::regclass,
    'agronomy.recommendation_acceptance'::regclass,
    'agronomy.farm_season'::regclass,
    'workflow.calendar'::regclass,
    'workflow.task'::regclass,
    'workflow.rsk_work_item'::regclass,
    'workflow.work_recommendation_link'::regclass
  ]
  loop
    execute format('alter table %s enable row level security', relation);
    execute format('alter table %s force row level security', relation);
  end loop;
end $$;
