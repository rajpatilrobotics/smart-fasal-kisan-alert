# Smart Fasal Kisan Alert — Codex Execution Guide

## Mission

Build the approved Raigad pilot as three real products:

1. Farmer mobile-first PWA.
2. Rythu Seva Kendram (RSK) desktop operations application.
3. MP Office desktop decision-intelligence application over privacy-released aggregates only.

The organizer core features are:

- Smart Crop Recommendation using approved Farm, soil, water, weather, Earth and optional trusted hardware evidence.
- Real-time Advisory, dry-spell, irrigation and input timing.
- Crop Health photo/voice triage with RSK expert escalation.

Multilingual role-aware voice is the fourth primary feature across all stakeholders. Every other locked feature remains in scope. Explicit exclusions are Web3, credit scoring and insurance adjudication.

## Current state

The local project currently contains approved specifications, not the rebuilt application. The next planned implementation stage is **Document 11, Milestone 0 — Repository and developer runway**. Begin repository/code mutation only when an explicit implementation task authorizes it. Do not jump to a feature milestone until Milestone 0 exits cleanly and the user/task authorizes the next stage.

The submitted legacy repository must be inspected in its actual Git workspace before replacement. Verify current HEAD, preserve an annotated `legacy-static-submission` tag and keep the existing Vercel deployment available as rollback until the rebuilt Farmer smoke test passes. Never assume an old baseline commit.

## Sources of truth

Read the relevant sections before changing code. Authority order is:

1. `docs/01_PRD.md` — outcome, stakeholders, scope, exclusions and non-functional targets.
2. `docs/02_INFORMATION_ARCHITECTURE.md` — routes, navigation and product boundaries.
3. `docs/03_END_TO_END_FLOWS.md` — state ownership and cross-feature propagation.
4. `docs/04_FEATURE_SPECIFICATIONS.md` — user behaviour and acceptance criteria.
5. `docs/05_TECHNICAL_ARCHITECTURE.md` — stack, service boundaries and environments.
6. `docs/06_DATA_MODEL_AND_EVENT_CATALOG.md` — persisted meaning, controlled vocabularies and canonical events.
7. `docs/07_API_AND_INTEGRATION_SPECIFICATION.md` — HTTP, media, voice, device and provider protocols.
8. `docs/08_AI_ML_AND_AGRONOMY_SPECIFICATION.md` — evidence, deterministic authority and model limits.
9. `docs/09_UI_DESIGN_SYSTEM_AND_WIREFRAMES.md` — responsive, accessibility and screen-state contract.
10. `docs/10_SECURITY_PRIVACY_TESTING_AND_QUALITY_SPECIFICATION.md` — security, privacy, tests, Sonar and release gates.
11. `docs/11_IMPLEMENTATION_SEQUENCE_AND_DEMO_JOURNEY.md` — dependency order, task readiness, DoD and demo runbook.

This file summarizes and routes. It never overrides the documents above. If approved documents conflict, stop the affected behaviour and reconcile the specification before coding a guess.

## Non-negotiable product boundaries

- Farmer, RSK and MP are separate builds/origins. An app never imports another app.
- MP has no Farmer, Farm, Plot, Case, device, media, Diary, exact-coordinate or operational RSK route/API/database privilege.
- RSK has no unrestricted Farmer Directory. Protected reads require exact capability, jurisdiction/assignment, purpose and current consent/access.
- Hardware is optional. No-hardware Farmer paths remain functional.
- A visible control must work through its owning contract, be honestly disabled with a reason, or be absent. No dead placeholder or hard-coded success.
- `LIVE`, `RECORDED` and `SIMULATED` are separate, server-derived modes. Never relabel a fixture or failed provider as Live.
- Local/Preview delivery is sink-only. Demo may use a sink or provider-sandbox delivery to explicitly account-allowlisted test recipients and can never contact the public. Production alone may use policy-approved real channels.
- No real Farmer data, phone, exact private location, media, audio/transcript, credentials or private market values in source, fixtures, screenshots, logs or demos.

