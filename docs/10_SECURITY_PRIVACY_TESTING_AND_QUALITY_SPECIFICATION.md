# Smart Fasal Kisan Alert

## Security, Privacy, Testing and Quality Specification

| Field | Value |
| --- | --- |
| Status | Approved for implementation |
| Version | 0.1.0 |
| Last updated | 13 July 2026 |
| Parent documents | `docs/01_PRD.md` through `docs/09_UI_DESIGN_SYSTEM_AND_WIREFRAMES.md` |
| Pilot | Raigad district, Maharashtra |
| Applies to | Source, infrastructure, data, AI, hardware, integrations, CI/CD, tests and operations |

## 1. Purpose

This document defines the release gates that keep Smart Fasal clean, secure, private, accessible, testable, efficient and maintainable. It turns the prior product and architecture contracts into implementation controls and verification evidence.

Security and quality are not postponed until after the demo. The working release must protect stakeholder boundaries, consent, offline/shared devices, media, voice, hardware ingestion and MP aggregate privacy while remaining practical to build. Fast local checks protect the development loop; heavier SonarCloud, security, browser and performance checks run in pull-request or release CI rather than after every edit.

This is a defensive engineering specification. It does not claim that a scan or coverage percentage alone makes the product secure.

## 2. Normative authority and risk language

The words **must**, **must not**, **required**, **never** and **only** are release requirements. **Should** is a strong recommendation that needs a recorded exception. **May** is optional. **Later** cannot be presented as working now.

When requirements conflict, the safer authorization, privacy, agronomy, immutable-history or truthful-state behaviour wins until documents are reconciled. Demo shortcuts cannot override a zero-tolerance condition.

Severity used in engineering triage:

| Level | Meaning |
| --- | --- |
| Critical | Broad production compromise, system-wide secret/access failure, MP-to-Farmer data exposure, or arbitrary high-impact authority |
| High | Cross-user/jurisdiction disclosure, safety/chemical/gate bypass, forged authoritative evidence or aggregate privacy breach |
| Medium | Narrow authorized-context privacy/integrity issue, meaningful abuse/availability risk or misleading state without broad compromise |
| Low | Hardening or metadata issue with no material authorization, privacy, safety or integrity consequence |

## 3. Quality objectives

1. Server authorization decides every protected read and mutation.
2. A client, provider, device or model cannot promote its own trust, role, mode or decision authority.
3. Sensitive data is minimized, purpose-bound, encrypted and removed according to the earliest applicable policy.
4. Deterministic decisions are reproducible while evidence may lawfully be retained and preserve permitted lineage afterward.
5. State-changing operations are idempotent, revision-safe and auditable.
6. Critical Farmer workflows remain usable without voice, hardware, current AI or a specific provider.
7. The three stakeholder products cannot accidentally share protected navigation or query paths.
8. Code has clear ownership and dependency direction; domain rules remain pure and independently testable.
9. Tests prove invariants and user outcomes, not only lines executed.
10. Accessibility, performance and resilience are release qualities, not visual polish tasks.
11. Live, Recorded and Simulated evidence never become visually or operationally interchangeable.
12. CI produces a small, reviewable release-evidence bundle and blocks known unsafe changes.

## 4. Assets, actors and threat boundaries

### 4.1 Protected assets

- authentication factors, session and role-context tokens;
- Farmer identity/contact, exact/coarse location, Farm/Plot/Season, soil/water, Diary, yield and private market facts;
- Crop Health images/audio/transcripts, Cases, expert Care Plans and Visit packs;
- consent decisions, protected-access grants and Assisted Session authority;
- sensor/device credentials, assignment, calibration and raw observations;
- RSK agronomy, severe Case, Template, Alert, sensor-invalidation and Market approval capabilities;
- MP Release Snapshots, suppression policy and Briefing artifacts;
- evidence/decision snapshots, immutable events, Audit facts and command receipts;
- provider authentication material, service identities and cryptographic assets used for encryption, signing or message authentication; and
- crop/rule/template/source/model/prompt/tool registries and kill switches.

### 4.2 Trust boundaries

| Boundary | Untrusted side | Trusted decision side |
| --- | --- | --- |
| Browser to API | route, request, token claim, local state and file | authenticated server policy and domain handler |
| Farmer to RSK | general account or Case existence | current purpose-specific consent and disclosure grant |
| Operations to MP | raw Farmer/RSK facts | approved release pipeline and verified aggregate snapshot |
| Offline to server | local event/media/outbox | server validation, expected revision and acceptance receipt |
| Upload to evidence | arbitrary bytes/metadata | verified typed owner attachment |
| Device to agronomy | signed transport packet | calibration/trust/freshness policy |
| Provider callback | network body/header | signature/replay/attempt validation |
| AI output to product | transcript, extraction, tool call or prose | schema/policy validator and authorized API |
| External source to decision | weather/market/Earth record | source rights, edition, quality and evidence policy |
| Code to production | developer/CI input | protected review, signed artifact and deployment identity |

Every external value, including a model answer or signed packet, remains untrusted for the decision it proposes until the owning boundary validates it.

### 4.3 Adversary and misuse model

| Actor | Realistic misuse | Primary control/test families |
| --- | --- | --- |
| Anonymous/OTP abuser | enumeration, credential stuffing, upload/parser/cost/availability abuse | generic responses, rate/velocity limits, media isolation, DAST/load tests |
| Malicious/compromised Farmer | cross-Farmer IDOR, revision/idempotency tamper, poisoned evidence/media | owner authz/RLS, strict schemas, immutable facts, negative/fuzz tests |
| Lost/shared phone or later user | read cached identity/media/outbox or reuse token | encrypted partition, active identity, auto-lock, purge/Locked Recovery tests |
| Compromised/malicious RSK account | cross-jurisdiction browse, purpose laundering, protected harvesting, self-approval | capability/purpose/assignment/consent, audit-before-disclose, separation tests |
| Compromised MP account | differencing, rephrased voice queries, Briefing/export leakage | release isolation, suppression/query-shape controls and inference tests |
| Insider/service-account compromise | direct DB/storage/analytics access, log/backup misuse | least privilege/RLS/IAM, Audit, perimeter and restore drills |
| Spoofed gateway/provider | forged/replayed telemetry/callback, false mode/delivery | HMAC/signature/replay/dedup/consumer-boundary tests |
| Prompt/evidence attacker | hidden audio/image/document/tool-result instructions and exfiltration | delimiter/schema/tool/egress/output controls and adversarial corpus |
| CI/dependency attacker | secret theft, malicious build/action/package/artifact substitution | pinned/frozen dependencies, WIF, scans, SBOM/provenance/signing |

Every high-risk boundary in this table has a preventive control, detection, automated/manual verification, owner and residual-risk decision in the traceability register.

## 5. Data classification and handling

The data model's classification is enforced consistently in database, API, cache, logs, analytics, exports, model calls and UI.

| Class | Examples | Minimum handling |
| --- | --- | --- |
| C0 Public | approved methodology, public market fact | integrity/source/version; public cache only when licensed |
| C1 Internal | non-sensitive configuration, provider health aggregate | authenticated staff or service where needed; no public logs by default |
| C2 Personal | Farmer profile, owned Farm IDs, preferences and ordinary Diary facts | Farmer and purpose-authorized RSK; encryption and redacted logs |
| C3 Sensitive | phone, exact geometry, Case evidence, private costs, media and transcript/audio | minimum operational services; field/purpose access, no shared cache and audited disclosure |
| C4 Restricted security | OTP/session material, device secrets, KMS references and signed tickets | dedicated security/service boundary only; never Domain/Integration Events, analytics, fixtures or ordinary logs |
| P1 Pseudonymous analytics | purpose-specific analytics subject ID with coarse dimensions | Privacy Pipeline and sanitized analytics only; never MP operational identity |

