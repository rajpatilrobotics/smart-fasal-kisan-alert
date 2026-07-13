# Smart Fasal Kisan Alert

## UI Design System and Annotated Wireframes

| Field | Value |
| --- | --- |
| Status | Approved for implementation |
| Version | 0.1.0 |
| Last updated | 13 July 2026 |
| Parent documents | `docs/01_PRD.md` through `docs/08_AI_ML_AND_AGRONOMY_SPECIFICATION.md` |
| Pilot | Raigad district, Maharashtra |
| Surfaces | Farmer mobile-first PWA, RSK desktop application, MP Office desktop application |
| Launch languages | Marathi primary for Farmer; Marathi, Hindi and English supported |

## 1. Purpose

This document converts the approved product, flow, feature, architecture, API and intelligence contracts into one implementable visual system. It specifies shared tokens and components, stakeholder-specific shells, responsive behaviour, accessibility, low-literacy content patterns, all required states and annotated screen wireframes.

The wireframes describe hierarchy, content, actions and state behaviour. They do not authorize placeholder controls, invented metrics or fake intelligence. Implementation may refine spacing and visual polish while preserving the defined information priority, actions, safety labels and responsive behaviour.

## 2. Experience objective

Smart Fasal should feel like a calm, trustworthy agricultural service rather than a dense technology demo.

- The Farmer experience is action-first, voice-friendly, forgiving and clear on a small phone in sunlight or weak connectivity.
- The Rythu Seva Kendram (RSK) experience is a dense but humane operational workspace designed for keyboard, large screens, queues and evidence review.
- The MP Office experience is a restrained decision-intelligence dashboard designed for released aggregates, comparisons, maps and briefing preparation.
- All three surfaces use one product identity and evidence language, but they do not share the same layout density or navigation shell.

The design must make the real strengths visible: hardware and satellite evidence, deterministic recommendations, live advisory, Crop Health triage, expert service and multilingual voice. It must also make limitations, Recorded/Simulated data and unavailable states equally visible.

## 3. Locked design principles

1. **Action before analysis.** Show the next useful action before supporting charts or raw evidence.
2. **Text labels with icons.** No primary destination or safety action uses an unexplained icon.
3. **Truthful state over visual optimism.** Old, missing, queued, rejected, Recorded and Simulated states are explicit.
4. **One owner per action.** A Today card deep-links to the screen that owns the action; it does not duplicate the full workflow.
5. **Confidence is not suitability or severity.** These concepts have distinct labels, visual patterns and explanations.
6. **Voice is a layer, not a separate product.** It opens over current context and returns to the same screen.
7. **Offline is a product state.** `Saved on this phone` never appears as `Synced` or expert-reviewed.
8. **Farmer dignity.** `Cannot Do`, Unknown and Ask RSK are normal choices, never failure language.
9. **Privacy is visible.** Sharing scope, consent, masked identity, suppression and private-environment checks appear at the point of use.
10. **Maps and charts are optional views.** Every important value and action has an accessible list/table equivalent.
11. **Progressive disclosure.** Farmer sees a short explanation first; RSK may expand technical evidence; MP sees method and release detail through a drawer.
12. **No decorative data.** A card, chart or map exists only if it supports a decision or traceable explanation.

## 4. Product identity

### 4.1 Visual character

The brand uses grounded greens, warm crop/soil accents, generous light surfaces and strong typography. It should feel contemporary and credible without imitating a banking dashboard or using rustic decoration as a substitute for usability.

Photography is used sparingly for onboarding or empty-state education. Operational cards use icons, structured facts and actual Farmer media. Do not use stock crop photographs as evidence, recommendations or disease examples.

### 4.2 Product mark and naming

- Product name: `Smart Fasal` in the primary shell; `Kisan Alert` may appear as the descriptive line.
- Farmer assistant: `किसान साथी / Kisan Saathi`.
- RSK assistant: `Expert Voice Copilot`.
- MP assistant: `Constituency Voice Copilot`.
- The compact mark combines a field line and signal arc. It must remain distinguishable in one color and at 24 CSS pixels.
- Government/partner marks, if required, remain in a separate attribution area and do not imply an endorsement beyond the approved submission context.

## 5. Design tokens

Tokens live as CSS custom properties in the shared UI package and are exposed to Tailwind. Components use semantic tokens, never raw color values.

### 5.1 Color

| Token | Light value | Use |
| --- | --- | --- |
| `--color-bg` | `#F7F9F5` | App background |
| `--color-surface` | `#FFFFFF` | Cards, panels and dialogs |
| `--color-surface-subtle` | `#EEF3EC` | Grouping and selected low-emphasis regions |
| `--color-text` | `#172019` | Primary text |
| `--color-text-muted` | `#526057` | Secondary text |
| `--color-border` | `#C8D2C8` | Default dividers and outlines |
| `--color-primary` | `#166534` | Primary action and active navigation |
| `--color-primary-hover` | `#14532D` | Primary hover/pressed |
| `--color-primary-soft` | `#DCFCE7` | Selected/supporting green surface |
| `--color-accent` | `#9A5B08` | Harvest/market emphasis on light surfaces |
| `--color-accent-soft` | `#FEF3C7` | Harvest/market supporting surface |
| `--color-info` | `#1D4ED8` | Informational state |
| `--color-info-soft` | `#DBEAFE` | Informational surface |
| `--color-warning` | `#9A3412` | Caution and Needs Review |
| `--color-warning-soft` | `#FFEDD5` | Caution surface |
| `--color-danger` | `#B91C1C` | Severe, destructive or invalid state |
| `--color-danger-soft` | `#FEE2E2` | Severe surface |
| `--color-neutral-strong` | `#334155` | Recorded and neutral operational state |
| `--color-demo` | `#6D28D9` | Simulated/demo mode |
| `--color-focus` | `#2563EB` | Focus ring |

Text/background pairs must pass WCAG 2.2 AA. Primary controls use white text only on a validated sufficiently dark background. Status meaning always includes text and, where useful, an icon or pattern; it never depends on hue.

Dark mode is not required for the first release. High-contrast/forced-colors support is required. If dark mode is added later, every semantic token receives a reviewed counterpart rather than algorithmic inversion.

### 5.2 Typography

| Token | Mobile | Desktop | Use |
| --- | --- | --- | --- |
| `display-sm` | 28/36, 700 | 32/40, 700 | Farmer result or MP headline only |
| `heading-1` | 24/32, 700 | 28/36, 700 | Page title |
| `heading-2` | 20/28, 700 | 22/30, 700 | Section title |
| `heading-3` | 18/26, 650 | 18/26, 650 | Card/workspace heading |
| `body-lg` | 18/28, 500 | 18/28, 500 | Farmer primary instruction |
| `body` | 16/24, 400 | 16/24, 400 | Default content |
| `body-sm` | 14/20, 400 | 14/20, 400 | Secondary content |
| `label` | 14/20, 650 | 14/20, 650 | Controls and field labels |
| `caption` | 12/18, 500 | 12/18, 500 | Provenance and metadata; never essential action alone |
| `tabular` | 16/24, 600 | 14/20, 600 | Metrics, readings and table cells |

Use locally bundled `Noto Sans Devanagari` for Marathi/Hindi and `Noto Sans` for English, with system fallbacks. `font-variant-numeric: tabular-nums` applies to readings, dates, prices and metric tables. Do not use condensed faces for Farmer content.

