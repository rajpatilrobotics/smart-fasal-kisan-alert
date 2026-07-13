create schema if not exists media;
create schema if not exists voice;

do $roles$
declare
  role_name text;
begin
  foreach role_name in array array['sf_media_scanner', 'sf_voice_gateway'] loop
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

alter table identity.subject_device_binding
  add column device_mode text not null default 'PERSONAL'
    check (device_mode in ('PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED')),
  add column lock_version bigint not null default 1 check (lock_version > 0),
  add column revoked_at timestamptz;

create table platform.schema_compatibility (
  component text not null check (component in (
    'OFFLINE_COMMAND', 'CLIENT_EVENT', 'PROJECTION', 'MEDIA_PROTOCOL'
  )),
  schema_version integer not null check (schema_version > 0),
  minimum_supported_version integer not null check (minimum_supported_version > 0),
  maximum_supported_version integer not null check (maximum_supported_version > 0),
  supported_from timestamptz not null,
  supported_until timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (component, schema_version),
  check (minimum_supported_version <= maximum_supported_version),
  check (supported_until >= supported_from + interval '90 days')
);

insert into platform.schema_compatibility (
  component, schema_version, minimum_supported_version, maximum_supported_version,
  supported_from, supported_until
) values
  ('OFFLINE_COMMAND', 1, 1, 1, now(), now() + interval '365 days'),
  ('CLIENT_EVENT', 1, 1, 1, now(), now() + interval '365 days'),
  ('PROJECTION', 1, 1, 1, now(), now() + interval '365 days'),
  ('MEDIA_PROTOCOL', 1, 1, 1, now(), now() + interval '365 days');

create table platform.sync_stream (
  stream_id uuid primary key,
  environment text not null check (environment in (
    'local', 'preview', 'staging', 'demo', 'production'
  )),
  subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  authorization_version bigint not null check (authorization_version > 0),
  device_mode text not null check (device_mode in (
    'PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED'
  )),
  client_build text not null,
  local_database_schema_version integer not null check (local_database_schema_version > 0),
  command_version integer not null check (command_version > 0),
  client_event_version integer not null check (client_event_version > 0),
  projection_version integer not null check (projection_version > 0),
  media_version integer not null check (media_version > 0),
  cursor text not null,
  high_water_mark text not null,
  state text not null default 'OPEN' check (state in (
    'OPEN', 'BOOTSTRAP_REQUIRED', 'LOCKED_RECOVERY', 'CLOSED'
  )),
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  check (expires_at > opened_at),
  check ((state = 'CLOSED') = (closed_at is not null))
);
create index sync_stream_owner_idx
  on platform.sync_stream (environment, subject_id, subject_device_binding_id, opened_at desc);

