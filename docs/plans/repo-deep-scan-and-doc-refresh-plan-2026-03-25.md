---
owner: 'Platform Team'
last_reviewed: '2026-03-25'
status: 'active'
doc_type: 'plan'
scope: 'cross-feature'
canonical: true
---

# Repo Deep Scan And Documentation Refresh Plan

## Goal

Run a repo-wide quality and architecture scan across the active application
surfaces, record the current baseline, and refresh the canonical documentation
so the findings are discoverable from the main docs hubs.

This plan is the execution baseline for the 2026-03-25 scan wave. The findings
from the executed wave live in
[`../platform/repo-deep-scan-2026-03-25.md`](../platform/repo-deep-scan-2026-03-25.md).

## Scope

- Repository-root Next.js web app
- Admin surfaces under `src/app/(admin)/*`
- API routes under `src/app/api/*`
- Kangur feature surfaces and shared packages
- `apps/mobile`
- `apps/mobile-web`
- Cross-cutting shared libraries, contracts, observability, and docs governance

## Execution Phases

### 1. Inventory and topology confirmation

- Confirm the canonical app surfaces from:
  - `package.json`
  - `docs/kangur/README.md`
  - `docs/kangur/studiq-application.md`
  - `docs/kangur/react-native-monorepo-scaffold.md`
  - `apps/mobile/README.md`
  - `apps/mobile-web/README.md`

### 2. Static quality scan batches

Run repo-wide gates in attributable groups:

- Docs governance:
  - `npm run docs:structure:check`
  - `npm run docs:structure:audit:frontmatter`
- Core quality:
  - `npm run typecheck`
  - `npm run lint`
- Policy and safety:
  - `npm run check:unsafe-patterns:strict`
  - `npm run check:import-boundaries:strict`
  - `npm run check:api-input-validation:strict`
  - `npm run check:context-health:strict`
  - `npm run check:timer-cleanup:strict`
  - `npm run check:test-distribution:strict`
  - `npm run check:route-policies:strict`
  - `npm run check:next-route-config-reexports:strict`
  - `npm run check:security:static:strict`
  - `npm run check:security:authz-matrix:strict`
  - `npm run check:api-contract-coverage:strict`
  - `npm run health:env-contract:strict`
  - `npm run health:queue-runtime:strict`
  - `npm run health:storage-and-files:strict`
  - `npm run check:accessibility:component-policies:strict`
- Coverage and observability:
  - `npm run check:coverage:high-risk:strict`
  - `npm run observability:check`

### 3. Architecture and hotspot scans

- `npm run metrics:collect`
- `npm run metrics:hotspots`
- `npm run metrics:guardrails`
- `npm run check:ui-consolidation`
- `npm run metrics:prop-drilling`
- `npm run metrics:type-clusters`
- `npm run metrics:critical-paths:check`
- `npm run metrics:kangur:baseline:strict`

### 4. Mobile and package verification

- `npm run typecheck:mobile`
- `npm run test:mobile:tooling`
- Confirm that canonical Kangur topology docs still match `apps/mobile`,
  `apps/mobile-web`, and `packages/kangur-*`.

### 5. Documentation refresh

- Publish a dated repo-wide findings report under `docs/platform/`
- Update `docs/platform/README.md`
- Update `docs/plans/README.md`
- Keep feature hubs untouched unless the scan uncovered real topology drift

### 6. Validation and handoff

- Re-run docs structure validation after edits
- Summarize the backlog in priority order
- Keep the plan active until the immediate guardrail regressions are remediated

## Output Documents

- [`../platform/repo-deep-scan-2026-03-25.md`](../platform/repo-deep-scan-2026-03-25.md)
- `docs/metrics/*-latest.*` artifacts refreshed by the scan commands

## Acceptance Criteria

The scan wave is considered executed when:

1. Repo-wide scan commands have been run at least once for each batch above.
2. Failures are attributed to concrete files or guardrails rather than reported
   as generic red states.
3. The plan and findings report are discoverable from their canonical hubs.
4. Docs structure validation still passes after the documentation update.
5. The remediation backlog is split into immediate guardrail fixes, next-wave
   structural debt, and longer-horizon follow-ups.

## Current Status On 2026-03-25

- Scan execution completed across docs, static quality, architecture,
  observability, mobile tooling, and Kangur baseline commands.
- The findings report is published and linked from the platform hub.
- Immediate follow-up work remains open for import guardrail regressions,
  observability cleanup, prop-drilling reduction, coverage pipeline health, and
  Kangur baseline stabilization.
