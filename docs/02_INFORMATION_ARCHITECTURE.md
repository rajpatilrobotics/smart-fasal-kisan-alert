# Smart Fasal Kisan Alert

## Information Architecture and Navigation Specification

| Field | Value |
| --- | --- |
| Status | Approved |
| Version | 0.1.2 |
| Last updated | 12 July 2026 |
| Parent document | `docs/01_PRD.md` |
| Covered surfaces | Farmer PWA, RSK desktop application, MP Office desktop application |

## 1. Purpose

This document defines the final screen hierarchy, primary navigation, conceptual routes, contextual entry points, deep-link behaviour and role boundaries for the three Smart Fasal applications.

It answers where each locked feature belongs and how users move between features. Detailed screen layouts, component appearance, responsive tokens and wireframes belong in the later UI and UX specification.

Conceptual routes in this document are stable product destinations. The technical architecture may represent them with framework route groups, but public URLs and deep links must preserve the same user meaning and security boundaries.

## 2. Information-architecture principles

1. **One role, one purpose-built shell.** Farmer, RSK and MP applications do not share the same navigation or information density.
2. **No feature-directory home page.** Each role lands on the information or work requiring attention now.
3. **Voice is contextual.** The voice agent inherits the selected role, farm, plot, task, case, geography and visible filters.
4. **Critical actions remain shallow.** An urgent farmer action, RSK work item or MP priority must be reachable in one navigation transition from the role's landing page.
5. **Plans, alerts and evidence connect.** Screens deep-link to the exact task, case, sensor, market or aggregate evidence that explains an action.
6. **Context persists.** Selected farm, plot, season, geography, crop and time range survive compatible navigation.
7. **URLs reveal no personal information.** Routes use opaque identifiers and allowlisted filters only.
8. **Offline and stale states are part of navigation.** A destination must explain what is cached, pending, expired or unavailable instead of failing silently.
9. **Navigation is accessible.** Labels, focus order, browser history and screen-reader announcements remain predictable.
10. **Permissions shape discoverability.** A user never sees navigation or search results for data outside their authorized role, jurisdiction or consent scope.

## 3. Entry, authentication and role resolution

### 3.1 Public entry

| Destination | Conceptual route | Purpose |
| --- | --- | --- |
| Product landing | `/` | Short product explanation, language choice and sign-in entry |
| Authentication | `/auth` | Begin role-appropriate authentication |
| Farmer onboarding | `/onboarding/farmer` | First-time farmer and farm setup |
| Access unavailable | `/access-unavailable` | Explain missing role, jurisdiction or account approval |
| Offline recovery | `/offline` | Explain unavailable uncached destination and recovery options |

### 3.2 Role resolution

- Production access is resolved from server-authorized account claims and jurisdiction, not from a client-side role selector.
- A hackathon-only role switcher may exist at `/demo/roles`, but it must be visibly labelled Demo and must not bypass authorization in connected environments.
- After authentication, the server routes the account to `/farmer`, `/rsk` or `/mp`.
- `/farmer`, `/rsk` and `/mp` are authorized redirect routes to `/farmer/today`, `/rsk/work` and `/mp/overview` respectively.
- Multi-role staff accounts must explicitly switch role through an audited account control. They must never blend data from different role shells.
- A requested deep link is preserved through sign-in only after its role, route and return URL are validated.
- Unauthorized users receive a safe explanation without learning whether a protected farmer, case or device exists.

## 4. Shared navigation conventions

### 4.1 Persistent context

Every authenticated shell displays the context necessary to interpret the page:

- Active identity and role.
- Active farm and plot for farmer detail screens.
- RSK office and jurisdiction for expert screens.
- Geography, period, season and crop for MP analytics.
- Connectivity or provider health when it affects the current action.
- `Data as of` or last-synchronized time.
- `Live`, `Recorded` or `Simulated` data-mode label, plus manual or other evidence provenance when relevant.

### 4.2 Page structure

Every route contains:

- A unique page title.
- A logical parent destination.
- A visible primary action when action is possible.
- Source, freshness and confidence access for data-driven content.
- A defined loading, empty, error, permission and offline state.
- A deterministic browser Back destination.

### 4.3 Global status vocabulary

Use the same plain-language states across applications:

- Current
- Data is old
- Waiting for internet
- Saved on this phone
- Syncing
- Synced
- Needs review
- Waiting for farmer
- Waiting for RSK
- Expired
- Replaced
- No recent data
- Insufficient aggregate data
- Demo or simulated data

Technical error codes may appear in diagnostics, but never replace a helpful user-facing explanation.

### 4.4 Global voice behaviour

- Voice opens over the current destination rather than resetting navigation.
- The transcript and detected context are visible before a state-changing action.
- A proposed change links to the same visual confirmation screen available through touch or keyboard.
- Closing voice returns focus to the control that opened it.
- Voice history is scoped to the current authorized session and does not become an unrestricted transcript archive.

## 5. Farmer PWA information architecture

### 5.1 Farmer shell

Every authenticated farmer screen contains:

- Active farmer identity, especially on a shared phone.
- Farm or plot context selector on Today, Work, Alerts and farm-context screens. Global Settings, Help and Privacy screens omit irrelevant farm controls.
- Connectivity and synchronization indicator.
- Page title and consistent Back action.
- Five-item bottom navigation.
- Speak as the central, labelled third item in the five-item bottom navigation. It is not an additional floating navigation control.
- Contextual Listen, Camera or Record Work actions when appropriate.