Document 06's generated field metadata is authoritative; the examples above are non-exhaustive. Classification is inherited by derived content unless a governed release/de-identification process changes it. A generated summary is not automatically less sensitive than its inputs. Every API/event/table/object field carries classification metadata in generated schema or migration comments; CI rejects a new unclassified contract field. C3 content is absent from broad Integration Events, analytics and normal logs. C4 is absent from all product events, telemetry and fixtures.

## 6. Identity, authentication and session security

### 6.1 Identity

- Use the configured managed identity provider for credentials and OTP. Application databases do not store plaintext passwords or OTP secrets.
- Verify every ID token's signature, issuer, audience, expiry, environment and current revocation/security version before creating application context.
- Staff and MP access require MFA. Sensitive RSK audit/investigation and account recovery require step-up authentication.
- Authentication establishes identity only. Role, office, jurisdiction, ownership and capabilities come from current server records.
- A disabled/revoked identity, role-context change or access-version change invalidates new operations immediately.
- Demo identities are isolated, visibly labelled and cannot carry production roles or data.

### 6.2 Tokens and browser transport

- Short-lived bearer tokens are sent only in the Authorization header over TLS; never in URLs, referrers or analytics.
- One-time WebSocket/return/retrieval tickets are narrow, short-lived, origin-bound and atomically consumed.
- Exact-origin CORS allowlists are environment-specific; no credentialed wildcard origin.
- App Check is a bot/abuse signal, not a substitute for authentication or authorization.
- Valid App Check is mandatory on every protected Farmer, RSK and MP browser route. The only pre-auth application routes are the exact Document 07 allowlist; return-state creation still requires App Check, and provider-controlled identity endpoints are not application recovery exceptions. App Check remains non-authoritative for identity or access.
- Bearer/refresh tokens and role/voice/retrieval tickets are prohibited from `localStorage` and application IndexedDB payloads.
- If cookies are introduced later, use `Secure`, `HttpOnly`, appropriate `SameSite`, explicit CSRF protection and a separate reviewed decision.
- Logout revokes/clears session state and local protected partitions according to device mode; it does not silently discard unsynced data.

### 6.3 Account recovery and abuse

- OTP, return-state, verification and recovery endpoints have strict identity/device/IP risk limits and enumeration-safe responses.
- Error timing/content does not confirm whether an unrelated Farmer or staff account exists.
- Recovery does not automatically restore expired purpose consent or protected RSK access.

## 7. Authorization and tenant/jurisdiction isolation

### 7.1 Deny-by-default policy

Every protected route and command evaluates:

- stable subject and active role context;
- application surface and environment;
- exact capability;
- ownership or office/jurisdiction;
- target kind and current object revision/state;
- declared purpose;
- current consent/access version when applicable; and
- data classification and response field policy.

UI visibility is convenience only. Server policy is the authority. Unknown resource kinds, capabilities, purposes and disclosure targets fail closed.

### 7.2 IDOR and object access

- Routes use opaque identifiers, but unguessability is never authorization.
- Repository queries are scoped by authorization before loading sensitive bodies.
- Not-found and forbidden responses do not reveal protected object existence.
- Nested object relationships are verified; a Farmer-owned Case ID cannot authorize an unrelated media or Plot ID.
- Batch/list endpoints enforce policy per result and cannot leak counts/titles/snippets outside scope.

### 7.3 High-impact RSK actions

Chemical issuance, High/Critical Case closure, advisory decision/publication, agronomic sensor invalidation, safety-sensitive Template publication/rollback, bulk Alert approval/publication and high-impact Market mapping use exact capabilities and expected revisions. Required creator/reviewer separation is checked server-side.

Manager, Admin-like UI names or office membership never imply agronomy, publication, audit or protected-disclosure authority.

### 7.4 MP isolation

MP service identities cannot read operational tables, object storage, Farmer events or RSK Cases. They read only verified active Release Snapshots and approved standalone public facts. Forbidden MP route families are not implemented, not merely hidden.

### 7.5 Database enforcement

- Sensitive Farmer/RSK tables use `FORCE ROW LEVEL SECURITY` where specified in Document 06. Runtime roles are non-owner and lack `BYPASSRLS`.
- Verified subject, role context, office/jurisdiction, purpose and authorization version are set with transaction-scoped `SET LOCAL` in the same transaction as the query. Connection-level `SET` is forbidden; missing/malformed context denies all.
- Pool-reuse tests prove one request's context cannot leak to another.
- Use separate least-privilege database roles for migrations, Domain API, workers, device intake, callback intake, Privacy Pipeline, MP release/query and Audit writer.
- Device and callback intake are write-only to their owned intake facts. MP has no operational or analytics working-zone role. Audit writer is append-only through validated procedures.
- Internal HTTP requires managed service identity/OIDC with exact audience and allowlisted service-account subject; network location alone is not trust.

## 8. Consent, purpose and protected disclosure

- Location processing, stored audio, Case sharing, device collection, exact-location maintenance access, Visit access, Assisted Service, push, SMS and IVR are independent scopes.
- Missing, Expired and Withdrawn produce different deterministic states.
- Consent is evaluated at the time of disclosure/provider call/command, not only when a screen opened.
- Withdrawal first advances the authoritative access version and immediately blocks new reads, streams, commands, exact-location disclosure and queued provider/AI/Earth/media work. It revokes affected channel/location tokens, device assignments, grants, sessions/jobs and offline-pack eligibility. Asynchronous purge follows without extending access.
- RSK protected disclosures are purpose-bound, time-limited, typed and audit-before-disclose.
- Farmer-private quantity, cost, target, preferred market and sale fields require field-level Market Support consent; general Case consent is insufficient.
- Case evidence packs include only the purpose-relevant window/fields and exclude unrelated Diary, media, costs and sales.
- Consent denial does not create Farmer-failure labels or silently create a Case.
- Audit records store the fact/reason/version of access, not a copy of the protected content.

Tests must prove consent change races: withdrawal between page load and API read, between proposal and Confirm, during queued AI/Earth/media work and before Visit/Assisted offline pack use.

## 9. Web and API application security

### 9.1 Input/output validation

- Generate TypeScript clients, server validators and Python Pydantic models from versioned contracts.
- Reject unknown fields, invalid discriminators, excess array/string/file sizes, ambiguous dates/units and unsafe numeric formats.
- Exact decimals and large counters use the documented string representation; no silent floating-point/unit conversion.
- Query filters/sorts/dimensions come from closed registries. No arbitrary SQL, JSON expression, field name or polygon.
- Database operations use parameterized queries/ORM bindings; no string-built SQL.
- Output serializers return role-specific read models, never database entities.

### 9.2 Browser injection and content

- React text nodes are the default renderer. Raw `innerHTML` and unsanitized generated Markdown/HTML/SSML are forbidden.
- The dedicated rich-text component uses an allowlist sanitizer, safe link scheme/host policy and separately stored sanitized form.
- Apply a restrictive Content Security Policy, no inline script except nonce/hash-approved framework needs, `object-src 'none'`, restrictive `base-uri`, `frame-ancestors` and controlled connect/media/img sources.
- Adopt Trusted Types where supported after framework compatibility verification.
- Escape spreadsheet formula prefixes in CSV/export fields and sanitize filenames/content disposition.
- Security headers include HSTS in production, nosniff, referrer policy, permissions policy and safe frame policy.

### 9.3 CSRF, clickjacking, redirects and SSRF

- Current bearer-header APIs do not accept ambient credential mutations. A future cookie mode requires CSRF tokens/origin checks.
- All high-impact UI actions resist clickjacking through frame policy.
- Return/deep-link redirect keys map to fixed routes; arbitrary URLs are rejected.
- Provider/webhook/asset destinations are fixed or exact allowlisted. No user/model-controlled URL fetch.
- Egress identities, DNS/network policy and metadata-service protections limit SSRF blast radius.

### 9.4 Rate limits and abuse

Rate limits combine subject, device, endpoint class and source-IP risk without using IP as identity. Stricter budgets apply to OTP, protected search, media, voice, export, MP queries, callbacks and device ingest. Cost/concurrency quotas and circuit breakers apply to AI, speech, Earth and messaging.