### 5.3 Spacing, shape and elevation

- Base spacing unit: 4 CSS pixels.
- Core scale: 4, 8, 12, 16, 20, 24, 32, 40, 48 and 64.
- Farmer card padding: 16–20; office panel padding: 16–24.
- Farmer primary control height: 52 minimum; all Farmer touch targets: 48 by 48 preferred and never below 44 by 44.
- RSK/MP control height: 40 normal, 44 for high-impact actions; hit area remains at least 44.
- Radius: 8 for inputs, 12 for office cards, 16 for Farmer cards/dialogs and full pill only for short status/filter chips.
- Use elevation only for overlay, sticky action bar and lifted current card. Normal grouping uses border and surface contrast.
- A 2-pixel focus ring with 2-pixel offset is visible on every interactive element.

### 5.4 Icons and illustration

- Use one tree-shakeable outlined icon set plus owned agriculture-specific SVGs.
- Icons inherit text color and expose an accessible name only when the adjacent label does not already provide it.
- Status icons use stable metaphors: check, clock, cloud-off, warning triangle, shield, sync and flask/demo.
- Do not use a leaf icon for every feature.
- Do not show animated weather, pulsing severe alerts or celebratory confetti for operational outcomes.

### 5.5 Motion

- Functional transitions: 120–200 ms; drawers/dialogs: no more than 240 ms.
- Respect `prefers-reduced-motion` and remove parallax, count-up and nonessential movement.
- Loading skeletons do not shimmer indefinitely; after the route budget they become a helpful pending or failure state.
- New severe content may receive one non-repeating emphasis transition, never continuous flashing.

## 6. Responsive foundations

| Breakpoint | Width | Farmer | RSK | MP |
| --- | --- | --- | --- | --- |
| `compact` | below 600 | Primary portrait experience | Urgent read/callback/visit only | Mobile-safe `/mp/briefings/today`: listenable brief, top three priorities, risk change, service pulse, Alert reach, harvest note and data-quality warning |
| `medium` | 600–1023 | Wider single column or two-card grid | Collapsible rail, queue/detail single pane | Cards plus one compact chart/table |
| `expanded` | 1024–1439 | Centred content, same five destinations | Full left navigation and workspace | Full navigation, cards and map/table |
| `wide` | 1440+ | Maximum content width; no stretched paragraphs | Queue/detail split and optional evidence rail | 12-column analytical canvas |

- Farmer content max width is 720 pixels; a task or advisory reading column is 640 pixels.
- RSK uses a 240-pixel navigation rail, 320–420-pixel queue pane and flexible detail pane where the route supports split view.
- MP uses a 256-pixel navigation rail and 12-column grid; map/table and comparison layouts never exceed readable widths.
- Browser zoom to 200% must reflow without two-dimensional scrolling, except a data table that provides an equivalent stacked-card view.

## 7. Shared shell and page anatomy

Every route contains:

1. skip link on desktop;
2. authenticated stakeholder and jurisdiction/farm context;
3. connectivity, sync or release state where relevant;
4. unique page title and deterministic Back/breadcrumb destination;
5. one visible primary action when action is available;
6. content with stateful regions;
7. evidence/freshness/confidence access for data-derived content; and
8. role-appropriate voice entry.

Page titles receive programmatic focus after full route navigation. Inline updates announce only their changed region. Browser Back closes the top overlay/drawer first, then returns to the owning list with filters and scroll restored.

## 8. Shared component catalogue

### 8.1 Navigation and context

| Component | Contract |
| --- | --- |
| `FarmerBottomNav` | Exactly five labelled destinations; Speak is central and preserves originating tab/context |
| `OfficeSideNav` | Capability-filtered; hidden destination does not imply absent authorization checks |
| `PageHeader` | Title, Back/breadcrumb, context, primary action and optional safe actions |
| `ContextPicker` | Farm/Plot/Season label; prevents unsaved-context loss; never uses exact coordinates as label |
| `RoleContextSwitcher` | Staff only; server-issued role context; Demo switch visibly marked and non-authoritative |
| `StatusStrip` | Connectivity/sync/provider/release status; terse, expandable and screen-reader announced |

### 8.2 Evidence and decision components

| Component | Contract |
| --- | --- |
| `DataModeBadge` | Exactly Live, Recorded or Simulated with icon and accessible text |
| `FreshnessLabel` | Current, Data Is Old, No Recent Data or Unavailable plus as-of time |
| `SourceRow` | Source type/name, observed/issued time, quality, limitation and detail link |
| `EvidenceDrawer` | Sources, missing/proxy/conflict, registry versions, expert review and data mode |
| `SuitabilityMeter` | Crop fit only; labelled 0–100; never reused for confidence |
| `ConfidenceBadge` | High/Medium/Low plus `Why?`; never green-only |
| `SeverityBanner` | Low/Moderate/High/Critical with explicit label and next action |
| `TrustBadge` | Trusted, Use with Caution, Trend Only or Do Not Use; includes explanation |
| `ChangeComparison` | Previous/current values, reason, affected tasks and source time |
| `SuppressedCell` | `Insufficient aggregate data`, methodology and optional safe-rollup action; no hidden number |

### 8.3 Actions and feedback

- Primary button: one per card/region, filled.
- Secondary: outlined.
- Tertiary: text button; still at least minimum hit size.
- Destructive: danger style plus consequence and confirmation; never used for routine Cancel.
- `ActionSheet` is used for compact Farmer secondary actions, not for the main safety decision.
- `ReadBackCard` lists actor context, target, action, time, quantity/unit, sharing effect and consequence before confirmation.
- `CannotDoPanel` offers water/input/access/safety/other registered constraints and Ask RSK.
- `UndoToast` is allowed only for reversible local UI state; it cannot reverse accepted consent, expert issuance or immutable facts without the owning correction command.

### 8.4 Data display

- Metric cards always show unit, period/geography, data-as-of, mode and methodology link.
- Charts include title, takeaway, axis labels, unit, source, range and accessible table.
- Avoid donut charts for precise comparisons and avoid red/green-only series.
- A sparkline never carries the only value or alert state.
- Maps have a `View as list/table` sibling and never expose exact Farmer coordinates to MP. The alternative consumes the identical released cell IDs, values, suppression union and comparison semantics as the visual.
- Tables have visible column headers, keyboard-accessible sort, fixed filter summary and responsive card alternative.

### 8.5 Forms

- Persistent visible labels; placeholder is example only.
- Explicit `I don't know` or `Not available` when allowed.
- Units are selected adjacent to values and repeated on review.
- Validation appears beside the field and in a focusable summary after submit.
- Camera/microphone/location permission is requested only when the user starts that feature.
- Multi-step Farmer forms autosave locally and show Saved on This Phone versus Synced.
- Staff high-impact forms show capability, source/version, expected revision and effect before submission.

## 9. Universal state patterns

Every data-bearing route implements these states with a title, explanation and safe action:

