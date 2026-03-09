---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'repo'
canonical: true
---

# Site-Wide Canonical Migration + Legacy Compatibility Pruning Plan (2026-03-05)

Date: 2026-03-05  
Owner: Platform Architecture + Domain Maintainers  
Re-baselined: 2026-03-05 (post Wave E execution)

## Objective

Complete migration to canonical runtime and persistence contracts, remove remaining legacy compatibility behavior, and close the program with measurable proof.

## Current Baseline (Re-verified 2026-03-05)

1. Canonical guardrails are green:
   - `npm run canonical:check:sitewide` passed (`3815` runtime source files, `4` required docs).
   - `npm run ai-paths:check:canonical` passed (`4216` source files under `src/`).
   - `npm run observability:check` passed (`legacyCompatViolations=0`, `runtimeErrors=0`).
2. Exception register posture is strict:
   - `docs/decisions/legacy-compatibility-exception-register-2026-03-05.json` contains `0` active exceptions.
3. Wave verification already executed:
   - `wave1:verify:prepare`, `wave1:verify:dry-run`, `wave1:verify:write` succeeded (see `docs/migrations/wave-execution-status-2026-03-05.md`).
4. Remaining compatibility-debt scope is now `0` open items:
   - `products-ai-worker-model-fallback` resolved (hard-cut fallback removal).
   - `filemaker-normalizer-compat-options` resolved (runtime options removed, persistence strip explicit).
   - `products-migrate-runtime-endpoint` resolved (runtime endpoint removed).
5. Validation gates are green on current baseline:
   - `npm run test:unit`, `npm run typecheck`
   - `npm run test:integration:prisma`, `npm run test:integration:mongo`, `npm run test:integration:mongo:canonical-shape-guard`
   - `npm run test:ai-paths:signal-flow-regression`
   - `npm run test:ci`
6. Canonical artifact enforcement is manifest-driven:
   - `scripts/canonical/check-sitewide.mjs` now resolves required canonical docs via `docs/canonical-artifacts-latest.json` (instead of hard-coded dated paths).

## Canonical End State

1. Runtime accepts only canonical payloads and canonical key names.
2. No open `compatibility_behavior` or `breakglass_surface` debt items in `docs/canonical-prune-backlog-2026-03-05.csv`.
3. Exception register remains empty, or only contains active unexpired entries with explicit owners and guard tokens.
4. Breakglass scripts and endpoints are either removed or explicitly governed with expiry and operator policy.

## Resolved Workboard (Executed 2026-03-05)

| ID | Domain | File | Risk | Resolution |
| --- | --- | --- | --- | --- |
| `products-ai-worker-model-fallback` | Products | `src/features/products/workers/product-ai-processors.ts` | high | Removed fallback; AI Brain config errors fail fast |
| `filemaker-normalizer-compat-options` | Filemaker | `src/features/filemaker/filemaker-settings.database.ts` | high | Removed runtime option flags; strict canonical behavior enforced |
| `products-migrate-runtime-endpoint` | Products | `src/app/api/v2/products/migrate/handler.ts` | medium | Removed runtime endpoint; regression test now asserts route remains absent; script-only operations retained |

## Execution Status and Remaining Plan

### Phase 1-3 (Completed on 2026-03-05)

1. Decision records completed:
   - `docs/migrations/decision-products-ai-worker-model-fallback-2026-03-05.md`
   - `docs/migrations/decision-filemaker-normalizer-compat-options-2026-03-05.md`
   - `docs/migrations/decision-products-migrate-runtime-endpoint-2026-03-05.md`
2. Hard-cut implementation completed for all previously open backlog items in:
   - `docs/canonical-prune-backlog-2026-03-05.csv`
3. Verification gates completed:
   - `npm run canonical:check:sitewide`
   - `npm run ai-paths:check:canonical`
   - `npm run observability:check`
   - `npm run wave1:verify:prepare`
   - `npm run wave1:verify:dry-run`
   - `npm run wave1:verify:write`

### Phase 4: Stabilization and Closeout (In Progress, 2026-04-01 to 2026-04-17)

1. Hold a 14-day stabilization window on `main` with zero canonical guardrail regressions.
   - Track daily evidence in `docs/migrations/stabilization-window-2026-04-17.md`.
   - Use `npm run canonical:stabilization:check` as daily gate.
2. Review `retain-breakglass` scripts in `docs/migrations/script-lifecycle-register-2026-03-05.md` and reclassify each to:
   - `retain-breakglass` (with renewed expiry), or
   - `archive-history`, or
   - `remove-obsolete`.
3. Publish closeout artifacts:
   - `docs/plans/canonical-closeout-2026-04-17.md`
   - updated `docs/migrations/script-lifecycle-register-2026-04-17.md`
   - updated `docs/migrations/wave-execution-status-2026-04-17.md`

## Governance

1. Weekly canonical review until 2026-04-17.
2. Any newly introduced compatibility debt must have one owner, one target PR, and one due date.
3. Any retained compatibility requires same-PR exception registration with sunset date.
4. Expired exceptions are release blockers.

## Success Metrics

1. `compatibility_debt_open_count = 0`
2. `active_exception_count = 0` (or all active entries valid/unexpired)
3. `canonical_guardrail_failures_on_main = 0` during stabilization window
4. `retain-breakglass_count` reduced from current baseline of `11`
5. No sustained increase in canonical unsupported-shape runtime errors

## Acceptance Criteria

1. All entries in `docs/canonical-prune-backlog-2026-03-05.csv` remain completed or accepted (`open = 0`).
2. Canonical guardrails remain green after final hard-cut.
3. Exception register is empty or policy-compliant.
4. Closeout artifacts are published by 2026-04-17.