## 10. Offline, PWA and shared-device security

- Service worker never caches auth/OTP, protected HTML/RSC, API tokens or personal responses outside the approved encrypted local data layer.
- Local databases are partitioned by identity, environment and device mode. C2/C3 payloads are AES-GCM ciphertext with authenticated metadata under partition keys and an approved WebCrypto/device-unlock wrapping lifecycle. Personal, Family and Assisted modes have different persistence/auto-lock rules. Browser encryption reduces at-rest exposure but does not defend against same-origin XSS while unlocked.
- Plain local storage contains no access token, exact contact/location, raw media or protected response.
- `Saved on this phone` requires atomic local event, projection and outbox commit. Server rejection never becomes Synced.
- Every sync item has stable command/event ID, schema version, dependency/expected revision and owning identity/partition.
- Generic last-write-wins is forbidden for Diary facts, consent, stage, quantity/unit, advice, task outcome and protected access.
- Shared/Assisted mode always displays active identity, blocks cross-profile cache reuse and purges only after sync or authorized Locked Recovery.
- A lost/stolen Assisted device can revoke the server session and invalidate local encrypted material.
- Local logs and crash reports exclude sensitive payloads. Storage pressure never silently evicts unsynced work.

Threat tests include XSS reading offline stores, user switch with pending media, stale token sync, replayed outbox, duplicated confirmation, rejected conflict and stolen/revoked pack.

### 10.1 RSK Visit and Maintenance offline packs

- A signed pack manifest binds staff subject/role, managed device, office/jurisdiction, exact assignment, purpose, consent/access version, expected entity revisions, schema, minimum fields and exact allowed commands.
- The encrypted pack key envelope is staff/device/pack bound and revocable. A signed server-time anchor plus monotonic local time enforces a hard offline expiry.
- Reassignment, cancellation, consent withdrawal, role/access change or expiry revokes online key eligibility and locks/purges the pack at next contact.
- Sync independently reauthorizes every command and never backdates service metrics from the device clock.
- Purge eligibility is pinned to the server-accepted sync watermark and mandatory outcome/review/receipt state. Purge attestation cannot precede that watermark; failure enters Locked Recovery.
- Tests cover manifest tamper, wrong staff/device, clock rollback, expiry, revoked key, reassignment, partial sync, revision conflict, media pending, premature purge and recovery.

## 11. Media and file security

### 11.1 Upload pipeline

```text
authorized upload intent
-> bounded one-time private upload
-> quarantine object
-> checksum and MIME signature
-> malware/polyglot/decompression/decode checks
-> dimension/duration/size limits
-> EXIF/metadata stripping
-> safe derivative
-> verified asset
-> exact owner/purpose attachment
-> optional authorized AI/expert use
```

- Buckets are private; object names are random/opaque and never authorization.
- The server chooses bucket/object and generation precondition. A resumable session URI is a short-lived bearer capability returned once, encrypted if temporarily held locally and redacted from every proxy/framework/application log.
- Browser-declared MIME, filename and extension are untrusted.
- Quarantine objects cannot be rendered, downloaded by normal users or passed to AI.
- Upload intent creation is identity, owner, purpose, expected content type, declared size/checksum and quota checked. The issued Cloud Storage resumable session URI is a bearer capability rather than identity-bound after issuance; final size/type/hash/generation and current authorization/consent are enforced at finalize.
- Attachment endpoints are typed for Diary, Health, Visit, Sensor Maintenance or Offline Voice; no generic arbitrary entity attachment.
- Current consent/access is rechecked at intent creation, finalize, typed attachment and every read. Owner and access are rechecked on every media view. Derived thumbnails do not broaden access.
- Protected streaming resolves the typed owner link, pins object generation, uses safe content type/`Content-Disposition`/`nosniff`, bounds Range requests and never exposes a reusable public URL.
- SVG, HTML, executable office formats and archives are rejected unless a future separately sandboxed use case is approved.
- Cross-subject checksum matching/deduplication is never observable and cannot reveal that another subject uploaded the same bytes.
- Image/audio decoders run with resource limits. Processing failures are safe and idempotent.

### 11.2 Crop Health and prompt injection

Image text, QR/watermark, captions, EXIF, transcript and Farmer/RSK notes are untrusted evidence. The extractor has no tools or URL retrieval, receives only verified purpose-limited media, returns a strict closed schema and cannot output treatment fields. Material schema/forbidden-content failure rejects the whole extraction.

## 12. Voice and generative AI security

### 12.1 Model gateway

- Application code uses approved logical aliases only. Missing/paused/expired aliases return typed Unavailable; no hidden provider fallback.
- Provider credentials remain server-side. Calls use minimum authorized content and approved region/retention/logging settings.
- Raw personal prompt, response, image, audio and transcript logging is disabled by default at provider and application layers.
- Output schema validation rejects unknown tools/fields, unsupported values, changed numbers/units/dates/warnings and unreferenced citations.
- Forbidden chemical/treatment/diagnosis/privacy content rejects the whole generation.
- Every alias has a tested kill switch and deterministic/reviewed fallback.

### 12.2 Voice tools and confirmation

- Role-specific tool registries are closed and versioned; no arbitrary database/search/URL/shell/retrieval tool.
- The model cannot set actor, role, jurisdiction, purpose, consent, data mode or arbitrary target.
- Receiving Domain/MP APIs independently reauthorize delegated actor/context.
- Critical slots require clarification. Tool call count and loop are bounded; parallel mutation proposals are prohibited.
- Mutation creates an expiring persisted proposal with expected revision, exact read-back, consent/access/tool versions, stable command ID and canonical payload hash.
- WebSocket and HTTPS confirmation use the same handler. Confirm executes only the stored hash idempotently.
- Reconnect checks the existing command receipt and never repeats execution.
- Native model audio cannot speak authoritative farm/Case/Warning/MP values before a validated tool result. Controlled TTS receives escaped reviewed/validated text only.
- RSK prohibited high-impact voice actions stop at visual review. MP suppression results never reach model/TTS as hidden values.
- Sensitive RSK identity or Case content is not spoken until the authorized user confirms a private environment; refusal keeps the content visual and access-controlled.

Live/offline transcripts, uploaded/retrieved documents, translations, notes, image/QR text, provider payloads, tool-result narratives and model output are untrusted data, never instructions. They are bounded/delimited, cannot define tools or policy, and are escaped for HTML/Markdown/SSML. Arbitrary model-authored SSML is rejected. Multilingual, transliterated and tool-result prompt-injection tests are mandatory.

The realtime ticket is at most 60 seconds, one-time and hash-stored, and is bound to environment, subject, role context, origin, authorization version, device partition, language, route and authorized context. It travels only as the dedicated WebSocket subprotocol token, is atomically consumed and is redacted at load balancer, framework and application layers. Validate Origin, frame schema, size, rate, sequence/gap/replay, buffering/backpressure and session expiry before provider use.

### 12.3 Offline audio

Offline audio requires explicit storage consent, encryption and typed attachment. Transcription always enters Needs Confirmation and cannot auto-execute. Without consent, failed live audio is discarded. Delete pending audio after confirmation/decline plus 24 hours and no later than the absolute seven-day policy.

## 13. Device-ingest and hardware security

### 13.1 Device identity and messages

