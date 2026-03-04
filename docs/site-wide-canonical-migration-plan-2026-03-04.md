# Site-Wide Canonical Migration Plan (2026-03-04)

Date: 2026-03-04  
Owner: Platform + feature maintainers (Products, Integrations, AI Paths, AI Brain, Case Resolver, CMS)

## Objective

Move all runtime surfaces to the newest canonical contracts and remove remaining legacy-compatibility behavior, while preserving controlled migration tooling for persisted data.

This plan extends the completed wave log in `docs/canonical-migration-inventory-2026-03-04.md` and defines the next site-wide hardening program.

## Execution Status (2026-03-04)

Wave 0 scaffolding started and delivered:

1. Canonical matrix published:
   - `docs/canonical-contract-matrix-2026-03-04.md`
2. Exception register published:
   - `docs/legacy-compatibility-exception-register-2026-03-04.json`
   - `docs/legacy-compatibility-exception-register-2026-03-04.md`
3. Site-wide guardrail check added:
   - `scripts/canonical/check-sitewide.mjs`
   - npm script: `canonical:check:sitewide`
   - CI job: `canonical-sitewide` in `.github/workflows/test-matrix.yml`
   - `test:ci` now includes `canonical:check:sitewide`

Wave 1 execution kickoff started:

1. Dry-run verification runner added:
   - `scripts/db/prepare-wave1-dry-run-verification.mjs`
2. Wave 1 dry-run runbook + report template added:
   - `docs/migrations/wave1-dry-run-verification-2026-03-04.md`
   - `docs/migrations/wave1-report-template.json`
3. npm entrypoints added:
   - `wave1:verify:prepare`
   - `wave1:verify:dry-run`
4. Local dry-run verification executed:
   - report: `docs/migrations/reports/wave1-dry-run-local.json`
   - result: `10` success / `0` failed (AI Paths config contract timeout fixed; command now exits cleanly)

## Baseline (Current State)

Completed: major canonicalization waves across AI Paths, Case Resolver, Observability, Validation, Folder Tree/CMS, Integrations, Prompt Exploder, and token/credential storage.

Remaining candidate compatibility surfaces (runtime or repo hygiene) identified by source scan:

1. Legacy API deprecation gateway still active:
   - `src/proxy.ts` (`/api/products` -> `410` with successor metadata)
2. Compatibility API behavior still exposed:
   - `src/app/api/v2/integrations/imports/base/handler.ts` (explicit legacy `action=import` rejection path)
   - `src/app/api/v2/products/metadata/handler.ts` (compatibility response fields tested in `handler.compat.test.ts`)
3. Legacy payload parsing still accepted in runtime:
   - `src/shared/lib/ai-brain/settings.ts` (`parseBrainProviderCatalog` merges legacy pool-shaped payloads)
4. Migration-only code still under runtime source tree (`src/`) and imported by scripts:
   - `src/features/integrations/services/imports/parameter-import/link-map-preference-migration.ts`
   - `src/features/integrations/services/export-warehouse-preference-migration.ts`
   - `src/features/case-resolver/workspace-detached-contract-migration.ts`
5. Potentially dead/parallel legacy API utility layer:
   - `src/features/products/api/versioning.ts`
   - `src/features/products/api/routes/v2-products-route.ts`
6. Repo hygiene leftovers:
   - empty route dirs (for example `src/app/api/import`, `src/app/api/catalogs/assign`, `src/app/api/ai-paths/legacy-compat/counters`)

## Scope Rules

In scope:
- Compatibility paths that accept, transform, or branch on legacy contract shapes.
- Compatibility API aliases/deprecation shims.
- Migration-only modules that should not live in runtime import surfaces.
- Dead compatibility artifacts (empty dirs, stale exports, stale tests).

Out of scope:
- Reliability fallbacks unrelated to legacy contracts (timeouts, retries, provider failover for availability).
- External third-party version labels that are current API requirements (for example vendor media-type versions).

## Program Structure

## Wave 0: Contract Freeze + Inventory Lock (1-2 days)

Goals:
- Freeze canonical targets per domain.
- Prevent new compatibility drift while migration proceeds.

Actions:
1. Publish canonical contract matrix (API path, payload shape, setting key, schema id) by domain.
2. Add a single “legacy compatibility exception” register with explicit expiry date.
3. Require all new fallback logic PRs to classify as either:
   - resilience fallback (allowed), or
   - legacy compatibility fallback (blocked unless exception approved).
4. Wire Wave 0 enforcement check:
   - `npm run canonical:check:sitewide`
   - validates required docs artifacts and exception-token scoping in runtime source.

Exit criteria:
- Canonical matrix approved.
- Compatibility exception register present and owned.
- Site-wide canonical scaffold check is CI-blocking.

## Wave 1: Data Canonicalization Verification (3-5 days)

Goals:
- Ensure persisted data no longer needs runtime compatibility readers.

