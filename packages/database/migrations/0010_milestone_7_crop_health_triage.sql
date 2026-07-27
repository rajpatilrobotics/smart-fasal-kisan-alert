-- Milestone 7: Crop Health guided triage and consented Case foundation.
-- Forward-only. This creates the Farmer report/triage/Case persistence needed for
-- FS-05, but leaves full RSK care-plan, follow-up and resolution workflow to the
-- later RSK Case milestone. MP receives no route, privilege or copied data.

alter table workflow.rsk_work_item
  drop constraint if exists rsk_work_item_work_type_check,
  drop constraint if exists workflow_rsk_work_item_work_type_check;

alter table workflow.rsk_work_item
  add constraint workflow_rsk_work_item_work_type_check
  check (work_type in ('RECOMMENDATION_REVIEW', 'CROP_HEALTH_CASE_REVIEW'));

alter table workflow.rsk_work_item
  add column if not exists source_kind text not null default 'RECOMMENDATION'
    check (source_kind in ('RECOMMENDATION', 'CROP_HEALTH_CASE')),
  add column if not exists source_id uuid,
  add column if not exists priority text not null default 'NORMAL'
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  add column if not exists due_at timestamptz,
  add column if not exists revision bigint not null default 0 check (revision >= 0);

create table workflow.health_report (
  environment text not null,
  report_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  season_id uuid,
  crop_name text not null check (length(trim(crop_name)) between 1 and 120),
  language text not null check (language in ('mr', 'hi', 'en')),
  symptom_summary text not null check (length(trim(symptom_summary)) between 1 and 800),
  lifecycle_state text not null check (lifecycle_state in (
    'DRAFT', 'SUBMITTED', 'TRIAGE_PENDING', 'TRIAGED', 'MODEL_UNAVAILABLE'
  )),
  sharing_decision text not null default 'NOT_REQUESTED'
    check (sharing_decision in ('NOT_REQUESTED', 'PENDING', 'ALLOW', 'DENY')),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  draft_command_id uuid not null,
  submit_command_id uuid,
  latest_triage_id uuid,
  case_id uuid,
  report_checksum text not null check (report_checksum ~ '^sha256:[0-9a-f]{64}$'),
  result_version bigint not null check (result_version > 0),
  etag_revision bigint not null check (etag_revision > 0),
  source_device_binding_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  submitted_at timestamptz,
  primary key (environment, report_id),
  unique (environment, farmer_subject_id, draft_command_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, season_id) references agronomy.farm_season(environment, season_id),
  check (
    (lifecycle_state = 'DRAFT' and submitted_at is null)
    or (lifecycle_state <> 'DRAFT' and submitted_at is not null)
  )
);

create table workflow.health_answer (
  environment text not null,
  answer_id uuid not null,
  report_id uuid not null,
  question_key text not null check (question_key in (
    'crop', 'cropStage', 'affectedPart', 'symptomStarted', 'spread',
    'areaAffected', 'recentWeather', 'recentInput', 'farmerConcern'
  )),
  answer_revision bigint not null check (answer_revision > 0),
  answer_text text check (answer_text is null or length(answer_text) <= 500),
  unknown boolean not null default false,
  language text not null check (language in ('mr', 'hi', 'en')),
  source text not null check (source in (
    'VOICE_DRAFT', 'TYPED', 'GUIDED_CHOICE', 'SYSTEM_CONTEXT'
  )),
  original_payload jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, answer_id),
  unique (environment, report_id, question_key, answer_revision),
  foreign key (environment, report_id) references workflow.health_report(environment, report_id),
  check ((unknown and answer_text is null) or (not unknown and answer_text is not null))
);

create table workflow.health_media_link (
  environment text not null,
  report_id uuid not null,
  asset_id uuid not null,
  required_view text not null check (required_view in (
    'WHOLE_PLANT', 'AFFECTED_LEAF_TOP', 'AFFECTED_LEAF_UNDERSIDE',
    'STEM_OR_BASE', 'FIELD_CONTEXT', 'OTHER'
  )),
  evidence_quality text not null check (evidence_quality in ('USABLE', 'LIMITED', 'UNUSABLE')),
  consent_access_version bigint not null check (consent_access_version > 0),
  scanner_version text,
  limitation text check (limitation is null or length(limitation) <= 220),
  attached_at timestamptz not null default statement_timestamp(),
  primary key (environment, report_id, asset_id),
  foreign key (environment, report_id) references workflow.health_report(environment, report_id),
  foreign key (asset_id) references media.asset(asset_id)
);