## Locked technology baseline

Use current stable versions at implementation time and pin them.

- pnpm workspaces + Turborepo.
- Next.js App Router, React and strict TypeScript for three web apps.
- Tailwind CSS variables + React Aria Components.
- React Hook Form + Zod; TanStack Query/Table; next-intl.
- Dexie/IndexedDB and Workbox `injectManifest` for Farmer offline.
- Node active LTS + Fastify for TypeScript services.
- PostgreSQL 17 + PostGIS + Drizzle and reviewed migrations.
- Python stable + FastAPI/Pydantic for Earth/scientific/shadow ML only.
- Google Cloud Storage, Pub/Sub, Cloud Tasks/Scheduler/Run Jobs, Identity Platform, FCM, Vertex AI/Gemini, STT/TTS/Translation, Earth Engine and BigQuery behind typed adapters.
- Terraform, OpenTelemetry and the test/security tools in Documents 05 and 10.

Do not add Firestore as the domain database, Redis, GraphQL, Kubernetes, a public MQTT broker or another major framework without an approved architecture decision proving the existing stack cannot meet the need.

## Target package boundaries

Use the topology in Document 11. Important rules:

- `packages/contracts` is the reconciled Document 07/11 single source for HTTP/command/event/sync/device/voice/privacy contracts and generated OpenAPI/JSON Schema/TypeScript/Pydantic outputs; do not reintroduce the earlier architectural `api-contracts` directory as a second authority.
- `domain` is pure and imports no React, Fastify, SQL, Cloud or Gemini SDK.
- `application` orchestrates authorization, commands, queries and transactions.
- `persistence` owns Drizzle/PostgreSQL adapters.
- `ui` owns presentation only—no network, authorization or agronomy decisions.
- TypeScript/Python communicate only through generated contracts, not shared database assumptions.
- Role-tagged generated clients physically exclude forbidden operations.
- Generated files are never hand-edited.

## Implementation protocol

For every task:

1. Inspect repository instructions, Git status/diff and existing files. Preserve unrelated/user changes.
2. Identify the single Document 11 milestone/task and relevant PRD/FS/E2E/API/data/AI/UI/security acceptance IDs.
3. Write a short plan. Do not broaden scope or refactor unrelated modules.
4. Lock controlled vocabulary, contract and event changes before consumers.
5. Add forward migration/constraints/RLS/classification/retention where applicable.
6. Implement pure domain rules and state transitions with boundary/property tests.
7. Implement application/API/worker transaction with authorization, consent, revision, idempotency, Audit and outbox.
8. Implement typed fake/Recorded adapter before sandbox/Live provider adapter.
9. Implement only owning UI routes with every required loading/current/stale/empty/offline/denied/conflict/unavailable state.
10. Add Marathi/Hindi/English keys and accessibility behaviour with the slice.
11. Run affected static, unit, contract, database, integration, authorization, E2E, accessibility, security and performance checks.
12. Report changed files, public contracts/migrations/events, assumptions and exact commands/results.

Use small verified patches/commits. Never mark a task, feature, milestone or evidence item `PASS`/complete until its applicable Definition-of-Done commands pass. Failed or untested work remains accurately Partial/Blocked with the missing evidence named.

A route or card does not complete a feature. Use the full vertical-slice Definition of Done in Document 11.

## Parallel-agent protocol

- One coordinator owns root config, shared contracts, events, migrations, generated artifacts and integration.
- Use bounded agents only for concrete non-overlapping files after upstream contracts freeze.
- One owner edits a shared source at a time. Migrations are append-only and ordered.
- Every agent returns changed files, contract/migration/event impact and tests run.
- Coordinator reviews the diff and runs combined gates before dependent work begins.
- If two tasks need the same capability/state/event, reconcile the source contract first.

## Domain and AI authority