| State | Required presentation |
| --- | --- |
| Loading | Route skeleton matching final layout; page title remains available |
| Current | Normal content plus source/as-of |
| Stale | Existing content stays dated; caution banner and refresh/help action |
| Empty valid | Explain why no data/work exists and when it may appear |
| Unknown/missing | Never zero; show how to add, confirm or ask RSK |
| Offline cached | Persistent offline strip, cache time and restricted actions |
| Saved locally | Event-specific receipt and Sync Centre link |
| Syncing | Non-blocking progress and safe exit rule |
| Conflict | Show current server fact beside the preserved local proposal, fields that differ and only allowed resolution actions |
| Rejected | Show rejection reason, preserved local work, owning-screen correction and retry rules; do not present as a merge conflict |
| Consent missing | Explain the optional/required purpose, exact scope and non-sharing alternative |
| Consent expired | Protected content is hidden; offer a fresh scoped decision where allowed |
| Consent withdrawn | Revoke/hide protected content immediately, explain processing/access stopped and show deletion progress separately |
| Permission/access denied | No existence leakage; explain authorized recovery or safe parent destination |
| Suppressed aggregate | No number/bounds; method and safe rollup where permitted |
| Provider unavailable | Last valid content only inside policy; otherwise explicit unavailable/fallback |
| Unsupported/not found | Safe recovery; no protected entity existence leak |
| Recorded/Simulated | Persistent mode badge on evidence, result and voice response |

Do not place a full-page spinner over already usable cached data. Do not convert an error into an empty chart.

## 10. Voice overlay for all stakeholders

### 10.1 Shared layout

The overlay opens over the current route and uses a modal sheet on compact screens or a 420–520-pixel side panel on desktop. It contains:

1. assistant identity, selected language and close;
2. current authorized context such as Plot, Case or released geography;
3. privacy/audio state;
4. listening waveform with equivalent text state;
5. live transcript or typed alternative;
6. recognized intent and critical slots;
7. clarification, result or proposal card;
8. source/freshness/data mode for authoritative answers; and
9. Cancel, Correct, Confirm or Open Screen actions as allowed.

`Idle`, `Listening`, `Transcribing`, `Intent Review`, `Needs Clarification`, `Querying`, `Proposal Pending`, `Ready to Confirm`, `Executing`, `Speaking`, `Complete`, `Cancelled`, `Failed`, `Expiring`, `Reconnecting`, `Checking Existing Outcome`, `Waiting for Internet`, `Needs Confirmation` and `Unavailable` are visually and programmatically distinct. `Needs Confirmation` is mandatory after later offline transcription.

### 10.2 Mutation confirmation

The proposal screen never shows only `Are you sure?`. It repeats target, action, date, quantity/unit, sharing effect and material consequence. Confirm is disabled after expiry or a target revision change. Cancel or close before accepted confirmation states `No change was made`. Reconnect after accepted confirmation shows `Checking what happened`, retrieves the existing command receipt and never displays another Confirm. Query results include Open Details.

Controls are separately labelled Start Listening, Stop Listening, Stop Speech, Replay, Mute, Type Instead, Correct, Cancel and Close as applicable. Microphone permission denial offers typed/touch input without restarting the route. Barge-in stops playback but does not imply cancellation of an already committed command. If validated audio is delayed, visual and audible progress/retry guidance begins within one second. Partial transcripts update visually but use a throttled/non-live announcement so screen readers are not flooded.

### 10.3 Stakeholder safeguards

- Farmer: large transcript, simple correction chips, Listen replay and touch alternative.
- RSK: sensitive identity/Case speech requires a Private Environment confirmation. Prohibited high-impact actions open a complete visual review and cannot show a voice Confirm button.
- MP: filter chips are only registered dimensions. Suppressed/unavailable data never enters transcript or spoken output.
- Closing returns focus to the Speak control and preserves route scroll.

## 11. Farmer application shell

### 11.1 Persistent frame

Top bar shows active Farmer identity on shared devices, context selector, sync/connectivity and profile. Bottom navigation is exactly:

| Position | Label | Destination |
| --- | --- | --- |
| 1 | `आज / Today` | `/farmer/today` |
| 2 | `कामे / Work` | `/farmer/work` |
| 3 | `बोला / Speak` | contextual Kisan Saathi overlay |
| 4 | `सूचना / Alerts` | `/farmer/alerts` |
| 5 | `शेत / My Farm` | `/farmer/farms` |

The bar respects safe-area insets and stays visible except during full-screen camera capture. No hamburger duplicates it. A contextual sticky action bar may appear above the navigation but never cover content or the Speak item.

### 11.2 Farmer content grammar

- First screenful: current context, one primary instruction and its deadline.
- Use `What to do`, `Why`, `By when`, `Based on` and `If you cannot` labels.
- Limit default card copy to approximately three short sentences; deeper evidence opens a sheet/page.
- Pair advice, task, alert, consent and recoverable error with Listen.
- Use calendar dates and local time; relative labels such as Today also include the exact date where consequences matter.

## 12. Farmer wireframes

### 12.1 Authentication and onboarding

| Region | Content and behaviour |
| --- | --- |
| Header | Smart Fasal mark, step `n of 9`, language and Help |
| Main | One question per screen, audio prompt, large choices and Unknown where allowed |
| Context | Why the data is needed and who can see it |
| Progress | Descriptive steps, not completion pressure or gamification |
| Actions | Back, Save and Continue; Skip only for optional sensor/media fields |
| Persistence | `Saved on this phone`/`Synced`; resume point after interruption |

Language is first, Marathi selected by default with an audio preview. Device mode clearly distinguishes Personal, Family-shared and RSK-assisted. Consent screens use separate toggles/cards for location, stored audio, Case sharing, Visit access, Assisted Service, push, SMS and IVR; every channel remains independently understandable and revocable. No optional consent is pre-checked. Missing, Expired and Withdrawn variants use the distinct patterns in Section 9; withdrawal hides protected content immediately without claiming asynchronous deletion has already completed.

Farm setup offers Draw on Map, Use current location, Village and landmark, or Ask RSK. Map is never proof of ownership and has a text alternative. Sensor is explicitly optional.

### 12.2 Today

| Order | Region | Wireframe content |
| --- | --- | --- |
| 1 | Context/status | Greeting, active Farm/Plot or All Farms, date, offline/sync state |
| 2 | Voice briefing | `ऐका / Listen to today's briefing`, duration and data mode |
| 3 | Primary action | Highest-priority safe task/advisory with action, reason, deadline and one CTA |
| 4 | Priority work | Maximum three Task rows with plot, window and status |
| 5 | Farm pulse | Weather display, last trusted moisture/sensor, water and source/freshness |
| 6 | Milestone | Crop stage and next Calendar milestone |
| 7 | Context cards | Active Alert, Case reply or harvest/market card only when relevant |
| 8 | Quick actions | Report Crop Problem and Record Farm Work |

Empty Today says there is no urgent work, shows next scheduled Task and keeps quick actions. It never uses a false congratulatory score.

### 12.3 Work, Calendar and Task detail

Work has segmented views `To Do`, `Upcoming`, `Blocked` and `Completed`, plus visible Calendar and Diary links. Each Task row contains action, crop/plot, time window, source badge and state.

Task detail order:

1. action and status;
2. earliest/preferred/latest window;
3. `Why this task` and evidence summary;
4. safety/constraint notes;
5. original or changed plan link;
6. primary Done and equal-access Cannot Do;
7. Partly Done, Remind, Ask RSK and Alert Seems Wrong when eligible.

