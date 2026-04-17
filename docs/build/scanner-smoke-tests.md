---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Scanner Smoke Tests

This guide explains the smoke and contract-style validation commands for the
repository scanner and check scripts. Use it when you change a scanner,
summary-json envelope helper, generated-metrics writer, or a smoke suite that
publishes scanner-style artifacts under `docs/metrics/`.

## Scope

This document covers:

- scanner contract and envelope tests
- type-cluster regression validation
- security and accessibility smoke suites that emit scanner envelopes
- broader smoke aggregation lanes that include scanner checks

This document does not try to catalog every domain-specific smoke command in the
repo, such as mobile export smoke or knowledge-graph smoke.

## Quick Decision Guide

| If you changed... | Run this first | Then run this if needed |
| --- | --- | --- |
| Any script under `scripts/architecture`, `scripts/quality`, `scripts/testing`, `scripts/observability`, `scripts/docs`, or shared scanner helpers | `npm run check:scanner-contracts` | `npx vitest run scripts/architecture/scan-summary-json-envelope.testing.test.ts` and `npx vitest run scripts/architecture/scan-summary-json-envelope.integration.test.ts` if the change affects testing/integration scanners |
| `scripts/architecture/lib/scan-output.mjs`, `scripts/lib/check-cli.mjs`, or shared summary-json envelope behavior | `npm run test:scanner-envelopes` | Run all three envelope suites directly for full coverage |
| `scripts/architecture/scan-type-clusters.mjs` or type-cluster reporting | `npm run test:type-clusters:regression` | `npm run test:scanner-envelopes` and `npm run metrics:type-clusters -- --summary-json --no-write --no-history` |
| `scripts/testing/run-security-smoke-tests.mjs` or auth/rate-limit/log-redaction smoke coverage | `npm run test:security-smoke` | `npm run test:security-smoke:strict` before merge or release |
| `scripts/testing/run-accessibility-smoke-tests.mjs` or browser accessibility smoke coverage | `npm run test:accessibility-smoke` | `npm run test:accessibility-smoke:strict` and `npm run test:accessibility:gate` for broader accessibility validation |
| `scripts/testing/run-accessibility-route-crawl.mjs` | `npm run test:accessibility:route-crawl` | `npm run test:accessibility:route-crawl:strict` or `npm run test:accessibility:gate` |
| Repo-wide smoke stability before PR/release | `npm run bazel:smoke` | `bun run bun:repo:smoke` if you need the Bun smoke lane too |

## Core Scanner Contract Commands

### `npm run lint:scanner-scripts`

Purpose:

- Lints the scanner and check scripts under `scripts/ai-paths`, `scripts/architecture`,
  `scripts/auth`, `scripts/canonical`, `scripts/cleanup`, `scripts/db`,
  `scripts/docs`, `scripts/lib`, `scripts/observability`, `scripts/perf`,
  `scripts/quality`, and `scripts/testing`.

Run this when:

- you changed script code, imports, or CLI handling
- you touched a shared helper used by scanner/check scripts

What it catches:

- ESLint regressions in the scanner script surface
- import/style/runtime-safety issues that fail before the scanner even runs

Cost:

- fast to medium

### `npm run test:scanner-envelopes`

Purpose:

- Runs `scripts/architecture/scan-summary-json-envelope.architecture.test.ts`.
- Verifies that architecture scanners keep the shared `--summary-json` envelope
  partitioned into `summary`, `details`, `paths`, `filters`, and `notes`.

Current coverage:

- `scan-prop-drilling`
- `scan-ui-consolidation`
- `scan-type-clusters`

Run this when:

- you changed `scripts/architecture/lib/scan-output.mjs`
- you changed architecture scanner summary-json output
- you changed CLI envelope helpers and want the fastest scanner-envelope signal

Cost:

- fast

Important limitation:

- This package script currently covers only the architecture envelope suite.
- Testing and integration envelope suites exist, but must be run directly.

### `npx vitest run scripts/architecture/scan-summary-json-envelope.testing.test.ts`

Purpose:

- Verifies summary-json envelopes for testing and performance-related scanners.

Coverage:

- `critical-path-performance`
- `route-hotspots`
- `unit-domain-timings`
- `accessibility-smoke`
- `accessibility-route-crawl`
- `playwright-suite`
- `critical-flow-tests`
- `security-smoke`

Run this when:

- you changed a testing/perf smoke runner
- you changed how testing scanners write `summary`, `details`, `paths`, or `filters`
- you changed runtime-brokered scanner output for Playwright-backed checks