Do not add a hamburger menu that duplicates the primary bottom navigation.

### 5.2 Final farmer bottom navigation

| Position | Marathi / English label | Route | Primary purpose |
| --- | --- | --- | --- |
| 1 | `आज / Today` | `/farmer/today` | Daily briefing, primary action, priority tasks and farm pulse |
| 2 | `कामे / Work` | `/farmer/work` | To-do list, crop calendar and farm diary |
| 3 | `बोला / Speak` | Contextual voice overlay | Kisan Saathi over the current screen |
| 4 | `सूचना / Alerts` | `/farmer/alerts` | Active alerts, later reminders and alert history |
| 5 | `शेत / My Farm` | `/farmer/farms` | Farms, crops, recommendations, sensors, crop health, RSK cases and Market Watch |

The central Speak control is a labelled navigation action, not an unexplained floating microphone. It preserves the selected farm, plot, task and visible record. While the overlay is open, the originating content tab remains selected.

Market Watch is seasonally important but does not occupy permanent navigation throughout the year. It appears inside My Farm, through voice, from price-alert deep links and as a Today card when harvest approaches.

Crop Health remains available from My Farm, Today quick actions, relevant alerts and the voice agent. Farm Diary recording remains available from Work, task completion, Today and voice.

### 5.3 Farmer screen hierarchy

#### Entry and onboarding

| Step | Conceptual route | Notes |
| --- | --- | --- |
| Language and accessibility | `/onboarding/farmer/language` | Marathi default, audio preview and assisted path |
| Device mode | `/onboarding/farmer/device` | Personal, trusted family or RSK-assisted device |
| Consent and channels | `/onboarding/farmer/consent` | Audio, location, case sharing, alerts and IVR |
| Farmer profile | `/onboarding/farmer/profile` | Voice-assisted, explicit unknown values allowed |
| Farm and plot | `/onboarding/farmer/farm` | Map, village, landmark or assisted alternatives |
| Soil and water | `/onboarding/farmer/soil-water` | Source, units, date and trust level |
| Crop and stage | `/onboarding/farmer/crop` | Current season or start-new-season path |
| Optional sensor | `/onboarding/farmer/sensor` | Skip is always available |
| Review | `/onboarding/farmer/review` | Read-back, corrections and completion |

Authentication and OTP verification occur only through `/auth`. After successful role resolution, the farmer continues into onboarding. The onboarding draft must resume after interruption or offline use once identity and the application shell have been established. First authentication and role resolution require connectivity. Completion never depends on owning hardware.

#### Today

Route: `/farmer/today`

Today contains:

- Voice briefing.
- One primary action.
- No more than three priority tasks.
- Farm pulse.
- Next crop milestone.
- Highest-priority active alert.
- RSK case status.
- Harvest or market card when seasonally relevant.
- Quick actions for Report Crop Problem and Record Farm Work.

Every Today card opens the exact destination that owns the action. Today does not duplicate full detail screens.

#### Work

| Screen | Conceptual route | Purpose |
| --- | --- | --- |
| Work overview | `/farmer/work` | To Do, upcoming, blocked and recently completed work |
| All-farms calendar agenda | `/farmer/work/calendar` | Near-term tasks across farms and plots |
| Season crop calendar | `/farmer/seasons/:seasonId/calendar` | Authoritative stage timeline and task windows |
| Week agenda | `/farmer/work/calendar/week` | Near-term tasks across plots |
| Optional month view | `/farmer/work/calendar/month` | Secondary literate-user view |
| Task detail | `/farmer/tasks/:taskId` | Action, reason, window, evidence and response |
| Change explanation | `/farmer/tasks/:taskId/changes` | Original and revised plan with reason |
| Aggregate Farm Diary | `/farmer/work/diary` | Actual activity and observation timeline across selected farms |
| Season Diary | `/farmer/seasons/:seasonId/diary` | Plot-season activity and observation timeline |
| New diary entry | `/farmer/work/diary/new` | Voice, tap, photo or task-derived entry |
| Diary entry | `/farmer/diary/:entryId` | Actual record, revisions and sharing state |
| Season summary | `/farmer/seasons/:seasonId/summary` | Lightweight planned-versus-actual summary |

Task detail actions include Done, Partly Done, Remind, Cannot Do and Ask RSK. Alert Seems Wrong appears when the task originates from an alert or advisory. Completing a task creates the Diary activity automatically.

#### Alerts

| Screen | Conceptual route | Purpose |
| --- | --- | --- |
| Now | `/farmer/alerts` | Canonical default for active alerts requiring attention |
| Later | `/farmer/alerts?view=later` | Upcoming reminders and planned updates |
| History | `/farmer/alerts?view=history` | Completed, expired, cancelled and replaced alerts |
| Alert detail | `/farmer/alerts/:alertId` | Action, reason, source, expiry and delivery state |
| Official warning | `/farmer/alerts/:alertId/official` | Unaltered official content and separate farm implication |
| Delivery preferences | `/farmer/settings/alerts` | Channels, language, timing and consent |

An alert links to the task, case, monitor, crop stage or market record that owns the next action.

Changing among Now, Later and History creates predictable browser-history entries. Applicable alert detail actions are Listen, Understood, Done, Remind, Cannot Do, Alert Seems Wrong and Ask RSK. Alert Seems Wrong appears only for an alert or advisory-derived decision.

#### My Farm

