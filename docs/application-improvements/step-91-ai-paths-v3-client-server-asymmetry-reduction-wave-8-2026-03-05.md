# Step 91 Execution: v3 Client/Server Asymmetry Reduction (Wave 8)

Date: 2026-03-05

## Objective

Reduce server-only native runtime asymmetry by enabling `ai_description` and `description_updater` in client runtime for deterministic local-path compatibility.

## Implemented

1. Client runtime native mapping expansion:
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
   - Added client runtime handler mappings for:
     - `ai_description`
     - `description_updater`
   - Added native code-object IDs:
     - `ai-paths.node-code-object.ai_description.v3`
     - `ai-paths.node-code-object.description_updater.v3`

2. Asymmetry guardrail update:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Removed `ai_description` and `description_updater` from remaining server-only node families.
   - Added deterministic client-native execution checks for both node types under missing-input conditions (ensuring stable no-op outputs and no unintended API calls).

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

- `ai_description` and `description_updater` now resolve through client-native parity path.
- Remaining server-only native families are reduced and pinned by guardrails:
  - `agent`, `learner_agent`, `model`, `playwright`
