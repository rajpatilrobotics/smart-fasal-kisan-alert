create extension if not exists postgis;
create extension if not exists pgcrypto;

create schema if not exists platform;

create table if not exists platform.seed_runs (
  id uuid primary key default gen_random_uuid(),
  profile text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seed_runs_profile_created_idx
  on platform.seed_runs (profile, created_at);

comment on table platform.seed_runs is
  'Records synthetic seed executions; never stores farmer or production data.';
