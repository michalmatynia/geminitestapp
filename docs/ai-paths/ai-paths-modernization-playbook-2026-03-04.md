# AI-Paths Modernization Playbook (2026-03-04)

## Goal

Migrate AI-Paths from hybrid monolith+bridge state management to context-native ownership, then prune legacy compatibility layers without breaking canvas editing, drag/drop, and wiring.

## Why this migration is needed

Recent regressions (drop-click disappearance, drag freeze, connector wiring failures) came from dual write paths:

1. Legacy monolith state in `useAiPathsSettingsState`.
2. Context-native state in `CanvasContext`, `GraphContext`, `SelectionContext`, `RuntimeContext`, and peers.
3. Bridge synchronization in `useStateBridge*` and `AiPathsStateBridger`.

The migration objective is one source of truth per domain with no bridge echo/suppression logic in steady state.

## Current inventory

### Canonical (target) domain layers

1. `src/features/ai/ai-paths/context/*Context.tsx`
2. `src/features/ai/ai-paths/context/hooks/useCanvasInteractions*.ts`
3. `src/features/ai/ai-paths/components/canvas-board.tsx`
4. `src/features/ai/ai-paths/components/useCanvasBoardState.ts`

### Legacy compatibility seam (to prune)

1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts`
2. `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger.tsx`
3. `src/features/ai/ai-paths/context/hooks/useStateBridge.ts`
4. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsCanvasInteractions.ts`
5. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasConnection.ts`
6. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasNodeDrag.ts`

### High-risk mixed ownership call sites

