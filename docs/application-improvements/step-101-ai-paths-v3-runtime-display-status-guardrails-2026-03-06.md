---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 101 Execution: v3 Runtime Display-Status Guardrails

Date: 2026-03-06

## Objective

Harden runtime display-status semantics so blocked/waiting transitions remain deterministic and terminal statuses cannot be accidentally settled into completed flow states.

## Implemented

1. Runtime state hook guardrail expansion:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts`
   - Added coverage for:
     - blocked + waiting ports (no reason) maps to `waiting_callback`;
     - blocked + non-missing reason (`missing_prompt`) remains `blocked`;
     - settle does not overwrite terminal node statuses `blocked` and `skipped`.

2. Runtime utils display-status guardrails:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts`
   - Added coverage for:
     - `mergeRuntimeNodeOutputsForStatus` mapping blocked + waiting ports (no reason) to `waiting_callback`;
     - `resolveRuntimeNodeDisplayStatus` mapping blocked + waiting ports (no reason) to `waiting_callback`;
     - `resolveRuntimeNodeDisplayStatus` preserving `blocked` when reason is not `missing_inputs`.

## Validation

1. Focused runtime-state suites:
   - `npx vitest run src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts`
   - Result: pass (23 tests).

2. Expanded signal/runtime regression lane:
   - `npx vitest run src/features/ai/ai-paths/components/__tests__/canvas-board-pulse-effects.test.tsx src/features/ai/ai-paths/components/__tests__/signal-flow-visual-state.test.ts src/features/ai/ai-paths/components/__tests__/canvas-model-selection-badge.test.tsx src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts`
   - Result: pass (91 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Runtime status display transitions are now regression-protected for blocked-vs-waiting boundary conditions.
- Terminal statuses (`blocked`, `skipped`) are explicitly protected from settle-time remapping.
