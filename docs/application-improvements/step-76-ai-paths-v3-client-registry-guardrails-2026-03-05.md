# Step 76 Execution: v3 Client Registry Guardrails

Date: 2026-03-05

## Objective

Harden client-runtime behavior after full native server conversion by validating contract alignment and preserving server-only node blocking semantics on client execution.

## Implemented

1. Client native registry export:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added `CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS` export (sorted, frozen IDs).

2. New client guardrail tests:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Validates client native code-object IDs are a strict subset of `native_handler_registry` contracts.
   - Verifies server-only node type (`prompt`) remains blocked during client execution path.

## Validation

1. Targeted runtime tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client/runtime contract alignment now has dedicated regression protection.
- Portable v3 native contract model stays coherent across server and client execution boundaries.