| Area | Conceptual routes | Purpose |
| --- | --- | --- |
| Farms | `/farmer/farms`, `/farmer/farms/:farmId` | Farm list and selected-farm overview |
| Add farm | `/farmer/farms/new` | Post-onboarding farm creation |
| Plot | `/farmer/farms/:farmId/plots/:plotId` | Plot pulse, crop, risks and feature entry points |
| Add plot | `/farmer/farms/:farmId/plots/new` | Add another plot to an existing farm |
| Edit plot | `/farmer/farms/:farmId/plots/:plotId/edit` | Correct plot, area and local context |
| Farm setup | `/farmer/farms/:farmId/edit` | Profile, plot, soil, water and history corrections |
| Soil and water | `/farmer/farms/:farmId/soil-water` | Source, sample, irrigation and water context |
| Current season | `/farmer/seasons/:seasonId` | Crop, variety, stage, source and confidence |
| Crop recommendations | `/farmer/farms/:farmId/plots/:plotId/recommendations` | Setup, top-three comparison and evidence |
| Recommendation detail | `/farmer/recommendations/:recommendationId` | Scores, trade-offs, sources and acceptance |
| Advisory detail | `/farmer/advisories/:advisoryId` | Action, evidence, confidence, expiry and feedback |
| Live Farm Monitor | `/farmer/farms/:farmId/plots/:plotId/live` | Current conditions, trends and trust state |
| Signal detail | `/farmer/farms/:farmId/plots/:plotId/live/:signalType` | Allowlisted signal trend, calibration and trust state |
| Sensor or device | `/farmer/devices/:deviceId` | Farmer-safe device status and help request |
| Crop-health history | `/farmer/farms/:farmId/plots/:plotId/health` | Previous reports for the selected plot |
| New crop-health report | `/farmer/farms/:farmId/plots/:plotId/health/new` | Guided photo and voice capture |
| Crop-health report | `/farmer/health/:reportId` | Triage, evidence, escalation and status |
| RSK cases | `/farmer/cases`, `/farmer/cases/:caseId` | Consented case tracking and expert response |
| Request RSK help | `/farmer/help/new` | Review purpose, evidence and sharing scope before case creation |
| Harvest and Market Watch | `/farmer/seasons/:seasonId/market` | Harvest readiness and market evidence |
| Market comparison | `/farmer/seasons/:seasonId/market/compare` | Compatible reports and indicative net range |
| Market trends | `/farmer/seasons/:seasonId/market/trends` | Dated reporting-day trends and coverage |
| Price watches | `/farmer/market/watches`, `/farmer/market/watches/:watchId` | Personal thresholds and delivery preference |
| Settings | `/farmer/settings` | Profile, language, voice, privacy, shared phone and help |
| Profile settings | `/farmer/settings/profile` | Farmer identity and account details |
| Language settings | `/farmer/settings/language` | Interface and audio language |
| Voice settings | `/farmer/settings/voice` | Audio, microphone and voice preferences |
| Alert settings | `/farmer/settings/alerts` | Channels, briefing, quiet hours and IVR consent |
| Privacy settings | `/farmer/settings/privacy` | Consent, access history and sharing controls |
| Data controls | `/farmer/settings/data` | Export, deletion and local-storage controls |
| Device mode | `/farmer/settings/device` | Personal, family-shared or assisted mode controls |
| Sync Centre | `/farmer/settings/sync` | Pending events, media, failures and retry |
| Sync conflict | `/farmer/settings/sync/conflicts/:conflictId` | Plain-language conflict resolution |
| Help | `/farmer/settings/help` | Accessible product help and RSK contact path |

### 5.4 Farmer context rules

- Today, Work and Alerts may use an All Farms context.
- Crop recommendations, sensor readings, case creation and harvest plans require an explicit plot or season. `/farmer/cases` may aggregate existing cases across farms, while case detail remains bound to its farm, plot and season.
- The most recently confirmed plot persists across compatible screens.
- A context switch that would discard unsaved information requires confirmation.
- GPS may suggest a plot but never blocks later entry from home.
- Every all-farms card visibly identifies its farm and plot.
- `:signalType` and similar public slugs come from committed allowlists. Unknown values return a safe not-found state.
- All route identifiers are opaque. Names, phone numbers, coordinates, symptoms and free text never appear in URLs.

### 5.5 Farmer contextual entry points

#### Speak

- Central labelled action on every primary screen.
- Field-level microphone where voice entry reduces typing.
- Listen control on advice, tasks, alerts, consent and recoverable errors.
- Contextual read-back before every state-changing action.

Voice may be represented by an addressable overlay such as `/farmer/voice?context=task&contextId=:opaqueId` so browser Back closes it predictably. Context IDs must be authorized and opaque.

#### Camera

Use a labelled Report Crop Problem action on Today, the selected plot, Crop Health, relevant alerts and voice results. Confirm plot and crop before capture. Ask for camera permission only when capture begins.

#### Record work

Record Farm Work is available from Today, Work, Diary, task completion and voice. The Calendar and Diary must never require duplicate entry for the same completed task.

Ask RSK and Report Sensor Problem first open `/farmer/help/new`, where the farmer reviews the purpose, evidence and sharing scope before a case or support request is created.

### 5.6 Farmer offline route behaviour

