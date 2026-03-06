# Step 79 Execution: v3 Strict Native Registry Rollout Controls

Date: 2026-03-05

## Objective

Introduce a strict runtime mode for v3 native code-object contracts so native registry gaps fail fast instead of silently falling back to legacy handlers.

## Implemented

1. Runtime option + resolver behavior:
   - `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-types.ts`
     - Added `runtimeKernelStrictNativeRegistry?: boolean` evaluate option.
   - `src/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge.ts`
     - Added `strictNativeRegistry` resolver option.
     - Native adapter entries no longer auto-fallback to legacy bridge when strict mode is enabled.
   - `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts`
     - Added `runtimeKernelStrictNativeRegistry` kernel option.
     - In strict mode, unresolved `code_object_v3` handlers remain `missing` (no legacy fallback).

2. Engine wiring (server + client):
   - `src/shared/lib/ai-paths/core/runtime/engine-server.ts`
     - Added strict resolver variant and env fallback: `AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY`.
     - Propagates strict option into runtime kernel.
   - `src/shared/lib/ai-paths/core/runtime/engine-client.ts`
     - Added strict resolver variant and strict option propagation.

3. Executor settings/env/path precedence + telemetry:
   - `src/shared/lib/ai-paths/core/constants/segments/storage.ts`
     - Added setting key: `ai_paths_runtime_kernel_strict_native_registry`.
   - `src/features/ai/ai-paths/services/path-run-executor.helpers.ts`
     - Added strict-native parsing (`true/false`, `1/0`, `yes/no`, `on/off`).
     - Extended resolved runtime-kernel config + telemetry with strict flag + source.
   - `src/features/ai/ai-paths/services/path-run-executor/index.ts`
     - Reads strict flag from env/path meta/settings with precedence.
     - Passes strict flag into graph evaluation.
     - Persists strict flag and source in runtime-kernel telemetry metadata.

4. Maintenance normalization support:
   - `src/features/ai/ai-paths/server/settings-store.maintenance.ts`
     - Normalizes strict-native setting values to canonical `true` / `false`.

5. Regression coverage:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts`
     - Added strict-mode missing-handler resolution test.
   - `src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts`
     - Added strict-mode no-fallback test for native contract entries.
   - `src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts`
     - Added strict-mode fail-fast integration test for unresolved code-object handler.
   - `src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts`
     - Added strict flag coverage in config resolution + telemetry tests.
   - `src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts`
     - Added env/settings/path precedence assertions for strict flag.
   - `src/features/ai/ai-paths/server/__tests__/settings-store-maintenance.runtime-kernel-settings.test.ts`
     - Added strict setting normalization test.

6. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Added strict-native setting/env documentation and rollout notes.

7. Regenerated docs artifacts:
   - `npm run docs:ai-paths:node-migration:generate` to propagate updated migration workflow/checklists.

## Validation

1. Focused tests:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/node-runtime-kernel.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/node-code-object-v3-legacy-bridge.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/engine-server.runtime-kernel.test.ts src/features/ai/ai-paths/services/__tests__/path-run-executor.helpers.test.ts src/features/ai/ai-paths/services/__tests__/path-run-executor.runtime-kernel-settings.test.ts src/features/ai/ai-paths/server/__tests__/settings-store-maintenance.runtime-kernel-settings.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts src/shared/lib/ai-paths/core/runtime/__tests__/server-native-code-object-registry-coverage.test.ts`
   - Result: pass.

2. Docs regeneration:
   - `npm run docs:ai-paths:node-migration:generate`
   - Result: pass.

3. Canonical gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- v3 runtime now supports a strict native-registry execution mode with explicit precedence and telemetry.
- Native mapping regressions can be surfaced as runtime failures during canary/prod hardening instead of silently reverting to legacy behavior.
- Strict-native behavior is now covered by runtime, executor, settings-maintenance, and docs guardrails.
