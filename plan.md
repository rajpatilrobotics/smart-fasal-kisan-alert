# Milestone 2 — Offline, Media and Voice Foundations

## 1. Goal

Implement Document 11 Milestone 2 on `build/milestone-2-offline-media-voice`: M2A Farmer Offline, M2B Media Foundation and M2C Voice Transport. Keep the work limited to reusable foundations and the honest bounded Speak shell; do not begin Milestone 3 Farmer/Farm setup.

## 2. Problem

Milestone 1 and migration `0003` are merged, but the offline and voice packages are empty, the media scanner and voice gateway expose health only, the database has no M2 media/voice/sync persistence, and the Farmer shell has no real offline transaction or contextual Speak transport. Without these foundations, later Farmer features could lose queued work, bypass quarantine or execute voice mutations without durable exact-hash confirmation.

## 3. Proposed solution

Freeze versioned M2 sync, media and voice contracts before consumers. Add one forward migration for minimum server-side sync/media/voice state with least-privilege roles, constraints, retention metadata and FORCE RLS. Implement partitioned encrypted Dexie storage and staged recovery, a Workbox `injectManifest` static-only policy, deterministic media quarantine verification/typed attachment rules, and one-time voice ticket/session/proposal transport with closed tools and shared HTTPS/WebSocket confirmation semantics. Expose a localized Farmer Speak overlay that supports typed input/help and truthfully reports unavailable voice actions before owning tools exist.

Requirement anchors: Document 11 M2A/M2B/M2C; API Sections 15, 17, 18 and 27; Data Model Sections 25–28; Security Sections 10–12, 22–26 and SQ-AC04–06/10/14; UI Sections 9–12 and UI-AC01/02/04/05/08/14/18.

## 4. Files to change

- Canonical contract/event sources, deterministic generated OpenAPI/JSON Schema/TypeScript/Pydantic/role clients and compatibility manifest under `packages/contracts`.
- New forward migration `packages/database/migrations/0004_milestone_2_offline_media_voice.sql`, database schema declarations and focused migration/RLS tests.
- `packages/offline`, `packages/voice`, and the minimum application/persistence adapters needed by their owning services.
- Domain API media/sync boundaries, Media Scanner and Voice Gateway transport/worker code with focused tests.
- Farmer Web service worker registration/static caching policy, contextual Speak overlay, localized Marathi/Hindi/English copy and component tests.
- Root/workspace manifests and lockfile only for pinned M2 dependencies and commands. Do not modify approved `docs/`, coverage/Sonar/Hackathon Delivery Mode configuration, contracts unrelated to M2 or any Milestone 3 feature.

## 5. Step by step tasks

1. Freeze M2 controlled vocabulary, request/response schemas, route metadata, closed pre-feature voice tool registry and executable Technical Events; regenerate deterministic artifacts.
2. Add migration `0004` for sync stream/bootstrap/conflict/acknowledgement compatibility records, media intent/asset/attachment lifecycle, voice session/ticket/proposal/receipt state, constraints, least-privilege grants and FORCE RLS.
3. Build M2A partitioned AES-GCM Dexie stores, atomic local event/projection/outbox save, atomic sync apply with cursor-last semantics, staged schema migrations, Locked Recovery, shared-user lock and 90-day compatibility handling.
4. Add Workbox `injectManifest` generation with static/immutable assets only; explicitly exclude auth, protected HTML/RSC, APIs and personal responses.
5. Build M2B intent/quarantine/finalize/verification/derivative/typed-attachment/protected-stream policy with checksum, magic MIME, decoder/polyglot, EXIF, generation, consent/access and retention checks.
6. Build M2C one-time hash-stored tickets, bounded session sequence/reconnect state, typed/HTTPS turns, offline-audio proposal state, closed tools, persisted exact-hash proposals and idempotent confirm/correct/cancel handlers where cancel/expiry cannot mutate domain state.
7. Add the Farmer contextual Speak overlay with help, typed alternative, microphone/provider unavailable states, labelled controls, focus restoration and no owning feature commands.
8. Run Hackathon Delivery Mode targeted contracts, migration/seed, architecture, lint, strict types, affected tests, M2 security/integration tests and production builds; review the diff, commit, push and open a draft PR without deployment or merge.

## 6. Acceptance criteria

- One atomic local transaction is required before showing `Saved on this phone`; one atomic response transaction advances the cursor last before showing `Synced`.
- Restart/replay preserves one logical effect; user/partition switches cannot expose pending private data; unsupported schemas enter Locked Recovery without deletion; compatibility records retain the 90-day horizon.
- Quarantine bytes cannot render, attach, stream or reach AI before exact generation/checksum/type/decoder verification; attachments are owner- and purpose-typed and every protected read reauthorizes current access.
- Voice tickets are single-use, short-lived, bound and hash-stored; frames are bounded/sequenced; reconnect never replays audio or a mutation; Cancel/expiry/unconfirmed proposals create no domain mutation; Confirm uses the exact stored hash once.
- Speak is a real accessible contextual shell with typed/help paths and an honest unavailable state, not FS-06 completion or a dead placeholder.
- Document 11 M2 exit tests pass for offline restart/replay/user switch, quarantine bypass, ticket replay/reconnect/unconfirmed mutation and provider outage.
- Hackathon Delivery Mode mandatory targeted checks pass. Coverage percentages and Sonar metrics remain informational and unchanged. Milestone 3, deployment and merge remain out of scope.

## 7. Testing plan

Run deterministic contract generation/check; database migration from zero and synthetic seed under PostgreSQL/PostGIS 17 when available; focused offline atomicity/restart/replay/partition/recovery tests; media lifecycle, bypass, checksum/MIME/polyglot/EXIF/consent/stream tests; voice ticket/replay/sequence/reconnect/proposal/cancel/expiry/provider-outage tests; Farmer Speak component/locale tests; architecture, lint, strict TypeScript/Python types, affected tests, the mandatory security/integration suites and production builds. Use only the smallest relevant local commands during implementation and rely on the draft PR workflow for the pinned PostGIS 17 run.

## 8. Open questions

No product decision is required. Local and CI use deterministic in-memory/storage/provider fakes; missing Cloud Storage, STT/TTS or realtime-provider configuration returns typed Unavailable and never simulated Live data. M2 persists only transport/foundation state and reserved owner links needed by later milestones; it does not invent Farmer setup, Diary, Crop Health, Recommendation or agronomy behavior.
