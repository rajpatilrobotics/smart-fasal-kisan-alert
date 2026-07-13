# Smart Fasal Kisan Alert

## Product Requirements Document

| Field | Value |
| --- | --- |
| Status | Approved |
| Version | 0.1.1 |
| Last updated | 12 July 2026 |
| Pilot geography | Raigad district, Maharashtra |
| Primary stakeholders | Farmer, Rythu Seva Kendram Office, MP Office |
| Primary farmer language | Marathi |
| Product surfaces | Farmer mobile-first PWA, RSK desktop web app, MP desktop web app |

## 1. Document purpose

This Product Requirements Document defines the product vision, pilot scope, stakeholders, locked capabilities, safety boundaries, quality requirements and release-success criteria for Smart Fasal Kisan Alert.

Detailed navigation, user flows, feature behaviour, visual design, architecture, data contracts, AI rules, hardware, offline synchronization, security, testing, deployment and demo instructions will be maintained in the accompanying specifications. This document remains the authoritative source for what the product must accomplish and what is outside its scope.

## 2. Product vision

Smart Fasal Kisan Alert is a voice-first, hardware-assisted agricultural intelligence platform for small and marginal farmers. It combines farmer and farm context, verified agronomic rules, localized weather, rainfall history, optional field sensors and Google Earth Engine context to produce timely, explainable actions.

The platform helps farmers choose suitable crops, respond to dry spells, plan irrigation and inputs, report crop-health problems, follow a dynamic crop calendar, preserve an offline farm diary and prepare for harvest. Uncertain or high-risk cases are routed to the Rythu Seva Kendram Office for human review. The MP Office receives only privacy-safe constituency intelligence about village risks, service gaps and operational response.

## 3. Problem statement

Farmers face several connected problems:

- Crop choices may not reflect current soil, water availability, sowing window, rainfall or climate conditions.
- Weather forecasts, satellite context and sensor readings are difficult to translate into timely field actions.
- Crop-health problems may be reported late or without enough context for an expert to respond safely.
- Low literacy, language barriers, shared phones and unreliable connectivity limit access to digital services.
- Farm plans, completed work, alerts and expert advice are fragmented across tools and conversations.
- RSK offices need structured prioritization, evidence and follow-up workflows.
- MP offices need privacy-safe evidence about constituency risks and delivery gaps, not access to individual farmer records.

The platform must satisfy the organizer's three required problem areas:

1. Smart crop recommendation using farm, soil and satellite data.
2. Real-time advisories and dry-spell alerts using localized weather and ground-sensor data for irrigation and fertilization guidance.
3. Crop-health logging through photo and voice, connected to Rythu Seva Kendrams for expert follow-up.

A multilingual, role-aware voice agent is the fourth primary product capability and must be available to every stakeholder.

## 4. Pilot definition

- **Geography:** Raigad district, Maharashtra.
- **Primary farmer language:** Marathi.
- **Additional launch languages:** Hindi and English, with complete reviewed strings for all launch flows.
- **Additional Indic languages:** Architecturally supported but not described as validated until tested with native speakers and domain terminology.
- **Initial crop templates:** Kharif paddy, mango, cashew and finger millet or Nachni.
- **Expansion model:** Additional crops are added through versioned, locally reviewed crop templates.
- **Farmer interface:** Installable, mobile-first Progressive Web App with an Android-app-like experience.
- **RSK interface:** Responsive desktop operations dashboard.
- **MP interface:** Responsive desktop decision-intelligence dashboard with a concise mobile briefing view.
- **Hardware model:** Optional ESP32 or Raspberry Pi gateway with compatible sensors, plus shared RSK testing kits and sensor-free fallbacks.
- **Institutional status:** RSK-compatible workflow prototype unless a formal government integration or partnership is obtained.

## 5. Product principles

