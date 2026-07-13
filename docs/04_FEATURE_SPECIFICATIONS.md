# Smart Fasal Kisan Alert

## Feature Specifications and Acceptance Criteria

| Field | Value |
| --- | --- |
| Status | Approved |
| Version | 0.1.0 |
| Last updated | 12 July 2026 |
| Parent documents | `docs/01_PRD.md`, `docs/02_INFORMATION_ARCHITECTURE.md`, `docs/03_END_TO_END_FLOWS.md` |
| Pilot | Raigad district, Maharashtra |
| Covered surfaces | Farmer PWA, RSK desktop application, MP Office desktop application |

## 1. Purpose

This document converts the 13 approved product requirements into buildable feature contracts. It defines user-visible behaviour, inputs, decision rules, permissions, states, commands, logical events, failure handling and acceptance criteria. It deliberately does not select frameworks, cloud services, database tables, API transports or deployment topology; those belong in the technical architecture and data specifications.

## 2. Normative use

The words **must**, **must not**, **required** and **never** are release requirements. **May** denotes an allowed option. **Later** identifies an approved evolution that is not permitted to masquerade as working in the current release.

Document authority is:

1. The PRD controls product scope, stakeholders and exclusions.
2. The Information Architecture controls routes, navigation and product boundaries.
3. The End-to-End Flow Specification controls cross-feature state transitions and ownership.
4. This document controls feature-level behaviour and acceptance.
5. Later architecture, API, data, AI, security, test and design specifications must implement these contracts without weakening them.

If two approved contracts conflict, implementation stops for that behaviour until the documents are reconciled. A demo shortcut cannot silently override a safety, privacy or data-integrity rule.

## 3. Shared feature contracts

### 3.1 Identity, role and context

- The server-authorized role, capabilities and jurisdiction control every protected query and mutation.
- Farmer decisions requiring farm context must identify the farm and plot. Season-specific decisions must also identify the season.
- RSK views must show office, jurisdiction, purpose, work ownership and current consent where relevant.
- MP views must show approved geography, period, crop or stage filters, data as-of time and privacy-release state.
- Opaque identifiers are used in routes and links. Names, phone numbers, coordinates, symptoms and free text never appear in URLs.
- A demo role switcher is allowed only when visibly labelled Demo and must not grant production authorization.

### 3.2 Data mode and provenance

Every evidence item and derived decision must carry these separate concepts:

| Concept | Allowed values | Rule |
| --- | --- | --- |
| `dataMode` | `Live`, `Recorded`, `Simulated` | Exactly one value; visible on every evidence item, derived result, MP metric, Briefing and voice response |
| `provenanceTypes` | Sensor, Farmer Manual, RSK Manual, Laboratory, Soil Health Card, Weather, Satellite, Public Market, Derived | One or more values; never relabelled as a data mode |
| quality | Trusted, Use with Caution, Trend Only, Do Not Use | Determined per signal or fact |
| freshness | Current, Data Is Old, No Recent Data, Unavailable | Determined against a versioned source-specific policy |

Simulated data is excluded from default operational decisions and MP metrics. Recorded data remains dated. Manual evidence may be Live or Recorded depending on when and how it was captured.

### 3.3 Required view states

Every data-bearing screen must define and render:

- Initial loading.
- Available current data.
- Available but stale data.
- Empty but valid state.
- Explicit Unknown or missing input.
- Offline cached state.
- Waiting for Internet or queued mutation.
- Permission or consent denied.
- Suppressed aggregate state where applicable.
- Recoverable provider or server error.
- Unsupported route or entity-not-found state without existence leakage.

Spinners without a terminal explanation, blank charts, fake zeroes and dead controls are release failures.

### 3.4 Evidence presentation

Every recommendation, advisory, triage result, alert, market comparison and MP metric must expose, directly or through a labelled detail action:

- What the result means.
- The action or decision it supports.
- Evidence sources and observation or report times.
- Data as-of time and freshness.
- Confidence or limitations.
- Applicable rule, model, mapping, template or metric-definition version.
- Whether an expert reviewed it.
- Whether the data is Live, Recorded or Simulated.

Suitability, confidence, severity and priority are different concepts and must not share one unexplained score.

### 3.5 Safe mutations

- Every state-changing command requires an idempotency key and the expected entity version when concurrent changes are possible.
- Voice and assisted actions first create a proposal, read back critical fields and require explicit confirmation.
- Deep links open review destinations; they never execute the linked action.
- Corrections append a new version, correction, void or reversal event. They never erase accepted history.
- A locally saved action is not cross-role truth until server acceptance.
- Provider callbacks update only provider delivery state; they cannot acknowledge an alert, complete a Task or resolve a Case.

### 3.6 Generative AI boundary

Generative AI may:

- Extract structured intent, symptoms or fields from farmer-authorized input.
- Summarize authorized evidence with source links.
- Translate and explain a validated structured result.
- Draft a response for authorized human review.

Generative AI must not decide or invent:

- Crop eligibility or final ranking inputs.
- Measurements, data freshness or evidence quality.
- Official warning content or severity.
- Chemical or pesticide selection, brand, dose, re-entry interval or pre-harvest interval.
- Exact fertilizer quantity without all deterministic gates and an approved source table.
- Mandi price, guaranteed price, sale instruction or private market outcome.
- Case resolution, consent, authorization or MP privacy release.

If generation, translation or validation fails, the product uses reviewed deterministic content or exposes a clear unavailable state; the core workflow does not depend on fluent model output.

### 3.7 Consent and sensitive data

- Location, audio storage, case sharing, field visits, alert channels, IVR and assisted service are separately understandable and revocable scopes.
- Missing, expired and withdrawn consent are distinct states with deterministic outcomes.
- RSK protected data is revealed only after capability, jurisdiction, purpose, ownership and current-consent checks.
- Farmer-private quantity, cost, target price and sale fields require purpose-specific field-level consent.
- MP receives no direct farmer, farm, Case, device, media, exact-coordinate or private-market field.
- A consent denial is not treated as farmer failure and does not silently create an RSK case.

### 3.8 Offline and synchronization

- `Saved on this phone` appears only after the local event, local projection and outbox entry commit atomically.
- `Synced` appears only after server acceptance.
- Rejected and conflicting events remain visible in Needs Review and cannot drive cross-role or safety decisions.
- Automatic field merging is restricted to explicitly allowlisted mutable profile fields.
- Diary events, consent, crop stage, quantities, units, task outcomes and safety-sensitive advice never use generic last-write-wins.
- Public or RSK-assisted devices cannot expose unsynchronized farmer data to a later user; they block exit or use encrypted locked recovery.

### 3.9 Shared acceptance baseline

Every feature must pass all applicable baseline checks:

- Keyboard, touch, screen-reader and voice alternatives reach the same authorized outcome.
- Marathi, Hindi and English launch strings and audio fallbacks are complete for the critical path.
- All controls have a working result, an honest disabled explanation or are absent.
- Every accepted mutation is attributable and auditable.
- Every derived object retains a correlation chain to inputs and versions.
- The feature handles retry without duplicate logical results.
- Live, Recorded and Simulated scenarios are visually distinguishable.
- Unit tests cover deterministic rules; integration tests cover authorization and state transitions; an end-to-end test covers the primary user outcome.

## 4. Feature catalogue and traceability

| ID | Locked feature | Primary surface | Owning flows |
| --- | --- | --- | --- |
| FS-01 | Farmer and Farm Setup | Farmer | E2E-01, E2E-06, E2E-11 |
| FS-02 | Farmer Home and Daily Action Centre | Farmer | E2E-02, E2E-05, E2E-08 |
| FS-03 | Smart Crop Recommendation Engine | Farmer, RSK review | E2E-01 |
| FS-04 | Real-time Advisory, Dry-Spell and Input Guidance | Farmer, RSK review | E2E-02, E2E-07, E2E-10 |
| FS-05 | Crop Health Triage and Expert Care Loop | Farmer, RSK | E2E-03, E2E-14 |
| FS-06 | Multilingual Role-aware Voice Agents | Farmer, RSK, MP | E2E-04 |
| FS-07 | RSK Expert Operations Dashboard | RSK | E2E-03, E2E-07, E2E-10, E2E-11, E2E-13, E2E-14, E2E-15 |
| FS-08 | MP Office Decision Intelligence Dashboard | MP | E2E-12 |
| FS-09 | Smart Crop Calendar and Task Planner | Farmer, RSK | E2E-01, E2E-02, E2E-05 |
| FS-10 | Live Farm Monitor and Sensor Trust Centre | Farmer, RSK | E2E-02, E2E-07 |
| FS-11 | Offline Farm Diary and Sync Centre | Farmer, RSK-assisted | E2E-05, E2E-06 |
| FS-12 | Alert Inbox and Multichannel Delivery Centre | Farmer, RSK | E2E-02, E2E-08, E2E-13 |
| FS-13 | Mandi Price and Harvest Market Watch | Farmer, RSK, MP aggregates | E2E-09, E2E-15 |

## 5. FS-01: Farmer and Farm Setup

### 5.1 Outcome and entry points

The farmer has an authenticated, resumable profile with at least one usable farm and plot. Critical soil, water, crop and location facts retain source, unit, date and uncertainty. Setup is reachable through first-use onboarding, Add Farm, Add Plot, Farm Setup, Soil and Water, settings and an authorized RSK-assisted session.

First authentication and role resolution require connectivity. Once the farmer shell exists, a setup draft may resume offline. Hardware is always optional.

### 5.2 Input groups

| Group | Required behaviour |
| --- | --- |
| Language and accessibility | Marathi defaults for the Raigad pilot; farmer explicitly confirms Marathi, Hindi or English plus audio, text-size and assisted preferences |
| Device mode | Require Personal, Trusted Family or RSK-Assisted selection; explain caching and privacy consequences before confirmation |
| Consent and channels | Record separate decisions for location, audio storage, case sharing, app or push, SMS, IVR and assisted service; refusal must leave usable alternatives |
| Farmer profile | Capture only pilot-required identity and contact fields; permit voice entry, correction and explicit Unknown where the field is not an authentication requirement |
| Farm | Capture farmer-visible name or label, village or approved geography, location method and farming method; GPS is a suggestion, not a gate |
| Plot | Require parent farm, confirmed area and unit; support a point, polygon, village or landmark-assisted context; retain original and normalized area |
| Soil | Capture source, sample or collection date, test method, original value and unit for each supplied measure; permit Soil Health Card, laboratory, sensor or farmer-described soil |
| Water | Capture irrigation source, current availability, expected reliability, storage and rainfed status; do not infer reliable irrigation from a borewell label alone |
| History | Capture previous crops, rotation, known recurring stress and farmer experience when known; Unknown is valid |
| Current season | Capture crop, variety when known, actual or proposed sowing or transplanting date and stage evidence |
| Optional hardware | Allow Skip; device assignment requires a separate consented installation flow |

No financial identity, Aadhaar, credit, insurance or Web3 field is part of setup.

### 5.3 Validation and trust rules

1. Preserve the entered value and unit before normalization.
2. Read back plot, area, unit, water availability, soil values and dates before accepting them.
3. Reject impossible values; flag unusual but possible values for confirmation rather than silently clipping them.
4. Never convert `one bag`, `one tank`, a local area name or another ambiguous unit into a fixed quantity without confirmation.
5. A source date and method are required before a laboratory, Soil Health Card or sensor value can be labelled trusted.
6. Contradictory sources remain separate. The application shows the conflict and the rule that selected the current planning source.
7. Location permission refusal offers village, map-from-home, landmark and RSK-assisted alternatives.
8. Setup completeness and recommendation readiness are separate. A profile may be complete enough to use Today but still lack high-impact recommendation data.
9. Adding a new plot never overwrites an existing plot or silently switches the active season.
10. Corrections create a new profile snapshot and preserve the earlier source and decision history.

### 5.4 Setup states and outputs

```text
NOT_STARTED -> IN_PROGRESS -> READY_FOR_REVIEW -> COMPLETE
                           -> NEEDS_REVIEW
```

The review screen groups Confirmed, Unknown, Needs Review and Optional information. Completion produces a farm and plot summary, recommendation-readiness explanation, current-season next step and a visible sync state.

### 5.5 Commands and logical events

Allowed commands include Save Draft, Confirm Setup, Add Farm, Add Plot, Correct Profile, Correct Soil or Water, Confirm Current Crop and Change Device Mode. All protected changes use read-back in voice or assisted contexts.

Logical events include `farmer.setup_saved`, `farmer.preferences_changed`, `consent.decision_recorded`, `farm.created`, `farm.updated`, `plot.created`, `plot.updated`, `soil_record.added`, `water_context.updated`, `profile.snapshot_created`, `season.start_confirmed` and `farmer.setup_completed`.

### 5.6 Failure and offline behaviour

- Offline drafts identify which connected checks remain pending and never claim server completion.
- A failed normalization preserves the original entry and requests review.
- A duplicate retry returns the existing farm, plot or record instead of creating another.
- If a profile edit conflicts with a server change, only allowlisted independent profile fields may merge automatically.
- On a shared device, an unfinished profile is visible only inside its protected identity context.
- If location, audio or alert consent is declined, the related input or channel is disabled without blocking unrelated setup.

### 5.7 Acceptance criteria

- **FS01-AC01:** A farmer can complete setup in Marathi without hardware, GPS permission or a laboratory soil report.
- **FS01-AC02:** Every accepted area, soil and water value preserves original value, unit, source and date or an explicit Unknown.
- **FS01-AC03:** A critical ambiguous unit blocks normalization until confirmation.
- **FS01-AC04:** Multiple farms and plots remain distinct and selectable.
- **FS01-AC05:** Reloading after `Saved on this phone` restores the complete local draft.
- **FS01-AC06:** A confirmed crop plus proposed date may create `PLANNED_AWAITING_START`; only a confirmed actual sowing or transplanting event activates the season.
- **FS01-AC07:** Revoking one consent scope does not revoke unrelated scopes.
- **FS01-AC08:** RSK-assisted creation attributes both farmer and officer and produces a receipt.
- **FS01-AC09:** A correction preserves the earlier snapshot and recomputes only dependent current views.
- **FS01-AC10:** No excluded financial, insurance, credit or Web3 field appears.

## 6. FS-02: Farmer Home and Daily Action Centre

### 6.1 Outcome

`/farmer/today` answers three questions immediately: what needs attention first, why it matters and what the farmer can do next. It provides one primary action, no more than three priority tasks and a short listenable briefing without duplicating the detail screens that own those actions.

### 6.2 Required content

Today contains:

