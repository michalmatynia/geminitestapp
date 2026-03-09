---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 84 Execution: v3 Runtime-Kernel Path Extension Canonicalization

Date: 2026-03-05

## Objective

Extend AI-Paths maintenance normalization so legacy runtime-kernel aliases embedded in per-path config payloads are migrated to canonical extension fields (UI-native, no workflow hardcoding).

## Implemented

1. Maintenance normalization for path config entries:
   - `src/features/ai/ai-paths/server/settings-store.maintenance.ts`
   - Extended `normalize_runtime_kernel_mode` action to also inspect `ai_paths_config_*` records.
   - Added canonicalization for `extensions.runtimeKernel`:
     - `mode`: deprecated legacy-mode alias -> `auto`
     - `pilotNodeTypes`: canonical token array normalization
     - `resolverIds -> codeObjectResolverIds` canonical alias migration
     - `strictCodeObjectRegistry -> strictNativeRegistry` canonical alias migration
     - strict native registry normalization from boolean/string inputs.

2. Pending-action detection parity:
   - Normalization pending-count now includes path-config runtime-kernel alias drift, not only global settings keys.

3. Regression tests:
   - `src/features/ai/ai-paths/server/__tests__/settings-store-maintenance.runtime-kernel-settings.test.ts`
   - Added test cases for:
     - pending action surfaced from legacy path extension payloads
     - canonical output for migrated path runtime-kernel extension payloads

## Validation

1. Maintenance suite:
   - `npx vitest run src/features/ai/ai-paths/server/__tests__/settings-store-maintenance.runtime-kernel-settings.test.ts`
   - Result: pass.

2. Runtime-kernel regression subset:
   - `npx vitest run src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useLocalExecutionLoop.runtime-kernel.test.ts`
   - Result: pass.

## Outcome

- Runtime-kernel migration now canonicalizes both global settings and path-level extension payloads through the same maintenance action.
- Legacy alias payloads are normalized before runtime execution, reducing client/server behavior drift during kernel migration.
