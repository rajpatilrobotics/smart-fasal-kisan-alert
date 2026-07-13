-- Milestone 3: Farmer and Farm Setup.
-- Forward-only schema for FS-01 setup. No Milestone 4 weather, Earth Engine,
-- recommendation evidence spine, credit, insurance or Web3 tables are created here.

create schema if not exists farm;

create table farm.farmer_profile (
  environment text not null,
  farmer_subject_id uuid not null,
  preferred_locale text not null check (preferred_locale in ('mr-IN', 'hi-IN', 'en-IN')),
  timezone text not null check (timezone = 'Asia/Kolkata'),
  display_name_ciphertext bytea,
  accessibility jsonb not null default '{}'::jsonb,
  device_mode text not null check (device_mode in ('PERSONAL', 'TRUSTED_FAMILY', 'RSK_ASSISTED')),
  setup_status text not null check (setup_status in ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETE', 'NEEDS_REVIEW')),
  setup_revision bigint not null default 0 check (setup_revision >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (environment, farmer_subject_id)
);

create table farm.setup_progress (
  environment text not null,
  draft_id uuid not null,
  farmer_subject_id uuid not null,
  status text not null check (status in ('NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETE', 'NEEDS_REVIEW')),
  sync_status text not null check (sync_status in ('SAVED_ON_THIS_PHONE', 'WAITING_FOR_INTERNET', 'SYNCED', 'CONFLICT', 'LOCKED_RECOVERY', 'REJECTED')),
  draft_payload jsonb not null,
  draft_checksum text not null check (draft_checksum ~ '^sha256:[0-9a-f]{64}$'),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (environment, draft_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id)
);

create table farm.geography_unit (
  environment text not null,
  geography_unit_id uuid not null,
  district text not null check (district = 'Raigad'),
  taluka text not null,
  village text not null,
  coarse_centroid geography(Point, 4326),
  primary key (environment, geography_unit_id),
  unique (environment, district, taluka, village)
);

create table farm.farm (
  environment text not null,
  farm_id uuid not null,
  farmer_subject_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  district text not null check (district = 'Raigad'),
  taluka text not null,
  village text not null,
  landmark text,
  farming_method text not null check (farming_method in ('TRADITIONAL', 'ORGANIC', 'MIXED', 'UNKNOWN')),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (environment, farm_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id)
);

create table farm.plot (
  environment text not null,
  plot_id uuid not null,
  farm_id uuid not null,
  farmer_subject_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  area numeric(14, 4) not null check (area > 0),
  area_unit text not null check (area_unit in ('SQUARE_METRE', 'HECTARE', 'ACRE', 'GUNTHA')),
  normalized_area_square_metres numeric(16, 2) not null check (normalized_area_square_metres > 0),
  area_conversion_version text not null check (area_conversion_version = 'area-v1'),
  location_method text not null check (location_method in ('GPS_POINT', 'MANUAL_MAP', 'VILLAGE_LANDMARK', 'UNKNOWN')),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (environment, plot_id),
  foreign key (environment, farm_id) references farm.farm(environment, farm_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id)
);

create table farm.plot_geometry_version (
  environment text not null,
  plot_id uuid not null,
  geometry_version integer not null check (geometry_version > 0),
  geometry_kind text not null check (geometry_kind in ('NONE', 'POINT', 'POLYGON', 'VILLAGE_LANDMARK')),
  capture_method text not null check (capture_method in ('GPS_POINT', 'MANUAL_MAP', 'VILLAGE_LANDMARK', 'UNKNOWN')),
  gps_permission text not null check (gps_permission in ('GRANTED', 'DENIED', 'PROMPT', 'UNKNOWN')),
  exact_geometry geometry(Geometry, 4326),
  has_exact_server_geometry boolean not null default false,
  recorded_at timestamptz not null,
  primary key (environment, plot_id, geometry_version),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id),
  check (
    (gps_permission = 'DENIED' and capture_method <> 'GPS_POINT')
    or gps_permission <> 'DENIED'
  )
);

create table farm.soil_record (
  environment text not null,
  soil_record_id uuid not null,
  plot_id uuid not null,
  source text not null check (source in ('SOIL_HEALTH_CARD', 'LABORATORY', 'FARMER_MANUAL', 'SENSOR', 'UNKNOWN')),
  observed_at timestamptz,
  ph numeric(4, 2) check (ph is null or (ph >= 0 and ph <= 14)),
  nitrogen numeric(10, 2),
  phosphorus numeric(10, 2),
  potassium numeric(10, 2),
  unit text not null check (unit in ('MG_PER_KG', 'KG_PER_HECTARE', 'UNKNOWN')),
  revision bigint not null check (revision >= 0),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, soil_record_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table farm.water_context_version (
  environment text not null,
  plot_id uuid not null,
  water_context_version integer not null check (water_context_version > 0),
  sources text[] not null,
  availability text not null check (availability in ('HIGH', 'MEDIUM', 'LOW', 'SEASONAL', 'UNKNOWN')),
  reliability text not null check (reliability in ('RELIABLE', 'SOMETIMES', 'UNRELIABLE', 'UNKNOWN')),
  storage text not null check (storage in ('NONE', 'SMALL_TANK', 'FARM_POND', 'OTHER', 'UNKNOWN')),
  rainfed boolean not null,
  recorded_at timestamptz not null,
  primary key (environment, plot_id, water_context_version),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table farm.crop_history (
  environment text not null,
  crop_history_id uuid not null,
  plot_id uuid not null,
  crop_name text not null,
  variety text,
  season_label text not null,
  year integer not null check (year between 2000 and 2100),
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, crop_history_id),
  foreign key (environment, plot_id) references farm.plot(environment, plot_id)
);

create table farm.profile_snapshot (
  environment text not null,
  profile_snapshot_id uuid not null,
  farmer_subject_id uuid not null,
  setup_draft_id uuid not null,
  current_crop_payload jsonb not null,
  hardware_status text not null check (hardware_status in ('SKIPPED', 'NOT_CONFIGURED', 'RSK_SETUP_REQUIRED')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (environment, profile_snapshot_id),
  foreign key (environment, farmer_subject_id)
    references farm.farmer_profile(environment, farmer_subject_id)
);

do $$
declare
  relation regclass;
begin
  foreach relation in array array[
    'farm.farmer_profile'::regclass,
    'farm.setup_progress'::regclass,
    'farm.geography_unit'::regclass,
    'farm.farm'::regclass,
    'farm.plot'::regclass,
    'farm.plot_geometry_version'::regclass,
    'farm.soil_record'::regclass,
    'farm.water_context_version'::regclass,
    'farm.crop_history'::regclass,
    'farm.profile_snapshot'::regclass
  ]
  loop
    execute format('alter table %s enable row level security', relation);
    execute format('alter table %s force row level security', relation);
  end loop;
end $$;

create policy farmer_profile_owner_select on farm.farmer_profile
  for select to sf_farmer_api
  using (
    environment = current_setting('app.environment', true)
    and farmer_subject_id = platform.request_uuid('app.subject_id')
  );

create policy farm_owner_select on farm.farm
  for select to sf_farmer_api
  using (
    environment = current_setting('app.environment', true)
    and farmer_subject_id = platform.request_uuid('app.subject_id')
  );

create policy plot_owner_select on farm.plot
  for select to sf_farmer_api
  using (
    environment = current_setting('app.environment', true)
    and farmer_subject_id = platform.request_uuid('app.subject_id')
  );

grant usage on schema farm to sf_farmer_api;
grant select, insert, update on
  farm.farmer_profile,
  farm.setup_progress,
  farm.farm,
  farm.plot,
  farm.plot_geometry_version,
  farm.soil_record,
  farm.water_context_version,
  farm.crop_history,
  farm.profile_snapshot
to sf_farmer_api;

-- Exact geometry is C3. Do not grant MP or broad RSK access in this milestone.
revoke all on farm.plot_geometry_version from public;
