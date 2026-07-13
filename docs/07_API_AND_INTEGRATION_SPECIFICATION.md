# Smart Fasal Kisan Alert

## API and Integration Specification

| Field | Value |
| --- | --- |
| Status | Approved for implementation |
| Version | 0.1.0 |
| Last updated | 13 July 2026 |
| Parent documents | `docs/01_PRD.md` through `docs/06_DATA_MODEL_AND_EVENT_CATALOG.md` |
| API style | OpenAPI 3.1 REST commands and scoped projections; no GraphQL |
| Pilot | Raigad district, Maharashtra |

## 1. Purpose

This document defines the transport contract that Codex must implement for the Farmer PWA, Rythu Seva Kendram desktop application, MP Office dashboard, internal workers, voice gateway, optional field hardware and external providers. It maps every API family to authentication, authorization, idempotency, expected revision, persistence ownership, canonical events and safe failure behaviour.

It is authoritative for:

- HTTPS and WebSocket boundaries.
- Endpoint names and operation families.
- Request, response, header and error conventions.
- Command admission, idempotency and optimistic concurrency.
- Farmer offline stream synchronization and RSK assignment-pack synchronization.
- Media, voice, device-ingest and provider-callback protocols.
- Internal service identity, task and event contracts.
- MP privacy-release queries.
- Rate, size, timeout, freshness and compatibility limits.

The data model controls persisted meaning. The later AI/agronomy specification controls decision payloads and tools. The later security specification may tighten a limit or control but cannot weaken this contract.

## 2. Normative API rules

1. Every protected operation authenticates the caller and authorizes the exact capability, purpose, office/jurisdiction, ownership, assignment and current consent/access version it needs.
2. A route or opaque ID is never authority.
3. Names, phone numbers, exact coordinates, symptoms, transcripts, private market values and signed object URLs never appear in a URL, cursor, trace ID or problem type.
4. Connected mutations are commands with a stable idempotency identity and expected revision where mutable state is involved.
5. Reads return current projections plus explicit revision, data-as-of, freshness, data mode and limitations. They never manufacture business facts.
6. A provider network call never occurs while a database transaction or row lock is open.
7. All list/filter/sort combinations are allowlisted and cursor-paginated.
8. All accepted event names and versions come from the checked-in registry defined by Document 06.
9. Client, command, Domain Event, Technical Event, Integration Event and analytics-safe schema versions remain distinct.
10. Unknown, missing, proxy, conflicting, suppressed, unavailable and zero remain distinguishable in every representation.
11. Voice calls the same authorized query/command contracts as the visual interface; it is not a privileged parallel API.
12. MP operations can read only physically released data and standalone approved public facts.
13. Hardware transport acceptance does not imply sensor trust or agronomic eligibility.
14. A demo adapter cannot contact a real Farmer or relabel Recorded/Simulated data as Live.
15. Unsupported requests fail safely; no fallback bypasses consent, evidence, source-rights, review or separation-of-duties rules.

## 3. API topology and trust boundaries

Hostnames are environment registry values, not source-code constants. The logical service roots are:

| Service root | Caller | Responsibility |
| --- | --- | --- |
| `https://domain-api.<environment>/v1` | Farmer and RSK applications, authorized internal delegates | Operational reads, commands, sync, media intents and data rights |
| `https://mp-query-api.<environment>/v1` | MP application and delegated MP voice tools | Allowlisted queries over verified release snapshots only |
| `https://voice-gateway.<environment>/v1` | All three applications | Session/ticket creation, proposal lifecycle and HTTPS audio fallback |
| `wss://voice-gateway.<environment>/v1/realtime` | Ticketed application session | Ephemeral live audio and structured voice messages |
| `https://device-ingest.<environment>/ingest/v1` | Registered ESP32/Raspberry Pi gateways | Signed telemetry challenge and durable batch acceptance |
| `https://provider-callback.<environment>/callbacks/v1` | Configured SMS, IVR and notification providers | Provider-native signed callback intake only |
| Internal service roots | Cloud Run service accounts, Cloud Tasks or Jobs | Intelligence, imports, delivery, privacy and scheduled work |

The browser never calls Cloud SQL, BigQuery, Earth Engine, Gemini, SMS/IVR providers or private Cloud Storage directly. The sole exception is a short-lived signed resumable upload URL limited to one quarantine object and exact expected size/type.

### 3.1 Surface isolation

| Surface | Operational API role | Forbidden connection |
| --- | --- | --- |
| Farmer | Owner-scoped Domain API | RSK queues, protected staff notes, MP raw analytics |
| RSK | Office/jurisdiction/capability-scoped Domain API | Unrestricted Farmer search, other-office work, MP release internals |
| MP | Dedicated MP Query API | Domain API operational schemas, raw BigQuery, exact Farmer/Plot/Case/device routes |
| Device | Write-only Device Ingest | Farmer reads, assignments by client assertion, direct evidence promotion |
| Callback provider | Write-only callback intake | Canonical Alert, recipient or attempt mutation |
| Voice Gateway | Delegated typed tool calls | Direct database access or unreviewed command execution |

Requests for forbidden MP route families such as Farmer, Farm, Plot, Case, Sensor, Diary or Media resources return the same safe `404` used for an unknown route. They never reveal that an operational entity exists.

## 4. Representation and versioning

### 4.1 Media types

| Contract | Media type |
| --- | --- |
| Normal JSON | `application/json` |
| Error | `application/problem+json` |
| OpenAPI | `application/vnd.oai.openapi+json;version=3.1` |
| Sync batch | `application/vnd.smart-fasal.sync-batch+json;version=1` |
| Device batch | `application/vnd.smart-fasal.device-batch+json;version=1` |
| Integration event | `application/vnd.smart-fasal.event+json;version=1` |
| Voice HTTPS audio | Registered bounded audio type plus metadata envelope |

Clients send `Accept` explicitly. A missing or unsupported critical version returns `406` or `415`; the server never guesses a payload version.

### 4.2 JSON conventions

- UTF-8 JSON and lower camel case field names.
- UUIDv7 or another approved opaque identifier serialized as a string.
- RFC 3339 UTC timestamps with a `Z`; original local occurrence also carries IANA timezone and numeric offset.
- Decimal values and money are strings with typed unit/currency, never IEEE-754 JSON numbers when rounding matters.
- Geographic geometry uses GeoJSON only on an explicitly C3-authorized endpoint; ordinary views receive coarse geography IDs/labels.
- `null` is not a substitute for Unknown. A typed value uses `valueState` plus `value` only when allowed.
- Lists have deterministic order and stable opaque cursors.
- Free text carries language and classification; broad Integration Events never carry it.
- Response schemas default to `additionalProperties: false`; explicitly extensible metadata is isolated and schema-versioned.

### 4.3 API compatibility

- `/v1` is the transport major version. Additive optional fields do not change it.
- A breaking request/response change requires `/v2` or a separately negotiated media type.
- Commands contain `commandSchemaVersion`; sync records contain `clientEventVersion`; events retain `eventVersion`.
- The server supports the Farmer/RSK queued-command horizon for at least 90 days.
- Removal requires telemetry proving that no supported client build, queue, recovery pack or outbox can still emit the old contract.
- OpenAPI and JSON Schema artifacts are generated, checked in and compared for drift in CI.

## 5. Authentication and request context

### 5.1 End-user authentication

| Caller | Authentication | Additional requirements |
| --- | --- | --- |
| Farmer | Firebase Authentication/Identity Platform bearer token | Valid App Check, active subject-device binding and selected device mode |
| RSK staff | Invite-only Identity Platform bearer token | Staff MFA, active role grant, office/jurisdiction and managed-device policy |
| MP staff | Invite-only Identity Platform bearer token | Staff MFA, active MP grant and dedicated MP application origin |

The server verifies issuer, audience, signature, expiry, revocation/security version and environment. Custom claims are hints for role resolution; current capabilities and grants come from server state. Normal token refresh does not change stable subject-device identity.

### 5.2 Internal authentication

Cloud Run-to-Cloud Run HTTPS uses a dedicated service account and Google-signed identity token whose audience equals the exact target service. Each task/job/subscriber identity has the minimum route and database role. End-user bearer tokens are rejected by internal-only routes.

Delegated voice calls carry a signed internal delegation envelope containing the original stable subject, current role-context reference, purpose, requested tool, consent/access version, session ID and expiry. The receiving API independently reauthorizes all of it.

### 5.3 Standard request headers

| Header | Requirement |
| --- | --- |
| `Authorization: Bearer <token>` | Required for protected browser/API calls; never in URL |
| `X-Firebase-AppCheck` | Required for every protected Farmer/RSK/MP browser call |
| `X-Client-Installation-Id` | Required opaque environment-bound installation ID |
| `X-Client-Build` | Required supported semantic/build identifier |
| `X-Client-Schema-Version` | Required on commands and sync |
| `Idempotency-Key` | Required UUID for every connected command and long-operation creation; sync items use their stable `commandId` instead |
| `If-Match` | Required strong revision ETag on connected mutable aggregate commands/PATCH; sync items use body `expectedRevision` instead |
| `X-Correlation-Id` | Optional valid UUID; server replaces invalid input |
| `Accept-Language` | Preferred supported locale; critical content still returns source language metadata |

`X-Role-Context-Id` may select among already authorized contexts but cannot create authority. RSK and MP operations that require an office or jurisdiction validate it against the current role context.

The only unauthenticated application endpoints are `GET /v1/system/reachability` and the minimum pre-auth `POST /v1/auth/return-states`. Reachability returns no user data. Return-state creation still requires exact approved Origin, valid App Check, strict rate limits and an allowlisted route key; it cannot accept an arbitrary URL. Identity-provider endpoints are provider-controlled rather than App Check recovery exceptions. No protected recovery/sync/media/voice route bypasses App Check.

### 5.4 Standard response headers

| Header | Meaning |
| --- | --- |
| `ETag: "rev:<n>"` | Strong current aggregate/projection revision where applicable |
| `X-Correlation-Id` | Server correlation ID safe to share with support |
| `X-Server-Time` | UTC response time used for offline anchoring |
| `X-Data-As-Of` | Newest authoritative source time for the representation |
| `X-Data-Mode` | `LIVE`, `RECORDED` or `SIMULATED` when applicable |
| `Retry-After` | Seconds or HTTP-date only for a safely retryable response |
| `Content-Language` | Actual response language |

Protected responses use `Cache-Control: private, no-store` unless an endpoint below explicitly permits a versioned private cache. `Vary` includes every header that affects a cacheable representation.

## 6. Authorization contract

Authorization evaluates, in order:

1. Authenticated stable subject and environment.
2. Active role context and capability-set version.
3. Device binding/App Check posture where required.
4. Resource ownership or RSK office/jurisdiction/assignment.
5. Purpose and minimum necessary field set.
6. Current consent/access version and expiry.
7. Separation of duties or review requirement.
8. Entity revision/lifecycle and data-source eligibility.

Missing or stale authorization fails before protected data is loaded. Contact, exact location, Case evidence, assisted-session and Visit pack reads use audit-before-disclose: authorization and immutable Audit fact commit before the data response is constructed.

### 6.1 Capability naming

Capabilities use the stable keys in Documents 04 and 06, including `case.response.draft`, `case.care_plan.issue`, `case.severe.resolve`, `advisory.review.decide`, `alert.draft`, `alert.approve`, `alert.publish`, `alert.delivery.monitor`, `alert.delivery.operate`, `sensor.agronomic_invalidate`, `template.draft`, `template.approve`, `template.publish`, `calendar.review`, `market.support`, `market.mapping.review`, `market.mapping.approve`, `assisted_session.operate`, `visit.manage`, `visit.execute.field`, `visit.execute.sensor`, `visit.outcome.review` and `audit.investigate_sensitive`.

The Capability Registry also defines these exact operational keys; prose such as “matching capability” is forbidden in route metadata: `rsk.work.read`, `rsk.work.operate`, `rsk.work.assign`, `rsk.protected_search`, `rsk.access_grant.issue`, `rsk.protected_disclose`, `case.read`, `case.evidence.request`, `case.follow_up.record`, `case.resolve.routine`, `advisory.review.read`, `outreach.operate`, `sensor.issue.operate`, `sensor.install`, `sensor.calibration.record`, `sensor.maintenance.execute`, `template.read`, `alert.read`, `identity.role_context.select`, `profile.correct` and `device_mode.change`. High-risk keys above remain separately required and are never implied by an operational key.

A capability is not an event, role label or UI visibility flag.

## 7. Command contract

### 7.1 Connected command envelope

The endpoint determines `operation`; clients cannot substitute another operation inside the payload.

```json
{
  "commandSchemaVersion": 1,
  "target": {
    "type": "task",
    "id": "018f..."
  },
  "expectedRevision": 7,
  "payload": {},
  "clientContext": {
    "clientRecordedAt": "2026-07-13T08:10:00+05:30",
    "timezone": "Asia/Kolkata",
    "dataModeClaim": "LIVE"
  }
}
```

The server derives actor, role, subject-device binding, office/jurisdiction, accepted data mode and received time. A client mode claim is evidence only and can never promote an output to Live.

### 7.2 Admission and idempotency

The `Idempotency-Key` is the stable `commandId`. The request hash is SHA-256 over RFC 8785 canonical JSON of operation, command schema, target, expected revision and semantic payload.

| Condition | Result |
| --- | --- |
| New key and authorized request | Claim command lease and execute once |
| Same principal, key and hash; completed | Return exact safe original disposition and references |
| Same principal, key and hash; in progress | `202` with the same operation/command status reference |
| Same principal and key, different hash/operation | `409 idempotency-key-reused` plus security Audit fact |
| Prior sensitive result no longer authorized | Return safe current reference/refusal, never bypass authorization |

The command transaction commits the owned state/fact, command disposition, Domain/Technical Event, destination Integration Events, sync acknowledgement/feed where needed and outbox rows atomically.

### 7.3 Optimistic concurrency

Connected mutable commands require both `If-Match: "rev:<n>"` and the matching `expectedRevision`. A sync item cannot carry per-item HTTP headers: its stable `commandId` is the idempotency identity and body `expectedRevision` is its optimistic precondition. Missing required connected precondition returns `428`. Mismatch returns `409 expected-revision-mismatch` with code `EXPECTED_REVISION_MISMATCH` and:

- Opaque target ID.
- Safe current revision.
- Conflict type and allowed resolution policy.
- Minimum safe current/local summaries when authorized.
- A new command requirement; the original command is never rewritten.

There is no generic last-write-wins endpoint.

### 7.4 Success status

| Status | Use |
| --- | --- |
| `200 OK` | Command changed an existing resource and returns safe result |
| `201 Created` | New authoritative resource created; `Location` uses opaque ID |
| `202 Accepted` | Long/provider work committed as an operation intent |
| `204 No Content` | Narrow idempotent setting/action with no useful body |

An idempotent retry returns the original status semantics and safe body/reference.

### 7.5 Command result

```json
{
  "commandId": "018f...",
  "disposition": "ACCEPTED",
  "result": {
    "type": "taskResponse",
    "id": "018f...",
    "revision": 8
  },
  "eventIds": ["018f..."],
  "syncAcknowledgementId": "018f...",
  "serverReceivedAt": "2026-07-13T02:40:04Z"
}
```

Allowed dispositions are `ACCEPTED`, `ALREADY_ACCEPTED`, `REJECTED`, `CONFLICT` and `IN_PROGRESS`. A rejection contains only stable problem codes and never masquerades as a Domain fact.

## 8. Read and projection contract

### 8.1 Resource response

Every decision/action projection includes, as applicable:

- Opaque identity and revision.
- Current lifecycle/execution state.
- `dataAsOf`, `freshnessState`, `dataMode` and `provenanceTypes`.
- Evidence/source version references and limitations.
- `availableActions` already filtered by current authorization, but rechecked on command.
- `syncState` when locally pending work affects truthfulness.
- Replacement/correction reference when the viewed version is stale.

### 8.2 Pagination

List query parameters are `limit` and `cursor` plus an endpoint-specific allowlist. Pilot default is 25 and hard maximum 100. The signed opaque cursor binds:

- Environment and stable subject/role scope.
- Endpoint and normalized allowlisted filters.
- Sort key and deterministic ID tie-breaker.
- Snapshot/high-water mark when consistency requires it.
- Expiry and authorization version.

Changing filters with an old cursor returns `400 cursor-filter-mismatch`. Expired feed cursors use the sync-specific bootstrap response, not a generic empty page.

### 8.3 Filtering and sorting

No arbitrary field, SQL expression, geography polygon or dimension is accepted. Endpoints publish exact enums, such as Work state/priority, Case severity, Task due band, Alert view, trusted signal type or released MP metric/dimension. Unknown filters return `400 unsupported-filter`.

### 8.4 Conditional reads

Safe current projections may support `If-None-Match`. A `304` response cannot extend the source freshness/expiry displayed by the client. Google Weather display content is not stored in an offline cache past contractual TTL even if the HTTP validator remains unchanged.

## 9. Error contract

Errors follow RFC 9457-compatible `application/problem+json`:

```json
{
  "type": "https://problems.smart-fasal.invalid/expected-revision-mismatch",
  "title": "This item changed",
  "status": 409,
  "code": "EXPECTED_REVISION_MISMATCH",
  "correlationId": "018f...",
  "retryable": false,
  "fieldErrors": []
}
```

Problem `detail` is optional, localized and safe. It never contains a provider secret, stack trace, SQL text, phone, exact location, protected evidence, request body or proof that an unauthorized opaque ID exists.

| HTTP | Stable problem families |
| --- | --- |
| `400` | Invalid schema/value/unit, unsupported filter, cursor mismatch |
| `401` | Missing/invalid/expired authentication |
| `403` | Known route but current actor lacks a general capability; use safe wording |
| `404` | Unknown or existence-hidden resource/route |
| `409` | Revision, idempotency, lifecycle, assignment or typed sync conflict |
| `410` | Authorized resource/ticket/cursor permanently expired or replaced, with safe recovery link |
| `412` | ETag/precondition evaluated false on a supported conditional operation |
| `413` | Payload or batch too large; media must use upload protocol |
| `415` | Unsupported media/schema version |
| `422` | Syntactically valid but unsafe/ineligible domain request with typed reason |
| `428` | Required `If-Match`/idempotency precondition missing |
| `429` | Rate limited with bounded `Retry-After` |
| `503` | Dependency unavailable and no safe retained fallback |

Authorization errors, provider failures, decision unavailability and validation failures remain distinct.

## 10. Pilot limits and timeouts

These are launch ceilings, enforced server-side and configurable only to stricter values without a reviewed contract change.

| Class | Pilot ceiling |
| --- | --- |
| Normal JSON request | 256 KiB |
| Normal JSON response page | 1 MiB compressed boundary; use pagination |
| Sync batch | 100 commands/events and 512 KiB, whichever comes first |
| Device batch | 500 observations and 256 KiB, whichever comes first |
| Voice WebSocket audio frame | 64 KiB; bounded buffered audio and backpressure required |
| Crop-health image | 10 MiB each, maximum approved count from Feature Registry |
| Other supported media | Purpose-specific allowlist, never generic arbitrary file upload |
| Default list | 25 rows; maximum 100 |
| Synchronous API work | Target under 15 seconds; provider/compute work returns `202` |
| Command execution lease | Short bounded lease with safe recovery; never held during provider I/O |
| Voice ticket | Single use and expiry measured in minutes |
| Resumable upload intent | Short purpose-specific expiry; exact object/size/type only |

Pilot rate policies are identity + installation/device + endpoint class + source-IP-risk based:

| Class | Initial ceiling |
| --- | --- |
| Normal reads | 120/minute/subject, with lower expensive-query sublimits |
| Connected commands | 60/minute/subject; bulk routes have explicit lower limits |
| Sync | 12 batches/minute/installation with server backpressure |
| Voice session creation | 6/10 minutes/subject; one active live session per role context by default |
| Upload intent | 30/hour/subject and stricter Crop Health/Assisted limits |
| Farmer export | 3/day/subject |
| Deletion request | 3/day/subject plus reauthentication |
| Device ingest | Six sustained and twelve burst batches/minute/gateway, plus signal-frequency plausibility checks |
| MP queries | 60/minute/subject with query-shape and differencing controls |
| Provider callbacks | Provider/account policy plus replay identity; never drop solely because of a client quota |

Rate-limit state cannot become a source of cross-subject existence leakage.

## 11. Farmer API catalogue

All Farmer routes derive `farmerSubjectId` from authentication. A path never contains a subject ID. Ownership, device mode, current consent and Plot/Season relationship are rechecked server-side.

### 11.1 Bootstrap, profile and consent

| Method and path | Operation | Preconditions | Transaction/result | Canonical events |
| --- | --- | --- | --- | --- |
| `GET /v1/farmer/bootstrap` | Read Farmer shell context | Farmer role, device binding | Profile/onboarding state, safe farms/plots, selected context, locale, capabilities, authorization version and sync summary | None |
| `GET /v1/farmer/consents` | Read current/history | Owner | Scope/purpose decisions and access state; no staff-private notes | None |
| `POST /v1/farmer/consent-decisions` | `RecordConsentDecision` | Reauthentication for sensitive withdrawal; policy wording version | Decision + current access version; withdrawal also invalidates grants/operations atomically | `consent.decision_recorded`; applicable registered effects emit exact `sensor.collection_stopped`, `sensor.location_access_revoked`, `sensor.deassigned`, `visit.access_revoked` or `alert.push_registration_revoked` |
| `POST /v1/farmer/setup-drafts` | `SaveFarmerSetup` | Farmer role; offline-compatible schema | Setup aggregate/snapshot, same outcome on replay | `farmer.setup_saved` |
| `POST /v1/farmer/setup:complete` | `CompleteFarmerSetup` | Valid setup draft/revision; hardware optional | Farmer profile, Farm/Plot and readiness snapshot all-or-none | `farmer.setup_completed`, relevant `farm.created`, `plot.created`, `profile.snapshot_created` |
| `PATCH /v1/farmer/preferences` | `ChangeFarmerPreferences` | Explicit field allowlist and `If-Match` | Immutable preference version + profile pointer | `farmer.preferences_changed` |
| `PATCH /v1/farmer/profile` | `CorrectFarmerProfile` / `profile.correct` | Fresh owner authorization, explicit field allowlist and `If-Match` | Private/profile correction + new profile snapshot | `profile.snapshot_created` |
| `POST /v1/farmer/device-mode-changes` | `ChangeDeviceMode` / `device_mode.change` | Reauthentication, no unsafe cross-user partition, locked recovery for unsynced data | New subject-device binding/access version and client repartition instruction | `identity.device_mode_changed` plus Audit fact |

Consent scopes are separate registered values for location, stored audio, Case sharing, Visit, assisted service, push/app, SMS, IVR and private market-field support. A combined “accept all” payload is rejected.

### 11.2 Farms, Plots, soil, water and Seasons

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET/POST /v1/farmer/farms` | List / `CreateFarm` | Owner; POST idempotent | `farm.created` |
| `GET/PATCH /v1/farmer/farms/{farmId}` | Read / `CorrectFarm` | Owner; PATCH `If-Match` allowlist | `farm.updated` |
| `POST /v1/farmer/farms/{farmId}/plots` | `CreatePlot` | Owner; area/unit validated | `plot.created` |
| `GET/PATCH /v1/farmer/plots/{plotId}` | Read / `CorrectPlot` | Owner; expected revision | `plot.updated` |
| `POST /v1/farmer/plots/{plotId}/geometry-versions` | `RecordPlotGeometry` | Current location consent; explicit capture method | New immutable geometry and Plot pointer; `plot.updated` |
| `POST /v1/farmer/plots/{plotId}/soil-records` | `AddSoilRecord` | Typed source/date/unit/value state | `soil_record.added` |
| `POST /v1/farmer/plots/{plotId}/water-context-versions` | `UpdateWaterContext` | Typed known/unknown fields | `water_context.updated` |
| `POST /v1/farmer/plots/{plotId}/crop-history` | `RecordCropHistory` | No unsupported causal claim | Owning history fact; `farm.crop_history_recorded` and `profile.snapshot_created` when snapshot regenerated |
| `GET/POST /v1/farmer/plots/{plotId}/seasons` | List / `CreateSeason` | Owner; crop profile version | `season.created` |
| `POST /v1/farmer/seasons/{seasonId}/start-confirmations` | `ConfirmSeasonStart` | Proposed/actual distinction, expected revision | `season.start_confirmed`, `season.activated` when eligible |
| `POST /v1/farmer/seasons/{seasonId}/harvest-facts` | `RecordHarvestFact` | Readiness/window/actual fact kind | `harvest.window_confirmed`, `harvest.readiness_updated` or `harvest.actual_recorded` |

Exact geometry responses are C3, `private, no-store` and audit-before-disclose. The normal Plot response contains only safe display geometry or coarse map context approved for that screen.

### 11.3 Today, Recommendation and Advisory

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/farmer/today` | Read daily briefing | Owner; optional allowlisted farm/plot context | Dated briefing/cards with sources, mode, freshness and destinations |
| `POST /v1/farmer/today/{briefingId}/interactions` | `RecordTodayInteraction` | Product telemetry consent/policy | `today.briefing_played`, `today.primary_action_selected` or `today.card_opened`; never task completion |
| `GET /v1/farmer/plots/{plotId}/recommendation-readiness` | Validate inputs | Owner | Confirmed/Unknown/Needs Review breakdown; no mutation |
| `POST /v1/farmer/plots/{plotId}/recommendation-runs` | `RequestRecommendation` | Evidence/source rights and supported crop/geography context | `202` operation; `recommendation.requested` |
| `GET /v1/farmer/recommendation-runs/{operationId}` | Poll run | Owner | Pending/succeeded/no-safe-result/failed safe state |
| `GET /v1/farmer/recommendations/{recommendationId}` | Read result/evidence | Owner | Ranked eligible candidates, exclusions, component scores and limitations |
| `POST /v1/farmer/recommendations/{recommendationId}/review-requests` | `RequestRecommendationReview` | Current result; purpose | RSK Work; `recommendation.review_requested` |
| `POST /v1/farmer/recommendations/{recommendationId}/acceptances` | `AcceptRecommendation` | Current evidence/rules/template and no prior acceptance | Acceptance + one Season + Calendar/Tasks atomically; `recommendation.accepted`, `season.created`, `calendar.instantiated` and one `calendar.task_created` per initial Task |
| `GET /v1/farmer/advisories` | List applicable history | Owner; Plot/Season filter allowlist | Current/cancelled/replaced versions with freshness |
| `GET /v1/farmer/advisories/{advisoryId}` | Read exact version/current link | Owner | Action, evidence, confidence, validity, limitations and replacement |
| `POST /v1/farmer/advisories/{advisoryId}/responses` | `RespondToAdvisory` | Version-bound response | `farmer.response_recorded`, `constraint.recorded` or `advisory.disputed`; follow-up Work when policy qualifies |

Recommendation input and output schemas are defined in Document 08. The API never accepts client-supplied ranking weights, hard-gate overrides or arbitrary crop IDs.