1. **Voice first, never voice only.** Every critical voice interaction also has a clear visual or assisted path.
2. **Action before analytics.** Farmer screens show one recommended action before charts and technical measurements.
3. **Rules control safety.** Approved agronomic rules and verified tables control high-impact decisions. Generative AI explains structured results.
4. **Evidence is visible.** Recommendations show reasons, source, observation time, freshness, confidence and rule or model version.
5. **Uncertainty is honest.** Missing, stale, simulated, recorded, regional or low-quality data is always labelled.
6. **Humans remain in the loop.** Severe, uncertain, contradictory or safety-sensitive cases reach an authorized expert.
7. **Offline work is first-class.** Farmers can view essential information and record work without continuous connectivity.
8. **Plans and reality stay separate.** The calendar records what should happen; the diary records what actually happened.
9. **Farmer privacy is structural.** RSK access is purpose-limited and MP information is aggregate and thresholded.
10. **Changes are explained.** The application never silently rewrites a task, advisory, crop stage or farmer record.
11. **No unsupported claims.** The pilot does not claim national accuracy, guaranteed yield improvement, water savings or guaranteed market outcomes.
12. **Accessibility is a release requirement.** It is not a post-build enhancement.

## 6. Stakeholders and product surfaces

### 6.1 Farmer

**Surface:** Mobile-first installable PWA.

**Primary goals:**

- Complete farmer and farm setup with voice assistance.
- Receive a short daily briefing and the most important action.
- Ask natural-language questions about the farm.
- Understand crop, weather, sensor and crop-health evidence.
- Complete, delay or reject tasks and explain constraints.
- Request RSK help.
- Record work and observations offline.
- Prepare for harvest using dated market information.

### 6.2 Rythu Seva Kendram Office

**Surface:** Desktop operations dashboard with responsive support.

**Primary goals:**

- Prioritize and resolve farmer cases.
- Review AI-assisted crop-health triage and high-risk advisories.
- Create follow-up tasks and field visits.
- Maintain locally approved crop templates and advisory content.
- Monitor sensor quality, maintenance and calibration.
- Review urgent-alert reach and farmer constraints.
- Support market-data mappings, grade interpretation and harvest readiness.
- Preserve an attributable audit trail.

### 6.3 MP Office

**Surface:** Desktop decision-intelligence dashboard with mobile briefing mode.

**Primary goals:**

- Understand village and constituency agricultural risks.
- Identify water, input, labour, connectivity, transport and market-data gaps.
- Monitor RSK demand, response time and unresolved workload.
- Assess alert reach and service coverage.
- Coordinate attention and public resources without accessing individual farmer data.

There is no separate District Agriculture Office application in this release. A system administrator may exist as an internal operational role but is not a fourth stakeholder-facing product.

## 7. Release goals

- Deliver all three organizer-required workflows end to end.
- Make the primary farmer journey usable through Marathi voice and low-literacy visual interaction.
- Connect recommendations, advisories, alerts, calendar tasks, diary records and RSK follow-up into one auditable loop.
- Demonstrate real hardware ingestion where available without treating low-cost readings as laboratory truth.
- Provide MP Office intelligence without exposing individual farmer information.
- Continue core farmer operations during intermittent or absent connectivity.
- Establish a secure, maintainable, accessible and testable modern codebase.
- Clearly distinguish `Live`, `Recorded` and `Simulated` data modes, while preserving manual entry as evidence provenance.
- Deliver every locked module with working acceptance behaviour, without dead controls, placeholder-only pages or misleading simulated interactions.

All locked modules are required for the target product. Build priority determines implementation order and verification depth, not whether a module exists.

## 8. Functional requirements

### PRD-F01: Farmer and Farm Setup

The product must capture and maintain:

- Farmer identity, preferred language, communication channels and consent.
- Personal, family-shared or RSK-assisted device mode.
- Farm, plot, area, map location or polygon.
- Crop history, farming method, irrigation source and water availability.
- Soil source, values, units, collection date and trust level.
- Optional Soil Health Card, laboratory record and sensor assignment.
- Current crop, variety, sowing or transplanting date and crop stage.

The flow must support voice-assisted entry, corrections, explicit unknown values, incomplete profiles and multiple plots.