| Area | Offline behaviour |
| --- | --- |
| Today | Cached briefing, tasks and alerts with freshness labels |
| Work | Current season and next 30 days of tasks |
| Task actions | Done, partial, Cannot Do and notes saved locally |
| Calendar | Cached stages, task windows and change history |
| Diary | View cached season and create entries, photos and audio |
| Alerts | View unresolved alerts and queue responses |
| Farm profile | View cached farms and queue safe edits |
| Live Monitor | Last trusted reading with stale or offline status |
| Crop recommendation | Show latest result; save new inputs for connected evaluation |
| Crop Health | Capture evidence and queue analysis or case creation |
| RSK cases | Show cached case and queue farmer response |
| Market Watch | Show last dated snapshot and never label it current |
| Voice | Play cached audio or save audio when recognition is unavailable |
| Onboarding | Resume saved progress with manual alternatives to connected steps |

No route may imply that queued AI analysis, RSK delivery, weather retrieval or market retrieval has completed.

Offline task responses behave as follows:

- Done, Partly Done, Cannot Do, Alert Seems Wrong and Ask RSK are saved to the local outbox.
- Remind uses a local notification where the platform supports it.
- Ask RSK remains `Waiting for internet` until the server accepts the request.
- An offline alert acknowledgement is only `Saved on this phone`; it becomes acknowledged across channels after server synchronization.
- Offline voice audio enters `Needs confirmation` after later transcription and can never execute a task, schedule, diary, consent or case action automatically.
- Crop-health evidence may be queued, but the product cannot show AI analysis as completed and cannot share case evidence without an already confirmed sharing scope.

## 6. RSK Office information architecture

### 6.1 RSK product boundary

The RSK application is an operational workspace. It defaults to work requiring human action, not a decorative analytics dashboard. There is no unrestricted Farmer Directory.

### 6.2 RSK desktop shell

The global header contains:

- RSK office and jurisdiction.
- Permission-filtered global search.
- Start Assisted Session action.
- Expert Voice Copilot.
- Connectivity and provider health.
- Assignment notifications.
- Expert availability and profile.

The left navigation is grouped as follows:

| Group | Primary navigation | Default route |
| --- | --- | --- |
| Work | Work Queue | `/rsk/work` |
| Work | Cases | `/rsk/cases` |
| Work | Field Visits | `/rsk/visits/today` |
| Operations | Alert Operations | `/rsk/alerts/outreach` |
| Operations | Sensor Operations | `/rsk/sensors/issues` |
| Operations | Market Support | `/rsk/market/requests` |
| Agronomy | Advisory Reviews | `/rsk/agronomy/advisory-reviews` |
| Agronomy | Calendar Reviews | `/rsk/agronomy/calendar-reviews` |
| Agronomy | Template Library | `/rsk/agronomy/templates` |
| Farmer service | Assisted Session | `/rsk/assist/new` |
| Governance | Audit Log | `/rsk/audit` for separately authorized roles |

### 6.3 Work Queue

Default route: `/rsk/work`

The default result set is work assigned to the signed-in user plus authorized unassigned items due today.

Queue views:

- My Work.
- Urgent and overdue.
- Unassigned.
- Awaiting farmer.
- Scheduled.
- Recently completed.
- Team workload for managers only.

Supported work types include crop-health cases, high-risk advisory reviews, urgent-alert outreach, actionable constraints, failed delivery, sensor faults, field visits, calendar reviews, market mapping, template approval and assisted-session follow-up.

Queue columns are priority, due time or SLA, work type, masked farmer or entity, village, crop or stage, reason, evidence freshness, status and owner.

Queue rows use masked farmer identity. Contact information becomes visible only after the work is claimed or another purpose-bound access check succeeds, and that access is audited.

Work status is separate from priority and uses New, Assigned, In Progress, Awaiting Farmer, Scheduled, Resolved, Reopened, Cancelled and Duplicate. Awaiting Farmer and Scheduled may resume In Progress. Reopening an actionable domain entity must return linked Work to the Queue without rewriting its earlier resolved interval. Selecting a row opens the work item's owning domain route. Back navigation restores the queue's filters, sort, page and scroll position.

Priority is explainable and rule-based:

1. Safety-critical or severe crop-health cases.
2. Urgent unacknowledged alerts.
3. Farmer-requested expert help.
4. SLA breach or follow-up due.
5. Sensor faults affecting active advice.
6. Scheduled visits.
7. Routine reviews.

Never rank farmers by wealth, land size, predicted yield or political importance. A mass weather event creates one incident; only exceptions requiring individual follow-up create individual work items.

### 6.4 RSK screen and route map

#### Cases

| Destination | Conceptual route |
| --- | --- |
| Case list | `/rsk/cases` |
| Case overview | `/rsk/cases/:caseId/overview` |
| Evidence | `/rsk/cases/:caseId/evidence` |
| Care plan | `/rsk/cases/:caseId/care-plan` |
| Timeline | `/rsk/cases/:caseId/timeline` |
| Consent and access | `/rsk/cases/:caseId/access` |

Case status and severity remain separate. A severe case cannot close while mandatory follow-up remains unfinished. AI is displayed as triage, and chemical guidance must originate from approved content or an identified authorized expert.

The case header always displays case ID, severity, workflow status, SLA, owner, crop and stage, village, consent scope, last farmer contact and freshness warning. The Evidence tab contains a purpose-specific consent pack, normally the relevant 14 to 30 days, and shows transcript before raw audio. It excludes full Diary history, unrelated media, private costs and sales by default.

Case actions follow Claim, Request Evidence, Provide Approved Response, Create Follow-up Task, Schedule Visit, Escalate, Resolve and Reopen. Resolution requires an outcome and closure reason.