- Active farm or All Farms context and `Data as of` time.
- Connectivity, freshness and synchronization state when it affects the content.
- One primary action or an honest No Urgent Work state.
- Up to three unique priority Tasks, each labelled with farm, plot, window and blocking reason. If the primary action is a Task, it appears only once and counts toward the three-Task limit.
- Farm pulse with the most decision-relevant weather, rainfall, water, crop and sensor context.
- Highest-priority active alert.
- Next crop milestone.
- RSK Case or service status when active.
- Harvest or Market Watch card only when seasonally relevant.
- Report Crop Problem and Record Farm Work quick actions.
- Marathi briefing with Hindi or English according to preference.

### 6.3 Primary-action selection

The server produces a deterministic, versioned candidate list. The first actionable item wins using this order:

1. Current official warning or safety-critical `Act Now` action.
2. Current high-severity expert response or mandatory crop-health follow-up.
3. Current material advisory whose action window is open or closing.
4. Due stage-gated Task whose latest safe window is closest.
5. Actionable `Cannot Do` alternative or RSK response.
6. Confirm actual season start or critical stage when planning is blocked.
7. Harvest-preparation action within its configured window.

Within a level, choose the earliest expiry or latest-safe time, then the highest trusted evidence coverage, then stable creation order. A stale, replaced, completed, blocked or unconfirmed item cannot become the primary action unless the action is specifically to resolve that state.

The system never creates urgency merely to fill the slot. If no candidate qualifies, show No Urgent Work and the next planned milestone.

### 6.4 Briefing contract

The briefing states active farm scope, primary action, deadline, one-sentence reason, important risk or constraint, RSK update and freshness limitation. It uses the same structured payload as the visual page. It may be played, paused, repeated and opened as text. Generative rendering failure uses reviewed deterministic language.

### 6.5 Farmer actions

Each card deep-links to its owning Alert, Task, Advisory, Case, Monitor, Calendar or Market screen. Today may expose Done, Remind, Cannot Do, Ask RSK and Alert Seems Wrong only when the owning entity permits the action; the same underlying command and confirmation rules apply.

Today does not maintain a separate completion state. A Task completion creates its Diary event; an Alert response changes recipient engagement; a Case reply changes the Case timeline.

### 6.6 Offline and failure behaviour

- Offline Today shows the last accepted briefing, unresolved alerts and cached next 30 days of work with visible age.
- Cached weather, market or sensor facts never appear Current after their freshness policy expires.
- A queued action displays Saved on This Phone and remains unacknowledged across roles until synchronization.
- A partial non-critical card-provider failure removes only that card, shows a scoped explanation and leaves other actions usable. An official warning or safety-critical primary candidate must remain represented through validated cached content, a stale or unavailable warning and a safe official or RSK contact path; it never silently disappears.
- An invalid deep link returns to Today with a safe explanation and does not reveal whether another farmer's object exists.

### 6.7 Logical events

`today.briefing_generated`, `today.briefing_played`, `today.primary_action_selected`, `today.card_opened` and the linked domain command events. Viewing Today alone never emits a Task completion, Alert acknowledgement or Case response.

### 6.8 Acceptance criteria

- **FS02-AC01:** Today displays at most one primary action and three unique priority Tasks; a Task selected as primary counts once toward that limit.
- **FS02-AC02:** The primary visual action and voice briefing describe the same entity, deadline and reason.
- **FS02-AC03:** Every card identifies its farm and plot in All Farms context.
- **FS02-AC04:** Completed, replaced or expired work cannot reappear as current due to a retry or cache race.
- **FS02-AC05:** No qualifying work produces No Urgent Work rather than an invented recommendation.
- **FS02-AC06:** Offline cards show last-sync and source freshness and never claim new retrieval.
- **FS02-AC07:** Done creates exactly one linked Diary activity.
- **FS02-AC08:** Cannot Do captures a service constraint without marking farmer noncompliance.
- **FS02-AC09:** The two quick actions remain reachable with touch, keyboard and screen reader.
- **FS02-AC10:** A provider failure cannot make a stale advisory appear current.

## 7. FS-03: Smart Crop Recommendation Engine

### 7.1 Outcome

For one Raigad plot and planning season, the engine returns up to three locally supported, eligible crops with separate suitability and confidence, visible trade-offs and a complete decision snapshot. It returns No Safe Result when no candidate passes the hard gates.

The pilot decision authority is a versioned rule-gated weighted ranker. A generative model may explain the result but cannot add a crop, change a score or choose the winner.

### 7.2 Required and optional inputs

| Input group | Use |
| --- | --- |
| Approved geography and season | Build the locally supported candidate set; required |
| Proposed sowing window | Apply eligibility and duration constraints; required |
| Plot area and farming method | Explain feasibility and later planning; confirmed units required |
| Soil texture or class and trusted pH | Gate locally reviewed incompatibilities and score soil fit |
| Trusted soil nutrients, organic carbon or EC | Improve soil match when current enough; never invented |
| Irrigation source, current water and reliability | Gate minimum water feasibility and score water safety |
| Crop history and rotation | Penalize known rotation or recurring-risk conflicts and inform local feasibility |
| Rainfall history, current onset and forecast | Score establishment and seasonal weather fit |
| Google Earth Engine context | Use historical rainfall anomaly, vegetation persistence, cropping intensity, waterlogging tendency and land-cover context as bounded regional evidence |
| Groundwater caution | Penalize water-intensive choices where current approved block-level evidence applies |
| Farmer constraints | Use confirmed seed, equipment and experience constraints as local feasibility evidence |
| Mandi context | Display as dated supporting information after agronomic ranking; never rescue an ineligible crop or act as agronomic authority |

Current NDVI must not be presented as proof that a future crop will succeed. Every Satellite input states geography, observation period, spatial resolution or limitation and data age.

### 7.3 Candidate set and hard gates

A crop enters scoring only when a current approved crop profile supports the Raigad pilot geography and planning season. Before scoring, exclude it when any approved hard gate applies, including:

- Unsupported crop, geography, cultivation method or expired crop profile.
- Sowing window passed without an approved contingency variety or method.
- Minimum establishment or seasonal water requirement incompatible with confirmed available water.
- Trusted pH or other approved safety value outside the locally reviewed absolute tolerance.
- Water-intensive crop in an approved stressed-groundwater context without assured alternative water under the crop profile.
- Critical required evidence missing, contradictory or Do Not Use where the rule cannot safely degrade.
- Crop duration incompatible with the supported season or confirmed land availability.

Every exclusion retains a machine-readable reason and farmer-safe explanation. A hard-gated crop cannot return through a manual override, model score, market price or prompt.

### 7.4 Pilot suitability score

After hard gates, calculate a 0–100 score with versioned, RSK-reviewable weights:

```text
Suitability =
  0.30 * Soil Match
+ 0.25 * Water Safety
+ 0.20 * Weather and Rainfall Fit
+ 0.10 * Season and Sowing Fit
+ 0.10 * Satellite and Land Context
+ 0.05 * Local Feasibility
```

These are Raigad pilot defaults, not national agronomic constants. A published rule version may change them only through the governed template process. Scoring definitions are:

- **Soil Match:** texture or class, trusted pH, trusted nutrient status, organic carbon or EC where available and explicit missing-data treatment.
- **Water Safety:** crop demand class, source reliability, confirmed availability, storage, groundwater caution and calibrated current context where relevant.
- **Weather and Rainfall Fit:** seasonal distribution, onset, recent rainfall, forecast, establishment dry-spell risk and heat tolerance.
- **Season and Sowing Fit:** position inside the supported window, crop duration and approved contingency option.
- **Satellite and Land Context:** bounded historical signals and waterlogging or land-cover caution; no future-yield claim.
- **Local Feasibility:** rotation, confirmed seed, equipment, experience and locally supported practices.

If a non-critical value is missing, the engine uses only a documented regional proxy or a conservative component treatment defined by the rule version, labels the proxy and lowers confidence. It never fabricates a plot measurement.

### 7.5 Confidence score

Suitability answers how well an eligible crop fits known conditions. Confidence answers how dependable the input picture is.

```text
Confidence =
  0.30 * Data Completeness
+ 0.25 * Source Quality
+ 0.20 * Data Freshness
+ 0.15 * Cross-source Agreement
+ 0.10 * Regional Validation Coverage
```

The interface shows High, Medium or Low using thresholds stored in the rule version and exposes the numeric breakdown to authorized expert views. Low confidence never becomes high merely because one crop scores strongly.

### 7.6 Result contract

Each of up to three results contains:

- Rank and suitability score.
- Confidence and limitations.
- Three strongest positive reasons.
- Up to three important risks or conditions.
- Water-demand class and water warning.
- Sowing-window status and expected planning range.
- Score-component breakdown.
- Sources, observation times, freshness and proxies.
- Crop-profile and ranker version.
- Next action: compare, ask RSK or accept and confirm start event.

The result snapshot is immutable. A refresh creates a new result and explains changed inputs and ranking.

### 7.7 States and farmer actions

```text
VALIDATING_INPUT -> EVALUATING -> READY -> ACCEPTED
                 -> NEEDS_INPUT | NO_SAFE_RESULT | REVIEW_REQUESTED | FAILED
```

The farmer may Compare, Listen, View Evidence, Refresh, Ask RSK or Accept. Acceptance transactionally rechecks the Recommendation, current crop-profile and rule versions, hard-gate validity and Template approval or expiry. If valid, it snapshots the crop profile and creates exactly one `PLANNED_AWAITING_START` season for a proposed date or `ACTIVE` season for a confirmed actual event. If a required version is expired or superseded, the result remains unaccepted and enters Needs Reapproval or Refresh with an RSK path. Manual setup may only record an already-planted crop or an RSK-approved plan; it cannot bypass a planning hard gate.

### 7.8 Logical events

`recommendation.requested`, `recommendation.input_rejected`, `recommendation.generated`, `recommendation.no_safe_result`, `recommendation.review_requested`, `recommendation.accepted`, `recommendation.superseded`, `season.created` and `calendar.instantiated`.

### 7.9 Failure behaviour

- Offline requests save inputs for connected evaluation and show the last dated accepted result separately.
- Stale non-critical sources lower confidence; stale hard-gate evidence blocks the result when required by policy.
- Gemini failure uses reviewed deterministic comparison text.
- A retried request with the same key returns the same logical recommendation.
- Unsupported crops or out-of-pilot geography return a clear limitation and RSK path rather than a generic prediction.

### 7.10 Acceptance criteria

- **FS03-AC01:** Every returned crop passed every published hard gate.
- **FS03-AC02:** The documented score can be reproduced from the stored input and rule snapshot.
- **FS03-AC03:** Suitability and confidence are separately labelled and calculated.
- **FS03-AC04:** Missing inputs are visible as missing or proxy, never fabricated measurements.
- **FS03-AC05:** Mandi price cannot change eligibility or hide agronomic risk.
- **FS03-AC06:** No eligible crop returns No Safe Result with exclusion reasons and RSK help.
- **FS03-AC07:** Refresh preserves the earlier result and explains material rank changes.
- **FS03-AC08:** A proposed start creates no active stage-relative Task until actual sowing or transplanting confirmation.
- **FS03-AC09:** Gemini unavailability does not prevent viewing or accepting a validated recommendation.
- **FS03-AC10:** Simulated evidence is visible and excluded from Live claims.
- **FS03-AC11:** Acceptance revalidates governed versions and creates the season and Calendar exactly once or creates neither.

## 8. FS-04: Real-time Advisory, Dry-Spell and Input Guidance

### 8.1 Outcome

The feature turns current trusted weather and farm evidence into one stage-aware action, one versioned advisory, one canonical Alert and, when needed, one Calendar Task. It explains uncertainty, respects the farmer's actual water and input constraints and safely recalculates when evidence changes.

### 8.2 Evidence inputs

| Evidence | Required treatment |
| --- | --- |
| Crop and stage | Use confirmed or explicitly estimated stage with provenance; critical stage uncertainty may require review |
| Forecast | Preserve provider, issue time, covered geography, horizon and freshness |
| Observed rainfall | Use meaningful-rain rules defined by crop, soil and local policy; retain observation source |
| Recent irrigation | Use actual Diary event where available; do not infer completion from a planned Task |
| Soil moisture | Use only calibrated, representative and current readings for high-impact timing; otherwise Trend Only or Do Not Use |
| Soil texture or water-holding class | Select crop-stage thresholds and interpret moisture |
| Water availability | Change the feasible action; never repeatedly instruct irrigation when water is unavailable |
| Temperature, humidity or ET proxy | Use as bounded heat or loss context and label approximate methods |
| Satellite stress context | Strengthen regional or persistence context; never independently diagnose plot stress |
| Official warning | Preserve exact content and provenance; may justify immediate safety messaging |
| Trusted soil and approved crop table | Required for nutrient direction or exact deterministic fertilizer calculation |

### 8.3 Quality and trigger rules

1. Evaluate source freshness and quality before agronomic rules.
2. A single abnormal sensor value may create Inspect Field or Check Sensor, not a severe agronomic instruction.
3. `Alert` or `Severe` Smart Fasal action must satisfy the current independent-signal and persistence requirements in the published crop-stage policy, except when a versioned authorized exception rule such as an official warning or farmer-reported urgent condition applies.
4. An official warning or a farmer-reported urgent condition may bypass persistence only for its approved safety path; provenance remains visible.
5. There is no universal 7-, 10-, 14- or 21-day dry-spell rule. Meaningful rain, gap duration, moisture bands and stage sensitivity are crop-, soil- and region-versioned.
6. The engine emits No Action when new evidence does not materially change the decision.
7. A proactive Alert is created only when risk, action, deadline, severity or source authority changes materially.
8. Contradictory or policy-gated high-risk output enters RSK advisory review before farmer issuance.

### 8.4 Pilot dry-spell risk model

The pilot may use this explainable, versioned baseline after quality gates:

```text
Dry-spell risk =
  0.30 * Rainfall-gap risk
+ 0.25 * Forecast-deficit risk
+ 0.25 * Soil-moisture deficit
+ 0.10 * Heat or ET risk
+ 0.10 * Crop-stage sensitivity
```

When trustworthy plot moisture is unavailable, the policy must use an explicitly defined fallback, reduce confidence and prevent the missing signal from counting as agreement. The score is mapped by the crop-stage policy to Low, Watch, Alert or Severe; the score alone cannot bypass evidence-agreement, water-feasibility or expert-review gates.

### 8.5 Irrigation action classes

The deterministic result uses one of these classes:

- **No Action or Wait:** moisture is adequate, recent irrigation is confirmed or useful rain is expected with sufficient forecast confidence.
- **Inspect:** evidence is missing, contradictory or a sensor looks abnormal.
- **Prepare:** risk is increasing; check water, pump, bunds or moisture-conservation readiness.
- **Protective Irrigation:** locally approved limited irrigation is feasible at a sensitive stage.
- **Irrigate Within Window:** deficit, forecast and stage rules agree and irrigation is available.
- **Reduce or Avoid Irrigation:** waterlogging, recent irrigation or meaningful rain risk applies.
- **Conserve Moisture and Ask RSK:** stress is material but irrigation is unavailable or extraction is unsafe.

