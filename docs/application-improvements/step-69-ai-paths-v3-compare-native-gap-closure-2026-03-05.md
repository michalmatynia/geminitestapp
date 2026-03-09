---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 69 Execution: v3 Compare Native Gap Closure

Date: 2026-03-05

## Objective

Close a runtime robustness gap discovered during native migration:

1. `compare` existed in v3 contracts/pilot but lacked runtime handler mapping.
2. Promote `compare` to native adapter and verify execution.

## Implemented

1. Runtime handler map fix:
   - Added `compare` node type mapping in:
     - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
     - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Mapped to `handleCompare`.

2. Native code-object registry expansion:
   - Added native mapping:
     - `ai-paths.node-code-object.compare.v3`
   - In both server and client runtime native registries.

3. v3 scaffold promotion:
   - Updated:
     - `docs/ai-paths/node-code-objects-v3/compare.scaffold.json`
   - `runtimeKernel.executionAdapter` set to `native_handler_registry`.

4. Runtime regression test:
   - Updated:
     - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts`
   - Added scenario executing `constant -> compare` through default contract resolver bridge.

5. Docs updates:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Native adapter pilot list now includes `compare`.

6. Artifact regeneration:
   - Regenerated v3 contracts/index and migration docs artifacts.

## Validation

1. Runtime tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Artifact generation:
   - `npm run docs:ai-paths:node-code-v3:generate`
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `compare` is now executable via runtime handlers and covered in native adapter routing.
- This removes a latent mismatch between v3 contracts and runtime handler availability.
- All docs/contracts/migration/test guardrails remain green.