create table workflow.health_evidence_quality (
  environment text not null,
  evidence_quality_id uuid not null,
  report_id uuid not null,
  asset_id uuid,
  quality_band text not null check (quality_band in ('USABLE', 'LIMITED', 'UNUSABLE')),
  usable_photo_count integer not null check (usable_photo_count between 0 and 6),
  limited_photo_count integer not null check (limited_photo_count between 0 and 6),
  unusable_photo_count integer not null check (unusable_photo_count between 0 and 6),
  missing_required_context text[] not null default array[]::text[],
  limitations text[] not null default array[]::text[],
  validator_version text not null,
  assessment_payload jsonb not null,
  assessed_at timestamptz not null default statement_timestamp(),
  primary key (environment, evidence_quality_id),
  foreign key (environment, report_id) references workflow.health_report(environment, report_id),
  foreign key (asset_id) references media.asset(asset_id)
);

create table workflow.triage_result (
  environment text not null,
  triage_id uuid not null,
  report_id uuid not null,
  evidence_quality_id uuid,
  state text not null check (state in ('SUPPORTED', 'UNSUPPORTED', 'UNCLEAR')),
  severity text not null check (severity in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  confidence text not null check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  spread text not null check (spread in (
    'NOT_SPREADING', 'SPREADING', 'FAST_SPREADING', 'UNKNOWN'
  )),
  mandatory_escalation boolean not null,
  summary text not null check (length(summary) between 1 and 360),
  safe_next_step text not null check (length(safe_next_step) between 1 and 260),
  evidence_quality_band text not null check (evidence_quality_band in ('USABLE', 'LIMITED', 'UNUSABLE')),
  model_provider text not null check (model_provider in ('NONE', 'VERTEX_GEMINI', 'FIXTURE')),
  model_name text not null,
  model_version text not null,
  policy_version text not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  unavailable_reason text check (unavailable_reason is null or length(unavailable_reason) <= 160),
  result_payload jsonb not null,
  generated_at timestamptz not null,
  primary key (environment, triage_id),
  unique (environment, report_id),
  foreign key (environment, report_id) references workflow.health_report(environment, report_id),
  foreign key (environment, evidence_quality_id)
    references workflow.health_evidence_quality(environment, evidence_quality_id),
  check (not (evidence_quality_band = 'LIMITED' and confidence = 'HIGH')),
  check (not (evidence_quality_band = 'UNUSABLE' and model_provider <> 'NONE'))
);

create table workflow.triage_possible_category (
  environment text not null,
  triage_id uuid not null,
  rank integer not null check (rank between 1 and 3),
  category_key text not null check (category_key in (
    'RICE_LEAF_SPOT_POSSIBLE',
    'RICE_BLAST_POSSIBLE',
    'NUTRIENT_STRESS_POSSIBLE',
    'WATER_STRESS_POSSIBLE',
    'PEST_DAMAGE_POSSIBLE',
    'UNKNOWN_STRESS',
    'UNSUPPORTED_CROP_OR_PART'
  )),
  confidence text not null check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  label text not null check (length(label) between 1 and 120),
  evidence_refs text[] not null,
  limitations text[] not null default array[]::text[],
  primary key (environment, triage_id, category_key),
  unique (environment, triage_id, rank),
  foreign key (environment, triage_id) references workflow.triage_result(environment, triage_id)
);

create table workflow."case" (
  environment text not null,
  case_id uuid not null,
  report_id uuid not null,
  farmer_subject_id uuid not null,
  plot_id uuid not null,
  triage_id uuid not null,
  status text not null check (status in (
    'PENDING_EXPERT', 'ASSIGNED', 'AWAITING_FARMER', 'REPLIED',
    'FOLLOW_UP_DUE', 'RESOLVED', 'CLOSED', 'REOPENED'
  )),
  severity text not null check (severity in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  sharing_decision text not null check (sharing_decision = 'ALLOW'),
  consent_access_version bigint not null check (consent_access_version > 0),
  policy_version_id uuid not null,
  evidence_pack_expires_at timestamptz not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  title text not null check (length(title) between 1 and 160),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (environment, case_id),
  unique (environment, report_id),
  foreign key (environment, report_id) references workflow.health_report(environment, report_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, triage_id) references workflow.triage_result(environment, triage_id),
  check (evidence_pack_expires_at <= created_at + interval '30 days')
);

create table workflow.case_evidence_pack (
  environment text not null,
  evidence_pack_id uuid not null,
  case_id uuid not null,
  purpose_code text not null check (purpose_code = 'case.expert_support'),
  consent_access_version bigint not null check (consent_access_version > 0),
  policy_version_id uuid not null,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  manifest_checksum text not null check (manifest_checksum ~ '^sha256:[0-9a-f]{64}$'),
  item_count integer not null check (item_count between 1 and 50),
  pack_payload jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, evidence_pack_id),
  unique (environment, case_id, consent_access_version),
  foreign key (environment, case_id) references workflow."case"(environment, case_id),
  check (expires_at > valid_from),
  check (expires_at <= valid_from + interval '30 days')
);

create table workflow.case_evidence_ref (
  environment text not null,
  evidence_pack_id uuid not null,
  ref_kind text not null check (ref_kind in (
    'HEALTH_REPORT', 'HEALTH_MEDIA', 'TRIAGE_RESULT', 'EVIDENCE_RECORD'
  )),
  ref_id uuid not null,
  payload_classification text not null check (payload_classification = 'C3'),
  ref_payload jsonb not null,
  primary key (environment, evidence_pack_id, ref_kind, ref_id),
  foreign key (environment, evidence_pack_id)
    references workflow.case_evidence_pack(environment, evidence_pack_id)
);

create table workflow.work_case_link (
  environment text not null,
  work_item_id uuid not null,
  case_id uuid not null,
  purpose_code text not null check (purpose_code = 'case.expert_support'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, work_item_id),
  unique (environment, case_id, purpose_code),
  foreign key (environment, work_item_id) references workflow.rsk_work_item(environment, work_item_id),
  foreign key (environment, case_id) references workflow."case"(environment, case_id)
);

alter table workflow.health_report
  add constraint workflow_health_report_latest_triage_fk
  foreign key (environment, latest_triage_id)
  references workflow.triage_result(environment, triage_id);

alter table workflow.health_report
  add constraint workflow_health_report_case_fk
  foreign key (environment, case_id)
  references workflow."case"(environment, case_id);

do $$
declare
  relation regclass;
begin
  foreach relation in array array[
    'workflow.health_report'::regclass,
    'workflow.health_answer'::regclass,
    'workflow.health_media_link'::regclass,
    'workflow.health_evidence_quality'::regclass,
    'workflow.triage_result'::regclass,
    'workflow.triage_possible_category'::regclass,
    'workflow."case"'::regclass,
    'workflow.case_evidence_pack'::regclass,
    'workflow.case_evidence_ref'::regclass,
    'workflow.work_case_link'::regclass
  ]
  loop
    execute format('alter table %s enable row level security', relation);
    execute format('alter table %s force row level security', relation);
  end loop;
end $$;

create index health_report_owner_plot_state_idx
  on workflow.health_report(environment, farmer_subject_id, plot_id, lifecycle_state, updated_at desc);

create index health_media_link_report_quality_idx
  on workflow.health_media_link(environment, report_id, evidence_quality);

create index triage_result_report_generated_idx
  on workflow.triage_result(environment, report_id, generated_at desc);

create index crop_health_case_owner_status_idx
  on workflow."case"(environment, farmer_subject_id, status, updated_at desc);

create index crop_health_case_pending_expert_idx
  on workflow."case"(environment, severity, created_at)
  where status in ('PENDING_EXPERT', 'ASSIGNED', 'REOPENED');

create index case_evidence_pack_expiry_idx
  on workflow.case_evidence_pack(environment, expires_at);

comment on table workflow.health_report is
  'Milestone 7 Farmer Crop Health report aggregate. Draft/local capture is distinct from submitted server triage.';

comment on table workflow.triage_result is
  'Bounded Crop Health triage result. It stores possible/unclear findings only; no confirmed diagnosis, chemical choice or dose authority.';

comment on table workflow."case" is
  'Farmer-consented Crop Health Case foundation for RSK expert review. MP has no privilege or copied data.';

comment on table workflow.case_evidence_pack is
  'Purpose-limited Case evidence manifest. References minimum necessary evidence by identity instead of copying protected payloads into the work queue.';
