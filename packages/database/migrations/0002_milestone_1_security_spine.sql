create schema if not exists identity;
create schema if not exists consent;
create schema if not exists audit;

do $roles$
declare
  role_name text;
begin
  foreach role_name in array array[
    'sf_migrator',
    'sf_auth_state_writer',
    'sf_farmer_api',
    'sf_rsk_api',
    'sf_domain_worker',
    'sf_device_ingest',
    'sf_callback_ingest',
    'sf_privacy_candidate',
    'sf_privacy_publication',
    'sf_data_rights',
    'sf_audit_writer',
    'sf_audit_reader'
  ] loop
    if not exists (select 1 from pg_roles where rolname = role_name) then
      execute format(
        'create role %I nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls',
        role_name
      );
    end if;
    execute format(
      'alter role %I nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls',
      role_name
    );
  end loop;
end
$roles$;

create or replace function platform.request_uuid(setting_name text)
returns uuid
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $function$
declare
  raw_value text;
begin
  raw_value := current_setting(setting_name, true);
  if raw_value is null or btrim(raw_value) = '' then
    return null;
  end if;
  return raw_value::uuid;
exception
  when invalid_text_representation then return null;
end
$function$;

create or replace function platform.request_bigint(setting_name text)
returns bigint
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $function$
declare
  raw_value text;
begin
  raw_value := current_setting(setting_name, true);
  if raw_value is null or btrim(raw_value) = '' then
    return null;
  end if;
  return raw_value::bigint;
exception
  when invalid_text_representation or numeric_value_out_of_range then return null;
end
$function$;

create or replace function platform.reject_append_only_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'append-only relation cannot be updated or deleted';
end
$function$;

create table platform.retention_policy (
  retention_policy_id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version integer not null check (version > 0),
  trigger_kind text not null,
  duration_days integer check (duration_days is null or duration_days > 0),
  deletion_action text not null check (deletion_action in ('DELETE', 'ANONYMIZE', 'REVIEW')),
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (policy_key, version)
);

create table identity.subject (
  subject_id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('FARMER', 'STAFF')),
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  security_version bigint not null default 1 check (security_version > 0),
  authorization_version bigint not null default 1 check (authorization_version > 0),
  disabled_at timestamptz,
  retention_policy_id uuid not null references platform.retention_policy(retention_policy_id),
  retain_until timestamptz not null,
  contract_delete_at timestamptz,
  purge_state text not null default 'RETAIN' check (purge_state in ('RETAIN', 'CANDIDATE', 'PURGED')),
  created_at timestamptz not null default now(),
  check (contract_delete_at is null or contract_delete_at <= retain_until)
);

create table identity.auth_identity (
  auth_identity_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  provider text not null,
  provider_subject_hash text not null,
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (provider, provider_subject_hash, environment)
);

create table identity.subject_private (
  subject_id uuid primary key references identity.subject(subject_id),
  encrypted_display_name bytea,
  encrypted_contact bytea,
  key_reference text not null,
  updated_at timestamptz not null default now()
);