- Launch Crop Recommendation, Advisory, Sensor Trust, Alert Policy, Crop Health escalation and MP privacy release are deterministic, versioned policies.
- Gemini may extract bounded observations, clarify speech, translate, summarize or explain a stored validated result. It cannot authorize, mutate directly, add/rank a crop, invent a measurement, choose a chemical/dose or reveal suppressed/protected data.
- Python computes Earth/scientific features and shadow predictions. It cannot commit operational decisions.
- Recommendation applies hard gates before scoring; suitability and confidence remain separate.
- One abnormal sensor cannot create severe agronomic action. Missing moisture never counts as agreement.
- Low-cost NPK remains Experimental/Trend Only until local validation and never independently yields exact fertilizer quantity.
- Crop Health says possible/unclear/unsupported, never confirmed diagnosis, and cannot originate chemical treatment.
- A model failure uses reviewed deterministic content or typed Unavailable; it never blocks mandatory expert escalation.
- Every model/prompt/tool/glossary version has evaluation evidence, kill switch and governed promotion.

## Security and privacy invariants

- Server reauthorizes every protected read, mutation, stream, media fetch, sync retry and voice tool call.
- Verify ID-token signature/issuer/audience/expiry/environment/revocation and require App Check on protected browser routes; App Check is not authorization.
- Use deny-by-default ownership/capability/jurisdiction/purpose/consent policy and FORCE RLS with transaction-scoped context/non-owner roles.
- Consent scopes are independent. Withdrawal advances access version and blocks new access/work before asynchronous cleanup.
- Protected RSK content is absent from the response/DOM until audit-before-disclose succeeds.
- Media remains quarantined until verification; verification is not evidence until a typed authorized attachment.
- Voice uses one-time tickets, closed tools, receiving-API reauthorization and persisted exact-hash confirmation. Cancel/expiry creates no mutation.
- Device transport acceptance is not agronomic trust. Server derives assignment/mode; HMAC/challenge/replay/dedup are mandatory.
- Callback intake stores immutable verified input only; a separate consumer applies the bound attempt transition.
- MP reads only signed complete Release Snapshots; suppression physically omits values across UI, voice, model, logs and export.
- Secrets use managed secret/key systems and never enter repository, client bundle, test fixtures or ordinary logs.
- The pilot has no unstructured break-glass access.

Read Document 10 for the complete threat and test matrix before touching auth, offline, media, voice, device, provider, MP, deletion, storage or CI code.

## Offline and immutable-state rules

- `Saved on this phone` requires one atomic local event + projection + outbox commit.
- `Synced` requires server acceptance and atomic client apply/cursor advancement.
- Generic last-write-wins is forbidden for consent, stage, Diary facts, quantities/units, advice and task outcomes.
- Planned Tasks and actual Diary facts remain separate.
- Corrections append new facts/versions; accepted history is not overwritten.
- Command retries use stable identity/hash/revision and create at most one logical effect.
- Maintain at least 90-day Farmer/RSK offline command/event/pack compatibility. Unsupported queues/packs enter Locked Recovery and are never deleted.
- Shared/Assisted exit blocks or safely locks unsynced private work; it never exposes data to the next user.

## UI and accessibility rules

- Farmer bottom navigation is exactly Today, Work, Speak, Alerts and My Farm; Speak is the labelled central item.
- Farmer is mobile-first; RSK and MP are desktop-first with the compact subsets defined in Document 09.
- Use shared tokens/primitives. Do not fork Button, status, evidence, sync or voice confirmation patterns.
- Never combine suitability, confidence, severity, priority, trust, freshness or data mode.
- Cannot Do is as reachable as Done. Unknown is not failure language.
- Maps/charts have an equivalent same-data list/table.
- Target WCAG 2.2 AA, keyboard, visible focus, screen reader, reduced motion, forced colors, 200% zoom and 400% critical reflow.
- Primary targets are at least 44 CSS pixels; Farmer prefers 48.
- Marathi critical copy/audio needs named human review.