### 11.4 Calendar, Tasks and Diary

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/farmer/calendars` | Read agenda | Owner; allowlisted farm/plot/due/status filter | Cursor page with plan/actual separation |
| `GET /v1/farmer/seasons/{seasonId}/calendar` | Read Season Calendar | Owner | Stages, Task versions, source/advisory links and last sync |
| `GET /v1/farmer/tasks/{taskId}` | Read Task | Owner | Current plan, change history, evidence and responses |
| `POST /v1/farmer/tasks/{taskId}/responses` | `RespondToTask` | Expected Task revision; response enum | Exact `calendar.task_completed`, `calendar.task_partially_completed`, `calendar.task_blocked` or `calendar.task_cancelled`; actual work also emits `diary.activity_recorded` atomically |
| `POST /v1/farmer/tasks/{taskId}/reminders` | `RequestTaskReminder` | Current Task/Alert binding, due window | `calendar.reminder_requested`; local scheduling remains local fact |
| `GET/POST /v1/farmer/diary-entries` | List / `RecordDiaryActivity` | Owner; POST typed occurrence/time/unit | `diary.activity_recorded` or `diary.observation_recorded` |
| `GET /v1/farmer/diary-entries/{entryId}` | Read immutable history | Owner | Original plus correction/void chain |
| `POST /v1/farmer/diary-entries/{entryId}/corrections` | `CorrectDiaryEntry` | New command; original unchanged | `diary.entry_corrected` |
| `POST /v1/farmer/diary-entries/{entryId}:void` | `VoidDiaryEntry` | Reason and expected logical state | `diary.entry_voided` |
| `GET /v1/farmer/seasons/{seasonId}/summary` | Read factual summary | Owner | Planned-versus-actual counts and known harvest; no causal-yield claim |

Farmer responses are exact enums: `DONE`, `PARTLY_DONE`, `CANNOT_DO`, `SKIPPED_WITH_REASON`, `REMIND`, `DISPUTES_ADVICE` and registered equivalents. `OVERDUE` is derived time state, never a Farmer response.

### 11.5 Crop Health, Cases and Farmer help

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `POST /v1/farmer/health-reports` | `CreateHealthReportDraft` | Plot/Season/crop, structured symptoms, explicit unknowns | Server draft only; no `health_report.synced` yet |
| `PATCH /v1/farmer/health-reports/{reportId}` | `UpdateHealthReportDraft` | Draft only, expected revision | New structured answer versions; no diagnosis |
| `POST /v1/farmer/health-reports/{reportId}:submit` | `SubmitHealthReport` | Minimum structured report; media may still be pending | Exactly-once structured acceptance emits `health_report.synced`; triage operation and later `health_report.triage_ready` when prerequisites hold |
| `GET /v1/farmer/health-reports/{reportId}` | Read triage/current status | Owner | Possible categories/unclear state, severity, limits and Case link |
| `POST /v1/farmer/health-reports/{reportId}/sharing-decisions` | `DecideCaseSharing` | Current policy/read-back | Consent decision; Case/evidence pack/Work only on Allow |
| `GET /v1/farmer/cases` | List Farmer-visible Cases | Owner | Minimum safe Case state and next action |
| `GET /v1/farmer/cases/{caseId}` | Read own Case | Owner and current access | Farmer-visible timeline, evidence requests and care plan |
| `POST /v1/farmer/cases/{caseId}/evidence-responses` | `AnswerCaseEvidenceRequest` | Current request; minimum necessary fields | New evidence fact/attachment, Case event |
| `POST /v1/farmer/cases/{caseId}/follow-ups` | `RecordCaseFollowUp` | Owner; structured outcome | `case.follow_up_recorded` |
| `POST /v1/farmer/help-requests` | `RequestRSKHelp` | Reviewed purpose and sharing scope | Appropriate Case/support/Work; never broad evidence by default |

Without Case-sharing consent, the result is `Escalation Recommended - Sharing Declined`; no evidence-pack or RSK evidence endpoint becomes readable.

### 11.6 Live Farm Monitor and devices

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/farmer/plots/{plotId}/live-monitor` | Read current trusted projection | Owner | Last trusted signals, freshness, calibration/trust labels, action; no raw private device secret |
| `GET /v1/farmer/plots/{plotId}/signals/{signalType}` | Read allowlisted trend | Owner; signal enum/date-range ceiling | Original/normalized units, quality intervals and source limitations |
| `GET /v1/farmer/devices/{deviceId}` | Read Farmer-safe device | Owner through active assignment | Connectivity, last seen, maintenance state; no credential/precise installation secret |
| `POST /v1/farmer/devices/{deviceId}/problem-reports` | `ReportSensorProblem` | Owner; structured reason | Sensor Issue/RSK Work; `sensor.issue_created` |

No Farmer endpoint can set a calibration, trust interval, assignment, data mode or agronomic invalidation.

### 11.7 Alerts and multichannel responses

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/farmer/alerts` | List `NOW`, `LATER` or `HISTORY` | Owner; allowlisted view | Canonical threads/current versions; recipient state remains separate |
| `GET /v1/farmer/alerts/{alertId}` | Read canonical Alert version | Owner and frozen membership/current access | Action/source/validity/official warning/replacement and channel history |
| `POST /v1/farmer/canonical-alert-versions/{canonicalVersionId}/interactions` | `RecordAlertInteraction` | Exact canonical version | Only `alert.opened_or_heard` or `alert.acknowledged`; never a structured response |
| `POST /v1/farmer/canonical-alert-versions/{canonicalVersionId}/responses` | `RespondToAlert` | Version-bound enum and optional allowlisted constraint | Exactly one `alert.response_recorded`; may cancel pending fallbacks or create outreach |
| `PATCH /v1/farmer/alert-preferences` | `UpdateAlertPreferences` | Separate channel consent/current preference revision | Preference version; does not rewrite frozen cohort/history |
| `POST /v1/farmer/push-registrations` | `RegisterPushEndpoint` | Subject-device binding, environment and push consent | Versioned registration; `alert.push_registration_created`/rotated |
| `POST /v1/farmer/push-registrations/{registrationId}:revoke` | `RevokePushEndpoint` | Current binding or security operation | `alert.push_registration_revoked` |

The API never returns a status that conflates Provider Accepted, Delivered, Reached, Heard/Open, Acknowledged and Farmer response.

### 11.8 Harvest, Mandi Price and Market Watch

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/farmer/seasons/{seasonId}/market-comparisons` | Read compatible public records | Owner | Dated source, market, grade/form/unit, freshness/caveats; unmapped/incompatible excluded |
| `GET /v1/farmer/seasons/{seasonId}/market-trends` | Read reporting-day trend | Owner; bounded period | No fabricated continuous/live price |
| `POST /v1/farmer/seasons/{seasonId}/private-net-estimates` | Calculate private indicative range | Owner; private input not retained unless explicitly saved | Response `private, no-store`; never MP candidate |
| `GET/POST /v1/farmer/market-watches` | List / `CreateMarketWatch` | Owner; private threshold C3 | `market.watch_created` |
| `GET /v1/farmer/market-watches/{watchId}` | Read Watch | Owner | Private target, comparison versions and last evaluation |
| `POST /v1/farmer/market-watches/{watchId}/actions` | Pause/resume/update/cancel/complete | Expected revision and action enum | Exact `market.watch_paused`, `market.watch_resumed`, `market.watch_updated`, `market.watch_cancelled` or `market.watch_completed` |
| `POST /v1/farmer/market-support-requests` | `RequestMarketSupport` | Reviewed private-field consent set | RSK Work and `market.support_created` |
| `POST /v1/farmer/seasons/{seasonId}/sale-events` | `RecordSaleEvent` | Owner; private fact | Private fact + restricted `market.sale_recorded`; excluded from MP/credit/insurance uses |

### 11.9 Data rights

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `POST /v1/farmer/data-exports` | `RequestDataExport` | Fresh reauthentication, scope and device binding | `202` operation; `data.export_requested` |
| `GET /v1/farmer/data-exports/{exportId}` | Read status | Same currently authorized subject | Safe state/categories/exclusions; no artifact URL |
| `POST /v1/farmer/data-exports/{exportId}:retry` | `RetryExportPreparation` | Retryable failed operation, idempotency | `data.export_preparation_started`; same/new governed operation state |
| `POST /v1/farmer/data-exports/{exportId}/retrieval-tickets` | Create one-time retrieval | Fresh authorization and ready artifact | Actor/origin-bound short ticket; no object URL |
| `DELETE /v1/farmer/data-exports/{exportId}/artifact` | `DeletePreparedExport` | Same subject, expected export revision | `data.export_artifact_deleted` |
| `POST /v1/farmer/data-exports/{exportId}:cancel` | Cancel | Current subject | `data.export_cancelled` |
| `POST /v1/farmer/deletion-requests` | `RequestDataDeletion` | Fresh reauthentication, explicit scope/read-back | Externally acknowledged deletion intent then `data.deletion_requested` |
| `GET /v1/farmer/deletion-requests/{requestId}` | Read safe status | Requester | Operation classes and safe completion/failure only |

An export authorization failure aborts the whole requested scope rather than returning an accidental partial sensitive archive. Deletion completion is not emitted until the independent external ledger has acknowledged the Applied outcome.

`POST /v1/artifact-retrievals` is the only v1 ticket-redemption route for Farmer exports and MP Briefing exports. It requires bearer/App Check and body `{ "ticket": "<one-time-secret>" }`; the ticket is stored only as a hash, expires within five minutes, is bound to environment/actor/role/origin/artifact generation and is consumed once. Redemption rechecks current authorization and streams the pinned object with `private, no-store`. The ticket never appears in a URL/log. Successful Farmer redemption emits `data.export_retrieved`.

## 12. RSK API catalogue

Every RSK list and resource is scoped by the current office/jurisdiction, capability set and purpose. Exact Farmer data is not returned by ordinary queue endpoints.

### 12.1 RSK bootstrap, Work and protected access

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/rsk/bootstrap` | Read staff shell | MFA, active RSK grant | Office/jurisdiction/capabilities, queue counts, safe provider/device health |
| `GET /v1/rsk/work-items` | List Work / `rsk.work.read` | Current office/jurisdiction; fixed filters/sorts | Masked cursor page; no contact/evidence body |
| `GET /v1/rsk/work-items/{workId}` | Read Work summary / `rsk.work.read` | In scope | Typed source link, priority/SLA/current assignment and available actions |
| `POST /v1/rsk/work-items/{workId}/actions` | Registered Work action matrix below | `rsk.work.operate` or `rsk.work.assign`, plus owning high-risk capability when required; expected Work revision | Exact assignment/lifecycle facts/events from matrix |
| `POST /v1/rsk/protected-searches` | Masked Farmer lookup / `rsk.protected_search` | Declared service purpose, strong rate limit | Minimum candidates; `assisted.search_attempted` Audit fact |
| `POST /v1/rsk/access-grants` | Verify Farmer/consent and issue access / `rsk.access_grant.issue` | Purpose, typed target, current decision | Time-bound grant and Audit fact |
| `POST /v1/rsk/protected-disclosures` | Read contact/location/evidence field set / `rsk.protected_disclose` plus mapped owner key below | Active claim/grant; audit-before-disclose | Minimum fields after committed allow Audit fact; deny reveals nothing |

Work resolution revalidates the owning Case/Issue/Outreach/Support outcome and mandatory follow-up. Assignment/open/draft/automated acknowledgement cannot set first substantive response.

Protected-disclosure owner-key mapping is closed: `CASE_EVIDENCE` or `CASE_CONTACT` requires `case.read`; `OUTREACH_CONTACT` requires `outreach.operate`; `VISIT_LOCATION`/`VISIT_PACK` requires `visit.execute.field` for FIELD class or `visit.execute.sensor` for SENSOR class; `SENSOR_MAINTENANCE_LOCATION` requires `sensor.maintenance.execute`; `MARKET_PRIVATE_FIELDS` requires `market.support`; `ASSISTED_FARMER_CONTEXT` requires `assisted_session.operate`. Unknown target kinds are rejected and cannot fall back to `rsk.protected_disclose` alone.

### 12.2 Case and expert workspace

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/rsk/cases` | List Cases / `case.read` | Office/jurisdiction | Masked severity/state/priority |
| `GET /v1/rsk/cases/{caseId}` | Read overview / `case.read` | Active purpose/assignment | Minimum Case read model |
| `POST /v1/rsk/cases/{caseId}/evidence-disclosures` | `case.read` | Current pack/access grant; audit-before-disclose | Authorized evidence refs; `case.evidence_accessed` Audit fact |
| `POST /v1/rsk/cases/{caseId}/evidence-requests` | Request Farmer evidence / `case.evidence.request` | Expected Case revision | `case.evidence_requested` |
| `POST /v1/rsk/cases/{caseId}/response-drafts` | `case.response.draft` | Current sources; no authority claim | Draft only; not Farmer-visible care plan |
| `POST /v1/rsk/cases/{caseId}/care-plans` | `case.care_plan.issue` | Authorized expert, current approved sources and follow-up | Immutable care plan; `case.care_plan_issued` |
| `POST /v1/rsk/cases/{caseId}/follow-ups` | Record expert follow-up / `case.follow_up.record` | Active Case, expected revision | `case.follow_up_recorded` |
| `POST /v1/rsk/cases/{caseId}/resolutions` | Routine `case.resolve.routine` or High/Critical `case.severe.resolve` | Expected Case revision and mandatory follow-up | Resolution/Work interval; exact `case.resolved` and `case.closed` when terminal |
| `POST /v1/rsk/cases/{caseId}:reopen` | Reopen / `case.resolve.routine` or `case.severe.resolve` by severity | Expected revision/reason | New interval; `case.reopened` |

Chemical/brand/formulation/dose/mixture, re-entry and pre-harvest instructions are accepted only from the separately authorized expert contract and current governed content. Generative text cannot populate them as authority.