Exact litres, duration or flow settings require confirmed area, soil, root depth, method, delivery rate and a locally validated water model. Otherwise the feature states the action class without false precision.

### 8.6 Fertilizer and input rules

Exact nutrient quantity is permitted only when all gates pass:

1. Supported crop, variety or approved generic profile and confirmed stage.
2. Confirmed plot area and unit.
3. Current trusted Soil Health Card, laboratory result or locally validated equivalent required by the rule.
4. Current approved, geography-appropriate package-of-practice table.
5. Moisture and weather timing gates allow application.
6. pH, EC, recent application and compatibility safety gates pass.
7. The result remains inside reviewed minimum and maximum limits.

Low-cost NPK readings remain Experimental or Trend Only until locally validated and can never independently produce exact fertilizer dosage. If a gate fails, the output may advise Delay, Retest, Nutrient Support May Be Needed or Ask RSK, but not an invented quantity. Chemical selection and pesticide guidance remain outside this engine unless retrieved from current approved content and visually confirmed by an authorized expert.

### 8.7 Approved spray-Task timing

Weather-based spray rescheduling applies only to an existing pending Task whose crop, product or chemical, dose, safety interval and source were already supplied by current approved content or an identified authorized expert. The engine may change timing; it cannot select or substitute a chemical, brand, formulation, dose, mixture, re-entry interval or pre-harvest interval.

The versioned spray-timing policy checks forecast and observed rain, wind, heat, humidity or leaf-wetness conditions where supported, crop stage, Task window, previous application and approved re-entry or pre-harvest constraints. A material change proposes a new safe window inside the allowed agronomic and safety bounds and shows old window, new window, weather issue time, reasons and affected downstream Tasks.

If no safe window remains, the system cancels or blocks the pending application and requests authorized RSK review; it never recommends applying anyway. Completed spray Diary events remain factual. Keep Original records Farmer intent but cannot make a currently unsafe window the system recommendation. Advisory, Calendar change and any correction Alert are versioned and propagated atomically.

### 8.8 Advisory result contract

Every advisory contains:

- Action class and farmer-safe action text.
- Earliest, preferred and latest action time.
- Crop, plot and stage.
- Reasons and contributing signals.
- Water or input feasibility condition.
- Confidence and unresolved contradiction.
- Sources, observed or issued time and freshness.
- Expiry and next evaluation time.
- Advisory, evidence and rule versions.
- Prior advisory and change explanation when replaced.
- Understood, Done, Remind, Cannot Do, Alert Seems Wrong and Ask RSK actions as applicable.

### 8.9 States and propagation

```text
Evaluation:  EVALUATING -> NO_ACTION | DRAFT | INSUFFICIENT_EVIDENCE
                        -> UNAVAILABLE | FAILED
Review:      DRAFT -> REVIEW_REQUIRED | READY_TO_PUBLISH
REVIEW_REQUIRED -> READY_TO_PUBLISH | MORE_DATA_REQUIRED | REJECTED | EXPIRED
MORE_DATA_REQUIRED -> REVIEW_REQUIRED
Publication: READY_TO_PUBLISH -> PUBLISHING -> ACTIVE
                              -> APPROVED_PUBLICATION_PENDING | PUBLICATION_FAILED
APPROVED_PUBLICATION_PENDING -> PUBLISHING
PUBLICATION_FAILED -> PUBLISHING | REVIEW_REQUIRED
ACTIVE -> REPLACED | CANCELLED | EXPIRED
```

Publishing an Active advisory and its dependent Task is atomic. Recalculation preserves the original. A material change replaces or cancels pending advice and emits one correction Alert; completed Diary work remains factual.

`Alert Seems Wrong` pauses only repetitions of that advisory version or deduplication key. A materially new action, higher severity or official warning remains eligible.

### 8.10 Logical events

`evidence.validated`, `dry_spell.evaluated`, `advisory.evaluated`, `advisory.no_action`, `advisory.review_requested`, `advisory.issued`, `advisory.recalculated`, `advisory.replaced`, `advisory.cancelled`, `calendar.task_created`, `calendar.task_changed`, `farmer.response_recorded`, `constraint.recorded` and `rsk.work_created`.

### 8.11 Failure and offline behaviour

- No trustworthy fallback returns Insufficient Evidence and a safe next step.
- Provider outage retains the last result only with its original expiry and a stale label.
- Review completed after the action window cannot issue late advice.
- Partial publication stays `Approved, Publication Pending` and retries idempotently.
- A delayed or backfilled reading updates history but cannot trigger an expired current alert.
- Offline farmer feedback remains Saved on This Phone until accepted.

### 8.12 Acceptance criteria

- **FS04-AC01:** One uncorroborated sensor outlier cannot create an Alert or Severe agronomic action.
- **FS04-AC02:** Every high-impact Smart Fasal action satisfies the published signal-agreement or authorized exception rule.
- **FS04-AC03:** A farmer with no water never receives repeated impossible irrigation instructions.
- **FS04-AC04:** Exact fertilizer quantity cannot originate from low-cost NPK alone or generative text.
- **FS04-AC05:** Recent completed irrigation or input application prevents duplicate advice where the rule requires it.
- **FS04-AC06:** Every material reschedule shows old window, new window, reason and downstream effect.
- **FS04-AC07:** Advisory and dependent Task publish or fail as one logical change.
- **FS04-AC08:** Invalidated evidence triggers impact analysis and a versioned recalculation.
- **FS04-AC09:** No Action creates no unnecessary alert pressure.
- **FS04-AC10:** Expired advice cannot be delivered or displayed as current.
- **FS04-AC11:** A material weather change reschedules or blocks an already-approved spray Task without generatively changing its chemical, dose or safety intervals.

## 9. FS-05: Multimodal Crop Health Triage and Expert Care Loop

### 9.1 Outcome

A farmer can record a suspected crop-health problem with guided photographs, voice and short questions, receive conservative triage and complete a consented expert-care loop. The feature says possible cause, not confirmed diagnosis, and preserves AI, expert and farmer observations separately.

### 9.2 Capture contract

The farmer must select or confirm the plot and crop before capture. The guided flow requests, when relevant:

1. A whole plant or affected field patch.
2. A close view of the affected leaf, stem, fruit, root or other part.
3. A reverse side or environmental-context view.

The symptom flow captures affected part, visible pattern, start time, spread speed, estimated affected area band, recent rain or heat, irrigation and recent fertilizer or spray activity. It accepts voice and tap choices and preserves explicit Unknown.

Audio is retained only with audio-storage consent. A transcript and extracted fields never erase or silently modify the farmer's original account.

### 9.3 Evidence-quality checks

Before triage, evaluate:

- Blur and motion.
- Darkness or overexposure.
- Whether a plant or relevant field area is visible.
- Capture distance and affected-part visibility.
- Required context or angle.
- Crop, plant part and symptom completeness.
- Agreement between image and structured description.

An unusable image produces a specific retake prompt. If the farmer cannot retake, the report may continue with lower evidence quality and conservative escalation, but cannot produce an overconfident visual conclusion.

### 9.4 Triage rules and result

The triage service returns a validated structured result containing:

- Up to three possible cause categories supported for the pilot, or Unsupported or Unclear.
- Evidence-quality band.
- Low, Moderate, High or Critical severity.
- Spread-risk band.
- Confidence with component limitations.
- Safe immediate precautions.
- Evidence still needed.
- Whether expert review is required and why.
- Triage model, prompt or rule version and completion time.

Farmer-facing confidence combines model certainty, image quality, crop and plant-part certainty, image–symptom agreement, local class support, relevant confirmed examples and severity risk. No universal model-probability threshold is treated as field accuracy.

Safe AI precautions are limited to low-risk steps such as capture a clearer image, inspect nearby plants, avoid unnecessary spray, preserve a sample safely or request expert review. Generative AI cannot choose a pesticide, fungicide or chemical, brand, dose, re-entry interval or pre-harvest interval.

### 9.5 Mandatory escalation

Escalation is required when any published condition applies, including:

- Severe or rapidly spreading symptoms.
- Meaningful loss risk with low or medium confidence.
- Possible outbreak or contagious pattern.
- Unsupported crop, part or suspected issue.
- Repeated unresolved or worsening report.
- Contradictory image and symptom evidence.
- Any next step requiring chemical treatment.
- Farmer explicitly asks for an expert.

With current case-sharing consent, escalation creates one Case and a purpose-limited pack, normally covering only the relevant 14–30 days of crop, weather, activity and trusted sensor context. Without consent, store `Escalation Recommended - Sharing Declined`, provide the direct RSK or appropriate urgent-contact route and withhold unsafe self-treatment guidance. No evidence is shared.

### 9.6 Case and care contract

The Farmer app shows `New`, `Evidence Review`, `Awaiting Farmer`, `Care Plan Issued`, `Follow-up Due`, `Resolved`, `Closed` or `Reopened`. AI triage and expert guidance have distinct labels and authorship.

An authorized RSK expert may request evidence, issue an approved care plan, create follow-up Tasks or schedule a Visit. Chemical instructions must reference current approved content or an identified authorized expert and retain source and version.

The farmer records Improved, Unchanged, Worsened, Could Not Follow, Alternative Cause or Unable to Assess. Resolution requires outcome, reason and mandatory follow-up. High or Critical resolution requires Agronomy Expert authority. Worsening evidence reopens the same Case and preserves the prior closure.

### 9.7 Commands and logical events

Farmer commands include Save Report, Attach Media, Submit for Triage, Review Sharing, Share with RSK, Decline Sharing, Answer Evidence Request and Record Follow-up. RSK commands are specified in FS-07.

Logical events include `health_report.saved`, `health_media.queued`, `health_report.synced`, `triage.completed`, `triage.escalated`, `triage.escalation_sharing_declined`, `case.created`, `case.evidence_requested`, `case.care_plan_issued`, `case.visit_scheduled`, `case.follow_up_recorded`, `case.resolved`, `case.closed` and `case.reopened`.

### 9.8 Offline and failure behaviour

- Offline reports and media remain Waiting for Internet; analysis and Case creation cannot appear complete.
- AI outage keeps model triage pending, but deterministic severity answers and mandatory-escalation rules still create a consented RSK Case when their conditions pass. The app displays the unavailable AI result, safe limitations and direct RSK path.
- Missing or withdrawn sharing consent blocks new RSK evidence access.
- An expired treatment source blocks care-plan issuance.
- Failed expert-response delivery keeps the Case open and creates outreach.
- Duplicate reports retain both farmer events but may link to one Case.
- Media upload retries by checksum and never silently substitutes a lower-resolution image without labelling it.

### 9.9 Acceptance criteria

- **FS05-AC01:** Poor-quality evidence cannot produce a high-confidence farmer-facing conclusion.
- **FS05-AC02:** Every result says possible issue or unclear, never confirmed diagnosis.
- **FS05-AC03:** Every mandatory escalation creates a Case when consent exists.
- **FS05-AC04:** Declined sharing creates no evidence pack or contact disclosure.
- **FS05-AC05:** AI can never originate prohibited chemical details in any launch language.
- **FS05-AC06:** RSK sees only purpose-relevant, consented evidence.
- **FS05-AC07:** Expert guidance displays identity, source, version and follow-up.
- **FS05-AC08:** A severe Case cannot close before mandatory follow-up.
- **FS05-AC09:** Offline media survives restart and does not imply successful analysis.
- **FS05-AC10:** Worsening evidence reopens without deleting earlier resolution history.

## 10. FS-06: Multilingual Role-aware Voice Agents

### 10.1 Outcome and identities

Every stakeholder can ask natural questions, hear the current product result and propose authorized actions through the same domain services used by the visual applications:

| Surface | Voice identity | Primary purpose |
| --- | --- | --- |
| Farmer | Kisan Saathi | Understand the farm, complete simple actions and request help |
| RSK | Expert Voice Copilot | Navigate work, explain evidence and draft authorized service actions |
| MP | Constituency Voice Copilot | Query and explain privacy-released aggregates and draft briefings |

Voice is always optional. All critical outcomes have touch, keyboard and assisted alternatives.

### 10.2 Interaction lifecycle

```text
IDLE -> LISTENING -> TRANSCRIBING -> INTENT_REVIEW
     -> CLARIFICATION | QUERYING | PROPOSAL_PENDING
     -> CONFIRMATION -> EXECUTING -> SPEAKING -> COMPLETE
     -> CANCELLED | FAILED
```

The overlay preserves the originating route, selected context and focus. It displays the transcript and recognized context before a mutation. Closing restores focus to the opening control.

### 10.3 Shared intent and tool rules

1. The voice layer receives role, language, current route and only opaque authorized context identifiers.
2. It maps speech to an intent from a versioned allowlist and validates structured slots.
3. Low-confidence or ambiguous critical slots require a short clarification.
4. Read intents call the same authorized query as the equivalent screen.
5. Mutation intents create a proposal only.
6. The proposal reads back actor context, target, action, date, quantity or unit, sharing effect and material consequence.
7. Confirm executes the same idempotent domain command as the visual flow. Correct returns to proposal. Cancel creates no domain mutation.
8. The answer states scope, evidence source, time, freshness and confidence and links to the visual destination.
9. Voice history is limited to the current authorized session. Raw audio and transcript are not retained merely for analytics.
10. A language or model failure falls back to reviewed visual content and deterministic audio where available.

### 10.4 Farmer intent registry

The launch allowlist must include:

- Hear Today's briefing or next action.
- Ask current soil, weather, rainfall, water or trusted sensor status.
- Ask which crops are recommended and why.
- Ask whether a current irrigation or input action applies.
- Hear a Task, Alert, Advisory or expert reply.
- Mark a Task Done or Partly Done, Remind, Cannot Do or dispute an advisory.
- Record Farm Work or an observation.
- Begin Crop Health reporting.
- Ask RSK or respond to a Case request.
- Hear harvest readiness, dated mandi information or a target watch.
- Navigate among Farmer destinations.

Plot, season, date, quantity, unit, sharing and completion changes require read-back and confirmation.

### 10.5 RSK intent registry and restrictions

RSK voice may:

- Navigate and filter the authorized Work Queue.
- Open an authorized Case, advisory review, outreach item, Visit, sensor issue, template or market item.
- Summarize consented evidence with source links and freshness.
- Draft an evidence request, farmer response, Task, Visit or outreach note.
- Retrieve approved chemical guidance for visual review.

It cannot complete by voice alone:

- Template publication or rollback.
- Bulk alert approval or publication.
- Chemical selection or dose issuance.
- High or Critical Case closure.
- Agronomic sensor invalidation.
- High-impact market mapping approval.

