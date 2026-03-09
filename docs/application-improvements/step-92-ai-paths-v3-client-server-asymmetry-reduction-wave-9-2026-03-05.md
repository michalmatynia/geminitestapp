---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 92 Execution: v3 Client/Server Asymmetry Reduction (Wave 9)

Date: 2026-03-05

## Objective

Reduce remaining server-only native node families by enabling `playwright` in client runtime with deterministic regression coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mapping for:
     - `playwright`
   - Added native code-object ID:
     - `ai-paths.node-code-object.playwright.v3`

2. Asymmetry guardrail and execution coverage update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `playwright` from remaining server-only node families assertion.
   - Added deterministic native execution coverage for `playwright` using an empty-script config path, asserting:
     - no Playwright enqueue/poll calls,
     - node output includes `status=failed` with `Playwright script is empty.` error bundle.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (18 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `playwright` is now part of the client-native runtime subset with deterministic regression coverage.
- Remaining server-only families are now:
  - `agent`, `learner_agent`, `model`
