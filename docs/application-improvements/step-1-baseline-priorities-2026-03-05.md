# Step 1 Execution: Baseline and Priorities

Date: 2026-03-05

## Objective

Close Week 1 planning items by turning quality checks and architecture/UI guardrails into one repeatable baseline report, then lock priority user flows for optimization.

## Implemented Artifacts

- Weekly report generator: `scripts/quality/generate-weekly-report.mjs`
- NPM scripts:
  - `npm run quality:weekly-report`
  - `npm run quality:weekly-report:strict`
- Scheduled workflow: `.github/workflows/weekly-quality-report.yml`
- Output artifacts:
  - `docs/metrics/weekly-quality-latest.json`
  - `docs/metrics/weekly-quality-latest.md`
  - `docs/metrics/weekly-quality-<timestamp>.json`
  - `docs/metrics/weekly-quality-<timestamp>.md`

## Baseline Coverage in the Weekly Report

- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e` (enabled with `--include-e2e`)
- Architecture guardrails: `node scripts/architecture/check-guardrails.mjs`
- UI consolidation guardrail: `node scripts/architecture/check-ui-consolidation.mjs`
- Observability quality gate: `npm run observability:check`
- Architecture/performance snapshot via `collectMetrics` + prop-drilling/UI scan summaries

## Top 5 Business-Critical Flows (Priority Order)

| Priority | Flow | KPI | Target | Scope |
| ---: | --- | --- | --- | --- |
| 1 | Authentication + Session Bootstrap | Successful sign-in completion rate | >= 99.5% | `src/features/auth` + app entry routes |
| 2 | Products CRUD + Listing Refresh | Create/edit success rate without retries | >= 99.0% | `src/features/products` + products API routes |
| 3 | Image Studio Generate + Preview | Generation completion under timeout budget | >= 98.0% | `src/features/ai/image-studio` + runtime APIs |
| 4 | AI Paths Run Execution | Run completion without fallback/error path | >= 98.5% | `src/features/ai/ai-paths` + shared runtime |
| 5 | Case Resolver OCR + Capture Mapping | Queue-to-review completion without manual recovery | >= 98.0% | `src/features/case-resolver` + capture APIs |

## Usage

Local baseline run:

```bash
npm run quality:weekly-report
```

Full baseline including E2E:

```bash
npm run quality:weekly-report -- --include-e2e
```

CI strict mode (non-zero exit on failures/timeouts):

```bash
npm run quality:weekly-report:strict -- --ci
```