Those intents stop at a fully populated visual review. Sensitive identity or Case detail is not spoken until the user confirms a private environment.

### 10.6 MP intent registry and restrictions

MP voice may navigate, set allowlisted geography or period filters, summarize released metrics, compare two approved released scopes, explain methodology, read a saved briefing and propose a briefing draft.

It cannot request or retrieve a farmer, farm, Case, device, raw record or exact location; send an Alert; override RSK work; introduce a free-form analytical dimension; or bypass suppression through repeated questions. Suppressed visual data remains suppressed through voice.

### 10.7 Offline audio and consent

With explicit audio-storage consent, offline audio may be stored encrypted and labelled Voice Saved, Transcription Pending. Later transcription becomes Needs Confirmation and cannot execute any command automatically. Without audio-storage consent, a failed live recording is discarded and the user receives a tap or text alternative.

### 10.8 Logical events

The voice layer emits metadata-only logical events such as `voice.session_started`, `voice.intent_recognized`, `voice.clarification_requested`, `voice.proposal_created`, `voice.proposal_confirmed`, `voice.proposal_cancelled`, `voice.provider_failed` and `voice.session_ended`. Confirmed mutations also emit the owning domain event. Audit telemetry excludes raw transcript content by default.

### 10.9 Acceptance criteria

- **FS06-AC01:** Voice and visual reads return the same authorized result for the same context.
- **FS06-AC02:** Every state-changing voice action requires contextual read-back and explicit confirmation.
- **FS06-AC03:** Cancel produces no domain mutation.
- **FS06-AC04:** A voice user cannot broaden role, jurisdiction, ownership or consent.
- **FS06-AC05:** MP voice cannot infer a suppressed cell through rephrasing.
- **FS06-AC06:** Prohibited RSK actions always stop at visual review.
- **FS06-AC07:** Offline transcription never auto-executes.
- **FS06-AC08:** Audio without storage consent is not persisted after a failed live attempt.
- **FS06-AC09:** Every critical Farmer flow remains usable without speech services.
- **FS06-AC10:** Closing voice restores the original screen and focus position.

## 11. FS-07: RSK Expert Operations Dashboard

### 11.1 Product boundary and capabilities

The RSK application is a permission-aware operations workspace, not an unrestricted farmer directory or decorative analytics dashboard. The Work Queue is its operational source of truth. Header notifications only deep-link to existing work.

Capabilities may be combined only through explicit server claims:

| Capability family | Permitted responsibility |
| --- | --- |
| Service Agent | Assigned service work, evidence requests, outreach and drafts of routine responses; issuance requires the protected domain action granted for that response class |
| Agronomy Expert | Agronomic review, care plan, high-risk advisory decision and severe-case outcome |
| Field Officer | Assigned field-visit execution and evidence capture |
| Sensor Technician | Installation, calibration, diagnosis and maintenance; no agronomic invalidation |
| Content Editor | Draft structured crop and advisory content |
| Approver | User-interface grouping for independently granted domain approval capabilities; there is no generic server-side `approve_anything` permission |
| Alert Publisher | Alert draft and publication duties explicitly granted |
| Market Data Reviewer | Review commodity, grade, form and unit mappings |
| Market Data Approver | Independently approve a policy-classified high-impact mapping |
| RSK Manager | Assignment, capacity and workflow management; no implicit expert or publication authority |
| Auditor | Scoped read-only audit and authorized investigation |

Market capabilities are RSK capabilities, not additional stakeholders. No role receives implicit access because it is called Manager or Administrator. The pilot prohibits unstructured break-glass access.

Protected actions use domain-specific server claims:

| Protected action | Required capability | Additional rule |
| --- | --- | --- |
| Draft routine Case response | `case.response.draft` | Uses approved content; cannot issue an agronomic Care Plan |
| Issue Case Care Plan | `case.care_plan.issue` | Agronomy Expert; current source and consent required |
| Resolve High or Critical Case | `case.severe.resolve` | Agronomy Expert and mandatory follow-up complete |
| Decide high-risk Advisory | `advisory.review.decide` | Agronomy Expert; frozen evidence and current consent |
| Start Assisted Session | `assisted_session.operate` | Declared purpose, farmer verification and consent |
| Approve, assign or reassign Visit | `visit.manage` | No implicit agronomy authority |
| Execute Visit | `visit.execute.field` or `visit.execute.sensor` | Current assignee and matching Visit purpose |
| Review Visit outcome | `visit.outcome.review` | Capability must match agronomic, service or sensor Visit class |
| Invalidate Sensor evidence for advice | `sensor.agronomic_invalidate` | Agronomy Expert; Technician may only mark Suspect |
| Draft, approve and publish Template | `template.draft`, `template.approve`, `template.publish` | Safety-sensitive creator cannot approve own version |
| Review or approve market mapping | `market.mapping.review`, `market.mapping.approve` | High-impact creator cannot approve own version |
| Draft, approve or publish bulk Alert | `alert.draft`, `alert.approve`, `alert.publish` | `Act Now` creator cannot approve own version |
| Inspect delivery health or retry delivery | `alert.delivery.monitor`, `alert.delivery.operate` | Retry creates a new attempt; no manual Delivered or Acknowledged state |
| Inspect sensitive audit evidence | `audit.investigate_sensitive` | Declared investigation purpose and separate audit |

### 11.2 Work Queue

Route: `/rsk/work`.

The Queue supports My Work, Urgent and Overdue, Unassigned, Awaiting Farmer, Scheduled, Recently Completed and manager-only Team Workload. Each row contains priority, due or SLA, type, masked subject, village, crop or stage, reason, evidence freshness, status and owner.

```text
NEW -> ASSIGNED -> IN_PROGRESS
IN_PROGRESS -> AWAITING_FARMER | SCHEDULED
AWAITING_FARMER | SCHEDULED -> IN_PROGRESS
IN_PROGRESS -> RESOLVED | CANCELLED | DUPLICATE
RESOLVED -> REOPENED -> IN_PROGRESS
```

Work status, priority, overdue flag and owning domain state are separate. Priority is deterministic:

1. Safety-critical or severe Crop Health.
2. Urgent unacknowledged Alert.
3. Farmer-requested expert help.
4. SLA breach or follow-up due.
5. Sensor fault affecting active advice.
6. Scheduled Visit.
7. Routine review.

Tie-breaks use earliest SLA or deadline, higher safety severity, older `receivedAt`, then stable work ID. Priority never uses wealth, land size, predicted yield or political importance. A mass weather event creates one incident; farmer-level work is limited to exceptions requiring individual service.

Contact remains masked until successful claim, declared purpose, jurisdiction and current-consent checks. Claim uses expected-version concurrency; only one claimant can succeed. Resolving Work also validates the owning domain's closure rules.

Commands include Claim, Assign, Reassign, Start, Resume, Await Farmer, Schedule, Resolve, Reopen, Cancel and Mark Duplicate. Logical events include `rsk.work_created`, `rsk.work_assigned`, `rsk.work_claimed`, `rsk.work_started`, `rsk.work_resumed`, `rsk.work_waiting`, `rsk.work_scheduled`, `rsk.work_resolved`, `rsk.work_reopened`, `rsk.work_cancelled` and `rsk.work_marked_duplicate`.

Reopening a Case, Sensor Issue or other domain entity must atomically reopen its linked resolved Work interval or create a new active Work interval linked to the prior one. The Queue cannot omit an actionable reopened domain entity, and the earlier service interval remains immutable for reporting.

### 11.3 Crop-health Case workspace

Routes: `/rsk/cases` and the Case overview, Evidence, Care Plan, Timeline and Consent and Access tabs.

The persistent header shows Case ID, severity, workflow state, SLA, owner, crop and stage, village, consent, last farmer contact and evidence freshness. Severity is independent of Case and Work state.

The default evidence pack contains only the consented purpose-relevant period, normally 14–30 days. It shows transcript before raw audio and excludes unrelated Diary, media, costs, target prices and sales.

Authorized actions are Claim Work, Request Evidence, Draft Routine Response, Issue Care Plan, Create Follow-up Task, Schedule Visit, Escalate, Resolve and Reopen. `case.response.draft` may prepare a routine response from approved content, but only `case.care_plan.issue` may issue an agronomic Care Plan. Rules are:

- AI output is labelled Triage; the original evidence stays accessible to the authorized reviewer.
- Contact and evidence require a fresh access decision.
- Missing or contradictory evidence creates a structured request.
- Chemical guidance requires current approved content or an identified authorized expert.
- High or Critical resolution requires Agronomy Expert capability.
- Resolution requires outcome, reason and every mandatory follow-up. Closure adds only the configured confirmation or review window; it cannot compensate for unfinished follow-up.
- Worsening evidence reopens the same Case.

Logical events are `case.created`, `case.contact_access_authorized`, `case.evidence_accessed`, `case.evidence_requested`, `case.care_plan_issued`, `case.visit_scheduled`, `case.follow_up_recorded`, `case.resolved`, `case.closed` and `case.reopened`.

### 11.4 High-risk advisory review

Routes: `/rsk/agronomy/advisory-reviews` and `/rsk/agronomy/advisory-reviews/:reviewId`.

```text
Decision:    PENDING -> CLAIMED -> REVIEWING
                     -> APPROVED | APPROVED_WITH_REVISION
                     -> MORE_DATA_REQUIRED | REJECTED | EXPIRED
MORE_DATA_REQUIRED -> REVIEWING

Publication: NOT_READY -> READY -> PUBLISHING
                       -> PUBLISHED | FAILED | BLOCKED | EXPIRED
```

The review initially contains protected evidence references, not a materialized farmer dataset. Before every read, the server checks Agronomy Expert capability, jurisdiction, individualized-service purpose and current consent. Missing, expired and withdrawn consent yield distinct blocked states.

With authorization, the system freezes crop, stage, water, weather, rainfall, trusted sensor context, freshness, current Task, prior advisory, rules and action window. The expert sees disagreements, uncertainty and old-versus-proposed action.

The expert may change only fields permitted by the rule classification. Safety-sensitive input or chemical fields require a current approved structured source. Evidence or consent change invalidates the draft. Approval means a human decision is ready for publication; it is not farmer issuance, response or completion. The Advisory and dependent Task publish atomically; a material change creates one correction Alert. An expired action window cannot publish.

A failed publication remains Failed and keeps the Work item actionable. Retry creates a new publication attempt against the same approved decision only if evidence version, consent and action window still pass; otherwise it returns to review. Work resolves only after Published, or after a terminal Rejected or Expired decision with reason. Farmer and MP issuance metrics use Published only.

Events are `advisory.review_claimed`, `advisory.consent_checked`, `advisory.evidence_accessed`, `advisory.review_decided`, `advisory.publication_started`, `advisory.publication_retried`, `advisory.published`, `advisory.publication_failed` and `advisory.publication_blocked`.

### 11.5 Alert outreach and constraint resolution

Routes: `/rsk/alerts/outreach` and `/rsk/alerts/outreach/:outreachId`.

```text
NEW -> ASSIGNED -> ATTEMPTING_CONTACT
    -> REACHED | NOT_REACHED | CORRECTION_REQUIRED
    -> FOLLOW_UP_SCHEDULED -> RESOLVED
```

The outreach record references but never edits the frozen canonical Alert version. After claim, purpose and current-contact-consent checks, the Service Agent may reveal the minimum contact method, verify the farmer and read the exact active Alert in the farmer's language.

Allowed outcomes are Heard, Understood, Already Done, Cannot Do, Disputes Advice, Needs Explanation, Wrong Recipient and No Answer. Cannot Do records an allowlisted constraint and routes an approved alternative, support Case, Visit or No Feasible Alternative. It never labels noncompliance. A dispute pauses only repetitions of the disputed version or deduplication key. Wrong Recipient stops disclosure and creates correction work. No Answer follows the configured bounded retry policy and never becomes Heard.

Resolution requires outcome, next owner and mandatory follow-up. Events are `outreach.created`, `outreach.assigned`, `outreach.claimed`, `outreach.contact_access_checked`, `outreach.contact_revealed`, `outreach.attempted`, `outreach.response_recorded`, `constraint.recorded`, `outreach.follow_up_scheduled`, `outreach.resolved`, `contact.correction_requested` and `advisory.disputed`.

### 11.6 Alert Delivery Health

Route: `/rsk/alerts/delivery-health`.

The screen helps authorized RSK operations staff distinguish a provider incident from an individual delivery exception and route a safe next step. It displays channel and provider health, signed-callback freshness, terminal Failed or Unknown attempts, error category, language, canonical Alert version, expiry, retry eligibility and masked recipient context. Alert content remains read-only.

Per-attempt state is owned by FS-12. Provider incidents use:

```text
OPEN -> TRIAGED -> MITIGATING -> MONITORING -> RESOLVED
RESOLVED -> REOPENED -> TRIAGED
```

`alert.delivery.monitor` can query delivery health and incident history. `alert.delivery.operate` may create a new eligible retry attempt, choose another policy-approved consented channel, pause new non-critical attempts for an affected provider, create outreach or contact-correction Work and resolve an incident with evidence. It cannot edit the canonical Alert, change an official warning, mark an attempt Delivered, mark a recipient Acknowledged or complete the linked Task.

A retry always uses a new attempt ID linked to the terminal attempt and rechecks current consent, Alert expiry, language, channel policy and retry limit. Provider Accepted, Failed and Unknown remain exactly as reported. An individual delivery-failure Work item resolves only after a qualifying new delivery, accepted outreach or contact-correction outcome, Alert expiry or a documented terminal no-channel-available outcome. Provider-incident resolution does not silently resolve individual exceptions.

Logical events include `alert.delivery_incident_created`, `alert.delivery_incident_triaged`, `alert.delivery_mitigation_started`, `alert.delivery_incident_resolved`, `alert.delivery_incident_reopened`, `alert.retry_requested`, `alert.alternate_channel_selected`, `alert.provider_noncritical_pause_started` and `alert.delivery_exception_resolved`. Every action retains actor, provider, channel, reason and correlation ID without copying sensitive payload content.

### 11.7 Assisted Farmer Session

Routes: `/rsk/assist/new`, `/rsk/assist/find-farmer`, `/rsk/assist/:sessionId` and its receipt.

The officer selects a purpose before a masked, jurisdiction-filtered, rate-limited farmer search. Search is audited and excluded from recent-search history and product analytics. Verification precedes additional disclosure. The officer explains data, actions, media, duration and receipt; the farmer grants purpose-specific consent.

The active shell visibly says `Assisting this farmer` and blocks templates, bulk Alerts, audit search, unrelated Cases and another farmer. Every mutation reads back farmer, plot, value and consequence and records both farmer and officer.