### PRD-F02: Farmer Home and Daily Action Centre

The Farmer Home must provide:

- A Marathi voice briefing.
- One primary action and no more than three priority tasks.
- Farm pulse and current risks.
- RSK case status.
- The next relevant calendar activity.
- Offline, source-freshness and synchronization status.

Actions must include Done, Remind, Cannot Do, Ask RSK and Alert Seems Wrong.

### PRD-F03: Smart Crop Recommendation Engine

The engine must:

- Apply hard eligibility gates before scoring or ranking crops.
- Use farmer and farm information, season, sowing window, water, soil, crop history, rainfall, weather, locally validated crop profiles and Google Earth Engine context.
- Use bounded market context only as supporting information, never as the agronomic authority.
- Return up to three locally supported crops with reasons, trade-offs and confidence.
- Penalize unsuitable sowing windows, water demand and unsafe conditions.
- Store the complete input snapshot, data freshness, rule version and score breakdown.
- Use explainable weighted scoring for the pilot.
- Prevent an LLM from becoming the crop-selection authority.

### PRD-F04: Real-time Advisory, Dry-Spell and Input Guidance

The advisory engine must:

- Combine localized forecast, observed rainfall, recent irrigation, crop stage, soil moisture and water availability.
- Require agreement among trustworthy signals for high-impact actions.
- Produce action classes such as irrigate, inspect, prepare, delay or no action.
- Reschedule irrigation, fertilizer or spraying windows when conditions materially change.
- Explain every change and preserve the previous recommendation.
- Use verified schedules and trusted soil information for fertilizer guidance.
- Prevent exact fertilizer dosage from being generated solely from low-cost NPK readings.
- Include source, time, confidence, expiry and farmer-feedback controls.

### PRD-F05: Multimodal Crop Health Triage and Expert Care Loop

The product must:

- Accept guided crop photographs, Marathi voice descriptions and structured symptom questions.
- Check image quality and request a better image when necessary.
- Return possible causes, severity, confidence and immediate safe precautions.
- Escalate severe, uncertain, spreading or safety-sensitive cases.
- Create a consented RSK case containing relevant farm, crop, weather, activity and sensor context.
- Support expert response, follow-up tasks, status tracking and case closure.
- Present AI output as triage, not a confirmed diagnosis.
- Prevent Gemini or another generative model from producing pesticide brands, chemical selections, doses, re-entry intervals or pre-harvest intervals. Such instructions must come from a current approved rule table or an identified authorized expert.

### PRD-F06: Multilingual AI Voice Agents

Role-aware voice interaction must be available across all stakeholder applications:

- **Farmer:** Kisan Saathi.
- **RSK:** Expert Voice Copilot.
- **MP:** Constituency Voice Copilot.

The voice agent may retrieve authorized information, explain results and invoke approved application actions. Any action that changes a schedule, record, consent, case, alert, template or official workflow requires contextual read-back and explicit confirmation.

The voice agent must not invent measurements, crop advice, dosage, official warnings, market prices or case outcomes.

### PRD-F07: RSK Expert Operations Dashboard

The RSK application must include:

- A prioritized case queue and detailed case workspace.
- Crop-health evidence review and farmer response.
- Follow-up and field-visit tasks.
- Advisory and crop-template review.
- Sensor fleet, calibration and maintenance workflows.
- Alert-delivery failures, Cannot Do responses and outreach queues.
- Market mapping and harvest-support tools.
- Voice-assisted search, summaries and draft actions.
- Complete expert, access and change audit history.

Every agronomic template managed by RSK must preserve its source, valid geography, crop and cultivation method, author, reviewer, version, effective date, review or expiry date, approval state and rollback history. An expired template cannot create a new crop season until it is reapproved.

### PRD-F08: MP Office Decision Intelligence Dashboard

The MP application must provide thresholded aggregate views of:

- Village risk and crop-stage patterns.
- Dry spell, waterlogging, severe weather and harvest exposure.
- Sensor, advisory and communication coverage gaps.
- RSK case demand, response time and resolution performance.
- Water, labour, input, connectivity, transport and market-data constraints.
- Data freshness, sample size and confidence.

It must exclude individual identities, phone numbers, exact farm locations, diary records, photographs, audio, individual sensor readings, private sale values and case details.

### PRD-F09: Smart Crop Calendar and Task Planner

The calendar must:

- Generate one versioned, plot-specific season plan.
- Anchor annual crops to actual sowing or transplanting events.
- Represent perennial crops through observed seasonal stages.
- Represent activities with earliest, preferred and latest windows.
- Support dependencies, crop-stage gates, weather policies and expert overrides.
- Explain every reschedule, cancellation or replacement.
- Feed only relevant tasks into the Daily Action Centre.
- Support farmer and RSK stage confirmation.
- Preserve planned-versus-actual history.

### PRD-F10: Live Farm Monitor and Sensor Trust Centre

The monitor must:

- Support permanent farmer stations, shared RSK testing kits and farms without hardware.
- Display source, observation time, server-received time, freshness, calibration and quality separately.
- Detect range errors, spikes, flatlines, missing packets, stale readings and device faults.
- Use calibrated moisture, temperature and humidity as bounded real-time context.
- Treat low-cost pH, EC and NPK as periodic or experimental evidence according to validation status.
- Show which recommendation or task used each signal.
- Prevent stale, rejected or simulated readings from silently generating current alerts.

### PRD-F11: Offline Farm Diary and Sync Centre

The diary must:

- Record completed, partial, skipped and blocked activities.
- Store observations, photographs, audio, quantities and actual occurrence time.
- Convert completed calendar tasks into diary entries without duplicate entry.
- Use an immutable local event and outbox model with idempotent synchronization.
- Preserve farmer observations, corrections and source attribution.
- Support personal, trusted-family and RSK-assisted device modes.
- Provide a lightweight season summary inside the diary.
- Keep optional costs and sale information private to the farmer unless explicitly shared.
- Fulfil deletion requests by removing or irreversibly anonymizing personal content while retaining only the minimum non-identifying tombstone required to prevent deleted events being recreated and to preserve system integrity.

### PRD-F12: Alert Inbox and Multichannel Delivery Centre

The Alert Centre must:

- Maintain one canonical alert across in-app inbox, push, SMS and consented IVR.
- Separate provider acceptance, delivery, opening or hearing, acknowledgement, farmer response and completed action.
- Use farmer-facing priorities: Act Now, Do Today, Plan Soon, Update and Information.
- Deduplicate related signals and update existing alerts when possible.
- Bundle routine messages into a daily briefing.
- Respect language, quiet hours, channel preferences and consent.
- Escalate unacknowledged urgent alerts and actionable constraints such as no water, unavailable input, a safety concern or an explicit expert request. Other Cannot Do responses update the task or offer an alternative without automatically increasing RSK workload.
- Preserve official warning content, severity, certainty, effective time, expiry and provenance without alteration. Any simplified language or farm-specific implication appears as a separately labelled Smart Fasal explanation.

### PRD-F13: Mandi Price and Harvest Market Watch

Market Watch must:

- Display dated and sourced wholesale min, modal and max reports with market, commodity, variety, grade and original unit.
- Compare only compatible records.
- Display distance, known costs, unknown costs and an indicative net range.
- Integrate harvest-preparation tasks into the crop calendar.
- Allow farmer-configured target-price watches.
- Preserve data gaps instead of fabricating continuity.
- Prevent guaranteed price, unsupported price forecasts or automatic sell/hold instructions.
- Keep individual harvest quantity, target price and actual sale value private.
- Remain a decision-support feature, not a marketplace.

## 9. Critical end-to-end journeys

### J1: Setup to crop plan

The farmer completes voice-assisted setup, adds a plot and trusted soil and water information, receives explainable top-three crop options, selects a crop and creates a plot-specific season calendar.

