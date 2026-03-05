# Step 81 Execution: v3 Canvas Strict Native Registry Controls

Date: 2026-03-05

## Objective

Complete strict-native rollout controls by exposing and hardening `strict_native_registry` behavior in AI-Paths Canvas runtime controls.

## Implemented

1. Canvas strict control wiring and persistence hardening:
   - `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx`
   - Global runtime-kernel settings now load/persist `ai_paths_runtime_kernel_strict_native_registry`.
   - Path runtime-kernel settings support strict override in `extensions.runtimeKernel.strictNativeRegistry`.
   - Added compatibility read for legacy alias `strictCodeObjectRegistry` in path extensions.

2. Runtime-control regression coverage:
   - `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/AiPathsCanvasView.switching-delete-guard.test.tsx`
   - Added/updated assertions for strict mode source visibility:
     - global strict from persisted settings
     - path strict override taking precedence
   - Added compatibility coverage for legacy path alias (`strictCodeObjectRegistry`).
   - Ensured path settings persistence preserves strict override in saved runtime-kernel config.

3. Documentation alignment:
   - `docs/ai-paths/node-code-objects-v3.md`
   - `docs/ai-paths/node-code-objects-v3/README.md`
   - Updated runtime-control notes to reflect that strict mode is now configurable from Canvas controls (global + path override), not API/env only.
   - Updated next-step list to remove completed strict-control item.

## Validation

1. Canvas runtime-kernel unit tests:
   - `npx vitest run src/features/ai/ai-paths/components/ai-paths-settings/__tests__/AiPathsCanvasView.switching-delete-guard.test.tsx`
   - Result: pass.

2. Canonical AI-Paths gate:
   - `npm run ai-paths:check:canonical`
   - Result: pass.

## Outcome

- Strict native-registry runtime behavior is now operable from Canvas runtime controls with persisted global settings and path-level override support.
- Legacy path metadata alias handling prevents regression for older stored configs.
- Documentation and tests now reflect and guard this rollout stage.
