---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 89 Execution: v3 Client/Server Asymmetry Reduction (Wave 6)

Date: 2026-03-05

## Objective

Reduce remaining server-only native node families by enabling `api_advanced` in client runtime with deterministic regression coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mapping for:
     - `api_advanced`
   - Added native code-object ID:
     - `ai-paths.node-code-object.api_advanced.v3`

2. Asymmetry guardrail and execution coverage update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `api_advanced` from remaining server-only node families assertion.
   - Added positive native execution coverage for `api_advanced` via missing-URL route (deterministic no-network path), asserting `route=missing_url`, `success=false`, and no fetch calls.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (14 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `api_advanced` is now part of the client-native runtime subset with deterministic regression coverage.
- Remaining server-only families are now:
  - `agent`, `ai_description`, `database`, `description_updater`, `learner_agent`, `model`, `playwright`
