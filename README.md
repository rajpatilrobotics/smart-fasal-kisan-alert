# Smart Fasal Kisan Alert

Smart Fasal is a multilingual, voice-first agricultural decision-support platform for farmers, Rythu Seva Kendram staff, and an MP office. The approved product covers crop recommendations, sensor- and weather-aware advisories, crop-health case routing, market watch, calendars, alerts, and privacy-safe regional decision intelligence.

## Current status

This rebuild branch contains **Milestone 0: the production foundation**. It deliberately shows truthful foundation states rather than fake recommendations, alerts, sensor readings, or dashboard metrics. Feature implementation starts in Milestone 1 using the approved specifications in [`docs/`](docs/).

The original static hackathon submission remains preserved on the `legacy-static-submission` branch and local annotated tag. The existing Vercel/Firebase configuration and deployed prototype remain unchanged until the rebuilt Farmer application passes its deployment smoke test.

## Independent products

| Product | Package | Default port | Foundation orientation |
| --- | --- | ---: | --- |
| Farmer | `@smart-fasal/farmer-web` | 3000 | Marathi-first, mobile-first and low-connectivity aware |
| Rythu Seva Kendram | `@smart-fasal/rsk-web` | 3001 | Desktop operations workspace |
| MP Office | `@smart-fasal/mp-web` | 3002 | Desktop, aggregate-only decision-intelligence boundary |

Each is a physically separate Next.js build with its own manifest, security headers, health endpoints, tests, and responsive shell.

## Service foundations

| Service | Default port | Milestone 0 responsibility |
| --- | ---: | --- |
| Domain API | 8080 | Transactional API process and health contract |
| Domain Worker | 8081 | Background lifecycle and readiness |
| Device Ingest | 8082 | Hardware-ingest process boundary |
| Provider Callback Ingest | 8083 | External callback boundary |
| MP Query API | 8084 | Physically separate aggregate-query boundary |
| Privacy Pipeline | 8085 | Release-pipeline lifecycle boundary |
| Media Scanner | 8086 | Quarantine/scanning lifecycle boundary |
| Voice Gateway | 8087 | Stakeholder voice transport boundary |
| Intelligence Service | 8088 | FastAPI scientific/AI service boundary |

Node services expose `GET /health/live` and `GET /health/ready`. Web applications expose the same contract under `/api/health/live` and `/api/health/ready`.

## Toolchain

- Node.js 24.14.0, pnpm 11.12.0 and Turborepo 2.10.4
- Next.js 16, React 19 and strict TypeScript 6
- Fastify 5 for Node service boundaries
- Python 3.12, FastAPI and Pydantic for the intelligence service
- PostgreSQL 17 with PostGIS and reviewed SQL migrations through the database package
- Vitest, Testing Library, Pytest, Playwright and axe-core
- Terraform environment skeletons, GitHub Actions, CodeQL, dependency review, Gitleaks and SonarCloud

All JavaScript and Python dependency versions are exact and committed in reproducible lock files. pnpm native build scripts are denied unless explicitly allowlisted in `pnpm-workspace.yaml`.

## Clean local setup

Prerequisites: Node 24.14.0, Corepack, Python 3.12, uv 0.11.28, and Docker-compatible Compose.
On Apple Silicon, the pinned PostGIS image runs through Docker's `linux/amd64` emulation.

```bash
corepack enable
corepack prepare pnpm@11.12.0 --activate
pnpm install --frozen-lockfile

uv sync --locked --extra dev --no-install-project --project apps/intelligence-service
. apps/intelligence-service/.venv/bin/activate

cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed:synthetic
```

The local database binds only to `127.0.0.1`. The example environment contains development-only values and no cloud credentials or personal data.

## Run the platform

Run the complete foundation:

```bash
pnpm dev
```

Run one product or service:

```bash
pnpm --filter @smart-fasal/farmer-web dev
pnpm --filter @smart-fasal/domain-api dev
```

## Quality and verification

```bash
pnpm quality
pnpm test:unit
pnpm test:integration

pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:a11y
```

`pnpm quality` enforces formatting, architecture boundaries and cycles, lint, strict TypeScript/Python types, deterministic generated contracts, unit/integration tests, and production builds. SonarCloud and heavier security/browser checks run in pull-request CI rather than slowing each edit.

Useful focused commands include:

```bash
pnpm contracts:generate
pnpm contracts:check
pnpm architecture:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

## Repository guide

- [`AGENTS.md`](AGENTS.md) — execution gateway and non-negotiable safety rules
- [`docs/01_PRD.md`](docs/01_PRD.md) — approved product requirements
- [`docs/02_INFORMATION_ARCHITECTURE.md`](docs/02_INFORMATION_ARCHITECTURE.md) — screen map and navigation
- [`docs/03_END_TO_END_FLOWS.md`](docs/03_END_TO_END_FLOWS.md) — cross-stakeholder journeys
- [`docs/04_FEATURE_SPECIFICATIONS.md`](docs/04_FEATURE_SPECIFICATIONS.md) — locked feature behavior
- [`docs/05_TECHNICAL_ARCHITECTURE.md`](docs/05_TECHNICAL_ARCHITECTURE.md) — system architecture and boundaries
- [`docs/06_DATA_MODEL_AND_EVENT_CATALOG.md`](docs/06_DATA_MODEL_AND_EVENT_CATALOG.md) — canonical data and events
- [`docs/07_API_AND_INTEGRATION_SPECIFICATION.md`](docs/07_API_AND_INTEGRATION_SPECIFICATION.md) — API and provider contracts
- [`docs/08_AI_ML_AND_AGRONOMY_SPECIFICATION.md`](docs/08_AI_ML_AND_AGRONOMY_SPECIFICATION.md) — agronomy, AI and ML safety
- [`docs/09_UI_DESIGN_SYSTEM_AND_WIREFRAMES.md`](docs/09_UI_DESIGN_SYSTEM_AND_WIREFRAMES.md) — UI system and wireframes
- [`docs/10_SECURITY_PRIVACY_TESTING_AND_QUALITY_SPECIFICATION.md`](docs/10_SECURITY_PRIVACY_TESTING_AND_QUALITY_SPECIFICATION.md) — security and release gates
- [`docs/11_IMPLEMENTATION_SEQUENCE_AND_DEMO_JOURNEY.md`](docs/11_IMPLEMENTATION_SEQUENCE_AND_DEMO_JOURNEY.md) — milestone order and demo plan

Implementation must follow the milestone sequence and truthfulness rules in those documents. Credit scoring, insurance adjudication, Web3, individual-farmer MP data, and unvalidated automated agronomic decisions are outside the approved scope.
