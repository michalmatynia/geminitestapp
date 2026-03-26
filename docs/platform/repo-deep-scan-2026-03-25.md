---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# Repo Deep Scan Report 2026-03-25

This is the retained scan-and-remediation snapshot from the 2026-03-25 repo
review wave. Use it for the exact findings and same-day fixes captured then, but
use the maintained hubs below for current operator guidance:

- [`./README.md`](./README.md)
- [`../runbooks/README.md`](../runbooks/README.md)
- [`../plans/repo-deep-scan-and-doc-refresh-plan-2026-03-25.md`](../plans/repo-deep-scan-and-doc-refresh-plan-2026-03-25.md)
- [`../../GEMINI.md`](../../GEMINI.md)

## Summary

This scan wave covered the active web app, admin surfaces, API routes, Kangur,
mobile tooling, shared packages, architecture guardrails, observability, and
documentation governance.

The repo is structurally healthy in several important areas: docs governance,
linting, type safety, API validation, route policy enforcement, security checks,
critical-path performance checks, and mobile tooling all passed. The main issues
are concentrated in guardrail regressions and debt signals rather than
repo-wide breakage.

## Follow-up Status On 2026-03-25

After the initial scan wave, the highest-priority executable failures were
remediated on the same day:

- `npm run metrics:guardrails`: now passes
- `npm run observability:check`: now passes
- `npm run metrics:kangur:baseline:strict`: now passes

The high-risk coverage gate itself no longer misreads the generic repo coverage
artifact. It now defaults to the dedicated `coverage/high-risk` artifact
contract and warns when that baseline has not been generated yet.

The remaining work is split into two narrower items:

- Real threshold misses in `src/shared/contracts` and `src/shared/lib`
- Local disk-pressure during the full high-risk baseline sweep on a nearly full
  workstation

## What Passed

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
- Architecture and runtime:
  - `npm run metrics:collect`
  - `npm run metrics:hotspots`
  - `npm run metrics:prop-drilling`
  - `npm run metrics:type-clusters`
  - `npm run metrics:critical-paths:check`
- Mobile:
  - `npm run typecheck:mobile`
  - `npm run test:mobile:tooling`

## Primary Failures

### 1. Architecture guardrails regressed on import boundaries

`npm run metrics:guardrails` failed against the 2026-03-19 baseline with two
real regressions:

- `imports.appFeatureBarrelImports`: `1` current, `0` allowed
- `imports.featuresToAppApiTotalImports`: `1` current, `0` allowed

Current offending imports:

- App-layer barrel usage in:
  - `src/app/(admin)/admin/import/page.tsx`
  - `src/app/(admin)/admin/integrations/aggregators/base-com/import-export/page.tsx`
- Feature-to-app-api dependency in:
  - `src/features/integrations/workers/baseExportProcessor.ts`

This is the highest-priority architectural fix because one of the failures is a
hard limit breach.

Status after follow-up remediation:

- Fixed by switching app routes to `@/features/data-import-export/public`
- Fixed by moving the Base export segment implementation under
  `src/features/integrations/services/base-export-segments`
- `npm run metrics:guardrails` now passes with:
  - `imports.appFeatureBarrelImports = 0`
  - `imports.featuresToAppApiTotalImports = 0`

### 2. UI consolidation debt remains materially above baseline

`npm run check:ui-consolidation` failed with:

- `propForwarding=120`
- `propDepthGte4Chains=49`

The generated prop-drilling scan confirms that the backlog is dominated by
Kangur:

- `feature:kangur`: `117` forwarding components
- `shared-ui`: `54`
- `feature:ai`: `37`

Top forwarding hotspots include:

- `AdminKangurLessonsManagerTreePanel`
- `FilterPanel`
- `DetailModal`
- `KangurNavAction`
- `ExamNavigation`
- `KangurResultsWidgetContent`

This is structural debt rather than a release blocker, but the numbers are high
enough that future feature work will continue paying composition cost until the
worst chains are flattened.

### 3. Observability guardrails are failing on cleanup debt

`npm run observability:check` failed with:

- `consoleLogs=13`
- `legacyCompatViolations=3`
- `uncoveredRoutes=0`

The route coverage result is healthy. The failure is specifically cleanup debt:

- Legacy server import violations:
  - `src/features/ai/insights/generator.ts`
  - `src/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context.ts`
  - `src/shared/lib/observability/runtime-context/sanitize-system-log-for-ai.ts`
- Structured logging violations remain in products and shared observability
  helpers, including:
  - `src/features/products/lib/product-list-observability.ts`
  - `src/features/products/performance/monitoring.ts`
  - `src/shared/lib/api/session-registry.ts`
  - `src/shared/lib/env.ts`
  - `src/shared/utils/observability/error-system.ts`
  - `src/shared/utils/observability/internal-observability-fallback.ts`

Status after follow-up remediation:

- The runtime-context implementation was moved into `src/shared/lib/observability/runtime-context/*`
- AI insights now consume the shared runtime-context surface
- Raw `console.*` sites were replaced with `logger` or internal fallback
  reporting
- `npm run observability:check` now passes with:
  - `consoleLogs = 0`
  - `legacyCompatViolations = 0`

### 4. High-risk coverage pipeline was reading the wrong artifact

The high-risk checker previously defaulted to the generic
`coverage/coverage-summary.json` artifact. On this workstation that file was
effectively unusable for protected-domain coverage:

- Lines: `0.18%`
- Statements: `0.16%`
- Functions: `0.04%`
- Branches: `0%`

