# Site-Wide Canonical Migration + Legacy Compatibility Pruning Plan (2026-03-05)

Date: 2026-03-05  
Owner: Platform Architecture + Domain Maintainers

## Objective

Complete hard-cut to canonical runtime/data contracts across all domains, prune remaining legacy compatibility surfaces, and close the migration program with explicit proof.

## Current Baseline (Validated 2026-03-05)

1. Guardrails are green:
   - `npm run canonical:check:sitewide` passed (`3852` runtime source files, `4` required docs).
   - `npm run ai-paths:check:canonical` passed (`4245` source files scanned under `src/`).
   - `npm run observability:check` passed (`legacyCompatViolations=0`, `runtimeErrors=0`).
2. Exception posture is strict:
   - `docs/legacy-compatibility-exception-register-2026-03-05.json` has `0` active exceptions.
3. Migration verification is already executed for Wave 1:
   - `wave1:verify:prepare`, `wave1:verify:dry-run`, `wave1:verify:write` succeeded per `docs/migrations/wave-execution-status-2026-03-05.md`.
4. Remaining compatibility backlog exists:
   - `docs/canonical-prune-backlog-2026-03-05.csv` currently tracks `10` open compatibility-debt items and `2` accepted false positives.
5. Script lifecycle decision is started:
   - `docs/migrations/script-lifecycle-register-2026-03-05.md` marks `21` scripts as `retain-active`, `10` as `retain-breakglass`.

## Program End State

1. Runtime accepts canonical payloads only.
2. No open compatibility debt in `src/**` runtime scope.
3. Exception register remains empty, or only has active unexpired entries with owners.
4. Migration scripts are reduced to an intentional retained set; obsolete ones are archived/removed.
5. CI guardrails enforce canonical policy without dated-artifact drift.

## Remaining Scope

In scope:

1. Open items in `docs/canonical-prune-backlog-2026-03-05.csv`.
2. CI/doc guardrail drift caused by hard-coded dated canonical artifact references.
3. Breakglass script governance and final archival/removal decisions.
4. Stabilization monitoring and closeout reporting.

Out of scope:

1. Non-contract resilience mechanisms (timeouts/retries/circuit-breakers).
2. External vendor/API versioning that is currently required.

## Execution Waves (Remaining)

## Wave D-Remaining: Runtime Hard-Cut (2026-03-05 to 2026-03-20)

Goal: close all open runtime compatibility debt entries.

Actions:

1. Resolve open backlog items by domain owner:
   - AI Paths: remove compatibility-layer naming channel in API client comments.
   - Products: retire `useMetadata.ts` and `useCatalogQueries.ts` compatibility wrappers after callsite migration.
   - Integrations: retire `integrationCache.ts` and `listingCache.ts` compatibility wrappers after callsite migration.
   - Case Resolver: rename legacy mapper naming channel in requested-context hook.
   - Products: decide and implement hard policy for model fallback in `product-ai-processors.ts`.
   - Filemaker: decide and implement hard policy for `rejectLegacyInlinePayloads` / `stripCompatibilityFields` options.
2. Keep two accepted false positives documented as intentional (`node-identity` seed keys and factory seed key naming).
3. For each resolved item, add/extend guardrail tokens or tests to prevent reintroduction.

Exit criteria:

1. Backlog shows `0` open compatibility-debt items.
2. All resolved items have either test coverage or token guard coverage.

## Wave E-Remaining: CI + Artifact Canonicalization (2026-03-10 to 2026-03-24)

Goal: remove canonical artifact date drift from enforcement path.

Actions:

1. Replace hard-coded `2026-03-04` doc requirements in `scripts/canonical/check-sitewide.mjs` with one of:
   - canonical `latest` manifest file, or
   - updated `2026-03-05` artifact set with single source mapping.
2. Keep these docs synchronized as authority:
   - `docs/canonical-contract-matrix-2026-03-05.md`
   - `docs/legacy-compatibility-exception-register-2026-03-05.md`
   - `docs/legacy-compatibility-exception-register-2026-03-05.json`
   - `docs/site-wide-canonical-migration-plan-2026-03-05.md`
3. Update CI references to match the same authority mapping and fail on drift.

Exit criteria:

1. `canonical:check:sitewide` validates current canonical artifact mapping.
2. CI no longer depends on stale dated artifact names.

## Wave F: Stabilization + Closeout (2026-03-24 to 2026-04-17)

Goal: prove stable behavior after hard-cut and finalize script lifecycle.

Actions:

1. Observe 14-day stability window on main branch with required checks:
   - `npm run canonical:check:sitewide`
   - `npm run ai-paths:check:canonical`
   - `npm run observability:check`
2. Review all `retain-breakglass` scripts and reclassify each to:
   - `retain-breakglass` (with renewed expiry),
   - `archive-history`, or
   - `remove-obsolete`.
3. Decide future of migration endpoint:
   - `src/app/api/v2/products/migrate/handler.ts` (keep as breakglass or remove).
4. Publish closeout artifacts:
   - `docs/canonical-closeout-2026-04-17.md`
   - updated `docs/migrations/script-lifecycle-register-2026-04-17.md`

Exit criteria:

1. 14 consecutive days with zero canonical guard failures on main.
2. Zero open runtime compatibility debt items.
3. Script lifecycle register finalized with explicit ownership and review dates.

## Domain Workboard (Open Items)

| Domain | Open Items | Decision Required |
| --- | --- | --- |
| AI Paths | naming-only compatibility channel cleanup | direct rename + guard token update |
| Products | hook wrappers, model fallback behavior, migrate endpoint disposition | hard-cut vs resilience fallback classification |
| Integrations | query/cache compatibility wrappers | callsite migration then delete wrappers |
| Case Resolver | legacy-named mapper identifier | canonical rename only |
| Filemaker | runtime compatibility options in normalizer | contract hard-cut decision |

## Governance

1. Weekly 30-minute canonical review until April 17, 2026.
2. Every backlog item must have one domain owner and one target PR.
3. Any temporary compatibility behavior requires same-PR exception registration with sunset date.
4. Expired exceptions are release blockers.

## Required Checks Per PR

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration:prisma`
5. `npm run test:integration:mongo`
6. `npm run canonical:check:sitewide`
7. `npm run ai-paths:check:canonical`
8. `npm run observability:check`

## Success Metrics

1. `compatibility_debt_open_count = 0`
2. `active_exception_count = 0` (or all valid and unexpired)
3. `canonical_guardrail_failures_on_main = 0` for the stabilization window
4. `retain-breakglass_count` decreases from `10` after closeout review
5. No sustained increase in unsupported-shape runtime errors post hard-cut

## Risks and Mitigations

1. Hidden clients still send legacy payloads.
   - Mitigation: stage rollout, monitor validation telemetry, keep controlled rollback path.
2. Over-pruning scripts reduces recovery options.
   - Mitigation: explicit lifecycle register with owner and review date for each script.
3. Ambiguous fallback behavior (resilience vs compatibility) causes regressions.
   - Mitigation: domain-owner sign-off for each high-severity backlog item.

## Acceptance Criteria

1. All open items in `docs/canonical-prune-backlog-2026-03-05.csv` are resolved or explicitly accepted with rationale.
2. `scripts/canonical/check-sitewide.mjs` enforces current canonical artifact mapping without stale date pinning.
3. Exception register remains empty or fully compliant.
4. Closeout report and script lifecycle register are published by 2026-04-17.