### J2: Live signal to completed action

Weather and trusted soil-moisture evidence identify a risk. The advisory engine creates one action, the Alert Centre delivers it, the Calendar creates or updates the task and the Diary records the farmer's outcome.

### J3: Crop-health report to expert resolution

The farmer submits photographs and voice symptoms. AI performs bounded triage. Uncertainty or severity opens an RSK case. An expert responds, follow-up tasks enter the Calendar and the Diary records the outcome.

### J4: Offline farmer operation

The farmer opens cached farm information, records an activity and media without connectivity, sees an honest local-save state and synchronizes without loss or duplication after reconnecting.

### J5: Sensor failure and trust handling

A device reading becomes stale or anomalous. The reading is excluded from advice, the farmer receives a plain-language status and the RSK receives a maintenance task.

### J6: Harvest to market preparation

Confirmed crop stage activates harvest tasks. Market Watch displays fresh comparable reports, the farmer sets an optional target watch and the Diary records harvest without the product guaranteeing a sale outcome.

### J7: MP constituency briefing

The MP Office asks a voice or dashboard question and receives only aggregated, freshness-labelled evidence about risks, coverage, constraints and RSK service delivery.

## 10. Non-functional requirements

### 10.1 Clean code and maintainability

- Use strict TypeScript for application code.
- Produce zero lint and type-check errors in release builds.
- Avoid undocumented `any` types and duplicate sources of domain truth.
- Keep domain rules separate from UI and generative-AI presentation.
- Keep new-code duplication at or below 3%.
- Keep new functions below the configured Sonar cognitive-complexity threshold of 15 or record a reviewed exception and refactoring plan.
- Leave no unresolved TODO or placeholder behaviour in critical journeys.

Duplication and cognitive complexity are measured on authored production code. Generated clients, migrations, fixtures, vendored code and declarative configuration are excluded. Every exception requires an owner, reason and expiry date.

### 10.2 Testing and quality assurance

- Maintain at least 80% SonarQube Cloud coverage on new production code.
- Maintain at least 90% branch coverage through the committed test runner and coverage tool for the agronomy, authorization, alert-policy, sync-conflict and privacy-rule packages identified in the test specification. Generated files, type-only files and fixtures are excluded through committed coverage configuration.
- Give J1 through J7 a deterministic automated integration test and at least one release-environment smoke path. External providers and physical hardware may use contract-verified simulators, while their adapters require separate contract tests.
- Keep critical tests enabled and deterministic. No known flaky critical test may remain enabled as a merge gate.
- Across a rolling 30-day CI window, keep test-job executions requiring a rerun because of nondeterminism below 1%.
- Require format, lint, type-check, unit-test and production-build checks before merge.

### 10.3 Security

- Release with zero unresolved validated Critical or High findings from dependency, secret, SAST, container and infrastructure scans.
- Require SonarQube Cloud to report no new vulnerabilities, Security rating A and 100% review of new Security Hotspots.
- Enforce authorization on the server for every protected endpoint.
- Add negative authorization tests for Farmer, RSK and MP boundaries.
- Keep secrets, privileged credentials and service-account material outside source control and client bundles.
- Keep personal data out of fixtures, screenshots, logs and analytics events.
- Validate and constrain uploaded files, external payloads, provider webhooks and AI tool calls.
- Apply rate limits, abuse controls, secure headers and least-privilege cloud permissions.
- Give each unresolved validated Medium-or-higher security finding an owner, documented risk decision, mitigation and expiry date. This requirement does not apply to unvalidated scanner output or ordinary maintainability findings.

### 10.4 Accessibility and low-literacy usability