Done/Partly Done opens a structured actual-work sheet and explains that a Diary entry will be created. A planned Task never visually resembles an actual entry.

Calendar defaults to agenda/week, not a crowded month grid. Stage bands show confirmed versus estimated and any changed window. Diary uses an immutable timeline with correction/void history and a prominent Record Farm Work action.

### 12.4 Alerts

Tabs are `Now`, `Later` and `History`. A canonical Alert thread shows only the current version in Now and exposes replaced/cancelled history inside detail.

Alert detail order:

1. product priority (`Act Now`, `Do Today`, `Plan Soon`, `Update` or `Information`) and exact action;
2. validity/expiry and affected Plot;
3. source authority and data mode;
4. `Why this applies to your farm`;
5. linked Task/Advisory/Monitor/Market/Case;
6. Understood, Done, Remind, Cannot Do, Alert Seems Wrong and Ask RSK as applicable;
7. delivery history without implying provider acceptance equals heard.

Product priority, Smart Fasal risk/severity and an official source's severity/certainty are separately labelled fields and never reuse one badge. An official-warning page places unaltered official content first and a clearly separate Smart Fasal farm explanation below.

### 12.5 My Farm and Plot overview

Farm list cards show farm name/label, village, number of plots, active crop, nearest action and sync state. Plot overview shows:

- crop/stage and source;
- current action/risk;
- Recommendation or current Season;
- Live Farm Monitor;
- Crop Health;
- Calendar and Diary;
- RSK Case status; and
- Harvest and Market Watch when relevant.

Edit actions say Correct rather than silently changing past facts. Soil and water cards show value, unit, source/date and trust; Unknown is explicit.

### 12.6 Crop Recommendation readiness and results

Readiness groups inputs into `Ready`, `Needs attention` and `Optional improvements`. Hardware is never a prerequisite. Start Recommendation is disabled only for blocking inputs and explains each missing item.

`Evaluating` shows the fixed planning context, accepted input receipt and safe Leave This Screen action. `Needs Input` lists exact blocking fields and accepted capture/RSK alternatives with no candidate card. `Failed` states whether retry is safe and keeps any prior dated result clearly separate; it never converts a provider/technical failure into No Safe Result.

Result screen order:

| Region | Content |
| --- | --- |
| Result header | Planning season, Plot, as-of, Live/Recorded/Simulated and refresh |
| Summary | `Top options for this plot`; overall limitations and No Safe Result variant |
| Candidate cards | Rank, crop, Suitability, separate Confidence, three reasons, risks, water class and sowing status |
| Compare | Fixed rows for soil, water, weather, sowing, satellite and local feasibility |
| Evidence | Missing/proxy/conflict and source drawer |
| Market context | Separately dated information after agronomic ranking; no score effect |
| Actions | Compare, Listen, Ask RSK and Accept selected crop |

Suitability is a labelled bar or number. Confidence is a badge with Why; it is never another progress ring. Hard-gated crops are excluded from Farmer ranking but available in Evidence as `Not suitable now` with reasons. `NO_SAFE_RESULT` presents exclusion reasons and Ask RSK, never a hidden fourth crop.

Acceptance uses a read-back of crop, Plot, proposed versus actual start and Calendar effect. Proposed start does not visually activate stage Tasks.

### 12.7 Advisory and Live Farm Monitor

Advisory detail uses the `What / Why / When / Based on / If you cannot` structure. It shows risk, confidence, stage, water feasibility, contributing signals, conflicting/missing evidence, expiry and change from prior version. The primary action is the bounded action class, not the numeric risk score.

Live Monitor starts with trusted decision-relevant signals, not a wall of gauges. Each signal tile contains value/unit, observed time, freshness, trust, trend arrow only when valid and View Trend. Low-cost NPK is labelled Experimental/Trend Only. A single abnormal value surfaces Check Sensor/Inspect Field, not severe advice.

The no-hardware state is a complete alternative, not an upsell or dead dashboard: show current eligible Soil Health Card/lab/manual evidence, decision weather/Earth context, manual observation, Add/Update Soil and Water, Ask RSK and optional Connect Sensor. Core Recommendation, Diary, Crop Health and expert help remain available.

Signal detail includes a labelled line chart plus table, quality intervals, calibration, missing gaps and affected decisions. `No packet` is never plotted as zero.

### 12.8 Crop Health capture and result

Capture is a guided stepper:

1. confirm Plot/crop;
2. whole plant or patch;
3. close affected part;
4. reverse/context view when relevant;
5. symptoms via tap/voice;
6. onset/spread/area and recent activity;
7. review original account and upload state.

Camera guidance uses a sample outline/illustration, not a diagnostic example. Blur/darkness feedback states exactly how to retake. Offline media says Waiting for Internet; it never shows analysis complete.

Result starts `Possible issue — not a confirmed diagnosis`. It shows possible categories or Unclear/Unsupported, evidence quality, severity, spread risk, confidence/limitations, safe precautions and evidence needed. AI Triage and RSK Expert Guidance use different author badges and card styles.

When review is required, sharing review displays the exact 14–30-day purpose-limited pack and current consent. Decline remains available and explains the direct RSK route without shame.

### 12.9 Cases and expert care

Case list shows state, severity, crop/Plot, latest expert action and next Farmer step. Detail uses Timeline, Evidence Requests and Care Plan sections. Expert identity/source/version and mandatory follow-up are prominent. Worsened follow-up clearly says the same Case will reopen.

### 12.10 Harvest and Market Watch

The season Market home shows harvest readiness from confirmed farm facts separately from dated public price information. Comparison cards require compatible commodity, form, grade and unit. Each price shows source, market, reporting date, unit, quality/caveat and distance only where valid. The compatible comparison exposes its indicative net formula and every known/Unknown cost; Unknown is never treated as zero and the result is never a sale recommendation.

Reporting-day trends show the exact reported dates and gaps, never interpolated continuous prices. No Recent Data, Data Is Old, Incompatible Mapping and Source Unavailable have separate state panels.

Market Watch list/detail renders `DRAFT`, `ACTIVE`, `PAUSED`, `TRIGGERED`, `COOLDOWN`, `COMPLETED`, `EXPIRED`, `CANCELLED` and `SUPERSEDED` distinctly, with last compatible report and next evaluation. Create/update repeats crop, commodity/form/grade, market, comparison unit, threshold, active window, expiry, channel and private-data scope before confirmation. It says `Alert me if reported price meets this level`, never `Sell now` or guaranteed price.

### 12.11 Sync Centre, settings and shared phone

Sync Centre groups `Waiting`, `Syncing`, `Needs Review` and `Synced recently`, with each local event/media item, owning screen and retry/review action. A conflict shows both values, their times/sources and permitted resolution; safety facts never default to last-write-wins.

Settings separates Profile, Language, Voice, Alerts, Privacy, Data controls and Device mode. Active Farmer identity stays prominent on shared phones. Switching or ending a shared/assisted session blocks when private unsynchronized work cannot be safely recovered.