Session checkpoints are Purpose Selected, Farmer Verified, Awaiting Consent, Active, Awaiting Sync, Receipt Issued, Revoked, Client Data Purged and Recovery Locked. Another farmer cannot open while sensitive work is unsynchronized. End revokes authority and purges client data only after confirmed sync or authorized locked recovery.

Failed verification reveals no additional data and rate-limits retry. Consent refusal ends without mutation. Consent withdrawal, consent expiry or session timeout while Active immediately revokes new reads and commands, hides protected content and requires re-verification or a new scope; locally committed unsynced work captured while consent was valid moves to locked recovery until safely synchronized or rejected. A lost device revokes the server session and invalidates encrypted material. A server-rejected offline mutation remains an unresolved correction on the receipt and cannot be represented as completed.

Events are `assisted.search_attempted`, `assisted.farmer_verified`, `assisted.consent_checked`, `assisted.session_started`, `assisted.protected_data_accessed`, `assisted.mutation_confirmed`, `assisted.receipt_issued`, `assisted.session_revoked`, `assisted.client_data_purged` and `assisted.recovery_locked`.

### 11.8 Field Visits

Routes: `/rsk/visits/today`, `/rsk/visits/calendar`, `/rsk/visits/unassigned`, `/rsk/visits/new` and `/rsk/visits/:visitId`.

```text
REQUESTED -> APPROVED -> SCHEDULED -> ASSIGNED -> ACCEPTED
          -> IN_PROGRESS -> AWAITING_SYNC -> COMPLETED
          -> OUTCOME_REVIEWED -> CLOSED
          -> CANCELLED | RESCHEDULE_REQUIRED
```

A Case, outreach item, sensor work order or farmer request proposes the purpose, urgency and evidence need. Current visit consent is required. The farmer receives date, purpose, officer role and change controls.

Exact contact and location are available only to the current assignee during the configured travel and visit window. The encrypted minimum pack contains purpose, display identity, permitted contact, authorized location, crop and stage, bounded evidence, requested observations, safety notes and consent expiry.

At arrival the officer reverifies the farmer and purpose, records only necessary structured observations and reads back the summary. A Visit grants no implicit agronomy approval. Offline completion remains Awaiting Sync. Closure requires accepted server outcome, any mandatory review, farmer-visible receipt and client purge proof. Reassignment revokes the prior pack first.

Consent withdrawal, expiry, Visit cancellation, reassignment or lost-device report immediately revokes the location token and encrypted pack, blocks further reads and schedules client purge. Any already-captured offline evidence is either synchronized under the consent and authorization valid at occurrence according to policy, or remains locked for authorized disposition; it is never left browsable. A late Visit requires new consent confirmation and a new pack.

Events are `visit.requested`, `visit.consent_checked`, `visit.approved`, `visit.scheduled`, `visit.assigned`, `visit.pack_issued`, `visit.location_accessed`, `visit.started`, `visit.observation_recorded`, `visit.farmer_response_recorded`, `visit.saved_offline`, `visit.synced`, `visit.completed`, `visit.outcome_reviewed`, `visit.closed`, `visit.access_revoked` and `visit.client_data_purged`.

### 11.9 Sensor Operations

Routes cover Issues, Device detail, Maintenance, Work Order and Installation under `/rsk/sensors`.

The Sensor Technician records consent, device and gateway identity, model, firmware, plot zone, depth, expected interval, installation evidence, calibration and baseline. Telemetry activation is distinct from eligibility for agronomic use.

Raw observations remain immutable. The quality service evaluates clock, schema, range, rate of change, flatline, packets, calibration, battery, signal and freshness. A Technician may diagnose and mark an interval Suspect. Only an Agronomy Expert may determine agronomic impact, invalidate its use in advice and approve safety-relevant recalculation.

Device detail separates raw from validated values and shows calibration, anomalies, affected decisions and maintenance history. Invalidating an interval quarantines it, identifies affected advisories, recalculates from remaining trusted evidence and preserves original and new decisions. A material change emits one correction Alert. Return to Service requires the configured validation period.

Sensor Issue and Maintenance Work Order have independent lifecycles:

```text
Issue: OPEN -> TRIAGED -> INVESTIGATING -> IMPACT_REVIEW
     -> MAINTENANCE_REQUIRED | NO_FAULT_FOUND
     -> RESOLVED -> REOPENED
REOPENED -> TRIAGED

Work Order: NEW -> ASSIGNED -> IN_PROGRESS -> AWAITING_SYNC
          -> VALIDATING -> COMPLETED -> CLOSED
          -> CANCELLED
```

An Issue can resolve only after its interval and affected-decision review is recorded, required maintenance is completed or No Fault Found is justified, material farmer correction is delivered or queued under Alert policy and no required validation remains. A Work Order completes only after accepted maintenance outcome; Return to Service additionally requires successful validation. Reopening either domain entity creates or reopens linked RSK Work.

Exact maintenance location is shown only to the assigned Technician during the authorized window after a current consent check. Events include the Sensor events in FS-10 plus `sensor.issue_triaged`, `sensor.issue_resolved`, `sensor.issue_reopened`, `sensor.maintenance_started`, `sensor.maintenance_validation_started` and `sensor.maintenance_closed`.

### 11.10 Calendar Reviews

Routes: `/rsk/agronomy/calendar-reviews` and `/rsk/agronomy/seasons/:seasonId`.

An authorized `calendar.review` user receives the request source, consent scope, season and Template snapshot, confirmed and disputed stage evidence, affected pending Tasks, farmer actuals, weather or Advisory evidence, proposed change, safety class and expiry.

```text
Decision: NEW -> CLAIMED -> REVIEWING
              -> MORE_DATA_REQUIRED | AWAITING_FARMER
              -> APPROVED_CHANGE | NO_CHANGE | REJECTED | EXPIRED
MORE_DATA_REQUIRED | AWAITING_FARMER -> REVIEWING

Application: NOT_READY -> APPLYING -> APPLIED | FAILED
```

Allowed decisions are confirm or correct the planning stage with provenance, reschedule or replace pending Tasks, cancel an inapplicable pending Task, add an individual approved Task or record No Change. An individual-season override never mutates the master Template, erase a farmer actual or convert a proposed start into an actual start without the confirmation rule in FS-09. A safety-sensitive change enters high-risk Advisory review.

Commands include Claim Calendar Review, Request Evidence, Request Farmer Confirmation, Approve Season Change, Record No Change, Reject, Expire and Apply Approved Change. A failed application keeps Work active and retries idempotently only while evidence, consent and season versions remain valid.

Events include `calendar.review_created`, `calendar.review_claimed`, `calendar.review_evidence_requested`, `calendar.review_decided`, `calendar.change_application_started`, `calendar.change_applied` and `calendar.change_application_failed`. Work resolves only after Applied, No Change, Rejected or Expired with a reason.

### 11.11 Crop-template governance

Routes cover Templates, versions and change requests under `/rsk/agronomy`.

An individual-season override creates a versioned plan change and never mutates the master Template. Template lifecycle is:

```text
DRAFT -> REVIEW -> CHANGES_REQUESTED -> REVIEW -> APPROVED -> EFFECTIVE
      -> EXPIRED | RETIRED | ROLLED_BACK
```

Every version records crop, variety, geography, season, cultivation method, irrigation class, stages, windows, dependencies, rules, sources, units, author, reviewer, effective date, review or expiry date and reviewed translations.

Before approval, validate schema, units, transitions, dependency cycles, source validity, translation completeness and agronomy scenarios. Safety-sensitive versions require two-person review; the editor cannot approve the same version. Publication affects eligible new seasons only. Existing seasons retain their snapshot. Active-season safety changes use Advisory or Calendar correction. Expiry blocks new seasons. Rollback selects a prior approved version for future use and preserves the defective version.

Events are `template.version_created`, `template.submitted`, `template.changes_requested`, `template.approved`, `template.activation_started`, `template.published`, `template.activation_failed`, `template.expired`, `template.retired` and `template.rolled_back` plus the Calendar events in FS-09. Effective is derived only from successful `template.published`; Approved alone cannot drive a new season.

### 11.12 Market Support and Mapping

Routes cover farmer support requests, Commodity Mappings, Data Quality and the verified Directory under `/rsk/market`.

Farmer Market Support uses:

```text
NEW -> ASSIGNED -> IN_PROGRESS -> AWAITING_FARMER
    -> ADVICE_PROVIDED -> FOLLOW_UP_DUE -> RESOLVED -> CLOSED
    -> CANCELLED | DUPLICATE
```

`market.support` permits purpose-limited explanation of public grade, mapping, report freshness, harvest preparation and logistics information. The request stores farmer question, crop and harvest context, selected public record, purpose, consent, response source and follow-up. Quantity, cost, target price, selected or preferred market and sale details require separate field-level consent; none are required for mapping.

Commands include Claim Support Request, Request Farmer Information, Provide Sourced Explanation, Refer Mapping Issue, Create Follow-up, Resolve, Close, Cancel and Mark Duplicate. Events include `market.support_created`, `market.support_claimed`, `market.support_information_requested`, `market.support_response_issued`, `market.support_follow_up_recorded`, `market.support_resolved` and `market.support_closed`. Work cannot resolve before a sourced outcome or terminal reason.

Raw public market records are immutable. Unknown commodity, variety, grade, form or unit values remain excluded from comparable results until an authorized Market Data Reviewer decides:

```text
UNMAPPED -> IN_REVIEW -> MORE_EVIDENCE_NEEDED
         -> APPROVED_EXACT | APPROVED_WITH_CAVEAT | REJECTED_INCOMPATIBLE
         -> SUPERSEDED
MORE_EVIDENCE_NEEDED -> IN_REVIEW
```

Exact requires semantic and unit equivalence. Approved with Caveat requires a farmer-visible caveat. Unit conversion is deterministic and versioned, retaining original values. High-impact mappings require independent Market Data Approver confirmation; a creator cannot approve the same version.

Publishing creates an immutable mapping version and reprocesses affected records, comparisons and target evaluations. Earlier derived results remain. Conflicting official evidence stays More Evidence Needed. Rollback activates a previously approved mapping through a new attributable active-version decision, triggers a new reprocessing run and preserves the defective and prior derived versions. RSK cannot change official prices, endorse a buyer, execute a sale or promise a price.

Mapping events are the `market.*` events in E2E-15 and FS-13 plus `market.mapping_rollback_started`, `market.mapping_rolled_back` and the resulting reprocessing events.

### 11.13 Alert drafting and approval

Routes: `/rsk/alerts/drafts`, `/rsk/alerts/drafts/:draftId`, `/rsk/alerts/active` and `/rsk/alerts/:alertId`.

```text
AlertDraft: DRAFT -> SUBMITTED -> IN_REVIEW
          -> CHANGES_REQUESTED -> DRAFT
          -> REJECTED | APPROVED
APPROVED -> PUBLISHING -> PUBLISHED | PUBLICATION_FAILED
PUBLICATION_FAILED -> PUBLISHING
DRAFT | SUBMITTED | IN_REVIEW | CHANGES_REQUESTED | APPROVED | PUBLICATION_FAILED
      -> CANCELLED | EXPIRED

CanonicalAlertVersion: ACTIVE -> CORRECTED | CANCELLED | REPLACED | EXPIRED
```

Alert Operations may draft a farmer outreach or bulk Alert only from an approved source and template. Official warning content, severity, certainty, effective time, expiry and provenance are locked from alteration; a Smart Fasal explanation is separate. Draft input includes geography, eligibility policy, language variants, priority, channels, effective time, expiry, source and preview of the privacy-safe cohort definition.

`AlertDraft` owns composition, review and publication. `CanonicalAlertVersion` is a separate runtime entity owned by FS-12. Commands are Create Draft, Edit Draft, Submit, Request Changes, Reject, Approve, Publish, Retry Publication, Cancel Draft and Expire Draft. Editing an Approved version creates a new Draft and requires approval again. Bulk `Act Now` publication requires distinct `alert.draft`, `alert.approve` and `alert.publish` checks, and the creator cannot approve the same version. Successful publication atomically creates an Active FS-12 canonical version and marks the AlertDraft Published; Approved or Publication Failed is never treated as delivered or issued. Work resolves only after Published or a terminal Rejected, Cancelled or Expired outcome.

Correct, Cancel, Replace and Expire act on `CanonicalAlertVersion` through FS-12. A non-automatic correction or replacement that changes governed content requires a new approved AlertDraft referencing the prior canonical version. Alert Operations displays canonical history read-only; it does not merge the two state machines.

AlertDraft events are `alert.draft_created`, `alert.draft_submitted`, `alert.changes_requested`, `alert.draft_rejected`, `alert.draft_approved`, `alert.publication_started`, `alert.publication_failed`, `alert.draft_cancelled`, `alert.draft_expired` and `alert.draft_published`. Successful publication also emits FS-12 `alert.version_created` for the distinct Active canonical version. Canonical correction, cancellation and replacement events belong to FS-12. Every outcome retains actor, reason and versions. Publication cannot be completed by voice alone.

### 11.14 Audit requirements

Default Audit rows show actor, role, action, entity reference, time, purpose, jurisdiction, authorization outcome, before and after version references and correlation ID. They reference rather than copy raw audio, private notes, coordinates or sensitive media.

Every protected search, contact reveal, exact-location view, evidence read, consent denial or withdrawal, approval, publication, rollback, purge and export is auditable. Sensitive investigation access requires a separately authorized purpose and is outside default browsing.

### 11.15 RSK acceptance criteria

- **FS07-AC01:** Unauthorized Work rows and fields are absent from server responses, not merely hidden.
- **FS07-AC02:** Two staff cannot claim the same unassigned Work version.
- **FS07-AC03:** Work resolution cannot bypass its owning domain's closure rules.
- **FS07-AC04:** Contact, evidence and exact location remain masked until a fresh purpose and consent check passes.
- **FS07-AC05:** Manager capability alone cannot approve agronomy, Templates, Alerts or market mappings.
- **FS07-AC06:** High or Critical Cases require authorized expert resolution and mandatory follow-up.
- **FS07-AC07:** Advisory and dependent Task publication is atomic.
- **FS07-AC08:** No second farmer opens before assisted-session sync and cleanup.
- **FS07-AC09:** Only the assigned Visit or Sensor worker receives time-bound exact location.
- **FS07-AC10:** Technician and Agronomy Expert sensor authorities remain separate.
- **FS07-AC11:** Safety-sensitive self-approval is rejected server-side.
- **FS07-AC12:** Unmapped or incompatible market records never enter comparisons.
- **FS07-AC13:** RSK voice cannot complete prohibited visual-review actions.
- **FS07-AC14:** Every protected read and governed mutation produces an audit decision.
- **FS07-AC15:** There is no unrestricted Farmer Directory or staff productivity leaderboard.
- **FS07-AC16:** Domain-specific claims prevent a routine response drafter from issuing an agronomic Care Plan or generic approvals.
- **FS07-AC17:** Reopening a domain entity creates an active linked Work interval without rewriting the earlier service interval.
- **FS07-AC18:** Approved but unpublished Advisory or Alert content never appears issued and cannot resolve Work.
- **FS07-AC19:** Sensor Issue and Maintenance Work cannot close before impact, outcome and required validation criteria pass.
- **FS07-AC20:** A Calendar Review can change only the individual pending plan and preserves Farmer actuals and the master Template.
- **FS07-AC21:** Consent withdrawal or expiry revokes active Assisted Session and Visit access and protects or purges cached data.
- **FS07-AC22:** Market Support can be resolved without exposing selected market, quantity, cost, target or sale fields unless separately consented.
- **FS07-AC23:** Every declared Template and governed Alert state is reconstructable from its logical events.
- **FS07-AC24:** Delivery Health cannot manually promote provider or recipient state; every retry is a new policy-checked attempt and every failure has an owned outcome.