- Provision unique gateway/device credentials; never one global fleet secret.
- HTTPS ingest requires registered identity, supported firmware/schema and active assignment.
- Batches carry boot/batch IDs, monotonic sequence, observation/receipt times, original value/unit, calibration/channel reference, nonce/checksum/signature and bounded metadata.
- Use `SFKA-HMAC-SHA256-v1` from Document 07 over canonical method/path, gateway/credential version, boot/batch/sequence, current `sentAt` or one-time challenge, nonce and JCS body digest. Reject duplicate JSON keys, invalid Unicode, content encoding and header/body identity mismatch. Verify in constant time. The untrusted-clock path uses a credential-authenticated, single-use, five-minute challenge whose consumption and durable batch commit are atomic. Device secrets are never returned after provisioning.
- Enforce nonce/replay windows, durable duplicate receipts and bounded batch/rate/clock policies.
- Exact duplicate identity/body returns the original receipt; the same batch identity with a different checksum is a security conflict. Per-observation gateway/device/boot/sequence/channel uniqueness prevents partial replay.
- Unauthenticated hostile bodies are not persisted as domain evidence or copied into logs.
- The server derives and locks `LIVE`, `RECORDED` or `SIMULATED` from environment, credential and assignment. Packets cannot promote mode and contain no Farmer name, phone or exact coordinates.
- Credential lifecycle includes controlled provisioning, versioned rotation/overlap, immediate revocation, lost-device response and testable recovery. Claims of secure boot, flash encryption or signed OTA remain roadmap until physically verified on the actual hardware.

### 13.2 Trust boundary

Transport acceptance is separate from calibration, quality, freshness and decision eligibility. Extreme values cannot bypass range/spike/flatline/clock/cross-signal checks. One abnormal point cannot generate a severe agronomic action. Low-cost NPK stays Experimental/Trend Only until separately validated.

Technicians may flag Suspect. Only the exact Agronomy Expert capability invalidates an interval for advice. Calibration/assignment/invalidation changes start complete dependency impact.

## 14. External integrations and callbacks

- Each provider has an owner, data class, purpose, source/rights version, environment credentials, fixed endpoints, schema/size limits, timeout/retry/circuit breaker and retention/deletion policy.
- Google Weather display content is TTL-deleted and structurally prohibited from decision snapshots, training and long-term evaluation under the current architecture.
- Decision weather uses immutable retention-licensed editions. A new/corrected edition never edits prior evidence.
- Earth jobs pin geometry/consent, datasets/bands, scale/reducer/window, code hash and resource budget. Location withdrawal blocks new exact-geometry calls immediately.
- Market imports preserve immutable raw records and governed mappings; unmapped/incompatible values cannot enter comparisons.
- Callback signatures validate exact raw bytes where required, timestamp, provider/account, endpoint, event/attempt identity and replay uniqueness before any update.
- Signature verification uses the configured canonical public URL and trusts forwarded host/scheme only from the configured load balancer. Validate before parsing. Persist one immutable verified inbox fact before acknowledgement; a duplicate event returns the original safe success, while a database failure returns retryable failure.
- Callback intake only persists immutable verified intake and cannot mutate an attempt, Alert, recipient, Task, Work or agronomic state. A separate consumer-inbox worker resolves the existing provider-attempt/import binding and applies the registered idempotent transition. Unknown binding quarantines; it never creates or updates an attempt.
- Retries use new attempt identities where required and never blindly repeat an uncertain non-deduplicable external contact.

### 14.1 Notification endpoint and interaction safety

- FCM registrations are encrypted/fingerprinted and bound to subject-device, environment, language and exact consent/access version. Logout, account switch, Shared/Assisted exit, consent withdrawal and Wrong Recipient revoke them.
- Push/SMS/IVR/lock-screen previews contain no diagnosis, exact Farm/location, chemical details, price target or private fact.
- `PROVIDER_ACCEPTED` is not `DELIVERED`, `REACHED`, `HEARD`, `ACKNOWLEDGED` or Task completion. An IVR connection is not Heard without validated Farmer interaction.
- An uncertain send is reconciled before new contact when the provider cannot deduplicate.
- IVR interaction uses a random single-purpose secret stored only as a hash and bound to exact attempt, recipient membership, canonical Alert version, allowlisted response set and expiry. The restricted `CHANNEL_INTERACTION` principal atomically consumes it once before issuing `RecordAlertInteraction`; replay, cross-recipient use and response substitution fail closed.
- Demo adapters/credentials are physically unable to contact real recipients.

## 15. MP privacy release and inference resistance

### 15.1 Release pipeline

- Fixed metric definitions, contribution bounds, allowed dimensions/geographies/periods and mode are compiled from approved registries.
- Release computation runs under an isolated identity and writes complete immutable signed snapshots.
- Query serialization verifies signature, object generation/hash, completeness, schema, effective/expiry and invalidation before returning a value.
- Both sides of a comparison independently pass release and compatibility checks.
- Public market facts remain a separate path; joining them to Farmer-derived cohorts re-applies release policy.

### 15.2 Suppression

- Farmer-derived metrics meet at least five contributing Farms in the pilot, with stricter configured thresholds for sensitive/filterable cohorts.
- Sticky and complementary suppression prevent repeated geography/period/filter/funnel queries from reconstructing a hidden value.
- Query fingerprinting, bounded shapes, throttles and anomaly alerts cover dashboard, URL, voice, briefing and export paths together.
- `SUPPRESSED` physically omits value, numerator, denominator, bounds and hidden cohort. The absence applies to DOM, accessibility tree, chart/map dataset, logs, analytics, model/TTS and export.
- A Safe Rollup is an independently released parent result, never an estimate of the hidden child.
- Saved Briefing view/voice/export revalidates every underlying release and returns a consistent redacted replacement/refusal after invalidation.

Privacy tests attempt differencing across adjacent funnel stages, time windows, comparison direction, map/table, language paraphrase, voice, saved Briefing and export.

## 16. Database, storage and cryptography

- Cloud SQL and buckets are private and accessible only to explicit service identities.
- Encrypt provider-managed storage at rest; use KMS/CMEK where the approved risk/operations policy requires independent key lifecycle.
- TLS is required in transit; internal service authentication uses managed identities, not static shared bearer strings.
- Column/field encryption or tokenization protects designated contact/exact-location/security material where defined by the data model.
- Encryption keys have owner, purpose, environment, rotation, revocation and restore policy. Key identifiers, not secrets, appear in records.
- Database roles are service-specific. MP, device ingest, media worker and intelligence worker cannot query unrelated schemas.
- Migrations are transactional/expand-contract where possible, forward/backward compatible during rollout and tested on production-like volumes.
- Backups are encrypted, access-logged, restoration-tested and included in deletion/retention/legal-hold policy.
- Audit and immutable evidence tables restrict update/delete paths to exact lifecycle procedures.

## 17. Secrets and environment isolation

- Store secrets in managed Secret Manager/KMS; no `.env` secrets, service-account key files, repository secrets, test fixtures or client bundles.
- Local `.env.example` contains names and safe descriptions only.
- Production, staging, demo and development use separate projects/accounts, credentials, buckets, databases, provider senders and analytics.
- Preview deployments cannot connect to production data or secrets.
- Public browser keys are origin/referrer/API restricted and quota limited; they are treated as identifiers, not secrets.
- CI uses short-lived workload identity where possible and masked protected environments for deployment.
- Secret scanning runs on commits/PRs; a detected real secret is revoked/rotated, not merely deleted from the latest file.

### 17.1 Runtime perimeter and emergency access

- Public APIs sit behind the production HTTPS Load Balancer and Cloud Armor. Cloud Run uses `internal-and-cloud-load-balancing` ingress where applicable and direct public `run.app` bypass is disabled.
- The perimeter never replaces application token/signature/ticket validation. Internal services use IAM-only ingress, exact OIDC audience and dedicated least-privilege service accounts.
- The pilot has no unstructured break-glass data access. Any future design requires a separate approved decision, named purpose/capability, step-up authentication, independent approval where appropriate, strict time limit, minimum fields, immutable Audit and post-use review.

## 18. Logging, audit, analytics and observability

### 18.1 Structured safe telemetry

Allowlisted log fields include timestamp, environment, service/build, safe route template, validated correlation/trace ID, operation/result code, latency bucket and non-sensitive provider/registry version. Prohibited fields include tokens, tickets, cookies, HMACs, contact, exact coordinates, raw transcript/audio/media/prompt/response, Case/Diary text, private market values, provider/callback payloads, signed URLs/resumable sessions, suppressed values/cohorts, sensitive query values, SQL, stack traces and arbitrary request/response bodies.