Data Export wireframe requires reauthentication, selected scope/date range, privacy consequence, estimated preparation state and delivery choice. States are `PREPARING`, `READY`, `FAILED`, `CANCELLED`, `RETRIEVED` and `EXPIRED`; retrieval is identity-bound and time-limited, and Delete Prepared Export is explicit. Deletion uses a separate consequence read-back, reauthentication and `REQUESTED`, `PROCESSING`, `BLOCKED_WITH_REASON`, `COMPLETED` or `FAILED` progress. Access revocation occurs at the owning policy point; UI never claims all asynchronous deletion is complete early.

### 12.12 Farmer offline route and processing matrix

Browser connectivity is only a hint. `Connected`, `Synced` and downstream-complete states come from their owning receipts/status APIs.

| Route family | Available offline | Separate status axes |
| --- | --- | --- |
| Today | Last cached briefing/cards with cache and evidence times | cache freshness; no new provider completion |
| Work/Calendar | Current Season and next 30 days | local Task response; command sync; Diary actual acceptance |
| Alerts | Cached unresolved canonical versions | local response; server acceptance; external delivery/RSK outcome |
| Diary/Profile | View cache and queue allowed edits/entries | structured command; optional media upload/verify/attach |
| Recommendation | View latest dated result and save new planning inputs | input saved; run waiting; evaluation; result availability |
| Crop Health | Save structured report and media | structured sync; media upload; verification; typed attachment; AI triage; Case creation/sharing |
| Cases | View cached Farmer-safe Case and queue eligible response | response sync; RSK receipt/delivery |
| Live Monitor | Last trusted reading only | device connectivity; reading freshness; agronomic trust remain separate |
| Market | Last dated compatible snapshot | source retrieval unavailable until connected; Watch command sync separate |
| Onboarding | Resume draft after initial connected identity shell | local step saved; server sync; connected-only verification |
| Voice | Play cached reviewed audio or store consented audio | audio upload; transcription; Needs Confirmation; proposal/command receipt |

Structured work is retained before optional media. A screen cannot collapse command sync, media processing, AI/RSK work or provider delivery into one progress bar.

### 12.13 Farmer route coverage

| Route group from Document 02 | Wireframe owner in this document | Mandatory special states |
| --- | --- | --- |
| `/auth`, `/onboarding/farmer/*` | 12.1 | connected identity, resumable offline draft, scoped consent |
| `/farmer/today` | 12.2 | current, quiet/empty, offline, Recorded/Simulated |
| `/farmer/work*`, Calendar, Task, Diary, Season summary | 12.3 | plan/actual, local save, conflict, changed plan |
| `/farmer/alerts*`, official warning | 12.4 | priority/source severity separation, replaced/expired/delivery lanes |
| Farms, Plot, Soil/Water, Current Season | 12.5 | Unknown, correction history, no hardware |
| Recommendation readiness/list/detail | 12.6 | Evaluating, Ready, Needs Input, No Safe Result, Failed |
| Advisory/Live Monitor/signal/device | 12.7 | no action, stale, outlier, trust, no hardware |
| Crop Health history/new/report | 12.8 | media pipeline, Unclear/Unsupported, sharing declined |
| Case list/detail/help | 12.9 | consent/access, evidence request, follow-up/reopen |
| Market comparison/trends/watches | 12.10 | incompatibility, gaps, Watch lifecycle |
| Settings/Profile/Language/Voice/Alerts/Privacy/Data/Device/Sync/Help | 12.11 | reauth, export/deletion, shared-phone identity, conflicts |

Subroutes inherit the owning wireframe anatomy plus the Universal State patterns; none may ship as an unannotated placeholder.

## 13. RSK desktop shell

### 13.1 Frame

The header shows office/jurisdiction, permission-filtered search, Start Assisted Session, Expert Voice Copilot, connectivity/provider health, assignments and user/role context. The left navigation groups Work, Operations, Agronomy, Farmer Service and Governance exactly as Document 02.

RSK lands on Work Queue. There is no unrestricted Farmer Directory. Search results remain masked until the owning purpose/access flow succeeds.

### 13.2 Desktop density

- Default content density supports 8–12 queue rows at 900-pixel viewport height.
- Table row minimum is 44 pixels; priority and SLA are scannable without opening detail.
- Filters remain visible in a collapsible bar and serialize into safe query parameters.
- Queue/detail split view appears at 1280 pixels and above; narrower screens use separate routes.
- Opening detail and returning restores queue filters, sort, page and scroll.

## 14. RSK wireframes

### 14.1 Work Queue

| Region | Content |
| --- | --- |
| Header | Work Queue, office, last refresh and My Work default |
| Views | My Work, Urgent/Overdue, Unassigned, Awaiting Farmer, Scheduled, Recently Completed; Team Workload for manager |
| Filters | Work type, village, crop/stage, status, owner, due/SLA and evidence freshness |
| Table | Priority, due/SLA, type, masked subject, village, crop/stage, reason, freshness, state and owner |
| Row action | Open; Claim where allowed; no contact reveal in table |
| Context rail | Priority explanation, selected-item safe preview and related incident |

Priority always has a Why link and never uses land size, wealth, predicted yield or political importance. A mass incident links individual exception work without flooding the default queue.

The selected-Work action rail resolves actions from capability, Work state and owning-domain state: Claim, Assign, Reassign, Start, Resume, Await Farmer, Schedule, Resolve, Reopen, Cancel and Mark Duplicate. Every mutation shows expected revision, actor/owner, target, structured reason and consequence. Resolve includes the owning-domain closure checklist and cannot mark Work resolved while the Case, Advisory, Visit, Sensor, Market or other source remains actionable.

A claim/assignment collision shows `Claimed by another user`, preserves unsent notes and offers Reload/Open Current; it never silently overwrites. Bulk resolution, protected disclosure, agronomy decision, Template approval/publication, Alert approval/publication and other high-risk operations are absent from bulk actions.

### 14.2 Case workspace

A persistent Case header shows Case ID, severity, workflow state, SLA, owner, crop/stage, village, consent, last contact and evidence freshness. Tabs are Overview, Evidence, Care Plan, Timeline and Consent & Access.

Overview places next action, Farmer account, AI Triage and current Work status above history. Evidence shows the consented pack window, source/freshness and transcript before optional audio. Care Plan requires current approved content/source and separates routine draft from expert issuance. Resolve is unavailable until required follow-up passes and High/Critical authority is present.

Protected disclosure uses a blocking purpose/access state before content loads. Withdrawn consent removes protected content immediately while keeping the safe Case shell.

### 14.3 Advisory review

The review screen has three columns on wide screens:

1. frozen context: crop/stage/water, action window, consent and freshness;
2. evidence comparison: weather/rain/sensor/Diary/Earth, disagreement and old versus proposed action;
3. decision form: allowed revisions, source/version, reason, expiry and publication state.

Risk, confidence, severity and action feasibility remain separate. Approval explicitly says `Ready for publication`, not `Sent`. Publication failure keeps the Work item actionable. An expired action window replaces controls with Expired and Re-evaluate.

### 14.4 Calendar review and Template Library

Calendar review shows confirmed/disputed stage evidence and provenance, the current Template Snapshot, current/proposed Task windows, reason, downstream effects and Farmer confirmation needs. A locked Farmer Actuals lane contains immutable Diary work and cannot be edited as plan data. Controls are Request Evidence, Await Farmer Confirmation, Approve Change, No Change, Reject and Expire.

