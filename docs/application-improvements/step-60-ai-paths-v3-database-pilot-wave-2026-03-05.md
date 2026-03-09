---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 60 Execution: AI-Paths v3 Database Pilot Wave

Date: 2026-03-05

## Objective

Continue staged migration to semantic portable runtime by promoting `database` into the v3 pilot strategy with parity coverage and canonical gate enforcement.

## Implemented

1. Runtime-kernel pilot expansion:
   - `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts`
   - Added `database` to `NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`.

2. v3 scaffold contract:
   - `docs/ai-paths/node-code-objects-v3/database.scaffold.json`
   - Added portable code-object scaffold with `code_object_v3` strategy metadata and copy/paste node example.

3. Parity path extension:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Added deterministic `database` node to the transform parity graph and wired:
     - `db_schema -> database` (`schema`)
     - `http -> database` (`query`)
     - `database -> viewer` (`aiPrompt`)
   - Added deterministic `database` parity handler output (`result`, `bundle`, `content_en`, `aiPrompt`).
   - Increased transform test iteration budget (`maxIterations: 60`) to keep expanded graph completion deterministic.

4. Parity evidence + pilot docs sync:
   - `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Added `database` to pilot/parity coverage and refreshed pilot scaffold lists/env examples.

5. Pilot docs/artifacts refreshed:
   - Regenerated v3/migration artifacts (`index.scaffold.json`, `index.json`, `contracts.json`, `migration-index.json`, `MIGRATION_GUIDE.md`, per-node migration sheets).

## Validation

1. Migration docs/contracts generation:
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

2. Pilot parity:
   - `npm run test:ai-paths:v3-pilot-parity`
   - Result: pass.

3. Parity-evidence regression:
   - `npm run test:ai-paths:node-migration-parity-evidence`
   - Result: pass.

4. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Migration snapshot now reports:
  - `strategyTotals`: `compatibility=6`, `code_object_v3=30`
  - `averageScore`: `81`
  - top blockers: `rollout_not_approved`, `missing_v3_scaffold`, `not_in_v3_pilot`
- Remaining legacy node types: `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `learner_agent`, `playwright`.

Database is now part of the parity-backed portable pilot wave and protected by canonical gates.
