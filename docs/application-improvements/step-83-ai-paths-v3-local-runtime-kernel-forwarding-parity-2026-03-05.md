# Step 83 Execution: v3 Local Runtime-Kernel Forwarding Parity

Date: 2026-03-05

## Objective

Eliminate client/server runtime asymmetry where local canvas execution ignored path-level runtime-kernel config passed from AI-Paths settings state.

## Implemented

1. Local runtime-kernel forwarding in local execution loop:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/segments/useLocalExecutionLoop.ts`
   - Added runtime-kernel config normalization for local execution:
     - mode normalization (deprecated legacy-mode alias -> `auto`)
     - pilot node type parsing (array/JSON/comma-delimited)
     - resolver ID parsing (array/JSON/comma-delimited)
     - strict native registry parsing (`strictNativeRegistry` and legacy alias `strictCodeObjectRegistry`)
   - Forwarded normalized values to `evaluateGraphClient(...)`:
     - `runtimeKernelMode`
     - `runtimeKernelPilotNodeTypes`
     - `runtimeKernelCodeObjectResolverIds`
     - `runtimeKernelStrictNativeRegistry`

2. Local runtime types alignment:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/types.ts`
   - Added `runtimeKernelConfig?: Record<string, unknown>` to `LocalExecutionArgs`.

3. Regression coverage:
   - `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useLocalExecutionLoop.runtime-kernel.test.ts`
   - Added a hook-level test asserting local execution forwards normalized runtime-kernel options to graph evaluation.

## Validation

1. New local loop runtime-kernel test:
   - `npx vitest run src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useLocalExecutionLoop.runtime-kernel.test.ts`
   - Result: pass.

2. Runtime/canvas/kernel regression subset:
   - `npx vitest run src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsServerExecution.history.test.tsx src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsRuntimeState.test.ts src/features/ai/ai-paths/components/ai-paths-settings/__tests__/AiPathsCanvasView.switching-delete-guard.test.tsx src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
   - Result: pass.

## Outcome

- Local AI-Paths runtime now respects runtime-kernel path config and strict-registry overrides in the same semantic direction as server execution.
- Migration parity risk is reduced for canvas local runs and simulation workflows.
