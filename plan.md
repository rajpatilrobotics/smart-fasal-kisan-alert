# Milestone 5 — Smart Crop Recommendation Engine

## 1. Goal

Deliver the Raigad Farmer recommendation vertical slice from readiness through crop acceptance:

- Use Milestone 3 Farmer/Farm/Plot context and Milestone 4 evidence.
- Return up to three approved crops with reproducible suitability, separate confidence, reasons, risks and evidence.
- Support Marathi-first mobile and read-only voice access.
- Atomically create the accepted Season, Calendar and initial Tasks.

Baseline is merged `main` commit `35152bcaf9ca1488b296e125fbe664abb3e93152`. The existing Milestone 4 `plan.md` stash remains unapplied and undeleted.

## 2. Problem

Milestone 3 supplies ownership, Plot area/geography, farming method, water context, crop history and Farmer constraints. Milestone 4 supplies evidence/source/quality/freshness/mode concepts. Milestone 5 needs sealed decision snapshots, governed crop profiles/rules/templates, deterministic crop scoring, Farmer/voice/offline delivery, and a minimum Season/Calendar foundation.

Google display weather, pending evidence, display-only evidence, unlicensed evidence and legacy unavailable values must not silently drive a Recommendation.

## 3. Proposed Solution

Create `packages/agronomy` as the pure deterministic Recommendation authority. The server derives ownership, evidence, crop candidates, rules, templates, weights and result mode. Clients can send only the strict `recommendation-request-v1` planning request and cannot send crop IDs, score overrides, provider values, trust decisions or mode.

The engine applies hard gates before scoring, calculates suitability and confidence separately, ranks deterministically, returns at most three crops, and stores/exposes deterministic explanations. Optional model explanations may only explain a stored result and must be rejected if they alter crop order, numbers, units, warnings, mode or limitations.

## 4. Files to Change

- `plan.md`
- `packages/contracts`
- `packages/agronomy`
- `packages/database`
- `packages/application` and `apps/domain-api`
- `apps/farmer-web`
- `packages/offline`
- `packages/voice`
- `packages/i18n`
- `evaluation/` and synthetic scenario fixtures

No production deployment, commit, push or PR is part of this milestone implementation step.

## 5. Step by Step Tasks

1. Freeze Recommendation, Season, Calendar, voice and event contracts.
2. Add governed registry, evidence snapshot and decision-weather persistence.
3. Add minimum Season/Calendar/Task schema.
4. Implement deterministic hard gates, scoring, confidence, ranking and explanations.
5. Add Recommendation request/read/review/accept/start-confirmation orchestration.
6. Add Farmer readiness, result, evidence, acceptance and Calendar screens.
7. Add offline draft/result cache behavior.
8. Register read-only multilingual voice result support.
9. Add Raigad synthetic scenario and golden vectors.
10. Run Hackathon Delivery Mode blocking checks and report exact results.
11. Add live-ready evidence provider boundaries and persistence adapters so SIMULATED,
    RECORDED and LIVE_UNAVAILABLE paths are explicit instead of hard-coded in the engine.

## 6. Acceptance Criteria

- Every returned crop passes every active hard gate.
- Suitability and confidence stay separate in contracts and UI.
- Missing, stale, proxy, conflicting and unusable evidence is visible and never fabricated.
- Google display weather and pending/unlicensed evidence cannot enter a decision snapshot.
- Hardware absence still permits the no-hardware path.
- Voice can read stored Recommendation results but cannot run or accept them.
- Acceptance creates exactly one Season, Calendar and initial task set, or nothing.
- Proposed dates do not activate stage-relative tasks.
- RSK review creates only a purpose-bound work reference.

## 7. Testing Plan

Run focused checks while implementing:

- Agronomy unit tests for gates, fixed-point scores, ranking, confidence and model-explanation fidelity.
- Contract generation/checks for Farmer APIs, voice response shape and capability vocabulary.
- Database migration/schema tests for M5 tables, RLS markers and decision-weather separation.
- Domain API tests for recommendation run/read/review/accept/calendar behavior.
- Offline tests for schema v4 draft/result caching and Locked Recovery compatibility.
- Farmer UI tests for readiness, result cards, evidence, acceptance and Calendar states.

Hackathon Delivery Mode blocking checks remain lint, types, deterministic contracts, fresh migrations/synthetic seed, affected tests, auth/ownership/consent/audit/RLS, small integration/security, production build, Gitleaks and High/Critical dependency findings.

## 8. Open Questions

- Crop profile thresholds and golden rankings are `PROPOSED` until named agronomy/RSK review approves them.
- Marathi critical recommendation copy/audio needs named human review.
- Real external credentials are still required for true LIVE weather/Earth/lab calls. Until then,
  provider adapters return recorded demo evidence or typed `LIVE_UNAVAILABLE` evidence, never fake
  live values.