Status after follow-up remediation:

- `npm run check:coverage:high-risk:strict` now reads the dedicated
  `coverage/high-risk` contract by default
- When the high-risk baseline has not been generated, the check now degrades to
  a missing-artifact warning instead of reporting false catastrophic coverage
- The baseline runner no longer attempts to write a redundant monolithic
  `coverage/high-risk/coverage-summary.json`, which previously failed with
  `ENOSPC`

Current remaining findings after running the dedicated baseline with
`--summary-json`:

- Real threshold misses:
  - Shared Contracts: `76.2%` lines, `75.2%` statements, `47.4%` functions,
    `33.9%` branches
  - Shared Lib: `57.5%` lines, `55.2%` statements, `55.1%` functions, `42%`
    branches
- Local environment pressure:
  - The full five-domain baseline still hit `ENOSPC` while Vitest was creating
    temp files under `node_modules/.vite-temp`
  - That prevented complete local results for `api-routes`, `kangur`, and
    `ai-paths`

This is now a narrower problem set: part real coverage debt, part local disk
headroom. The checker itself is no longer the source of the false signal.

### 5. Kangur performance baseline is not stable yet

`npm run metrics:kangur:baseline:strict` failed because the unit suite failed
and the E2E suite was skipped.

The generated bundle-risk snapshot also shows several large Kangur files still
worth keeping on the refactor backlog:

- `src/features/kangur/ui/pages/Game.tsx`
- `src/features/kangur/ui/components/KangurGame.tsx`
- `src/features/kangur/ui/services/kangur-questions-data.js`
- `src/features/kangur/ui/pages/LearnerProfile.tsx`
- `src/features/kangur/ui/pages/Lessons.tsx`

Status after follow-up remediation:

- The baseline wrapper now passes:
  - `npm run metrics:kangur:baseline:strict`
- The underlying unit bundle also passes:
  - `__tests__/features/kangur/learner-profile.page.test.tsx`
  - `__tests__/features/kangur/lessons-focus-routing.test.tsx`
  - `__tests__/features/kangur/kangur-feature-app.shell.test.tsx`
  - `__tests__/features/kangur/kangur-admin-menu-toggle.test.tsx`
  - `src/features/kangur/ui/services/profile.test.ts`
  - `src/features/kangur/settings.test.ts`
- E2E remains skipped by the generated baseline, but it is no longer causing the
  strict command to fail.

## Secondary Scan Signals

### Repository scale and hotspot profile

`npm run metrics:collect` reported:

- `7544` source files
- `1,258,927` source lines
- `29` API route groups
- `159` delegated server routes
- `3` cross-feature dependency pairs

The largest current route hotspots from
[`../metrics/route-hotspots.md`](../metrics/route-hotspots.md) are concentrated
in generic catch-all API groups:

- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`

### Type consolidation backlog remains real

`npm run metrics:type-clusters` passed, but the generated plan shows active
consolidation work still queued across shared, contracts, Kangur, AI, CMS,
integrations, and case-resolver surfaces. The immediate high-risk clusters span:

- shared plus shared-contracts
- feature:kangur plus shared
- feature:kangur plus shared-contracts
- feature:ai plus shared-contracts

See
[`../metrics/type-clusters-plan-latest.md`](../metrics/type-clusters-plan-latest.md)
for the current wave order.

## Documentation Review

The canonical docs topology is in good shape:

- `docs:structure:check` passed
- Frontmatter audit reported `0` missing canonical frontmatter entries
- Kangur hubs already describe the current root-web plus mobile plus
  `packages/kangur-*` topology accurately

No immediate topology correction was needed in feature docs during this wave.
The documentation update for this task is therefore focused on publishing the
scan baseline and remediation plan rather than rewriting stable feature
references that already match the codebase.

## Prioritized Backlog

### Immediate

1. Investigate why the coverage artifact is near-zero across the repo and fix
   the coverage-producing pipeline before treating protected-domain percentages
   as trustworthy.
2. Preserve the now-green architecture and observability guardrails while
   follow-up refactors continue.
3. Keep the Kangur baseline green while addressing the larger file-size hotspots.

### Next wave

1. Reduce prop-drilling in Kangur-first hotspots, starting with
   `AdminKangurLessonsManagerTreePanel`, navigation shells, and heavily
   forwarded lesson/admin panels.
2. Split or further isolate the largest Kangur gameplay and content files.
3. Execute the highest-risk type-cluster migrations once canonical DTO
   destinations are approved.

### Longer horizon

1. Keep trimming the largest generic catch-all API route groups.
2. Add package-local READMEs only if the shared-package public contracts begin
   to diverge from the existing Kangur topology docs.
3. Introduce broader browser-driven smoke coverage only after the static and
   guardrail backlog above is back within policy.

## Evidence

The executed scan wave refreshed or relied on these canonical generated docs:

- [`../metrics/baseline-latest.md`](../metrics/baseline-latest.md)
- [`../metrics/route-hotspots.md`](../metrics/route-hotspots.md)
- [`../metrics/prop-drilling-latest.md`](../metrics/prop-drilling-latest.md)
- [`../metrics/type-clusters-plan-latest.md`](../metrics/type-clusters-plan-latest.md)
- [`../metrics/high-risk-coverage-latest.md`](../metrics/high-risk-coverage-latest.md)
- [`../metrics/kangur-performance-latest.md`](../metrics/kangur-performance-latest.md)

This report records the repo state observed on 2026-03-25. It is not an
exhaustive manual UX or end-to-end browser audit of every route.