## 12. FS-08: MP Office Decision Intelligence Dashboard

### 12.1 Product boundary

The MP application is a privacy-released constituency and pilot-area decision surface. It helps identify agricultural risk, service demand and resource gaps; it cannot manage individual farmers, open Cases, inspect devices or send Alerts.

These route families must not exist: `/mp/farmers/*`, `/mp/farms/*`, `/mp/plots/*`, `/mp/cases/*`, `/mp/sensors/*`, `/mp/diaries/*` and `/mp/media/*`.

### 12.2 Aggregate query contract

Every MP module calls the same allowlisted aggregate service. A query accepts only:

- A registered metric key.
- Approved geography: Raigad pilot, verified taluka or block, village or approved cluster.
- Approved period or comparison pair.
- Allowlisted crop, stage, risk, Alert class, channel, service category or constraint category.
- Exactly one `dataMode` and optional allowlisted `provenanceTypes`.

It rejects arbitrary dimensions, free text, direct identifiers, exact coordinates and operational-record filters.

Before emission, the operational privacy boundary maps exact location to approved geography and removes the coordinate. It creates a non-reversible `analyticsSubjectId` stable only within approved purpose, jurisdiction and identifier-version scope. The identifier supports corrections and distinct-farm counting, cannot be joined across unrelated purposes and never reaches MP clients, voice, exports or telemetry.

### 12.3 Aggregate result contract

```text
RELEASED | SUPPRESSED | SAFE_ROLLUP | STALE | UNAVAILABLE
```

A Released result contains metric key, value, unit, definition version, geography, period, safe sample or coverage, `dataMode`, provenance, as-of time, maximum-staleness time, quality or confidence, safe sources, limitations and privacy-release version.

A Suppressed result contains no value, numerator, denominator or hidden cohort size. Safe Roll-up returns an approved released parent scope and identifies that the requested scope was unavailable. Stale is valid only inside the metric-specific maximum window; afterwards the result is Unavailable.

A Stale result may carry only the last privacy-released value after the current request is re-evaluated under current privacy rules. It carries all Released metadata plus `staleSince` and the reason refresh is delayed. If current privacy release no longer passes, the response becomes Suppressed or Unavailable and exposes neither the old value nor its old narrative.

Farmer-derived cells require at least five contributing farms or a stricter registered threshold, plus complementary and sticky suppression. Both cells in a comparison pass independently. Public market facts use a separate path without a farmer threshold; when joined to farmer-derived information, the stricter farmer policy applies.

### 12.4 Overview

Route: `/mp/overview`.

The page contains today's briefing, no more than three priorities, aggregate map with table alternative, risk and crop pulse, service pulse, Alert reach, constraints, harvest and market outlook and data-health strip.

Priorities are ranked deterministically from released severity, released affected cohort, material change, confidence and unresolved service need. Generative AI may verbalize but cannot select them. Every card shows scope, period, Data as of, mode, coverage, confidence and source access and links to its responsible module.

### 12.5 Pilot Area Map, Risks and Crops

Routes: `/mp/map`, `/mp/risks` and enumerated `/mp/risks/:riskType`.

Approved layers include dry spell, waterlogging, severe weather, crop stage, Crop Health pressure, Alert reach, sensor or advisory coverage, RSK workload, constraints, harvest exposure and market-data availability.

Maps use area shading only and have a keyboard-operable evidence table with identical released values. Tooltips show safe sample or coverage, freshness and confidence. No farmer points, farm polygons or device locations exist in payloads.

Risk detail contains definition, current severity, direction, geography, crop stages, source agreement, service response, reach, limitations and evidence. Missing data is not zero risk. One farm or sensor can never determine an MP result. Unknown `riskType` slugs return safe not found without querying raw data.

The product describes the approved Raigad pilot geography accurately and does not claim it is identical to a parliamentary constituency until a verified boundary mapping exists.

### 12.6 Service Delivery

Route: `/mp/service-delivery`.

Released views cover demand, first response, follow-up, resolution, ageing backlog, severe-Case response, Visits, sensor maintenance, outreach and service coverage. Comparisons apply to areas or teams, never named officers.

Service clocks are:

- `receivedAt`: server acceptance of the Work-creating event.
- `firstResponseAt`: first substantive human response issued to the farmer; assignment, opening, drafting and automated acknowledgement do not count.
- `resolvedAt`: valid domain resolution after mandatory follow-up.
- Reopening: a separate event that does not erase the prior interval.

Every metric declares received-cohort or resolved-cohort basis and cannot compare mismatched bases. Offline occurrence time remains evidence but does not backdate the server service clock. Visit demand counts from server acceptance of the Visit request, completion counts only from server acceptance of the synchronized outcome and resolution counts only after mandatory outcome review; each metric registers its exact qualifying event.

### 12.7 Alerts and Reach

Route: `/mp/alerts-reach`.

Official warnings, Smart Fasal advisories, expert responses and other approved classes remain separate. A released funnel may show frozen eligible cohort, Reached, Opened or Heard, Acknowledged, Response Recorded and linked Task or service resolution.

The eligible cohort is frozen per canonical Alert version. Later preference or consent changes affect new delivery attempts but never rewrite historical denominators. Multiple channels count one recipient once. Provider Accepted and Delivered are not Acknowledged; a connected IVR call is not Heard without interaction. Each stage independently passes privacy release, and complementary suppression prevents subtraction. The MP role has no compose or send control.

### 12.8 Resources and Constraints

Route: `/mp/resources`.

Allowlisted categories include water, drainage, inputs, labour, device or mobile connectivity, RSK access, transport, drying, grading, packing, storage and market-data availability. Free farmer text never enters the MP payload. The view distinguishes reported constraint, unresolved service need and released trend; it does not label individual compliance or blame a village.

### 12.9 Harvest and Markets

Route: `/mp/harvest-markets`.

Farmer-derived released facts include crop-stage harvest windows, weather exposure and readiness, transport, drying, grading, packing or storage constraints. Public facts include dated mandi reports, freshness and source coverage.

The view excludes individual quantity, target, cost, preferred market, decision and sale value. Incompatible grades, forms and units are excluded. Public prices are dated references, not guaranteed offers. No sell, hold, buyer endorsement or transaction path exists.

### 12.10 Briefings

Routes include the Briefing library, Today, Draft and immutable Saved snapshot.

```text
DRAFT -> GENERATING -> READY -> SAVED
                    -> GENERATION_FAILED -> DRAFT
```

The server revalidates every released evidence reference before generation, save and export. The generative model receives only the released structured payload. Every generated statement is validated for value, direction, geography, period, as-of time, confidence and source. Failure uses a deterministic template.

Saved snapshots retain narrative, structured facts, limitations, sources, generator version and privacy-release version and are immutable. Export atomically reapplies current privacy rules to every reference and regenerates or redacts both structured facts and every narrative statement derived from a newly disallowed reference. If a safe internally consistent export cannot be produced, the whole export is refused. There is no raw-row option.

The responsive `/mp/briefings/today` keeps the listenable brief, top three priorities, risk change, service pulse, reach, harvest note and data-quality warning.

### 12.11 Data Quality and Methodology

Every metric links to its registered definition, numerator, denominator, unit, cohort basis, sources, refresh policy, maximum staleness, privacy threshold, confidence and limitation. Aggregate provider and sensor health may appear; device IDs, locations and individual failures may not.

### 12.12 MP voice

The Constituency Voice Copilot follows FS-06 and calls the same aggregate contract. Every answer states geography, period, as-of time, safe coverage, suppression, confidence, mode and sources. A repeated query cannot expand dimensions or defeat sticky suppression.

### 12.13 Logical events

MP is read-heavy. Logical events include `mp.aggregate_query_completed`, `mp.aggregate_query_refused`, `mp.safe_rollup_returned`, `mp.briefing_draft_created`, `mp.briefing_generation_requested`, `mp.briefing_generation_failed`, `mp.briefing_snapshot_saved`, `mp.briefing_exported` and `mp.briefing_export_refused`. These logs contain query-policy identifiers, not suppressed values or sensitive inputs.

### 12.14 Failure behaviour

- Privacy-release failure fails closed.
- A suppressed result remains suppressed on maps, tables, voice, comparisons, URLs and exports.
- One unavailable module cannot become a fake zero or corrupt released modules.
- A snapshot past maximum staleness is Unavailable.
- Simulated records are excluded from default operational metrics.
- Recorded mode remains visibly dated.
- Saved Briefings remain immutable after later corrections.

### 12.15 Acceptance criteria

- **FS08-AC01:** MP responses contain no direct identifier, exact coordinate or raw-record link.
- **FS08-AC02:** No more than three Overview priorities appear, and each resolves to released evidence.
- **FS08-AC03:** Map and table expose identical released values.
- **FS08-AC04:** Repeated filters, comparisons, voice and export cannot reveal a suppressed cell.
- **FS08-AC05:** Both sides of every comparison independently pass privacy and quality rules.
- **FS08-AC06:** RSK drafts and automated acknowledgements cannot improve service metrics.
- **FS08-AC07:** Alert denominators remain frozen per canonical version.
- **FS08-AC08:** Public mandi facts are not suppressed merely because fewer than five farmers participate.
- **FS08-AC09:** Joined farmer and public facts use the stricter farmer-derived release rule.
- **FS08-AC10:** A metric beyond maximum staleness shows Unavailable.
- **FS08-AC11:** Saved Briefings are immutable and contain no raw-row export.
- **FS08-AC12:** Forbidden individual route families return safe not found.

## 13. FS-09: Smart Crop Calendar and Task Planner

### 13.1 Outcome

Each plot-season has one versioned plan derived from an approved Template snapshot. Tasks adapt to confirmed stage, weather, advisories and expert decisions while the original plan and actual Diary history remain intact.

### 13.2 Plan creation

Calendar creation requires plot, season, accepted crop or recorded existing crop, cultivation method and an approved unexpired Template version. It stores the complete Template snapshot; later Template publication cannot mutate it.

Annual crop state is:

```text
DRAFT -> PLANNED_AWAITING_START -> ACTIVE -> COMPLETED | ABANDONED
```

A proposed sowing or transplanting date may display an expected outline, but stage-relative Tasks remain inactive until the farmer confirms the actual event or an explicitly attributed RSK-assisted or field-observed confirmation records the event with provenance, farmer read-back or receipt and the required capability. The system cannot infer or unilaterally activate the season from registration, recommendation, forecast or proposed dates.

Perennial plans use observed seasonal stages rather than inventing an annual sowing anchor. Stage evidence retains farmer or RSK source, observation time, confidence and any disagreement.

### 13.3 Task contract

Every Task stores:

- Plot, season, crop and stage.
- Action and farmer-safe reason.
- Earliest, preferred and latest window.
- Dependencies and stage gates.
- Weather policy and evidence requirements.
- Required inputs or safety context.
- Owning Template, Advisory or expert action and version.
- Execution state, separate overdue flag, separate blocking reason and latest farmer response.
- Change history and linked actual Diary events.

```text
Execution: SUGGESTED -> PLANNED -> READY -> DUE -> IN_PROGRESS -> COMPLETED
                                                   -> CANCELLED | REPLACED
```

Waiting for Weather, RSK, Input or Water is a blocking reason. Done, Partly Done, Cannot Do, Skipped with Reason, Remind and Disputes Advice are responses. They are never peer execution states.

### 13.4 Relevance and prioritization

The Work views show all authorized relevant Tasks. Today receives at most three after filtering out inactive, completed, cancelled, replaced and non-actionable blocked items. Ordering uses safety priority, open action window, latest safe date, dependency criticality and stable ID. Overdue wording is factual and non-shaming.

### 13.5 Farmer responses and Diary

- **Done:** prefill plot, activity and actual occurrence time, request only activity-specific confirmation and create one immutable Diary event.
- **Partly Done:** capture one-quarter, half, three-quarters or selected area and create a correctly scoped remaining Task.
- **Remind:** create an appropriate local or server reminder without changing completion.
- **Cannot Do:** capture a structured reason and offer an approved alternative or qualifying RSK route.
- **Alert Seems Wrong:** preserve the dispute and use the owning Advisory flow.
- **Ask RSK:** review purpose and sharing before creating Work.

Original ambiguous quantities remain unnormalized until confirmed. A correction appends a revision or void; it never rewrites the actual event.

### 13.6 Rescheduling and overrides

Only weather-sensitive pending irrigation, fertilizer, already-approved spray and other policy-declared Tasks are auto-evaluated. A proposal shows old window, new window, forecast issue time, reason and downstream effect. Spray timing follows FS-04 and cannot alter approved chemical content. Farmer actions are Accept, Keep Original, Remind, Cannot Do or Ask RSK.

Keep Original records that the farmer declines the proposed reschedule; it never makes superseded unsafe guidance current. The system's safe plan and farmer intent remain distinct.

An RSK season override is versioned, purpose-limited and attributable. It never mutates the master Template or erase a farmer actual. High-risk changes follow Advisory review. Completing or cancelling an owning Task stops redundant reminders.

### 13.7 Views and states

The feature provides Work overview, all-farm agenda, plot-season Calendar, week view, optional month view, Task detail, change explanation and planned-versus-actual season summary. Each view handles no active season, awaiting actual start, stale weather, blocked work, offline cached plan and sync conflict.

### 13.8 Logical events

`calendar.instantiated`, `calendar.task_created`, `calendar.task_changed`, `calendar.task_completed`, `calendar.task_partially_completed`, `calendar.task_blocked`, `calendar.task_cancelled`, `calendar.task_replaced`, `calendar.reminder_requested`, `season.start_confirmed`, `season.activated` and `diary.activity_recorded`.

### 13.9 Acceptance criteria

