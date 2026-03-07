# Application Performance Operations

Last reviewed: 2026-03-07

## Purpose

Use this runbook to execute the app-level performance operations workflow for this repository.
It covers the fast regression gate, the local baseline pass, the weekly trend run, and live
incident telemetry surfaces already wired into the app.

## Prerequisites

- Use Node 22 from [.nvmrc](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/.nvmrc).
- Ensure `.env` is populated for the local stack.
- Keep OpenTelemetry enabled when validating live telemetry:
  - `OTEL_ENABLED=true`
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- Start from a clean enough workspace that baseline failures can be attributed confidently.

## Primary Commands

- Fast gate:
  - `npm run perf:ops:fast`
  - Runs `observability:check`, strict critical-path budgets, and critical-flow regressions.
- Baseline pass:
  - `npm run perf:ops:baseline`
  - Runs architecture metrics, route hotspots, observability, critical-path budgets, critical flows, and unit domain timings.
- Weekly trend run:
  - `npm run perf:ops:weekly`
  - This matches the scheduled weekly workflow and writes trend artifacts under `docs/metrics`.
- Feature baseline:
  - `npm run metrics:kangur:baseline:strict`

## Artifacts

Successful runs update these files:

- `docs/metrics/baseline-latest.json`
- `docs/metrics/baseline-latest.md`
- `docs/metrics/route-hotspots.md`
- `docs/metrics/critical-path-performance-latest.json`
- `docs/metrics/critical-path-performance-latest.md`
- `docs/metrics/critical-flow-tests-latest.json`
- `docs/metrics/critical-flow-tests-latest.md`
- `docs/metrics/unit-domain-timings-latest.json`
- `docs/metrics/unit-domain-timings-latest.md`
- `docs/metrics/weekly-quality-latest.json`
- `docs/metrics/weekly-quality-latest.md`

## Live Telemetry Surfaces

- System log metrics API:
  - `GET /api/system/logs/metrics`
- AI operations overview API:
  - `GET /api/brain/operations/overview?range=15m|1h|6h|24h`
- Node OpenTelemetry bootstrap:
  - `src/instrumentation.ts`
  - `src/shared/lib/observability/otel-node.ts`

## Default Alert Thresholds

From `src/shared/lib/observability/workers/system-log-alerts/config.ts`:

- Slow request threshold: `750ms`
- Slow request minimum count: `20`
- Slow request window: `300s`
- Error alert minimum count: `20`
- Alert repeat window: `60000ms`
- Alert cooldown: `600s`

Feature-specific runbooks can define stricter SLOs. Example:

- Case Resolver save latency: warning at `p95 >= 700ms`, critical at `p95 >= 1200ms`
- Case list interaction: warning at `p95 >= 100ms`, critical at `p95 >= 180ms`

## Operating Cadence

1. On every PR, run `npm run perf:ops:fast`.
2. On staging or before release, run `npm run perf:ops:baseline`.
3. Weekly, rely on `.github/workflows/weekly-quality-report.yml` and review the generated trend artifacts.
4. During incidents, inspect `/api/system/logs/metrics`, `/api/brain/operations/overview`, OTEL traces/logs, and the latest `docs/metrics` artifacts together.

## Current Gaps

- No dedicated load-test harness is wired into this repo yet for sustained throughput or concurrency testing.
- As of 2026-03-07, a local `npm run build` still fails on a TypeScript prop mismatch in `src/features/cms/components/frontend/blocks/KangurWidgetBlock.tsx`.
