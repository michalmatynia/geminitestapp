# Step 87 Execution: v3 Client/Server Asymmetry Reduction (Wave 4)

Date: 2026-03-05

## Objective

Reduce the remaining server-only native node families by enabling `http` in client runtime with safe guardrail coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mapping for:
     - `http`
   - Added native code-object ID:
     - `ai-paths.node-code-object.http.v3`

2. Asymmetry guardrail update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `http` from remaining server-only node families.
   - Added positive native execution coverage for `http` using safe missing-URL execution path (no outbound network dependency).

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Docs contract check:
   - `npm run docs:ai-paths:node-code-v3:check`
   - Result: pass.

## Outcome

- `http` is now in client-native runtime subset with regression coverage.
- Remaining server-only families are reduced again and tracked explicitly by parity guardrails.