- Conform to WCAG 2.2 AA for applicable web experiences.
- Release with zero serious or critical automated accessibility findings on primary routes.
- Support complete keyboard operation and visible focus on desktop applications.
- Provide screen-reader names and meaningful landmarks.
- Never rely on color, position or an icon alone to communicate meaning.
- Maintain at least 4.5:1 text contrast where WCAG requires it.
- Target at least 44 by 44 CSS pixels for primary touch controls.
- Externalize all launch-route strings and provide reviewed Marathi, Hindi and English content for every launch flow. Marathi critical journeys require native-speaker review.
- Provide audio playback for farmer advisories, alerts, task instructions, consent explanations and error recovery. Static navigation labels require accessible text but do not each require prerecorded audio.
- Before release, manually test every critical journey using keyboard-only navigation, 200% text zoom and reflow, visible focus and one supported screen-reader and browser combination. Automated checks use a committed axe-core ruleset.

### 10.5 Performance and efficiency

- Before release, meet LCP at or below 2.5 seconds, INP at or below 200 milliseconds and CLS at or below 0.1 in a documented Lighthouse or browser profile using a representative low-end Android viewport and throttled 4G. After sufficient real traffic exists, at least 75% of farmer-route visits must meet those thresholds through real-user monitoring.
- Target no more than 250 KB of initially executed first-party and third-party compressed JavaScript for the farmer entry route. Keep the authenticated farmer shell below 1 MB from a clean cache, excluding user media and map tiles.
- Target p95 below 750 milliseconds for normal first-party read/write endpoints, measured in a production-like Indian region over at least 100 requests and excluding explicitly asynchronous external-provider completion.
- Display progress or local feedback within 300 milliseconds for slower AI and external-data operations.
- Measure voice latency from end of speech to the first audible response over at least 20 Marathi test utterances on the defined 4G profile. Target p95 at or below 5 seconds when providers are healthy; otherwise provide an audible progress or retry state within one second.
- Lazy-load maps, advanced charts, large media and stakeholder-only modules.
- Cache and precompute expensive external data, including Earth Engine summaries.
- Minimize background battery use, repeated AI calls and unnecessary data transfer.

### 10.6 Reliability, offline operation and data integrity

- First-party authenticated APIs and core cached farmer routes target at least 99.5% monthly availability. External-provider failures do not count against this objective only when the application detects the failure and presents a correct cached, stale or unavailable state.
- After installation and one completed synchronization, keep the cached active farm, current season, next 30 days of tasks, unresolved alerts and pending Diary outbox usable offline.
- Any event for which the interface displays `Saved on this phone` must survive reload, process termination and network flapping.
- Repeated submission of the same event ID must produce exactly one logical server event.
- Under the defined 4G profile, up to 100 lightweight queued events, excluding media, must synchronize within 60 seconds at p95 while the app is open.
- Fall back to cached or explicitly unavailable states when an external source fails.
- Never present expired weather, market, satellite or sensor data as current.

### 10.7 Privacy and role isolation

- Collect only data required for a defined product purpose.
- Record explicit consent for audio, location sharing, case sharing and communication channels.
- Prevent exact farmer coordinates and individual records from reaching the MP interface.
- Use five farms as the pilot minimum cohort and permit only stricter thresholds. Fixed dimensions, coarse geography and time buckets, complementary suppression or equivalent controls must prevent a user deriving a sub-threshold cohort by comparing filters or neighboring totals.
- Allow farmers to view and correct their records and request export or deletion.
- Allow farmers to withdraw optional audio, location-sharing, case-sharing and communication consent without losing unrelated core functionality. New optional processing stops immediately, while retained records follow the documented retention and audit policy.
- Test export, deletion, shared-phone separation and role isolation before production release.
- Never use farmer data for advertising, credit scoring, insurance adjudication, benefit denial or farmer ranking.

### 10.8 Observability and operations

- Every first-party API request, scheduled task, queue message and asynchronous job carries or derives a trace or correlation ID. Static assets and health probes are excluded.
- Use structured logs that redact secrets, phone numbers, audio content and precise coordinates.
- Generate an operational signal within five minutes for sustained error spikes, failed alert dispatch, stale ingestion or synchronization backlog.
- Separate product analytics from security and audit logs.
- Preserve model ID, prompt-template version, tool version, rule or template version and source version. Store only redacted inputs or outputs when necessary for an approved audit purpose; never retain raw audio or personal prompt content solely for tracing.

