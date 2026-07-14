-- Milestone 5 persistence hardening.
-- Adds full JSON payload storage so the application can reconstruct Recommendation results,
-- idempotency receipts and season calendars without relying on process memory.

alter table agronomy.recommendation_request
  add column if not exists status_payload jsonb not null default '{}'::jsonb;

alter table agronomy.recommendation_result
  add column if not exists result_payload jsonb not null default '{}'::jsonb;

alter table agronomy.recommendation_acceptance
  add column if not exists receipt_payload jsonb not null default '{}'::jsonb;

alter table workflow.calendar
  add column if not exists calendar_payload jsonb not null default '{}'::jsonb;
