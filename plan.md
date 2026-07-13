# Milestone 1 — Contracts, Identity and Transactional Security Spine

## 1. Goal

Implement Document 11 Milestone 1 completely on `build/milestone-1-security-spine`: canonical generated contracts, verified identity and App Check boundaries, deny-by-default authorization and consent, forced RLS, idempotent transactions, Audit/outbox/inbox foundations, safe telemetry and real authenticated stakeholder shells.

## 2. Problem

Milestone 0 is present and its remote code gates are green, but contracts currently cover health only, authorization/application/persistence/event packages are empty, the database contains only the foundation seed table, and the three web products expose foundation screens rather than authenticated application contexts. Remote branch protection and a remote annotated legacy tag are not currently verifiable and remain pre-merge governance blockers.

## 3. Proposed solution

Use `packages/contracts` as the sole Zod-backed authority and generate OpenAPI, JSON Schema, TypeScript, role-filtered clients and Pydantic output. Add production Firebase Identity/App Check adapters plus deterministic injected test fakes, pure authorization and consent rules, least-privilege PostgreSQL roles with transaction-scoped forced RLS, atomic command/Audit/event/outbox receipts, inbox deduplication, safe logging, and authenticated Farmer/RSK/MP shells with truthful unavailable states.

Requirement anchors: PRD security/privacy/testing; IA authentication and stakeholder shells; E2E command/sync/consent propagation; FS-01/05/06/07/08/10/11/12/13 boundaries; TA-AC01/03/04/06/16–19; DM-AC01–04/21/25–34/37–40; API-AC01–11/16/24–28/31–33; SQ-AC01–03/10–12/14/16/18; IMP-AC01/02/05/06/13–15.

## 4. Files to change

- Contract source, deterministic generator, generated artifacts and contract tests under `packages/contracts`.
- Authorization, application, persistence, events, observability, configuration, database migrations/schema and test-kit packages.
- Domain API, MP Query API and the three independent web applications, plus focused architecture/CI/integration/browser tests and safe environment documentation.
- Root dependency, task and lock files only where required for real gates. Do not modify `AGENTS.md` or approved `docs/` specifications.

## 5. Step by step tasks

1. Freeze controlled vocabularies, problem codes, capability/consent registries, M1 routes and M1 event payloads in the canonical contract source; generate and verify all outputs and surface-specific clients.
2. Implement identity/App Check adapters, fail-closed configuration, role-context creation/revocation and cross-environment/MFA checks.
3. Implement pure Farmer ownership, RSK jurisdiction/assignment/capability/purpose and consent/access policies with property and negative tests.
4. Add append-only identity/consent/platform/audit migrations, least-privilege roles, classification/retention metadata, forced RLS and guarded `SET LOCAL` transactions.
5. Implement command hashing, stable receipts, expected revisions, atomic Audit/events/outbox and consumer inbox deduplication.
6. Expose the approved M1 Domain API and MP Query API routes with safe Problem Details and allowlisted telemetry.
7. Replace foundation pages with authenticated, localized, accessible Farmer/RSK/MP shell states without later-milestone controls or fake data.
8. Strengthen architecture isolation, run every applicable local/CI gate, review the complete diff, commit focused verified changes, push the branch and open a draft PR without merge or deployment.

Local implementation status (2026-07-13): steps 1–8 are implemented and locally verified. Focused commits, branch push, draft PR creation and remote CI evidence are the remaining release-coordination actions.

## 6. Acceptance criteria

- Document 11 M1 exit tests pass: authorization/RLS pool isolation, consent races, protected audit-before-disclose, replay/hash/revision conflicts, atomic event transactions and MP service/client/database isolation.
- All protected operations fail closed and no forbidden Farmer/RSK data can reach MP imports, APIs, database privileges, UI, logs or generated clients.
- Generated outputs are deterministic, role clients physically omit forbidden operations, and M1 events/problems/capabilities have one authority.
- New code meets the required coverage, Sonar, security, accessibility and production-build gates; no check is skipped or weakened.
- `main`, production, repository settings and rollback material remain unchanged.

Local acceptance evidence (2026-07-13):

- Frozen Node 24.14.0/pnpm 11.12.0 and Python 3.12 dependency synchronization passed.
- Format, the 32-workspace architecture check, direct deterministic contract drift check, lint and strict TypeScript/Python checks passed.
- All 42 workspace test tasks, 15 integration tests and 32 production builds passed. PostgreSQL static migration tests passed 10/10; the 14 live PostgreSQL tests were skipped locally because the available server is PostgreSQL 14 rather than the CI PostGIS/PostgreSQL 17 service.
- Playwright passed 15/15 functional flows. Axe/reflow/touch-target verification passed 9/9 with zero detected WCAG 2.2 AA violations.
- Aggregate measured coverage is 85.05% lines, 75.38% branches and 80.77% functions. Authorization coverage is 95.77% lines and 94.27% branches.
- The production dependency audit reports zero Critical/High findings and one Moderate transitive `uuid@9.0.1` advisory under Firebase Admin. The local provider-token/private-key pattern scan and `git diff --check` passed.
- Sonar new-code coverage/duplication/rating, CodeQL, gitleaks and the live PostgreSQL 17 matrix require the draft PR workflows and are not claimed locally.

## 7. Testing plan

Run frozen pnpm/uv installation, contract generation/checks, migration and synthetic seed, focused unit/property/authorization/database/integration suites, format, architecture, lint, strict TypeScript/Python types, coverage, production builds, Playwright E2E and axe accessibility. Verify migration-from-zero and upgrade behavior, RLS/non-owner/pool isolation, command replay/rollback/redelivery, log redaction, cross-environment identity rejection and forbidden MP imports/routes/privileges. Record exact first-run results and remote CI/Sonar outcomes. Local gates are complete as recorded above; live PostgreSQL 17 and remote CI/Sonar remain pending until the branch and draft PR exist.

## 8. Open questions

No implementation choice remains. Missing Firebase/cloud credentials use typed `Unavailable` and injected synthetic test adapters. Production MP role authority remains fail closed because Milestone 1 has no approved MP operational identity store or database role. The approved API list defines return-state creation but no one-time redemption endpoint, so the browser flow validates the opaque state identifier without inventing an unapproved redemption route. Before merge, the repository owner must separately decide whether to add a remote annotated legacy tag and protect `main`; this task does not change either setting. The TypeScript 6.0.3 toolchain also produces a non-blocking peer warning because `openapi-typescript@7.13.0` currently declares TypeScript `^5.x`; frozen installation, generation, type checks and builds pass.
