---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 102 Execution: v3 Runtime Status Normalization Contract

Date: 2026-03-06

## Objective

Reduce status-enum drift by introducing a shared runtime-status normalization contract and migrating key runtime-state consumers away from duplicated local status lists.

## Implemented

1. Shared runtime-status contract helpers:
   - `src/shared/contracts/ai-paths-runtime.ts`
   - Added:
     - `AI_PATH_RUNTIME_NODE_STATUS_VALUES`
     - `normalizeAiPathRuntimeNodeStatus(...)`
     - `TERMINAL_RUNTIME_NODE_STATUSES`

2. Runtime state consumer migration:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsRuntimeState.ts`
   - Replaced local status normalization and local terminal/transient sets with shared contract exports:
     - `normalizeAiPathRuntimeNodeStatus`
     - `TERMINAL_RUNTIME_NODE_STATUSES`
     - `TRANSIENT_RUNTIME_NODE_STATUSES`
   - Preserved existing duration semantics via local duration-terminal subset.

3. Runtime utils consumer migration:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts`
   - Replaced local merge-status normalization helper with:
     - `normalizeAiPathRuntimeNodeStatus`

4. New contract-level regression tests:
   - `src/shared/contracts/__tests__/ai-paths-runtime-status.contract-runtime.test.ts`
   - Added coverage for:
     - canonical normalization (`waiting_callback`, `processing`, `skipped`);
     - rejection of non-canonical statuses (`dead_lettered`, empty, null);
     - alignment of terminal/transient sets with canonical status values.

## Validation

1. Focused runtime/contract suites:
   - `npx vitest run src/shared/contracts/__tests__/ai-paths-runtime-status.contract-runtime.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts`
   - Result: pass (26 tests).

2. Expanded signal/runtime regression lane:
   - `npx vitest run src/features/ai/ai-paths/components/__tests__/canvas-board-pulse-effects.test.tsx src/features/ai/ai-paths/components/__tests__/signal-flow-visual-state.test.ts src/features/ai/ai-paths/components/__tests__/canvas-model-selection-badge.test.tsx src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts src/shared/contracts/__tests__/ai-paths-runtime-status.contract-runtime.test.ts`
   - Result: pass (94 tests).

3. Canonical/docs contract checks:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Accepted runtime-node status normalization is now centralized in one shared contract helper.
- Key runtime-state merge/display consumers no longer duplicate canonical status lists.
- Regression protection improved against status-drift across runtime and UI state pipelines.
