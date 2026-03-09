---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 58 Execution: AI-Paths v3 Poll Pilot Wave

Date: 2026-03-05

## Objective

Continue staged migration to semantic portable runtime by promoting `poll` into the v3 pilot strategy with parity coverage and canonical gate enforcement.

## Implemented

1. Runtime-kernel pilot expansion:
   - `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts`
   - Replaced `model` with `poll` in `NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES` so pilot coverage aligns with parity/docs artifacts.

2. v3 scaffold contract:
   - `docs/ai-paths/node-code-objects-v3/poll.scaffold.json`
   - Added portable code-object scaffold with `code_object_v3` strategy metadata and copy/paste node example.

3. Parity path extension:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Inserted deterministic `poll` node into transform pilot path (`template -> poll -> prompt`).
   - Added deterministic `poll` parity handler output (`result`, `status`, `jobId`, `bundle`).
   - Removed non-pilot `model` fixture hop from this pilot parity path to keep strategy assertions scoped to pilot node types.

4. Parity evidence update:
   - `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
   - Added `poll` to `v3-pilot-parity-core` node coverage.

5. Pilot docs/artifacts refreshed:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Regenerated v3/migration artifacts (`index.scaffold.json`, `index.json`, `contracts.json`, `migration-index.json`, `MIGRATION_GUIDE.md`, `nodes/poll.md`).

## Validation

1. Pilot parity:
   - `npm run test:ai-paths:v3-pilot-parity`
   - Result: pass.

2. Migration docs/contracts generation:
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Parity-evidence regression:
   - `npm run test:ai-paths:node-migration-parity-evidence`
   - Result: pass.

4. Migration docs/contracts check:
   - `npm run docs:ai-paths:node-migration:check`
   - Result: pass.

5. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- v3 pilot set remains `26` node types, with `poll` now included and parity-backed.
- Migration snapshot now reports:
  - `strategyTotals`: `compatibility=10`, `code_object_v3=26`
  - `averageScore`: `75`
  - top blockers: `rollout_not_approved`, `missing_v3_scaffold`, `not_in_v3_pilot`

Poll is now part of the parity-backed portable pilot wave and protected by canonical gates.