Decision and application are separate. Application displays `NOT_READY`, `APPLYING`, `APPLIED` or `FAILED`; retry uses the same idempotent application only after evidence, revisions and consent revalidate. One-season overrides are labelled `This Season Only` and remain separate from master-template changes.

Template detail shows status, effective/expiry, crop/geography, source set, DAG validation, diff, creator, reviewer and activation attempt. Draft, Review, Changes Requested, Approved, Effective, Expired, Retired and Rolled Back are distinct; `Effective` means publication/activation succeeded, while Approved alone cannot start a Season. Creator separation and missing capability are explained at disabled actions. Rollback preview covers future eligible Seasons and never implies existing Season history was rewritten.

### 14.5 Alert operations

Outreach list/detail preserves the canonical Alert as read-only. The officer sees exact current content, language, expiry, contact-consent state and allowed outcomes: Heard, Understood, Already Done, Cannot Do, Disputes Advice, Needs Explanation, Wrong Recipient and No Answer. Cannot Do records an allowlisted constraint and alternative/follow-up Work; Wrong Recipient immediately stops disclosure and creates contact-correction work; No Answer follows bounded retry and can never appear as Heard.

Delivery Health separates provider incident from recipient exception and renders five lanes: Delivery Plan disposition; Provider Attempt; Recipient milestone; Farmer response; and linked Task/service outcome. Provider states such as Queued, Sent, Accepted, Delivered, Failed, Unknown and Expired never merge with Reached, Opened/Heard or Acknowledged. There is no UI action to promote Delivered, Reached, Heard or Acknowledged. Retry creates a new attempt ID linked to a prior eligible terminal/Unknown attempt after consent, expiry, language, channel and retry-policy recheck.

Alert draft detail has a locked Official Source pane containing exact warning text, source severity/certainty, effective/expiry and source version, plus a separately labelled editable Smart Fasal Explanation pane. It shows source validity, audience preview, language versions, product priority, deduplication, creator/reviewer/publisher stages and dry-run cohort. Canonical history is read-only. `Act Now` publication requires separate approval; approved is not published.

### 14.6 Sensor operations

Issue list prioritizes active-advice impact. Device detail contains identity/assignment, trust timeline and separately labelled Raw, Normalized and Decision-Eligible readings, calibration versions, anomalies, dependent decisions and maintenance history. Raw values are immutable.

Technician action is Mark Suspect, not agronomic invalidation. Expert invalidation requires exact interval, reason, affected-decision preview and confirmation. Dependency-impact progress lists recalculated, corrected, cancelled, no-current-effect or deleted-lineage items.

Installation uses a guided lifecycle: Installed, Telemetry Received, Quality/Calibration Checks, then Eligible for Advice or Ineligible/Needs Work. `Connected` and `Eligible for Advice` are separate success states. Secret credentials are never redisplayed.

Issue and Maintenance Work Order timelines expose assignment, diagnosis, intervention, `AWAITING_SYNC`, validation period, Complete, Closed and Return to Service. Local/offline completion remains Awaiting Sync. Pack expiry, revision conflict and locked recovery are explicit. Return to Service is unavailable before validation and current assignment/credential checks. Exact maintenance location requires assigned technician, active time window, purpose and audit-before-disclose. Technician Mark Suspect and Agronomy Expert Invalidate remain separate controls.

### 14.7 Market support

Support detail keeps Farmer-private quantity, cost, target and sale fields masked until the field-level access grant. Public price evidence remains separately sourced. Mapping review preserves immutable raw source term, reported value/unit and source version beside proposed commodity/variety/grade/form/unit, deterministic conversion version, caveat and affected comparison/Watch counts. Structured decisions are Exact, With Caveat, More Evidence, Incompatible/Reject and Supersede. Official source price remains read-only.

Creator and independent high-impact approver states are visible. Publication starts a reprocessing operation with progress, failure and safe retry; earlier derived versions remain inspectable. Rollback selects a prior approved mapping, shows impact and starts a new governed reprocessing operation without rewriting history.

RSK can explain or map; controls never say Endorse Buyer, Execute Sale or Guarantee Price.

### 14.8 Field visits

Today and Calendar show assigned purpose, time window, village, status and offline-pack readiness. Detail renders `REQUESTED -> APPROVED -> SCHEDULED -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> AWAITING_SYNC -> COMPLETED -> OUTCOME_REVIEWED -> CLOSED`, plus Cancelled and Reschedule Required.

The pack manifest shows purpose, assignee, bound device, server-time anchor, access/consent version and hard expiry. Exact contact/location is disclosed only after accepted assignment and audit-before-disclose. Reassignment, cancellation or consent withdrawal visibly revokes and locks the old pack. Visit execution separates structured observations, media upload/attachment, Farmer response and read-back. A local save can reach only Awaiting Sync; Completed requires server acceptance. Closure requires accepted outcome, required review, Farmer receipt and client purge eligibility/attestation, with conflict and locked-recovery states where necessary.

### 14.9 Assisted Farmer Session

The shell changes visibly to `Assisting this farmer`, shows officer, Farmer, purpose, consent, expiry and sync. Normal navigation is replaced with allowed session tasks and End Session. Every mutation uses Farmer-facing read-back and records both actors.

Ending has a reconciliation screen: Synced, Rejected/Needs Correction, or Locked Recovery. A second Farmer cannot open until private local work is synchronized or safely locked and client data is purged.

### 14.10 Audit

Audit is absent unless capability exists. Default view contains safe metadata filters and never protected payload. Sensitive investigation requires purpose, step-up authentication and a separate audit fact before disclosure.

## 15. MP Office desktop shell

### 15.1 Product boundary

The MP product contains released intelligence for the approved Raigad pilot geography only. It must not call that boundary identical to a parliamentary constituency until verified constituency-boundary data and mappings exist; this pilot limitation is visible in the header/methodology. It has no Farmer, Farm, Case, device, media, exact-coordinate or operational RSK route. Empty/suppressed cells cannot be recovered by voice, export or repeated filters.

The header shows office, approved geography, period, season, crop, comparison pair, active-filter summary, exactly one data mode, optional allowlisted provenance, `Data as of`, environment, data-health, voice, export/briefing status and user context. Left navigation follows Overview, Map, Risks, Service Delivery, Alert Reach, Resources, Harvest & Markets, Briefings, Methodology/Data Quality.

### 15.2 Filter bar

Filters are registered geography, period, crop/stage, risk/service/channel, `dataMode`, allowlisted provenance and representation. Applied filters appear as removable chips and in a plain-language scope sentence. Card/Table/Map representation is not a data mode. Changing representation does not change privacy outcome.

### 15.3 MP route map

| Destination | Exact route |
| --- | --- |
| Overview | `/mp/overview` |
| Pilot Area Map | `/mp/map` |
| Risk board/detail | `/mp/risks`, `/mp/risks/:riskType` |
| Service Delivery | `/mp/service-delivery` |
| Alerts and Reach | `/mp/alerts-reach` |
| Resources and Constraints | `/mp/resources` |
| Harvest and Markets | `/mp/harvest-markets` |
| Briefing library/today/new/draft/saved | `/mp/briefings`, `/mp/briefings/today`, `/mp/briefings/drafts/new`, `/mp/briefings/drafts/:briefingId`, `/mp/briefings/saved/:briefingId` |
| Data Quality | `/mp/data-quality` |
| Methodology | `/mp/methodology` |