Cost:

- fast to medium

### `npx vitest run scripts/architecture/scan-summary-json-envelope.integration.test.ts`

Purpose:

- Verifies summary-json envelopes for integration-style scanners and broader
  quality checks.

Coverage:

- `observability-check`
- `api-error-sources`
- `test-distribution`
- `high-risk-coverage`
- `testing-quality-snapshot`
- `ai-paths-check-canonical`
- `canonical-check-sitewide`
- `canonical-stabilization-check`
- `docs-ai-paths-tooltip-coverage`
- `docs-validator-doc-coverage`

Run this when:

- you changed scanners in `scripts/quality`, `scripts/observability`,
  `scripts/canonical`, or related docs checks
- you changed shared summary-json envelope helpers and want full non-architecture
  scanner coverage

Cost:

- medium

### `npm run test:type-clusters:regression`

Purpose:

- Runs `scripts/architecture/scan-type-clusters.regression.test.ts`.
- Keeps the exported type-cluster baseline stable.

What it asserts:

- the scanner still returns an `ok` envelope
- the current regression baseline remains stable
- `paths` stays `null` under `--no-write`
- `filters` still record `noWrite` and `historyDisabled`

Run this when:

- you changed `scripts/architecture/scan-type-clusters.mjs`
- you changed type-cluster parsing, clustering heuristics, or report shaping

Cost:

- medium

### `npm run check:scanner-contracts`

Purpose:

- Runs the minimum bundled scanner contract lane:
  - `npm run lint:scanner-scripts`
  - `npm run test:scanner-envelopes`
  - `npm run test:type-clusters:regression`

Use this as:

- the default first command after changing scanner/check scripts
- the cheapest bundled confidence check for scanner contract work

Known boundary:

- it does not currently include the testing or integration envelope suites
- it does not run browser-backed accessibility/security smoke suites

## Smoke Suites That Publish Scanner Artifacts

### `npm run test:security-smoke`

Purpose:

- Runs the security smoke runner at
  `scripts/testing/run-security-smoke-tests.mjs`.
- Produces scanner-style metrics artifacts:
  - `docs/metrics/security-smoke-latest.json`
  - `docs/metrics/security-smoke-latest.md`

Suites included:

| Suite | Test file | What it checks |
| --- | --- | --- |
| Auth Security Policy | `__tests__/features/auth/utils/auth-security.test.ts` | auth policy guardrails |
| Auth Encryption | `__tests__/features/auth/utils/auth-encryption.test.ts` | encryption behavior |
| Auth Verify Credentials API | `__tests__/features/auth/api/verify-credentials.test.ts` | credential verification endpoint behavior |
| AI Paths Access Rate Limit | `src/features/ai/ai-paths/server/__tests__/access.rate-limit.test.ts` | rate limiting |
| Observability Log Redaction | `__tests__/shared/lib/observability/log-redaction.test.ts` | sensitive-data redaction |

Run this when:

- you changed auth policy or auth crypto logic
- you changed credential-verification behavior
- you changed rate limiting around AI Paths access
- you changed observability log-redaction code
- you changed the security smoke runner itself

Use the strict variant:

- `npm run test:security-smoke:strict`

Strict behavior:

- exits non-zero when any suite fails

Cost:

- medium

### `npm run test:accessibility-smoke`

Purpose:

- Runs the accessibility smoke runner at
  `scripts/testing/run-accessibility-smoke-tests.mjs`.
- Mixes Vitest and Playwright coverage.
- Produces scanner-style metrics artifacts:
  - `docs/metrics/accessibility-smoke-latest.json`
  - `docs/metrics/accessibility-smoke-latest.md`

Suites included:

| Suite | Runner | Test file |
| --- | --- | --- |
| App Shell Accessibility | `vitest` | `src/app/__tests__/shell-accessibility.test.tsx` |
| Auth Sign-In Accessibility | `vitest` | `__tests__/features/auth/pages/signin-page.test.tsx` |
| Products Edit Form Accessibility | `vitest` | `__tests__/features/products/pages/product-edit-page.test.tsx` |
| Image Studio UI Accessibility | `vitest` | `src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx` |
| AI Paths Canvas Accessibility | `vitest` | `src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx` |
| Case Resolver Header Accessibility | `vitest` | `src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx` |
| Case Resolver Accessibility | `playwright` | `e2e/features/accessibility/case-resolver-accessibility.spec.ts` |
| Kangur Profile Accessibility | `vitest` | `__tests__/features/kangur/kangur-accessibility-smoke.test.tsx` |
| Public Auth Route Accessibility | `playwright` | `e2e/features/accessibility/public-auth-accessibility.spec.ts` |
| Admin Dashboard Accessibility | `playwright` | `e2e/features/accessibility/admin-dashboard-accessibility.spec.ts` |
| Products List Accessibility | `playwright` | `e2e/features/accessibility/products-list-accessibility.spec.ts` |
| CMS Pages Accessibility | `playwright` | `e2e/features/accessibility/cms-pages-accessibility.spec.ts` |
| Notes Workspace Accessibility | `playwright` | `e2e/features/accessibility/notes-workspace-accessibility.spec.ts` |
| CMS Builder Accessibility | `playwright` | `e2e/features/accessibility/cms-builder-accessibility.spec.ts` |

Run this when:

- you changed accessibility semantics in shared UI or route shells
- you changed accessibility-related Playwright specs
- you changed runtime-brokered accessibility smoke behavior
- you changed the accessibility smoke runner itself

Warning-budget behavior:

- default warning budget is `10`
- the suite tracks React `act(...)` warnings across results
- warning budget is telemetry-only unless you add
  `--fail-on-warning-budget-exceed`

Useful variants:

- `npm run test:accessibility-smoke:strict`
- `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --fail-on-warning-budget-exceed`

Strict behavior:

- fails on suite failures
- optionally fails on warning-budget exceed if
  `--fail-on-warning-budget-exceed` is added

Cost:

- medium to high

### `npm run test:accessibility:route-crawl`

Purpose:

- Runs `scripts/testing/run-accessibility-route-crawl.mjs`.
- This is broader than the smoke suite and scans representative public/admin
  routes with Playwright and the shared axe helper.

Use this when:

- you changed route-level accessibility behavior
- you changed route-crawl configuration or chunking
- the smoke suite passed but you need broader browser route coverage

Strict variant:

- `npm run test:accessibility:route-crawl:strict`

### `npm run test:accessibility:gate`

Purpose:

- Runs the full accessibility gate:
  - `npm run check:accessibility:component-policies:strict`
  - `npm run test:accessibility-smoke:strict`
  - `npm run test:accessibility:route-crawl:strict`

Use this when:

- you need merge/release-level accessibility confidence
- smoke coverage alone is not enough

Cost:

- high

## Broader Smoke Aggregation Lanes

### `npm run bazel:smoke`

Purpose:

- Runs the Bazel repo smoke lane `//:repo_smoke`.
- Use this when you want a repo-owned smoke aggregation rather than a single
  targeted smoke suite.

Use this when:

- you changed cross-cutting tooling and want broader confidence
- you need the same smoke lane used by the Bazel smoke workflow

### `bun run bun:repo:smoke`

Purpose:

- Runs the Bun repo smoke lane:
  - `bun run bun:check:docs-structure`
  - `bun run bun:check:api-error-sources`
  - `bun run bun:check:canonical-sitewide`
  - `bun run bun:check:observability`

Use this when:

- you care specifically about Bun parity for smoke-level scanner checks
- you changed docs-structure, canonical, or observability check behavior and
  want the Bun-managed smoke lane

## Recommended Command Sets

### Fastest scanner-contract check

```bash
npm run check:scanner-contracts
```

### Full scanner-envelope check

```bash
npm run test:scanner-envelopes
npx vitest run scripts/architecture/scan-summary-json-envelope.testing.test.ts
npx vitest run scripts/architecture/scan-summary-json-envelope.integration.test.ts
```

### Type-cluster work

```bash
npm run test:type-clusters:regression
npm run test:scanner-envelopes
```

### Security-smoke work

```bash
npm run test:security-smoke
```

Before merge or release:

```bash
npm run test:security-smoke:strict
```

### Accessibility-smoke work

```bash
npm run test:accessibility-smoke
```

Before merge or release:

```bash
npm run test:accessibility-smoke:strict
npm run test:accessibility:route-crawl:strict
```

### Broad smoke sweep

```bash
npm run bazel:smoke
```

## Related Docs

- Build hub: [`README.md`](./README.md)
- Testing operations runbook:
  [`docs/runbooks/testing-operations.md`](../runbooks/testing-operations.md)
- Architecture guardrails and shared scan envelope:
  [`docs/platform/architecture-guardrails.md`](../platform/architecture-guardrails.md)
