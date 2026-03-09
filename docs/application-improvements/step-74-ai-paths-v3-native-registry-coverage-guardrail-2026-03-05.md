---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 74 Execution: v3 Native Registry Coverage Guardrail

Date: 2026-03-05

## Objective

Add a regression guardrail that enforces alignment between v3 contract-native adapter declarations and server runtime native handler registry wiring.

## Implemented

1. Runtime export for guardrail introspection:
   - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
   - Added `SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS` export (sorted, frozen IDs).

2. New regression test:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts`
   - Validates every `native_handler_registry` code object ID from `docs/ai-paths/node-code-objects-v3/contracts.json` is represented in server runtime native registry without drift.

## Validation

1. Targeted runtime tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- v3 native contract declarations and server runtime native registry are now explicitly locked by automated test coverage.
- Full native adapter state (`36 / 36`) is protected from silent mapping regressions.
