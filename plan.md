# Milestone 7 — Crop Health Logging and Multimodal AI Triage

## 1. Goal

Deliver the approved Milestone 7 vertical slice for Farmer crop-health reporting:

- Farmer can capture crop-health symptoms with photos, voice and typed answers.
- The system performs safe multimodal triage with strict quality gates.
- The result is shown as possible or unclear, never as a confirmed diagnosis.
- Mandatory escalation can create a consented RSK-compatible Case foundation.
- The demo ends at `PENDING_EXPERT`; full RSK expert dashboard/workflow remains a later milestone.

Baseline is `origin/main` commit `924ce6272a61898e288525f7bbfd712816f68e5e`, the merged Milestone 6 mainline. This branch is `build/milestone-7-crop-health-triage`.

## 2. Problem

Milestones 2-6 already provide identity, farms, plots, media, evidence concepts, recommendations, advisory and alerts. Milestone 7 needs to connect those foundations into a crop-health intake flow without overclaiming AI certainty or exposing protected Farmer data.

Main risks:

- Image quality, speech ambiguity or missing context could make model output unsafe.
- A model could imply a confirmed diagnosis, chemical treatment or unsupported certainty.
- Offline retries could create duplicate reports, cases or sharing decisions.
- Case sharing could leak media/contact details without current consent and audit-before-disclose.
- RSK-compatible Case data could be confused with a full RSK expert workflow, which is not part of this milestone.

## 3. Proposed Solution

Implement a narrow, safe vertical slice with separate lifecycle concepts:

- Health Report: `DRAFT`, `SUBMITTED`, `TRIAGE_PENDING`, `TRIAGED`, `MODEL_UNAVAILABLE`.
- Quality: `USABLE`, `LIMITED`, `UNUSABLE`.
- Triage: `SUPPORTED`, `UNSUPPORTED`, `UNCLEAR`.
- Severity: `LOW`, `MODERATE`, `HIGH`, `CRITICAL`.
- Confidence: `LOW`, `MEDIUM`, `HIGH`.
- Case: `PENDING_EXPERT`, `ASSIGNED`, `AWAITING_FARMER`, `REPLIED`, `FOLLOW_UP_DUE`, `RESOLVED`, `CLOSED`, `REOPENED`; Milestone 7 only creates `PENDING_EXPERT`.

The Farmer app owns draft capture, attachment review, submission, triage review, sharing consent and read-only case status. RSK and MP web apps are not extended in this milestone.

Use two-layer image quality:

- Media scanner verifies technical safety, type, size, malware status and basic image metrics.
- Domain worker combines technical quality with semantic health-report suitability before calling any visual model.
- `UNUSABLE` input never reaches the model.
- `LIMITED` input cannot produce `HIGH` confidence.

Use `packages/agronomy` for deterministic policy authority:

- confidence caps;
- severity and spread escalation;
- safe category allowlist;
- data mode derivation;
- model-unavailable handling;
- mandatory expert escalation boundaries.

Add a `HealthVisionExtractor` application port:

- fixture/recorded adapter first for deterministic tests and demo;
- Vertex/Gemini adapter behind explicit configuration and kill switch;
- no silent fixture fallback as `LIVE`;
- missing credentials or provider failure becomes typed `MODEL_UNAVAILABLE`.

The provider schema is closed and bounded:

- max three possible categories;
- evidence references only to submitted symptoms/images/context;
- no confirmed diagnosis;
- no chemical product, dose or spray instruction;
- no unknown fields;
- malformed or unsafe responses are rejected as a whole.

Voice is draft-only for creation:

- Marathi voice can ask missing questions and read back the captured draft.
- Explicit voice confirmation can create or update a draft only.
- Photo review, final submission and Case-sharing consent stay visual.
- Voice may read stored triage and `PENDING_EXPERT` status after submission.

## 4. Files to Change

- `plan.md`
- `packages/contracts`
- `packages/agronomy`
- `packages/application`
- `packages/database`
- `packages/offline`
- `packages/voice`
- `packages/i18n`
- `apps/domain-api`
- `apps/domain-worker`
- `apps/media-scanner`
- `apps/voice-gateway`
- `apps/farmer-web`
- `evaluation/` and synthetic scenario fixtures
- tests covering contracts, policies, persistence, authorization, offline, provider adapters, UI and voice

Do not change `apps/rsk-web`, `apps/mp-web` or `apps/intelligence-service` for this milestone except if a generated shared contract requires a consumer-safe compile adjustment.

No production deployment, commit, push or PR is part of this implementation request.

## 5. Step by Step Tasks

