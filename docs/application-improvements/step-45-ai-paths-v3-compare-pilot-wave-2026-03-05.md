---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 45 Execution: AI-Paths v3 Compare Pilot Wave

Date: 2026-03-05

## Objective

Continue staged migration to semantic portable runtime by promoting `compare` into the v3 pilot strategy with parity coverage and canonical gate enforcement.

## Implemented

1. Runtime-kernel pilot expansion:
   - `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts`
   - Added `compare` to `NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`.

2. v3 scaffold contract:
   - `docs/ai-paths/node-code-objects-v3/compare.scaffold.json`
   - Added portable code-object scaffold with `code_object_v3` strategy metadata and copy/paste node example.

3. Parity path extension:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Inserted `compare` node into transform pilot path (`gate -> mutator -> compare -> regex`).
   - Added compare parity handler and updated transform node-event assertions.
   - Raised transform parity harness `maxIterations` to `20` to preserve parity coverage as pilot-chain depth grows.

4. Parity evidence update:
   - `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
   - Added `compare` to `v3-pilot-parity-core` node coverage.

5. Pilot docs/artifacts refreshed:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Regenerated v3/migration artifacts (`index.scaffold.json`, `index.json`, `contracts.json`, `migration-index.json`, `MIGRATION_GUIDE.md`, `nodes/compare.md`).

## Validation

1. Pilot parity:
   - `npm run test:ai-paths:v3-pilot-parity`
   - Result: pass.

2. Parity-evidence regression:
   - `npm run test:ai-paths:node-migration-parity-evidence`
   - Result: pass.

3. Migration docs/contracts:
   - `npm run docs:ai-paths:node-migration:generate`
   - `npm run docs:ai-paths:node-migration:check`
   - Result: pass.

4. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- v3 pilot set increased from `12` to `13` node types.
- Migration snapshot now reports:
  - `strategyTotals`: `compatibility=23`, `code_object_v3=13`
  - `averageScore`: `55`
  - top blockers: `missing_v3_scaffold`, `not_in_v3_pilot`, `rollout_not_approved`

Compare is now part of the parity-backed portable pilot wave and protected by canonical gates.