## Tests and quality gates

The exact gates are in Document 10. At minimum:

- zero format, lint and strict type errors;
- deterministic generated-contract diff;
- SonarCloud New Code coverage at least 80%;
- committed-runner branch coverage at least 90% for agronomy, authorization, Alert Policy, sync-conflict and privacy packages;
- every registered safety branch has direct positive/negative tests;
- new-code duplication at most 3%; cognitive complexity at most 15 or reviewed expiring exception;
- Security, Reliability and Maintainability rating A, no new vulnerability and all new Security Hotspots reviewed;
- zero unresolved validated Critical/High security finding;
- no known flaky critical gate test; rolling nondeterministic rerun rate below 1%;
- J1–J7 deterministic integration tests and release-environment smoke;
- zero serious/critical axe findings plus required manual accessibility evidence;
- Farmer performance, API, voice, sync and availability budgets from Documents 01/10.

Sonar runs in parallel on PR/main and outside the local inner loop. It may be bypassed only for a clearly marked non-production demo artifact under the exact Document 10 conditions; protected merge/production remain blocked.

## Expected commands after Milestone 0

Milestone 0 creates and documents these root commands:

```text
pnpm dev
pnpm build
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:a11y
pnpm contracts:generate
pnpm contracts:check
pnpm db:migrate
pnpm db:seed:synthetic
pnpm quality
```

Until those files exist, work only on Milestone 0 and do not pretend the commands passed. After bootstrap, a clean checkout must reproduce install, database, seed, tests and builds from README.

Milestone 0 scaffolds real health/readiness entries and production builds for Farmer Web, RSK Web, MP Web, Domain API, Domain Worker, Device Ingest, Provider Callback Ingest, MP Query API, Privacy Pipeline, Media Scanner, Intelligence Service and Voice Gateway—not only the visible web apps.

## Environment and external-action safety

- Development, staging, demo and production each use separate cloud projects/accounts, Identity, credentials, databases, buckets, queues, keys, provider senders and analytics datasets.
- Production data is never copied downward.
- Local/Preview use synthetic data and sink providers.
- Demo uses an immutable scenario manifest and sink or explicit sandbox allowlist.
- Missing provider configuration returns typed Unavailable. It never silently loads a fixture as Live.
- External deployment, real messaging, real provider resource mutation or production migration occurs only when the current authorized task explicitly includes it and the relevant gates pass.
- Do not commit `.env` secrets or service-account key files. `.env.example` contains names and safe descriptions only.

## Demo truth

Follow Document 11 exactly:

- Hardware receives about 30 seconds.
- If no genuine current signed packet arrives, load the separately manifested Recorded scenario and show the original time/mode.
- Do not claim real-time hardware, secure boot, flash encryption or signed OTA unless physically verified.
- Core Farmer voice must call the real Recommendation tool for `माझ्या शेतात कोणते पीक घ्यावे आणि का?` and show transcript, source, freshness, mode and Open Details. Advisory remains the separate Core 2 proof.
- RSK demonstrates purpose-limited expert service and a Visual Review stop.
- MP demonstrates a signed released aggregate and suppression parity across map/table/voice.
- Technology cards are tagged Working Live, Working with Recorded fixture, Simulated/test adapter or Planned, each with evidence.
- Async cuts retain scenario/correlation/object identity and display `Processing wait shortened`.
- No credit, insurance, Web3, guaranteed yield/price, confirmed AI diagnosis, sell advice or unsupported official integration claim.

## Stop conditions

Stop and ask only when:

- the user must authorize a materially different scope, production/external side effect or irreversible operation;
- approved documents conflict on the exact behaviour;
- a required secret/account/provider permission is unavailable and no approved simulator/Unavailable path can complete the milestone; or
- existing user changes overlap in a way that cannot be safely preserved.

Do not stop merely because the milestone is large, a provider is optional or a model is unavailable. Continue through approved deterministic/simulator/fallback paths, verify the slice and report honestly.
