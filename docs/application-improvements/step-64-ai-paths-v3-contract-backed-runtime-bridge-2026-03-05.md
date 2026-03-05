# Step 64 Execution: v3 Contract-Backed Runtime Bridge

Date: 2026-03-05

## Objective

Continue portable-engine migration by implementing the next runtime stage:

1. Load `code_object_v3` execution routing from v3 contracts.
2. Keep safe fallback to legacy handlers.
3. Add regression coverage for contract-backed bridge resolution.

## Implemented

1. Added v3 contract-backed bridge resolver:
   - `src/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge.ts`
   - Loads and parses `docs/ai-paths/node-code-objects-v3/contracts.json`.
   - Resolves runtime handler only when:
     - `codeObjectId` exists in contracts
     - contract `nodeType` matches runtime node type
     - `runtimeStrategy === "code_object_v3"`
     - `executionAdapter === "legacy_handler_bridge"`
     - `legacyHandlerKey` is present
   - Then bridges to legacy handler via the contract `legacyHandlerKey`.

2. Wired resolver into server runtime kernel:
   - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
   - `createNodeRuntimeKernel` now receives `resolveCodeObjectHandler` from the new bridge.
   - Added `api_advanced` key in server handler registry (while keeping `advanced_api` alias).

3. Added bridge regression tests:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Covers:
     - contract lookup by code object id
     - unknown code object id rejection
     - successful bridge resolution to legacy handler
     - nodeType/codeObjectId mismatch rejection

4. Updated migration docs text:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Documented that server runtime now resolves pilot `code_object_v3` entries via `contracts.json` bridge before fallback.

## Validation

1. Runtime kernel + bridge tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Pilot parity suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.v3-pilot-parity.test.ts`
   - Result: pass.

3. Executor runtime-kernel settings integration:
   - `npx vitest run src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts`
   - Result: pass.

4. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Runtime-kernel v3 path is now contract-backed instead of only inferred by node type.
- Execution remains parity-safe because unresolved or invalid contract mappings still fall back to legacy resolution.
- The bridge stage is now guarded by dedicated regression tests and canonical checks.