### 10.9 SonarQube Cloud, formerly SonarCloud, policy

SonarCloud remains part of the quality strategy, but it must not slow normal local iteration.

- Run fast local checks first: format, lint, type-check, targeted tests and build.
- Run SonarQube Cloud in parallel with other CI jobs on pull requests and `main`; do not place it in the local inner loop. Its required quality-gate status must complete successfully before merge.
- Apply the quality gate to new code rather than requiring cleanup of unrelated legacy prototype findings before the rebuild starts.
- Require Security, Reliability and Maintainability rating A on new code.
- Review 100% of new Security Hotspots.
- Require at least 80% new-code coverage and no more than 3% new-code duplication.
- Require no new vulnerabilities and the ratings and thresholds above.
- For pull requests, define new code as the diff against the target branch. For `main`, commit a Sonar New Code Definition based on the previous released version.
- A SonarQube Cloud outage may be bypassed only for a clearly marked non-production demo artifact after local lint, type-check, tests, build, dependency audit and secret scan pass. Production deployment and merge to the protected release branch remain blocked until analysis succeeds.

## 11. Mandatory automated test journeys

- Farmer onboarding and multi-plot setup.
- Crop recommendation with incomplete, conflicting or stale data.
- Advisory generation, rescheduling and cancellation.
- Calendar task completion, partial completion and correction.
- Offline diary recording, retry, deduplication and conflict resolution.
- Sensor stale, simulated and faulty-data handling.
- Crop-health case escalation and RSK resolution.
- Alert delivery, acknowledgement, expiry and Cannot Do escalation.
- Farmer, RSK and MP authorization boundaries.
- MP aggregation suppression and privacy controls.
- Voice-command read-back, correction and cancellation.
- Market-price variety, grade, unit, freshness and missing-data handling.
- Accessibility checks on all primary Farmer, RSK and MP routes.

## 12. Success metrics

Pilot targets will be finalized against a documented baseline. No impact or accuracy claim may be published before validation.

### 12.1 Decision safety

- The versioned release-validation suite contains no prohibited recommendation or missed mandatory escalation.
- Every recommendation and advisory includes reasons, source, timestamp, freshness and confidence.
- In every approved crop scenario, at least one expert-approved crop appears in the top three and no crop failing a hard eligibility gate appears in the shortlist.
- Irrigation and input guidance agreement with expert-reviewed test scenarios.
- Severe crop-health cases are escalated according to approved safety rules.
- Expert correction and override rates are measured by feature and confidence band.

### 12.2 Farmer usability

- Onboarding completion and correction rates.
- Time and error rate for recording an activity.
- Voice intent completion, re-prompt and correction rates.
- Alerts heard, acknowledged, marked impossible or disputed.
- Offline records synchronized without loss or duplication.
- Farmer feedback categorized as helpful, unclear, impossible or incorrect for the field.

### 12.3 RSK operations

- Median first-response and case-resolution time.
- Correct case prioritization and severe-case escalation.
- Follow-up completion for unacknowledged urgent alerts.
- Sensor maintenance backlog and closure time.
- Expert correction, agreement and field-visit rates.

### 12.4 MP decision support

- Every displayed metric meets aggregation, freshness and sample-size rules.
- Risks and service gaps are traceable to privacy-safe aggregate evidence.
- Zero individual-farmer disclosures.
- Voice answers are traceable to the same aggregate information visible in the dashboard.

### 12.5 Technical quality

- All critical journeys pass in the release environment.
- All quality, security, accessibility, performance and reliability gates in section 10 pass or follow its permitted exception process.
- Passing idempotency, interruption and conflict tests for offline synchronization.

## 13. Explicitly out of scope