### 12.3 Advisory and Calendar reviews

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/rsk/advisory-reviews` | List review Work / `advisory.review.read` | Office/jurisdiction | Safe frozen context |
| `POST /v1/rsk/advisory-reviews/{reviewId}:claim` | Claim / `advisory.review.decide` | Expected revision | `advisory.review_claimed` |
| `POST /v1/rsk/advisory-reviews/{reviewId}/evidence-disclosures` | Read evidence / `advisory.review.read` | Consent/purpose, audit-before-disclose | `advisory.evidence_accessed` Audit fact |
| `POST /v1/rsk/advisory-reviews/{reviewId}/decisions` | `advisory.review.decide` | Current frozen evidence/source/rules | `advisory.review_decided` |
| `POST /v1/rsk/advisories/{advisoryId}:publish` | Publish approved Advisory / `advisory.review.decide` | Approved version and fresh dependencies | Advisory + dependent Tasks + policy Alert atomically; `advisory.published` |
| `GET /v1/rsk/calendar-reviews` | List Calendar reviews | `calendar.review` | Safe Season/plan summaries |
| `POST /v1/rsk/calendar-reviews/{reviewId}/decisions` | Approve/request confirmation/no-change/reject/expire | Expected review revision | `calendar.review_decided` |
| `POST /v1/rsk/calendar-change-applications` | Apply approved change | Current Farmer Season/Task revisions | Atomic new Task versions; `calendar.change_applied` |

### 12.4 Alert governance, delivery and outreach

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET/POST /v1/rsk/alert-drafts` | List / `alert.draft` | Draft capability | Create emits `alert.draft_created`; list emits none |
| `PATCH /v1/rsk/alert-drafts/{draftId}` | Edit Draft | Creator/editor, expected revision, allowlisted structure | New draft version; no canonical Alert |
| `POST /v1/rsk/alert-drafts/{draftId}:submit` | Submit | Valid sources/policy | `alert.draft_submitted` |
| `POST /v1/rsk/alert-drafts/{draftId}/reviews` | `alert.approve` with action Approve/Request Changes/Reject | Reviewer differs where required | Exact `alert.draft_approved`, `alert.changes_requested` or `alert.draft_rejected`; still not published |
| `POST /v1/rsk/alert-drafts/{draftId}:publish` | `alert.publish` | Approved current version and source validity | Canonical version + lifecycle + frozen cohort atomically; `alert.draft_published`, `alert.version_created`, `alert.cohort_frozen` |
| `POST /v1/rsk/canonical-alerts/{alertId}/corrections` | Correct/replace/cancel / `alert.publish` | Governing authority/source version | New `alert.version_created` plus exact `alert.corrected`, `alert.replaced` or `alert.cancelled`; old content immutable |
| `GET /v1/rsk/delivery-health` | `alert.delivery.monitor` | Operational scope | Provider/attempt/incident read model only |
| `POST /v1/rsk/delivery-incidents/{incidentId}/actions` | Exact delivery action / `alert.delivery.operate` | Expected Incident revision | Exact action matrix below; retry creates new attempt, never edits terminal provider fact |
| `GET /v1/rsk/outreach` | List urgent/help/wrong-recipient Work / `outreach.operate` | Office/jurisdiction | Masked recipient context |
| `POST /v1/rsk/outreach/{outreachId}/actions` | Exact outreach action / `outreach.operate` | Expected Outreach revision; contact disclosure separately audited | Exact action matrix below; cannot set provider delivery state |

### 12.5 Sensor installation, issues and maintenance

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/rsk/sensor-issues` | List Issues / `sensor.issue.operate` | Office/jurisdiction | Device/assignment safe context |
| `GET /v1/rsk/sensor-issues/{issueId}` | Read Issue / `sensor.issue.operate` | Office/jurisdiction/current assignment | Issue history, trust refs, Work and available actions |
| `GET /v1/rsk/devices` | List devices / `sensor.install` or `sensor.issue.operate` | Office/jurisdiction, fixed filters | Masked device/assignment/health projections |
| `GET /v1/rsk/devices/{deviceId}` | Read device / one of exact `sensor.install`, `sensor.issue.operate` or `sensor.maintenance.execute` selected by requested view | Current office/assignment/purpose | Device/channel/calibration/Issue/maintenance read model; no credential secret |
| `POST /v1/rsk/sensor-issues/{issueId}/actions` | Triage/Mitigate/Resolve/Reopen / `sensor.issue.operate` | Expected revision | Exact `sensor.issue_triaged`, `sensor.issue_mitigation_recorded`, `sensor.issue_resolved` or `sensor.issue_reopened` |
| `POST /v1/rsk/devices` | Register physical device / `sensor.install` | No secret returned after issue | Device and credential provisioning; `sensor.device_registered` |
| `POST /v1/rsk/device-assignments` | Assign device/channel / `sensor.install` | Current collection/location consent, Plot and overlap rules | Assignment lifecycle; exact `sensor.installed` and `sensor.activated` when qualified |
| `POST /v1/rsk/channels/{channelId}/calibration-profiles` | Record calibration / `sensor.calibration.record` | Technician method/source, expected Channel revision | Immutable calibration version; `sensor.calibration_recorded` |
| `POST /v1/rsk/maintenance-work-orders` | Create/assign maintenance / `sensor.issue.operate` | Sensor Issue/Visit source, expected Issue revision | Work order and Work/Visit refs; `sensor.maintenance_requested` |
| `POST /v1/rsk/sensor-invalidations` | `sensor.agronomic_invalidate` | Agronomy Expert, exact interval/rule/reason | Invalidation + complete dependency-impact operation; `sensor.interval_invalidated` |

A Technician can mark readings suspect but cannot make the agronomic invalidation decision unless separately granted the required capability.

### 12.6 Market support and mapping governance

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/rsk/market-support-requests` | List support Work / `market.support` | Office/jurisdiction | Private values withheld until grant |
| `POST /v1/rsk/market-support-requests/{requestId}/actions` | Exact support action / `market.support` | Expected Request/Work revision | Exact matrix below |
| `GET /v1/rsk/market-mappings` | List unmapped/high-impact cases / `market.mapping.review` | Office/source scope | Source terms/affected public record counts |
| `POST /v1/rsk/market-mappings/{mappingId}/decisions` | `market.mapping.review` | Claim or Exact/With Caveat/Incompatible/Reject/Supersede | Exact `market.mapping_claimed`, `market.mapping_decided`, `market.mapping_rejected` or `market.mapping_superseded` |
| `POST /v1/rsk/market-mappings/{mappingId}:approve` | `market.mapping.approve` | Creator differs for high impact | `market.mapping_approved`, then `market.reprocessing_started`; completion/failure emitted by worker |
| `POST /v1/rsk/market-mappings/{mappingId}:rollback` | `market.mapping.approve` | Approved prior target | `market.mapping_rollback_started`, `market.mapping_rolled_back`, then reprocessing event |

