---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 77 Execution: v3 Client Native Coverage Guardrail

Date: 2026-03-05

## Objective

Strengthen client/runtime consistency by ensuring client-supported pilot node types remain mapped to native v3 code-object handlers.

## Implemented

1. Client runtime exports:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added `CLIENT_LEGACY_HANDLER_NODE_TYPES` export (sorted, frozen node types).

2. Expanded client guardrail tests:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added coverage that all client-supported pilot node types with native contracts are represented in `CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS`.

## Validation

1. Targeted runtime tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Client/runtime native mapping coverage for supported pilot nodes is now explicitly guarded.
- Contract migration remains stable across both server and client execution pathways.