- **FS09-AC01:** One plot-season has one authoritative Calendar snapshot.
- **FS09-AC02:** Actual sowing or transplanting anchors annual stage-relative Tasks.
- **FS09-AC03:** A published Template update cannot silently change an existing season.
- **FS09-AC04:** Execution state, time flags, blocking reason and response remain separately queryable.
- **FS09-AC05:** Done creates exactly one linked Diary event.
- **FS09-AC06:** Partly Done creates the correct actual and remaining scope.
- **FS09-AC07:** Every reschedule shows old and new windows, reason and source time.
- **FS09-AC08:** Keep Original cannot restore unsafe superseded advice.
- **FS09-AC09:** A completed actual remains completed after later plan changes.
- **FS09-AC10:** Offline responses retain local status until server acceptance.

## 14. FS-10: Live Farm Monitor and Sensor Trust Centre

### 14.1 Outcome and hardware modes

The Farmer sees current or last-known farm conditions with honest source, time, calibration and trust. RSK can install, monitor and repair optional hardware. Farms without hardware receive weather, Satellite, Soil Health Card, laboratory and farmer-observation fallbacks with appropriate confidence.

Supported operating modes are:

- Farmer-owned permanent station.
- Shared RSK testing kit assigned for a bounded period.
- No hardware.
- Recorded hardware trace for a labelled demonstration.
- Simulated sensor scenario for a labelled test or demonstration.

### 14.2 Installation contract

Before assignment, explain purpose, signals, retention, advisory use, exact-location access and removal; record separate device and location consent. Store gateway and device identity, model, firmware, plot zone, depth, expected interval, installation evidence and calibration profile.

Authenticate and test the gateway and channels, complete soil-specific moisture calibration and applicable pH or EC calibration, and observe the configured baseline. Telemetry activation does not automatically mean agronomic eligibility.

Consent remains revocable. Withdrawing device-collection consent immediately blocks new accepted telemetry and agronomic use, revokes the device or gateway assignment token, marks the device `DECOMMISSIONING` and creates removal or return Work when physical hardware remains. Withdrawing exact-location consent revokes new location tokens and location display without silently extending Technician access; continued non-location collection is allowed only if the remaining device consent and purpose still pass. Any affected current advice is impact-reviewed and recalculated. Previously accepted observations follow the approved retention policy and are not relabelled or silently deleted.

### 14.3 Observation contract

Every raw observation retains:

- Device and channel reference.
- Original value and unit.
- Observed and server-received time.
- Singular `dataMode` and Sensor provenance.
- Calibration reference.
- Battery, signal, packet and firmware context.
- Raw payload integrity reference.

Raw observations are immutable. Validated interpretations add normalized values, quality flags, trust decision and policy version without overwriting raw data.

### 14.4 Quality evaluation

The quality policy evaluates schema, device clock, range, impossible combinations, rate of change, spike, flatline, missing packets, calibration expiry, placement caution, battery, signal and freshness.

Signal use is:

- **Calibrated soil moisture:** bounded irrigation timing with crop stage, weather and rainfall.
- **Temperature and humidity:** heat and disease-context support when placement is valid.
- **pH and EC:** periodic gates or review triggers, not assumed continuous laboratory truth.
- **Low-cost NPK:** Experimental or Trend Only until model and field protocol pass local comparison against trusted tests.

One abnormal reading cannot generate a severe action. High-impact use follows the signal-agreement rules in FS-04.

### 14.5 Device and trust states

```text
Device: COMMISSIONING -> ACTIVE -> DEGRADED | OFFLINE
                     -> MAINTENANCE -> VALIDATING -> ACTIVE
                     -> DECOMMISSIONING -> RETIRED

Interval: PENDING -> TRUSTED | USE_WITH_CAUTION | TREND_ONLY | SUSPECT | DO_NOT_USE
```

Offline means no recent accepted packet; it never means stable field conditions. Each Farmer signal card shows measured time, received time, freshness, calibration, quality, mode and which current decisions used it.

### 14.6 Issue, invalidation and recalculation

A stale stream, anomaly, expired calibration, low battery or farmer dispute creates one Sensor Issue and marks the relevant interval Suspect. Material suspect data is quarantined from new advice.

A Sensor Technician diagnoses hardware, placement, calibration and connectivity. An Agronomy Expert decides agronomic impact and may invalidate an interval for advisory use. The system finds every current Advisory, Alert and Task that used it, recalculates with remaining trusted evidence and preserves both results. A material decision change replaces or cancels pending advice and creates one correction Alert.

Exact location is revealed only to the assigned Technician during the authorized maintenance window and every access is audited. Return to Service requires a successful validation period.

### 14.7 Farmer actions and views

Farmer routes provide Live Monitor, allowlisted signal detail and farmer-safe Device status. Actions include Listen, View Evidence, Report Sensor Problem and Ask RSK. Charts never obscure the current action, last trusted point or stale state.

### 14.8 Logical events

`sensor.consent_recorded`, `sensor.consent_withdrawn`, `sensor.collection_stopped`, `sensor.location_access_revoked`, `sensor.deassigned`, `sensor.removal_requested`, `sensor.installed`, `sensor.activated`, `sensor.observation_received`, `sensor.interval_flagged`, `sensor.issue_created`, `sensor.location_accessed`, `sensor.interval_invalidated`, `sensor.advice_impact_reviewed`, `advisory.recalculated`, `sensor.maintenance_completed` and `sensor.returned_to_service`.

### 14.9 Failure behaviour

- No trusted fallback returns Insufficient Evidence, not a guessed condition.
- Backfilled data updates history only and cannot trigger an expired current Alert.
- Recalculation failure visibly suspends affected advice.
- Technician offline completion stays Awaiting Sync.
- A false positive is corrected by a new validation decision; original flags remain.
- Recorded and Simulated packets retain their mode through every derived view.

### 14.10 Acceptance criteria

- **FS10-AC01:** Every signal displays source, measured time, received time, freshness, calibration and trust.
- **FS10-AC02:** Raw telemetry cannot be edited or relabelled.
- **FS10-AC03:** Simulated or Recorded telemetry never appears Live.
- **FS10-AC04:** An offline device never displays stable conditions.
- **FS10-AC05:** One outlier cannot create severe agronomic advice.
- **FS10-AC06:** Low-cost NPK alone cannot create exact dosage.
- **FS10-AC07:** Invalidation propagates to every affected current decision.
- **FS10-AC08:** Technician and Agronomy Expert authorities remain distinct.
- **FS10-AC09:** Exact location is time-bound, assigned and audited.
- **FS10-AC10:** The farmer journey remains usable with no device.
- **FS10-AC11:** Consent withdrawal stops the applicable collection or location access, revokes tokens and triggers safe deassignment and decision-impact handling.

## 15. FS-11: Offline Farm Diary and Sync Centre

### 15.1 Outcome

The Farmer can record actual work and observations without connectivity, trust that Saved on This Phone is durable and synchronize exactly once without silent overwrite. Calendar plan and Diary actual remain separate.

### 15.2 Diary entry contract

An entry may record completed, partial, skipped or blocked activity; observation; crop-stage confirmation; harvest; photo; consented audio; quantity; original unit; actual occurrence time; and optional private cost or sale information.

Every event stores stable event ID, actor, device, local sequence, plot and season, linked Task if any, occurrence time, client time and timezone, schema version, base entity version, `dataMode`, provenance and correlation ID.

Task-derived entry creation prefills known fields but still asks for actual date, scope and ambiguous quantity confirmation. It creates one logical Diary event and links it to, rather than copying, the Task.

### 15.3 Local durability

In one local transaction:

1. Append the immutable event.
2. Update the local projection.
3. Add the outbox operation.

Only after all three commit may the app display Saved on This Phone. Media is stored separately with checksum and pending state. Text and structured activity have priority over ordinary media under storage pressure; the farmer may choose Save Without Media.

### 15.4 Independent synchronization axes

```text
Local commit: DRAFT -> LOCALLY_COMMITTED
Transport:    NOT_QUEUED -> QUEUED -> SYNCING
                         -> ACCEPTED | ALREADY_ACCEPTED | REJECTED | CONFLICT
Projection:   CURRENT_LOCAL -> SERVER_CONFIRMED | NEEDS_RECONCILIATION | INVALID
```

The Sync Centre exposes pending text, pending media, retry, authentication block, conflict and rejection reason. A rejected or conflicting event remains visible and locked in Needs Reconciliation; it cannot remain authoritative or disappear.

### 15.5 Synchronization rules

1. Verify backend reachability rather than relying only on browser online state.
2. Refresh authentication without deleting local work.
3. Send bounded causally ready batches with the last server cursor.
4. Server validates actor, ownership, consent, schema, event ID, base version and command policy.
5. Accepted retry returns the original acknowledgement.
6. Apply returned events and rebuild projections deterministically.
7. Upload structured activity before ordinary media; urgent Crop Health media has higher priority.
8. Resume media by checksum and append a media-attached event only after integrity verification.
9. Display Synced only after server acknowledgement.

### 15.6 Conflict policy

| Conflict | Required resolution |
| --- | --- |
| Independent observations | Keep both |
| Same Task reported twice | Preserve both evidence events, designate one logical completion and request review when necessary |
| Different allowlisted mutable profile fields | Merge automatically only when the explicit allowlist permits |
| Same mutable field differs | Ask Farmer or authorized RSK user in plain language |
| Farmer completion and RSK reschedule | Preserve actual completion and plan change separately |
| Farmer and RSK stage differ | Preserve both; approved planning stage drives rules with provenance visible |
| Old-device record after deletion | Tombstone prevents resurrection |
| Accepted activity correction | Append correction or void event |

Immutable Diary, consent, crop stage, quantities, units, Task outcomes and safety advice never use generic field-level or last-write-wins merge.

### 15.7 Shared-device and privacy rules

- Personal, Trusted Family and RSK-Assisted modes use separate caching and reauthentication policies.
- Active identity is always visible before a new entry.
- Profile switching preserves actor and cannot reveal another farmer's cache.
- Logout warns about unsynced work and never clears it silently.
- A public or assisted session blocks exit or moves work into encrypted locked recovery inaccessible to later users.
- After confirmed sync or authorized recovery, assisted farmer data and queued media are purged and the purge is audited.
- Audio follows storage consent. Costs, target prices and sale values remain farmer-private.

### 15.8 Corrections, deletion and summary

A correction creates a revision or void event and shows the original. A deletion request removes or irreversibly anonymizes personal content according to policy while retaining only the minimum non-identifying tombstone needed for integrity and resurrection prevention.

The season summary is lightweight and factual: planned work, farmer-reported actual work, blocked reasons, observations and known harvest facts. It does not claim causal yield or impact.

### 15.9 Farmer data export

Route: `/farmer/settings/data`.

```text
REQUESTED -> PREPARING -> READY -> RETRIEVED | EXPIRED
                       -> FAILED | CANCELLED
```

After reauthentication, the Farmer may request a portable export of authorized current and historical data: profile and consent history; farms, plots and seasons; Recommendation and Advisory snapshots; Calendar and Diary; Farmer-visible Cases and expert responses; Alerts and recipient interactions; Farmer-visible Sensor records; Market Watches and private market fields; access-history entries safe to disclose; and a media manifest with requested available media.

The export contains a human-readable index plus a documented portable structured representation, original values and units, source and version references, corrections and explicit missing or deleted items. It excludes secrets, internal security controls, another person's protected data and investigation-only audit content and explains each excluded category. Export generation cannot resurrect deleted content.

The prepared artifact is encrypted at rest, bound to the requesting identity and delivered through a time-limited, single-purpose retrieval flow that is safe for the selected device mode. Shared or assisted devices require an explicit private-delivery choice and leave no browsable archive after exit. Retrieval, expiry and deletion of the prepared artifact are audited. A failed scope or authorization check fails the whole export rather than producing a misleading partial archive; provider or media failures may produce a clearly itemized partial-media manifest only after Farmer confirmation.

Commands are Request Export, Cancel Export, Retry Export Preparation, Retrieve Export and Delete Prepared Export. Logical events include `data.export_requested`, `data.export_preparation_started`, `data.export_ready`, `data.export_failed`, `data.export_retrieved`, `data.export_expired`, `data.export_cancelled` and `data.export_artifact_deleted`.

### 15.10 Logical events

`diary.entry_saved_local`, `diary.activity_recorded`, `diary.observation_recorded`, `diary.entry_corrected`, `diary.entry_voided`, `sync.batch_started`, `sync.event_accepted`, `sync.event_already_accepted`, `sync.event_rejected`, `sync.conflict_detected`, `sync.conflict_resolved`, `media.upload_verified`, the export events above, `data.deletion_requested` and `data.tombstone_created`.

### 15.11 Failure behaviour

- Authentication failure shows Sign In to Continue Syncing and retains work.
- Network flapping retries idempotently.
- Wrong phone time preserves occurrence, client and server time and requests correction.
- Delayed events update history but cannot trigger expired current Alerts.
- Storage pressure never automatically evicts unsynced events.
- Server rejection appears on the originating record and assisted receipt where applicable.
- Export preparation failure preserves the request and a safe retry or cancellation path without exposing a partial archive.
- Expired export links reveal no content and require a new authorized request.

### 15.12 Acceptance criteria

- **FS11-AC01:** Saved on This Phone survives reload, process termination and network changes.
- **FS11-AC02:** Reusing an event ID creates one server event.
- **FS11-AC03:** The app never claims RSK received local-only work.
- **FS11-AC04:** Conflict and rejection preserve visible recoverable records.
- **FS11-AC05:** Completed actual work survives any later Calendar reschedule.
- **FS11-AC06:** Generic merge cannot change a quantity, unit, consent, stage or safety decision.
- **FS11-AC07:** No subsequent user can browse an assisted farmer's unsynced data.
- **FS11-AC08:** Text is preserved before optional media under storage pressure.
- **FS11-AC09:** Deletion prevents old-device resurrection with minimum non-identifying state.
- **FS11-AC10:** Private cost and sale data never enters MP analytics.
- **FS11-AC11:** A reauthenticated Farmer can obtain a portable attributable export without exposing it to another shared-device user or resurrecting deleted data.

## 16. FS-12: Alert Inbox and Multichannel Delivery Centre

### 16.1 Outcome

One source event creates one canonical, versioned Alert thread across in-app Inbox, Push, SMS and consented IVR. The product tracks provider delivery, recipient engagement, farmer response and linked action as separate facts.

### 16.2 Alert sources and priorities

Allowed sources include Smart Fasal Advisory, official warning, RSK response, Calendar change, Sensor trust state and Market Watch. Source policy maps each to one farmer-facing priority:

- Act Now.
- Do Today.
- Plan Soon.
- Update.
- Information.

Market and routine content cannot use Act Now. Routine messages are bundled into the daily briefing where policy allows.

### 16.3 State ownership