## 16. MP wireframes

### 16.1 Overview

| Region | Content |
| --- | --- |
| Scope header | Geography, period, mode, release ID/as-of and quality |
| Morning brief | Up to three released priorities with source/method |
| KPI row | Released crop coverage, risk, advisory/service and alert-reach metrics as approved |
| Risk view | Ranked released aggregate risks with trend/delta only when comparable |
| Map/table | Coarse released cells with immediate list/table alternative |
| Service/resource view | Demand/capacity or constraints from approved aggregate definitions |
| Harvest/market | Dated public market facts and released harvest aggregate where approved |

Each card has value/unit, denominator/coverage band where releasable, mode, as-of and methodology. No fake zero replaces suppression.

### 16.2 Map and drill-down

The map uses area shading only for the approved pilot, taluka/block and village/approved-cluster hierarchy. No component or payload contains a Farmer point, Farm polygon or device marker. The legend names metric, unit, period and suppression treatment. Tooltips contain only released scope, safe sample/coverage, freshness, confidence and mode.

Selecting a coarse region opens an Aggregate Drawer with geography/scope, period, data-as-of, released value or safe state, safe sample/coverage, comparison, confidence, mode, source, quality, limitations, methodology and links to related aggregate modules. The drawer never offers a Farmer list. Zooming changes map view only; it cannot request an unapproved geography.

Suppressed cells show a neutral pattern and `Insufficient aggregate data`; hover/tooltips reveal no hidden number or bounds. The table alternative is rendered from the same released cell IDs, values, suppression result and comparison semantics as the map, not a separate calculation.

### 16.3 Risks, service delivery, alert reach and resources

Each product page begins with a decision question and one recommended interpretation, not a generic chart gallery. Comparisons show both independently released scopes and compatibility.

- Risk detail shows definition, severity, direction, aggregate geography, crop stages, source agreement, service response, Alert reach, limitations and evidence.
- Service Delivery shows demand, first response, follow-up, resolution, ageing backlog, severe-Case response, Visits, sensor maintenance, outreach and coverage. Comparisons are area/team only, never a named officer.
- Alerts and Reach separates official-warning and Smart Fasal classes and renders the approved aggregate funnel from eligible through Reached, Opened/Heard, Acknowledged and Response, plus channel, language, connectivity, expiry, correction and cancellation trends. Every stage has its own approved denominator; provider acceptance is not Farmer reach.
- Resources separates reported constraint from unresolved service need across water, drainage, inputs, labour, device/mobile connectivity, RSK access, transport, drying, grading, packing, storage and market-data availability. It never supports individual beneficiary targeting.

### 16.4 Harvest and markets

Public mandi facts are visually separated from Farmer-derived aggregate harvest readiness. Price cards show commodity, form, grade, unit, market, reporting date and caveat. No control recommends a sale, buyer or guaranteed price.

### 16.5 Briefings

Today briefing shows current released statements and a Listen action. Briefing states are `DRAFT`, `GENERATING`, `READY`, `GENERATION_FAILED` and immutable `SAVED`. Generation failure offers safe retry or reviewed deterministic fallback without silently changing inputs. Draft generation first displays included metrics/scopes and excluded/suppressed items. Generated paragraphs retain fact chips linking to released result and methodology.

Save, view, voice and export revalidate every underlying release. An invalidated briefing shows a consistent redacted replacement or refusal; list title/snippet must not leak earlier values. Saved content remains immutable—replacement is a distinct rendered safety response, never silent mutation. Export status has no public URL and retrieval is identity-bound.

### 16.6 MP voice

The side panel repeats registered filters and shows every tool-applied filter as a chip. Every result card displays geography, period, as-of, safe sample/coverage, suppression state, confidence, mode, sources and Open Equivalent Dashboard. Comparisons are limited to two compatible released scopes. A suppressed result responds with the same suppression text and optional safe rollup. Draft briefing is a proposal; voice cannot send Alerts or operate RSK work.

### 16.7 Data Quality and Methodology

`/mp/data-quality` shows a source/freshness/coverage matrix, aggregate provider/sensor health, mode, refresh expectation and current limitations without device identity or single-device failure. Every row links to affected released products.

`/mp/methodology` shows each metric's definition, numerator, denominator, cohort basis, sources, refresh schedule, suppression/complementary-suppression treatment, confidence/quality interpretation and limitations. `Why This Metric` drawers link to this exact registered definition.

## 17. Localization and content design

### 17.1 Language rules

- Marathi is the default Farmer language in Raigad.
- Hindi and English are complete on every critical path, not partial machine-translated shells.
- Runtime explanations use validated dynamic values plus reviewed terminology/glossary.
- Never truncate a crop, warning, action, unit or consent label to fit a card; reflow instead.
- Support Devanagari line breaking and numerals consistently; do not mix digit systems inside one value without a language rule.
- Dates, times and units are localized but remain deterministic for voice read-back.

### 17.2 Farmer vocabulary

Prefer familiar actions: `आज काय करायचे`, `का`, `केव्हा`, `मी करू शकत नाही`, `RSK ला विचारा`, `माझ्या फोनवर जतन झाले`. Avoid internal terms such as event, projection, inference, confidence calibration or orchestration on the primary Farmer view.

Technical details remain available under Why/Evidence using plain-language definitions.

### 17.3 Error content

Every error answers:

1. what happened;
2. whether work/data is safe;
3. what the user can do now; and
4. when/where to get help.

Do not blame the Farmer, say `invalid user`, or expose raw provider/HTTP codes as the headline.

## 18. Accessibility specification

### 18.1 Target

The three applications target WCAG 2.2 AA. Automated checks are necessary but not sufficient; critical Farmer, RSK keyboard and MP chart flows require manual assistive-technology review.

### 18.2 Requirements

- Semantic headings and landmarks; one `h1` per route.
- Skip to main content in desktop shells.
- Full keyboard path, logical focus order and visible focus.
- Dialog/sheet focus trap, labelled close and focus restoration.
- Route title, context changes, sync result and critical update announced without excessive live-region noise.
- Persistent labels, helpful autocomplete and grouped field instructions.
- 200% text zoom and 400% reflow for critical flows.
- 48-pixel preferred Farmer targets; never below 44.
- No color, icon, audio, hover, drag, swipe, pinch, long press or timing alone.
- Captions/transcript for audio and Listen alternative for critical Farmer text.
- Camera capture supports upload and assisted alternatives.
- Maps/charts have equivalent table/list and textual takeaway.
- Data table headers/sort states are programmatic; responsive cards preserve labels.
- Timeouts warn and allow extension where security permits.
- Authentication supports password-manager/OTP accessibility and no cognitive puzzle.
- Errors are linked to fields and summarized in focus order.
- Reduced motion and forced-colors modes remain usable.

### 18.3 Screen-reader wording

Do not announce a visual badge as only `green`. Examples:

- `Confidence: Low. Two important inputs are missing.`
- `Data mode: Recorded. Observation from 12 July, 10:30 AM.`
- `Aggregate suppressed because the group is too small.`
- `Task saved on this phone. Not yet synchronized with RSK.`

### 18.4 Accessibility merge gates