create table identity.farmer_profile (
  subject_id uuid primary key references identity.subject(subject_id),
  locale text not null check (locale in ('mr', 'hi', 'en')),
  onboarding_state text not null check (onboarding_state in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE')),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

create table identity.office (
  office_id uuid primary key default gen_random_uuid(),
  office_code text not null unique,
  display_name text not null,
  active boolean not null default true
);

create table identity.jurisdiction (
  jurisdiction_id uuid primary key default gen_random_uuid(),
  parent_jurisdiction_id uuid references identity.jurisdiction(jurisdiction_id),
  jurisdiction_code text not null unique,
  display_name text not null,
  active boolean not null default true
);

create table identity.office_jurisdiction (
  office_id uuid not null references identity.office(office_id),
  jurisdiction_id uuid not null references identity.jurisdiction(jurisdiction_id),
  valid_from timestamptz not null,
  valid_until timestamptz,
  primary key (office_id, jurisdiction_id, valid_from),
  check (valid_until is null or valid_until > valid_from)
);

create table identity.assisted_context (
  assisted_context_id uuid primary key,
  farmer_subject_id uuid not null references identity.subject(subject_id),
  office_id uuid not null references identity.office(office_id),
  jurisdiction_id uuid not null references identity.jurisdiction(jurisdiction_id),
  assigned_staff_subject_id uuid references identity.subject(subject_id),
  assignment_state text not null check (assignment_state in ('ASSIGNED', 'UNASSIGNED', 'CLOSED')),
  revision bigint not null default 1 check (revision > 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from),
  check (
    (assignment_state = 'ASSIGNED' and assigned_staff_subject_id is not null)
    or (assignment_state in ('UNASSIGNED', 'CLOSED') and assigned_staff_subject_id is null)
  )
);

create table identity.role_definition (
  role_type text primary key check (role_type in ('FARMER', 'RSK', 'MP')),
  display_name text not null,
  requires_mfa boolean not null
);

create table identity.capability_definition (
  capability_key text primary key,
  description text not null,
  classification text not null default 'C1' check (classification in ('C0', 'C1', 'C2', 'C3', 'C4', 'P1'))
);

create table identity.role_capability (
  role_type text not null references identity.role_definition(role_type),
  capability_key text not null references identity.capability_definition(capability_key),
  capability_set_version bigint not null check (capability_set_version > 0),
  primary key (role_type, capability_key, capability_set_version)
);

create table identity.role_grant (
  role_grant_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  role_type text not null references identity.role_definition(role_type),
  office_id uuid references identity.office(office_id),
  jurisdiction_id uuid references identity.jurisdiction(jurisdiction_id),
  capability_set_version bigint not null check (capability_set_version > 0),
  grant_version bigint not null default 1 check (grant_version > 0),
  valid_from timestamptz not null,
  valid_until timestamptz,
  revoked_at timestamptz,
  check (valid_until is null or valid_until > valid_from),
  check (
    (role_type = 'FARMER' and office_id is null and jurisdiction_id is null)
    or (role_type in ('RSK', 'MP') and office_id is not null and jurisdiction_id is not null)
  )
);

create table identity.role_grant_event (
  role_grant_event_id uuid primary key default gen_random_uuid(),
  role_grant_id uuid not null references identity.role_grant(role_grant_id),
  event_type text not null,
  grant_version bigint not null check (grant_version > 0),
  actor_subject_id uuid not null references identity.subject(subject_id),
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null
);

create table identity.role_context (
  role_context_id uuid primary key default gen_random_uuid(),
  role_grant_id uuid not null references identity.role_grant(role_grant_id),
  subject_id uuid not null references identity.subject(subject_id),
  role_type text not null references identity.role_definition(role_type),
  office_id uuid references identity.office(office_id),
  jurisdiction_id uuid references identity.jurisdiction(jurisdiction_id),
  purpose_code text not null check (purpose_code in (
    'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
    'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
  )),
  authorization_version bigint not null check (authorization_version > 0),
  capability_set_version bigint not null check (capability_set_version > 0),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > issued_at),
  check (
    (role_type = 'FARMER' and office_id is null and jurisdiction_id is null)
    or (role_type in ('RSK', 'MP') and office_id is not null and jurisdiction_id is not null)
  )
);

create table identity.role_context_event (
  role_context_event_id uuid primary key default gen_random_uuid(),
  role_context_id uuid not null references identity.role_context(role_context_id),
  event_type text not null check (event_type in ('CREATED', 'REVOKED', 'EXPIRED')),
  authorization_version bigint not null check (authorization_version > 0),
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null
);

create table identity.subject_device_binding (
  subject_device_binding_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  installation_id uuid not null,
  app_id text not null,
  environment text not null,
  binding_version bigint not null default 1 check (binding_version > 0),
  state text not null check (state in ('ACTIVE', 'REQUIRED', 'REVOKED')),
  last_verified_at timestamptz not null,
  unique (subject_id, installation_id, app_id, environment)
);

create table identity.auth_return_state (
  return_state_id uuid primary key default gen_random_uuid(),
  route_key text not null check (route_key in ('FARMER_HOME', 'RSK_HOME', 'MP_HOME')),
  environment text not null,
  app_id text not null,
  origin text not null,
  opaque_state_hash text not null unique,
  rate_limit_key text not null check (rate_limit_key ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index auth_return_state_rate_limit_idx
  on identity.auth_return_state (rate_limit_key, created_at desc);

create table platform.client_installation (
  installation_id uuid primary key,
  app_id text not null,
  environment text not null,
  build_id text not null,
  schema_version integer not null check (schema_version > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (installation_id, app_id, environment)
);

create table consent.policy_version (
  policy_version_id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  purpose_key text not null,
  version integer not null check (version > 0),
  locale text not null check (locale in ('mr', 'hi', 'en')),
  notice_digest text not null,
  effective_at timestamptz not null,
  retired_at timestamptz,
  unique (scope_key, purpose_key, version, locale)
);

create table consent.decision (
  consent_decision_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  scope_key text not null check (scope_key in (
    'location.processing', 'audio.storage', 'case.sharing', 'sensor.collection',
    'sensor.maintenance_location', 'visit.access', 'assisted_service.access',
    'channel.app_push', 'channel.sms', 'channel.ivr', 'market.private_fields'
  )),
  purpose_key text not null check (purpose_key in (
    'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
    'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
  )),
  target_kind text not null check (target_kind in ('ACCOUNT', 'ASSISTED_FARMER_CONTEXT')),
  target_id uuid not null,
  decision text not null check (decision in ('ALLOW', 'DENY', 'WITHDRAW')),
  policy_version_id uuid not null references consent.policy_version(policy_version_id),
  access_version bigint not null check (access_version > 0),
  expires_at timestamptz,
  actor_subject_id uuid not null references identity.subject(subject_id),
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null,
  unique (subject_id, scope_key, purpose_key, target_kind, target_id, access_version)
);

create table consent.current_state (
  subject_id uuid not null references identity.subject(subject_id),
  scope_key text not null check (scope_key in (
    'location.processing', 'audio.storage', 'case.sharing', 'sensor.collection',
    'sensor.maintenance_location', 'visit.access', 'assisted_service.access',
    'channel.app_push', 'channel.sms', 'channel.ivr', 'market.private_fields'
  )),
  purpose_key text not null check (purpose_key in (
    'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
    'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
  )),
  target_kind text not null check (target_kind in ('ACCOUNT', 'ASSISTED_FARMER_CONTEXT')),
  target_id uuid not null,
  consent_decision_id uuid not null references consent.decision(consent_decision_id),
  state text not null check (state in ('MISSING', 'ALLOWED', 'DENIED', 'EXPIRED', 'WITHDRAWN')),
  access_version bigint not null check (access_version > 0),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (subject_id, scope_key, purpose_key, target_kind, target_id)
);

create table consent.access_grant (
  access_grant_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  role_context_id uuid not null references identity.role_context(role_context_id),
  target_kind text not null check (target_kind = 'ASSISTED_FARMER_CONTEXT'),
  target_id uuid not null,
  grantee_subject_id uuid not null references identity.subject(subject_id),
  office_id uuid not null references identity.office(office_id),
  jurisdiction_id uuid not null references identity.jurisdiction(jurisdiction_id),
  purpose_key text not null,
  access_version bigint not null check (access_version > 0),
  grant_version bigint not null default 1 check (grant_version > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (
    subject_id, target_kind, target_id, grantee_subject_id, purpose_key, access_version
  )
);

create table consent.access_grant_event (
  access_grant_event_id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null references consent.access_grant(access_grant_id),
  event_type text not null check (event_type in ('ISSUED', 'REVOKED', 'EXPIRED')),
  grant_version bigint not null check (grant_version > 0),
  access_version bigint not null check (access_version > 0),
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null
);

create table consent.revocation_operation (
  revocation_operation_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references identity.subject(subject_id),
  scope_key text not null,
  purpose_key text not null,
  target_kind text not null,
  target_id uuid not null,
  access_version bigint not null check (access_version > 0),
  operation_kind text not null check (operation_kind in (
    'REVOKE_LOCATION_PROCESSING', 'CANCEL_QUEUED_EARTH_AI_WORK',
    'DELETE_STORED_AUDIO', 'CANCEL_QUEUED_MEDIA_AI_WORK',
    'REVOKE_CASE_SHARING', 'CANCEL_QUEUED_CASE_AI_WORK',
    'STOP_SENSOR_COLLECTION', 'DEASSIGN_SENSOR',
    'REVOKE_MAINTENANCE_LOCATION', 'REVOKE_VISIT_ACCESS',
    'REVOKE_OFFLINE_PACKS', 'REVOKE_ASSISTED_SESSIONS',
    'REVOKE_ACCESS_GRANTS', 'REVOKE_PUSH_REGISTRATIONS',
    'CANCEL_QUEUED_PUSH_DELIVERIES', 'CANCEL_QUEUED_SMS_DELIVERIES',
    'CANCEL_QUEUED_IVR_DELIVERIES', 'REVOKE_MARKET_PRIVATE_FIELDS',
    'CANCEL_QUEUED_MARKET_SUPPORT_WORK'
  )),
  state text not null default 'PENDING' check (state in ('PENDING', 'CLAIMED', 'COMPLETE', 'FAILED')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table platform.command_execution (
  command_execution_id uuid primary key default gen_random_uuid(),
  environment text not null,
  principal_id text not null,
  command_id uuid not null,
  operation text not null,
  command_hash text not null check (command_hash ~ '^[0-9a-f]{64}$'),
  expected_revision bigint not null check (expected_revision >= 0),
  state text not null check (state in ('IN_PROGRESS', 'COMPLETE', 'REJECTED')),
  safe_receipt jsonb,
  problem_code text,
  authorization_version bigint not null check (authorization_version > 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  retain_until timestamptz not null,
  unique (environment, principal_id, command_id)
);

create table platform.long_operation (
  operation_id uuid primary key default gen_random_uuid(),
  command_execution_id uuid not null references platform.command_execution(command_execution_id),
  operation_type text not null,
  state text not null check (state in ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED')),
  safe_progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table platform.domain_event (
  event_id uuid primary key,
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  owner_subject_id uuid references identity.subject(subject_id),
  event_type text not null,
  event_version integer not null check (event_version > 0),
  aggregate_type text not null check (length(aggregate_type) between 1 and 80),
  aggregate_id uuid not null,
  aggregate_revision bigint not null check (aggregate_revision > 0),
  event_ordinal bigint not null check (event_ordinal > 0),
  client_recorded_at timestamptz,
  server_received_at timestamptz not null,
  committed_at timestamptz not null,
  actor_type text not null check (actor_type in ('FARMER', 'RSK_STAFF', 'MP_STAFF', 'SYSTEM', 'DEVICE', 'PROVIDER')),
  actor_ref uuid,
  role_context_ref uuid,
  device_ref uuid,
  jurisdiction_id uuid,
  purpose_code text check (purpose_code is null or purpose_code in (
    'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
    'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
  )),
  consent_access_version bigint check (consent_access_version is null or consent_access_version > 0),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  provenance_types text[] not null check (cardinality(provenance_types) between 1 and 9),
  mode_derivation_version text not null check (length(mode_derivation_version) between 1 and 80),
  payload jsonb not null,
  classification text not null check (classification in ('C0', 'C1', 'C2')),
  retention_policy_id uuid not null references platform.retention_policy(retention_policy_id),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null,
  causation_id uuid,
  trace_id text check (trace_id is null or trace_id ~ '^[0-9a-f]{32}$'),
  producer_service text not null check (length(producer_service) between 1 and 80),
  producer_build text not null check (length(producer_build) between 1 and 120),
  retention_class text not null check (length(retention_class) between 1 and 80),
  payload_schema_version integer not null check (payload_schema_version > 0),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  unique (aggregate_id, event_ordinal),
  check (substring(event_id::text from 15 for 1) = '7')
);

create table platform.technical_event (
  event_id uuid primary key,
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  owner_subject_id uuid references identity.subject(subject_id),
  event_type text not null,
  event_version integer not null check (event_version > 0),
  aggregate_type text not null check (length(aggregate_type) between 1 and 80),
  aggregate_id uuid not null,
  aggregate_revision bigint not null check (aggregate_revision > 0),
  event_ordinal bigint not null check (event_ordinal > 0),
  client_recorded_at timestamptz,
  server_received_at timestamptz not null,
  committed_at timestamptz not null,
  actor_type text not null check (actor_type in ('FARMER', 'RSK_STAFF', 'MP_STAFF', 'SYSTEM', 'DEVICE', 'PROVIDER')),
  actor_ref uuid,
  role_context_ref uuid,
  device_ref uuid,
  jurisdiction_id uuid,
  purpose_code text check (purpose_code is null or purpose_code in (
    'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
    'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
  )),
  consent_access_version bigint check (consent_access_version is null or consent_access_version > 0),
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  provenance_types text[] not null check (cardinality(provenance_types) between 1 and 9),
  mode_derivation_version text not null check (length(mode_derivation_version) between 1 and 80),
  payload jsonb not null,
  classification text not null check (classification in ('C0', 'C1', 'C2')),
  retention_policy_id uuid not null references platform.retention_policy(retention_policy_id),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  correlation_id uuid not null,
  causation_id uuid,
  trace_id text check (trace_id is null or trace_id ~ '^[0-9a-f]{32}$'),
  producer_service text not null check (length(producer_service) between 1 and 80),
  producer_build text not null check (length(producer_build) between 1 and 120),
  retention_class text not null check (length(retention_class) between 1 and 80),
  payload_schema_version integer not null check (payload_schema_version > 0),
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  unique (aggregate_id, event_ordinal),
  check (substring(event_id::text from 15 for 1) = '7')
);

create table platform.integration_event (
  integration_event_id uuid primary key,
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  owner_subject_id uuid references identity.subject(subject_id),
  source_event_id uuid not null,
  destination text not null,
  event_type text not null,
  payload jsonb not null,
  classification text not null check (classification in ('C0', 'C1', 'C2')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source_event_id, destination)
);

create table platform.outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  owner_subject_id uuid references identity.subject(subject_id),
  integration_event_id uuid not null references platform.integration_event(integration_event_id),
  destination text not null,
  state text not null default 'PENDING' check (state in ('PENDING', 'CLAIMED', 'PUBLISHED', 'FAILED')),
  available_at timestamptz not null default now(),
  claimed_by text,
  claim_expires_at timestamptz,
  claim_token uuid,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  published_at timestamptz,
  last_safe_problem_code text,
  unique (integration_event_id, destination),
  check (
    (state = 'CLAIMED' and claimed_by is not null and claim_expires_at is not null and claim_token is not null)
    or (state <> 'CLAIMED' and claimed_by is null and claim_expires_at is null and claim_token is null)
  )
);

create index outbox_claim_idx on platform.outbox (state, available_at, claim_expires_at);

create table platform.consumer_inbox (
  consumer_name text not null,
  event_id uuid not null,
  state text not null check (state in ('PROCESSING', 'APPLIED', 'REJECTED', 'RETRY')),
  final_disposition jsonb,
  first_received_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (consumer_name, event_id)
);

create table platform.provider_callback_inbox (
  provider_name text not null,
  callback_id text not null,
  signature_digest text not null,
  state text not null check (state in ('RECEIVED', 'APPLIED', 'REJECTED')),
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (provider_name, callback_id)
);

create table platform.dead_letter (
  dead_letter_id uuid primary key default gen_random_uuid(),
  source_kind text not null,
  source_id text not null,
  safe_problem_code text not null,
  attempt_count integer not null check (attempt_count > 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table audit.fact (
  audit_fact_id uuid primary key default gen_random_uuid(),
  actor_subject_id uuid not null references identity.subject(subject_id),
  role_context_id uuid not null references identity.role_context(role_context_id),
  role_type text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  purpose_code text not null,
  office_id uuid not null,
  jurisdiction_id uuid not null,
  authorization_version bigint not null check (authorization_version > 0),
  outcome text not null check (outcome in ('ALLOW', 'DENY')),
  reason_code text not null,
  before_revision bigint,
  after_revision bigint,
  correlation_id uuid not null,
  transaction_id bigint not null default txid_current(),
  recorded_at timestamptz not null default now()
);

-- Runtime roles cannot read or mutate these projections. Trigger-owned copies let RLS
-- validate current authority without recursively querying FORCE-RLS identity tables.
create table platform.subject_authority_projection (
  subject_id uuid primary key,
  subject_type text not null check (subject_type in ('FARMER', 'STAFF')),
  environment text not null check (environment in ('local', 'preview', 'staging', 'demo', 'production')),
  security_version bigint not null check (security_version > 0),
  authorization_version bigint not null check (authorization_version > 0),
  active boolean not null
);

create table platform.role_grant_authority_projection (
  role_grant_id uuid primary key,
  subject_id uuid not null,
  role_type text not null check (role_type in ('FARMER', 'RSK', 'MP')),
  office_id uuid,
  jurisdiction_id uuid,
  capability_set_version bigint not null check (capability_set_version > 0),
  valid_from timestamptz not null,
  valid_until timestamptz,
  revoked_at timestamptz
);

create table platform.role_context_authority_projection (
  role_context_id uuid primary key,
  role_grant_id uuid not null,
  subject_id uuid not null,
  role_type text not null check (role_type in ('FARMER', 'RSK', 'MP')),
  office_id uuid,
  jurisdiction_id uuid,
  purpose_code text not null,
  authorization_version bigint not null check (authorization_version > 0),
  capability_set_version bigint not null check (capability_set_version > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table platform.consent_authority_projection (
  subject_id uuid not null,
  scope_key text not null,
  purpose_key text not null,
  target_kind text not null,
  target_id uuid not null,
  state text not null,
  access_version bigint not null check (access_version > 0),
  expires_at timestamptz,
  primary key (subject_id, scope_key, purpose_key, target_kind, target_id)
);

create or replace function platform.sync_subject_authority_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, platform
as $function$
begin
  if tg_op = 'DELETE' then
    delete from platform.subject_authority_projection where subject_id = old.subject_id;
    return old;
  end if;
  insert into platform.subject_authority_projection (
    subject_id, subject_type, environment, security_version, authorization_version, active
  ) values (
    new.subject_id, new.subject_type, new.environment, new.security_version,
    new.authorization_version, new.disabled_at is null and new.purge_state <> 'PURGED'
  ) on conflict (subject_id) do update set
    subject_type = excluded.subject_type,
    environment = excluded.environment,
    security_version = excluded.security_version,
    authorization_version = excluded.authorization_version,
    active = excluded.active;
  return new;
end
$function$;

create or replace function platform.sync_role_grant_authority_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, platform
as $function$
begin
  if tg_op = 'DELETE' then
    delete from platform.role_grant_authority_projection where role_grant_id = old.role_grant_id;
    return old;
  end if;
  insert into platform.role_grant_authority_projection (
    role_grant_id, subject_id, role_type, office_id, jurisdiction_id,
    capability_set_version, valid_from, valid_until, revoked_at
  ) values (
    new.role_grant_id, new.subject_id, new.role_type, new.office_id, new.jurisdiction_id,
    new.capability_set_version, new.valid_from, new.valid_until, new.revoked_at
  ) on conflict (role_grant_id) do update set
    subject_id = excluded.subject_id,
    role_type = excluded.role_type,
    office_id = excluded.office_id,
    jurisdiction_id = excluded.jurisdiction_id,
    capability_set_version = excluded.capability_set_version,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    revoked_at = excluded.revoked_at;
  return new;
end
$function$;

create or replace function platform.sync_role_context_authority_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, platform
as $function$
begin
  if tg_op = 'DELETE' then
    delete from platform.role_context_authority_projection
    where role_context_id = old.role_context_id;
    return old;
  end if;
  insert into platform.role_context_authority_projection (
    role_context_id, role_grant_id, subject_id, role_type, office_id, jurisdiction_id, purpose_code,
    authorization_version, capability_set_version, expires_at, revoked_at
  ) values (
    new.role_context_id, new.role_grant_id, new.subject_id, new.role_type,
    new.office_id, new.jurisdiction_id, new.purpose_code, new.authorization_version,
    new.capability_set_version, new.expires_at, new.revoked_at
  ) on conflict (role_context_id) do update set
    role_grant_id = excluded.role_grant_id,
    subject_id = excluded.subject_id,
    role_type = excluded.role_type,
    office_id = excluded.office_id,
    jurisdiction_id = excluded.jurisdiction_id,
    purpose_code = excluded.purpose_code,
    authorization_version = excluded.authorization_version,
    capability_set_version = excluded.capability_set_version,
    expires_at = excluded.expires_at,
    revoked_at = excluded.revoked_at;
  return new;
end
$function$;

create or replace function platform.sync_consent_authority_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, platform
as $function$
begin
  if tg_op = 'DELETE' then
    delete from platform.consent_authority_projection
    where subject_id = old.subject_id
      and scope_key = old.scope_key
      and purpose_key = old.purpose_key
      and target_kind = old.target_kind
      and target_id = old.target_id;
    return old;
  end if;
  insert into platform.consent_authority_projection (
    subject_id, scope_key, purpose_key, target_kind, target_id,
    state, access_version, expires_at
  ) values (
    new.subject_id, new.scope_key, new.purpose_key, new.target_kind, new.target_id,
    new.state, new.access_version, new.expires_at
  ) on conflict (subject_id, scope_key, purpose_key, target_kind, target_id) do update set
    state = excluded.state,
    access_version = excluded.access_version,
    expires_at = excluded.expires_at;
  return new;
end
$function$;

alter function platform.sync_subject_authority_projection() owner to sf_migrator;
alter function platform.sync_role_grant_authority_projection() owner to sf_migrator;
alter function platform.sync_role_context_authority_projection() owner to sf_migrator;
alter function platform.sync_consent_authority_projection() owner to sf_migrator;

create trigger sync_subject_authority_projection
after insert or update or delete on identity.subject
for each row execute function platform.sync_subject_authority_projection();
create trigger sync_role_grant_authority_projection
after insert or update or delete on identity.role_grant
for each row execute function platform.sync_role_grant_authority_projection();
create trigger sync_role_context_authority_projection
after insert or update or delete on identity.role_context
for each row execute function platform.sync_role_context_authority_projection();
create trigger sync_consent_authority_projection
after insert or update or delete on consent.current_state
for each row execute function platform.sync_consent_authority_projection();

insert into platform.subject_authority_projection
select subject_id, subject_type, environment, security_version, authorization_version,
       disabled_at is null and purge_state <> 'PURGED'
from identity.subject;
insert into platform.role_grant_authority_projection
select role_grant_id, subject_id, role_type, office_id, jurisdiction_id,
       capability_set_version, valid_from, valid_until, revoked_at
from identity.role_grant;
insert into platform.role_context_authority_projection
select role_context_id, role_grant_id, subject_id, role_type, office_id, jurisdiction_id, purpose_code,
       authorization_version, capability_set_version, expires_at, revoked_at
from identity.role_context;
insert into platform.consent_authority_projection
select subject_id, scope_key, purpose_key, target_kind, target_id,
       state, access_version, expires_at
from consent.current_state;

create or replace function platform.request_context_valid()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, platform
as $function$
  select exists (
    select 1
    from platform.role_context_authority_projection role_context
    join platform.role_grant_authority_projection role_grant
      on role_grant.role_grant_id = role_context.role_grant_id
    join platform.subject_authority_projection subject
      on subject.subject_id = role_context.subject_id
    where role_context.role_context_id = platform.request_uuid('app.role_context_id')
      and role_context.subject_id = platform.request_uuid('app.subject_id')
      and role_context.role_type = current_setting('app.role_type', true)
      and role_context.authorization_version = platform.request_bigint('app.authorization_version')
      and role_context.purpose_code = current_setting('app.purpose_code', true)
      and role_context.capability_set_version = role_grant.capability_set_version
      and role_context.expires_at <= coalesce(role_grant.valid_until, 'infinity'::timestamptz)
      and role_context.revoked_at is null
      and role_context.expires_at > statement_timestamp()
      and role_grant.subject_id = role_context.subject_id
      and role_grant.role_type = role_context.role_type
      and role_grant.office_id is not distinct from role_context.office_id
      and role_grant.jurisdiction_id is not distinct from role_context.jurisdiction_id
      and role_grant.revoked_at is null
      and role_grant.valid_from <= statement_timestamp()
      and (role_grant.valid_until is null or role_grant.valid_until > statement_timestamp())
      and subject.active
      and subject.environment = current_setting('app.environment', true)
      and subject.authorization_version = role_context.authorization_version
      and current_setting('app.surface', true) = role_context.role_type
      and current_setting('app.purpose_code', true) in (
        'farmer.self_service', 'case.expert_support', 'field.visit', 'sensor.maintenance',
        'assisted.service', 'alert.delivery', 'market.support', 'data.rights'
      )
      and (
        (
          role_context.role_type = 'FARMER'
          and subject.subject_type = 'FARMER'
          and role_context.office_id is null
          and role_context.jurisdiction_id is null
          and platform.request_uuid('app.office_id') = '00000000-0000-0000-0000-000000000000'::uuid
          and platform.request_uuid('app.jurisdiction_id') = '00000000-0000-0000-0000-000000000000'::uuid
          and current_setting('app.purpose_code', true) in ('farmer.self_service', 'data.rights')
        ) or (
          role_context.role_type = 'RSK'
          and subject.subject_type = 'STAFF'
          and role_context.office_id = platform.request_uuid('app.office_id')
          and role_context.jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
          and current_setting('app.purpose_code', true) <> 'farmer.self_service'
          and exists (
            select 1
            from identity.office_jurisdiction office_jurisdiction
            join identity.office office
              on office.office_id = office_jurisdiction.office_id
            join identity.jurisdiction jurisdiction
              on jurisdiction.jurisdiction_id = office_jurisdiction.jurisdiction_id
            where office_jurisdiction.office_id = role_context.office_id
              and office_jurisdiction.jurisdiction_id = role_context.jurisdiction_id
              and office_jurisdiction.valid_from <= statement_timestamp()
              and (
                office_jurisdiction.valid_until is null
                or office_jurisdiction.valid_until > statement_timestamp()
              )
              and office.active
              and jurisdiction.active
          )
        )
      )
  )
$function$;

create or replace function platform.request_surface_valid()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $function$
  select case current_setting('role', true)
    when 'sf_farmer_api' then
      current_setting('app.surface', true) = 'FARMER'
      and current_setting('app.role_type', true) = 'FARMER'
    when 'sf_rsk_api' then
      current_setting('app.surface', true) = 'RSK'
      and current_setting('app.role_type', true) = 'RSK'
    else false
  end
$function$;

create or replace function platform.request_has_capability(required_capability text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, platform, identity
as $function$
  select platform.request_context_valid()
    and exists (
      select 1
      from platform.role_context_authority_projection role_context
      join identity.role_capability capability
        on capability.role_type = role_context.role_type
       and capability.capability_set_version = role_context.capability_set_version
      where role_context.role_context_id = platform.request_uuid('app.role_context_id')
        and capability.capability_key = required_capability
    )
$function$;

create or replace function platform.consent_access_current(
  farmer_subject_reference uuid,
  scope_key_value text,
  purpose_key_value text,
  target_kind_value text,
  target_reference uuid,
  access_version_value bigint
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, platform
as $function$
  select exists (
    select 1
    from platform.consent_authority_projection consent_state
    where consent_state.subject_id = farmer_subject_reference
      and consent_state.scope_key = scope_key_value
      and consent_state.purpose_key = purpose_key_value
      and consent_state.target_kind = target_kind_value
      and consent_state.target_id = target_reference
      and consent_state.state = 'ALLOWED'
      and consent_state.access_version = access_version_value
      and (
        consent_state.expires_at is null
        or consent_state.expires_at > statement_timestamp()
      )
  )
$function$;

alter function platform.request_context_valid() owner to sf_migrator;
alter function platform.request_has_capability(text) owner to sf_migrator;
alter function platform.consent_access_current(uuid, text, text, text, uuid, bigint)
  owner to sf_migrator;

create or replace function identity.resolve_auth_subject(
  provider_name text,
  provider_subject_digest text,
  requested_environment text
)
returns table (
  subject_id uuid,
  subject_type text,
  environment text,
  security_version bigint,
  status text
)
language sql
stable
security definer
set search_path = pg_catalog, identity
as $function$
  select subject.subject_id,
         subject.subject_type,
         subject.environment,
         subject.security_version,
         case
           when subject.purge_state = 'PURGED' then 'DELETED'
           when subject.disabled_at is not null then 'DISABLED'
           else 'ACTIVE'
         end::text
  from identity.auth_identity auth_identity
  join identity.subject subject on subject.subject_id = auth_identity.subject_id
  where length(provider_name) between 1 and 64
    and provider_subject_digest ~ '^[0-9a-f]{64}$'
    and requested_environment in ('local', 'preview', 'staging', 'demo', 'production')
    and auth_identity.provider = provider_name
    and auth_identity.provider_subject_hash = provider_subject_digest
    and auth_identity.environment = requested_environment
    and subject.environment = requested_environment
    and auth_identity.revoked_at is null
  limit 1
$function$;

alter function identity.resolve_auth_subject(text, text, text) owner to sf_migrator;

create or replace function platform.runtime_subject_matches(
  subject_reference uuid,
  requested_environment text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, platform
as $function$
  select exists (
    select 1
    from platform.subject_authority_projection subject
    where subject.subject_id = subject_reference
      and subject.environment = requested_environment
      and subject.active
      and (
        (current_setting('role', true) = 'sf_farmer_api' and subject.subject_type = 'FARMER')
        or (current_setting('role', true) = 'sf_rsk_api' and subject.subject_type = 'STAFF')
      )
  )
$function$;
alter function platform.runtime_subject_matches(uuid, text) owner to sf_migrator;

create or replace function identity.current_authority_snapshot(
  subject_reference uuid,
  requested_environment text,
  installation_reference text,
  app_id_value text,
  requested_role_context uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  subject_row platform.subject_authority_projection%rowtype;
  required_role_type text;
  device_state text := 'REQUIRED';
  roles_value jsonb := '[]'::jsonb;
  context_value jsonb;
  farmer_profile_value jsonb;
  capability_version bigint := 1;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment)
    or length(app_id_value) not between 1 and 256 then
    return null;
  end if;

  required_role_type := case current_setting('role', true)
    when 'sf_farmer_api' then 'FARMER'
    when 'sf_rsk_api' then 'RSK'
    else null
  end;
  if required_role_type is null then return null; end if;

  perform pg_advisory_xact_lock(hashtextextended('authority:' || subject_reference::text, 0));
  select * into subject_row
  from platform.subject_authority_projection subject
  where subject.subject_id = subject_reference
    and subject.environment = requested_environment
    and subject.active
  for update;
  if not found then return null; end if;

  if installation_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select binding.state into device_state
    from identity.subject_device_binding binding
    where binding.subject_id = subject_reference
      and binding.installation_id = installation_reference::uuid
      and binding.app_id = app_id_value
      and binding.environment = requested_environment
    order by binding.binding_version desc
    limit 1;
    device_state := coalesce(device_state, 'REQUIRED');
  end if;

  perform 1 from platform.role_grant_authority_projection grant_row
  where grant_row.subject_id = subject_reference and grant_row.role_type = required_role_type
  for update;
  select coalesce(jsonb_agg(role_value order by role_value->>'roleGrantId'), '[]'::jsonb),
         coalesce(max(role_capability_version), 1)
  into roles_value, capability_version
  from (
    select jsonb_build_object(
      'roleGrantId', grant_row.role_grant_id,
      'subjectId', grant_row.subject_id,
      'roleType', grant_row.role_type,
      'destination', case grant_row.role_type
        when 'FARMER' then '/farmer/today'
        when 'RSK' then '/rsk/work'
        else '/mp/overview'
      end,
      'authorizationVersion', subject_row.authorization_version,
      'capabilitySetVersion', grant_row.capability_set_version,
      'capabilities', coalesce((
        select jsonb_agg(capability.capability_key order by capability.capability_key)
        from identity.role_capability capability
        where capability.role_type = grant_row.role_type
          and capability.capability_set_version = grant_row.capability_set_version
      ), '[]'::jsonb),
      'defaultPurposeCode', case grant_row.role_type
        when 'FARMER' then 'farmer.self_service'
        else 'assisted.service'
      end,
      'active', grant_row.revoked_at is null
        and grant_row.valid_from <= statement_timestamp()
        and (grant_row.valid_until is null or grant_row.valid_until > statement_timestamp())
    ) || case when grant_row.office_id is null then '{}'::jsonb else jsonb_build_object(
      'officeId', grant_row.office_id, 'jurisdictionId', grant_row.jurisdiction_id
    ) end as role_value,
    grant_row.capability_set_version as role_capability_version
    from platform.role_grant_authority_projection grant_row
    where grant_row.subject_id = subject_reference
      and grant_row.role_type = required_role_type
  ) role_rows;

  if requested_role_context is not null then
    perform 1 from platform.role_context_authority_projection context_row
    where context_row.role_context_id = requested_role_context
      and context_row.subject_id = subject_reference
    for update;
    select jsonb_build_object(
      'environment', requested_environment,
      'subjectId', context_row.subject_id,
      'roleContextId', context_row.role_context_id,
      'roleType', context_row.role_type,
      'purposeCode', context_row.purpose_code,
      'authorizationVersion', context_row.authorization_version,
      'capabilitySetVersion', context_row.capability_set_version,
      'capabilities', coalesce((
        select jsonb_agg(capability.capability_key order by capability.capability_key)
        from identity.role_capability capability
        where capability.role_type = context_row.role_type
          and capability.capability_set_version = context_row.capability_set_version
      ), '[]'::jsonb)
    ) || case when context_row.office_id is null then '{}'::jsonb else jsonb_build_object(
      'officeId', context_row.office_id, 'jurisdictionId', context_row.jurisdiction_id
    ) end
    into context_value
    from platform.role_context_authority_projection context_row
    join platform.role_grant_authority_projection grant_row
      on grant_row.role_grant_id = context_row.role_grant_id
    where context_row.role_context_id = requested_role_context
      and context_row.subject_id = subject_reference
      and context_row.role_type = required_role_type
      and context_row.authorization_version = subject_row.authorization_version
      and context_row.capability_set_version = grant_row.capability_set_version
      and context_row.revoked_at is null
      and context_row.expires_at > statement_timestamp()
      and grant_row.revoked_at is null
      and grant_row.valid_from <= statement_timestamp()
      and (grant_row.valid_until is null or grant_row.valid_until > statement_timestamp());
  end if;

  if subject_row.subject_type = 'FARMER' then
    select jsonb_build_object('locale', profile.locale, 'onboardingState', profile.onboarding_state)
    into farmer_profile_value
    from identity.farmer_profile profile
    where profile.subject_id = subject_reference;
  end if;

  return jsonb_build_object(
    'subjectId', subject_row.subject_id,
    'subjectType', subject_row.subject_type,
    'environment', subject_row.environment,
    'securityVersion', subject_row.security_version,
    'authorizationVersion', subject_row.authorization_version,
    'status', 'ACTIVE',
    'deviceBindingState', device_state,
    'capabilitySetVersion', capability_version,
    'roles', roles_value
  ) || case when context_value is null then '{}'::jsonb
            else jsonb_build_object('activeRoleContext', context_value) end
    || case when farmer_profile_value is null then '{}'::jsonb
            else jsonb_build_object('farmerProfile', farmer_profile_value) end;
end
$function$;
alter function identity.current_authority_snapshot(uuid, text, text, text, uuid)
  owner to sf_migrator;

create or replace function identity.role_grant_snapshot(
  subject_reference uuid,
  requested_environment text,
  role_grant_reference uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  grant_row platform.role_grant_authority_projection%rowtype;
  subject_row platform.subject_authority_projection%rowtype;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment) then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('role-grant:' || role_grant_reference::text, 0));
  select * into subject_row from platform.subject_authority_projection
    where subject_id = subject_reference and environment = requested_environment and active
    for update;
  select * into grant_row from platform.role_grant_authority_projection
    where role_grant_id = role_grant_reference and subject_id = subject_reference
    for update;
  if not found
    or (current_setting('role', true) = 'sf_farmer_api' and grant_row.role_type <> 'FARMER')
    or (current_setting('role', true) = 'sf_rsk_api' and grant_row.role_type <> 'RSK') then
    return null;
  end if;
  return jsonb_build_object(
    'roleGrantId', grant_row.role_grant_id,
    'subjectId', grant_row.subject_id,
    'roleType', grant_row.role_type,
    'destination', case grant_row.role_type when 'FARMER' then '/farmer/today' else '/rsk/work' end,
    'authorizationVersion', subject_row.authorization_version,
    'capabilitySetVersion', grant_row.capability_set_version,
    'capabilities', coalesce((select jsonb_agg(capability_key order by capability_key)
      from identity.role_capability where role_type = grant_row.role_type
        and capability_set_version = grant_row.capability_set_version), '[]'::jsonb),
    'defaultPurposeCode', case grant_row.role_type when 'FARMER' then 'farmer.self_service' else 'assisted.service' end,
    'active', grant_row.revoked_at is null and grant_row.valid_from <= statement_timestamp()
      and (grant_row.valid_until is null or grant_row.valid_until > statement_timestamp())
  ) || case when grant_row.office_id is null then '{}'::jsonb else jsonb_build_object(
    'officeId', grant_row.office_id, 'jurisdictionId', grant_row.jurisdiction_id
  ) end;
end
$function$;
alter function identity.role_grant_snapshot(uuid, text, uuid) owner to sf_migrator;

create or replace function identity.owned_role_context_snapshot(
  subject_reference uuid,
  requested_environment text,
  role_context_reference uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  context_row platform.role_context_authority_projection%rowtype;
  event_revision bigint;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment) then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('role-context:' || role_context_reference::text, 0));
  select * into context_row from platform.role_context_authority_projection
  where role_context_id = role_context_reference and subject_id = subject_reference
  for update;
  if not found
    or (current_setting('role', true) = 'sf_farmer_api' and context_row.role_type <> 'FARMER')
    or (current_setting('role', true) = 'sf_rsk_api' and context_row.role_type <> 'RSK') then
    return null;
  end if;
  select count(*)::bigint into event_revision
  from identity.role_context_event where role_context_id = role_context_reference;
  return jsonb_build_object(
    'roleContextId', context_row.role_context_id,
    'subjectId', context_row.subject_id,
    'roleType', context_row.role_type,
    'authorizationVersion', context_row.authorization_version,
    'revision', greatest(event_revision, 1),
    'revoked', context_row.revoked_at is not null or context_row.expires_at <= statement_timestamp(),
    'purposeCode', context_row.purpose_code
  ) || case when context_row.jurisdiction_id is null then '{}'::jsonb else
    jsonb_build_object('jurisdictionId', context_row.jurisdiction_id) end;
end
$function$;
alter function identity.owned_role_context_snapshot(uuid, text, uuid) owner to sf_migrator;

create or replace function identity.create_role_context(
  role_context_reference uuid,
  role_grant_reference uuid,
  subject_reference uuid,
  requested_environment text,
  purpose_code_value text,
  issued_at_value timestamptz,
  expires_at_value timestamptz,
  correlation_reference uuid,
  staff_mfa_current boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  grant_row platform.role_grant_authority_projection%rowtype;
  subject_row platform.subject_authority_projection%rowtype;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment)
    or issued_at_value > statement_timestamp() + interval '1 minute'
    or expires_at_value <= issued_at_value
    or expires_at_value > issued_at_value + interval '1 hour' then
    raise exception using errcode = '42501', message = 'role context denied';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('role-grant:' || role_grant_reference::text, 0));
  select * into subject_row from platform.subject_authority_projection
    where subject_id = subject_reference and environment = requested_environment and active
    for update;
  select * into grant_row from platform.role_grant_authority_projection
    where role_grant_id = role_grant_reference and subject_id = subject_reference
    for update;
  if not found
    or grant_row.revoked_at is not null
    or grant_row.valid_from > statement_timestamp()
    or (grant_row.valid_until is not null and grant_row.valid_until < expires_at_value)
    or (grant_row.role_type = 'FARMER' and current_setting('role', true) <> 'sf_farmer_api')
    or (grant_row.role_type = 'RSK' and current_setting('role', true) <> 'sf_rsk_api')
    or grant_row.role_type not in ('FARMER', 'RSK')
    or (grant_row.role_type = 'RSK' and not staff_mfa_current)
    or purpose_code_value <> (case grant_row.role_type
      when 'FARMER' then 'farmer.self_service' else 'assisted.service' end)
    or not exists (
      select 1 from identity.role_capability capability
      where capability.role_type = grant_row.role_type
        and capability.capability_set_version = grant_row.capability_set_version
        and capability.capability_key = 'identity.role_context.select'
    ) then
    raise exception using errcode = '42501', message = 'role context denied';
  end if;
  if exists (select 1 from identity.role_context where role_context_id = role_context_reference) then
    raise exception using errcode = '23505', message = 'role context already exists';
  end if;
  insert into identity.role_context (
    role_context_id, role_grant_id, subject_id, role_type, office_id, jurisdiction_id,
    purpose_code, authorization_version, capability_set_version, issued_at, expires_at
  ) values (
    role_context_reference, role_grant_reference, subject_reference, grant_row.role_type,
    grant_row.office_id, grant_row.jurisdiction_id, purpose_code_value,
    subject_row.authorization_version, grant_row.capability_set_version,
    issued_at_value, expires_at_value
  );
  insert into identity.role_context_event (
    role_context_id, event_type, authorization_version, recorded_at, correlation_id
  ) values (
    role_context_reference, 'CREATED', subject_row.authorization_version,
    issued_at_value, correlation_reference
  );
end
$function$;
alter function identity.create_role_context(uuid, uuid, uuid, text, text, timestamptz, timestamptz, uuid, boolean)
  owner to sf_migrator;

create or replace function identity.revoke_role_context(
  role_context_reference uuid,
  subject_reference uuid,
  requested_environment text,
  revoked_at_value timestamptz,
  correlation_reference uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  context_row platform.role_context_authority_projection%rowtype;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment) then
    raise exception using errcode = '42501', message = 'role context revocation denied';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('role-context:' || role_context_reference::text, 0));
  perform 1 from identity.role_context
  where role_context_id = role_context_reference and subject_id = subject_reference
  for update;
  select * into context_row from platform.role_context_authority_projection
  where role_context_id = role_context_reference and subject_id = subject_reference;
  if not found
    or context_row.revoked_at is not null
    or (context_row.role_type = 'FARMER' and current_setting('role', true) <> 'sf_farmer_api')
    or (context_row.role_type = 'RSK' and current_setting('role', true) <> 'sf_rsk_api') then
    raise exception using errcode = '42501', message = 'role context revocation denied';
  end if;
  update identity.role_context set revoked_at = revoked_at_value
  where role_context_id = role_context_reference and revoked_at is null;
  insert into identity.role_context_event (
    role_context_id, event_type, authorization_version, recorded_at, correlation_id
  ) values (
    role_context_reference, 'REVOKED', context_row.authorization_version,
    revoked_at_value, correlation_reference
  );
end
$function$;
alter function identity.revoke_role_context(uuid, uuid, text, timestamptz, uuid)
  owner to sf_migrator;

create or replace function platform.precontext_command_snapshot(
  subject_reference uuid,
  requested_environment text,
  command_reference uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, platform
as $function$
  select case when platform.runtime_subject_matches(subject_reference, requested_environment) then (
    select jsonb_build_object(
      'commandHash', execution.command_hash,
      'authorizationVersion', execution.authorization_version,
      'state', execution.state,
      'safeReceipt', execution.safe_receipt,
      'startedAt', execution.started_at
    )
    from platform.command_execution execution
    where execution.environment = requested_environment
      and execution.principal_id = requested_environment || ':' || subject_reference::text
      and execution.command_id = command_reference
  ) else null end
$function$;
alter function platform.precontext_command_snapshot(uuid, text, uuid) owner to sf_migrator;

create or replace function platform.command_target_revision(
  subject_reference uuid,
  requested_environment text,
  target_type_value text,
  target_reference uuid
)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, platform, identity, consent
as $function$
declare
  revision_value bigint := 0;
begin
  if not platform.runtime_subject_matches(subject_reference, requested_environment) then return 0; end if;
  if target_type_value = 'roleContext' then
    select count(*)::bigint into revision_value
    from identity.role_context_event event
    join platform.role_context_authority_projection context
      on context.role_context_id = event.role_context_id
    where event.role_context_id = target_reference and context.subject_id = subject_reference;
  elsif target_type_value = 'consentDecision' then
    select coalesce(max(access_version), 0) into revision_value
    from consent.current_state where target_id = target_reference and subject_id = subject_reference;
  elsif target_type_value = 'accessGrant' and current_setting('role', true) = 'sf_rsk_api' then
    select coalesce(max(grant_version), 0) into revision_value
    from consent.access_grant
    where access_grant_id = target_reference and grantee_subject_id = subject_reference;
  end if;
  return coalesce(revision_value, 0);
end
$function$;
alter function platform.command_target_revision(uuid, text, text, uuid) owner to sf_migrator;

create or replace function identity.create_auth_return_state(
  return_state_reference uuid,
  route_key_value text,
  requested_environment text,
  app_id_value text,
  origin_value text,
  opaque_state_digest text,
  rate_limit_digest text,
  expires_at_value timestamptz,
  created_at_value timestamptz
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, identity
as $function$
begin
  if current_setting('role', true) <> 'sf_auth_state_writer'
    or route_key_value not in ('FARMER_HOME', 'RSK_HOME', 'MP_HOME')
    or requested_environment not in ('local', 'preview', 'staging', 'demo', 'production')
    or length(app_id_value) not between 1 and 256
    or length(origin_value) not between 8 and 512
    or opaque_state_digest !~ '^[0-9a-f]{64}$'
    or rate_limit_digest !~ '^[0-9a-f]{64}$'
    or expires_at_value <= created_at_value
    or expires_at_value > created_at_value + interval '10 minutes'
    or created_at_value < statement_timestamp() - interval '1 minute'
    or created_at_value > statement_timestamp() + interval '1 minute' then
    raise exception using errcode = '42501', message = 'return state denied';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('auth-return-state:' || rate_limit_digest, 0));
  if (
    select count(*) >= 10
    from identity.auth_return_state
    where rate_limit_key = rate_limit_digest
      and created_at >= statement_timestamp() - interval '1 minute'
  ) then
    raise exception using errcode = 'P4290', message = 'return state rate limited';
  end if;
  insert into identity.auth_return_state (
    return_state_id, route_key, environment, app_id, origin,
    opaque_state_hash, rate_limit_key, expires_at, created_at
  ) values (
    return_state_reference, route_key_value, requested_environment, app_id_value, origin_value,
    opaque_state_digest, rate_limit_digest, expires_at_value, created_at_value
  );
end
$function$;
alter function identity.create_auth_return_state(uuid, text, text, text, text, text, text, timestamptz, timestamptz)
  owner to sf_migrator;

create or replace function identity.invalidate_subject_role_contexts(
  subject_reference uuid,
  correlation_reference uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, platform, identity
as $function$
declare
  context_row record;
  affected integer := 0;
begin
  if current_setting('role', true) <> 'sf_farmer_api'
    or not platform.request_context_valid()
    or subject_reference <> platform.request_uuid('app.subject_id') then
    raise exception using errcode = '42501', message = 'context invalidation denied';
  end if;
  for context_row in
    update identity.role_context
    set revoked_at = statement_timestamp()
    where subject_id = subject_reference and revoked_at is null
    returning role_context_id, authorization_version
  loop
    insert into identity.role_context_event (
      role_context_id, event_type, authorization_version, correlation_id
    ) values (
      context_row.role_context_id, 'REVOKED', context_row.authorization_version,
      correlation_reference
    );
    affected := affected + 1;
  end loop;
  return affected;
end
$function$;
alter function identity.invalidate_subject_role_contexts(uuid, uuid) owner to sf_migrator;

create or replace function consent.issue_access_grant(
  access_grant_reference uuid,
  farmer_subject_reference uuid,
  target_reference uuid,
  expected_access_version bigint,
  expires_at_value timestamptz,
  correlation_reference uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, platform, identity, consent
as $function$
declare
  actor_subject uuid := platform.request_uuid('app.subject_id');
  actor_office uuid := platform.request_uuid('app.office_id');
  actor_jurisdiction uuid := platform.request_uuid('app.jurisdiction_id');
begin
  if not platform.request_context_valid()
    or not platform.request_surface_valid()
    or current_setting('app.role_type', true) <> 'RSK'
    or current_setting('app.purpose_code', true) <> 'assisted.service'
    or not platform.request_has_capability('rsk.access_grant.issue')
    or not platform.request_has_capability('assisted_session.operate')
    or expires_at_value <= statement_timestamp()
    or expected_access_version <= 0 then
    raise exception using errcode = '42501', message = 'access grant denied';
  end if;

  perform 1 from identity.assisted_context assisted
  where assisted.assisted_context_id = target_reference
    and assisted.farmer_subject_id = farmer_subject_reference
  for update;
  perform 1 from consent.current_state consent_state
  where consent_state.subject_id = farmer_subject_reference
    and consent_state.scope_key = 'assisted_service.access'
    and consent_state.purpose_key = 'assisted.service'
    and consent_state.target_kind = 'ASSISTED_FARMER_CONTEXT'
    and consent_state.target_id = target_reference
  for update;

  if not exists (
    select 1
    from platform.subject_authority_projection farmer
    where farmer.subject_id = farmer_subject_reference
      and farmer.subject_type = 'FARMER'
      and farmer.environment = current_setting('app.environment', true)
      and farmer.active
  ) or not exists (
    select 1
    from identity.assisted_context assisted
    where assisted.assisted_context_id = target_reference
      and assisted.farmer_subject_id = farmer_subject_reference
      and assisted.office_id = actor_office
      and assisted.jurisdiction_id = actor_jurisdiction
      and assisted.assigned_staff_subject_id = actor_subject
      and assisted.assignment_state = 'ASSIGNED'
      and assisted.valid_from <= statement_timestamp()
      and (assisted.valid_until is null or assisted.valid_until > statement_timestamp())
  ) or not exists (
    select 1
    from platform.consent_authority_projection consent_state
    where consent_state.subject_id = farmer_subject_reference
      and consent_state.scope_key = 'assisted_service.access'
      and consent_state.purpose_key = 'assisted.service'
      and consent_state.target_kind = 'ASSISTED_FARMER_CONTEXT'
      and consent_state.target_id = target_reference
      and consent_state.state = 'ALLOWED'
      and consent_state.access_version = expected_access_version
      and (
        consent_state.expires_at is null
        or (
          consent_state.expires_at > statement_timestamp()
          and expires_at_value <= consent_state.expires_at
        )
      )
  ) or not exists (
    select 1
    from platform.role_context_authority_projection role_context
    join platform.role_grant_authority_projection role_grant
      on role_grant.role_grant_id = role_context.role_grant_id
    where role_context.role_context_id = platform.request_uuid('app.role_context_id')
      and role_context.subject_id = actor_subject
      and role_context.expires_at >= expires_at_value
      and expires_at_value <= coalesce(role_grant.valid_until, 'infinity'::timestamptz)
  ) then
    raise exception using errcode = '42501', message = 'access grant denied';
  end if;

  insert into consent.access_grant (
    access_grant_id, subject_id, role_context_id, target_kind, target_id, grantee_subject_id,
    office_id, jurisdiction_id, purpose_key, access_version, grant_version,
    expires_at
  ) values (
    access_grant_reference, farmer_subject_reference,
    platform.request_uuid('app.role_context_id'), 'ASSISTED_FARMER_CONTEXT',
    target_reference, actor_subject, actor_office, actor_jurisdiction,
    'assisted.service', expected_access_version, 1, expires_at_value
  );
  insert into consent.access_grant_event (
    access_grant_id, event_type, grant_version, access_version, correlation_id
  ) values (
    access_grant_reference, 'ISSUED', 1, expected_access_version, correlation_reference
  );
  return access_grant_reference;
end
$function$;

create or replace function consent.revoke_subject_access_grants(
  farmer_subject_reference uuid,
  scope_key_value text,
  purpose_key_value text,
  target_kind_value text,
  target_reference uuid,
  next_access_version bigint,
  correlation_reference uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, platform, consent
as $function$
declare
  revoked_grant record;
  revoked_count integer := 0;
begin
  if not platform.request_context_valid()
    or not platform.request_surface_valid()
    or current_setting('app.role_type', true) <> 'FARMER'
    or farmer_subject_reference <> platform.request_uuid('app.subject_id')
    or scope_key_value <> 'assisted_service.access'
    or purpose_key_value <> 'assisted.service'
    or target_kind_value <> 'ASSISTED_FARMER_CONTEXT'
    or not exists (
      select 1
      from platform.consent_authority_projection consent_state
      where consent_state.subject_id = farmer_subject_reference
        and consent_state.scope_key = scope_key_value
        and consent_state.purpose_key = purpose_key_value
        and consent_state.target_kind = target_kind_value
        and consent_state.target_id = target_reference
        and consent_state.state = 'WITHDRAWN'
        and consent_state.access_version = next_access_version
    ) then
    raise exception using errcode = '42501', message = 'access revocation denied';
  end if;

  for revoked_grant in
    update consent.access_grant
    set revoked_at = statement_timestamp(),
        access_version = next_access_version,
        grant_version = grant_version + 1
    where subject_id = farmer_subject_reference
      and target_kind = target_kind_value
      and target_id = target_reference
      and purpose_key = purpose_key_value
      and revoked_at is null
      and access_version < next_access_version
    returning access_grant_id, grant_version
  loop
    insert into consent.access_grant_event (
      access_grant_id, event_type, grant_version, access_version, correlation_id
    ) values (
      revoked_grant.access_grant_id, 'REVOKED', revoked_grant.grant_version,
      next_access_version, correlation_reference
    );
    revoked_count := revoked_count + 1;
  end loop;
  return revoked_count;
end
$function$;

alter function consent.issue_access_grant(uuid, uuid, uuid, bigint, timestamptz, uuid)
  owner to sf_migrator;
alter function consent.revoke_subject_access_grants(
  uuid, text, text, text, uuid, bigint, uuid
) owner to sf_migrator;

-- A runtime RSK role can inspect only the exact assisted target bound to its current
-- purpose/context. The function deliberately returns authorization metadata, never C3 fields.
create or replace function consent.disclosure_snapshot(target_reference uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, platform, identity, consent
as $function$
declare
  snapshot jsonb;
begin
  if current_setting('role', true) <> 'sf_rsk_api'
    or not platform.request_context_valid()
    or not platform.request_surface_valid()
    or current_setting('app.role_type', true) <> 'RSK'
    or current_setting('app.purpose_code', true) <> 'assisted.service'
    or not platform.request_has_capability('rsk.protected_disclose')
    or not platform.request_has_capability('assisted_session.operate') then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('assisted-disclosure:' || target_reference::text, 0));
  select jsonb_build_object(
    'subjectId', access_grant.subject_id,
    'granteeSubjectId', access_grant.grantee_subject_id,
    'targetId', access_grant.target_id,
    'authorizationVersion', platform.request_bigint('app.authorization_version'),
    'accessVersion', access_grant.access_version,
    'grantId', access_grant.access_grant_id,
    'grantState', case
      when access_grant.revoked_at is not null then 'REVOKED'
      when access_grant.expires_at <= statement_timestamp() then 'EXPIRED'
      else 'ACTIVE'
    end,
    'consentState', case
      when consent_state.state = 'ALLOWED'
       and consent_state.expires_at is not null
       and consent_state.expires_at <= statement_timestamp() then 'EXPIRED'
      else coalesce(consent_state.state, 'MISSING')
    end,
    'roleContextId', access_grant.role_context_id,
    'officeId', access_grant.office_id,
    'jurisdictionId', access_grant.jurisdiction_id,
    'purposeCode', access_grant.purpose_key
  ) into snapshot
  from consent.access_grant access_grant
  join identity.assisted_context assisted
    on assisted.assisted_context_id = access_grant.target_id
   and assisted.farmer_subject_id = access_grant.subject_id
   and assisted.office_id = access_grant.office_id
   and assisted.jurisdiction_id = access_grant.jurisdiction_id
   and assisted.assigned_staff_subject_id = platform.request_uuid('app.subject_id')
   and assisted.assignment_state = 'ASSIGNED'
   and assisted.valid_from <= statement_timestamp()
   and (assisted.valid_until is null or assisted.valid_until > statement_timestamp())
  left join platform.consent_authority_projection consent_state
    on consent_state.subject_id = access_grant.subject_id
   and consent_state.scope_key = 'assisted_service.access'
   and consent_state.purpose_key = access_grant.purpose_key
   and consent_state.target_kind = access_grant.target_kind
   and consent_state.target_id = access_grant.target_id
  where access_grant.target_kind = 'ASSISTED_FARMER_CONTEXT'
    and access_grant.target_id = target_reference
    and access_grant.grantee_subject_id = platform.request_uuid('app.subject_id')
    and access_grant.role_context_id = platform.request_uuid('app.role_context_id')
    and access_grant.office_id = platform.request_uuid('app.office_id')
    and access_grant.jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    and access_grant.purpose_key = current_setting('app.purpose_code', true)
  order by access_grant.created_at desc
  limit 1
  for update of access_grant;
  return snapshot;
end
$function$;
alter function consent.disclosure_snapshot(uuid) owner to sf_migrator;

-- This is the sole C3 read path. It requires an ALLOW disclosure Audit fact written by the
-- same database transaction and repeats every live authority/assignment/consent check.
create or replace function identity.read_protected_fields_after_audit(
  target_reference uuid,
  correlation_reference uuid
)
returns table (
  encrypted_display_name bytea,
  encrypted_contact bytea,
  key_reference text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, platform, identity, consent, audit
as $function$
begin
  if current_setting('role', true) <> 'sf_rsk_api'
    or not platform.request_context_valid()
    or not platform.request_surface_valid()
    or current_setting('app.role_type', true) <> 'RSK'
    or current_setting('app.purpose_code', true) <> 'assisted.service'
    or not platform.request_has_capability('rsk.protected_disclose')
    or not platform.request_has_capability('assisted_session.operate')
    or not exists (
      select 1 from audit.fact fact
      where fact.transaction_id = txid_current()
        and fact.correlation_id = correlation_reference
        and fact.actor_subject_id = platform.request_uuid('app.subject_id')
        and fact.role_context_id = platform.request_uuid('app.role_context_id')
        and fact.authorization_version = platform.request_bigint('app.authorization_version')
        and fact.action = 'rsk.protected_disclosure'
        and fact.entity_type = 'ASSISTED_FARMER_CONTEXT'
        and fact.entity_id = target_reference
        and fact.outcome = 'ALLOW'
        and fact.reason_code = 'AUTHORIZED'
    ) then
    return;
  end if;

  return query
  select private_fields.encrypted_display_name,
         private_fields.encrypted_contact,
         private_fields.key_reference
  from consent.access_grant access_grant
  join identity.assisted_context assisted
    on assisted.assisted_context_id = access_grant.target_id
   and assisted.farmer_subject_id = access_grant.subject_id
   and assisted.office_id = access_grant.office_id
   and assisted.jurisdiction_id = access_grant.jurisdiction_id
   and assisted.assigned_staff_subject_id = platform.request_uuid('app.subject_id')
   and assisted.assignment_state = 'ASSIGNED'
   and assisted.valid_from <= statement_timestamp()
   and (assisted.valid_until is null or assisted.valid_until > statement_timestamp())
  join platform.consent_authority_projection consent_state
    on consent_state.subject_id = access_grant.subject_id
   and consent_state.scope_key = 'assisted_service.access'
   and consent_state.purpose_key = access_grant.purpose_key
   and consent_state.target_kind = access_grant.target_kind
   and consent_state.target_id = access_grant.target_id
   and consent_state.state = 'ALLOWED'
   and consent_state.access_version = access_grant.access_version
   and (consent_state.expires_at is null or consent_state.expires_at > statement_timestamp())
  join identity.subject_private private_fields on private_fields.subject_id = access_grant.subject_id
  where access_grant.target_kind = 'ASSISTED_FARMER_CONTEXT'
    and access_grant.target_id = target_reference
    and access_grant.grantee_subject_id = platform.request_uuid('app.subject_id')
    and access_grant.role_context_id = platform.request_uuid('app.role_context_id')
    and access_grant.office_id = platform.request_uuid('app.office_id')
    and access_grant.jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    and access_grant.purpose_key = current_setting('app.purpose_code', true)
    and access_grant.revoked_at is null
    and access_grant.expires_at > statement_timestamp()
    and private_fields.encrypted_display_name is not null
    and private_fields.encrypted_contact is not null
  limit 1;
end
$function$;
alter function identity.read_protected_fields_after_audit(uuid, uuid) owner to sf_migrator;

comment on table platform.retention_policy is 'C1 retention registry; server-owned policy metadata.';
comment on table identity.subject is 'C2 identity subject with retention and authorization versions.';
comment on table identity.auth_identity is 'C4 authentication linkage; provider subject is hashed.';
comment on table identity.subject_private is 'C3 encrypted identity fields; plaintext is never stored.';
comment on column identity.subject_private.encrypted_display_name is 'C3 encrypted protected display name.';
comment on column identity.subject_private.encrypted_contact is 'C3 encrypted protected contact.';
comment on table identity.farmer_profile is 'C2 Farmer-owned locale and onboarding projection.';
comment on table identity.office is 'C1 office reference data.';
comment on table identity.jurisdiction is 'C1 jurisdiction reference data.';
comment on table identity.office_jurisdiction is 'C1 office-to-jurisdiction authority mapping.';
comment on table identity.assisted_context is 'C2 exact Farmer, office, jurisdiction and staff assignment authority.';
comment on table identity.role_definition is 'C1 role registry; contains no administrator role.';
comment on table identity.capability_definition is 'C1 exact capability registry; deny unknown keys.';
comment on table identity.role_capability is 'C1 versioned role capability mapping.';
comment on table identity.role_grant is 'C2 server-authoritative subject role grant.';
comment on table identity.role_grant_event is 'C2 append-only role grant history.';
comment on table identity.role_context is 'C2 short-lived server-authoritative role context.';
comment on table identity.role_context_event is 'C2 append-only role context history.';
comment on table identity.subject_device_binding is 'C4 device and App Check binding metadata.';
comment on table identity.auth_return_state is 'C4 single-use authentication return state; opaque digest only.';
comment on table platform.client_installation is 'C1 installation/build/schema posture metadata.';
comment on table consent.policy_version is 'C1 immutable consent notice metadata.';
comment on table consent.decision is 'C2 append-only independent consent decision.';
comment on table consent.current_state is 'C2 current consent state keyed by subject/scope/purpose/target.';
comment on table consent.access_grant is 'C2 time-bound assisted Farmer context grant.';
comment on table consent.access_grant_event is 'C2 append-only access-grant history.';
comment on table consent.revocation_operation is 'C2 withdrawal revocation work without protected content.';
comment on table platform.command_execution is 'C2 idempotent command receipt; safe receipt only.';
comment on column platform.command_execution.safe_receipt is 'C2 minimized receipt; never protected response fields.';
comment on table platform.long_operation is 'C1 safe long-operation status.';
comment on table platform.domain_event is 'C0-C2 append-only domain events; C3/C4 forbidden.';
comment on table platform.technical_event is 'C0-C2 append-only technical events; credentials forbidden.';
comment on table platform.integration_event is 'C0-C2 minimized destination-specific integration events.';
comment on table platform.outbox is 'C1 delivery state; no provider network call in transaction.';
comment on table platform.consumer_inbox is 'C1 consumer idempotency and final disposition.';
comment on table platform.provider_callback_inbox is 'C4 callback digest and processing state; payload forbidden.';
comment on table platform.dead_letter is 'C1 safe problem metadata; payload and raw error forbidden.';
comment on table audit.fact is 'C2 append-only authorization/disclosure audit fact; protected values forbidden.';
comment on table platform.subject_authority_projection is 'C2 hidden server authority projection; runtime API roles have no table privilege.';
comment on table platform.role_grant_authority_projection is 'C2 hidden current role-grant authority projection.';
comment on table platform.role_context_authority_projection is 'C2 hidden current role-context authority projection.';
comment on table platform.consent_authority_projection is 'C2 hidden current consent/access-version authority projection.';

insert into platform.retention_policy (
  retention_policy_id, policy_key, version, trigger_kind, duration_days, deletion_action, effective_at
) values
  ('00000000-0000-4000-8000-000000000101', 'identity-default', 1, 'CREATED_AT', 730, 'REVIEW', '2026-01-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000000102', 'command-recovery', 1, 'COMPLETED_AT', 120, 'DELETE', '2026-01-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000000103', 'audit-default', 1, 'RECORDED_AT', 730, 'REVIEW', '2026-01-01T00:00:00Z'),
  ('00000000-0000-4000-8000-000000000104', 'event-default', 1, 'RECORDED_AT', 120, 'DELETE', '2026-01-01T00:00:00Z')
on conflict (policy_key, version) do nothing;

insert into identity.role_definition (role_type, display_name, requires_mfa) values
  ('FARMER', 'Farmer', false),
  ('RSK', 'RSK staff', true),
  ('MP', 'MP staff', true)
on conflict (role_type) do update set
  display_name = excluded.display_name,
  requires_mfa = excluded.requires_mfa;

insert into identity.capability_definition (capability_key, description) values
  ('case.response.draft', 'Draft a Case response'),
  ('case.care_plan.issue', 'Issue a Case care plan'),
  ('case.severe.resolve', 'Resolve a severe Case'),
  ('advisory.review.decide', 'Decide an Advisory review'),
  ('alert.draft', 'Draft an Alert'),
  ('alert.approve', 'Approve an Alert'),
  ('alert.publish', 'Publish an Alert'),
  ('alert.delivery.monitor', 'Monitor Alert delivery'),
  ('alert.delivery.operate', 'Operate Alert delivery'),
  ('sensor.agronomic_invalidate', 'Invalidate agronomic sensor use'),
  ('template.draft', 'Draft a Template'),
  ('template.approve', 'Approve a Template'),
  ('template.publish', 'Publish a Template'),
  ('calendar.review', 'Review a Calendar'),
  ('market.support', 'Provide market support'),
  ('market.mapping.review', 'Review market mapping'),
  ('market.mapping.approve', 'Approve market mapping'),
  ('assisted_session.operate', 'Operate an assisted session'),
  ('visit.manage', 'Manage a Visit'),
  ('visit.execute.field', 'Execute a field Visit'),
  ('visit.execute.sensor', 'Execute a sensor Visit'),
  ('visit.outcome.review', 'Review a Visit outcome'),
  ('audit.investigate_sensitive', 'Investigate sensitive Audit facts'),
  ('rsk.work.read', 'Read assigned RSK work'),
  ('rsk.work.operate', 'Operate assigned RSK work'),
  ('rsk.work.assign', 'Assign RSK work'),
  ('rsk.protected_search', 'Perform protected purpose-bound search'),
  ('rsk.access_grant.issue', 'Issue a purpose-bound access grant'),
  ('rsk.protected_disclose', 'Disclose authorized protected fields'),
  ('case.read', 'Read an authorized Case'),
  ('case.evidence.request', 'Request Case evidence'),
  ('case.follow_up.record', 'Record Case follow-up'),
  ('case.resolve.routine', 'Resolve a routine Case'),
  ('advisory.review.read', 'Read an Advisory review'),
  ('outreach.operate', 'Operate outreach'),
  ('sensor.issue.operate', 'Operate a sensor issue'),
  ('sensor.install', 'Install a sensor'),
  ('sensor.calibration.record', 'Record sensor calibration'),
  ('sensor.maintenance.execute', 'Execute sensor maintenance'),
  ('template.read', 'Read a Template'),
  ('alert.read', 'Read an Alert'),
  ('identity.role_context.select', 'Select an authorized role context'),
  ('profile.correct', 'Correct a profile'),
  ('device_mode.change', 'Change a device data mode')
on conflict (capability_key) do update set description = excluded.description;

-- M1 bootstrap capabilities only. Later milestones append reviewed capability-set versions.
insert into identity.role_capability (role_type, capability_key, capability_set_version) values
  ('FARMER', 'identity.role_context.select', 1),
  ('RSK', 'identity.role_context.select', 1),
  ('RSK', 'assisted_session.operate', 1),
  ('RSK', 'rsk.access_grant.issue', 1),
  ('RSK', 'rsk.protected_disclose', 1)
on conflict (role_type, capability_key, capability_set_version) do nothing;

do $append_only$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'identity.role_grant_event',
    'identity.role_context_event',
    'consent.policy_version',
    'consent.decision',
    'consent.access_grant_event',
    'platform.domain_event',
    'platform.technical_event',
    'platform.integration_event',
    'audit.fact'
  ] loop
    execute format(
      'create trigger reject_append_only_change before update or delete on %s for each row execute function platform.reject_append_only_change()',
      relation_name
    );
  end loop;
end
$append_only$;

do $rls$
declare
  relation_name text;
  schema_name text;
  table_name text;
begin
  foreach relation_name in array array[
    'identity.subject', 'identity.auth_identity', 'identity.subject_private', 'identity.farmer_profile',
    'identity.office', 'identity.jurisdiction', 'identity.office_jurisdiction',
    'identity.assisted_context',
    'identity.role_definition', 'identity.capability_definition', 'identity.role_capability',
    'identity.role_grant', 'identity.role_grant_event', 'identity.role_context',
    'identity.role_context_event', 'identity.subject_device_binding', 'identity.auth_return_state',
    'platform.client_installation', 'consent.policy_version', 'consent.decision',
    'consent.current_state', 'consent.access_grant', 'consent.access_grant_event',
    'consent.revocation_operation', 'platform.command_execution', 'platform.long_operation',
    'platform.domain_event', 'platform.technical_event', 'platform.integration_event',
    'platform.outbox', 'platform.consumer_inbox', 'platform.provider_callback_inbox',
    'platform.dead_letter', 'audit.fact'
  ] loop
    schema_name := split_part(relation_name, '.', 1);
    table_name := split_part(relation_name, '.', 2);
    execute format('alter table %I.%I enable row level security', schema_name, table_name);
    execute format('alter table %I.%I force row level security', schema_name, table_name);
    execute format(
      'create policy request_context_policy on %I.%I as restrictive to sf_farmer_api, sf_rsk_api using (platform.request_context_valid() and platform.request_surface_valid()) with check (platform.request_context_valid() and platform.request_surface_valid())',
      schema_name,
      table_name
    );
  end loop;
end
$rls$;

create policy subject_self_policy on identity.subject
  to sf_farmer_api, sf_rsk_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy auth_identity_self_policy on identity.auth_identity
  to sf_farmer_api, sf_rsk_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy farmer_profile_self_policy on identity.farmer_profile
  to sf_farmer_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy role_grant_self_policy on identity.role_grant
  to sf_farmer_api, sf_rsk_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy role_context_self_policy on identity.role_context
  to sf_farmer_api, sf_rsk_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy device_binding_self_policy on identity.subject_device_binding
  to sf_farmer_api, sf_rsk_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));

create policy role_grant_event_self_policy on identity.role_grant_event
  to sf_farmer_api, sf_rsk_api
  using (
    exists (
      select 1 from identity.role_grant
      where role_grant.role_grant_id = role_grant_event.role_grant_id
        and role_grant.subject_id = platform.request_uuid('app.subject_id')
    )
  );
create policy role_context_event_self_policy on identity.role_context_event
  to sf_farmer_api, sf_rsk_api
  using (
    exists (
      select 1 from identity.role_context
      where role_context.role_context_id = role_context_event.role_context_id
        and role_context.subject_id = platform.request_uuid('app.subject_id')
    )
  );

create policy office_context_policy on identity.office
  to sf_rsk_api
  using (office_id = platform.request_uuid('app.office_id'));
create policy jurisdiction_context_policy on identity.jurisdiction
  to sf_rsk_api
  using (jurisdiction_id = platform.request_uuid('app.jurisdiction_id'));
create policy office_jurisdiction_context_policy on identity.office_jurisdiction
  to sf_rsk_api
  using (
    office_id = platform.request_uuid('app.office_id')
    and jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    and valid_from <= statement_timestamp()
    and (valid_until is null or valid_until > statement_timestamp())
  );
create policy assisted_context_farmer_policy on identity.assisted_context
  for select to sf_farmer_api
  using (farmer_subject_id = platform.request_uuid('app.subject_id'));
create policy assisted_context_rsk_policy on identity.assisted_context
  for select to sf_rsk_api
  using (
    assigned_staff_subject_id = platform.request_uuid('app.subject_id')
    and office_id = platform.request_uuid('app.office_id')
    and jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    and assignment_state = 'ASSIGNED'
    and valid_from <= statement_timestamp()
    and (valid_until is null or valid_until > statement_timestamp())
    and platform.request_has_capability('assisted_session.operate')
  );
create policy rsk_registry_read_policy on identity.role_definition
  to sf_rsk_api using (true);
create policy rsk_capability_definition_read_policy on identity.capability_definition
  to sf_rsk_api using (true);
create policy rsk_role_capability_read_policy on identity.role_capability
  to sf_rsk_api using (true);
create policy consent_policy_read_policy on consent.policy_version
  to sf_farmer_api, sf_rsk_api using (true);

create policy consent_decision_self_policy on consent.decision
  to sf_farmer_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (
    subject_id = platform.request_uuid('app.subject_id')
    and actor_subject_id = platform.request_uuid('app.subject_id')
  );
create policy consent_state_self_policy on consent.current_state
  to sf_farmer_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy consent_state_rsk_read_policy on consent.current_state
  for select to sf_rsk_api
  using (
    exists (
      select 1 from consent.access_grant access_grant
      where access_grant.subject_id = current_state.subject_id
        and access_grant.target_kind = current_state.target_kind
        and access_grant.target_id = current_state.target_id
        and access_grant.purpose_key = current_state.purpose_key
        and access_grant.access_version = current_state.access_version
        and access_grant.grantee_subject_id = platform.request_uuid('app.subject_id')
        and access_grant.office_id = platform.request_uuid('app.office_id')
        and access_grant.jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
        and access_grant.revoked_at is null
        and access_grant.expires_at > statement_timestamp()
    )
  );
create policy consent_access_grant_farmer_read_policy on consent.access_grant
  for select to sf_farmer_api
  using (subject_id = platform.request_uuid('app.subject_id'));
create policy consent_access_grant_rsk_read_policy on consent.access_grant
  for select to sf_rsk_api
  using (
    grantee_subject_id = platform.request_uuid('app.subject_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and office_id = platform.request_uuid('app.office_id')
    and jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    and purpose_key = current_setting('app.purpose_code', true)
    and revoked_at is null
    and expires_at > statement_timestamp()
    and platform.consent_access_current(
      subject_id, 'assisted_service.access', purpose_key, target_kind, target_id, access_version
    )
  );
create policy consent_revocation_self_policy on consent.revocation_operation
  to sf_farmer_api
  using (subject_id = platform.request_uuid('app.subject_id'))
  with check (subject_id = platform.request_uuid('app.subject_id'));
create policy consent_revocation_worker_policy on consent.revocation_operation
  to sf_domain_worker
  using (current_user = 'sf_domain_worker')
  with check (current_user = 'sf_domain_worker');
create policy consent_access_event_farmer_policy on consent.access_grant_event
  for select to sf_farmer_api
  using (
    exists (
      select 1 from consent.access_grant
      where access_grant.access_grant_id = access_grant_event.access_grant_id
        and access_grant.subject_id = platform.request_uuid('app.subject_id')
    )
  );
create policy consent_access_event_rsk_policy on consent.access_grant_event
  for select to sf_rsk_api
  using (
    exists (
      select 1 from consent.access_grant
      where access_grant.access_grant_id = access_grant_event.access_grant_id
        and access_grant.grantee_subject_id = platform.request_uuid('app.subject_id')
        and access_grant.office_id = platform.request_uuid('app.office_id')
        and access_grant.jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
    )
  );

create policy identity_resolver_subject_policy on identity.subject
  for select to sf_migrator using (true);
create policy identity_resolver_auth_policy on identity.auth_identity
  for select to sf_migrator using (true);
create policy migrator_office_policy on identity.office
  for select to sf_migrator using (true);
create policy migrator_jurisdiction_policy on identity.jurisdiction
  for select to sf_migrator using (true);
create policy migrator_office_jurisdiction_policy on identity.office_jurisdiction
  for select to sf_migrator using (true);
create policy migrator_role_capability_policy on identity.role_capability
  for select to sf_migrator using (true);
create policy migrator_access_grant_policy on consent.access_grant
  to sf_migrator using (true) with check (true);
create policy migrator_access_event_policy on consent.access_grant_event
  to sf_migrator using (true) with check (true);

-- FORCE RLS still applies to SECURITY DEFINER functions owned by sf_migrator. These policies
-- let only that non-login owner perform the table operations implemented by the narrow functions.
do $migrator_security_definer_relations$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'identity.subject_private', 'identity.farmer_profile', 'identity.assisted_context',
    'identity.role_grant', 'identity.role_context', 'identity.role_context_event',
    'identity.subject_device_binding', 'identity.auth_return_state',
    'consent.policy_version', 'consent.decision', 'consent.current_state',
    'consent.revocation_operation', 'platform.command_execution', 'audit.fact'
  ] loop
    execute format(
      'create policy migrator_security_definer_policy on %s to sf_migrator using (true) with check (true)',
      relation_name
    );
  end loop;
end
$migrator_security_definer_relations$;

create policy command_principal_policy on platform.command_execution
  to sf_farmer_api, sf_rsk_api
  using (
    environment = current_setting('app.environment', true)
    and principal_id = current_setting('app.environment', true) || ':' || platform.request_uuid('app.subject_id')::text
  )
  with check (
    environment = current_setting('app.environment', true)
    and principal_id = current_setting('app.environment', true) || ':' || platform.request_uuid('app.subject_id')::text
  );
create policy long_operation_principal_policy on platform.long_operation
  to sf_farmer_api, sf_rsk_api
  using (
    exists (
      select 1 from platform.command_execution command_execution
      where command_execution.command_execution_id = long_operation.command_execution_id
        and command_execution.environment = current_setting('app.environment', true)
        and command_execution.principal_id = current_setting('app.environment', true) || ':' || platform.request_uuid('app.subject_id')::text
    )
  )
  with check (
    exists (
      select 1 from platform.command_execution command_execution
      where command_execution.command_execution_id = long_operation.command_execution_id
        and command_execution.environment = current_setting('app.environment', true)
        and command_execution.principal_id = current_setting('app.environment', true) || ':' || platform.request_uuid('app.subject_id')::text
    )
  );

do $owned_events$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'platform.domain_event', 'platform.technical_event', 'platform.integration_event'
  ] loop
    execute format(
      'create policy api_owned_event_policy on %s to sf_farmer_api, sf_rsk_api using (environment = current_setting(''app.environment'', true) and owner_subject_id = platform.request_uuid(''app.subject_id'')) with check (environment = current_setting(''app.environment'', true) and owner_subject_id = platform.request_uuid(''app.subject_id''))',
      relation_name
    );
  end loop;
end
$owned_events$;

create policy api_owned_outbox_policy on platform.outbox
  for insert to sf_farmer_api, sf_rsk_api
  with check (
    environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and state = 'PENDING'
    and claimed_by is null
    and claim_expires_at is null
    and claim_token is null
    and attempt_count = 0
    and exists (
      select 1 from platform.integration_event integration_event
      where integration_event.integration_event_id = outbox.integration_event_id
        and integration_event.environment = outbox.environment
        and integration_event.owner_subject_id = outbox.owner_subject_id
        and integration_event.destination = outbox.destination
    )
  );

create or replace function audit.write_fact(
  action_name text,
  entity_type_name text,
  entity_reference uuid,
  outcome_name text,
  reason_code_name text,
  correlation_reference uuid,
  before_entity_revision bigint default null,
  after_entity_revision bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, platform, audit
as $function$
declare
  inserted_id uuid := gen_random_uuid();
begin
  if not platform.request_context_valid()
    or not platform.request_surface_valid()
    or length(action_name) not between 1 and 120
    or length(entity_type_name) not between 1 and 80
    or length(reason_code_name) not between 1 and 120
    or outcome_name not in ('ALLOW', 'DENY') then
    raise exception using errcode = '42501', message = 'invalid audit fact';
  end if;

  insert into audit.fact (
    audit_fact_id, actor_subject_id, role_context_id, role_type, action, entity_type, entity_id,
    purpose_code, office_id, jurisdiction_id, authorization_version, outcome,
    reason_code, before_revision, after_revision, correlation_id
  ) values (
    inserted_id,
    platform.request_uuid('app.subject_id'),
    platform.request_uuid('app.role_context_id'),
    current_setting('app.role_type', true),
    action_name,
    entity_type_name,
    entity_reference,
    current_setting('app.purpose_code', true),
    platform.request_uuid('app.office_id'),
    platform.request_uuid('app.jurisdiction_id'),
    platform.request_bigint('app.authorization_version'),
    outcome_name,
    reason_code_name,
    before_entity_revision,
    after_entity_revision,
    correlation_reference
  );

  return inserted_id;
end
$function$;
alter function audit.write_fact(text, text, uuid, text, text, uuid, bigint, bigint)
  owner to sf_migrator;

create policy audit_writer_procedure_policy on audit.fact
  for insert to sf_migrator
  with check (
    platform.request_context_valid()
    and actor_subject_id = platform.request_uuid('app.subject_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and authorization_version = platform.request_bigint('app.authorization_version')
  );

do $worker_relations$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'platform.command_execution', 'platform.long_operation', 'platform.domain_event',
    'platform.technical_event', 'platform.integration_event', 'platform.outbox',
    'platform.consumer_inbox', 'platform.dead_letter'
  ] loop
    execute format(
      'create policy domain_worker_policy on %s to sf_domain_worker using (current_user = ''sf_domain_worker'') with check (current_user = ''sf_domain_worker'')',
      relation_name
    );
  end loop;
end
$worker_relations$;

create policy callback_inbox_policy on platform.provider_callback_inbox
  to sf_callback_ingest
  using (current_user = 'sf_callback_ingest')
  with check (current_user = 'sf_callback_ingest');

create policy audit_reader_policy on audit.fact
  for select
  to sf_audit_reader
  using (
    platform.request_context_valid()
    and current_setting('app.role_type', true) = 'RSK'
    and current_setting('app.purpose_code', true) = 'data.rights'
    and platform.request_has_capability('audit.investigate_sensitive')
    and office_id = platform.request_uuid('app.office_id')
    and jurisdiction_id = platform.request_uuid('app.jurisdiction_id')
  );

revoke all on schema identity, consent, audit, platform from public;
revoke all on all tables in schema identity, consent, audit, platform from public;
revoke all on all functions in schema identity, consent, audit, platform from public;

grant usage on schema identity, consent, audit, platform to sf_migrator;
grant usage on schema identity, consent, audit, platform to sf_farmer_api, sf_rsk_api;
grant usage on schema identity to sf_auth_state_writer;
grant usage on schema consent, platform to sf_domain_worker;
grant usage on schema platform to sf_callback_ingest;
grant usage on schema identity, audit, platform to sf_audit_reader;
grant select on identity.subject, identity.role_grant, identity.role_context, identity.subject_device_binding
  to sf_farmer_api, sf_rsk_api;
grant select on identity.farmer_profile to sf_farmer_api;
grant select on identity.assisted_context to sf_farmer_api, sf_rsk_api;
grant select on identity.office, identity.jurisdiction, identity.office_jurisdiction,
  identity.role_definition, identity.capability_definition, identity.role_capability
  to sf_rsk_api;
grant select on consent.policy_version to sf_farmer_api, sf_rsk_api;
grant select, insert on consent.decision to sf_farmer_api;
grant select, insert, update on consent.current_state to sf_farmer_api;
grant select on consent.current_state to sf_rsk_api;
grant select on consent.access_grant, consent.access_grant_event to sf_farmer_api, sf_rsk_api;
grant select, insert on consent.revocation_operation to sf_farmer_api;
grant select, update on consent.revocation_operation to sf_domain_worker;
grant select, insert, update on platform.command_execution, platform.long_operation
  to sf_farmer_api, sf_rsk_api;
grant select, insert on platform.domain_event, platform.technical_event, platform.integration_event
  to sf_farmer_api, sf_rsk_api;
grant insert on platform.outbox to sf_farmer_api, sf_rsk_api;
grant select, insert, update on platform.command_execution, platform.long_operation,
  platform.domain_event, platform.technical_event, platform.integration_event,
  platform.outbox, platform.consumer_inbox, platform.dead_letter to sf_domain_worker;
grant select, insert, update on platform.provider_callback_inbox to sf_callback_ingest;
grant select on audit.fact to sf_audit_reader;

grant select on identity.subject, identity.auth_identity, identity.office, identity.jurisdiction,
  identity.office_jurisdiction, identity.role_capability, identity.subject_private,
  identity.farmer_profile, identity.assisted_context, identity.role_grant,
  identity.role_context, identity.role_context_event, identity.subject_device_binding
  to sf_migrator;
grant select, insert on identity.auth_return_state to sf_migrator;
grant insert, update on identity.role_context to sf_migrator;
grant insert on identity.role_context_event to sf_migrator;
grant select on consent.policy_version, consent.decision, consent.current_state,
  consent.revocation_operation, platform.command_execution to sf_migrator;
grant insert, update on consent.decision, consent.current_state, consent.revocation_operation
  to sf_migrator;
grant select, insert, update on consent.access_grant to sf_migrator;
grant select, insert on consent.access_grant_event to sf_migrator;
grant select, insert on audit.fact to sf_migrator;
grant select, insert, update, delete on platform.subject_authority_projection,
  platform.role_grant_authority_projection, platform.role_context_authority_projection,
  platform.consent_authority_projection to sf_migrator;

grant execute on function platform.request_uuid(text), platform.request_bigint(text),
  platform.request_context_valid() to sf_migrator, sf_farmer_api, sf_rsk_api,
  sf_audit_writer, sf_audit_reader;
grant execute on function platform.request_surface_valid()
  to sf_migrator, sf_farmer_api, sf_rsk_api;
grant execute on function platform.request_has_capability(text)
  to sf_migrator, sf_rsk_api, sf_audit_reader;
grant execute on function platform.consent_access_current(uuid, text, text, text, uuid, bigint)
  to sf_migrator, sf_rsk_api;
grant execute on function identity.resolve_auth_subject(text, text, text)
  to sf_farmer_api, sf_rsk_api;
grant execute on function platform.runtime_subject_matches(uuid, text),
  platform.precontext_command_snapshot(uuid, text, uuid),
  platform.command_target_revision(uuid, text, text, uuid)
  to sf_farmer_api, sf_rsk_api;
grant execute on function identity.current_authority_snapshot(uuid, text, text, text, uuid),
  identity.role_grant_snapshot(uuid, text, uuid),
  identity.owned_role_context_snapshot(uuid, text, uuid),
  identity.create_role_context(uuid, uuid, uuid, text, text, timestamptz, timestamptz, uuid, boolean),
  identity.revoke_role_context(uuid, uuid, text, timestamptz, uuid)
  to sf_farmer_api, sf_rsk_api;
grant execute on function identity.create_auth_return_state(
  uuid, text, text, text, text, text, text, timestamptz, timestamptz
) to sf_auth_state_writer;
grant execute on function identity.invalidate_subject_role_contexts(uuid, uuid)
  to sf_farmer_api;
grant execute on function consent.issue_access_grant(uuid, uuid, uuid, bigint, timestamptz, uuid)
  to sf_rsk_api;
grant execute on function consent.revoke_subject_access_grants(
  uuid, text, text, text, uuid, bigint, uuid
) to sf_farmer_api;
grant execute on function consent.disclosure_snapshot(uuid) to sf_rsk_api;
grant execute on function identity.read_protected_fields_after_audit(uuid, uuid) to sf_rsk_api;
grant execute on function audit.write_fact(text, text, uuid, text, text, uuid, bigint, bigint)
  to sf_farmer_api, sf_rsk_api;

-- Deliberately no sf_mp_api role and no grant to mp-query-api. MP reads release artifacts only.