#### Alert Operations

| Destination | Conceptual route |
| --- | --- |
| Outreach | `/rsk/alerts/outreach` |
| Outreach detail | `/rsk/alerts/outreach/:outreachId` |
| Active canonical alerts | `/rsk/alerts/active` |
| Delivery health | `/rsk/alerts/delivery-health` |
| Drafts and approvals | `/rsk/alerts/drafts` |
| Draft or approval detail | `/rsk/alerts/drafts/:draftId` |
| Alert detail | `/rsk/alerts/:alertId` |

Alert detail preserves the original official warning separately from the Smart Fasal explanation. An outreach item and the canonical alert remain separate records. Draft rejection, cancellation and replacement preserve explicit states and reasons. Bulk Act Now publication requires separate `alert.draft` and `alert.approve` authority, and the creator cannot approve the same alert.

#### Sensor Operations

| Destination | Conceptual route |
| --- | --- |
| Issues | `/rsk/sensors/issues` |
| Sensor issue detail | `/rsk/sensors/issues/:issueId` |
| Devices | `/rsk/sensors/devices` |
| Maintenance | `/rsk/sensors/maintenance` |
| Maintenance work order | `/rsk/sensors/maintenance/:workOrderId` |
| Installation | `/rsk/sensors/install` |
| Device detail | `/rsk/sensors/devices/:deviceId` |

Device detail shows raw and validated readings, calibration, anomalies, recommendations affected and maintenance history. Raw observations remain immutable. Invalidating a time interval records the reason, recalculates affected advice and notifies farmers when a material recommendation changes.

Fleet browsing exposes village or field-zone context only. An assigned Sensor Technician receives an exact installation location only for an active maintenance task and a defined authorization window.

#### Calendar Reviews and Template Library

| Destination | Conceptual route |
| --- | --- |
| Advisory reviews | `/rsk/agronomy/advisory-reviews` |
| Advisory review detail | `/rsk/agronomy/advisory-reviews/:reviewId` |
| Calendar reviews | `/rsk/agronomy/calendar-reviews` |
| Farmer season review | `/rsk/agronomy/seasons/:seasonId` |
| Templates | `/rsk/agronomy/templates` |
| Template detail | `/rsk/agronomy/templates/:templateId` |
| Template version | `/rsk/agronomy/templates/:templateId/versions/:version` |
| Change requests | `/rsk/agronomy/change-requests` |
| Change request detail | `/rsk/agronomy/change-requests/:changeRequestId` |

An individual season override never mutates the master template. Publishing creates a new version. Templates have Draft, Review, Approved, Expired, Retired and Rolled Back states. Expired templates cannot start new seasons. Safety-sensitive templates require two-person review, and an editor cannot approve the same version.

#### Market Support

| Destination | Conceptual route |
| --- | --- |
| Farmer support requests | `/rsk/market/requests` |
| Request detail | `/rsk/market/requests/:requestId` |
| Commodity mappings | `/rsk/market/mappings` |
| Mapping detail | `/rsk/market/mappings/:mappingId` |
| Data quality | `/rsk/market/data-quality` |
| Data-quality issue | `/rsk/market/data-quality/:issueId` |
| Verified directory and notices | `/rsk/market/directory` |

RSK may resolve mappings and explain grading, but cannot replace an official price, endorse a buyer, execute a sale or promise a price. Farmer-private quantity, cost, target price and sale fields require purpose-specific field-level consent; general case consent is insufficient.

#### Field Visits

| Destination | Conceptual route |
| --- | --- |
| Today | `/rsk/visits/today` |
| Calendar | `/rsk/visits/calendar` |
| Unassigned | `/rsk/visits/unassigned` |
| New visit | `/rsk/visits/new` |
| Visit detail | `/rsk/visits/:visitId` |

Field staff receive a minimum authorized visit pack. Exact contact and location appear only for assigned staff during the authorized workflow.

#### Assisted Farmer Session

| Destination | Conceptual route |
| --- | --- |
| Start session | `/rsk/assist/new` |
| Find farmer for service | `/rsk/assist/find-farmer` |
| Active session | `/rsk/assist/:sessionId` |
| Session receipt | `/rsk/assist/:sessionId/receipt` |

The shell must display `Assisting this farmer` throughout the session and replace normal RSK navigation with a constrained session shell. It blocks templates, bulk alerts, unrelated cases, audit records and other farmers. Every action records both farmer and officer, requires read-back for state changes and is included on the receipt.

Ending a session revokes its scoped authorization and purges client-side farmer data and queued media only after confirmed synchronization. A second farmer cannot be opened while the current session contains unsynchronized work.

### 6.5 RSK search and voice

Global search returns only authorized work item IDs, case IDs, device IDs, villages, crops, markets, templates and assigned experts.

Farmer name or phone search exists only inside Find Farmer for Service. It requires a purpose, masks results and records access. These queries are rate-limited, jurisdiction-filtered, audited and excluded from analytics and recent-search history. Exact coordinates are never globally searchable.

The Expert Voice Copilot may navigate, filter, summarize, open a case, explain evidence and draft a response, task or visit. Every summary links to the evidence and freshness used. It may retrieve approved chemical guidance but may never generatively draft a chemical selection, dose, re-entry interval or pre-harvest interval. Sending such guidance requires source and version verification plus visual expert confirmation. Publishing templates, bulk alerts and final severe-case closure also require full visual review and cannot be completed by voice alone. Sensitive identities or case details are not read aloud until the expert confirms a private environment.

