---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Wave Execution Status (2026-03-05)

Date: 2026-03-05  
Scope: execution update for `docs/plans/site-wide-canonical-migration-plan-2026-03-05.md`

This file is the retained March 5 execution snapshot for the initial hard-cut
run. For ongoing stabilization, script reclassification, and final publication
status, use
[`wave-execution-status-2026-04-17.md`](./wave-execution-status-2026-04-17.md),
[`stabilization-window-2026-04-17.md`](./stabilization-window-2026-04-17.md),
and [`docs/plans/canonical-closeout-2026-04-17.md`](../plans/canonical-closeout-2026-04-17.md).

## Executed Today

## Wave A

Completed artifacts:

1. `docs/decisions/canonical-contract-matrix-2026-03-05.md`
2. `docs/decisions/legacy-compatibility-exception-register-2026-03-05.md`
3. `docs/decisions/legacy-compatibility-exception-register-2026-03-05.json`

Current exceptions:

- `0` active exceptions.

## Wave B

Completed outputs:

1. Runtime compatibility candidate scan executed (`legacy/compat/deprecated/fallback` marker sweep).
2. Triaged backlog published:
   - `docs/canonical-prune-backlog-2026-03-05.csv`

Backlog status snapshot:

- Open compatibility-debt candidates: `0`
- Accepted false positives: `2`
- Completed in this execution: `14`

## Wave C

Verification runner status:

1. `npm run wave1:verify:prepare` -> success.
2. `npm run wave1:verify:dry-run` -> success (`10/10`).
3. `npm run wave1:verify:write` -> success (`10/10`).
4. Post-hard-cut rerun (same date) confirmed unchanged pass state:
   - `npm run wave1:verify:prepare` -> success (`pending=10` pre-run baseline).
   - `npm run wave1:verify:dry-run` -> success (`10/10`).
   - `npm run wave1:verify:write` -> success (`10/10`).

Execution note:

- Initial sandboxed runs failed due TSX IPC permission (`listen EPERM .../tsx-...pipe`).
- Re-runs outside sandbox restrictions succeeded.

Migration result summary (local report):

- Aggregate changes/writes were `0` for executed write-mode migrations.
- Historical wave1 provider report artifacts were removed during the Mongo-only cleanup.

Script lifecycle output:

- `docs/migrations/script-lifecycle-register-2026-03-05.md`

## Wave D

Completed runtime prune items:

1. Migrator helpers moved from runtime tree to script-only tree:
   - `src/features/integrations/services/base-token-storage-migration.ts`
   - `src/features/integrations/services/base-token-encryption-migration.ts`
   - `src/features/integrations/services/tradera-api-credential-storage-migration.ts`
   - `src/features/integrations/services/tradera-api-user-id-storage-migration.ts`
   - `src/features/integrations/services/imports/base-import-run-connection-migration.ts`

New script-only locations:

1. `scripts/db/lib/integrations/base-token-storage-migration.ts`
2. `scripts/db/lib/integrations/base-token-encryption-migration.ts`
3. `scripts/db/lib/integrations/tradera-api-credential-storage-migration.ts`
4. `scripts/db/lib/integrations/tradera-api-user-id-storage-migration.ts`
5. `scripts/db/lib/integrations/base-import-run-connection-migration.ts`

Additional hardening completed:

1. Migration scripts now import these helpers from `scripts/db/lib/integrations/*`.
2. Unit tests were rewired to import from script-only helper paths.
3. `scripts/canonical/check-sitewide.mjs` now forbids reintroduction of these runtime helper files.
4. Removed runtime compatibility wrapper files:
   - `src/features/products/hooks/useMetadata.ts`
   - `src/features/products/hooks/useCatalogQueries.ts`
   - `src/features/integrations/hooks/integrationCache.ts`
   - `src/features/integrations/hooks/listingCache.ts`
5. Rewired affected callsites to canonical query keys/invalidation helpers:
   - `src/features/integrations/hooks/useIntegrationQueries.ts`
   - `src/features/integrations/hooks/useIntegrationMutations.ts`
6. Applied naming-channel cleanup:
   - `src/shared/lib/ai-paths/api/client.ts` (removed compatibility-layer section wording)
   - `src/features/case-resolver/hooks/useCaseResolverState.requested-context.ts` (renamed legacy-status mapper to canonical naming)
7. Extended canonical site-wide guardrail to block reintroduction of removed wrapper files.
8. Removed AI Paths model fallback compatibility behavior in product worker runtime:
   - `src/features/products/workers/product-ai-processors.ts`
   - `src/features/products/workers/__tests__/product-ai-processors.graph-model.test.ts`
9. Removed Filemaker runtime normalization compatibility flags and kept persistence stripping explicit:
   - `src/features/filemaker/filemaker-settings.database.ts`
   - `src/features/filemaker/settings/database-getters.ts`
   - `src/features/filemaker/__tests__/settings.test.ts`

## Wave E

Completed:

1. Canonical artifacts refreshed and aligned in docs.
2. Guardrail checks validated in current state:
   - `npm run canonical:check:sitewide` passed.
   - `npm run ai-paths:check:canonical` passed.
   - `npm run observability:check` passed.
3. Removed products migration runtime endpoint surface:
   - `src/app/api/v2/products/migrate/handler.ts`
   - `src/app/api/v2/products/migrate/route.ts`
4. Added regression guard test to keep endpoint removed:
   - `__tests__/api/products/migration.test.ts`
5. Additional verification gates executed on current baseline:
   - `npm run test:unit` passed (`738` files, `3703` tests).
   - `npm run typecheck` passed.
   - `npm run test:integration:mongo` passed (`9` files + `1` skipped guard file).
   - `npm run test:integration:mongo:canonical-shape-guard` passed (`1/1`).
   - `npm run test:ai-paths:signal-flow-regression` passed (`4` files, `22` tests).
6. Full CI-equivalent aggregate gate passed:
   - `npm run test:ci` passed (`test:unit` reported `741` files, `3710` tests in this run).

## Wave F

In progress:

1. Stabilization observation window is required before final closeout.
2. Closeout draft artifact created:
   - `docs/plans/canonical-closeout-2026-04-17.md`
3. Final publication remains targeted for 2026-04-17.