1. `src/features/ai/ai-paths/components/AiPathsSettings.tsx`
2. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPageValue.ts`
3. `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsOrchestratorContext.tsx`

## Target architecture

1. Context providers own all mutable graph/canvas/runtime/persistence state.
2. UI hooks read/write through context actions only.
3. `AiPathsSettings` composes views and actions without state mirroring.
4. Bridge hooks are removed from runtime paths and retained only behind short-term migration flags (if needed).

## Session roadmap

## Session status (live)

1. Session 1 - Completed on 2026-03-04.
2. Session 2 - Completed on 2026-03-04.
3. Session 3 - Completed on 2026-03-04.
4. Session 4 - Completed on 2026-03-04.
5. Session 5 - In progress on 2026-03-04.

## Session 1: Baseline + Guardrails

Scope:

1. Freeze new legacy usage.
2. Document deprecation map and cutover order.
3. Keep current runtime stable while regressions are under control.

Deliverables:

1. This playbook.
2. ESLint restrictions that block new imports of bridge/compat APIs outside approved seam files.

Acceptance:

1. Existing behavior unchanged.
2. Lint blocks new bridge usage in feature code.

## Session 2: Canvas/Graph single-writer cutover

Scope:

1. Migrate settings-canvas interactions to context-native hooks.
2. Remove monolith-driven `nodes/edges` writes from canvas interaction layer.

Files (expected):

1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts`
2. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsCanvasInteractions.ts`
3. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasConnection.ts`
4. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasNodeDrag.ts`

Acceptance:

1. Node drag works after drop and after rerender.
2. Connector wire create/reconnect/delete works reliably.
3. No graph echo races in bridge-protected tests.

Progress (2026-03-04):

1. Removed bridge re-exports from `context/index.ts` and `context/hooks/index.ts`.
2. Updated `AiPathsStateBridger.tsx` to import `useStateBridgeAll` directly from `context/hooks/useStateBridge`.
3. Routed `useAiPathsCanvasInteractions` node/edge reads+writes through `GraphContext` so graph mutations use a single writer path.
4. Migrated settings canvas `view`/`panState`/`dragState`/`connecting`/`connectingPos` ownership to `CanvasContext` via adapted settings hooks.
5. Removed redundant legacy graph arguments from `useAiPathsCanvasInteractions` API and updated callsites/tests.
6. Moved settings selection dialog flags (`selectedNodeId`, `configOpen`, `nodeConfigDirty`, `simulationOpenNodeId`) to `SelectionContext` ownership with dispatch-compatible adapters in `useAiPathsSettingsState`.
7. Moved settings runtime payload fields (`runtimeState`, parser/updater samples, path debug snapshots, `lastRunAt`, `lastError`) to `RuntimeContext` ownership with dispatch-compatible adapters.

## Session 3: Selection/Runtime/Persistence ownership cutover

Scope:

1. Move selection/runtime/persistence writes off monolith setters.
2. Collapse dual state updates into context actions.

Files (expected):

1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts`
2. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPageValue.ts`
3. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts`
4. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsRuntime.ts`

Acceptance:

1. Save/load/switch path flows still pass.
2. Runtime diagnostics/history remain correct.
3. No context-to-monolith back-propagation required for active paths.

Progress (2026-03-04):

1. Moved core graph/path state ownership in settings from local `useState` to `GraphContext` via dispatch-compatible adapters in `useCoreSettingsState`.
2. Moved execution mode fields (`executionMode`, `flowIntensity`, `runMode`, `strictFlowMode`) from local settings state to `GraphContext` ownership via adapted `useExecutionSettingsState`.
3. Migrated `useAiPathsRunHistory` UI/streaming state ownership to `RunHistoryContext` and wired context `openRunDetail` handler injection.
4. Migrated runtime `sendingToAi` flag ownership in `useAiPathsRuntime` to `RuntimeContext`.

## Session 4: Bridge shutdown

Scope:

1. Remove `AiPathsStateBridger` from runtime render path.
2. Delete bridge-specific sync logic and path-transition suppression where obsolete.

Files (expected):

1. `src/features/ai/ai-paths/components/AiPathsSettings.tsx`
2. `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger.tsx` (delete)
3. `src/features/ai/ai-paths/context/hooks/useStateBridge.ts` (delete or test-only relocate)
4. `src/features/ai/ai-paths/context/index.ts`
5. `src/features/ai/ai-paths/context/hooks/index.ts`

Acceptance:

1. No production import path uses `useStateBridge*`.
2. Canvas/graph/runtime behavior remains stable under repeated rerenders and path switching.

Progress (2026-03-04):

1. Removed `AiPathsStateBridger` from `AiPathsSettings` runtime render tree.
2. Moved bridge harness usage to test-only helper under `context/__tests__/helpers` and deleted production `AiPathsStateBridger.tsx`.
3. Relocated `useStateBridge.ts` from `context/hooks` to `context/__tests__/helpers/useStateBridge.ts` and updated bridge-focused tests to import test-only bridge helpers.

## Session 5: Orchestrator decomposition

Scope:

1. Split `useAiPathsSettingsState` into context selectors + action modules.
2. Reduce orchestrator surface area to composition and view concerns.

Files (expected):

1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts`
2. `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsOrchestratorContext.tsx`
3. `src/features/ai/ai-paths/components/ai-paths-settings/*`

Acceptance:

1. No monolithic state object required for rendering.
2. Orchestrator context carries composed facades only.

Progress (2026-03-04):

