---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 65 Execution: v3 Native Adapter Pilot Wave

Date: 2026-03-05

## Objective

Advance the runtime from contract-backed legacy bridge toward native code-object execution by:

1. Supporting a native execution adapter in contract resolution.
2. Piloting native adapter routing on one low-risk node type (`constant`).
3. Keeping legacy fallback and canonical guardrails intact.

## Implemented

1. Extended contract resolver logic:
   - `src/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge.ts`
   - Added `createNodeCodeObjectV3ContractResolver` with adapter-aware dispatch:
     - `legacy_handler_bridge` -> legacy handler bridge.
     - `native_handler_registry` -> native registry resolver, then legacy fallback.
   - Kept `createNodeCodeObjectV3LegacyBridgeResolver` as compatibility wrapper.

2. Wired native registry pilot in runtime engines:
   - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added native registry mapping for:
     - `ai-paths.node-code-object.constant.v3` -> `handleConstant`
   - Default code-object resolver now uses adapter-aware contract resolver + native registry.

3. Promoted v3 scaffold execution adapter for constant:
   - `docs/ai-paths/node-code-objects-v3/constant.scaffold.json`
   - `runtimeKernel.executionAdapter` switched to `native_handler_registry`.
   - Regenerated v3 artifacts and migration docs:
     - `docs/ai-paths/node-code-objects-v3/index.json`
     - `docs/ai-paths/node-code-objects-v3/contracts.json`
     - related migration docs/index artifacts.

4. Added/updated regression coverage:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Added assertions for:
     - native adapter contract metadata
     - native handler preference
     - native-missing legacy fallback
     - legacy adapter behavior unchanged for non-native contracts

5. Hardened v3 docs contract check:
   - `scripts/docs/check-ai-paths-node-code-objects-v3.ts`
   - Added allowlist validation for `executionAdapter`:
     - `legacy_handler_bridge`
     - `native_handler_registry`
   - Enforces scaffold/contracts adapter consistency.

6. Documentation updates:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Added adapter model and current native pilot note.

## Validation

1. Runtime resolver/kernel tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts`
   - Result: pass.

2. Regenerated docs artifacts:
   - `npm run docs:ai-paths:node-code-v3:generate`
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- v3 runtime now supports mixed adapter strategies per contract entry.
- `constant` is the first node type routed through `native_handler_registry`.
- Safety remains unchanged due legacy fallback and strict docs/check guardrails.
