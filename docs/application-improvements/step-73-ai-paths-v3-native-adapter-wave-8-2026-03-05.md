---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 73 Execution: v3 Native Adapter Wave 8

Date: 2026-03-05

## Objective

Complete the native adapter rollout across all v3 pilot node code objects so execution binding is fully contract-native.

## Implemented

1. Native adapter wave promotion:
   - Updated v3 scaffolds to `runtimeKernel.executionAdapter: "native_handler_registry"` for:
     - `agent`
     - `ai_description`
     - `api_advanced`
     - `audio_oscillator`
     - `audio_speaker`
     - `learner_agent`
     - `playwright`
     - `simulation`

2. Runtime native registry expansion (server):
   - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
   - Added native code-object mappings for:
     - `ai-paths.node-code-object.agent.v3`
     - `ai-paths.node-code-object.ai_description.v3`
     - `ai-paths.node-code-object.api_advanced.v3`
     - `ai-paths.node-code-object.audio_oscillator.v3`
     - `ai-paths.node-code-object.audio_speaker.v3`
     - `ai-paths.node-code-object.learner_agent.v3`
     - `ai-paths.node-code-object.playwright.v3`
     - `ai-paths.node-code-object.simulation.v3`

3. Regression coverage updates:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts`
     - Added runtime-kernel test for `audio_oscillator` contract resolution path.
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
     - Updated `model` contract expectation to native-first resolution semantics.

4. Docs updates:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Native pilot set reference now includes all pilot node types.

5. Artifact regeneration:
   - Regenerated v3 index/contracts plus migration docs artifacts.

## Validation

1. Runtime tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-core.edge-sanitization.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
   - Result: pass.

2. Artifact generation:
   - `npm run docs:ai-paths:node-code-v3:generate`
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Execution adapter distribution is now fully native:
  - `native_handler_registry`: 36
  - `legacy_handler_bridge`: 0
- Contract-backed v3 pilot execution no longer depends on legacy adapter declarations.
- Guardrail checks and runtime tests remain green after full conversion.