Redaction applies at load balancer, framework, application and provider-SDK layers. Client-supplied correlation IDs are syntax/length validated or replaced before logging. Dead-letter and crash records preserve classification while excluding prohibited payload. Identifiers in operational logs are minimized and access-controlled. Analytics uses purpose-specific rotating tokens and never attempts identity reversal. High-cardinality personal values are forbidden as metric labels. Product analytics, security telemetry, application Audit and Cloud Audit Logs remain separate stores/purposes.

### 18.2 Audit facts

Audit records cover authentication/security changes, role/capability context, protected search/disclosure, consent/access decisions, high-impact RSK decisions, model/registry activation, MP queries/exports, Assisted/Visit/maintenance access, data export/deletion and administration. Audit append is transactionally coupled or fail-closed where the action requires audit-before-disclose.

Audit UI reveals protected content only through separate authorized investigation. Operators cannot erase their own Audit facts.

### 18.3 Alerting

Produce an operator signal within five minutes for sustained API errors, failed Alert dispatch, stale ingestion, synchronization backlog and privacy-release failure. Security/quality detections additionally include repeated authorization denial/enumeration, OTP abuse, protected search spikes, HMAC replay, invalid callback, idempotency-hash conflict, device sequence anomaly, suppressed-query differencing pattern, impossible state transition, duplicate command, model forbidden-content rejection, data-mode mismatch, logging-redaction failure, deletion-ledger mismatch and release-signature failure.

## 19. Privacy lifecycle, retention and rights

- Farmer export/deletion requires fresh reauthentication and explicit whole-scope/consequence read-back. Any authorization/scope failure rejects the entire request rather than returning a partial silent export/deletion.
- Prepared exports are encrypted and use a private-delivery choice appropriate to Personal versus Shared/Assisted devices; no browsable artifact remains after shared-session exit.
- One Retention Registry resolves owning record, source rights, consent, product purpose, provider deletion, legal hold and minimum Audit lineage. A legal/internal hold cannot extend provider contractual deletion unless the governing agreement expressly permits it; otherwise `contractDeleteAt` is a hard upper bound.
- Raw live voice/transcript is session-only by default. Offline audio and Crop Health/Case media follow their approved policies.
- Export/artifact retrieval uses a one-time ticket in an authenticated POST body, stores only its hash, rechecks current actor/authorization and streams the generation-pinned object with `private, no-store`. No ticket, secret or signed artifact URL appears in a URL/log. The prepared artifact is lifecycle-deleted after retrieval/expiry policy.
- Deletion first blocks access and pending processing, then deletes/cryptographically renders inaccessible all owned copies/derivatives/caches as policy requires.
- A non-personal independently retained deletion/revocation ledger records durable `INTENT` before destructive operational deletion and `APPLIED` only after verified purge. It remains outside the Cloud SQL backup set and outlives backup/offline replay horizons. Purpose-HMAC tombstones prevent old-client resurrection without retaining deleted content.
- A restored backup starts isolated with application/API/device/worker access blocked. It replays and verifies the independent deletion/revocation ledger through a signed high-water mark, reruns pending purges and validates counts/checksums before any access. Missing/unverifiable watermark keeps the restore unavailable.
- Dependency impact recalculates/corrects/cancels current decisions before evidence removal can leave unsafe active advice.
- After lawful deletion, retain only permitted non-personal checksum, policy/reason and invalidation/deletion lineage; do not claim exact replayability.
- Training/evaluation datasets require separate purpose, rights and consent, de-identification, exact-geometry removal, manifest, expiry and deletion/retraction lineage.
- Analytics, backups, model providers and external messaging are included in the deletion inventory.
- Staff accountability required for safety/security Audit remains under the approved retention policy; Farmer actor references are detached or purpose-pseudonymized when identity retention is no longer permitted. Audit must not become an indefinite Farmer identity store.

## 20. Secure code architecture and clean-code rules

### 20.1 Dependency direction

- Domain packages contain pure rules/value objects and import no React, HTTP, SQL, cloud or Gemini SDK.
- Application services orchestrate authorization, repositories, transactions and domain rules.
- Adapters implement providers/storage/transport behind typed interfaces.
- UI components contain no authorization or agronomy decisions.
- Generated contracts are never hand-edited.
- The launch decision algorithm is implemented once in TypeScript; Python does not duplicate authority.

### 20.2 Type and error discipline

- TypeScript uses `strict` and disallows unreviewed `any`, unsafe assertions and ignored promises.
- Python uses type checking, Pydantic at boundaries and pinned formatter/linter configuration.
- Use discriminated unions/exhaustive switches for modes, states and result unions.
- Domain errors use stable typed codes and safe user messages. Unexpected errors retain correlation only, never raw sensitive payload.
- No swallowed exception, empty catch, blanket retry or fallback that changes authority.
- Clock, random/ID generator, registry and provider are injected for deterministic tests.
- Units, time zones and decimal precision use explicit types/helpers.

### 20.3 Maintainability

- Small cohesive modules own one bounded domain; avoid generic `utils`, `service` or god repositories.
- Public functions/types document invariants and failure states; comments explain why, not obvious syntax.
- No copied endpoint schemas, status strings or capability names outside registries/generated contracts.
- Feature flags have owner, environment, expiry and removal task. They cannot bypass authorization/safety.
- Dead code, disabled checks, commented production branches and knowingly unused dependencies are removed.

## 21. Testing strategy

Testing follows risk and feedback speed:

| Layer | Purpose | Typical runtime |
| --- | --- | --- |
| Static | types, lint, formatting, forbidden patterns, contract generation | seconds/minutes |
| Unit/property | pure domain/security/privacy/transform rules | seconds/minutes |
| Component | UI state, keyboard, locale and accessibility contracts | minutes |
| Contract | OpenAPI/JSON Schema/event/DB/provider compatibility | minutes |
| Integration | database transaction, authz, outbox, storage/provider adapter | minutes |
| End-to-end | stakeholder outcome across deployed services/browser | PR/release |
| Security/evaluation | abuse, fuzz, privacy inference, AI safety | PR/nightly/release |
| Performance/resilience | budgets, load, outage/retry/recovery | nightly/release |

Tests are deterministic and parallel-safe. Time, IDs, provider responses and network failure are controlled. A retrying test cannot hide a critical product race.

No known flaky critical test may remain as a merge gate. Across a rolling 30-day CI window, fewer than 1% of test-job executions may require a rerun because of nondeterminism; a passing retry remains recorded as a flake.

## 22. Unit, property and state-machine tests

### 22.1 Critical pure rules

Golden and boundary tests cover:

- crop candidate/profile resolution, every gate, suitability/confidence and deterministic tie/checksum;
- advisory evidence eligibility, dry-spell components, independent groups, persistence, feasibility, materiality and expiry;
- exact fertilizer gates, units, split/cumulative actuals and spray timing;
- Crop Health quality, severity, confidence caps and mandatory escalation;
- sensor normalization/trust/freshness and dependency impact;
- Task/Alert/Case/Visit/Work/Template/Mapping state transitions;
- consent/access/retention decisions;
- MP contribution bounding, threshold, sticky/complementary suppression and result union; and
- voice tool/slot/proposal/confirmation policy.

### 22.2 Properties/invariants

Property or model-based tests prove:

- a candidate with FAIL/UNKNOWN_BLOCKING never receives score/rank;
- input order/retry cannot change deterministic result or create a duplicate logical fact;
- missing is never zero and no missing signal counts as agreement;
- one abnormal sensor cannot produce high-impact action;
- exact fertilizer cannot exist after any failed gate;
- expired/replaced advice cannot appear current;
- provider state cannot set Farmer acknowledgement/Task completion;
- voice Cancel/expiry creates no domain mutation and Confirm executes at most once;
- an RSK/MP role never gains Farmer ownership through identifiers;
- suppressed values cannot appear in any result variant; and
- consent/access withdrawal denies subsequent reads/commands regardless of cached projection.