1. Extracted selection/runtime/persistence context-backed state adapters out of `useAiPathsSettingsState` into `hooks/state/useContextSettingsState.ts`, reducing direct context wiring inside the monolithic orchestrator hook.
2. Extracted trigger-button palette enrichment from `useAiPathsSettingsState` into `hooks/usePaletteWithTriggerButtons.ts`.
3. Extracted derived orchestrator view state (`selectedNode`, `pathFlagsById`, autosave label/classes) into `hooks/useAiPathsSettingsDerivedState.ts`.
4. Migrated `useAiPathsPresets` state ownership from local `useState` to `PresetsContext` while preserving existing preset operation APIs for callers.
5. Extracted validation/error orchestration from `useAiPathsSettingsState` into `hooks/useAiPathsErrorState.ts`.
6. Extended `RunHistoryContext` to own run-list projection (`runList`, `runsRefreshing`) plus injectable run-operation facades (`refreshRuns`, `resumeRun`, `cancelRun`, `requeueDeadLetter`).
7. Wired `useAiPathsRunHistory` to publish query-derived run-list state to `RunHistoryContext` and register operation handlers, removing panel-level query coupling.
8. Migrated run-history consumers (`run-history-panel.tsx`, `run-detail-dialog.tsx`, `node-config/dialog/NodeHistoryTab.tsx`) to `RunHistoryContext` actions/state instead of direct orchestrator run-history fields.
9. Updated runtime trace drill-down in `panels/AiPathsRuntimeAnalysis.tsx` to use `RunHistoryContext` actions (`setRunHistoryNodeId`, `setRunFilter`, `openRunDetail`) instead of orchestrator run-history methods.
10. Updated settings page trace inspection helper in `useAiPathsSettingsPageValue.ts` to call `RunHistoryContext` actions for run-history selection/filter/detail opening.

## Session 6: Legacy prune + compatibility cleanup

Scope:

1. Remove dead compatibility helpers and stale tests.
2. Delete deprecated exports and update docs/contracts.

Files (expected):

1. Legacy-only hooks/files identified in sessions 2-5.
2. `docs/AI_PATHS.md` and linked architecture docs.

Acceptance:

1. No runtime code depends on compatibility seam.
2. Legacy files deleted with passing targeted regressions.

Progress (2026-03-04):

1. Added cutover flags for compatibility shutdown:
   1. `AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED` (default `true`) for alias routes.
   2. `AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED` (default `true`) with client fallback `NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED`.
2. Guarded legacy alias route entrypoints (`/api/countries`, `/api/languages`, `/api/currencies`, `/api/price-groups`, `/api/integrations/imports/base` and `[id]` variants) with a shared route-disable assertion.
3. Added settings/trigger compatibility gating for `ai_paths_index_v1`:
   1. Disabled-mode reads now reject explicit legacy key requests and strip legacy key from full settings responses.
   2. Disabled-mode writes reject `ai_paths_index_v1` upserts.
   3. Trigger settings loader now falls back to `ai_paths_index_v1` only when the compatibility flag is enabled.

## Session 7: Release hardening

Scope:

1. Run focused regression, then full quality checks.
2. Capture before/after architecture diffs.

Acceptance:

1. All AI-Paths targeted tests pass.
2. No lint/type regressions.
3. Migration checklist signed off.

## Deprecation map

1. `AiPathsStateBridger.tsx` -> remove after Sessions 2-3 stabilize.
2. `useStateBridge.ts` -> remove when no production consumer remains.
3. `useAiPathsCanvasInteractions.ts` and `hooks/useCanvas*` (settings version) -> replace with context hooks and delete.
4. Monolith state mirror setters (`setNodes`, `setEdges`, `setSelectedNodeId`, etc.) -> replace with domain actions from context.

## Quality gates per session

Run at least:

```bash
npx vitest run src/features/ai/ai-paths/context/__tests__/useCanvasInteractions.connections.race.test.tsx \
  src/features/ai/ai-paths/components/__tests__/canvas-board.connection-wiring.test.tsx \
  src/features/ai/ai-paths/context/__tests__/useCanvasInteractions.nodes.drag-threshold.test.tsx \
  src/features/ai/ai-paths/context/__tests__/state-bridge-drop-click-race.test.tsx
```

And for renderer behavior:

```bash
npx vitest run src/features/ai/ai-paths/components/__tests__/canvas-svg-trigger-node-interactions.test.tsx \
  src/features/ai/ai-paths/components/__tests__/canvas-svg-trigger-node-interaction-regression.test.tsx \
  src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx
```

## Rollback policy

1. Each session lands as an isolated commit.
2. If a session fails runtime checks, revert that session only and keep guardrails/docs.
3. Do not reintroduce bridge usage to patch new issues; fix at the canonical context layer.