```text
Canonical version: ACTIVE -> REPLACED | CORRECTED | CANCELLED | EXPIRED
Channel attempt:   QUEUED -> PROVIDER_ACCEPTED -> DELIVERED | FAILED | UNKNOWN | EXPIRED
Recipient journey: ELIGIBLE -> REACHED -> OPENED_OR_HEARD -> ACKNOWLEDGED -> RESPONSE_RECORDED
```

Task completion, Diary activity and RSK service resolution belong to their linked domain entities. An Alert version's eligible cohort and policy version are frozen at activation. Later preferences or consent affect future attempts but cannot rewrite the historical denominator.

### 16.4 Canonicalization and official warnings

Alert Policy validates source, geography, effective time, severity, action and expiry. Related signals share a versioned deduplication key and update one canonical thread when risk and action remain materially related.

Official warning content, severity, certainty, effective time, expiry and provenance remain unaltered. Any plain-language or farm-specific implication is a separately labelled Smart Fasal explanation. Correction or cancellation from the official source creates a new thread version and reason; it does not edit history.

### 16.5 Channel policy

Channel selection uses priority, language, current consent, preferences, quiet hours, connectivity and failure history. Sensitive details stay out of provider and lock-screen payloads.

Every attempt has its own attempt ID, provider ID and status. Webhook or callback processing is authenticated, replay-protected and idempotent. Provider Accepted is not Delivered. Delivery Unknown remains unknown.

Recipient `Reached` is an idempotent derived milestone emitted once per recipient and canonical version when the first channel attempt reaches a channel-policy-approved `Delivered` condition. Provider Accepted, Failed and Unknown do not qualify. Reached means a destination was reached, not that the farmer opened, heard, understood or acted.

A Farmer response through any channel cancels unnecessary pending fallbacks. An unacknowledged urgent Alert may receive one configured careful voice retry and then create RSK outreach when consent and service policy permit. Expiry stops all retries.

### 16.6 Inbox and interaction

Farmer views are Now, Later and History. Alert detail shows action, reason, source, freshness, effective time, expiry, canonical version and channel history and links to the owning Task, Case, Advisory, Monitor, crop stage or market record.

Actions, when applicable, are Listen, Understood, Done, Remind, Cannot Do, Alert Seems Wrong and Ask RSK. A response to an old version does not acknowledge a material replacement.

IVR identifies itself as automated and supports:

- 1: Heard.
- 2: Repeat.
- 3: Cannot Do.
- 4: Hear Why.
- 9: Request RSK Help.

A connected call is not Heard without explicit interaction.

### 16.7 Cannot Do, dispute and outreach

Cannot Do captures an allowlisted reason. An actionable water, input, safety, access or explicit expert need creates RSK Work; other reasons update the linked Task or offer an alternative without unnecessary workload.

Alert Seems Wrong applies only to Smart Fasal advice. It pauses repetitions of that version or deduplication key and opens review. It cannot suppress official warnings, a materially changed action or a higher-severity risk.

Wrong Recipient ends personal disclosure, stops future attempts to that destination and creates contact-correction Work.

### 16.8 Logical events

`alert.version_created`, `alert.cohort_frozen`, `alert.attempt_queued`, `alert.provider_accepted`, `alert.delivered`, `alert.delivery_failed`, `alert.delivery_unknown`, `alert.recipient_reached`, `alert.opened_or_heard`, `alert.acknowledged`, `alert.response_recorded`, `alert.expired`, `alert.replaced`, `alert.corrected` and `alert.cancelled`.

### 16.9 Failure and offline behaviour

- Partial dispatch preserves the canonical version. A retry creates a new attempt ID linked to the terminal failed or unknown attempt and rechecks current consent, expiry and channel policy; it never moves a terminal attempt back to Queued.
- Provider outage does not fabricate delivery.
- Consent withdrawal stops newly disallowed optional attempts immediately.
- Offline in-app response remains Saved on This Phone until accepted.
- Expired advice cannot arrive later as current.
- Language-generation failure uses a reviewed template or withholds the optional explanation; it never alters official content.

### 16.10 Acceptance criteria

- **FS12-AC01:** One material risk produces one canonical Alert, not one per signal or channel.
- **FS12-AC02:** Multiple channels count one recipient once in reach.
- **FS12-AC03:** No provider callback can acknowledge, complete or resolve a domain entity.
- **FS12-AC04:** Official warning content and Smart Fasal explanation remain separate.
- **FS12-AC05:** Cohort denominators remain frozen per version.
- **FS12-AC06:** Connected IVR without interaction is not Heard.
- **FS12-AC07:** Wrong Recipient stops personal disclosure.
- **FS12-AC08:** Acknowledging an old version does not acknowledge a replacement.
- **FS12-AC09:** Expiry stops retries and current display.
- **FS12-AC10:** MP receives only privacy-released funnel stages.

## 17. FS-13: Mandi Price and Harvest Market Watch

### 17.1 Outcome

Near harvest, the Farmer receives preparation Tasks and compares dated, compatible public mandi reports with honest gaps. The Farmer may calculate an indicative net range and set a private target watch. The feature never promises a price, predicts a guaranteed market outcome or instructs Sell or Hold.

### 17.2 Harvest readiness

The Calendar derives an expected harvest window from the confirmed crop stage and approved Template. The default Template may create:

- A timing confirmation approximately 21 days before the expected window.
- Optional saleable-quantity and market-watch setup approximately 14 days before.
- Maturity, weather, labour, drying, grading, packing and transport Tasks approximately 7 days before.

These are Template-relative pilot defaults, not universal fixed dates. A stage change or weather event may version and explain the schedule. Actual harvest creates a private Diary event.

### 17.3 Public record contract

Every ingested record retains immutable:

- Source name, source identifier or URL and checksum.
- Market and reporting geography.
- Commodity, variety, grade and form exactly as reported.
- Original unit.
- Minimum, modal and maximum price where reported.
- Report date and ingestion time.
- `dataMode` and Public Market provenance.

A source correction creates a superseding raw event; it never overwrites the archive.

### 17.4 Mapping and comparability

Unknown or changed commodity, variety, grade, form or unit creates an RSK mapping item and remains excluded from comparison.

Only these decisions may enter a comparison:

- **Approved Exact:** semantic and unit equivalence.
- **Approved with Caveat:** the difference is explicitly permitted and shown beside every comparison.

Rejected Incompatible remains excluded. Deterministic unit conversion preserves original and normalized values and a conversion-rule version. Every derived comparison resolves to raw record, mapping and conversion versions.

### 17.5 Farmer Market Watch result

The Market screen shows:

- Crop and harvest-window context.
- Latest compatible report for selected markets.
- Min, modal and max with original unit.
- Market, variety, grade, form, source and report date.
- Match quality and caveat.
- Actual reporting-day trend and coverage.
- Distance source and date where shown.
- Known farmer-confirmed costs and explicit Unknown costs.
- Indicative net range, not a guaranteed net price.
- No Recent Data, Data Is Old, Incompatible or Source Unavailable states.

Missing prices and unknown costs are never zero. A trend connects actual reporting days and shows gaps; it does not fabricate daily continuity or a forecast.

### 17.6 Indicative net calculation

The feature may calculate a range only from compatible dated reports, farmer-confirmed quantity and selected known costs. It displays the formula, units and Unknown components. If quantity or required conversion is absent, it withholds the total rather than inventing an estimate.

The calculation is private farmer decision support. It does not represent a buyer offer, transport quote or guaranteed realizable price.

### 17.7 Target watches

```text
DRAFT -> ACTIVE
ACTIVE -> PAUSED -> ACTIVE
ACTIVE -> TRIGGERED -> COMPLETED
ACTIVE -> TRIGGERED -> COOLDOWN -> ACTIVE   (recurring watch only)
DRAFT | ACTIVE | PAUSED | COOLDOWN -> SUPERSEDED_BY_UPDATE
ACTIVE | PAUSED | COOLDOWN -> EXPIRED | CANCELLED
```

Creation reads back crop, market, variety or grade context, original or normalized unit, threshold, harvest window and channel. A trigger requires all of:

- The active Season and crop match.
- Current date is inside the approved harvest-relevance window.
- A fresh comparable public record exists.
- The selected price field and unit cross the threshold according to the watch rule.
- The watch version has not already fired for the same public record and crossing.

The resulting Alert is Information or Plan Soon, never Act Now, and uses FS-12. A stale, incompatible or missing record cannot trigger it.

A one-shot watch becomes Completed after its first trigger. A recurring watch enters Cooldown and rearms only after a versioned reset-band rule is satisfied by a later fresh comparable record. Pause stops evaluation and Resume returns to Active after revalidation. Updating crop, market, grade, unit, threshold, recurrence or channel supersedes the prior version and creates a new confirmed version; it never mutates trigger history.

### 17.8 RSK and MP boundaries

RSK may explain grades, mappings, preparation or logistics and resolve public-record quality. It cannot alter an official price, endorse a buyer, execute a transaction or promise a price.

Quantity, target, costs, selected market and actual sale value remain Farmer-private and require separate field-level consent for RSK service. MP receives public market facts separately and only privacy-released Farmer-derived harvest windows and constraints.

### 17.9 Logical events

`harvest.window_confirmed`, `harvest.readiness_updated`, `harvest.actual_recorded`, `market.raw_record_archived`, `market.mapping_requested`, `market.mapping_claimed`, `market.mapping_decided`, `market.mapping_approved`, `market.mapping_rejected`, `market.mapping_superseded`, `market.reprocessing_started`, `market.reprocessing_completed`, `market.reprocessing_failed`, `market.comparison_replaced`, `market.watch_created`, `market.watch_triggered`, `market.watch_cooldown_started`, `market.watch_rearmed`, `market.watch_paused`, `market.watch_resumed`, `market.watch_updated`, `market.watch_completed`, `market.watch_expired` and `market.watch_cancelled`.

### 17.10 Failure behaviour

- Incompatible records are excluded, not coerced.
- Source outage shows the last valid record as dated and stale only within policy; after maximum staleness it is Unavailable.
- Mapping reprocessing failure retains the prior dated result only when safe and marks affected comparison unavailable when required.
- No quantity means no individual or aggregate production-volume estimate.
- Recorded Government Data is visibly Recorded when Live Raigad reporting is unavailable.
- No provider or source failure silently switches to a fixture.

### 17.11 Acceptance criteria

- **FS13-AC01:** Every displayed price includes market, matching context, unit, source and report date.
- **FS13-AC02:** Unmapped and incompatible records never enter comparisons, trends or watches.
- **FS13-AC03:** Original source values and units remain immutable.
- **FS13-AC04:** Missing price or unknown cost never becomes zero.
- **FS13-AC05:** A stale record cannot trigger a fresh-price watch.
- **FS13-AC06:** Modal price is labelled reference, not offer or forecast.
- **FS13-AC07:** No Sell, Hold, buyer endorsement, checkout or transaction path exists.
- **FS13-AC08:** Private quantity, target, cost and sale values never reach MP.
- **FS13-AC09:** Public market facts do not require a farmer cohort threshold.
- **FS13-AC10:** Joined public and Farmer-derived information uses the stricter privacy rule.
- **FS13-AC11:** One-shot, recurring, paused, resumed and updated watches follow their declared transitions without duplicate triggers or rewritten history.

## 18. Honest deterministic demonstration modes

Every demonstration scenario has an immutable manifest with scenario ID, fixed clock, one `dataMode`, approved geography, season, fixture checksum, expected domain events, scripted provider outcomes, expected privacy decisions and reset seed.

Rules are:

- Recorded and Simulated modes display a persistent label on routes, overlays, voice answers, Briefings and exports.
- Live-source failure never silently switches mode.
- Every demo environment, including Recorded and Live-hardware scenarios, uses sandbox or scripted Push, SMS and IVR adapters that cannot contact real recipients.
- Simulated hardware uses the same validated observation contract but retains Simulated mode.
- Recorded sensor or government data remains visibly dated and Recorded.
- Reset restores the same clock, state, events and output.
- Demo and operational credentials, namespaces and analytics remain separate.
- Automated tests assert the expected Recommendation, Advisory, Alert, RSK, privacy and Briefing results for each manifest.

For derived decisions, `dataMode` describes the execution scenario: Simulated if any decision-driving input is synthetic; Recorded for a historical replay or captured snapshot; Live for the current operational run. Genuine historical context may support a Live decision when explicitly dated and carried as provenance; it does not by itself relabel the whole run Recorded.

## 19. Required versioned configuration registries

The product behaviour is complete, but numeric and provider-specific values must live in governed registries rather than UI code or prompts:

| Registry | Must define before release |
| --- | --- |
| Crop and agronomy | Supported crops and methods, hard gates, component normalization, weights, confidence bands, stage definitions, action windows, input tables and review class |
| Evidence and freshness | Source allowlist, quality rules, current and maximum-staleness windows, agreement and material-change rules |
| Earth Engine features | Approved datasets, geography and temporal windows, preprocessing, scale, freshness, limitations and derived feature versions |
| Crop Health | Supported categories, image-quality policy, severity and spread rubric, escalation matrix and follow-up requirements |
| Voice and language | Intent and tool allowlist, glossary, reviewed strings, speech-confidence handling, audio retention and provider fallback |
| Consent and retention | Scope identifiers, purpose, expiry, renewal, withdrawal propagation, receipts, retention and deletion behaviour |
| RSK Work and service | SLA values, priority recalculation, closure windows, outreach retries, Visit authorization windows and managed-device policy |
| Device and signal | Supported hardware profiles, sampling intervals, calibration, baseline, quality thresholds and Return-to-Service checks |
| Alert policy | Priority mapping, deduplication and material change, quiet-hour exceptions, channel order, retry, expiry and outreach matrix |
| Market data | Source registry, ontology, mapping impact class, conversions, comparability, freshness, trend and distance or cost sources |
| MP metric and privacy | Definition, numerator, denominator, unit, cohort basis, threshold, complementary suppression, precision, confidence and maximum staleness |
| Demo scenarios | Manifest, clock, expected events, providers, recorded versus simulated evidence and safe reset |

Every registry is versioned, testable, attributable and environment-specific. Missing registry content produces Unsupported or Unavailable, never a hidden default.

## 20. Feature-specification release gate

The feature layer is ready for implementation planning only when:

- All 13 features exist in navigation and have a working primary path.
- Every listed state and acceptance criterion has an owning test level.
- All governed registries contain reviewed Raigad pilot values.
- Marathi, Hindi and English critical content is complete.
- Every external provider has a deterministic fallback or honest unavailable state.
- Hardware remains optional and Recorded or Simulated traces are unmistakable.
- RSK capability and consent checks are server-enforced.
- MP privacy release fails closed and is tested against inference attempts.
- No excluded Web3, credit, insurance, marketplace or social-feed capability appears.
- No dead control, placeholder-only page, fabricated fact or unsupported impact claim remains.