1. Done — locked contracts, controlled vocabulary and event names for Health Report, triage, Case and sharing decisions.
2. Done — added forward migration `0010_milestone_7_crop_health_triage.sql` with Health Report, answers, media links, quality, triage, categories, Case foundation, evidence pack, RSK work item linkage, RLS and consent-version fields.
3. Done — extended existing `workflow.rsk_work_item` support without replacing the Milestone 5 recommendation-review purpose.
4. Done — implemented pure agronomy health-triage policies and tests.
5. Partial — added in-memory application commands/queries for draft, attach, submit, triage read, share-decline/share-allow and case read. Durable PostgreSQL repository wiring remains future work.
6. Partial — application behavior is idempotent in memory; durable transaction/outbox wiring remains future work.
7. Partial — canonical health/triage/case/work events are promoted in contracts; durable outbox emission remains future work.
8. Partial — media scanner health-image quality output is added; domain-worker orchestration remains future work.
9. Partial — deterministic recorded fixture adapter is added; live Vertex/Gemini adapter remains disabled/future work.
10. Done — upgraded Farmer offline schema from IndexedDB v5 to v6 with encrypted health drafts, report cache and case cache stores.
11. Done — added Farmer routes:
    - `/farmer/farms/:farmId/plots/:plotId/health`
    - `/farmer/farms/:farmId/plots/:plotId/health/new`
    - `/farmer/health/:reportId`
    - `/farmer/cases`
    - `/farmer/cases/:caseId`
12. Partial — added Farmer UI states for loading, unavailable, consent review and pending expert. Full Marathi-first copy review plus offline saved/sync/conflict UI remains future work.
13. Partial — added read-only voice result/case support. Voice draft creation/readback remains future work.
14. Partial — added deterministic recorded triage fixture. Full immutable Raigad scenario manifest remains future work.
15. In progress — focused checks are being run with direct package binaries because the local `pnpm` runner currently fails before script execution.

## 6. Acceptance Criteria

- Farmer can submit 1-6 crop-health photos with voice or typed symptoms and guided questions.
- Voice can create/update a draft after readback confirmation, but cannot submit the report or grant Case sharing.
- Corrupt, malicious, non-image, oversized or `UNUSABLE` media is rejected with a retake path.
- `UNUSABLE` input never produces model triage.
- `LIMITED` input cannot produce `HIGH` confidence.
- Provider timeout, malformed output, prompt injection or missing credentials returns a safe unavailable/unclear result.
- Triage uses possible/unclear/unsupported language only and never confirms diagnosis.
- Chemical products, doses and spray instructions are blocked.
- Mandatory escalation requires visual Farmer sharing review.
- Decline shares nothing with RSK.
- Allow creates current consent, Case, evidence pack, RSK work item, audit and events atomically.
- Consent withdrawal blocks future protected reads/work and advances the access version.
- RSK-compatible Case foundation ends in `PENDING_EXPERT`; full RSK reply/dashboard is out of scope.
- Owner, plot, RLS, purpose, consent and audit-before-disclose checks protect every protected read.
- Offline retries are idempotent and do not duplicate reports, cases or sharing decisions.
- Demo data is labelled truthfully as `SIMULATED`, `RECORDED` or `LIVE`.

## 7. Testing Plan

Focused tests:

- contract strictness and generated client role exclusions;
- health quality, severity, confidence, safe allowlist and data-mode policies;
- media scanner malicious/corrupt/quality cases;
- database migration, RLS, consent, retention and rollback safety;
- application transactions and outbox redelivery;
- offline v5-to-v6 migration, queue replay and Locked Recovery;
- provider fixture/live adapter timeout, malformed JSON and prompt-injection tests;
- Farmer UI route, accessibility and multilingual state tests;
- voice draft-only mutation and read-only result/case behavior;
- no MP operations/grants and no RSK unrestricted Farmer directory access.

Verification commands:

```text
pnpm test:affected
pnpm contracts:generate && pnpm contracts:check
pnpm db:migrate && pnpm db:seed:synthetic
pnpm test:security
pnpm test:integration
pnpm test:e2e && pnpm test:a11y
pnpm quality
```

Hackathon Delivery Mode blocking checks remain dependency installation, architecture isolation, lint, strict types, deterministic contracts, fresh migrations and seed, affected tests, authorization/ownership/consent/audit/RLS, small integration/security, production builds, Gitleaks and High/Critical changed dependency findings.

Coverage and Sonar are informational for Milestones 2-16 under the approved Hackathon Delivery Mode exception.

## 8. Open Questions

- No blocking product question remains from planning.
- The user selected draft-only voice creation with visual review for photo submission and Case-sharing consent.
- Milestone 7 intentionally implements a subset of the crop-health loop earlier than Document 11 originally sequenced; this plan follows the user's explicit Milestone 7 request without rewriting approved docs.
- Full RSK expert dashboard, expert reply, care plan and follow-up workflow are later milestones.
- Demo health category registry, Marathi critical copy and local agronomy thresholds remain `PROPOSED` until named review.
- Live Vertex/Gemini use remains disabled unless credentials, region, data-flow review, model registry and evaluation evidence are explicitly configured.
- Local `pnpm` currently fails before scripts with `Cannot use 'in' operator to search for 'integrity' in undefined`; focused verification uses direct local binaries until dependency metadata is repaired.