Actions:
1. Run migration scripts in all target environments in dry-run then write mode (where needed):
   - `npm run products:normalize:v2`
   - `npm run migrate:ai-paths:config-contract:v2`
   - `npm run migrate:base-import-parameter-link-map:v2`
   - `npm run migrate:base-export-warehouse-preferences:v2`
   - `npm run migrate:base-connection-token-storage:v2`
   - `npm run migrate:base-token-encryption:v2`
   - `npm run migrate:tradera-api-credential-storage:v2`
   - `npm run migrate:tradera-api-user-id-storage:v2`
   - `npm run migrate:case-resolver:workspace-detached-contract:v2`
   - `npm run migrate:cms:page-builder-template-settings:v2`
2. Store dry-run/apply reports per environment.
3. Add a migration verification summary table to docs for each environment (scanned, changed, applied, blocked).

Exit criteria:
- No blocking legacy payload detections in active environments.
- Migration reports archived and linked.

## Wave 2: Runtime Compatibility Hard-Cut (1 sprint)

Goals:
- Remove remaining runtime compatibility adapters and keep canonical-only runtime behavior.

Actions:
1. Products API deprecation endgame:
   - retire `/api/products` compatibility gateway in `src/proxy.ts` once consumer usage is zero for agreed window.
2. Products metadata contract hard-cut:
   - remove compatibility-only response aliases/fields if clients no longer depend on them.
   - replace `handler.compat.test.ts` with canonical contract tests.
3. Integrations imports root cleanup:
   - narrow `src/app/api/v2/integrations/imports/base/handler.ts` to canonical actions only; remove legacy-branch handling once callers are clean.
4. AI Brain provider catalog strict mode:
   - stop accepting legacy pool-shaped payloads in `parseBrainProviderCatalog`.
   - accept canonical `entries` only; fail fast with migration guidance.

Exit criteria:
- Runtime no longer accepts legacy payload shapes in targeted areas.
- Compatibility tests replaced by canonical-only assertions.

## Wave 3: Source Tree Prune + Runtime Boundary Cleanup (3-5 days)

Goals:
- Remove or relocate migration-only code from runtime source tree.

Actions:
1. Move migration-only helpers from `src/features/**` to `scripts/db/lib/**`:
   - link-map preference migration helper
   - export-warehouse preference migration helper
   - case-resolver detached-contract migration helper
2. Keep runtime modules importing canonical parsers only.
3. Remove dead parallel API layer if confirmed unused:
   - `src/features/products/api/versioning.ts`
   - `src/features/products/api/routes/v2-products-route.ts`
4. Delete empty/stale legacy directories.

Exit criteria:
- No script-only migration helper remains in runtime import graph.
- Dead compatibility files/dirs removed.

## Wave 4: Guardrails and CI Enforcement (3-5 days)

Goals:
- Prevent reintroduction of compatibility paths after cutover.

Actions:
1. Extend canonical guard scripts beyond AI Paths/Observability to:
   - Products API compatibility tokens
   - Integrations legacy action tokens
   - AI Brain legacy provider-catalog keys
2. Add targeted assertions for empty legacy route namespaces.
3. Keep parity tests for migrated v2 routes and expand where missing.
4. Ensure CI runs canonical guards and parity suites on every PR:
   - `npm run ai-paths:check:canonical`
   - `npm run observability:check`
   - parity/legacy-token test suites (unit project)

Exit criteria:
- CI blocks on canonical violations in all targeted domains.
- No bypass-only local checks.

## Wave 5: Rollout, Monitoring, and Final Legacy Removal (1 release window)

Goals:
- Complete hard cutover safely and verify stability.

Actions:
1. Deploy runtime cuts behind release sequencing (non-flagged final state).
2. Monitor:
   - API error rates (`400/410` migration errors)
   - legacy payload rejection counters
   - migration script residual findings
3. After stable window, delete temporary diagnostics and migration-only compatibility counters.

Exit criteria:
- Legacy-format traffic remains at zero across release window.
- Final compatibility register entries closed.

## Verification Checklist

Required after each wave:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration:prisma`
5. `npm run test:integration:mongo`
6. `npm run ai-paths:check:canonical`
7. `npm run observability:check`

Targeted migration checks:

1. `npm run products:normalize:v2` (dry-run baseline)
2. rerun with `-- --write` only when approved by environment owner
3. rerun relevant `migrate:*:v2` scripts in dry-run then write mode

## Risks and Mitigations

1. Risk: hidden clients still depend on legacy API responses.
   - Mitigation: usage telemetry + staged removal + explicit migration-error payloads.
2. Risk: strict parser cutover causes sudden settings rejection.
   - Mitigation: complete Wave 1 verification before Wave 2 hard-cut.
3. Risk: migration helpers moved out of `src/` break scripts.
   - Mitigation: add script-level tests for relocated helper modules before deleting old paths.
4. Risk: compatibility code reintroduced during feature work.
   - Mitigation: token guardrails + CI blocking checks.

## Program Acceptance Criteria

1. Runtime accepts canonical contracts only for all in-scope surfaces.
2. Migration-only compatibility logic is isolated to scripts, not runtime modules.
3. Legacy route aliases/deprecation gateways are removed after telemetry-confirmed sunset.
4. CI enforces canonical posture across AI Paths, Products, Integrations, and AI Brain.
5. Documentation reflects canonical-only runtime behavior and archived migration evidence.