- Web3 or blockchain features.
- Farmer credit scoring.
- Insurance adjudication or claim validation.
- Open social or community feed.
- Full input or produce marketplace.
- Buyer matching, payments, bidding, contracts or logistics booking.
- Sponsored buyer or input recommendations.
- Guaranteed crop, yield, disease, weather or price predictions.
- Autonomous pesticide or fertilizer prescriptions generated by an LLM.
- Exact fertilizer dosage derived only from low-cost NPK sensors.
- A standalone post-season ML learning module.
- A separate District Agriculture Office application.
- National all-crop or all-language field-validation claims.
- Use of farmer data for advertising, benefit denial, compliance rankings or individual MP monitoring.
- Production hardware manufacturing.
- Claims of live government integration before access and agreements exist.

## 14. Assumptions and dependencies

- KVK Raigad, DBSKKV or another authorized agronomist validates local crop templates and safety-sensitive rules before a real field pilot.
- Formal RSK integration may not initially exist; the release demonstrates an RSK-compatible workflow.
- Government and third-party sources may be delayed or unavailable; cached data and demo fixtures remain explicitly dated and labelled.
- Google Cloud, Earth Engine, weather, messaging and voice services require valid credentials, quotas and approved usage.
- Production SMS and IVR require consent, registered sender identity and approved content templates.
- Farmers may use shared phones, have limited literacy and experience intermittent connectivity.
- Hardware may provide live, recorded or simulated data during the demonstration, and the interface identifies the mode everywhere it matters.
- Low-cost sensor values vary by calibration and field conditions and are not treated as laboratory truth.
- Initial crop recommendation and advisory logic is rule-gated and versioned. Local ML ranking is added only after sufficient expert-labelled and outcome data exists.
- Farmer assistance and RSK case sharing remain consented and purpose-limited.

## 15. Key product risks and required mitigations

| Risk | Required mitigation |
| --- | --- |
| Unsafe crop, irrigation or input recommendation | Hard safety gates, versioned local rules, provenance, scenario tests and RSK escalation |
| Crop-health misclassification | Bounded triage, image-quality checks, uncertainty labels and expert follow-up |
| Sensor drift or unreliable NPK | Calibration records, quality flags, outlier handling and laboratory or Soil Health Card fallback |
| Stale weather, satellite or market data | Visible timestamp and expiry, stale-state blocking and cached-source labelling |
| Speech or translation error | Domain glossary, constrained extraction, read-back and confirmation |
| Connectivity failure | Offline PWA, local event queue, resumable media and SMS or voice fallback |
| Alert fatigue | Canonical alerts, deduplication, daily briefing, quiet hours and material-change rules |
| Expert overload | Risk-based queue, AI-assisted summary, templates and SLA monitoring |
| Farmer privacy breach | Least privilege, consent, shared-device isolation, audit and aggregate MP views |
| Demo-data misrepresentation | Permanent `Live`, `Recorded` or `Simulated` mode plus manual or other evidence provenance and source time |
| Market-price misunderstanding | Variety, grade, unit and freshness matching; indicative ranges; no sale guarantee |
| Code-quality degradation | Strict local gates, focused tests, code review and Sonar new-code analysis |

## 16. Release acceptance statement

The target release is accepted when:

- All locked modules are reachable through coherent role-specific interfaces, meet their documented acceptance behaviour and contain no dead controls or placeholder-only screens.
- The three organizer-required workflows operate end to end.
- Voice interaction works across Farmer, RSK and MP roles with confirmation for state-changing actions.
- The Calendar, Alerts and Diary form one consistent action and evidence loop.
- Offline records synchronize without loss or duplication.
- High-risk uncertainty reaches the RSK workflow.
- MP information remains aggregate, thresholded and free of individual farmer data.
- Every recommendation, alert, sensor insight and market record is traceable to labelled evidence.
- No exception is permitted for authorization, privacy isolation, agronomic safety gates, data-loss or idempotency tests, critical-journey tests or validated Critical or High security findings. Any other unmet non-functional target requires a named approver, documented user impact, mitigation, owner and expiry date, and the release remains explicitly labelled pilot or demo.
- Live, recorded and simulated data remain visibly distinguishable throughout the demonstration.