### 6.6 RSK permission-aware navigation

Navigation and actions are generated from jurisdiction-scoped capabilities such as Service Agent, Agronomy Expert, Field Officer, Sensor Technician, Content Editor, Approver, Alert Publisher, RSK Manager and Auditor.

| Destination or action | Service Agent | Agronomy Expert | Field Officer | Sensor Technician | Content Editor | Approver | Alert Publisher | Manager | Auditor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Work Queue | Assigned work | Agronomy work | Assigned visits | Assigned device work | Content work | Approval work | Alert work | Jurisdiction workload | Scoped read-only view |
| Case care plan | Draft routine response | Approve expert guidance | Visit outcome only | No | Approved-content lookup | No | No | Reassign only | Scoped read-only view |
| Field visit | Schedule with authority | Schedule or review | Execute assigned visit | Maintenance visit only | No | No | No | Assign and rebalance | Metadata only |
| Sensor maintenance | Report issue | Review agronomic impact | Assigned observation | Install, calibrate and maintain | No | No | No | Assign work | Metadata only |
| Template draft | No | Agronomy contribution | No | Sensor-rule input | Draft | Review queue | No | Workflow visibility | Version audit |
| Template publish | No | Only with Approver capability | No | No | No | Approve or retire | No | No implicit right | Version audit |
| Alert draft | Farmer outreach only | Agronomic contribution | No | Device-notice input | Approved-content input | Separate approval | Draft with capability | Workflow visibility | Version audit |
| Bulk alert approval | No | No implicit right | No | No | No | With alert-approval capability | Only if separately granted and not creator | No implicit right | Read-only audit |
| Assisted session | Assigned purpose | Assigned purpose | Visit context only | Device purpose only | No | No | No | Authorized support only | No impersonation |
| Audit Log | Own events | Own and case events | Own visits | Own device work | Own content | Approval events | Alert events | Operational metadata | Authorized investigation |

- Manager access does not automatically grant agronomy approval.
- Editors cannot approve their own safety-sensitive changes.
- Field staff cannot browse complete farmer diaries.
- Sensor technicians cannot open unrelated crop-health media.
- Alert publishers cannot alter official warning content.
- Farmer-private quantities, costs, target prices and sales require purpose-specific field-level consent.
- Protected actions are server-authorized and audited.

Market Data Reviewer and Market Data Approver are separately granted RSK capabilities. The former reviews public commodity, variety, grade, form and unit mappings; the latter independently approves policy-classified high-impact mappings. A creator cannot approve the same high-impact mapping, and neither capability creates another stakeholder application.

Manager authority never implicitly grants agronomy, alert approval, template approval or farmer-private-data access. For the pilot, unstructured break-glass access is prohibited. Any later emergency-access design requires a stated reason, strict time limit, manager authorization, complete audit and post-access review.

The Work Queue is the sole operational source of truth. Header notifications signal assignments, mentions or system incidents and deep-link to an existing work item instead of creating another task. Staff availability and capacity may support manager reassignment, but the application contains no staff productivity leaderboard.

Audit Log rows show actor, action, entity, time, purpose and outcome. Raw audio, private notes, precise coordinates and sensitive farmer content require separately authorized investigation access and never appear in the default audit view.

## 7. MP Office information architecture

### 7.1 MP product boundary

The MP application is an aggregate constituency-intelligence and briefing surface. It is not a farmer-management, expert-case or direct-advisory application.

It never exposes farmer identities, exact farms, cases, diaries, media, individual sensor readings, individual harvest quantities, private price targets or sale values. It contains no control for directly messaging farmers.

### 7.2 MP desktop shell

The left navigation contains:

| Primary navigation | Conceptual route | Purpose |
| --- | --- | --- |
| Overview | `/mp/overview` | Today's briefing and top changes |
| Pilot Area Map | `/mp/map` | Geographic aggregate patterns within the approved Raigad pilot boundary |
| Risks and Crops | `/mp/risks` | Crop-stage, weather and agronomic risks |
| Service Delivery | `/mp/service-delivery` | RSK demand, responsiveness and coverage |
| Alerts and Reach | `/mp/alerts-reach` | Delivery, acknowledgement and communication gaps |
| Resources and Constraints | `/mp/resources` | Water, input, labour, connectivity and logistics gaps |
| Harvest and Markets | `/mp/harvest-markets` | Harvest exposure and market-infrastructure context |
| Briefings | `/mp/briefings` | Daily, weekly and saved briefing snapshots |

Utility navigation contains Data Quality, Methodology, accessibility and language preferences, account controls and the Constituency Voice Copilot.

The global header contains geography, time period, season, crop, comparison, active-filter summary, `Data as of`, environment label and data-health indicator.

Both sides of a comparison must independently satisfy privacy thresholds. Change values remain suppressed when either underlying value is hidden. Comparisons are limited to approved geography and time pairs.

Utility routes include `/mp/preferences` for language and accessibility preferences and `/mp/account` for session and account controls.

### 7.3 MP screen hierarchy

#### Overview

Route: `/mp/overview`

Overview contains:

- Today's evidence-based briefing and Listen action.
- Top three priorities with direct detail links.
- Constituency risk map with table alternative.
- Risk and crop pulse.
- Service-delivery pulse.
- Alert-reach pulse.
- Constraint pulse.
- Harvest and market outlook.
- Data-health strip.

