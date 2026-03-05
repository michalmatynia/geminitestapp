# Site-Wide Canonical Migration + Legacy Compatibility Pruning Plan (2026-03-05)

Date: 2026-03-05  
Owner: Platform Architecture + Domain Maintainers  
Re-baselined: 2026-03-05 (post Wave E execution)

## Objective

Complete migration to canonical runtime and persistence contracts, remove remaining legacy compatibility behavior, and close the program with measurable proof.

## Current Baseline (Re-verified 2026-03-05)

1. Canonical guardrails are green:
   - `npm run canonical:check:sitewide` passed (`3848` runtime source files, `4` required docs).
   - `npm run ai-paths:check:canonical` passed (`4241` source files under `src/`).
   - `npm run observability:check` passed (`legacyCompatViolations=0`, `runtimeErrors=0`).
2. Exception register posture is strict:
   - `docs/legacy-compatibility-exception-register-2026-03-05.json` contains `0` active exceptions.
3. Wave verification already executed:
   - `wave1:verify:prepare`, `wave1:verify:dry-run`, `wave1:verify:write` succeeded (see `docs/migrations/wave-execution-status-2026-03-05.md`).
4. Remaining compatibility-debt scope is now `0` open items:
   - `products-ai-worker-model-fallback` resolved (hard-cut fallback removal).
   - `filemaker-normalizer-compat-options` resolved (runtime options removed, persistence strip explicit).
   - `products-migrate-runtime-endpoint` resolved (runtime endpoint removed).

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
| `products-migrate-runtime-endpoint` | Products | `src/app/api/v2/products/migrate/handler.ts` | medium | Removed runtime endpoint and route test; script-only operations retained |

## Execution Plan

### Phase 1: Decision Freeze (2026-03-05 to 2026-03-08)

1. Resolve architecture decisions for the three open items.
2. Write short ADR-style notes in `docs/migrations/` for each decision, including rollback and owner sign-off.
3. If any temporary compatibility is retained, add a same-PR exception entry with sunset date.

Deliverables:

1. `products-ai-worker-model-fallback` decision record.
2. `filemaker-normalizer-compat-options` decision record.
3. `products-migrate-runtime-endpoint` decision record.

### Phase 2: Implementation Hard-Cut (2026-03-08 to 2026-03-20)

1. Products worker model fallback:
   - Preferred path: remove the legacy fallback branch in `processGraphModel` and require Brain-resolved model assignment.
   - If resilience fallback is kept, rename semantics to non-legacy language and gate it behind explicit policy config (not implicit compatibility).
   - Update tests in `src/features/products/workers/__tests__/product-ai-processors.graph-model.test.ts`.
2. Filemaker normalizer options:
   - Move to strict canonical defaults as runtime baseline.
   - Keep `stripCompatibilityFields` only in persistence serializer (`toPersistedFilemakerDatabase`) if still required for storage normalization.
   - Remove or restrict optional compatibility flags from runtime-facing call sites.
   - Expand coverage in `src/features/filemaker/__tests__/settings.test.ts`.
3. Products migration endpoint:
   - Choose one:
     - remove endpoint (`src/app/api/v2/products/migrate/*`) and rely on script-only operations, or
     - retain as breakglass with explicit authorization and runbook-only access.
   - Align API tests (`__tests__/api/products/migration.test.ts`) with final route policy.
4. Update backlog statuses in `docs/canonical-prune-backlog-2026-03-05.csv` as each item lands.

### Phase 3: Verification and Policy Lock (2026-03-20 to 2026-03-31)

Required validation for each migration PR:

1. `npm run canonical:check:sitewide`
2. `npm run ai-paths:check:canonical`
3. `npm run observability:check`
4. `npm run test:unit`
5. `npm run test:integration:prisma`
6. `npm run test:integration:mongo`

Then run final wave verification sequence:

1. `npm run wave1:verify:prepare`
2. `npm run wave1:verify:dry-run`
3. `npm run wave1:verify:write`

### Phase 4: Stabilization and Closeout (2026-04-01 to 2026-04-17)

1. Hold a 14-day stabilization window on `main` with zero canonical guardrail regressions.
2. Review `retain-breakglass` scripts in `docs/migrations/script-lifecycle-register-2026-03-05.md` and reclassify each to:
   - `retain-breakglass` (with renewed expiry), or
   - `archive-history`, or
   - `remove-obsolete`.
3. Publish closeout artifacts:
   - `docs/canonical-closeout-2026-04-17.md`
   - updated `docs/migrations/script-lifecycle-register-2026-04-17.md`
   - updated `docs/migrations/wave-execution-status-2026-04-17.md`

## Governance

1. Weekly canonical review until 2026-04-17.
2. Every open item must have one owner, one target PR, and one due date.
3. Any retained compatibility requires same-PR exception registration with sunset date.
4. Expired exceptions are release blockers.

## Success Metrics

1. `compatibility_debt_open_count = 0`
2. `active_exception_count = 0` (or all active entries valid/unexpired)
3. `canonical_guardrail_failures_on_main = 0` during stabilization window
4. `retain-breakglass_count` reduced from current baseline of `10`
5. No sustained increase in canonical unsupported-shape runtime errors

## Acceptance Criteria

1. All three open entries in `docs/canonical-prune-backlog-2026-03-05.csv` are resolved or formally accepted with rationale.
2. Canonical guardrails remain green after final hard-cut.
3. Exception register is empty or policy-compliant.
4. Closeout artifacts are published by 2026-04-17.