State-machine tests generate valid/invalid command sequences and assert only registered transitions/events occur.

## 23. Contract, schema and migration testing

- OpenAPI/JSON Schema generation is deterministic and checked for breaking changes.
- Every client request/response and model/provider adapter has positive, boundary, unknown-field, oversized and malformed cases.
- Events validate name, class, aggregate, schema, minimization and compatibility. Consumers tolerate supported additive versions and reject unsafe unknown semantics.
- Provider contract tests use recorded/minimized fixtures under their licence; Live smoke tests run only in isolated non-production accounts.
- Database migration CI creates from zero, upgrades previous supported schema, rolls forward after partial rollout and tests constraints/index/query plans.
- Data-model invariants have database-level tests: unique idempotency, active-interval overlap, immutable snapshot/event, owner/media link, outbox transaction and release completeness.
- Generated TypeScript/Python clients compile against the same artifact.
- Retain validated handlers/upcasters for emitted Farmer and RSK queued commands/events for at least the 90-day offline compatibility horizon, including Visit/Maintenance pack command, event, media and projection schemas as applicable. Service-worker/IndexedDB/pack migrations are staged with telemetry before handler retirement. An unsupported older queue/pack locks into forward recovery and never deletes data.

## 24. Integration and transactional tests

Use ephemeral PostgreSQL/storage/emulators or isolated cloud resources to test real transaction boundaries:

- Recommendation acceptance creates Acceptance + one correct Season + Calendar + initial Tasks + events/outbox or none.
- Advisory/Task/policy Alert publication is atomic and retry-safe.
- Mandatory Crop Health escalation creates consent decision + Case + pack + Work or shares nothing.
- Task completion creates one Diary actual.
- Consent withdrawal blocks access/grants/jobs and starts effects in one accepted operation.
- Protected disclosure audits before returning content.
- Sensor ingest durable acceptance writes receipt/raw/events/outbox once but trust remains Pending.
- Sensor/source invalidation enumerates and completes every dependency impact item.
- Governed Alert publication creates canonical version/cohort/outbox once; callback intake stores only verified immutable inbox data, and the separate bound consumer applies the exact allowed attempt transition.
- MP release activation is complete/signed/verified; partial objects never query.
- Saved Briefing invalidation returns identical redaction/refusal to view/voice/export.
- Offline sync handles duplicate, dependency, revision conflict, rejection and local receipt correctly.
- Data-rights integration tests crash/retry before and after external `INTENT`, local purge/tombstone and external `APPLIED`; cover ledger outage, repeated phases, tombstone-HMAC key rotation, analytics correction/retraction, old-device resurrection and blocked restore for missing/mismatched signed high-water mark.

Inject database commit failure, worker redelivery, network timeout after commit and provider uncertain outcome.

## 25. End-to-end journeys

Automate a small stable set on deployed test environments and keep full visual/state scenarios in component tests.

### Mandatory PRD journeys

1. **J1 Setup to crop plan:** authenticate/onboard → Farm/Plot → Recommendation/No Safe Result → accept proposed/actual Season → Calendar.
2. **J2 Live signal to completed action:** evidence event → Advisory → Alert/Task → Done/Cannot Do/Dispute → Diary or RSK follow-up.
3. **J3 Crop-health report to expert resolution:** capture → upload/verify/attach → triage → consent or decline → Case → expert response/follow-up/resolution.
4. **J4 Offline Farmer operation:** cached work → offline Diary/Crop Health/media → restart → sync → conflict/rejection recovery without duplicate/loss.
5. **J5 Sensor failure and trust handling:** current → stale/outlier/excluded → problem report → RSK Issue/Maintenance → impact correction → Return to Service.
6. **J6 Harvest to market preparation:** readiness → compatible/incompatible Market evidence → Watch → triggered Alert and harvest Diary, without sell guarantee.
7. **J7 MP pilot briefing:** released query/overview/voice → map/table/voice equivalence → suppressed/safe-rollup/stale/unavailable → Briefing save/invalidation/view/voice/export.

Each J1–J7 has a deterministic automated integration test and at least one release-environment smoke path. Provider/physical hardware simulators require separate adapter contract tests.

### Mandatory cross-journey automation

- Multi-Plot onboarding proves selected context, All Farms labels and no cross-Plot mutation.
- Canonical Alert covers Delivery Plan, independent Provider Attempts, Delivered/Unknown, one Recipient Reached, Opened/Heard, Acknowledged, structured response, expiry and Cannot Do without false state promotion.
- Farmer export covers reauthentication, prepare, identity-bound retrieve, access-loss refusal, expire and prepared-artifact deletion.
- Farmer deletion covers external `INTENT`, operational purge, analytics correction/retraction, `APPLIED`, tombstone/old-device resurrection block and isolated backup-restore ledger gate.
- Shared-phone switch with pending structured outbox and media proves no cross-user read, silent deletion or unsafe exit.
- Voice covers complete proposal read-back, Correct creating a new proposal, Cancel causing no mutation, Confirm once and reconnect to the existing receipt.

### RSK

1. Queue claim/concurrency → protected Case disclosure → response/Care Plan → follow-up/closure;
2. advisory review → publication failure/retry or expiry;
3. Alert outreach/delivery incident without false milestone;
4. sensor maintenance/invalidation/dependency correction;
5. Calendar/Template decision/application/separation of duties;
6. Market mapping approval/reprocessing/rollback;
7. Visit offline pack/revocation/sync/review/purge; and
8. Assisted Session purpose/consent/read-back/sync/receipt/purge.

### Additional MP safety journeys

1. released query/map/table/drawer equivalence;
2. suppressed/safe-rollup/stale/unavailable consistency;
3. comparison with one hidden side produces no delta;
4. voice paraphrase cannot bypass suppression; and
5. Briefing generate/save/invalidate/view/voice/export refusal.

Tests use Marathi critical copy, touch and keyboard paths where applicable. Each Farmer core journey has a no-voice/no-hardware/provider-failure variant.

## 26. Security testing

### 26.1 Automated

- SAST and framework security rules on every PR.
- Secret scan on commits/PR/history within the pipeline scope.
- Lockfile dependency vulnerability/licence scan and automated update PRs with tests.
- Container/base image scan and SBOM generation.
- Infrastructure-as-code policy tests for public access, service-account privilege, network and encryption.
- API authorization matrix tests for every route/capability/owner/jurisdiction/purpose/state.
- Fuzz/property tests for parsers, device/callback signatures, media metadata, sync envelopes, model schemas and MP queries.
- DAST on authenticated test roles for common injection, IDOR, header, redirect, upload and session errors.
- CSP/security-header checks on deployed surfaces.
- Checked-in device HMAC/challenge golden vectors cover canonicalization, constant-time verification path, header/body tamper, duplicate JSON keys, nonce/challenge replay, rotation overlap/revocation and same identity/different checksum.
- Raw-body callback signature vectors cover canonical URL, forwarded-header trust, timestamp/replay, duplicate, unknown binding, out-of-order/contradictory terminal state and durable-intake failure.
- Media corpus covers resumable interruption/restart, generation and checksum mismatch, declared/final size, MIME/extension/magic differential, polyglot/malware/decompression/pixel/audio bombs, EXIF/location stripping, consent races, typed attachment, protected Range streaming and same-checksum/different-subject non-disclosure.
- Component/E2E assertions prove protected RSK fields are absent from DOM/accessibility tree and skeleton-free until audit-before-disclose succeeds, disappear immediately on withdrawal, and never flash during route/cache transitions.
- Notification snapshot tests prove lock-screen/provider previews contain no diagnosis, chemical detail, price target, exact Farm/location or other C3 content.

### 26.2 Manual/high-risk review

Before production pilot, review:

- Farmer cross-account and shared-phone isolation;
- RSK protected search/disclosure and purpose reuse;
- MP differencing across dashboard/voice/export;
- media quarantine/decoder and Crop Health prompt injection;
- voice duplicate/reconnect/unconfirmed mutation;
- device credential/replay/assignment and callback forgery;
- high-impact separation of duties; and
- deletion/retention across storage, backups, analytics and model providers.

No Critical/High known vulnerability may be waived for release. A Medium exception needs owner, reason, compensating control and expiry.

## 27. AI and agronomy evaluation gates

Run Document 08's versioned golden/adversarial/language sets on any model, prompt, tool, glossary, rule or profile change.

Zero-tolerance outcomes include:

- crop hard-gate bypass or model-altered launch rank;
- single-signal severe action or missing signal counted as agreement;
- exact fertilizer from low-cost NPK/generative text/failed gate;
- Crop Health confirmed diagnosis, prohibited treatment, unsupported supported-category or mandatory-escalation miss;
- unsafe/unconfirmed/duplicate voice mutation;
- RSK prohibited voice completion;
- authoritative speech before validated tool result;
- MP suppressed value/model context leakage; and
- production influence from shadow ML.

Evaluation artifacts pin dataset manifest, alias/prompt/tool/glossary versions, environment, metrics/slices, failures and approval. Preview/failed aliases cannot receive production traffic.

## 28. Accessibility testing

The applications target WCAG 2.2 AA. Merge/release evidence includes:

- axe-core with zero Serious or Critical findings on primary routes;
- keyboard-only smoke flows for every primary stakeholder journey;
- one supported screen-reader/browser critical journey per surface;
- manual 200% zoom plus 400% critical-flow reflow, forced-colors and reduced-motion review;
- Farmer target-size, focus restoration, live-region and error-summary tests;
- long Marathi/Hindi, mixed Devanagari/Latin and locale number/date/unit tests;
- chart/map same-data table equivalence and accessible names; and
- Lighthouse CI accessibility budget.

Automated token/component tests enforce at least 4.5:1 text contrast where WCAG requires it and minimum 44-by-44 CSS-pixel primary targets. Critical Marathi copy and audio require named native-language reviewer evidence; automated translation or snapshots are insufficient.

Automated checks cannot approve an inaccessible chart, misleading status announcement or unusable voice/camera flow by themselves.

## 29. Performance and efficiency testing

### 29.1 Client budgets

- Farmer entry route: at most 250 KB compressed executed JavaScript as locked by Document 05.
- Authenticated Farmer shell: below 1 MB from a clean cache, excluding user media and map tiles.
- On the documented representative low-end Android/throttled-4G profile: LCP at or below 2.5 seconds, INP at or below 200 milliseconds and CLS at or below 0.1. After sufficient Live traffic, at least 75% of Farmer-route visits meet the same thresholds through privacy-safe RUM.
- Map, chart, voice, camera and media viewer are absent from initial bundles and lazy loaded.
- Slower AI/provider operations display local progress or feedback within 300 milliseconds; validated voice progress follows the stricter one-second audio rule where applicable.
- No unbounded list/image/audio in memory. Use pagination, bounded offline windows and responsive media.
- Core Farmer route remains interactive on the approved low-end device/network profile; exact numeric thresholds are recorded in the Performance Registry after baseline measurement.
- RSK queue and MP overview remain usable at 200% zoom and approved office laptop profile.

### 29.2 Service budgets

Measure p50/p95/p99 latency and error rate per endpoint class, database query counts/plans, pool saturation, job age, provider/cost usage and payload size. Normal first-party reads/writes target p95 below 750 milliseconds over at least 100 requests in a production-like Indian region, excluding asynchronous provider completion. Avoid N+1 reads, unbounded scans, per-Farmer weather fetching and synchronous Earth/model work on page requests.

Measure end-of-speech to first audible validated response over at least 20 defined Marathi utterances on the documented 4G profile; healthy-provider p95 is at most five seconds. On degradation, provide first audible progress/retry within one second. Performance degradation cannot skip validation/authorization or use stale data beyond policy.

First-party authenticated APIs and core cached Farmer routes target at least 99.5% monthly availability under the PRD definition. Under the documented 4G profile, up to 100 lightweight queued events excluding media synchronize within 60 seconds at p95 while the app is open.

Every performance report pins hardware/device, browser/runtime, viewport, network/throttle, region, seeded data size, warm/cold state, sample count and raw percentile results. A Performance Registry may add stricter budgets but cannot weaken these locked thresholds.

### 29.3 Load and soak

Test normal/peak Farmer reads/sync, RSK queue, device batches, provider callbacks, weather event fan-out, bulk Alert dispatch, voice concurrency and MP aggregate queries. Verify backpressure, coalescing, quota/circuit breaker and safe recovery. A mass event produces one incident plus exceptions, not uncontrolled per-Farmer work.

## 30. Resilience and recovery testing

Chaos/failure scenarios include provider timeout, database failover, worker duplicate/redelivery, Cloud Run restart, expired/revoked credentials, bucket/event delay, Earth quota, AI schema failure, message uncertain acceptance and clock skew.

Verify:

- deterministic fallback/unavailable state;
- no partial authority or duplicate logical event;
- accepted command receipt recovery after network loss;
- outbox/inbox replay safety;
- no expired action publication;
- backup restore and point-in-time recovery objectives;
- key/secret rotation without cross-environment mix; and
- documented manual reconciliation for uncertain external delivery.

RTO/RPO values are approved in the Operations Registry before production; a demo/staging assumption cannot silently become production policy.

## 31. Code coverage and mutation quality

Coverage is a diagnostic and gate on new risk, not a target to game.

| Scope | Minimum gate |
| --- | --- |
| SonarCloud New Code | At least 80% coverage on new production code |
| Committed test runner critical packages | At least 90% branch coverage for agronomy, authorization, alert-policy, sync-conflict and privacy-rule packages |
| Pure agronomy, privacy release, consent/access, state transition and voice confirmation kernels | Additive 100% registered safety-branch coverage; every invariant has direct positive/negative tests |
| Adapters/UI | Risk-based coverage plus required contract/component/E2E outcome; no meaningless snapshot-only satisfaction |

Critical pure-rule packages run mutation testing on scheduled/release CI. Surviving mutations in a safety/security invariant block release; the initial mutation-score target is recorded after baseline and may only tighten. Coverage exclusions are limited to generated clients/schemas, type-only files, fixtures, vendored code and migrations through reviewed committed configuration; an exclusion cannot hide authored production rules.

## 32. SonarCloud and CI quality gates

SonarCloud is retained because it is valuable on changed code and does not need to slow the inner loop.

### 32.1 Fast local/pre-push path

Run format check, lint, TypeScript/Python type check, contract generation-diff, affected unit/component tests and forbidden-pattern/secret checks. Developers can run targeted tests while coding.

### 32.2 Pull-request SonarCloud gate

Analyze after build/test/coverage artifacts exist, in parallel with browser/security jobs where possible. Gate on New Code:

- no new Blocker or Critical issue;
- no new vulnerability and Security, Reliability and Maintainability rating A on New Code;
- 100% of new Security Hotspots reviewed and resolved or explicitly adjudicated;
- no new bug/reliability issue above the approved threshold;
- new functions remain below cognitive complexity 15 or have reviewed owner/reason/refactor-expiry;
- no duplicated block or maintainability regression above the project's Quality Gate;
- coverage meets Section 31; and
- new-code duplication remains at or below the configured 3% target unless generated code is excluded correctly.

Do not block the editor/inner loop on a remote Sonar round trip. Do block merge/release when the current PR Quality Gate fails. Sonar suppressions require inline rationale or central reviewed configuration; do not blanket-ignore directories containing production code.

For pull requests, Sonar New Code is the diff against the target branch. For `main`, commit the New Code Definition based on the previous released version. A Sonar outage may be bypassed only to create a clearly marked non-production demo artifact after local lint, types, tests, production build, dependency audit and secret scan pass. Protected release-branch merge and production promotion remain blocked until the required Sonar status succeeds; it cannot be manually overridden.