Every card links to the responsible analysis screen. The page contains no disconnected vanity metrics.

#### Raigad Pilot Area Map

Route: `/mp/map`

Available aggregate layers include dry spell, waterlogging, severe weather, crop stage, crop-health pressure, alert reach, sensor and advisory coverage, RSK workload, constraints, harvest exposure and market-data availability.

Use village, approved cluster, block or taluka shading. Never display farmer points, farm polygons or exact device locations. Every tooltip includes sample size, coverage and freshness. A keyboard-operable evidence table is mandatory.

The pilot reporting boundary is the approved Raigad pilot geography. It must not be described as identical to a parliamentary constituency until verified constituency-boundary data and mappings exist.

#### Risks and Crops

| Destination | Conceptual route |
| --- | --- |
| Risk board | `/mp/risks` |
| Risk detail | `/mp/risks/:riskType` |

The Risk board contains Risks and Crop-stage Outlook tabs. The crop-stage view remains aggregate and uses allowlisted crops and stages.

Risk detail shows definition, current severity, direction, aggregate geography, crop stages, contributing evidence, source agreement, service response, alert reach and limitations. `:riskType` is an enumerated public slug, never a database identifier or arbitrary user input. Unknown slugs return a safe not-found state.

#### Service Delivery

Route: `/mp/service-delivery`

This view covers demand, first response, follow-up, resolution, ageing backlog, severe-case response, field visits, sensor maintenance, alert outreach and service coverage. Comparisons apply to service areas or teams, never individual officers.

#### Alerts and Reach

Route: `/mp/alerts-reach`

This view separates official warnings from Smart Fasal advisories and displays the aggregate funnel from eligible cohort through action or service resolution. It includes channel, language, connectivity, expiry, correction and cancellation trends. Every funnel stage and denominator independently passes aggregation rules. Complementary suppression prevents subtraction between adjacent stages; suppressed zeroes do not appear as `0` or `0%`. The MP role cannot compose or send alerts.

#### Resources and Constraints

Route: `/mp/resources`

Constraint categories include water, drainage, inputs, labour, device or mobile connectivity, RSK access, transport, drying, grading, packing, storage and market-data availability. Farmer free text is never exposed.

#### Harvest and Markets

Route: `/mp/harvest-markets`

This view contains crop-stage-based harvest outlook, weather exposure, aggregate readiness constraints, transport and storage gaps and public market-report freshness. It excludes individual quantities, target prices, market preferences, sale decisions and actual sale values.

#### Briefings

| Destination | Conceptual route |
| --- | --- |
| Briefing library | `/mp/briefings` |
| Today's briefing | `/mp/briefings/today` |
| New draft briefing | `/mp/briefings/drafts/new` |
| Draft briefing | `/mp/briefings/drafts/:briefingId` |
| Saved briefing | `/mp/briefings/saved/:briefingId` |

Briefings contain scope, as-of time, changes, priorities, evidence, service response, reach, constraints, harvest implications, limitations and sources. Adding evidence to a draft and every export reapplies server-side aggregation and suppression rules. Exports contain no raw-row option.

#### Data Quality and Methodology

| Destination | Conceptual route |
| --- | --- |
| Data Quality | `/mp/data-quality` |
| Methodology | `/mp/methodology` |

Every metric links to Why This Metric, which explains definition, numerator, denominator, sources, refresh schedule, suppression, confidence and known limitations. Provider and sensor health show only aggregate coverage and source status. Device identifiers, exact locations and single-device failures remain unavailable.

### 7.4 MP aggregate drawer and drill-down

Selecting an area, risk, constraint or service metric opens an aggregate context drawer instead of a farmer list. The allowed hierarchy is:

`Raigad pilot area -> taluka or block -> village or approved cluster`

The hierarchy stops there. Every farmer-derived MP metric requires at least five contributing farms, with stricter thresholds for sensitive or highly filtered cohorts. If a threshold is not met, suppress the value or roll it up to a safer geography, crop category or time period. Public market facts use a separate public-fact path and require no farmer cohort unless joined to farmer-derived information.

The aggregate drawer may show scope, sample and coverage, risk trends, crop stages, alert reach, service metrics, constraints, harvest exposure, data health and links to aggregate modules. It never contains a record list or a link to an individual entity.

Approved filters are fixed geography, time bucket, crop, crop stage, risk, alert class or channel, service category, constraint category, `dataMode` and allowlisted provenance. Arbitrary free-form analytical dimensions are not allowed.

Complementary suppression, sticky suppression and allowlisted aggregate queries must prevent repeated filters, tables, voice questions, URLs or exports from revealing a hidden small cohort.

Live, Recorded and Simulated aggregates are kept distinct. Simulated observations are excluded from operational metrics by default and are never silently combined with live or recorded observations. Any demo comparison visibly labels each data mode.

### 7.5 MP voice and mobile briefing

The Constituency Voice Copilot may navigate, set approved filters, summarize visible aggregates, compare allowed geographies or periods, explain metrics and draft a privacy-safe briefing after confirmation.

Every voice answer displays the active geography and period, data as-of time, sample or coverage, suppression state, confidence, supporting sources and a link to the equivalent dashboard view.

It cannot find a farmer, retrieve a case, reveal an exact location, send alerts, override RSK work or bypass suppression through repeated questions.

The responsive mobile route `/mp/briefings/today` contains a listenable morning brief, top three priorities, risk change, service pulse, alert reach, harvest note and data-quality warning. Complex maps and detailed comparison remain desktop-first.