### 12.7 Template governance

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET/POST /v1/rsk/calendar-templates` | List / `template.draft` | Agronomy/template scope | Definition and immutable draft version |
| `POST /v1/rsk/calendar-templates/{templateId}/versions` | Create version | Typed stages/tasks/dependencies/sources | `template.version_created` |
| `POST /v1/rsk/calendar-template-versions/{versionId}:validate` | Deterministic validation | No activation | Validation report only |
| `POST /v1/rsk/calendar-template-versions/{versionId}:submit` | Submit | Valid DAG/sources | `template.submitted` |
| `POST /v1/rsk/calendar-template-versions/{versionId}/reviews` | `template.approve` | Separation of duties; action Approve/Request Changes | Exact `template.approved` or `template.changes_requested` |
| `POST /v1/rsk/calendar-template-versions/{versionId}:publish` | `template.publish` | Approved and effective policy | Alias compare-and-swap; `template.published` |
| `POST /v1/rsk/calendar-templates/{templateId}:rollback` | Rollback | Approved compatible target | `template.rolled_back` |

### 12.8 Assisted sessions and Field Visits

| Method and path | Operation/capability | Required contract | Result/events |
| --- | --- | --- | --- |
| `POST /v1/rsk/assisted-sessions` | `assisted_session.operate` | Farmer verified, purpose/consent, managed device | Expiring partitioned session; `assisted.session_started` |
| `GET /v1/rsk/assisted-sessions/{sessionId}` | Read session shell | Same officer/device, active versions | Minimum Farmer view; no cross-session cache |
| `POST /v1/rsk/assisted-sessions/{sessionId}/commands` | Delegated Farmer command | Read-back confirmation, both attributions | Same Farmer command transaction + `assisted.mutation_confirmed` and receipt |
| `POST /v1/rsk/assisted-sessions/{sessionId}:end` | End/revoke | Sync complete or locked recovery | Receipt/revocation/purge flow |
| `GET/POST /v1/rsk/visits` | List / `visit.manage` | Office/jurisdiction and typed source | `visit.requested` |
| `GET /v1/rsk/visits/{visitId}` | Read Visit / `visit.manage`, `visit.execute.field` or `visit.execute.sensor` | Manager in jurisdiction or current matching assignee | Schedule/assignment/purpose/outcome state; protected pack/location excluded until separate grant |
| `POST /v1/rsk/visits/{visitId}/actions` | Registered Visit management action / `visit.manage` | Expected Visit revision | Exact event matrix below; old pack revoked on reassignment/cancel |
| `POST /v1/rsk/visits/{visitId}/outcome-reviews` | `visit.outcome.review` | Accepted synced outcome, reviewer authority | `visit.outcome_reviewed`, completion/closure as qualified |

The dedicated offline-pack protocol is specified in Section 15.

### 12.9 Exact RSK action matrices

Every action body is a discriminated union. Unknown action names and fields are rejected. All rows require `Idempotency-Key`, `If-Match` and matching expected revision unless the row is an append-only disclosure/observation command with an explicitly named parent revision.

#### Work actions

| Action | Capability | Atomic write | Exact event |
| --- | --- | --- | --- |
| `ASSIGN`, `REASSIGN` | `rsk.work.assign` | Assignment projection + assignment fact + Work revision | `rsk.work_assigned` |
| `CLAIM` | `rsk.work.operate` | Current assignment/claim + Work revision | `rsk.work_claimed` |
| `START` | `rsk.work.operate` | Work lifecycle fact/projection | `rsk.work_started` |
| `RESUME` | `rsk.work.operate` | Work lifecycle fact/projection | `rsk.work_resumed` |
| `AWAIT_FARMER` | `rsk.work.operate` | Waiting reason/follow-up | `rsk.work_waiting` |
| `SCHEDULE` | `rsk.work.operate` | Schedule fact/projection | `rsk.work_scheduled` |
| `RESOLVE` | `rsk.work.operate` | Only registered `GENERAL_SERVICE` Work; terminal reason + closed interval | `rsk.work_resolved` |
| `REOPEN` | `rsk.work.operate` | Only registered `GENERAL_SERVICE` Work; new service interval | `rsk.work_reopened` |
| `CANCEL` | `rsk.work.operate` | Terminal reason | `rsk.work_cancelled` |
| `MARK_DUPLICATE` | `rsk.work.operate` | Canonical Work link and terminal reason | `rsk.work_marked_duplicate` |

Typed-source Work cannot use generic `RESOLVE`/`REOPEN`. Its owning endpoint performs the domain transition and Work/service-interval transition in one transaction: Case emits exact `case.resolved`/`case.reopened`, Sensor Issue `sensor.issue_resolved`/`sensor.issue_reopened`, Outreach `outreach.resolved`, Market Support `market.support_resolved`/`market.support_closed`, Advisory `advisory.review_decided`/`advisory.published`, Calendar `calendar.review_decided`/`calendar.change_applied`, or Visit `visit.completed`/`visit.closed`, together with `rsk.work_resolved` or `rsk.work_reopened` where applicable. Unknown source kinds are rejected.

#### Delivery, Outreach and Market Support actions

| Route/action | Capability | Exact result/event |
| --- | --- | --- |
| Delivery `TRIAGE` | `alert.delivery.operate` | Incident revision; `alert.delivery_incident_triaged` |
| Delivery `START_MITIGATION` | `alert.delivery.operate` | Mitigation fact; `alert.delivery_mitigation_started` |
| Delivery `REQUEST_RETRY` | `alert.delivery.operate` | Eligibility decision + new attempt identity; `alert.retry_requested`, then `alert.attempt_queued` when created |
| Delivery `SELECT_ALTERNATE_CHANNEL` | `alert.delivery.operate` | Approved channel plan; `alert.alternate_channel_selected` |
| Delivery `PAUSE_PROVIDER_NONCRITICAL` | `alert.delivery.operate` | Bounded provider/channel pause; `alert.provider_noncritical_pause_started` |
| Delivery `RESOLVE`, `REOPEN` | `alert.delivery.operate` | Incident lifecycle; `alert.delivery_incident_resolved` or `alert.delivery_incident_reopened` |
| Outreach `CLAIM` | `outreach.operate` | Assignment/revision; `outreach.claimed` |
| Outreach `ATTEMPT` | `outreach.operate` | Immutable attempt; `outreach.attempted` |
| Outreach `RECORD_RESPONSE` | `outreach.operate` | Allowlisted response; `outreach.response_recorded`; Wrong Recipient also `contact.correction_requested` |
| Outreach `SCHEDULE_FOLLOW_UP` | `outreach.operate` | Follow-up; `outreach.follow_up_scheduled` |
| Outreach `RESOLVE` | `outreach.operate` | Valid outcome/Work interval; `outreach.resolved` |
| Market Support `CLAIM` | `market.support` | Assignment/revision; `market.support_claimed` |
| Market Support `REQUEST_INFORMATION` | `market.support` | Minimum consented fields/due; `market.support_information_requested` |
| Market Support `ISSUE_SOURCED_RESPONSE` | `market.support` | Response with public source versions/limitations; `market.support_response_issued` |
| Market Support `RECORD_FOLLOW_UP` | `market.support` | Mandatory follow-up; `market.support_follow_up_recorded` |
| Market Support `RESOLVE`, `CLOSE` | `market.support` | Sourced/terminal outcome; `market.support_resolved` or `market.support_closed` |

#### Calendar Review and application

| Method/path or action | Capability | Exact result/event |
| --- | --- | --- |
| `POST /v1/rsk/calendar-reviews/{reviewId}:claim` | `calendar.review` | Claim/revision; `calendar.review_claimed` |
| `POST /v1/rsk/calendar-reviews/{reviewId}/evidence-requests` | `calendar.review` | Requested evidence keys/due; `calendar.review_evidence_requested` |
| `POST /v1/rsk/calendar-reviews/{reviewId}/decisions` | `calendar.review` | Approve/change/no-change/reject/expire; `calendar.review_decided` |
| `POST /v1/rsk/calendar-change-applications` | `calendar.review` | Operation + `calendar.change_application_started`; success emits `calendar.change_applied`, terminal failure `calendar.change_application_failed` |
| `GET /v1/rsk/calendar-change-applications/{applicationId}` | `calendar.review` | Safe operation status/result refs |
| `POST /v1/rsk/calendar-change-applications/{applicationId}:retry` | `calendar.review` | Same idempotent application identity; new attempt, never duplicate Task versions |

#### Field Visit management and execution

| Method/path or action | Capability | Exact result/event |
| --- | --- | --- |
| Visit action `APPROVE` | `visit.manage` | Approval fact; `visit.approved` |
| Visit action `SCHEDULE`, `RESCHEDULE` | `visit.manage` | New schedule revision; `visit.scheduled` |
| Visit action `ASSIGN`, `REASSIGN` | `visit.manage` | Assignment fact/projection, revoke prior pack; `visit.assigned`, prior `visit.access_revoked` when applicable |
| Visit action `CANCEL` | `visit.manage` | Terminal reason and access/key revocation; `visit.cancelled`, `visit.access_revoked` |
| `POST /v1/rsk/visits/{visitId}:accept` | `visit.execute.field` or `visit.execute.sensor` | Assignee acceptance; `visit.accepted` |
| `POST /v1/rsk/visits/{visitId}:start` | `visit.execute.field` when registered class is FIELD; `visit.execute.sensor` when SENSOR; current assignee | `visit.started` |
| `POST /v1/rsk/visits/{visitId}/location-disclosures` | `visit.execute.field` for FIELD or `visit.execute.sensor` for SENSOR; current assignee | Audit-before-disclose; `visit.location_accessed` Audit fact |
| `POST /v1/rsk/visits/{visitId}/observations` | `visit.execute.field` for FIELD or `visit.execute.sensor` for SENSOR; current assignee | Immutable outcome fact; `visit.observation_recorded` |
| `POST /v1/rsk/visits/{visitId}/farmer-responses` | `visit.execute.field` for FIELD or `visit.execute.sensor` for SENSOR; current assignee | Immutable response; `visit.farmer_response_recorded` |
| `POST /v1/rsk/visits/{visitId}:complete` | `visit.execute.field` for FIELD or `visit.execute.sensor` for SENSOR; current assignee | Structured outcome accepted; `visit.completed` |
| `POST /v1/rsk/visits/{visitId}/outcome-reviews` | `visit.outcome.review` | Immutable review; `visit.outcome_reviewed` |
| `POST /v1/rsk/visits/{visitId}:close` | `visit.manage` after required review | Work/service effect; `visit.closed` |

Connected and offline Visit execution call the same command handlers. Offline pack sync supplies the command ID/revision in its item rather than HTTP headers.

#### Sensor and Maintenance execution

| Method/path or action | Capability | Exact result/event |
| --- | --- | --- |
| `GET /v1/rsk/maintenance-work-orders/{workOrderId}` | `sensor.maintenance.execute` | Authorized device/Issue/Visit/validation read model |
| `POST /v1/rsk/channels/{channelId}/suspect-flags` | `sensor.issue.operate` | Technician quality flag only; `sensor.interval_flagged` |
| `POST /v1/rsk/maintenance-work-orders/{workOrderId}/actions` action `START` | `sensor.maintenance.execute` | `sensor.maintenance_started` |
| `POST /v1/rsk/maintenance-work-orders/{workOrderId}/observations` | `sensor.maintenance.execute` | Immutable structured outcome; `sensor.maintenance_observation_recorded` |
| Same action route: `START_VALIDATION` | `sensor.maintenance.execute` | Validation operation; `sensor.maintenance_validation_started` |
| Same action route: `COMPLETE` | `sensor.maintenance.execute` | Accepted intervention/outcome; `sensor.maintenance_completed` |
| Same action route: `CLOSE` | `sensor.maintenance.execute` | Valid closure/Work interval; `sensor.maintenance_closed` |
| Same action route: `RETURN_TO_SERVICE` | `sensor.maintenance.execute` | Passed validation/current credential/assignment; `sensor.returned_to_service` |

#### Assisted service lifecycle

| Method/path | Capability | Exact result/event |
| --- | --- | --- |
| `POST /v1/rsk/assisted-verifications` | `assisted_session.operate` | Minimum Farmer verification result; `assisted.farmer_verified` Audit fact |
| `POST /v1/rsk/assisted-consent-checks` | `assisted_session.operate` | Purpose/access decision; `assisted.consent_checked` Audit fact |
| `POST /v1/rsk/assisted-sessions` | `assisted_session.operate` | Expiring partitioned session; `assisted.session_started` |
| `POST /v1/rsk/assisted-sessions/{sessionId}/disclosures` | `assisted_session.operate` | Audit-before-disclose; `assisted.protected_data_accessed` |
| `POST /v1/rsk/assisted-sessions/{sessionId}/commands` | `assisted_session.operate` plus owning Farmer command rule | Domain command + `assisted.mutation_confirmed` |
| `POST /v1/rsk/assisted-sessions/{sessionId}/receipts` | `assisted_session.operate` | Accepted/rejected/correction-safe receipt; `assisted.receipt_issued` |
| `POST /v1/rsk/assisted-sessions/{sessionId}:revoke` | `assisted_session.operate` | Access revocation; `assisted.session_revoked` |
| `POST /v1/rsk/assisted-sessions/{sessionId}/recoveries` | `assisted_session.operate` plus audited supervisor rule where needed | Locked recovery; `assisted.recovery_locked` |
| `POST /v1/rsk/assisted-sessions/{sessionId}/purge-attestations` | `assisted_session.operate` | Reconciled purge; `assisted.client_data_purged` |

#### Template and Alert Draft terminal/retry operations

| Method/path | Capability | Exact result/event |
| --- | --- | --- |
| `POST /v1/rsk/calendar-template-versions/{versionId}:request-changes` | `template.approve` | `template.changes_requested` |
| `POST /v1/rsk/calendar-template-versions/{versionId}:expire` | `template.publish` | `template.expired` |
| `POST /v1/rsk/calendar-template-versions/{versionId}:retire` | `template.publish` | `template.retired` |
| `POST /v1/rsk/calendar-template-versions/{versionId}:retry-publication` | `template.publish` | `template.activation_started`; then `template.published` or `template.activation_failed` |
| `GET /v1/rsk/calendar-template-versions/{versionId}/publication` | `template.read` | Safe activation state/attempt refs |
| `POST /v1/rsk/alert-drafts/{draftId}:cancel` | `alert.draft` | `alert.draft_cancelled` |
| `POST /v1/rsk/alert-drafts/{draftId}:expire` | `alert.draft` | `alert.draft_expired` |
| `POST /v1/rsk/alert-drafts/{draftId}:retry-publication` | `alert.publish` | `alert.publication_started`; then `alert.draft_published` or `alert.publication_failed` |
| `GET /v1/rsk/alert-drafts/{draftId}/publication` | `alert.read` | Safe publication operation state |

### 12.10 Audit API

`GET /v1/rsk/audit-facts` exists only for a separately granted audit role. Filters are fixed to safe action, outcome, actor class, jurisdiction and bounded time. Protected target investigation requires `audit.investigate_sensitive`, declared purpose, step-up authentication and a separate Audit fact. Audit responses never include the protected content that the fact references.

## 13. MP Query API catalogue

The MP Query API service identity can read only verified active release snapshots and approved standalone public facts. It does not expose a generic cube, SQL, free-text dimension or arbitrary polygon API.

### 13.1 Query context and aggregate results

| Method and path | Operation | Required contract | Result |
| --- | --- | --- | --- |
| `GET /v1/mp/query-context` | Read registered query vocabulary | MP role/MFA | Allowed metric keys, dimension values, coarse geographies, periods, methods, modes/provenance and active release metadata |
| `POST /v1/mp/aggregate-queries` | Query one released metric | Registered metric/geography/period/filter; exactly one mode | Tagged result union below; Audit fact |
| `POST /v1/mp/aggregate-comparisons` | Compare two released cells/scopes | Both independently releasable and comparable | Delta/direction only when both pass; Audit fact |
| `GET /v1/mp/public-facts/market` | Read standalone dated public facts | Allowlisted public source/market/commodity/period | Public facts separate from Farmer-derived metrics |
| `GET /v1/mp/methodologies/{methodologyId}` | Read approved method | Versioned public-safe definition | Immutable cacheable method content |
| `GET /v1/mp/data-quality` | Read released quality metadata | MP role | Completeness/staleness/mode/coverage; no suppressed counts |

Request filters may include only registered crop/stage/risk/channel/service/constraint classes and approved Raigad geography levels. Representation `CARD`, `TABLE` or `MAP` changes formatting only; all use the same released cells.

### 13.2 Aggregate result union

| Status | Allowed fields |
| --- | --- |
| `RELEASED` | Value/unit, metric/version, geography/period, approved coverage band, mode/provenance, data-as-of/staleness, quality, release snapshot and limitations |
| `SUPPRESSED` | Safe reason/policy/methodology and optional safe-rollup availability; physically no value, numerator, denominator, exact cohort or hidden bounds |
| `SAFE_ROLLUP` | Already released parent result plus requested-scope unavailable marker |
| `STALE` | Prior released value only inside the metric's permitted stale window after current privacy revalidation; includes reason/time |
| `UNAVAILABLE` | Safe reason and next update guidance; no fake zero/value |

The API pins and verifies one complete release snapshot per query. Comparisons pin an explicitly compatible pair. Signature, hashes, object generations, schema, completeness, expiry and invalidation are verified before serialization. Request fingerprinting, sticky/complementary suppression and query-shape throttles prevent differencing.

### 13.3 MP products

The following product queries are typed presets over registered metrics, not new access paths:

- `GET /v1/mp/products/overview`
- `GET /v1/mp/products/map`
- `GET /v1/mp/products/risks`
- `GET /v1/mp/products/service-delivery`
- `GET /v1/mp/products/alerts-reach`
- `GET /v1/mp/products/resources`
- `GET /v1/mp/products/harvest-markets`

Every returned card/cell carries the underlying metric, release and methodology references.

### 13.4 MP Briefings

| Method and path | Operation | Required contract | Result/events |
| --- | --- | --- | --- |
| `GET /v1/mp/briefings/today` | Read current briefing | Current release revalidation | Released/suppressed-aware Morning Brief |
| `GET/POST /v1/mp/briefings` | List / create Draft | Allowlisted filter set/current release | List returns safe workflow metadata only unless each version is currently revalidated; no historical narrative/value snippet |
| `POST /v1/mp/briefings/{briefingId}/generations` | Generate validated narrative | Idempotency; released structured input only | `202`; `mp.briefing_generation_requested`, then exact `mp.briefing_draft_created` or `mp.briefing_generation_failed` |
| `GET /v1/mp/briefings/{briefingId}` | View Draft/saved version | Revalidate release on every view | Available, consistent redacted replacement or refusal |
| `POST /v1/mp/briefings/{briefingId}:save` | Save immutable version | Revalidate every fact/sentence | `mp.briefing_snapshot_saved` |
| `POST /v1/mp/briefings/{briefingId}/exports` | Create export | Revalidate current release/authorization atomically | `202` + `mp.briefing_export_requested`; worker emits `mp.briefing_exported` or Audit `mp.briefing_export_refused` |
| `GET /v1/mp/briefing-exports/{exportId}` | Read export operation status | Current MP actor/office | Safe operation state and retrieval eligibility; no URL/content |
| `POST /v1/mp/briefing-exports/{exportId}/retrieval-tickets` | Retrieve artifact | Same current actor/authorization | Short-lived identity-bound access; no URL in logs |

Every Briefing list, Today view, Draft/saved view, voice playback and export rechecks current authorization and release validity. A list item is either safe metadata, `AVAILABLE`, a consistent redacted replacement or `REFUSED`; it never exposes a title/snippet derived from an invalidated release. Retrieval tickets redeem through `POST /v1/artifact-retrievals`. MP voice uses the same query/result/Briefing contracts. Suppressed content is never sent to a model or TTS service.

## 14. Identity session and role-context API

Identity Platform owns credential exchange/OTP provider flows. The Domain API owns role resolution and application context.

| Method and path | Operation | Contract |
| --- | --- | --- |
| `POST /v1/auth/return-states` | Create cross-origin return state | Exact allowlisted application origin/route, short-lived opaque one-time state; never arbitrary URL |
| `GET /v1/auth/session` | Read safe application session | Stable subject type, MFA freshness, device binding, authorization/capability versions and role destinations; no provider token echo |
| `GET /v1/auth/roles` | List current authorized roles | Server grants only; custom claims are hints |
| `POST /v1/auth/role-contexts` | Select role/office/jurisdiction / `identity.role_context.select` | Idempotency, active grant/MFA; returns expiring opaque context and emits restricted `identity.role_context_created` Technical Event |
| `DELETE /v1/auth/role-contexts/{roleContextId}` | Revoke/switch context / `identity.role_context.select` | Same subject; immediately unusable and emits restricted `identity.role_context_revoked` Technical Event |

Farmer phone OTP uses provider abuse controls. RSK/MP identity is invite-only with mandatory MFA. Tokens, role contexts and return states never enter localStorage, application IndexedDB payloads, URLs or logs. Personal Farmer mode may use the approved Firebase persistence; shared/assisted modes use session or memory persistence and explicit reauthentication.

## 15. Farmer synchronization protocol

The general `/v1/sync/*` stream is Farmer-only. It rejects RSK stakeholder scopes and cannot carry RSK Work, Case, Visit, evidence or staff projections. RSK connected operations use normal HTTPS commands; the only RSK durable offline contract is the assignment-scoped pack API in Section 16.

### 15.1 Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /v1/system/reachability` | Tiny first-party check returning server time/build; browser `online` remains only a hint |
| `POST /v1/sync/streams` | Open/resume a Farmer stream for one stable subject-device binding and Farmer scope |
| `POST /v1/sync/bootstrap` | Obtain one authorized projection snapshot and consistent high-water mark |
| `POST /v1/sync/batches` | Push bounded causally ready commands and pull authorized feed events |
| `GET /v1/sync/feed` | Pull a bounded feed page when no local commands are ready |
| `GET /v1/sync/commands/{commandId}` | Recover a currently authorized uncertain command disposition |
| `GET /v1/sync/conflicts` | List safe conflicts for the current subject-device scope |
| `GET /v1/sync/conflicts/{conflictId}` | Read typed conflict and allowed resolutions |
| `POST /v1/sync/conflicts/{conflictId}/resolutions` | Submit a new idempotent resolution command |

### 15.2 Stream opening

Request declares client build, local database schema and supported command/client-event/projection/media version ranges. It may present a prior stream/cursor. The server derives subject, binding, stakeholder and authorized scope.

The requested stakeholder, if present for compatibility, must equal `FARMER`; the server still derives it. Response returns:

- Opaque `streamId`.
- Stable `subjectDeviceBindingId` and authoritative stakeholder/scope.
- `authorizationVersion`.
- Accepted schema ranges and batch limits.
- Signed server-time anchor.
- Current cursor status and `bootstrapRequired`.

Ordinary token refresh does not change stream identity. Material role/scope/consent/access change may require a new authorization version and bootstrap.

### 15.3 Sync batch request

```json
{
  "syncBatchVersion": 1,
  "batchId": "018f...",
  "streamId": "018f...",
  "cursor": "opaque",
  "clientBuild": "web-2026.07.13.1",
  "commands": [
    {
      "commandId": "018f...",
      "clientEventIds": ["018f..."],
      "operation": "RecordDiaryActivity",
      "commandSchemaVersion": 1,
      "target": {"type": "season", "id": "018f..."},
      "expectedRevision": 12,
      "occurredAt": "2026-07-12T16:30:00+05:30",
      "timezone": "Asia/Kolkata",
      "localSequence": 48,
      "causalCommandIds": [],
      "requestHash": "sha256:...",
      "payload": {}
    }
  ],
  "feedLimit": 100
}
```

The client sends only topologically/causally ready commands. The server recomputes every request hash. `clientEventIds` prove local facts but do not grant Domain authority.

`batchId` is the transport replay identity within a stream. The server stores SHA-256 of the canonical entire batch request including cursor and ordered item hashes. Same `(streamId, batchId)` and checksum returns the identical stored per-item dispositions, feed page and `nextCursor`; the batch is not re-evaluated against a later feed position. Same identity with a different checksum returns `409 SYNC_BATCH_ID_REUSED`. Command-level idempotency remains authoritative even when a client creates a new batch around retried commands.

### 15.4 Sync response

Each command returns exactly one disposition:

```text
ACCEPTED | ALREADY_ACCEPTED | REJECTED | CONFLICT
```

An item contains its immutable acknowledgement ID, safe problem/conflict ID where applicable, allowed authoritative revision and server-event IDs. The response then returns minimized authorized sync Integration Events/projection deltas, `nextCursor`, high-water mark, `hasMore`, server time and authorization version.

The accepted mutation, command disposition, sync acknowledgement/mapping, feed event, Domain/Integration Events and outbox commit atomically. A transient batch failure is not converted into per-item business rejection.

### 15.5 Cursor and bootstrap invariants

The integrity-protected cursor binds environment + stable subject-device binding + stakeholder/scope + stream + authorization version + position. It is never authority. A cursor from another environment/identity/device is rejected rather than rebound.

`SYNC_BOOTSTRAP_REQUIRED` never deletes the local outbox. Bootstrap returns:

- Authorized server projection snapshot.
- Tombstones required by the client scope.
- Snapshot schema/checksum and generation/expiry.
- Consistent high-water mark `H` and cursor at `H`.

The client transaction replaces only the server-confirmed projection base, preserves tombstones/immutable local events/outbox/conflicts/media, replays unaccepted local events, and advances to `H` last.

### 15.6 Client atomicity

One Dexie transaction applies response events, rebuilds projections, stores acknowledgements/conflicts, updates/removes acknowledged outbox entries and advances the cursor last. If it fails, the old cursor remains for exact replay. `Synced` is shown only after this transaction commits.

Typed conflicts use the controlled vocabulary in Document 06. Resolution creates a new command/fact and never edits the original local event. Auth expiry leaves local data/outbox untouched. Unsupported schemas enter migration/recovery, never deletion.

## 16. RSK Visit and Sensor Maintenance offline packs

General RSK work is connected-first. Only assigned Field Visit and Sensor Maintenance use this separate encrypted offline contract.

| Method and path | Purpose |
| --- | --- |
| `POST /v1/rsk/offline-packs` | Issue minimum signed pack for an authorized assignment/device |
| `GET /v1/rsk/offline-packs/{packId}/status` | Read online revocation/expiry/sync state |
| `POST /v1/rsk/offline-packs/{packId}/sync` | Submit bounded outcome/evidence command batch |
| `POST /v1/rsk/offline-packs/{packId}/purge-attestations` | Record key-destruction/client-purge attestation |
| `POST /v1/rsk/offline-packs/{packId}/recover` | Audited original-staff/supervisor locked recovery |

Issuance requires the current staff subject, managed device, assignment, purpose, jurisdiction, consent/access versions, expected entity revision and supported pack/event/media schemas. It returns an immutable signed manifest, encrypted minimum payload, revocable key envelope, server-time anchor, hard expiry and exact allowed command list.

The manifest ticket cannot be refreshed offline. Expiry uses the signed anchor plus monotonic elapsed time. Reassignment, role change, Visit cancellation or consent/access change revokes server access and key eligibility. A disconnected client remains bounded by hard expiry.

Sync rechecks the same staff/device/assignment/purpose/jurisdiction/consent/access and expected revision. Offline `occurredAt` remains evidence but cannot backdate server `receivedAt`, first response or resolution. Rejected/conflicting outcomes remain encrypted and recoverable only in the authorized flow.

The server returns `purgeEligible: true` only after every required structured command is Accepted/Already Accepted, every required media asset is verified and attached, and the pack outcome/review policy is satisfied—or an authorized locked-recovery disposition explicitly permits purge. The eligibility response pins the accepted acknowledgement IDs, media attachment IDs and server high-water mark. A premature attestation is rejected and cannot destroy the key envelope. Purge attestation is idempotent, covers that pinned watermark and is audited. It proves that the client ran the registered key destruction/purge procedure; it does not falsely claim forensic physical erasure. Missing proof creates reconciliation Work.

## 17. Media upload, attachment and download

### 17.1 Upload protocol

1. `POST /v1/media/upload-intents` with purpose, typed owner context, expected SHA-256, claimed type/size/dimensions or duration and consent/access version.
2. Server returns one short-lived, authorization-issued resumable upload initiation for an exact quarantine object/purpose/type/generation precondition and expiry.
3. Client uploads bytes directly to quarantine and encrypts the resumable session reference locally.
4. `POST /v1/media/upload-intents/{intentId}:finalize` supplies object generation and checksum. It is idempotent and returns `202`.
5. `GET /v1/media/assets/{assetId}/status` returns explicit verification/scan state, never an object URL.
6. A separate typed owner command attaches a verified asset.

`GET /v1/media/attachments/{attachmentId}/content` is the sole v1 attachment-download flow. It requires bearer/App Check, resolves the required typed owner link, rechecks current subject/RSK purpose/consent/access, pins the object generation and performs audit-before-disclose where required. It streams bytes with `private, no-store`, safe `Content-Disposition`, decoder-approved content type and authorized `Range` support. An asset ID alone is never sufficient. V1 does not return a signed object URL for protected attachment reads.

After issuance, a Cloud Storage resumable session URI is a bearer capability even though its creation was authorized. The client encrypts it locally and may use the provider status/resume protocol for that same URI. The server does not retain, rotate or redisclose it. If it is lost/expired, the client abandons the session and creates a new upload intent with a new generation-preconditioned quarantine object; the old object/session is purged by retention. Signed initiation cannot guarantee final byte size, so finalize and quota enforcement independently verify size/checksum/type. `DELETE /v1/media/upload-intents/{intentId}` cancels an unused intent idempotently.

### 17.2 Media validation

The server independently verifies object generation, byte size, SHA-256, magic MIME, decoder safety, pixel/duration bounds and consent. Malware/polyglot/unsupported codec or extension mismatch is rejected. Unnecessary EXIF/location metadata is stripped from approved derivatives. Quarantine never reaches AI/domain reads.

Pilot purpose limits are:

| Purpose | Allowlist/ceiling |
| --- | --- |
| Crop Health image | JPEG/PNG/WebP, 10 MiB each, maximum six per Report unless governed rule is stricter |
| Offline voice | Reviewed WebM/Opus or WAV, 10 MiB and 120 seconds |
| RSK Visit/Maintenance evidence | Reviewed purpose allowlist, 15 MiB each |
| Resumable initiation | 10-minute target by default; quarantine recovery no longer than approved 24-hour window |
| Sensitive attachment read | Authenticated generation-pinned streaming only in v1 |

### 17.3 Typed attachment

Only these owner-specific families exist:

- `POST /v1/farmer/diary-entries/{entryId}/media-attachments`
- `POST /v1/farmer/health-reports/{reportId}/media-attachments`
- `POST /v1/rsk/visits/{visitId}/media-attachments`
- `POST /v1/rsk/maintenance-work-orders/{workOrderId}/media-attachments`
- `POST /v1/voice/offline-audio`

They require verified asset, exact owner/purpose, expected owner revision, current access and idempotency. There is no generic arbitrary entity attachment endpoint. `media.upload_verified` is Technical truth only; `diary.media_attached`, `health_media.attached`, `visit.media_attached` or `sensor.maintenance_media_attached` creates domain evidence authority.

`POST /v1/voice/offline-audio` accepts a verified asset ID, local capture ID, language, opaque authorized context, audio-consent version and expiry policy. It atomically creates `voice.offline_audio_ref` plus its typed media link and emits `voice.offline_audio_attached` as a restricted Technical Event. The resulting transcription operation enters `TRANSCRIPTION_PENDING` then `NEEDS_CONFIRMATION`; it never executes a command automatically.

Structured Diary/Health/Visit work synchronizes before ordinary media. Bad media preserves the structured record with an explicit pending/save-without-media state. Urgent Health media receives upload priority before Visit/Maintenance and Diary media.

## 18. Voice session, WebSocket and tool protocol

### 18.1 Session creation

`POST /v1/voice/sessions` uses the normal bearer, App Check and role context. Body contains selected language, current visual route, opaque context IDs and client audio capabilities. Server derives role/jurisdiction/authorized context and returns:

- Opaque session ID.
- `wss` endpoint with no token/ticket in its URL.
- Single-use ticket returned in plaintext once and stored server-side only as a hash.
- Expiry, protocol version and HTTPS fallback route.

The ticket is bound to environment, subject, role context, authorization version, origin, language, device partition, route and context. Pilot ticket TTL is 60 seconds. The browser offers two separate `Sec-WebSocket-Protocol` tokens: `sfka.voice.v1` and `ticket.<base64url>`. The server consumes the ticket atomically and echoes only `sfka.voice.v1`; the complete incoming header is redacted from logs. Replay, expiry, origin mismatch or access-version change fails closed.

### 18.2 Realtime messages

Control frames are versioned JSON with session ID, message ID, monotonic sequence and type. Audio uses bounded binary frames. Required types are:

| Direction | Types |
| --- | --- |
| Client | `session.start`, `audio.end`, `barge_in`, `proposal.confirm`, `proposal.correct`, `proposal.cancel`, `transport.ack`, `transport.resync_request`, `ping`, `session.close` |
| Server | `session.ready`, `state.changed`, `transcript.partial`, `transcript.final`, `clarification`, `tool.proposal`, `proposal.state`, `command.state`, `validated.result`, `audio.metadata`, `transport.ack`, `transport.resync`, `error`, `session.expiring`, `session.closed` |

Control frame ceiling is 32 KiB. Audio frame ceiling is 64 KiB and at most one second. Pilot session is bounded to 15 minutes with expiry warning/reconnect and heartbeat near 20 seconds. Backpressure pauses capture before buffers grow without bound.

Client and server maintain independent monotonic `clientSequence` and `serverSequence`. Every control frame carries its sending sequence and the highest contiguous sequence received from the peer. `transport.ack` confirms the highest contiguous sequence without a business effect. A duplicate at or below that watermark is acknowledged/ignored. A gap emits `transport.resync_request`; the peer answers `transport.resync` with the last acknowledged sequence and a bounded current state snapshot, never by replaying audio or a mutation. Barge-in stops playback and invalidates unfinished provider calls. Reconnect obtains a new ticket/provider session and uses a minimal sanitized server-owned summary. Pending provider tool calls are invalidated; durable proposals and command receipts remain.

WebSocket proposal mutation frames are not a weaker path. `proposal.confirm` must contain `proposalId`, `expectedProposalRevision`, exact `payloadHash`, stable `commandId` and `idempotencyKey` equal to that command identity. `proposal.correct` and `proposal.cancel` contain the same proposal identity/revision and their own stable command ID. The gateway invokes the identical persisted handlers, authorization, hash check and idempotency rules used by the HTTPS endpoints. A missing field or transport replay produces no mutation.

### 18.3 HTTPS fallback and offline audio

`POST /v1/voice/sessions/{sessionId}/turns` accepts bounded audio/text through the same orchestrator/policy. It has no weaker tools or authorization.

Consented offline audio follows the Media protocol with purpose `VOICE_OFFLINE_AUDIO`. Transcription produces `NEEDS_CONFIRMATION`; it never executes automatically. Without stored-audio consent, failed live audio is discarded rather than uploaded.

### 18.4 Proposal contract

| Method and path | Operation |
| --- | --- |
| `GET /v1/voice/proposals/{proposalId}` | Read safe current proposal/command state |
| `POST /v1/voice/proposals/{proposalId}:confirm` | Confirm exact payload hash, revision and stable command ID |
| `POST /v1/voice/proposals/{proposalId}:correct` | Create a new proposal; prior becomes superseded |
| `POST /v1/voice/proposals/{proposalId}:cancel` | Cancel without domain mutation |
| `GET /v1/commands/{commandId}` | Reauthorize and recover uncertain outcome |

Confirmation requires `Idempotency-Key`, proposal revision and exact stored payload hash. It reauthorizes the original actor/context and executes only the stored command. Disconnect after confirmation queries the receipt; it never repeats the command.

### 18.5 Role-specific tools

- Farmer tools read Today/evidence/Recommendation/Advisory/Task/Alert/Case/Market projections and create only registered Farmer command proposals.
- RSK tools read the current authorized Work/Case/Visit/Sensor/Market context and may create drafts/proposals. Chemical selection/dose, High/Critical closure, agronomic sensor invalidation, template publication, bulk Alert publication and high-impact Market mapping stop at `VISUAL_REVIEW_REQUIRED`.
- MP tools are limited to released metric query/comparison, released Briefing/methodology and allowlisted navigation.

Downstream Domain/MP APIs independently reauthorize the delegated actor. The model cannot set actor, role, jurisdiction, consent, mode or arbitrary target. Authoritative values are spoken only from validated tool results through controlled TTS. Suppressed MP content never reaches the model.

## 19. Signed hardware-ingestion protocol

### 19.1 Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /ingest/v1/challenges` | Issue a single-use short challenge to a registered gateway lacking trusted wall time |
| `POST /ingest/v1/batches` | Authenticate and durably accept one bounded telemetry batch |
| `GET /ingest/v1/receipts/{receiptId}` | Optional same-gateway recovery of a durable receipt |

### 19.2 Batch schema

A batch JSON body contains schema version, gateway/assignment IDs, boot/batch IDs, sequence range, firmware version and observations. Each observation contains stable observation ID when available, device/channel ID, sequence, signal, original decimal value/unit, optional `observedAt`, time-quality, gateway receipt time, battery/radio metadata and calibration reference.

Authentication metadata is outside the digested JSON body in fixed headers: `X-SFKA-Gateway-Id`, `X-SFKA-Credential-Version`, `X-SFKA-Boot-Id`, `X-SFKA-Batch-Id`, `X-SFKA-Sequence-Start`, `X-SFKA-Sequence-End`, `X-SFKA-Sent-At` or `X-SFKA-Challenge-Id`, `X-SFKA-Nonce`, `X-SFKA-Content-SHA256` and `X-SFKA-Signature`. Header gateway/boot/batch/sequence identities must exactly equal the body. The signature and digest fields are therefore never recursively included in the body digest.

It contains no Farmer name, phone or exact coordinates. The server resolves the current consented assignment and derives/locks data mode from environment, credential and assignment. Client `dataMode` can detect mismatch but never promote to Live.

### 19.3 Signature

Pilot scheme is registered as `SFKA-HMAC-SHA256-v1`. It signs this canonical input:

```text
HTTP method
canonical path
gateway ID
credential-version ID
boot ID
batch ID
sequence start and end
current sentAt OR one-time challenge ID
nonce
SHA-256 of RFC 8785/JCS body
```

The body must be UTF-8 JSON. The parser rejects duplicate keys, invalid Unicode and non-finite/ambiguous numeric representations before JCS canonicalization; measurements are decimal strings. Server recomputation of JCS SHA-256 must equal `X-SFKA-Content-SHA256` before signature acceptance. Content encoding is forbidden for v1 so the digest boundary is unambiguous. Credential comparison is constant-time. Credentials are unique, rotatable, immediately revocable and never Google service-account keys.

Trusted-clock uploads use a nonce and configured replay window, initially plus/minus five minutes. Historical `observedAt` is not constrained by the uplink window. An untrusted-clock gateway uses a five-minute single-use challenge bound to its batch identity.

The challenge request is itself credential-authenticated with a separate canonical `SFKA-CHALLENGE-v1` message containing method/path, gateway/credential/boot/batch identity, sequence range, client nonce and empty/body digest; it does not require wall time. Challenge issuance is rate-limited and idempotent for the same pending batch. Consuming a challenge and accepting its batch are atomic.

### 19.4 Acceptance and retry

Maximum batch is 500 observations or 256 KiB. Uniqueness is `(gatewayId, bootId, batchId)` and `(deviceId, bootId, sequence, channelId)`. Exact duplicate returns the original receipt. Same batch identity with different checksum returns `409 BATCH_ID_PAYLOAD_MISMATCH` plus security signal.

`201 DURABLY_ACCEPTED` is returned only after one transaction commits the immutable raw batch/payload reference, each new raw observation, durable receipt, `sensor.batch_durably_accepted` Technical Event, per-new-observation `sensor.observation_received` Domain Events, required minimized Integration Events and outbox rows. Duplicates reference the already committed observations/events and do not emit them again. Receipt contains checksum, accepted/duplicate counts and `trustState: PENDING`. It explicitly says acceptance is not calibration, quality, freshness or decision eligibility.

A safely classified terminal schema/auth/replay/assignment rejection records only the minimum permitted rejection fact and `sensor.batch_rejected` Technical Event after signature/identity policy allows attribution; unauthenticated hostile bodies are not copied into domain storage. A durable commit failure emits neither accepted event nor receipt and returns retryable failure.

Gateways retry `408`, `429` and `5xx` with exponential backoff/full jitter and same semantic batch identity; a fresh nonce/`sentAt` or new challenge is used. Schema, signature, revoked assignment/credential, identity conflict and oversize failures are terminal until corrected. Local buffered data is deleted only after the durable receipt.

## 20. Provider callbacks, notification registration and delivery

### 20.1 Callback intake

Provider-specific routes are `POST /callbacks/v1/{provider}/{channel}`. Before parsing, the service verifies the provider-native signature over exact raw bytes and configured canonical public URL, timestamp/replay window, content type/size and documented provider event ID. Forwarded host/scheme is trusted only from the configured load balancer.

The service persists one immutable intake under unique `(environment, providerId, providerEventId)` and acknowledges quickly. A valid duplicate returns the same success. Invalid signature returns `401`; signed malformed body `400`; oversize `413`; inability to persist `503`. Unauthenticated hostile bodies are not retained beyond bounded security metadata.

Callback ingest cannot mutate Alert, Task, Case, acknowledgement or recipient state. A worker claims `consumer_inbox`, resolves an existing provider-attempt binding and atomically appends an allowed attempt event/projection. Unknown attempt IDs are quarantined and never create recipients/attempts.

| Provider signal | Internal attempt state |
| --- | --- |
| Accepted/queued/submitted/sent without receipt | `PROVIDER_ACCEPTED` |
| Trustworthy delivery receipt | `DELIVERED` |
| Definitive invalid destination/permanent rejection | `FAILED` |
| Timeout/ambiguous or irreconcilable response | `UNKNOWN` |
| Product validity ended before contact | `EXPIRED` |
| IVR answered/connected | Delivery state only, never `HEARD` |
| Explicit IVR/key interaction | Attempt-bound interaction input; Domain acknowledgement requires authenticated/validated command |

Out-of-order facts remain immutable. Projection logic never silently downgrades Delivered because of a late generic failure; contradictory terminals create Unknown/incident review.

For outbound IVR, the dispatcher creates a random single-purpose interaction secret whose hash is stored against attempt + recipient membership + exact canonical version + allowlisted response set + expiry. The secret is conveyed only through provider-approved call metadata and is never a general Farmer credential. Callback intake first verifies the provider signature and persists the raw provider fact. A separate worker then verifies and consumes the interaction secret, validates the DTMF/speech result against the allowlist and issues `RecordAlertInteraction` under a restricted `CHANNEL_INTERACTION` principal bound to that one attempt/version. That principal cannot query Farmer data or execute any other command. Answer/connection alone never consumes the secret or becomes Heard/Acknowledged.

### 20.2 Push registration

- `POST /v1/farmer/push-registrations`
- `POST /v1/farmer/push-registrations/{registrationId}:rotate`
- `POST /v1/farmer/push-registrations/{registrationId}:revoke`

Subject comes from auth. Registration binds subject-device, environment, language, FCM token, platform and exact channel consent/access version. Token is encrypted; logs/events use a fingerprint only. Logout, role/account switch, shared-mode exit, consent withdrawal and Wrong Recipient revoke future eligibility.

### 20.3 Delivery adapter

Cloud Tasks contains only opaque attempt ID, expiry and expected policy version. Before send, the worker rechecks canonical validity, frozen cohort membership, current channel consent, endpoint validity, language, preferences, quiet/frequency rules and data mode.

Provider request uses stable attempt/correlation, reviewed template/locale, safe preview, opaque authenticated deep link, expiry and provider idempotency key when supported. FCM success is Provider Accepted only. App open/heard/acknowledgement comes from authenticated interaction commands.

Network retry of a provider call is allowed only with provider deduplication or reconciliation. Otherwise state becomes Unknown before another contact. Product retry creates a new linked attempt. Alert expiry or Farmer response cancels pending fallback. Demo credentials/adapters are physically unable to contact real recipients.

## 21. Weather, Earth Engine, Mandi and external adapters

### 21.1 Common import contract

Each adapter records source/version, adapter build, import run, edition/cursor, approved spatial cell, source-issued/Unknown time, receipt time, retained raw checksum/ref where permitted, licence/retention/attribution, contract-delete/product-expiry, data mode and explicit missing states.

Cloud Scheduler starts an authenticated Job; source logic lives in versioned adapters. Jobs checkpoint and deduplicate by source edition/cursor/cell. Provider URL/query/dataset is allowlisted; user input can never supply an outbound URL.

| Failure | Adapter action |
| --- | --- |
| `429`, timeout, provider `5xx` | Source-specific backoff/circuit breaker and retry |
| Provider `400`, auth/config error, missing dataset | Terminal configuration Work |
| Schema incompatibility/licence failure | Quarantine; never overwrite valid edition |
| Partial source edition | Explicit partial state/coverage; no invented records |

### 21.2 Google Weather

Google Weather uses an approved coarse cell, required attribution and exact contractual cache TTL. Responses state `decisionEligible: false`, data-as-of and expiry. Content is deleted at TTL and cannot appear in Evidence Snapshot, Recommendation, Advisory, Task, Alert, model training or evaluation. Display is allowed only until the earlier of product freshness and contractual expiry.

Retention-licensed decision weather uses immutable editions/points and explicit freshness/source-rights. Correction/expiry/rights/consent change starts the full dependency-impact operation.

### 21.3 Earth Engine

The Domain API creates a pinned `earth_feature_job`; an authenticated task invokes `POST /internal/v1/earth/jobs/{jobId}:execute`. Job input fixes Plot/geometry revision, purpose/consent version, dataset/band/feature versions, reducer, scale, temporal window and code hash.

Every provider call rechecks location consent and geometry applicability. Dataset, band, reducer, scale, `maxPixels`, time range, quota and computation are allowlisted. No client-supplied Earth expression executes. Authentication uses workload identity/Application Default Credentials; no key file.

Retry reconciles a stored provider task before resubmission. Quota/temporary failures retry; invalid geometry/dataset/policy/code/schema are terminal. A sealed snapshot requires schema/unit/coverage/freshness/checksum validation. Partial values are explicit. Farmer page requests read precomputed snapshots and never wait for Earth computation.

### 21.4 Mandi imports

The import preserves source record/version, checksum, market/geography, commodity/variety/grade/form/unit, separate min/modal/max value states and report/ingest times. Unknown mappings are quarantined into RSK mapping Work. Official correction supersedes; it never edits raw history. Mapping activation creates an idempotent reprocessing operation and cannot duplicate a Watch trigger.

## 22. Internal service, task and event contracts

### 22.1 Service calls

Every internal route defines exact calling service account, audience, request/response schema, deadline, retry class and idempotency key. Intelligence service receives only the pinned typed evidence snapshot and cannot write domain tables. Privacy workers have separate candidate/publication/data-rights roles.

### 22.2 Cloud Tasks

A task body contains only task schema version, opaque operation/attempt/job ID, expected policy/version and correlation. It contains no phone, exact geometry, transcript, signed URL or private evidence. The handler reloads and reauthorizes current state. Task name is the idempotency identity where supported.

Handlers return success only after a durable terminal/retry state is recorded. Permanent domain ineligibility is an accepted terminal outcome, not a retried `500`. Transient infrastructure/provider failure returns a retryable status under the queue policy.

### 22.3 Pub/Sub Integration Events

The stored immutable Integration Event is the published payload. It references exactly one Domain or Technical source Event and has a destination-specific schema/checksum/classification/retention. Outbox publication is at-least-once. Publisher retries the same Integration Event ID/checksum.

Consumers validate event name/version/schema, insert/claim unique `(consumerName, eventId)`, apply owned effect and final disposition atomically. Aggregate revision/ordinal detects out-of-order delivery. A consumer never writes another module's table. Unsupported critical version is quarantined, not acknowledged as applied.

Broad event payloads contain no phone, exact geometry, symptom/free text, transcript, private media/market values, provider secret or suppressed data. Analytics-safe dispatch uses the physically separate Privacy outbox/topic and contains no operational ID.

### 22.4 Long-operation resource

All `202` endpoints return:

```json
{
  "operationId": "018f...",
  "operationType": "RECOMMENDATION_RUN",
  "state": "QUEUED",
  "statusUrl": "/v1/farmer/recommendation-runs/018f...",
  "pollAfterSeconds": 2,
  "expiresAt": "2026-07-14T00:00:00Z"
}
```

States are `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`, `CANCELLED` and `EXPIRED` where applicable. Progress is coarse and safe. Retry of the creation command returns the same operation. Cancellation is an explicit idempotent command and cannot promise cancellation after an irreversible provider effect.

### 22.5 Internal operation routes

| Method and path | Sole caller | Effect |
| --- | --- | --- |
| `POST /internal/v1/intelligence/earth-jobs/{jobId}:execute` | Earth task service account | Compute/reconcile pinned Earth job; cannot write domain decision |
| `POST /internal/v1/delivery/attempts/{attemptId}:execute` | Delivery task service account | Recheck eligibility and make/reconcile one provider attempt |
| `POST /internal/v1/media/assets/{assetId}:scan` | Storage-event/media-scanner identity | Verify/scan/derive one quarantine asset |
| `POST /internal/v1/import-runs/{runId}:execute` | Scheduled import identity | Execute pinned Weather/Market/official-source adapter run |
| `POST /internal/v1/privacy/candidates/{candidateId}:materialize` | Privacy publication worker | Produce one minimized analytics-safe dispatch and Privacy outbox row |
| `POST /internal/v1/privacy/release-jobs/{releaseJobId}:execute` | Privacy release job identity | Build/validate/sign one immutable release snapshot |
| `POST /internal/v1/data-rights/deletion-intents/{intentId}:apply` | Farmer Data Rights worker | Apply only an independently acknowledged deletion intent |

Every route rejects the wrong internal identity even if it has a valid Google-signed token. Exact replay returns the persisted operation outcome. A route never accepts an arbitrary provider URL, dataset expression, SQL fragment, object path or destination supplied by the caller.

## 23. Web transport and caching security

### 23.1 CORS and origins

- Each environment allowlists exact Farmer, RSK and MP application origins; wildcard origin is forbidden.
- `Access-Control-Allow-Credentials` is enabled only when an approved cookie-based subflow actually requires it.
- Allowed methods/headers are route-specific. Callback/device/internal services do not expose browser CORS.
- Mutating browser requests validate `Origin` in addition to bearer/App Check authentication.
- If an HTTP-only cookie is introduced for a narrow flow, it uses `Secure`, appropriate `SameSite`, narrow Path/Domain and anti-CSRF token. A bearer header is not silently converted into a cookie session.
- Preflight and auth failures reveal no resource existence.

### 23.2 Cache policy

| Content | Policy |
| --- | --- |
| Protected operational/MP result | `private, no-store` |
| Signed/retrieval response | `private, no-store`; token not cached |
| Public methodology/locale/schema by immutable version | `public, max-age=31536000, immutable` when no private context |
| Current public pointer/config | Short explicit cache with validator |
| Google Weather display | Never cached beyond earlier product/contract expiry |
| Service worker | Stores only route-approved encrypted/projection content under the offline policy |

### 23.3 Logging and observability

Structured request logs use route template, operation, status, latency, actor class, hashed/bounded subject or device ref, environment, safe problem code, correlation/trace and build. They omit authorization/App Check, OTP, role/ticket/challenge secrets, signature, body, query values containing IDs, phone, exact coordinates, transcript/audio, prompt/model content, private market values, provider payload and signed URL.

Sensitive headers are redacted at load balancer, framework and application levels. WebSocket subprotocol ticket values and upload session URLs are never emitted. Metrics use bounded labels; opaque IDs do not become high-cardinality metric dimensions.

## 24. Stable problem and status registry

The checked-in registry includes at least:

| Code | Typical HTTP | Meaning/recovery |
| --- | --- | --- |
| `AUTHENTICATION_REQUIRED` | `401` | Obtain/refresh valid identity |
| `AUTHORIZATION_DENIED` | `403` for known collection/action; `404` for entity-specific existence-hidden lookup | No current capability/scope; generated operation metadata fixes which form applies |
| `MFA_REQUIRED` | `403` | Complete staff/step-up MFA |
| `AUTHORIZATION_VERSION_CHANGED` | `409` | Refresh context/bootstrap |
| `CONSENT_OR_ACCESS_VERSION_CHANGED` | `409` | An admitted command/sync/session carried a stale version; fail closed and reconsent/reverify when allowed. A fresh unauthorized request uses `AUTHORIZATION_DENIED` `403/404` instead |
| `DEVICE_BINDING_MISMATCH` | `403` | Rebind through approved flow |
| `IDEMPOTENCY_KEY_REUSED` | `409` | New key after reviewing payload |
| `EXPECTED_REVISION_MISMATCH` | `409` | Use typed conflict/review |
| `INVALID_STATE_TRANSITION` | `409` | Reload current resource |
| `TOMBSTONED_ENTITY` | `409` | Mutation conflicts with the deletion barrier; do not resurrect and offer a new-record route only when policy allows |
| `SOURCE_VERSION_EXPIRED` | `422` | Refresh/recompute/review |
| `EVIDENCE_INSUFFICIENT` | `422` | Explicit missing/quality guidance |
| `SYNC_CURSOR_INVALID` | `400` | Cursor is malformed, tampered or belongs to a different stream; do not rebind. Cross-identity use is `AUTHORIZATION_DENIED` |
| `SYNC_CURSOR_EXPIRED` | `410` | Bootstrap required |
| `SYNC_BOOTSTRAP_REQUIRED` | `409` | Stream remains known but scope/schema requires bootstrap; preserve local work. An expired cursor uses `SYNC_CURSOR_EXPIRED` `410` |
| `SYNC_SCHEMA_UNSUPPORTED` | `415` | Client command/event/projection schema is outside supported range; forward migration/recovery |
| `SYNC_BATCH_ID_REUSED` | `409` | Same stream/batch identity arrived with a different canonical checksum |
| `CAUSAL_DEPENDENCY_UNSATISFIED` | `409` | Defer command until dependency accepted |
| `ASSIGNMENT_CHANGED` | `409` | Lock/review offline outcome |
| `CLOCK_UNTRUSTED` | `422` | Retain occurrence with quality or request correction |
| `MEDIA_INTEGRITY_MISMATCH` | `422` | Uploaded bytes/type/generation fail the declared asset contract; create new intent and preserve structured record |
| `MEDIA_NOT_VERIFIED` | `409` | Wait/retry scan; cannot attach |
| `UPLOAD_INTENT_EXPIRED` | `410` | Abandon old session and create a new authorized intent |
| `VOICE_PROPOSAL_EXPIRED` | `410` | Create a new proposal |
| `VOICE_PROPOSAL_HASH_MISMATCH` | `409` | Reject; review visible proposal |
| `VISUAL_REVIEW_REQUIRED` | `422` | Open populated visual review route |
| `RELEASE_INVALIDATED` | `410` | Addressable Briefing/release version is no longer serveable; use approved replacement/refusal. Aggregate query uses the `200` result union |
| `RELEASE_UNAVAILABLE` | `200 union` | Query completed but no releasable value exists |
| `DEPENDENCY_UNAVAILABLE` | `503` | API/provider infrastructure could not complete the request and retry may be safe |
| `FILTER_NOT_ALLOWLISTED` | `400` | Use query-context vocabulary |
| `COMPARISON_NOT_RELEASABLE` | `200 union` | Suppressed/roll-up/unavailable; no hidden delta |
| `BATCH_ID_PAYLOAD_MISMATCH` | `409` | Security/configuration review |
| `RATE_LIMITED` | `429` | Respect `Retry-After` |

MP suppression is normally a successful tagged `200` result, not an error side channel.

## 25. Required atomic operation mapping

| API operation | Atomic persistence and event effect |
| --- | --- |
| Complete Farmer setup | Profile/Farm/Plot/readiness versions + setup/farm/plot/profile events |
| Accept Recommendation | Revalidation + Acceptance + exactly one Season + Calendar/initial Tasks + events/outbox |
| Publish Advisory | Approved version + dependent Tasks + policy-required Alert only + events/outbox |
| Respond Done/Partly Done | Task response + immutable Diary actual + Task completion projection + events |
| Escalate Health Report | Sharing decision/access + Case evidence pack + Case + RSK Work + events |
| Publish governed Alert | Draft Published + canonical version/lifecycle + frozen recipient membership + Integration Events/outbox |
| Apply provider callback | Callback intake already durable + consumer disposition + valid attempt event/projection |
| Withdraw consent | Decision + access-version increment + immediate grants/assignments invalidation + revocation operations/events |
| Invalidate sensor interval | Expert decision + invalidation + complete dependency-impact items/recalculations |
| Publish Market mapping | Approved mapping/alias + reprocessing operation + events |
| Accept offline command | Domain fact/projection + terminal receipt + sync acknowledgement/feed + events/outbox |
| Save/export MP Briefing | Current release/authorization revalidation + immutable saved version or idempotent export + Audit |
| Apply deletion | Independently acknowledged intent first; local deletion/tombstone/ledger transaction; external Applied acknowledgement before completion |

## 26. Contract generation and repository layout

The implementation uses one source-of-truth contract package and generated artifacts:

```text
packages/contracts/
  src/http/
  src/commands/
  src/events/
  src/sync/
  src/device/
  src/voice/
  src/privacy/
  generated/openapi/
  generated/json-schema/
  generated/typescript/
  generated/pydantic/
```

- Authoritative TypeScript/Zod schemas use explicit strict objects and discriminated unions.
- OpenAPI 3.1 and JSON Schema generation is deterministic.
- Farmer, RSK and MP clients are generated with only their declared route tags.
- Internal Python Pydantic models are generated from the pinned schemas; generated files are not hand-edited.
- Event registry generation fails if an emitted name/version is absent from Document 06.
- OpenAPI lint rejects missing auth, idempotency/precondition declaration, undocumented errors, unbounded arrays, arbitrary free-form objects and sensitive path/query fields.
- A compatibility job diffs the previous released OpenAPI/event/device/sync schemas and blocks breaking change inside the supported horizon.

## 27. Verification strategy

### 27.1 Common command tests

- Request commits but response is lost; retry produces one Domain effect and identical safe receipt.
- Same key/different semantic hash is rejected and audited.
- Revision changes after page load; stale command cannot overwrite.
- Authorization/consent expires between admission and queued execution; operation fails closed.
- Protected retry after access loss does not return an old sensitive body.
- An unauthorized opaque ID is indistinguishable from unknown where required.

### 27.2 Sync tests

- Cursor and page replay do not duplicate logical effects.
- Auth/consent version changes between cursor issue and batch/feed reveal no forbidden event.
- Bootstrap preserves tombstones, local facts, outbox, conflicts and media.
- Structured Health/Diary/Visit record succeeds while media retries.
- Conflicting Task actual and RSK plan preserve both.
- Tombstoned entity cannot return through an old reauthenticated device.
- Unsupported old schema enters recovery rather than deletion.

### 27.3 Media tests

- Resume after interruption and exact finalize replay.
- Generation/checksum/MIME mismatch, malformed decoder input, polyglot/malware and EXIF removal.
- Consent withdrawal at intent, finalize, attach and download boundaries.
- Verified asset remains non-evidence until typed attachment.
- Cross-subject checksum does not disclose existence.

### 27.4 Voice tests

- Ticket replay/expiry/origin/role/access-version mismatch.
- Frame duplicate/gap/backpressure, barge-in and reconnect.
- Disconnect immediately before/after proposal confirmation executes at most once.
- Prompt injection cannot add tools/targets or change actor/mode.
- Prohibited RSK operation returns visual review and no mutation.
- MP voice receives the identical suppression result as dashboard.

### 27.5 Hardware tests

- Published HMAC golden vectors and constant-time verification path.
- Body/header tamper, nonce replay, consumed/expired challenge and revoked credential.
- Old observation with valid current uplink remains accepted with correct time quality.
- Exact batch retry returns receipt; same identity/different checksum conflicts.
- Durable commit failure never returns acceptance.
- Device claim cannot change Live/Recorded/Simulated mode.

### 27.6 Callback and delivery tests

- Raw-body signature and canonical URL validation.
- Duplicate callback, unknown attempt, out-of-order status and contradictory terminal status.
- Database failure before durable intake returns retryable failure.
- FCM Accepted never becomes Delivered/Acknowledged.
- Invalid token revokes future endpoint; uncertain send does not blindly retry.
- Alert expiry and Wrong Recipient stop disclosure/fallback.
- Demo provider cannot contact real destinations.

### 27.7 External and MP tests

- Google Weather expires/purges and cannot enter decision evidence.
- External import rerun, correction/supersession and licence/schema quarantine.
- Earth consent-withdrawal race, geometry supersession, quota retry and provider-task reconciliation.
- Suppressed MP serialization has no hidden numeric fields or precise cohort.
- Map/table/card return the same released cell semantics.
- Rephrased/differencing query cannot infer suppression.
- Partial/invalid/stale-beyond-policy release is never served.
- Saved Briefing view/voice/export after invalidation returns consistent replacement/refusal.

## 28. API release gates

- **API-AC01:** Every protected route declares auth, role, capability, purpose, ownership/jurisdiction and consent/access rules in OpenAPI extensions and executable policy tests.
- **API-AC02:** No sensitive value appears in a path, query, cursor, problem type, trace or log.
- **API-AC03:** Every connected mutation requires a stable idempotency identity and every mutable target requires expected revision.
- **API-AC04:** Same idempotency identity/hash returns one original outcome; different hash returns conflict.
- **API-AC05:** No command performs silent last-write-wins.
- **API-AC06:** Errors follow the safe problem registry and do not leak existence/content.
- **API-AC07:** Lists are bounded, allowlisted and cursor-paginated with deterministic order.
- **API-AC08:** Responses preserve Unknown/missing/proxy/conflicting/suppressed/zero and expose freshness/mode/provenance.
- **API-AC09:** Farmer/RSK/MP generated clients contain no forbidden route family.
- **API-AC10:** MP service identity and API can read only verified released snapshots and approved public facts.
- **API-AC11:** Suppressed MP results physically omit hidden numbers and cannot reach Briefing/voice generation.
- **API-AC12:** Voice tickets are one-time, URL-free and bound to actor/role/origin/context/access version.
- **API-AC13:** Voice confirmation executes only the stored hash/command exactly once.
- **API-AC14:** RSK high-risk voice actions stop at visual review.
- **API-AC15:** Structured offline records remain durable and synchronize independently of media.
- **API-AC16:** Sync acknowledgement, feed, Domain effect and command receipt commit atomically.
- **API-AC17:** Bootstrap never deletes locally committed work.
- **API-AC18:** Media verification and domain attachment are separate commands/facts.
- **API-AC19:** Device acceptance is durable, replay-safe, server-mode-derived and explicitly not trust.
- **API-AC20:** Provider callback intake is immutable, fast and incapable of direct domain mutation.
- **API-AC21:** External imports preserve source/version/licence/freshness and never overwrite valid history on failure.
- **API-AC22:** Google Weather is display-only and purged at contract TTL.
- **API-AC23:** Earth Engine work is precomputed, pinned, allowlisted and consent-checked.
- **API-AC24:** Provider/network I/O never occurs while a database transaction/lock is open.
- **API-AC25:** Domain/Technical event, Integration Events and outbox are transactionally consistent.
- **API-AC26:** API/schema generation is deterministic and CI detects drift/breaking compatibility.
- **API-AC27:** Every size, rate, expiry, date range and enum is enforced server-side.
- **API-AC28:** Audit-before-disclose failure returns no protected fields.
- **API-AC29:** Export/deletion require reauthentication and cannot resurrect deleted content.
- **API-AC30:** Deletion completion requires externally acknowledged Intent and Applied ledger phases.
- **API-AC31:** General `/sync/*` rejects RSK scope; only signed assignment packs persist RSK Visit/Maintenance work offline.
- **API-AC32:** Every RSK route/action declares one exact registered capability and one exact canonical event/receipt set.
- **API-AC33:** Same Farmer sync batch identity/checksum returns the stored complete response; a different checksum conflicts.
- **API-AC34:** Protected media downloads use authenticated, generation-pinned, audit-aware streaming; upload session URIs are treated as bearer capabilities.
- **API-AC35:** Every `202` result has a realizable status route and every retrieval ticket has one declared URL-free redemption path.

## 29. Follow-on contract

`08_AI_ML_AND_AGRONOMY_SPECIFICATION.md` must define:

- Exact Evidence Snapshot inputs, freshness and quality policies.
- Crop Recommendation hard gates, scoring, confidence and explanation schemas.
- Dry-spell/advisory rules and safety boundaries.
- Crop Health extraction/triage schemas.
- Voice tool registries, prompts, validation and evaluation.
- Earth feature calculations and future ML/shadow roadmap.

It must use the API operations, data tables and canonical events defined here without adding an undocumented privileged path.
