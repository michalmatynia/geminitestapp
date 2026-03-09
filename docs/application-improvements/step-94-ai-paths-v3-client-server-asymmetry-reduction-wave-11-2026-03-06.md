---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 94 Execution: v3 Client/Server Asymmetry Reduction (Wave 11)

Date: 2026-03-06

## Objective

Eliminate the final server-only native node family by enabling `model` in client runtime with deterministic parity coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mapping for:
     - `model`
   - Added native code-object ID:
     - `ai-paths.node-code-object.model.v3`

2. Client-safe model handler path:
   - Added a client-local `handleModel` in `engine-client.ts` using `aiJobsApi.enqueue` (and optional poll path when `waitForResult=true`).
   - Preserved deterministic blocked/skip behavior when prompt input is missing or AI jobs are disabled.

3. Asymmetry guardrail and execution coverage update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `model` from remaining server-only node families assertion.
   - Added positive native execution coverage for prompt-driven `model` enqueue path with mocked `aiJobsApi.enqueue`, asserting queued output and no poll when `waitForResult=false`.
   - Kept an explicit unsupported-node guardrail test using a synthetic unsupported type.

4. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass.

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass.

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `model` is now part of the client-native runtime subset.
- Remaining server-only native families are now:
  - `none`