### 7.6 Explicitly forbidden MP routes

The following route families must not exist:

```text
/mp/farmers/*
/mp/farms/*
/mp/plots/*
/mp/cases/*
/mp/sensors/*
/mp/diaries/*
/mp/media/*
```

## 8. Cross-feature navigation and deep links

| Starting context | Destination | Required behaviour |
| --- | --- | --- |
| Farmer Today task | Task detail | Preserve farm and plot; show current version |
| Crop recommendation accepted | New season and Calendar | Confirm crop and actual start anchor |
| Farm pulse risk | Live Monitor or advisory detail | Explain source, freshness and affected task |
| Advisory alert | Task, Monitor or Crop Health | Open exact action, not generic Home |
| Crop-health submission | Crop-health report | Show local-save and analysis states; open case status only when escalation creates an RSK case |
| RSK expert response | Farmer Alert and case detail | Link advice to follow-up task |
| Task completed | Diary entry | Create actual record without duplicate entry |
| Farmer Cannot Do | Alternative or RSK work item | Escalate only actionable constraints |
| Sensor fault | RSK Sensor Issue | Link affected recommendations and maintenance |
| Market target reached | Market comparison | Preserve commodity, variety, grade and report date |
| Harvest stage confirmed | Calendar and Market Watch | Create preparation tasks and comparison entry point |
| RSK template update | Version review | Preserve existing season snapshot and show affected future use |
| MP Overview priority | Risk, Map or Service detail | Carry approved filters and visible scope |
| MP stale evidence | Data Quality | Explain source incident and limitations |
| Any MP finding | Draft Briefing | Reapply suppression and preserve supporting links |

## 9. Deep-link security and lifecycle

Every app, push, SMS or IVR deep link must:

1. Verify authentication, role, jurisdiction and consent scope.
2. Preserve a valid destination through sign-in or local PIN unlock.
3. Use opaque identifiers and short-lived tokens where appropriate.
4. Exclude names, phone numbers, coordinates, symptoms and message text from URLs.
5. Display expired, cancelled, replaced or inaccessible state honestly.
6. Route an outdated alert to its current replacement when authorized.
7. Use an available cached record offline and label its age only when that record was previously authorized inside the signed-in application. A token-only SMS or IVR link cannot reveal cached protected data before server verification.
8. Provide a recovery screen when the destination is not cached.
9. Give the visible in-app Back control a logical parent. Native browser Back returns to the calling page or application and must not be hijacked.
10. Never execute a state-changing action directly from the URL.
11. Require fresh confirmation before executing a proposed action.

## 10. Responsive behaviour

### Farmer

- Portrait mobile is the primary layout.
- Tablet and desktop widen content but retain the same five destinations and shallow hierarchy.
- Farmer screens avoid desktop-style dense dashboards.

### RSK

- Desktop is primary.
- Tablet preserves the work queue and case workspace with a collapsible navigation rail.
- Mobile supports urgent queue review, callbacks and assigned visit packs, not full template editing or bulk alert publication.

### MP

- Desktop is primary for maps and comparisons.
- Mobile provides the daily briefing and top priorities.
- Analytical filters and privacy rules remain identical across breakpoints.

## 11. Accessibility and low-literacy navigation requirements

- Use persistent text labels with every primary icon.
- Prefer 48 by 48 CSS pixels for farmer primary controls; never go below the PRD's 44 by 44 minimum.
- Use one primary action before secondary analysis.
- Use familiar verbs instead of internal module names.
- Support 200% text zoom and reflow without hiding navigation or actions.
- Announce route title, changed context and loaded state to assistive technology.
- Preserve visible keyboard focus through navigation, drawers, dialogs and voice overlays.
- Provide a Skip to Main Content action in desktop shells.
- Use table or list alternatives for every map and essential chart.
- Never rely on color, gesture, audio or icon alone.
- Do not make swipe, drag, pinch, long press or hover the only interaction.
- Pair farmer advisories, alerts, task instructions, consent and error recovery with Listen.
- Keep Cannot Do as easy to reach as Done.
- Avoid shame-based progress, streaks and farmer or staff rankings.
- Shared-phone mode always shows the active farmer and protects profile switching.
- Sensitive lock-screen notifications reveal no diagnosis, chemical detail or private farm information.

## 12. Information-architecture acceptance criteria

The information architecture is accepted when:

- Every PRD module has exactly one clear primary home.
- Farmer primary navigation contains exactly five labelled destinations.
- Every urgent farmer action is reachable from Today or its alert in one transition.
- Crop Health and Record Farm Work are reachable from Today without navigating through settings.
- Calendar and Diary are presented as connected Plan and Actual views under Work.
- Market Watch appears automatically near harvest and remains reachable through My Farm and voice.
- Farmer voice preserves the selected context and never becomes the only path.
- RSK lands on an explainable unified Work Queue.
- RSK has no unrestricted Farmer Directory.
- Assisted sessions visibly attribute every action to farmer and officer.
- MP navigation contains no individual farmer, farm, case, device or media destination.
- Every MP drill-down stops at an approved aggregate geography and enforces suppression.
- Browser Back, deep links and responsive navigation have deterministic destinations.
- Every route defines loading, empty, offline or stale, error and unauthorized behaviour.
- No route contains personal information in its path or query parameters.
- No screen is a placeholder-only page or contains a control without a destination and acceptance behaviour.