### 32.3 Merge gate summary

Required checks include:

- clean format/lint/type/contract generation;
- affected unit/property/component/integration tests;
- SonarCloud New Code Quality Gate;
- dependency/secret/SAST/IaC/container gates as applicable;
- database migration compatibility;
- accessibility automated/keyboard smoke;
- primary E2E smoke on deployed preview/staging;
- bundle/performance budgets; and
- zero-tolerance agronomy/AI/privacy suite for affected modules.

CI records first-run and rerun results and publishes the rolling 30-day nondeterministic-rerun rate. Release is blocked at or above 1%. Critical gate tests cannot be quarantined or retried to green. A non-critical quarantined test has owner, issue, expiry and equivalent release evidence.

## 33. CI/CD and supply-chain controls

- Protected default branch; pull request review and required checks.
- CODEOWNERS or equivalent review for domain/security/privacy/infra/migrations/registries.
- Lockfiles committed; install uses frozen lockfile and trusted registry.
- Build once, generate SBOM/provenance, sign/attest artifact where supported and promote the same artifact across environments.
- Deployments use workload identity and protected environment approval; no long-lived cloud key in CI.
- Migrations/jobs are separately observable and rollback/forward-recovery tested.
- Environment config is schema validated; missing/unknown security setting fails startup.
- Preview/staging uses synthetic/Recorded data and non-production providers.
- Release records code revision, contract/migration/registry/model versions and feature flags.
- Rollback restores the last compatible artifact/config; it does not roll back immutable user facts.

## 34. Test data and environment policy

- Default tests use factories with synthetic opaque identities and no production copies.
- Every rehearsed scenario has a versioned manifest with stable IDs, frozen clock/timezone, locale, environment, data mode/provenance, dataset/rule/source/model/prompt/tool/schema versions, provider adapter, hardware state/adapter, expected events/decisions/Alerts/recipients, allowed external destinations and failure toggles.
- Recorded demonstrations are minimized, consented/licensed and visibly labelled; they live in a separate fixture boundary.
- Never paste real token, phone, exact coordinate, audio, Case text or media into tests, snapshots or issue logs.
- Golden files are reviewed, deterministic and small enough to understand; update commands show semantic diffs.
- Each test owns/cleans its data by run ID. Parallel tests do not rely on global ordering.
- Provider sandboxes have separate senders/numbers/projects and hard spending/recipient allowlists.
- Production debugging uses safe metadata/correlation and approved access, not data copied into local development.

Checked-in boundary corpora include MP privacy cohorts below/at/above threshold and complementary/differencing shapes; device HMAC/challenge and callback-signature vectors; malicious/malformed media; multilingual/transliterated prompt injection; and long reviewed Marathi strings. No corpus includes real Farmer data, production screenshot, phone, exact private geometry, audio/transcript or credential.

## 35. Release evidence and sign-off

Every candidate release produces or links:

- immutable machine-readable manifest plus human summary keyed by commit and promoted artifact digests;
- SBOM/provenance, dependency lock, container/frontend/backend digests and exact deployment/config/feature-flag hashes;
- contract/schema/migration IDs/checksums and compatibility results;
- unit/property/integration/E2E reports, deterministic J1–J7 trace, staging smoke and exact coverage/flaky-rate results;
- SonarCloud, dependency, secret, SAST, container and IaC results;
- AI/agronomy evaluation report for changed versions;
- accessibility report plus named Marathi review and performance raw reports with hardware/browser/network/region/warm-state/sample profile;
- privacy-release/suppression test report when affected;
- open risk/exception register with owner/expiry;
- migration, backup/deletion-ledger restore, rollback and model/rule/provider kill-switch rehearsal; and
- Demo Data Manifest listing every Live, Recorded and Simulated source.

The Demo/Hardware Evidence Manifest separately records transport HMAC, actual connected/Recorded sensor state and physically verified device protections. ESP32 secure boot, flash encryption and signed OTA are production targets and must not be claimed as working unless verified on the demonstrated hardware; transport authentication alone is not device-compromise resistance.

Required sign-off is risk-based: engineering owner, product owner, agronomy owner for agronomy/content changes, privacy/security owner for protected/MP/training changes and operations owner for deployment/incident readiness. One person cannot approve both sides of a required safety separation.

Any artifact, config, contract, schema, migration, registry/model/prompt/tool or environment change after evidence generation invalidates and reruns the affected evidence before promotion.

## 36. Incident response and vulnerability handling

- Publish a private reporting route/security contact before public pilot.
- Triage by the asset/severity model in Section 2 and preserve evidence without copying sensitive payload into tickets.
- Immediate containment options include revoke session/device/provider credential, disable alias/tool/feature, pause source/provider, block release snapshot, stop non-critical messaging and roll back artifact/config.
- Notify affected internal owners and legally required parties under the approved response policy; do not promise a timeline in product UI without confirmation.
- Correct current decisions/Alerts/Tasks through normal immutable replacement/invalidation paths.
- Post-incident review records root cause, blast radius, missed control/test, safe migration, monitoring and owner/date.
- Secret exposure requires rotation/revocation and history impact review, not merely deleting the string.

Named playbooks and tabletop/drill evidence are required for compromised Farmer, RSK or MP account; lost Shared/Field device or offline pack; gateway credential; provider signing secret; AI/prompt data leak or unsafe output; MP suppression leak; media exposure; poisoned source/wrong agronomic advice; supply-chain/build compromise; and deletion/restore-ledger failure. Each defines detection, owner, access-version/session revocation, credential rotation, provider/model/source/release pause or kill switch, quarantine/evidence preservation, current-decision correction/recovery and criteria to resume.

## 37. Acceptance criteria

- **SQ-AC01:** Every protected route has automated owner/role/jurisdiction/purpose/consent denial tests.
- **SQ-AC02:** No RSK or MP identifier manipulation can expose Farmer-owned protected data.
- **SQ-AC03:** Missing, Expired and Withdrawn consent produce distinct tested access outcomes.
- **SQ-AC04:** Shared/Assisted local data cannot be read after user/session switch or revocation.
- **SQ-AC05:** Quarantine media cannot reach normal rendering, attachment or AI before verification.
- **SQ-AC06:** Voice/model output cannot execute an unconfirmed or unauthorized mutation.
- **SQ-AC07:** A device/callback replay cannot create duplicate authoritative events or false trust/milestones.
- **SQ-AC08:** Suppressed MP values are physically absent from UI, voice, model, logs and export and resist tested differencing.
- **SQ-AC09:** Critical agronomy/privacy/state kernels pass all registered safety branches and zero-tolerance tests.
- **SQ-AC10:** Core transactions remain atomic/idempotent under commit loss, redelivery and network uncertainty.
- **SQ-AC11:** New code meets the approved coverage, duplication and SonarCloud gates with no Critical/High release blocker.
- **SQ-AC12:** Critical routes pass automated and manual WCAG 2.2 AA evidence gates.
- **SQ-AC13:** Farmer bundles, service latency and voice progress meet approved performance budgets without skipping safety checks.
- **SQ-AC14:** Secrets, production data and provider credentials are absent from repository, client bundle, test fixtures and ordinary logs.
- **SQ-AC15:** Training/evaluation data is purpose/right/consent approved, de-identified, manifested and deletable.
- **SQ-AC16:** Release evidence identifies exact code, migration, rule, model, prompt, tool and data-mode configuration.
- **SQ-AC17:** Every Critical/High incident has a tested containment path and immutable correction path.
- **SQ-AC18:** SonarCloud runs on PR/release CI and does not block the fast local edit/test loop.

## 38. Follow-on contract

The implementation sequence must schedule security and test foundations with the first code, not as a final phase. Each vertical slice includes its authorization, state, privacy, accessibility, performance and failure tests before the next slice depends on it.

The demo journey must use the Demo Data Manifest and display Live, Recorded and Simulated truthfully. It must never require production secrets, real Farmer data, unapproved external messaging or a bypassed safety gate.