Primary routes must pass automated axe-core checks with zero Serious or Critical findings, keyboard-only smoke tests, one supported screen-reader/browser journey per stakeholder surface, manual 200% zoom/reflow review and Lighthouse CI accessibility/performance budgets. Manual testing remains required for Marathi/Hindi expansion, status announcements, maps/charts, dialogs and voice.

## 19. Privacy and safety presentation

- Farmer consent uses separate scoped choices and a short access-history link.
- RSK protected fields remain skeleton-free and absent until access succeeds; the UI must not briefly flash content.
- Contact reveal states purpose and creates an audit fact before showing the value.
- MP never receives a hidden number in DOM, accessibility tree, chart dataset, tooltip, export or model context.
- Lock-screen notifications contain no diagnosis, chemical detail, price target or exact Farm information.
- Raw audio storage state and deletion expectation appear before offline recording.
- Generated versus deterministic versus expert content has explicit authorship.
- Chemical/product/dose fields use a current source/expert badge and never a generic AI sparkle.

## 20. UI performance and resilience

- Farmer entry route targets the architecture budget of at most 250 KB compressed executed JavaScript.
- Map, chart, camera, media viewer and voice load on demand.
- Locally bundle critical fonts/icons and subset launch scripts where licence permits.
- Images use responsive derivatives; health evidence quality is not silently reduced.
- Virtualize long office lists only while preserving keyboard, screen-reader and print/export behaviour.
- Cache only the classes allowed by Document 05; protected HTML, auth and personal responses are network-only.
- A provider SDK does not block the base shell. Weather, map, voice and chart failure each degrade independently.

## 21. Implementation component map

| Shared package area | Components |
| --- | --- |
| `tokens` | color, typography, spacing, radius, elevation, motion and breakpoints |
| `primitives` | Button, IconButton, Link, Input, Select, Checkbox, Radio, Dialog, Sheet, Popover, Tabs and Toast built with React Aria Components |
| `patterns` | PageHeader, ContextPicker, StatusStrip, StatePanel, EvidenceDrawer, ReadBackCard, PermissionGate and SyncReceipt |
| `decision` | SuitabilityMeter, ConfidenceBadge, SeverityBanner, TrustBadge, DataModeBadge, SourceRow and ChangeComparison |
| `farmer` | BottomNav, ActionCard, ListenButton, TaskResponseSheet, CameraGuide and OfflineOutboxCard |
| `office` | SideNav, WorkTable, FilterBar, SplitWorkspace, ProtectedDisclosure and AuditMetadata |
| `analytics` | MetricCard, ReleasedResult, SuppressedCell, AccessibleChart, MapTableToggle and MethodologyDrawer |
| `voice` | VoiceLauncher, VoicePanel, Transcript, IntentReview, ProposalReadBack and CommandReceipt |

Feature modules compose these components; they do not fork their own Button, badge vocabulary, sync state, voice confirmation or evidence presentation.

## 22. Design QA and acceptance

### 22.1 Required review widths

- Farmer: 320, 360, 390, 430, 768 and 1024 CSS pixels.
- RSK: 768 urgent/mobile subset, 1024, 1280, 1440 and 1920.
- MP: 390 briefing subset, 1024, 1280, 1440 and 1920.
- Each critical flow also passes 200% zoom, long Marathi strings, slow/offline state and keyboard-only input.

### 22.2 Visual regression set

Capture at minimum:

- Farmer Today current/offline/Recorded;
- Task Done/Cannot Do/sync conflict;
- Recommendation Ready/Low Confidence/No Safe Result;
- Advisory material change and expired;
- Live Monitor trusted/outlier/no recent data;
- Crop Health poor image/triage/escalation declined;
- voice clarification/proposal/reconnect/unavailable;
- RSK Queue/Case/Advisory review/publication failure/Assisted Session;
- MP released/suppressed/stale/invalidated briefing; and
- all three shells at 200% zoom and forced colors.

### 22.3 Clickable end-to-end design journeys

The design handoff includes connected, offline/failure and Marathi long-string variants for:

1. Farmer setup → Recommendation → acceptance → proposed/active Season → Calendar;
2. evidence change → Advisory → Task → actual Diary entry;
3. Crop Health capture → media quality → sharing → Case → expert follow-up;
4. offline Diary/Crop Health capture → multi-axis sync → rejection or typed conflict recovery;
5. sensor current → outlier/stale/trust failure → Inspect/Report Sensor Problem;
6. canonical Alert → exact version response → outreach/follow-up;
7. harvest readiness → compatible Market comparison → Market Watch confirmation;
8. voice query → source result → proposal → Confirm/Cancel → reconnect receipt;
9. RSK Work claim → protected Case/Advisory action → Farmer-visible outcome; and
10. MP released/suppressed query → Briefing draft → saved view/export revalidation.

Farmer journeys are verified with touch, keyboard/screen-reader, no voice, no hardware and denied GPS/microphone variants where applicable. A journey fails handoff if an action lacks an owning route, state, receipt or recovery.

### 22.4 Acceptance criteria

- **UI-AC01:** Farmer primary navigation has exactly five labelled destinations and Speak preserves context.
- **UI-AC02:** Every critical Farmer action is reachable through touch and without voice.
- **UI-AC03:** Suitability, confidence, severity, trust, freshness and data mode use distinct labelled components.
- **UI-AC04:** Every data-bearing screen renders loading, current, stale, empty, missing, offline, permission, failure and unsupported states as applicable.
- **UI-AC05:** Saved on This Phone and Synced cannot be confused visually or programmatically.
- **UI-AC06:** A Task response makes Cannot Do as reachable as Done.
- **UI-AC07:** Crop Health always says possible/unclear and separates AI Triage from RSK Expert Guidance.
- **UI-AC08:** A voice mutation displays full contextual read-back and explicit confirmation; prohibited RSK actions stop at visual review.
- **UI-AC09:** RSK defaults to the Work Queue and exposes no unrestricted Farmer directory.
- **UI-AC10:** RSK protected information never flashes before purpose/access authorization.
- **UI-AC11:** MP has no individual Farmer/Farm/Case/device/media navigation or hidden aggregate in UI payloads.
- **UI-AC12:** Released, Suppressed, Safe Rollup, Stale and Unavailable MP results remain distinct across cards, charts, maps, voice and exports.
- **UI-AC13:** Every essential chart and map has an equivalent accessible table/list.
- **UI-AC14:** Critical flows pass WCAG 2.2 AA, keyboard, screen-reader, 200% zoom, reduced motion and forced-colors checks.
- **UI-AC15:** Marathi critical-path content is human-reviewed and fits without truncating actions, units or warnings.
- **UI-AC16:** Farmer route performance, lazy-loading and independent provider fallbacks meet Document 05 budgets.
- **UI-AC17:** Recorded and Simulated demonstration states remain visible on evidence, derived result and voice answer.
- **UI-AC18:** No placeholder control, decorative metric or dead action ships in any stakeholder surface.

## 23. Follow-on contract

The security, privacy, testing and quality specification must turn the protected-disclosure, suppressed-data, voice-confirmation, offline-storage, media, accessibility and zero-tolerance UI rules into automated and manual gates.

The implementation sequence must build the shared tokens/primitives and state patterns before feature screens, then validate the complete Farmer core journey, RSK service loop and MP release/briefing journey at the target breakpoints.
