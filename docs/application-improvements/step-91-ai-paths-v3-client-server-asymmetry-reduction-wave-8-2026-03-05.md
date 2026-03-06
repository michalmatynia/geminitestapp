# Step 91 Execution: v3 Client/Server Asymmetry Reduction (Wave 8)

Date: 2026-03-05

## Objective

Reduce remaining server-only native node families by enabling `ai_description` and `description_updater` in client runtime with deterministic regression coverage.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime mappings for:
     - `ai_description`
     - `description_updater`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.ai_description.v3`
     - `ai-paths.node-code-object.description_updater.v3`

2. Client-safe handler scaffolding:
   - `engine-client.ts` now defines client-safe handlers for `ai_description` and `description_updater`.
   - `ai_description` uses `aiGenerationApi.generate()` when `entityJson` is present and returns `description_en`.
   - `description_updater` preserves update behavior via `aiGenerationApi.updateProductDescription(...)` when required inputs are present.

3. Asymmetry guardrail and execution coverage update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `ai_description` and `description_updater` from remaining server-only node families assertion.
   - Added positive native execution coverage for:
     - `ai_description` with deterministic mocked generation output.
     - `description_updater` no-input deterministic path (no outbound update call).

4. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated client-native subset and server-only remainder lists.

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (17 tests).

2. Runtime guardrail suites:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
   - Result: pass (32 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- `ai_description` and `description_updater` are now part of the client-native runtime subset.
- Remaining server-only families are now:
  - `agent`, `learner_agent`, `model`, `playwright`
