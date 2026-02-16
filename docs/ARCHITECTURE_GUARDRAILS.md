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
