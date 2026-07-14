-- Milestone 6: Real-Time Advisory and Alert Engine.
-- Forward-only. External delivery remains adapter-ready and disabled unless credentials,
-- consent and explicit channel approval are configured outside this migration.

create schema if not exists alert;

alter table workflow.task
  drop constraint if exists task_source_check,
  drop constraint if exists workflow_task_source_check;

alter table workflow.task
  add constraint workflow_task_source_check
  check (source in ('RECOMMENDATION_ACCEPTANCE', 'ADVISORY_ACTION'));

create table agronomy.advisory_evaluation (
  environment text not null,
  advisory_evaluation_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  evidence_snapshot_id uuid,
  rule_set_version text not null,
  evaluated_at timestamptz not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  snapshot_checksum text not null check (snapshot_checksum ~ '^sha256:[0-9a-f]{64}$'),
  outcome text not null check (outcome in ('ACTION', 'NO_ACTION', 'DEDUPLICATED', 'REVIEW_REQUIRED')),
  primary key (environment, advisory_evaluation_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, evidence_snapshot_id) references agronomy.evidence_snapshot(environment, evidence_snapshot_id)
);

create table agronomy.advisory (
  environment text not null,
  advisory_id uuid not null,
  advisory_evaluation_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  kind text not null check (kind in (
    'DRY_SPELL_RISK',
    'IRRIGATION_NEEDED',
    'IRRIGATION_DELAY_RAIN_EXPECTED',
    'HEAVY_RAIN_WATERLOGGING_RISK',
    'HEAT_HUMIDITY_WEATHER_RISK',
    'LOW_SOIL_MOISTURE',
    'NUTRIENT_PH_GUIDANCE',
    'SENSOR_EVIDENCE_PROBLEM'
  )),
  lifecycle_state text not null check (lifecycle_state in (
    'GENERATED',
    'ACTIVE',
    'ACKNOWLEDGED',
    'SNOOZED',
    'RESOLVED',
    'EXPIRED',
    'DEDUPLICATED'
  )),
  severity text not null check (severity in ('INFO', 'WATCH', 'ACTION', 'URGENT')),
  urgency text not null check (urgency in ('TODAY', 'NEXT_24_HOURS', 'NEXT_2_TO_3_DAYS', 'WHEN_POSSIBLE')),
  risk_score numeric(9, 6) not null check (risk_score between 0 and 100),
  confidence_score numeric(9, 6) not null check (confidence_score between 0 and 100),
  deduplication_key text not null,
  result_version bigint not null check (result_version > 0),
  etag_revision bigint not null check (etag_revision > 0),
  generated_at timestamptz not null,
  active_from timestamptz not null,
  expires_at timestamptz not null,
  supersedes_advisory_id uuid,
  task_id uuid,
  advisory_payload jsonb not null,
  primary key (environment, advisory_id),
  foreign key (environment, advisory_evaluation_id) references agronomy.advisory_evaluation(environment, advisory_evaluation_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, supersedes_advisory_id) references agronomy.advisory(environment, advisory_id),
  foreign key (environment, task_id) references workflow.task(environment, task_id),
  check (expires_at > generated_at)
);

create table agronomy.advisory_evidence_ref (
  environment text not null,
  advisory_id uuid not null,
  evidence_id uuid not null,
  metric_key text not null,
  source_name text not null,
  freshness text not null check (freshness in ('CURRENT', 'DATA_IS_OLD', 'NO_RECENT_DATA', 'UNAVAILABLE')),
  quality text not null check (quality in ('TRUSTED', 'USE_WITH_CAUTION', 'TREND_ONLY', 'DO_NOT_USE')),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  primary key (environment, advisory_id, evidence_id),
  foreign key (environment, advisory_id) references agronomy.advisory(environment, advisory_id),
  foreign key (environment, evidence_id) references evidence.record(environment, evidence_id)
);

create table agronomy.shadow_prediction (
  environment text not null,
  shadow_prediction_id uuid not null,
  advisory_evaluation_id uuid not null,
  model_version text not null,
  score numeric(9, 6) not null check (score between 0 and 100),
  production_decision_used boolean not null default false,
  recorded_at timestamptz not null default statement_timestamp(),
  primary key (environment, shadow_prediction_id),
  foreign key (environment, advisory_evaluation_id) references agronomy.advisory_evaluation(environment, advisory_evaluation_id),
  check (production_decision_used = false)
);

create table alert.policy_alert (
  environment text not null,
  alert_id uuid not null,
  advisory_id uuid not null,
  farmer_subject_id uuid not null,
  channel text not null check (channel = 'IN_APP'),
  lifecycle_state text not null check (lifecycle_state in ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'EXPIRED')),
  severity text not null check (severity in ('INFO', 'WATCH', 'ACTION', 'URGENT')),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  last_interaction_at timestamptz,
  primary key (environment, alert_id),
  foreign key (environment, advisory_id) references agronomy.advisory(environment, advisory_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id)
);

create table agronomy.advisory_response (
  environment text not null,
  advisory_response_id uuid not null,
  advisory_id uuid not null,
  farmer_subject_id uuid not null,
  command_id uuid not null,
  response text not null check (response in ('ACKNOWLEDGE', 'SNOOZE', 'MARK_ACTION_COMPLETED', 'CANNOT_DO')),
  note text,
  snooze_until timestamptz,
  client_recorded_at timestamptz not null,
  server_received_at timestamptz not null default statement_timestamp(),
  receipt_payload jsonb not null,
  primary key (environment, advisory_response_id),
  unique (environment, farmer_subject_id, command_id),
  foreign key (environment, advisory_id) references agronomy.advisory(environment, advisory_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id)
);

create table workflow.diary_entry (
  environment text not null,
  diary_entry_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  source text not null check (source in ('ADVISORY_ACTION_COMPLETED', 'TASK_COMPLETED')),
  occurred_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, diary_entry_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

do $$
declare
  relation regclass;
begin
  foreach relation in array array[
    'agronomy.advisory_evaluation'::regclass,
    'agronomy.advisory'::regclass,
    'agronomy.advisory_evidence_ref'::regclass,
    'agronomy.shadow_prediction'::regclass,
    'alert.policy_alert'::regclass,
    'agronomy.advisory_response'::regclass,
    'workflow.diary_entry'::regclass
  ]
  loop
    execute format('alter table %s enable row level security', relation);
    execute format('alter table %s force row level security', relation);
  end loop;
end $$;

create index advisory_farmer_plot_active_idx
  on agronomy.advisory(environment, farmer_subject_id, plot_id, lifecycle_state, expires_at);

create unique index advisory_one_active_deduplication_key_idx
  on agronomy.advisory(environment, deduplication_key)
  where lifecycle_state = 'ACTIVE';

create index policy_alert_farmer_active_idx
  on alert.policy_alert(environment, farmer_subject_id, lifecycle_state, expires_at);

comment on table agronomy.shadow_prediction is
  'ML-ready shadow risk scores. The production deterministic advisory decision cannot read this score.';

comment on table alert.policy_alert is
  'Milestone 6 in-app alert projection only. Push, SMS and WhatsApp delivery adapters remain disabled until explicitly configured and consented.';
