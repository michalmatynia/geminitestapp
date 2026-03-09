---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 40 Execution: AI-Paths Parity-Evidence Regression Test Lane

Date: 2026-03-05

## Objective

Lock pilot parity-evidence policy with an explicit regression test so pilot-node coverage drift is caught by unit test lanes, not only by docs-check scripts.

## Implemented

1. Added dedicated regression test:
   - `__tests__/scripts/docs/node-migration-parity-evidence.test.ts`
   - Validates:
     - parity-evidence schema/version metadata is valid
     - every node in `NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES` is covered by at least one parity suite

2. Added runnable npm lane:
   - `package.json`
   - Script:
     - `test:ai-paths:node-migration-parity-evidence`

3. Documented the new lane:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`

## Validation

1. New regression lane:
   - `npm run test:ai-paths:node-migration-parity-evidence`
   - Result: pass.

2. Migration/docs gate:
   - `npm run docs:ai-paths:node-migration:check`
   - Result: pass.

## Outcome

Pilot-node parity-evidence coverage is now protected by:
- docs migration checker policy gate
- dedicated unit regression test lane

This reduces the chance of silent pilot-list expansion without matching parity evidence.
