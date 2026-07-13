-- Milestone 4: Weather, Earth observation, soil/hardware telemetry and evidence spine.
-- This migration is forward-only and deliberately avoids recommendation/advisory/alert tables.

create schema if not exists evidence;
create schema if not exists device;

create table evidence.source_registry (
  source_key text primary key,
  source_name text not null,
  provenance_type text not null check (provenance_type in (
    'SENSOR', 'FARMER_REPORTED', 'FARMER_MANUAL', 'RSK_MANUAL', 'LABORATORY',
    'SOIL_HEALTH_CARD', 'WEATHER', 'SATELLITE', 'PUBLIC_MARKET', 'DERIVED'
  )),
  default_rights_label text not null,
  created_at timestamptz not null default statement_timestamp()
);

create table evidence.unit_registry (
  unit_key text primary key,
  display_label text not null,
  dimension text not null
);

create table evidence.record (
  environment text not null,
  evidence_id uuid not null,
  farmer_subject_id uuid not null,
  farm_id uuid not null,
  plot_id uuid not null,
  kind text not null check (kind in (
    'WEATHER_FORECAST', 'WEATHER_HISTORY', 'EARTH_OBSERVATION',
    'SOIL_MEASUREMENT', 'HARDWARE_TELEMETRY', 'DEVICE_HEALTH'
  )),
  metric_key text not null,
  value_state text not null check (value_state in (
    'KNOWN', 'UNKNOWN', 'MISSING', 'PROXY', 'CONFLICTING',
    'NOT_APPLICABLE', 'WITHHELD', 'UNAVAILABLE'
  )),
  original_value text check (original_value is null or original_value ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'),
  original_unit text,
  normalized_value text check (normalized_value is null or normalized_value ~ '^-?(0|[1-9][0-9]*)(\.[0-9]+)?$'),
  normalized_unit text not null,
  observed_at timestamptz,
  received_at timestamptz not null,
  forecast_for timestamptz,
  source_key text not null references evidence.source_registry(source_key),
  source_ref text not null,
  source_version text not null,
  rights_label text not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  quality text not null check (quality in ('TRUSTED', 'USE_WITH_CAUTION', 'TREND_ONLY', 'DO_NOT_USE', 'PENDING')),
  freshness text not null check (freshness in ('CURRENT', 'DATA_IS_OLD', 'NO_RECENT_DATA', 'UNAVAILABLE')),
  decision_eligible boolean not null default false,
  limitations text[] not null default array[]::text[],
  policy_version text not null,
  conversion_version text not null,
  calibration_version text,
  correction_of_evidence_id uuid,
  invalidated_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, evidence_id),
  foreign key (environment, farm_id) references farm.farm(environment, farm_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  foreign key (environment, farmer_subject_id) references farm.farmer_profile(environment, farmer_subject_id),
  check (
    (value_state = 'KNOWN' and normalized_value is not null)
    or (value_state <> 'KNOWN' and normalized_value is null)
  )
);

create index evidence_record_plot_received_idx
  on evidence.record(environment, plot_id, received_at desc);

create table evidence.weather_edition (
  environment text not null,
  weather_edition_id uuid not null,
  plot_id uuid not null,
  edition_kind text not null check (edition_kind in ('FORECAST', 'HISTORY')),
  provider_key text not null,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  observed_window tstzrange,
  retained_until timestamptz not null,
  decision_eligible boolean not null default false,
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, weather_edition_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  check (decision_eligible = false)
);

create table evidence.earth_job (
  environment text not null,
  earth_job_id uuid not null,
  plot_id uuid not null,
  geometry_version integer not null,
  dataset_key text not null check (dataset_key in ('CHIRPS', 'SENTINEL_2', 'SENTINEL_1', 'ERA5_LAND', 'ELEVATION', 'LAND_COVER')),
  state text not null check (state in ('QUEUED', 'RUNNING', 'PROPOSED', 'PERSISTED', 'UNAVAILABLE', 'FAILED_RETRYABLE')),
  consent_version bigint not null check (consent_version >= 0),
  requested_at timestamptz not null default statement_timestamp(),
  primary key (environment, earth_job_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table evidence.earth_snapshot (
  environment text not null,
  earth_snapshot_id uuid not null,
  earth_job_id uuid not null,
  plot_id uuid not null,
  geometry_version integer not null,
  reducer text not null,
  scale_metres integer not null check (scale_metres > 0),
  coverage_percent numeric(5, 2) not null check (coverage_percent between 0 and 100),
  newest_observation_at timestamptz,
  data_mode text not null check (data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  expires_at timestamptz not null,
  payload_checksum text not null check (payload_checksum ~ '^sha256:[0-9a-f]{64}$'),
  limitations text[] not null default array[]::text[],
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, earth_snapshot_id),
  foreign key (environment, earth_job_id) references evidence.earth_job(environment, earth_job_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table evidence.soil_measurement (
  environment text not null,
  soil_measurement_id uuid not null,
  plot_id uuid not null,
  soil_record_id uuid,
  source_key text not null references evidence.source_registry(source_key),
  ph numeric(4, 2) check (ph is null or (ph >= 0 and ph <= 14)),
  nitrogen numeric(10, 2),
  phosphorus numeric(10, 2),
  potassium numeric(10, 2),
  unit text not null,
  observed_at timestamptz,
  received_at timestamptz not null default statement_timestamp(),
  evidence_ids uuid[] not null,
  primary key (environment, soil_measurement_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table device.channel (
  environment text not null,
  channel_id uuid not null,
  plot_id uuid not null,
  device_id text not null,
  assignment_state text not null check (assignment_state in ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  server_data_mode text not null check (server_data_mode in ('LIVE', 'RECORDED', 'SIMULATED')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, channel_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  unique (environment, device_id)
);

create table device.raw_telemetry_receipt (
  environment text not null,
  receipt_id uuid not null,
  batch_id uuid not null,
  channel_id uuid not null,
  payload_digest text not null check (payload_digest ~ '^sha256:[0-9a-f]{64}$'),
  trust_state text not null check (trust_state = 'PENDING'),
  state text not null check (state in ('PENDING', 'DURABLY_ACCEPTED', 'ALREADY_ACCEPTED', 'REJECTED')),
  received_at timestamptz not null default statement_timestamp(),
  primary key (environment, receipt_id),
  unique (environment, batch_id),
  foreign key (environment, channel_id) references device.channel(environment, channel_id)
);

create table device.normalized_observation (
  environment text not null,
  observation_id uuid not null,
  receipt_id uuid not null,
  plot_id uuid not null,
  signal_key text not null,
  normalized_value text,
  normalized_unit text not null,
  observed_at timestamptz not null,
  evidence_id uuid,
  primary key (environment, observation_id),
  foreign key (environment, receipt_id) references device.raw_telemetry_receipt(environment, receipt_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

insert into evidence.source_registry(source_key, source_name, provenance_type, default_rights_label)
values
  ('raigad-demo-weather', 'Raigad demo weather fixture', 'WEATHER', 'Synthetic demo data'),
  ('raigad-demo-earth', 'Raigad demo Earth fixture', 'SATELLITE', 'Synthetic demo data'),
  ('farmer-soil-manual', 'Farmer soil record', 'FARMER_MANUAL', 'Farmer provided'),
  ('soil-health-card', 'Soil Health Card', 'SOIL_HEALTH_CARD', 'Farmer provided reference'),
  ('low-cost-sensor', 'Low-cost plot sensor', 'SENSOR', 'Farmer device telemetry')
on conflict do nothing;

insert into evidence.unit_registry(unit_key, display_label, dimension)
values
  ('CELSIUS', 'deg C', 'temperature'),
  ('PERCENT', '%', 'ratio'),
  ('MILLIMETRE', 'mm', 'rainfall'),
  ('PH', 'pH', 'acidity'),
  ('MG_PER_KG', 'mg/kg', 'soil_nutrient'),
  ('KG_PER_HECTARE', 'kg/ha', 'soil_nutrient'),
  ('MICROSIEMENS_PER_CM', 'uS/cm', 'conductivity'),
  ('INDEX', 'index', 'dimensionless'),
  ('HEALTH_STATE', 'state', 'device_health'),
  ('UNKNOWN', 'unknown', 'unknown')
on conflict do nothing;

do $$
declare
  relation regclass;
begin
  foreach relation in array array[
    'evidence.record'::regclass,
    'evidence.weather_edition'::regclass,
    'evidence.earth_job'::regclass,
    'evidence.earth_snapshot'::regclass,
    'evidence.soil_measurement'::regclass,
    'device.channel'::regclass,
    'device.raw_telemetry_receipt'::regclass,
    'device.normalized_observation'::regclass
  ]
  loop
    execute format('alter table %s enable row level security', relation);
    execute format('alter table %s force row level security', relation);
  end loop;
end $$;

create policy evidence_record_farmer_owner_select on evidence.record
  for select to sf_farmer_api
  using (
    environment = current_setting('app.environment', true)
    and farmer_subject_id = platform.request_uuid('app.subject_id')
  );

create policy evidence_record_farmer_owner_insert on evidence.record
  for insert to sf_farmer_api
  with check (
    environment = current_setting('app.environment', true)
    and farmer_subject_id = platform.request_uuid('app.subject_id')
  );

create policy soil_measurement_farmer_plot_insert on evidence.soil_measurement
  for insert to sf_farmer_api
  with check (
    environment = current_setting('app.environment', true)
    and exists (
      select 1 from farm.plot p
      where p.environment = evidence.soil_measurement.environment
        and p.plot_id = evidence.soil_measurement.plot_id
        and p.farmer_subject_id = platform.request_uuid('app.subject_id')
    )
  );

create policy soil_measurement_farmer_plot_select on evidence.soil_measurement
  for select to sf_farmer_api
  using (
    environment = current_setting('app.environment', true)
    and exists (
      select 1 from farm.plot p
      where p.environment = evidence.soil_measurement.environment
        and p.plot_id = evidence.soil_measurement.plot_id
        and p.farmer_subject_id = platform.request_uuid('app.subject_id')
    )
  );

create policy evidence_worker_pipeline_policy on evidence.record
  to sf_domain_worker
  using (current_user = 'sf_domain_worker')
  with check (current_user = 'sf_domain_worker');

create policy weather_worker_pipeline_policy on evidence.weather_edition
  to sf_domain_worker
  using (current_user = 'sf_domain_worker')
  with check (current_user = 'sf_domain_worker');

create policy earth_job_worker_pipeline_policy on evidence.earth_job
  to sf_domain_worker
  using (current_user = 'sf_domain_worker')
  with check (current_user = 'sf_domain_worker');

create policy earth_snapshot_worker_pipeline_policy on evidence.earth_snapshot
  to sf_domain_worker
  using (current_user = 'sf_domain_worker')
  with check (current_user = 'sf_domain_worker');

create policy device_channel_ingest_policy on device.channel
  to sf_device_ingest, sf_domain_worker
  using (current_user in ('sf_device_ingest', 'sf_domain_worker'))
  with check (current_user in ('sf_device_ingest', 'sf_domain_worker'));

create policy device_receipt_ingest_policy on device.raw_telemetry_receipt
  to sf_device_ingest, sf_domain_worker
  using (current_user in ('sf_device_ingest', 'sf_domain_worker'))
  with check (current_user in ('sf_device_ingest', 'sf_domain_worker'));

create policy device_observation_ingest_policy on device.normalized_observation
  to sf_device_ingest, sf_domain_worker
  using (current_user in ('sf_device_ingest', 'sf_domain_worker'))
  with check (current_user in ('sf_device_ingest', 'sf_domain_worker'));

grant usage on schema evidence to sf_farmer_api;
grant select on evidence.source_registry, evidence.unit_registry to sf_farmer_api;
grant select, insert on evidence.record, evidence.soil_measurement to sf_farmer_api;

-- Workers and device ingest get only the append/read surface required for M4 pipelines.
grant usage on schema evidence, device to sf_domain_worker, sf_device_ingest;
grant select, insert, update on
  evidence.weather_edition,
  evidence.earth_job,
  evidence.earth_snapshot,
  evidence.record,
  device.channel,
  device.raw_telemetry_receipt,
  device.normalized_observation
to sf_domain_worker;
grant select, insert, update on
  device.channel,
  device.raw_telemetry_receipt,
  device.normalized_observation
to sf_device_ingest;

revoke all on schema evidence, device from public;
