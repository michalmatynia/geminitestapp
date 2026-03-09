---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'platform'
canonical: true
---

# Architecture and Performance Guardrails

This document defines the baseline and enforcement workflow for modularity and performance improvements.

## Goals

- Prevent architecture regressions while refactoring.
- Keep API route behavior and caching strategy observable.
- Track large-module and coupling hotspots over time.

## Tooling

### Metrics collection

Run:

```bash
npm run metrics:collect
npm run metrics:hotspots
```

Outputs:

- `docs/metrics/baseline-latest.json`
- `docs/metrics/baseline-latest.md`
- `docs/metrics/baseline-<timestamp>.json`
- `docs/metrics/route-hotspots.md`

### Machine-readable scan output contract

For AI and automation, use JSON mode:

```bash
node scripts/architecture/scan-prop-drilling.mjs --summary-json --no-write --no-history
node scripts/architecture/scan-ui-consolidation.mjs --summary-json --no-write --no-history
node scripts/architecture/scan-type-clusters.mjs --summary-json --no-write --no-history
node scripts/architecture/collect-metrics.mjs --summary-json --no-write --no-history
node scripts/observability/check-observability.mjs --mode=check --summary-json
```

Every scan/check now emits the same envelope:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-03-09T00:00:00.000Z",
  "scanner": { "name": "scan-prop-drilling", "version": "1.0.0" },
  "status": "ok",
  "summary": { "metricName": 0 },
  "details": {},
  "paths": {},
  "filters": {},
  "notes": []
}
```

- `summary` contains scalar metrics used by guardrail checks.
- `details` contains arrays/maps such as `chains`, `opportunities`, or `clusters` for downstream AI usage.
- `paths` contains written artifact paths when the scanner produced files.
- `filters` contains run filters/flags.
- `notes` contains optional run annotations.
- AI and automation should preserve that partitioning when reshaping a scan:
  keep headline metrics in `summary`, rich findings in `details`, artifact
  locations in `paths`, and run flags in `filters`.

Use [`scripts/architecture/lib/scan-output.mjs`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/architecture/lib/scan-output.mjs) for both producers and consumers:

- `buildScanOutput` when writing `--summary-json`
- `parseScanOutput` / `parseScanSummary` when reading `stdout`
- If a consumer needs the full payload, use `parseScanOutput` and keep each
  section in its matching field instead of flattening everything into one blob.

Validation commands for the shared envelope:

```bash
npm run lint:scanner-scripts
npm run test:scanner-envelopes
```

### Guardrail enforcement

Run:

```bash
npm run metrics:guardrails
```

To refresh thresholds after intentional improvements:

```bash
npm run metrics:guardrails:update
```

Guardrails are baseline-relative and fail when key metrics worsen.

## CI Integration

Workflow: `.github/workflows/architecture-guardrails.yml`

Pipeline steps:

1. Install dependencies.
2. Collect metrics.
3. Generate route hotspot report.
4. Enforce guardrails.

## Current boundary convention

For `src/app/**/*` imports:

- Use `@/features/<feature>/public` for UI/public feature APIs.
- Use `@/features/<feature>/server` (or deeper server-only entrypoints) for server routes/runtime code.
- Avoid bare `@/features/<feature>` barrels.

This is enforced via ESLint.

## Definition of Done (Architecture Changes)

A modularity/performance refactor is complete when:

1. No guardrail metric regresses.
2. New app-layer feature imports use `public`/`server` entrypoints.
3. Route-level caching policy is explicit or covered by standardized handler policy.
4. New orchestration code is split from utility/adapter code.
5. `npm run metrics:all` passes locally.

## Next Iteration Targets

- Continue reducing `api.routesWithoutApiHandler`.
- Keep lowering `source.filesOver1000` and `source.filesOver1500`.
- Reduce `imports.appFeatureDeepImports` by promoting narrow entrypoints.
- Decrease `architecture.crossFeatureEdgePairs` by decoupling feature-to-feature imports.