create table platform.sync_batch_receipt (
  sync_batch_receipt_id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references platform.sync_stream(stream_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  batch_id uuid not null,
  request_hash text not null check (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  response_payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (stream_id, batch_id),
  unique (environment, subject_id, batch_id)
);

create table platform.sync_feed_event (
  feed_event_id uuid primary key,
  environment text not null,
  owner_subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  sequence bigint not null check (sequence > 0),
  integration_event_id uuid not null
    references platform.integration_event(integration_event_id),
  projection_deltas jsonb not null,
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (environment, subject_device_binding_id, sequence)
);

create table platform.sync_bootstrap_snapshot (
  bootstrap_snapshot_id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references platform.sync_stream(stream_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  snapshot_checksum text not null check (snapshot_checksum ~ '^sha256:[0-9a-f]{64}$'),
  encrypted_snapshot bytea not null,
  high_water_mark text not null,
  cursor text not null,
  authorization_version bigint not null check (authorization_version > 0),
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > generated_at)
);

create table platform.sync_acknowledgement (
  acknowledgement_id uuid primary key,
  stream_id uuid not null references platform.sync_stream(stream_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  command_id uuid not null,
  request_hash text not null check (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  client_event_ids uuid[] not null check (cardinality(client_event_ids) between 1 and 100),
  disposition text not null check (disposition in (
    'ACCEPTED', 'ALREADY_ACCEPTED', 'REJECTED', 'CONFLICT'
  )),
  problem_code text,
  authoritative_revision bigint check (authoritative_revision is null or authoritative_revision >= 0),
  server_event_ids uuid[] not null default '{}',
  server_received_at timestamptz not null default now(),
  unique (environment, subject_id, command_id)
);

create table platform.sync_conflict (
  conflict_id uuid primary key,
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  stream_id uuid not null references platform.sync_stream(stream_id),
  command_id uuid not null,
  client_event_ids uuid[] not null check (cardinality(client_event_ids) between 1 and 100),
  conflict_type text not null check (conflict_type in (
    'EXPECTED_REVISION_MISMATCH', 'DUPLICATE_LOGICAL_ACTION',
    'CONCURRENT_MUTABLE_FIELD', 'TASK_ACTUAL_VS_PLAN_CHANGE',
    'CROP_STAGE_DISAGREEMENT', 'TOMBSTONED_ENTITY', 'ASSIGNMENT_CHANGED',
    'CONSENT_OR_ACCESS_VERSION_CHANGED', 'CLOCK_UNTRUSTED',
    'MEDIA_INTEGRITY_MISMATCH', 'SCHEMA_REQUIRES_MIGRATION'
  )),
  target_type text not null,
  target_id uuid not null,
  local_revision bigint not null check (local_revision >= 0),
  authoritative_revision bigint not null check (authoritative_revision >= 0),
  local_summary jsonb not null,
  authoritative_summary jsonb not null,
  state text not null default 'OPEN' check (state in (
    'OPEN', 'RESOLUTION_PENDING', 'RESOLVED', 'LOCKED_RECOVERY'
  )),
  revision bigint not null default 0 check (revision >= 0),
  resolution_command_id uuid,
  resolution_action text check (resolution_action in (
    'CREATE_NEW_COMMAND', 'KEEP_BOTH_FACTS', 'DISCARD_LOCAL_PROPOSAL'
  )),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((state = 'RESOLVED') = (resolved_at is not null))
);

create table media.upload_intent (
  intent_id uuid primary key,
  asset_id uuid not null unique,
  environment text not null check (environment in (
    'local', 'preview', 'staging', 'demo', 'production'
  )),
  owner_subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  purpose text not null check (purpose in (
    'CROP_HEALTH_IMAGE', 'DIARY_MEDIA', 'RSK_VISIT_EVIDENCE',
    'SENSOR_MAINTENANCE_EVIDENCE', 'VOICE_OFFLINE_AUDIO'
  )),
  owner_type text not null check (owner_type in (
    'HEALTH_REPORT', 'DIARY_ENTRY', 'RSK_VISIT', 'SENSOR_MAINTENANCE', 'VOICE_SESSION'
  )),
  owner_id uuid not null,
  expected_sha256 text not null check (expected_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  claimed_mime_type text not null check (claimed_mime_type in (
    'image/jpeg', 'image/png', 'image/webp',
    'audio/webm;codecs=opus', 'audio/wav'
  )),
  declared_size_bytes bigint not null check (declared_size_bytes between 1 and 15728640),
  declared_width integer check (declared_width between 1 and 16384),
  declared_height integer check (declared_height between 1 and 16384),
  declared_duration_seconds numeric(8,3)
    check (declared_duration_seconds > 0 and declared_duration_seconds <= 120),
  consent_access_version bigint not null check (consent_access_version > 0),
  storage_object_name text not null unique
    check (storage_object_name like 'quarantine/%'),
  generation_precondition bigint not null check (generation_precondition >= 0),
  state text not null default 'INTENT_ISSUED' check (state in (
    'INTENT_ISSUED', 'UPLOADED_UNVERIFIED', 'SCANNING', 'VERIFIED', 'ATTACHED',
    'FAILED_RETRYABLE', 'REJECTED', 'EXPIRED', 'CANCELLED'
  )),
  revision bigint not null default 0 check (revision >= 0),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cancelled_at timestamptz,
  check (expires_at > issued_at),
  check (
    (purpose = 'CROP_HEALTH_IMAGE' and owner_type = 'HEALTH_REPORT')
    or (purpose = 'DIARY_MEDIA' and owner_type = 'DIARY_ENTRY')
    or (purpose = 'RSK_VISIT_EVIDENCE' and owner_type = 'RSK_VISIT')
    or (purpose = 'SENSOR_MAINTENANCE_EVIDENCE' and owner_type = 'SENSOR_MAINTENANCE')
    or (purpose = 'VOICE_OFFLINE_AUDIO' and owner_type = 'VOICE_SESSION')
  )
);
create index media_upload_intent_owner_idx
  on media.upload_intent (environment, owner_subject_id, issued_at desc);

create table media.asset (
  asset_id uuid primary key references media.upload_intent(asset_id),
  intent_id uuid not null unique references media.upload_intent(intent_id),
  environment text not null,
  owner_subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  purpose text not null,
  owner_type text not null,
  owner_id uuid not null,
  storage_object_name text not null unique
    check (storage_object_name like 'quarantine/%'),
  expected_generation bigint not null check (expected_generation >= 0),
  expected_sha256 text not null check (expected_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  expected_size_bytes bigint not null check (expected_size_bytes between 1 and 15728640),
  claimed_mime_type text not null,
  consent_access_version bigint not null check (consent_access_version > 0),
  state text not null default 'INTENT_ISSUED' check (state in (
    'INTENT_ISSUED', 'UPLOADED_UNVERIFIED', 'SCANNING', 'VERIFIED', 'ATTACHED',
    'FAILED_RETRYABLE', 'REJECTED', 'EXPIRED', 'CANCELLED'
  )),
  revision bigint not null default 0 check (revision >= 0),
  actual_generation bigint check (actual_generation is null or actual_generation > 0),
  finalized_sha256 text
    check (finalized_sha256 is null or finalized_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  finalized_size_bytes bigint
    check (finalized_size_bytes is null or finalized_size_bytes > 0),
  verified_sha256 text check (verified_sha256 is null or verified_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  verified_size_bytes bigint check (verified_size_bytes is null or verified_size_bytes > 0),
  verified_mime_type text,
  failure_code text check (failure_code is null or failure_code in (
    'GENERATION_MISMATCH', 'SIZE_MISMATCH', 'CHECKSUM_MISMATCH', 'MIME_MISMATCH',
    'UNSUPPORTED_CODEC', 'DECODER_REJECTED', 'POLYGLOT_REJECTED', 'MALWARE_REJECTED',
    'DIMENSION_LIMIT_EXCEEDED', 'DURATION_LIMIT_EXCEEDED',
    'CONSENT_OR_ACCESS_VERSION_CHANGED'
  )),
  scan_claim_token uuid,
  scan_claimed_at timestamptz,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create index media_asset_scan_queue_idx
  on media.asset (state, updated_at) where state in ('UPLOADED_UNVERIFIED', 'FAILED_RETRYABLE');

create table media.scan_result (
  scan_result_id uuid primary key,
  asset_id uuid not null references media.asset(asset_id),
  storage_event_id uuid not null,
  scanner_build text not null,
  object_generation bigint not null check (object_generation > 0),
  sha256 text not null check (sha256 ~ '^sha256:[0-9a-f]{64}$'),
  size_bytes bigint not null check (size_bytes > 0),
  magic_mime_type text not null,
  decoder_name text not null,
  decoder_version text not null,
  malware_engine text not null,
  malware_signature_version text not null,
  outcome text not null check (outcome in ('VERIFIED', 'FAILED_RETRYABLE', 'REJECTED')),
  failure_code text,
  metadata jsonb not null default '{}',
  scanned_at timestamptz not null default now(),
  unique (asset_id, storage_event_id)
);

create table media.derivative (
  derivative_id uuid primary key,
  asset_id uuid not null references media.asset(asset_id),
  derivative_type text not null check (derivative_type in (
    'SAFE_IMAGE', 'SAFE_AUDIO', 'THUMBNAIL'
  )),
  storage_object_name text not null unique
    check (storage_object_name like 'protected/%'),
  object_generation bigint not null check (object_generation > 0),
  sha256 text not null check (sha256 ~ '^sha256:[0-9a-f]{64}$'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (asset_id, derivative_type)
);

create table voice.session (
  session_id uuid primary key,
  environment text not null check (environment in (
    'local', 'preview', 'staging', 'demo', 'production'
  )),
  subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  role_context_id uuid not null references identity.role_context(role_context_id),
  authorization_version bigint not null check (authorization_version > 0),
  purpose_code text not null,
  origin text not null check (char_length(origin) between 8 and 512),
  language text not null check (language in ('mr', 'hi', 'en')),
  visual_route text not null check (visual_route like '/%'),
  context_ids uuid[] not null default '{}',
  state text not null default 'CREATED' check (state in (
    'CREATED', 'READY', 'RECONNECTING', 'EXPIRING', 'CLOSED', 'UNAVAILABLE'
  )),
  revision bigint not null default 0 check (revision >= 0),
  highest_client_sequence bigint not null default 0 check (highest_client_sequence >= 0),
  highest_server_sequence bigint not null default 0 check (highest_server_sequence >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '15 minutes'),
  check ((state = 'CLOSED') = (closed_at is not null))
);
create index voice_session_owner_idx
  on voice.session (environment, subject_id, created_at desc);

create table voice.ticket (
  ticket_id uuid primary key,
  session_id uuid not null references voice.session(session_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  subject_device_binding_id uuid not null
    references identity.subject_device_binding(subject_device_binding_id),
  ticket_hash text not null unique check (ticket_hash ~ '^sha256:[0-9a-f]{64}$'),
  role_context_id uuid not null references identity.role_context(role_context_id),
  authorization_version bigint not null check (authorization_version > 0),
  purpose_code text not null,
  origin text not null check (char_length(origin) between 8 and 512),
  language text not null check (language in ('mr', 'hi', 'en')),
  visual_route text not null check (visual_route like '/%'),
  context_ids uuid[] not null default '{}',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_connection_id uuid,
  check (expires_at > issued_at),
  check (expires_at <= issued_at + interval '60 seconds'),
  check ((consumed_at is null) = (consumed_connection_id is null))
);

create table voice.proposal (
  proposal_id uuid primary key,
  session_id uuid not null references voice.session(session_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  revision bigint not null default 0 check (revision >= 0),
  state text not null default 'PENDING' check (state in (
    'PENDING', 'CONFIRMED', 'CANCELLED', 'SUPERSEDED', 'EXPIRED',
    'EXECUTING', 'COMPLETE', 'FAILED'
  )),
  tool_key text not null,
  canonical_payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  read_back jsonb not null,
  command_id uuid,
  supersedes_proposal_id uuid references voice.proposal(proposal_id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  closed_at timestamptz,
  check (expires_at > created_at)
);
create unique index voice_proposal_command_idx
  on voice.proposal (environment, subject_id, command_id) where command_id is not null;

create table voice.offline_audio_ref (
  offline_audio_ref_id uuid primary key,
  session_id uuid not null references voice.session(session_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  local_capture_id uuid not null,
  language text not null check (language in ('mr', 'hi', 'en')),
  audio_consent_version bigint not null check (audio_consent_version > 0),
  expected_session_revision bigint not null check (expected_session_revision >= 0),
  revision bigint not null default 0 check (revision >= 0),
  state text not null default 'TRANSCRIPTION_PENDING' check (state in (
    'TRANSCRIPTION_PENDING', 'NEEDS_CONFIRMATION', 'FAILED', 'EXPIRED', 'CANCELLED'
  )),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (environment, subject_id, local_capture_id),
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '7 days')
);

create table media.attachment (
  attachment_id uuid primary key,
  asset_id uuid not null unique references media.asset(asset_id),
  derivative_id uuid not null unique references media.derivative(derivative_id),
  environment text not null,
  owner_subject_id uuid not null references identity.subject(subject_id),
  owner_type text not null check (owner_type = 'VOICE_SESSION'),
  owner_id uuid not null references voice.session(session_id),
  purpose text not null check (purpose = 'VOICE_OFFLINE_AUDIO'),
  consent_access_version bigint not null check (consent_access_version > 0),
  attached_at timestamptz not null default now(),
  retention_policy_id uuid not null references platform.retention_policy(retention_policy_id),
  retain_until timestamptz not null,
  check (retain_until > attached_at),
  check (retain_until <= attached_at + interval '7 days')
);

create table voice.offline_audio_media_link (
  offline_audio_ref_id uuid primary key
    references voice.offline_audio_ref(offline_audio_ref_id),
  attachment_id uuid not null unique references media.attachment(attachment_id),
  asset_id uuid not null unique references media.asset(asset_id),
  environment text not null,
  subject_id uuid not null references identity.subject(subject_id),
  linked_at timestamptz not null default now()
);

create or replace function media.farmer_upload_owner_current(
  purpose_value text,
  owner_type_value text,
  owner_id_value uuid,
  consent_access_version_value bigint
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, platform, voice
as $function$
  select current_setting('role', true) = 'sf_farmer_api'
    and platform.request_context_valid()
    and platform.request_surface_valid()
    and purpose_value = 'VOICE_OFFLINE_AUDIO'
    and owner_type_value = 'VOICE_SESSION'
    and exists (
      select 1
      from voice.session
      where session.session_id = owner_id_value
        and session.environment = current_setting('app.environment', true)
        and session.subject_id = platform.request_uuid('app.subject_id')
        and session.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
        and session.role_context_id = platform.request_uuid('app.role_context_id')
        and session.authorization_version =
          platform.request_bigint('app.authorization_version')
        and session.purpose_code = 'farmer.self_service'
        and session.state in ('CREATED', 'READY', 'RECONNECTING')
        and session.expires_at > statement_timestamp()
    )
    and platform.consent_access_current(
      platform.request_uuid('app.subject_id'), 'audio.storage',
      'farmer.self_service', 'ACCOUNT', platform.request_uuid('app.subject_id'),
      consent_access_version_value
    )
$function$;

alter function media.farmer_upload_owner_current(text, text, uuid, bigint)
  owner to sf_migrator;

create or replace function media.enforce_upload_intent_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'INTENT_ISSUED' or new.revision <> 0 or new.cancelled_at is not null then
      raise exception using errcode = '42501', message = 'invalid initial upload intent state';
    end if;
    if current_user = 'sf_farmer_api' and not media.farmer_upload_owner_current(
      new.purpose, new.owner_type, new.owner_id, new.consent_access_version
    ) then
      raise exception using errcode = '42501', message = 'media owner or consent is not current';
    end if;
    return new;
  end if;
  if row(
    new.intent_id, new.asset_id, new.environment, new.owner_subject_id,
    new.subject_device_binding_id, new.purpose, new.owner_type, new.owner_id,
    new.expected_sha256, new.claimed_mime_type, new.declared_size_bytes,
    new.declared_width, new.declared_height, new.declared_duration_seconds,
    new.consent_access_version, new.storage_object_name, new.generation_precondition,
    new.issued_at, new.expires_at
  ) is distinct from row(
    old.intent_id, old.asset_id, old.environment, old.owner_subject_id,
    old.subject_device_binding_id, old.purpose, old.owner_type, old.owner_id,
    old.expected_sha256, old.claimed_mime_type, old.declared_size_bytes,
    old.declared_width, old.declared_height, old.declared_duration_seconds,
    old.consent_access_version, old.storage_object_name, old.generation_precondition,
    old.issued_at, old.expires_at
  ) then
    raise exception using errcode = '42501', message = 'upload intent identity is immutable';
  end if;
  if new.state = old.state or new.revision <> old.revision + 1 then
    raise exception using errcode = '23514', message = 'upload intent revision must advance once';
  end if;
  if current_user = 'sf_farmer_api' and not (
    old.state = 'INTENT_ISSUED'
    and new.state in ('UPLOADED_UNVERIFIED', 'CANCELLED', 'EXPIRED')
  ) then
    raise exception using errcode = '42501', message = 'upload intent transition denied';
  end if;
  if current_user = 'sf_farmer_api' and not media.farmer_upload_owner_current(
    new.purpose, new.owner_type, new.owner_id, new.consent_access_version
  ) then
    raise exception using errcode = '42501', message = 'media owner or consent is not current';
  end if;
  if new.state = 'CANCELLED' and new.cancelled_at is null then
    new.cancelled_at := statement_timestamp();
  elsif new.state <> 'CANCELLED' and new.cancelled_at is not null then
    raise exception using errcode = '23514', message = 'invalid upload cancellation timestamp';
  end if;
  return new;
end
$function$;

create trigger enforce_upload_intent_write
before insert or update on media.upload_intent
for each row execute function media.enforce_upload_intent_write();

create or replace function media.enforce_asset_intent_binding()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, media
as $function$
begin
  if new.state <> 'INTENT_ISSUED' or new.revision <> 0
     or new.actual_generation is not null or new.finalized_sha256 is not null
     or new.finalized_size_bytes is not null or new.verified_sha256 is not null
     or new.verified_size_bytes is not null or new.verified_mime_type is not null
     or new.failure_code is not null or new.scan_claim_token is not null
     or new.scan_claimed_at is not null or new.verified_at is not null then
    raise exception using errcode = '42501', message = 'invalid initial media asset state';
  end if;
  if current_user = 'sf_farmer_api' and not media.farmer_upload_owner_current(
    new.purpose, new.owner_type, new.owner_id, new.consent_access_version
  ) then
    raise exception using errcode = '42501', message = 'media owner or consent is not current';
  end if;
  if not exists (
    select 1 from media.upload_intent intent
    where intent.intent_id = new.intent_id
      and intent.asset_id = new.asset_id
      and intent.environment = new.environment
      and intent.owner_subject_id = new.owner_subject_id
      and intent.subject_device_binding_id = new.subject_device_binding_id
      and intent.purpose = new.purpose
      and intent.owner_type = new.owner_type
      and intent.owner_id = new.owner_id
      and intent.storage_object_name = new.storage_object_name
      and intent.generation_precondition = new.expected_generation
      and intent.expected_sha256 = new.expected_sha256
      and intent.declared_size_bytes = new.expected_size_bytes
      and intent.claimed_mime_type = new.claimed_mime_type
      and intent.consent_access_version = new.consent_access_version
      and intent.state = 'INTENT_ISSUED'
  ) then
    raise exception using errcode = '42501', message = 'media asset intent binding denied';
  end if;
  return new;
end
$function$;

create trigger enforce_asset_intent_binding
before insert on media.asset
for each row execute function media.enforce_asset_intent_binding();

create or replace function media.enforce_asset_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if new.state = old.state then
    if new is distinct from old then
      raise exception using errcode = '42501', message = 'same-state media mutation denied';
    end if;
    return old;
  end if;
  if row(
    new.asset_id, new.intent_id, new.environment, new.owner_subject_id,
    new.subject_device_binding_id,
    new.purpose, new.owner_type, new.owner_id, new.storage_object_name,
    new.expected_generation, new.expected_sha256, new.expected_size_bytes,
    new.claimed_mime_type, new.consent_access_version
  ) is distinct from row(
    old.asset_id, old.intent_id, old.environment, old.owner_subject_id,
    old.subject_device_binding_id,
    old.purpose, old.owner_type, old.owner_id, old.storage_object_name,
    old.expected_generation, old.expected_sha256, old.expected_size_bytes,
    old.claimed_mime_type, old.consent_access_version
  ) then
    raise exception using errcode = '42501', message = 'media asset identity is immutable';
  end if;
  if not (
    (old.state = 'INTENT_ISSUED' and new.state in ('UPLOADED_UNVERIFIED', 'CANCELLED', 'EXPIRED'))
    or (old.state = 'UPLOADED_UNVERIFIED' and new.state in ('SCANNING', 'REJECTED', 'FAILED_RETRYABLE'))
    or (old.state = 'SCANNING' and new.state in ('VERIFIED', 'REJECTED', 'FAILED_RETRYABLE'))
    or (old.state = 'FAILED_RETRYABLE' and new.state in ('SCANNING', 'REJECTED'))
    or (old.state = 'VERIFIED' and new.state = 'ATTACHED')
  ) then
    raise exception using errcode = '23514', message = 'invalid media asset state transition';
  end if;
  if new.revision <> old.revision + 1 then
    raise exception using errcode = '23514', message = 'media asset revision must advance once';
  end if;
  if current_user = 'sf_farmer_api' and not (
    old.state = 'INTENT_ISSUED'
    and new.state in ('UPLOADED_UNVERIFIED', 'CANCELLED', 'EXPIRED')
  ) then
    raise exception using errcode = '42501', message = 'farmer media transition denied';
  end if;
  if current_user = 'sf_farmer_api' then
    if not media.farmer_upload_owner_current(
      new.purpose, new.owner_type, new.owner_id, new.consent_access_version
    ) then
      raise exception using errcode = '42501', message = 'media owner or consent is not current';
    end if;
    if new.state = 'UPLOADED_UNVERIFIED' and (
      new.actual_generation is null or new.finalized_sha256 is null
      or new.finalized_size_bytes is null or new.verified_sha256 is not null
      or new.verified_size_bytes is not null or new.verified_mime_type is not null
      or new.failure_code is not null or new.scan_claim_token is not null
      or new.scan_claimed_at is not null or new.verified_at is not null
    ) then
      raise exception using errcode = '42501', message = 'invalid unverified upload finalization';
    end if;
    if new.state in ('CANCELLED', 'EXPIRED') and row(
      new.actual_generation, new.finalized_sha256, new.finalized_size_bytes,
      new.verified_sha256, new.verified_size_bytes, new.verified_mime_type,
      new.failure_code, new.scan_claim_token, new.scan_claimed_at, new.verified_at
    ) is distinct from row(
      old.actual_generation, old.finalized_sha256, old.finalized_size_bytes,
      old.verified_sha256, old.verified_size_bytes, old.verified_mime_type,
      old.failure_code, old.scan_claim_token, old.scan_claimed_at, old.verified_at
    ) then
      raise exception using errcode = '42501', message = 'cancelled media metadata mutation denied';
    end if;
  end if;
  if current_user = 'sf_media_scanner' and not (
    (old.state = 'UPLOADED_UNVERIFIED'
      and new.state in ('SCANNING', 'REJECTED', 'FAILED_RETRYABLE'))
    or (old.state = 'SCANNING'
      and new.state in ('VERIFIED', 'REJECTED', 'FAILED_RETRYABLE'))
    or (old.state = 'FAILED_RETRYABLE' and new.state in ('SCANNING', 'REJECTED'))
  ) then
    raise exception using errcode = '42501', message = 'scanner media transition denied';
  end if;
  if current_user = 'sf_media_scanner' and row(
    new.actual_generation, new.finalized_sha256, new.finalized_size_bytes
  ) is distinct from row(
    old.actual_generation, old.finalized_sha256, old.finalized_size_bytes
  ) then
    raise exception using errcode = '42501', message = 'scanner cannot change upload finalization';
  end if;
  if current_user = 'sf_media_scanner' and new.state = 'SCANNING' and (
    new.scan_claim_token is null or new.scan_claimed_at is null
    or new.verified_sha256 is not null or new.verified_size_bytes is not null
    or new.verified_mime_type is not null or new.verified_at is not null
  ) then
    raise exception using errcode = '42501', message = 'invalid scanner claim';
  end if;
  if current_user = 'sf_media_scanner' and new.state = 'VERIFIED' and (
    new.failure_code is not null or new.verified_sha256 is null
    or new.verified_size_bytes is null or new.verified_mime_type is null
    or new.verified_at is null
    or (
      new.purpose = 'VOICE_OFFLINE_AUDIO'
      and not platform.consent_access_current(
        new.owner_subject_id, 'audio.storage', 'farmer.self_service',
        'ACCOUNT', new.owner_subject_id, new.consent_access_version
      )
    )
    or not exists (
      select 1 from media.scan_result result
      where result.asset_id = new.asset_id
        and result.outcome = 'VERIFIED'
        and result.object_generation = new.actual_generation
        and result.sha256 = new.verified_sha256
        and result.size_bytes = new.verified_size_bytes
        and result.magic_mime_type = new.verified_mime_type
    )
    or not exists (
      select 1 from media.derivative derivative
      where derivative.asset_id = new.asset_id
        and (
          (new.purpose = 'VOICE_OFFLINE_AUDIO' and derivative.derivative_type = 'SAFE_AUDIO')
          or (new.purpose <> 'VOICE_OFFLINE_AUDIO'
            and derivative.derivative_type = 'SAFE_IMAGE')
        )
    )
  ) then
    raise exception using errcode = '42501', message = 'verified media evidence incomplete';
  end if;
  if current_user = 'sf_voice_gateway'
     and not (old.state = 'VERIFIED' and new.state = 'ATTACHED') then
    raise exception using errcode = '42501', message = 'voice media transition denied';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end
$function$;

create trigger enforce_asset_transition
before update on media.asset
for each row execute function media.enforce_asset_transition();

create or replace function voice.enforce_session_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'CREATED' or new.revision <> 0
       or new.highest_client_sequence <> 0 or new.highest_server_sequence <> 0
       or new.closed_at is not null then
      raise exception using errcode = '42501', message = 'invalid initial voice session state';
    end if;
    return new;
  end if;
  if row(
    new.session_id, new.environment, new.subject_id, new.subject_device_binding_id,
    new.role_context_id, new.authorization_version, new.purpose_code, new.origin,
    new.language, new.visual_route, new.context_ids, new.created_at, new.expires_at
  ) is distinct from row(
    old.session_id, old.environment, old.subject_id, old.subject_device_binding_id,
    old.role_context_id, old.authorization_version, old.purpose_code, old.origin,
    old.language, old.visual_route, old.context_ids, old.created_at, old.expires_at
  ) then
    raise exception using errcode = '42501', message = 'voice session binding is immutable';
  end if;
  if new.revision <> old.revision + 1
     or new.highest_client_sequence < old.highest_client_sequence
     or new.highest_server_sequence < old.highest_server_sequence then
    raise exception using errcode = '23514', message = 'invalid voice session revision or sequence';
  end if;
  if new.state <> old.state and not (
    (old.state = 'CREATED' and new.state in ('READY', 'UNAVAILABLE', 'CLOSED'))
    or (old.state = 'READY' and new.state in (
      'RECONNECTING', 'EXPIRING', 'UNAVAILABLE', 'CLOSED'
    ))
    or (old.state = 'RECONNECTING' and new.state in ('READY', 'UNAVAILABLE', 'CLOSED'))
    or (old.state = 'EXPIRING' and new.state = 'CLOSED')
    or (old.state = 'UNAVAILABLE' and new.state = 'CLOSED')
  ) then
    raise exception using errcode = '23514', message = 'invalid voice session transition';
  end if;
  if new.state = 'CLOSED' and new.closed_at is null then
    new.closed_at := statement_timestamp();
  elsif new.state <> 'CLOSED' and new.closed_at is not null then
    raise exception using errcode = '23514', message = 'invalid voice session close timestamp';
  end if;
  return new;
end
$function$;

create trigger enforce_voice_session_transition
before insert or update on voice.session
for each row execute function voice.enforce_session_transition();

create or replace function voice.enforce_ticket_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, voice
as $function$
begin
  if tg_op = 'INSERT' then
    if new.consumed_at is not null or new.consumed_connection_id is not null
       or not exists (
         select 1 from voice.session session
         where session.session_id = new.session_id
           and session.environment = new.environment
           and session.subject_id = new.subject_id
           and session.subject_device_binding_id = new.subject_device_binding_id
           and session.role_context_id = new.role_context_id
           and session.authorization_version = new.authorization_version
           and session.purpose_code = new.purpose_code
           and session.origin = new.origin
           and session.language = new.language
           and session.visual_route = new.visual_route
           and session.context_ids = new.context_ids
           and session.state in ('CREATED', 'READY', 'RECONNECTING')
           and session.expires_at >= new.expires_at
           and session.expires_at > statement_timestamp()
       ) then
      raise exception using errcode = '42501', message = 'voice ticket binding denied';
    end if;
    return new;
  end if;
  if row(
    new.ticket_id, new.session_id, new.environment, new.subject_id,
    new.subject_device_binding_id, new.ticket_hash, new.role_context_id,
    new.authorization_version, new.purpose_code, new.origin, new.language,
    new.visual_route, new.context_ids, new.issued_at, new.expires_at
  ) is distinct from row(
    old.ticket_id, old.session_id, old.environment, old.subject_id,
    old.subject_device_binding_id, old.ticket_hash, old.role_context_id,
    old.authorization_version, old.purpose_code, old.origin, old.language,
    old.visual_route, old.context_ids, old.issued_at, old.expires_at
  ) or current_user <> 'sf_migrator'
     or old.consumed_at is not null or old.consumed_connection_id is not null
     or new.consumed_at is null or new.consumed_connection_id is null
     or statement_timestamp() >= old.expires_at
     or not exists (
       select 1 from voice.session session
       where session.session_id = old.session_id
         and session.state in ('CREATED', 'READY', 'RECONNECTING')
         and session.expires_at > statement_timestamp()
     ) then
    raise exception using errcode = '42501', message = 'voice ticket mutation denied';
  end if;
  new.consumed_at := statement_timestamp();
  return new;
end
$function$;

create trigger enforce_voice_ticket_write
before insert or update on voice.ticket
for each row execute function voice.enforce_ticket_write();

create or replace function voice.consume_ticket(
  ticket_hash_value text,
  request_origin_value text,
  connection_id_value uuid
)
returns table (
  session_id uuid,
  environment text,
  subject_id uuid,
  subject_device_binding_id uuid,
  role_context_id uuid,
  authorization_version bigint,
  purpose_code text,
  origin text,
  language text,
  visual_route text,
  context_ids uuid[]
)
language sql
volatile
security definer
set search_path = pg_catalog, voice, identity, platform
as $function$
  update voice.ticket ticket
  set consumed_at = statement_timestamp(),
      consumed_connection_id = connection_id_value
  from voice.session session,
       identity.subject_device_binding binding,
       platform.subject_authority_projection subject_authority,
       platform.role_context_authority_projection role_context,
       platform.role_grant_authority_projection role_grant
  where ticket_hash_value ~ '^sha256:[0-9a-f]{64}$'
    and ticket.ticket_hash = ticket_hash_value
    and ticket.origin = request_origin_value
    and ticket.consumed_at is null
    and ticket.consumed_connection_id is null
    and ticket.expires_at > statement_timestamp()
    and session.session_id = ticket.session_id
    and session.environment = ticket.environment
    and session.subject_id = ticket.subject_id
    and session.subject_device_binding_id = ticket.subject_device_binding_id
    and session.role_context_id = ticket.role_context_id
    and session.authorization_version = ticket.authorization_version
    and session.purpose_code = ticket.purpose_code
    and session.origin = ticket.origin
    and session.language = ticket.language
    and session.visual_route = ticket.visual_route
    and session.context_ids = ticket.context_ids
    and session.state in ('CREATED', 'READY', 'RECONNECTING')
    and session.expires_at > statement_timestamp()
    and binding.subject_device_binding_id = ticket.subject_device_binding_id
    and binding.subject_id = ticket.subject_id
    and binding.environment = ticket.environment
    and binding.state = 'ACTIVE'
    and binding.revoked_at is null
    and subject_authority.subject_id = ticket.subject_id
    and subject_authority.environment = ticket.environment
    and subject_authority.authorization_version = ticket.authorization_version
    and subject_authority.active
    and role_context.role_context_id = ticket.role_context_id
    and role_context.subject_id = ticket.subject_id
    and role_context.authorization_version = ticket.authorization_version
    and role_context.purpose_code = ticket.purpose_code
    and role_context.revoked_at is null
    and role_context.expires_at > statement_timestamp()
    and role_grant.role_grant_id = role_context.role_grant_id
    and role_grant.subject_id = role_context.subject_id
    and role_grant.role_type = role_context.role_type
    and role_grant.capability_set_version = role_context.capability_set_version
    and role_grant.revoked_at is null
    and role_grant.valid_from <= statement_timestamp()
    and (role_grant.valid_until is null or role_grant.valid_until > statement_timestamp())
  returning ticket.session_id, ticket.environment, ticket.subject_id,
    ticket.subject_device_binding_id, ticket.role_context_id,
    ticket.authorization_version, ticket.purpose_code, ticket.origin,
    ticket.language, ticket.visual_route, ticket.context_ids
$function$;

alter function voice.consume_ticket(text, text, uuid) owner to sf_migrator;

create or replace function voice.enforce_proposal_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'PENDING' or new.revision <> 0 or new.command_id is not null
       or new.confirmed_at is not null or new.closed_at is not null
       or not exists (
         select 1 from voice.session session
         where session.session_id = new.session_id
           and session.environment = new.environment
           and session.subject_id = new.subject_id
           and session.state in ('CREATED', 'READY', 'RECONNECTING')
           and session.expires_at >= new.expires_at
       ) then
      raise exception using errcode = '42501', message = 'invalid initial voice proposal state';
    end if;
    return new;
  end if;
  if row(
    new.proposal_id, new.session_id, new.environment, new.subject_id,
    new.tool_key, new.canonical_payload, new.payload_hash, new.read_back,
    new.supersedes_proposal_id, new.created_at, new.expires_at
  ) is distinct from row(
    old.proposal_id, old.session_id, old.environment, old.subject_id,
    old.tool_key, old.canonical_payload, old.payload_hash, old.read_back,
    old.supersedes_proposal_id, old.created_at, old.expires_at
  ) or new.revision <> old.revision + 1
     or (old.command_id is not null and new.command_id is distinct from old.command_id) then
    raise exception using errcode = '42501', message = 'voice proposal immutable fields changed';
  end if;
  if not (
    (old.state = 'PENDING' and new.state in (
      'CONFIRMED', 'CANCELLED', 'SUPERSEDED', 'EXPIRED'
    ))
    or (old.state = 'CONFIRMED' and new.state = 'EXECUTING')
    or (old.state = 'EXECUTING' and new.state in ('COMPLETE', 'FAILED'))
  ) then
    raise exception using errcode = '23514', message = 'invalid voice proposal transition';
  end if;
  if new.state in ('CONFIRMED', 'CANCELLED', 'SUPERSEDED') and new.command_id is null then
    raise exception using errcode = '23514', message = 'proposal transition requires command identity';
  end if;
  if new.state = 'CONFIRMED' and new.confirmed_at is null then
    new.confirmed_at := statement_timestamp();
  elsif new.state not in ('CONFIRMED', 'EXECUTING', 'COMPLETE', 'FAILED')
        and new.confirmed_at is not null then
    raise exception using errcode = '23514', message = 'invalid proposal confirmation timestamp';
  end if;
  if new.state in ('CANCELLED', 'SUPERSEDED', 'EXPIRED', 'COMPLETE', 'FAILED')
     and new.closed_at is null then
    new.closed_at := statement_timestamp();
  elsif new.state not in ('CANCELLED', 'SUPERSEDED', 'EXPIRED', 'COMPLETE', 'FAILED')
        and new.closed_at is not null then
    raise exception using errcode = '23514', message = 'invalid proposal close timestamp';
  end if;
  return new;
end
$function$;

create trigger enforce_voice_proposal_transition
before insert or update on voice.proposal
for each row execute function voice.enforce_proposal_transition();

create or replace function voice.enforce_offline_audio_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'TRANSCRIPTION_PENDING' or new.revision <> 0
       or not exists (
         select 1 from voice.session session
         where session.session_id = new.session_id
           and session.environment = new.environment
           and session.subject_id = new.subject_id
           and session.revision = new.expected_session_revision
           and session.state in ('CREATED', 'READY', 'RECONNECTING')
           and session.expires_at > statement_timestamp()
       ) then
      raise exception using errcode = '42501', message = 'invalid initial offline audio state';
    end if;
    return new;
  end if;
  if row(
    new.offline_audio_ref_id, new.session_id, new.environment, new.subject_id,
    new.local_capture_id, new.language, new.audio_consent_version,
    new.expected_session_revision, new.created_at, new.expires_at
  ) is distinct from row(
    old.offline_audio_ref_id, old.session_id, old.environment, old.subject_id,
    old.local_capture_id, old.language, old.audio_consent_version,
    old.expected_session_revision, old.created_at, old.expires_at
  ) or new.revision <> old.revision + 1 or not (
    (old.state = 'TRANSCRIPTION_PENDING'
      and new.state in ('NEEDS_CONFIRMATION', 'FAILED', 'EXPIRED', 'CANCELLED'))
    or (old.state = 'NEEDS_CONFIRMATION' and new.state in ('EXPIRED', 'CANCELLED'))
  ) then
    raise exception using errcode = '23514', message = 'invalid offline audio transition';
  end if;
  return new;
end
$function$;

create trigger enforce_offline_audio_transition
before insert or update on voice.offline_audio_ref
for each row execute function voice.enforce_offline_audio_transition();

create or replace function media.enforce_offline_voice_attachment()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, media, voice
as $function$
begin
  if not exists (
    select 1
    from media.asset asset
    join media.derivative derivative on derivative.derivative_id = new.derivative_id
    join voice.session session on session.session_id = new.owner_id
    where asset.asset_id = new.asset_id
      and derivative.asset_id = asset.asset_id
      and derivative.derivative_type = 'SAFE_AUDIO'
      and asset.state = 'VERIFIED'
      and asset.purpose = 'VOICE_OFFLINE_AUDIO'
      and asset.owner_type = 'VOICE_SESSION'
      and asset.owner_id = session.session_id
      and asset.environment = new.environment
      and asset.owner_subject_id = new.owner_subject_id
      and asset.consent_access_version = new.consent_access_version
      and platform.consent_access_current(
        new.owner_subject_id, 'audio.storage', 'farmer.self_service',
        'ACCOUNT', new.owner_subject_id, new.consent_access_version
      )
      and session.environment = new.environment
      and session.subject_id = new.owner_subject_id
      and session.subject_device_binding_id = asset.subject_device_binding_id
      and new.retain_until > new.attached_at
      and new.retain_until <= new.attached_at + interval '7 days'
  ) then
    raise exception using errcode = '42501', message = 'verified media attachment denied';
  end if;
  return new;
end
$function$;

create trigger enforce_offline_voice_attachment
before insert on media.attachment
for each row execute function media.enforce_offline_voice_attachment();

create or replace function voice.enforce_offline_audio_link()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, media, voice
as $function$
begin
  if not exists (
    select 1
    from voice.offline_audio_ref offline_ref
    join media.attachment attachment on attachment.attachment_id = new.attachment_id
    where offline_ref.offline_audio_ref_id = new.offline_audio_ref_id
      and attachment.asset_id = new.asset_id
      and offline_ref.session_id = attachment.owner_id
      and offline_ref.environment = new.environment
      and attachment.environment = new.environment
      and offline_ref.subject_id = new.subject_id
      and attachment.owner_subject_id = new.subject_id
      and offline_ref.audio_consent_version = attachment.consent_access_version
  ) then
    raise exception using errcode = '42501', message = 'offline audio link denied';
  end if;
  return new;
end
$function$;

create trigger enforce_offline_audio_link
before insert on voice.offline_audio_media_link
for each row execute function voice.enforce_offline_audio_link();

do $append_only$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'platform.sync_batch_receipt', 'platform.sync_feed_event',
    'platform.sync_bootstrap_snapshot', 'platform.sync_acknowledgement',
    'media.scan_result', 'media.derivative', 'media.attachment',
    'voice.offline_audio_media_link'
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
begin
  foreach relation_name in array array[
    'platform.schema_compatibility', 'platform.sync_stream',
    'platform.sync_batch_receipt', 'platform.sync_feed_event',
    'platform.sync_bootstrap_snapshot', 'platform.sync_acknowledgement',
    'platform.sync_conflict', 'media.upload_intent', 'media.asset',
    'media.scan_result', 'media.derivative', 'media.attachment',
    'voice.session', 'voice.ticket', 'voice.proposal', 'voice.offline_audio_ref',
    'voice.offline_audio_media_link'
  ] loop
    execute format('alter table %s enable row level security', relation_name);
    execute format('alter table %s force row level security', relation_name);
  end loop;
end
$rls$;

create policy schema_compatibility_read_policy on platform.schema_compatibility
  for select to sf_farmer_api, sf_voice_gateway, sf_media_scanner
  using (true);

create policy farmer_sync_stream_policy on platform.sync_stream
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  );

create policy farmer_sync_batch_policy on platform.sync_batch_receipt
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_batch_receipt.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_batch_receipt.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy farmer_sync_bootstrap_policy on platform.sync_bootstrap_snapshot
  for select to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_bootstrap_snapshot.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy farmer_sync_acknowledgement_policy on platform.sync_acknowledgement
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_acknowledgement.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_acknowledgement.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy farmer_sync_conflict_policy on platform.sync_conflict
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_conflict.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from platform.sync_stream stream
      where stream.stream_id = sync_conflict.stream_id
        and stream.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy farmer_sync_feed_policy on platform.sync_feed_event
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  );

create policy farmer_upload_intent_policy on media.upload_intent
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  );

create policy farmer_media_asset_policy on media.asset
  to sf_farmer_api
  using (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  )
  with check (
    platform.request_context_valid() and platform.request_surface_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
  );

create policy farmer_media_attachment_policy on media.attachment
  for select to sf_farmer_api
  using (
    exists (
      select 1 from media.asset
      where asset.asset_id = attachment.asset_id
        and asset.environment = attachment.environment
        and asset.owner_subject_id = attachment.owner_subject_id
        and asset.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy farmer_media_scan_policy on media.scan_result
  for select to sf_farmer_api
  using (
    exists (
      select 1 from media.asset
      where asset.asset_id = scan_result.asset_id
        and asset.environment = current_setting('app.environment', true)
        and asset.owner_subject_id = platform.request_uuid('app.subject_id')
        and asset.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );
create policy farmer_media_derivative_policy on media.derivative
  for select to sf_farmer_api
  using (
    exists (
      select 1 from media.asset
      where asset.asset_id = derivative.asset_id
        and asset.environment = current_setting('app.environment', true)
        and asset.owner_subject_id = platform.request_uuid('app.subject_id')
        and asset.subject_device_binding_id =
          platform.request_uuid('app.subject_device_binding_id')
    )
  );

create policy scanner_asset_policy on media.asset
  to sf_media_scanner
  using (current_user = 'sf_media_scanner')
  with check (current_user = 'sf_media_scanner');
create policy scanner_result_policy on media.scan_result
  for insert to sf_media_scanner
  with check (current_user = 'sf_media_scanner');
create policy scanner_result_read_policy on media.scan_result
  for select to sf_media_scanner
  using (current_user = 'sf_media_scanner');
create policy scanner_derivative_policy on media.derivative
  for insert to sf_media_scanner
  with check (current_user = 'sf_media_scanner');
create policy scanner_derivative_read_policy on media.derivative
  for select to sf_media_scanner
  using (current_user = 'sf_media_scanner');

create policy voice_session_context_policy on voice.session
  to sf_voice_gateway
  using (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and authorization_version = platform.request_bigint('app.authorization_version')
  )
  with check (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and authorization_version = platform.request_bigint('app.authorization_version')
  );

create policy voice_ticket_context_policy on voice.ticket
  to sf_voice_gateway
  using (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and authorization_version = platform.request_bigint('app.authorization_version')
  )
  with check (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id = platform.request_uuid('app.subject_device_binding_id')
    and role_context_id = platform.request_uuid('app.role_context_id')
    and authorization_version = platform.request_bigint('app.authorization_version')
  );

create policy migrator_voice_session_consume_policy on voice.session
  for select to sf_migrator using (true);
create policy migrator_voice_ticket_consume_policy on voice.ticket
  to sf_migrator using (true) with check (true);

create policy voice_proposal_context_policy on voice.proposal
  to sf_voice_gateway
  using (
    exists (
      select 1 from voice.session
      where session.session_id = proposal.session_id
        and session.environment = proposal.environment
        and session.subject_id = proposal.subject_id
    )
  )
  with check (
    exists (
      select 1 from voice.session
      where session.session_id = proposal.session_id
        and session.environment = proposal.environment
        and session.subject_id = proposal.subject_id
    )
  );

create policy voice_offline_audio_context_policy on voice.offline_audio_ref
  to sf_voice_gateway
  using (
    exists (
      select 1 from voice.session
      where session.session_id = offline_audio_ref.session_id
        and session.environment = offline_audio_ref.environment
        and session.subject_id = offline_audio_ref.subject_id
    )
  )
  with check (
    exists (
      select 1 from voice.session
      where session.session_id = offline_audio_ref.session_id
        and session.environment = offline_audio_ref.environment
        and session.subject_id = offline_audio_ref.subject_id
    )
  );

create policy voice_offline_audio_link_context_policy on voice.offline_audio_media_link
  to sf_voice_gateway
  using (
    exists (
      select 1 from voice.offline_audio_ref
      where offline_audio_ref.offline_audio_ref_id =
            offline_audio_media_link.offline_audio_ref_id
        and offline_audio_ref.environment = offline_audio_media_link.environment
        and offline_audio_ref.subject_id = offline_audio_media_link.subject_id
    )
  )
  with check (
    exists (
      select 1 from voice.offline_audio_ref
      where offline_audio_ref.offline_audio_ref_id =
            offline_audio_media_link.offline_audio_ref_id
        and offline_audio_ref.environment = offline_audio_media_link.environment
        and offline_audio_ref.subject_id = offline_audio_media_link.subject_id
    )
  );

create policy voice_media_asset_policy on media.asset
  for select to sf_voice_gateway
  using (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and subject_device_binding_id =
      platform.request_uuid('app.subject_device_binding_id')
    and purpose = 'VOICE_OFFLINE_AUDIO'
    and owner_type = 'VOICE_SESSION'
    and exists (
      select 1 from voice.session
      where session.session_id = asset.owner_id
        and session.environment = asset.environment
        and session.subject_id = asset.owner_subject_id
        and session.subject_device_binding_id = asset.subject_device_binding_id
    )
  );
create policy voice_media_attachment_policy on media.attachment
  to sf_voice_gateway
  using (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from voice.session
      join media.asset on asset.asset_id = attachment.asset_id
      where session.session_id = attachment.owner_id
        and session.environment = attachment.environment
        and session.subject_id = attachment.owner_subject_id
        and session.subject_device_binding_id = asset.subject_device_binding_id
    )
  )
  with check (
    platform.request_context_valid()
    and environment = current_setting('app.environment', true)
    and owner_subject_id = platform.request_uuid('app.subject_id')
    and exists (
      select 1 from voice.session
      join media.asset on asset.asset_id = attachment.asset_id
      where session.session_id = attachment.owner_id
        and session.environment = attachment.environment
        and session.subject_id = attachment.owner_subject_id
        and session.subject_device_binding_id = asset.subject_device_binding_id
    )
  );

create policy voice_media_derivative_policy on media.derivative
  for select to sf_voice_gateway
  using (
    exists (
      select 1 from media.asset
      where asset.asset_id = derivative.asset_id
        and asset.purpose = 'VOICE_OFFLINE_AUDIO'
        and asset.owner_type = 'VOICE_SESSION'
    )
  );

comment on table platform.schema_compatibility is
  'C0 compatibility policy; every accepted version remains supported for at least 90 days.';
comment on table platform.sync_stream is
  'C2 Farmer-only server sync stream bound to one current subject-device binding.';
comment on table platform.sync_bootstrap_snapshot is
  'C3 encrypted bootstrap snapshot; expires after bounded recovery use.';
comment on table media.upload_intent is
  'C3 upload intent; storage remains quarantined and untrusted until verified.';
comment on table media.asset is
  'C3 media lifecycle state; verification alone never grants evidentiary ownership.';
comment on table media.attachment is
  'C3 typed attachment; Milestone 2 permits only verified offline voice audio.';
comment on table voice.ticket is
  'C4 hash-only, exact-context, one-use voice transport ticket with a 60-second lifetime.';
comment on table voice.proposal is
  'C3 persisted immutable-hash confirmation proposal; cancellation or expiry executes nothing.';

revoke all on schema media, voice from public;
revoke all on all tables in schema media, voice from public;
revoke all on all functions in schema media, voice from public;

grant usage on schema platform, media to sf_farmer_api;
grant usage on schema platform, media to sf_media_scanner;
grant usage on schema identity, platform, media, voice to sf_voice_gateway;
grant usage on schema voice to sf_migrator;

grant select on platform.schema_compatibility to sf_farmer_api, sf_media_scanner, sf_voice_gateway;
grant select, insert, update on platform.sync_stream to sf_farmer_api;
grant select, insert on platform.sync_batch_receipt, platform.sync_acknowledgement
  to sf_farmer_api;
grant select on platform.sync_feed_event, platform.sync_bootstrap_snapshot
  to sf_farmer_api;
grant select, insert, update on platform.sync_conflict to sf_farmer_api;

grant select, insert on media.upload_intent to sf_farmer_api;
grant update (state, revision, cancelled_at) on media.upload_intent to sf_farmer_api;
grant select, insert on media.asset to sf_farmer_api;
grant update (state, revision, actual_generation, finalized_sha256,
  finalized_size_bytes, updated_at) on media.asset to sf_farmer_api;
grant select on media.scan_result, media.derivative to sf_farmer_api;
grant select on media.attachment to sf_farmer_api;

grant select (asset_id, intent_id, storage_object_name, expected_generation,
  expected_sha256, expected_size_bytes, claimed_mime_type, state, revision,
  actual_generation, finalized_sha256, finalized_size_bytes,
  consent_access_version, purpose, owner_type, owner_id, environment,
  owner_subject_id, subject_device_binding_id)
  on media.asset to sf_media_scanner;
grant update (state, revision, verified_sha256, verified_size_bytes,
  verified_mime_type, failure_code, scan_claim_token, scan_claimed_at, verified_at, updated_at)
  on media.asset to sf_media_scanner;
grant select, insert on media.scan_result, media.derivative to sf_media_scanner;

grant select, insert on voice.session, voice.ticket, voice.proposal,
  voice.offline_audio_ref to sf_voice_gateway;
grant update (state, revision, highest_client_sequence, highest_server_sequence, closed_at)
  on voice.session to sf_voice_gateway;
grant update (state, revision, command_id, confirmed_at, closed_at)
  on voice.proposal to sf_voice_gateway;
grant update (state, revision) on voice.offline_audio_ref to sf_voice_gateway;
grant select, insert on voice.offline_audio_media_link to sf_voice_gateway;
grant select on media.asset to sf_voice_gateway;
grant select (derivative_id, asset_id, derivative_type) on media.derivative
  to sf_voice_gateway;
grant select, insert on media.attachment to sf_voice_gateway;
grant update (state, revision, updated_at) on media.asset to sf_voice_gateway;

grant select on voice.session, voice.ticket to sf_migrator;
grant update (consumed_at, consumed_connection_id) on voice.ticket to sf_migrator;

grant execute on function platform.request_uuid(text), platform.request_bigint(text),
  platform.request_context_valid() to sf_voice_gateway;
grant execute on function platform.consent_access_current(
  uuid, text, text, text, uuid, bigint
) to sf_media_scanner, sf_voice_gateway;
grant execute on function media.enforce_asset_transition()
  to sf_farmer_api, sf_media_scanner, sf_voice_gateway;
grant execute on function media.farmer_upload_owner_current(text, text, uuid, bigint)
  to sf_farmer_api;
grant execute on function media.enforce_upload_intent_write(),
  media.enforce_asset_intent_binding() to sf_farmer_api;
grant execute on function media.enforce_offline_voice_attachment()
  to sf_farmer_api, sf_voice_gateway;
grant execute on function voice.enforce_offline_audio_link()
  to sf_voice_gateway;
grant execute on function voice.enforce_session_transition(),
  voice.enforce_ticket_write(), voice.enforce_proposal_transition(),
  voice.enforce_offline_audio_transition() to sf_voice_gateway;
grant execute on function voice.consume_ticket(text, text, uuid) to sf_voice_gateway;
