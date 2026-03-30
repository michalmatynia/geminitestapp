---
owner: 'Platform Operations'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'runbook'
scope: 'cross-feature'
canonical: true
---

# Application Performance Operations

## Purpose

Use this runbook to execute the app-level performance operations workflow for
this repository. It covers the fast regression gate, the local baseline pass,
the weekly trend run, and live incident telemetry surfaces already wired into
the app.

For the stable generated artifact hub, use
[`docs/metrics/README.md`](../metrics/README.md). This runbook focuses on how
to run and interpret the operational lanes, not on indexing every generated
history file.

## Prerequisites

- Use the repo-pinned Node LTS version from `.nvmrc`.
- Ensure `.env` is populated for the local stack.
- Keep OpenTelemetry enabled when validating live telemetry:
  - `OTEL_ENABLED=true`
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- Start from a clean enough workspace that baseline failures can be attributed
  confidently.

## Primary Commands

- Fast gate:
  - `npm run perf:ops:fast`
  - Runs `observability:check`, strict critical-path budgets, and critical-flow
    regressions.
- Baseline pass:
  - `npm run perf:ops:baseline`
  - Runs architecture metrics, route hotspots, observability,
    critical-path budgets, critical flows, and unit domain timings.
- Machine-readable critical-path snapshot:
  - `node scripts/perf/check-critical-path-performance.mjs --summary-json --no-write --no-history`
  - Emits the shared scan envelope without writing `docs/metrics/*`.
- Machine-readable route hotspot snapshot:
  - `node scripts/perf/route-hotspots.mjs --summary-json --no-write --no-history`
  - Emits the shared scan envelope without writing `docs/metrics/route-hotspots.md`.
- Machine-readable unit-domain timing snapshot:
  - `node scripts/testing/run-unit-domain-timings.mjs --summary-json --no-write --no-history`
  - Emits the shared scan envelope without writing `docs/metrics/unit-domain-timings-*`.
- Machine-readable critical-flow snapshot:
  - `node scripts/testing/run-critical-flow-tests.mjs --summary-json --no-write --no-history`
  - Emits the shared scan envelope without writing `docs/metrics/critical-flow-tests-*`.
- Weekly trend run:
  - `npm run perf:ops:weekly`
  - Matches the scheduled weekly workflow and writes trend artifacts under
    `docs/metrics`.
  - The weekly lane trend now carries a compact `latestKangurAiTutorBridgeSummaryText`
    signal when Kangur weekly artifacts include the AI Tutor bridge snapshot, and
    the trend index surfaces that as `Latest Signal` plus an explicit `Alert`
    column in markdown output.
  - The weekly lane markdown also shows the latest bridge alert and signal near
    the top of the report for faster human review, together with bridge state
    and age when available.
  - `trend-index --summary-json` now also exposes `entriesWithSignals` and
    `latestWeeklyLaneSignal` plus `latestWeeklyLaneAlertStatus` in the top-level
    summary for automation.
  - When the newest weekly lane run has no Kangur bridge snapshot, the weekly
    trend summary preserves the most recent bridge-bearing run via
    `latestAvailableKangurAiTutorBridge*`, including age via
    `latestAvailableKangurAiTutorBridgeAgeMs` /
    `latestAvailableKangurAiTutorBridgeAgeRuns`, and the trend index exposes the
    reused bridge timestamp as `latestWeeklyLaneSignalRun`.
  - `latestKangurAiTutorBridgeState` and `latestAvailableKangurAiTutorBridgeState`
    distinguish the newest run from the most recent bridge-bearing run using
    `current`, `stale`, `absent`, or `missing`.
  - The trend index also exposes `latestWeeklyLaneSignalIsStale`, and the
    markdown report shows dedicated `Signal Run`, `Signal State`, and
    `Signal Age` columns plus a top-level current/stale/absent/missing signal
    distribution line
    whenever the reused bridge signal comes from an older weekly artifact.
  - `latestWeeklyLaneSignalState` is the fastest machine-readable way to tell if
    the weekly bridge signal is `current`, `stale`, `absent`, or `missing`.
  - `latestWeeklyLaneSignalAgeRuns` and `latestWeeklyLaneSignalAgeMs` expose how
    old a reused weekly bridge signal is when the state is `stale`.
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
- `docs/metrics/weekly-quality-trend-latest.json`
- `docs/metrics/weekly-quality-trend-latest.md`
- `docs/metrics/trend-index-latest.json`
- `docs/metrics/trend-index-latest.md`

For operators, the most useful stable markdown entrypoints are usually:

- [`docs/metrics/critical-path-performance-latest.md`](../metrics/critical-path-performance-latest.md)
- [`docs/metrics/critical-flow-tests-latest.md`](../metrics/critical-flow-tests-latest.md)
- [`docs/metrics/unit-domain-timings-latest.md`](../metrics/unit-domain-timings-latest.md)
- [`docs/metrics/weekly-quality-latest.md`](../metrics/weekly-quality-latest.md)
- [`docs/metrics/weekly-quality-trend-latest.md`](../metrics/weekly-quality-trend-latest.md)
- [`docs/metrics/trend-index-latest.md`](../metrics/trend-index-latest.md)
- [`docs/metrics/route-hotspots.md`](../metrics/route-hotspots.md)

## Live Telemetry Surfaces

- Kangur observability dashboard:
  - `/admin/kangur/observability`
- System log metrics API:
  - `GET /api/system/logs/metrics`
- Kangur observability summary API:
  - `GET /api/kangur/observability/summary?range=24h|7d|30d`
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

- Case Resolver save latency: warning at `p95 >= 700ms`, critical at
  `p95 >= 1200ms`
- Case list interaction: warning at `p95 >= 100ms`, critical at `p95 >= 180ms`
- Kangur sign-in failure rate: warning at `>= 5%`, critical at `>= 10%`
- Kangur TTS fallback rate: warning at `>= 10%`, critical at `>= 25%`

## Operating Cadence

1. On every PR, run `npm run perf:ops:fast`.
2. On staging or before release, run `npm run perf:ops:baseline`.
3. Weekly, rely on `.github/workflows/weekly-quality-report.yml` and review the
   generated trend artifacts.
4. During incidents, inspect `/api/system/logs/metrics`,
   `/api/brain/operations/overview`, OTEL traces/logs, and the latest
   `docs/metrics` artifacts together.
5. For Kangur-specific incidents, start with
   `GET /api/kangur/observability/summary?range=24h` and
   `docs/kangur/observability-and-operations.md`.

## Current Gaps

- No dedicated load-test harness is wired into this repo yet for sustained
  throughput or concurrency testing.
- The default weekly strict lane still skips full-repo lint, full unit coverage,
  and end-to-end coverage unless you opt in with `--include-full-lint`,
  `--include-full-unit`, and `--include-e2e`.
