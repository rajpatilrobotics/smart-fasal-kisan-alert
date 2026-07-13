# Milestone 3 — Farmer and Farm Setup

## 1. Goal

Implement Document 11 Milestone 3 on `build/milestone-3-farmer-farm-setup`: a Marathi-first, mobile-first Farmer setup experience for the Raigad pilot. The slice covers Farmer onboarding, device mode, independent consents, Farm and Plot setup, soil/water/crop context, skippable hardware, offline-resumable drafts, minimal setup voice proposals, synchronization and the My Farm result.

## 2. Problem

Milestones 0, 1 and 2 provide the repository runway, identity/security spine, encrypted offline store, sync/outbox foundation, media foundation and voice proposal transport. The Farmer app still lacks the real FS-01 setup flow and farm data model, and M2 sync currently accepts only consent commands. Without M3, the J1/Raigad demo cannot complete a two-Plot Farmer setup with GPS denied, hardware skipped, offline interruption, sync replay and voice-confirmed field changes.

## 3. Proposed Solution

Reuse the M1 authorization/consent/security context and M2 encrypted offline/outbox/voice proposal primitives. Add M3 contracts, pure setup rules, persistence/migration/RLS, Domain API handlers, Farmer PWA routes/components and focused tests. Keep hardware optional, store exact/private setup data only behind Farmer ownership, preserve Live/Recorded/Simulated truth labels and avoid all Milestone 4 weather, Earth Engine, credit, insurance, Web3 and complete evidence-spine work.

## 4. Files To Change

- `packages/contracts`: M3 Farmer setup commands, routes, sync projections, events and generated artifacts.
- `packages/domain`, `packages/application`, `packages/persistence`: setup validation, command handling, idempotency, ownership, conflict and voice proposal execution.
- `packages/database`: forward migration `0005`, schema metadata, synthetic seed and RLS/security tests.
- `packages/offline` and `packages/voice`: small adapters/extensions only where needed to reuse M2 storage and proposal transport.
- `packages/ui`, `packages/maps`, `packages/i18n`: shared Farmer setup UI helpers, map adapter boundary and Marathi/Hindi/English copy.
- `apps/domain-api`: Farmer setup HTTP/sync/voice endpoints with server-side authorization and consent rechecks.
- `apps/farmer-web`: onboarding, Farm/Plot, Soil, Water, Crop, Sensor, Review, My Farm, Settings, Sync Status and Help screens.
- `tests`: targeted integration/E2E/security tests for the required M3 acceptance path.

## 5. Step By Step Tasks

1. Verify `origin/main` is `79beea4ebea6c58473ce897d7e64e711b6218008`, the worktree is clean and the branch is based on that commit.
2. Freeze M3 contracts/events first, including setup drafts, farm/plot/soil/water/crop commands, bootstrap v3, sync command envelopes and Farmer-only route metadata.
3. Add migration `0005` with Farmer profile/setup progress, Farm, Plot, geometry version, soil record, water context, crop history/current setup snapshot, optional hardware status, idempotency, RLS and audit-safe constraints.
4. Implement pure domain/application setup rules: required fields, area normalization, Raigad context, setup state, consent effects, GPS-denied/manual alternatives, skippable hardware, idempotency and honest conflict results.
5. Extend Domain API and sync replay to dispatch M3 commands through the same authorization, consent and ownership path used by connected endpoints.
6. Add the Farmer PWA setup flow, My Farm, Settings, Sync Status and Help screens with Marathi-first copy, clear offline states and no dead controls.
7. Add minimal FS-01 voice setup tools using existing M2 proposal tickets: read setup state, propose allowed field changes and mutate only after exact confirmation.
8. Add focused tests for cross-owner denial, account-switch isolation, consents, GPS denied, hardware skipped, restart/resume, outbox replay, conflict handling, voice confirm/cancel, two-Plot setup and migration/RLS.
9. Run Hackathon Delivery Mode fast checks: contract generation/check, migration/seed when a local `DATABASE_URL` is available, targeted tests, security tests, lint, typecheck and production builds.
10. Commit logical changes, push the requested branch and open a draft PR to `main` without deployment or merge.

## 6. Acceptance Criteria

- A Farmer can complete the J1/Raigad two-Plot setup with GPS denied, hardware skipped, interruption during offline use, draft resume after restart, sync after reconnect, and a correct My Farm result.
- Setup statuses accurately distinguish Saved on This Phone, Waiting for Internet, Synced, Conflict and Locked Recovery.
- Independent consents can be accepted, denied and withdrawn without granting pending capabilities before server acceptance.
- Farm/Plot data supports multiple farms and multiple plots where the contracts allow it, with plot area/unit plus normalized square metres and versioned geometry metadata.
- Soil, water, crop history and current/planned crop context are recorded without starting Milestone 4 recommendation/weather/Earth work.
- Voice reads only authorized setup data, proposes only FS-01 setup field changes and requires explicit confirmation before mutation.
- Server-side ownership, tenant/context, consent and RLS protections deny cross-owner access and account switching cannot expose cached data.

## 7. Testing Plan

Run targeted unit and component tests during development, then contracts generation/check, database migration and synthetic seed when PostgreSQL/PostGIS is available, RLS/security tests, Farmer Web tests, Domain API setup tests, offline/sync tests, voice proposal tests, integration tests, lint, strict typecheck and production builds. Do not add coverage thresholds, make SonarCloud blocking, deploy or run expensive final-release checks unless needed to diagnose a real failure.

## 8. Open Questions

No product decision is blocked. Current/planned crop context will be stored as M3 setup/crop declaration state, not as the future full Season feature. Optional hardware will be recorded as skipped/not configured/RSK setup required only; real device trust/assignment remains in later hardware milestones.
