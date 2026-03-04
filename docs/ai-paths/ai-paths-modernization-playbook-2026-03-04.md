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
5. Session 5 - Completed on 2026-03-04.
6. Session 6 - Completed on 2026-03-04.
7. Session 7 - Completed on 2026-03-04.

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
8. Rewired `useAiPathsCanvasInteractions` to compose canonical `context/hooks/useCanvasInteractions` handlers (pointer/drag/pan/connection/edge/view) while preserving settings-specific delete/selection orchestration.
9. Deleted obsolete settings-only canvas hooks and duplicate race test:
   1. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasConnection.ts`
   2. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasNodeDrag.ts`
   3. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/useCanvasView.ts`
   4. `src/features/ai/ai-paths/components/ai-paths-settings/hooks/__tests__/useCanvasConnection.race.test.tsx`

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
11. Removed run-history fields from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload, shrinking orchestrator surface area to non-run-history responsibilities.
12. Updated bridge test helper wiring (`context/__tests__/helpers/AiPathsStateBridger.tsx`) and state-bridge fixture typing to align with the orchestrator contract cleanup.
13. Simplified `useAiPathsRunHistory` into a context-side-effect hook (no return contract), keeping run list/query sync, streaming updates, and run-operation handler registration entirely within `RunHistoryContext` ownership.
14. Removed obsolete run-history sync props/hooks from the test bridge helper (`context/__tests__/helpers/useStateBridge.ts`) and pruned remaining run-history legacy fixture fields from bridge ownership tests.
15. Deleted remaining bridge-only test harness/tests (`context/__tests__/helpers/useStateBridge.ts`, `context/__tests__/helpers/AiPathsStateBridger.tsx`, `state-bridge-*.test.tsx`) and removed the bridge-specific wiring case from `canvas-board.connection-wiring.test.tsx`.

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
   1. `AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED` (default `true`) for alias routes (removed after alias route deletion on 2026-03-04).
   2. `AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED` (default `true`) with client fallback `NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED`.
2. Guarded legacy alias route entrypoints (`/api/countries`, `/api/languages`, `/api/currencies`, `/api/price-groups`, `/api/integrations/imports/base` and `[id]` variants) with a shared route-disable assertion.
3. Added settings/trigger compatibility gating for `ai_paths_index_v1`:
   1. Disabled-mode reads now reject explicit legacy key requests and strip legacy key from full settings responses.
   2. Disabled-mode writes reject `ai_paths_index_v1` upserts.
   3. Trigger settings loader now falls back to `ai_paths_index_v1` only when the compatibility flag is enabled.
4. Added canonical root import route `POST /api/v2/integrations/imports/base` and migrated internal root callers from `/api/integrations/imports/base` to the new `v2` endpoint while keeping legacy route compatibility in place.
5. Added canonical `v2` import subroutes for `parameters`, `sample-product`, `runs`, run actions (`[runId]`, `resume`, `cancel`, `report`), and scoped settings (`[setting]` for `active-template`, `last-template`, `export-warehouse`), then migrated internal data-import/export runtime callers to `/api/v2/integrations/imports/base/*`.
6. Extended legacy-compat guard/counter instrumentation to legacy import subroutes (`/api/integrations/imports/base/[setting]`, `/parameters`, `/sample-product`, `/runs`, `/runs/[runId]`, `/runs/[runId]/resume`, `/runs/[runId]/cancel`, `/runs/[runId]/report`) so shutdown flag behavior applies uniformly across the full legacy import surface.
7. Added v2 imports/base parity test coverage to enforce route-surface parity and block feature-runtime regressions to legacy `/api/integrations/imports/base*` endpoint literals.
8. Decoupled `v2` imports/base `route.ts` files from direct legacy namespace imports by introducing local `handler.ts` modules per route, and extended parity tests to fail on any future `v2 route.ts` import from `@/app/api/integrations/imports/base/*`.
9. Added canonical `v2` exports/base setting route (`/api/v2/integrations/exports/base/[setting]`) and migrated runtime callers from `/api/integrations/exports/base/*` to `/api/v2/integrations/exports/base/*` across integrations, import/export runtime hooks, product sync settings, quick export, and starter workflow assets.
10. Guarded legacy `/api/integrations/exports/base/[setting]` route with compatibility counter+flag checks and added exports/base parity tests to enforce `v2` route coverage plus prevent feature-runtime regressions to legacy `/api/integrations/exports/base*` literals.
11. Added canonical `v2` integration routes for `/with-connections`, `/jobs`, `/queues/tradera`, `/product-listings`, and `/images/sync-base/all`, then migrated active runtime callers (features + shared jobs API) from legacy `/api/integrations/*` endpoints to `/api/v2/integrations/*` equivalents.
12. Guarded legacy aliases for `/api/integrations/with-connections`, `/api/integrations/jobs`, `/api/integrations/queues/tradera`, `/api/integrations/product-listings`, and `/api/integrations/images/sync-base/all` with compatibility counter+flag checks, and added targeted v2 integrations parity tests to block regressions to these legacy endpoint literals/import patterns.
13. Added canonical `v2` routes for `/api/v2/integrations/products/[id]/*` (`base/sku-check`, `base/link-existing`, `export-to-base`, `listings`, and listing actions `delete-from-base`, `purge`, `relist`, `sync-base-images`) and migrated active runtime callers (integrations hooks, jobs API cancellation, quick export flows, starter workflow asset URL) from legacy `/api/integrations/products/*` endpoints.
14. Guarded legacy aliases for `/api/integrations/products/[id]/*` with compatibility counter+flag checks and extended `v2` integrations parity tests to enforce route presence/import boundaries plus block regressions to legacy `/api/integrations/products/*` runtime endpoint literals.
15. Deleted legacy metadata alias route files (`/api/countries`, `/api/languages`, `/api/currencies`, `/api/price-groups` and `[id]` variants), and migrated route-level tests/MSW fixtures to canonical v2 metadata/product-metadata endpoints.
16. Deleted migrated legacy integrations alias route entrypoints (`/api/integrations/imports/base/*`, `/api/integrations/exports/base/[setting]`, `/api/integrations/with-connections`, `/api/integrations/jobs`, `/api/integrations/queues/tradera`, `/api/integrations/product-listings`, `/api/integrations/images/sync-base/all`) and migrated remaining route-level tests/MSW fixtures to canonical `v2` integrations endpoints.
17. Deleted migrated legacy integrations products alias route entrypoints (`/api/integrations/products/[id]/*`) and extended integrations parity tests to assert legacy route-file removal across both selected integrations aliases and product listing action aliases.
18. Added canonical `v2` integrations routes for root + connection management/actions (`/api/v2/integrations`, `/[id]/connections`, `/connections/[id]`, `/connections/[id]/session`, connection test routes, Base/Allegro request routes, Allegro authorize/disconnect) and migrated active runtime callers in integrations hooks/context from legacy `/api/integrations/*` to `/api/v2/integrations/*`.
19. Migrated import/export template callers from legacy `/api/integrations/{import|export}-templates` literals to canonical `/api/v2/templates/{import|export}` endpoints, then extended integrations parity checks to enforce the expanded `v2` route surface and block feature/shared regressions to legacy `/api/integrations/*` literals.
20. Removed legacy compatibility counters API surface (`/api/ai-paths/legacy-compat/counters`), dropped admin queue page polling for legacy counter snapshots, and pruned now-unused legacy counter snapshot contracts/query keys.
21. Deleted migrated legacy integrations connection alias route entrypoints (`/api/integrations`, `/api/integrations/[id]/connections`, `/api/integrations/connections/[id]`, `/api/integrations/connections/[id]/session`, and `/api/integrations/[id]/connections/[connectionId]/*` after canonical v2 route coverage reached parity for callback/base-inventories/base-products too).
22. Pruned dead legacy route-compat internals after alias deletion: removed `legacy-compat/server.ts` + tests, removed `isLegacyCompatRoutesEnabled`/`AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED`, and removed unused legacy counter snapshot helpers plus `compat_route_hit` counter shape.
23. Replaced canonical `v2` integrations connection-management `handler.ts` stubs (`/api/v2/integrations`, connection CRUD/session, connection test/base/allegro actions including callback/base-inventories/base-products) with local handler implementations, and extended parity checks to fail if that migrated handler surface reintroduces direct imports from `@/app/api/integrations/*`.
24. Replaced remaining canonical `v2` integrations `handler.ts` stubs (imports/base, jobs, product-listings, products listing actions, queues/tradera, with-connections, images/sync-base/all) with local handler implementations, and extended parity checks to fail if any `src/app/api/v2/integrations/**/handler.ts` file reintroduces direct imports from `@/app/api/integrations/*`.
25. Deleted the entire legacy integrations handler namespace (`src/app/api/integrations/**`) after moving remaining test imports/helpers to canonical `v2` modules (`__tests__/api/integrations/*`, `__tests__/app/api/integrations/products/*`) and added parity coverage to assert the legacy handler root stays removed.
26. Removed `ai_paths_index_v1` runtime compatibility fallback by deleting `isLegacyPathIndexCompatEnabled` and the `legacy-compat/flags` module, migrating trigger/products/persistence settings loaders to canonical `ai_paths_index` reads only, and hardening `/api/ai-paths/settings` to always reject legacy key requests/writes while filtering legacy records from list responses.
27. Removed remaining `legacy_key_read` observability plumbing from `/api/ai-paths/settings`, narrowed legacy compatibility counters to metadata payload tracking only (`legacy_payload_received`), and added canonical cleanup script `scripts/db/cleanup-ai-paths-legacy-index-key.ts` plus npm shortcut `cleanup:ai-paths-legacy-index-key` to backfill/delete stale `ai_paths_index_v1` records.
28. Removed the final legacy compatibility counters runtime (`src/shared/lib/observability/legacy-compat-counters.ts`) by decoupling metadata handlers from counter recording while preserving wrapped-payload request compatibility, leaving no active `recordLegacyCompatCounter` usage in runtime code.
29. Completed canvas interaction seam cutover by adapting `useAiPathsCanvasInteractions` to canonical `useCanvasInteractions`, updating hook-level delete shortcut tests to mock canonical interactions, and pruning dead settings-only canvas hook files (`useCanvasConnection`, `useCanvasNodeDrag`, `useCanvasView`) plus their duplicate race test.
30. Reduced selection mirror-setter seam in canvas interactions by removing `selectedNodeId`/`setSelectedNodeId` arguments from `useAiPathsCanvasInteractions`, making node/edge selection updates context-native via `SelectionContext` only, and updating settings/tests to match the new API.
31. Reduced preset application mirror-setter seam by removing `setSelectedNodeId` from `useAiPathsPresets` API and switching preset-apply selection updates to canonical `SelectionContext` actions (`selectNode` + `selectEdge(null)`), then updating `useAiPathsSettingsState` wiring accordingly.
32. Reduced path-switch mirror-setter seam by removing `setSelectedNodeId` from `useAiPathsSettingsPathActions` input and switching path-config apply selection updates to canonical `SelectionContext` (`selectNode`), with caller + switch-path test harness updates.
33. Reduced persistence mirror-setter seam by removing `setSelectedNodeId` from `UseAiPathsPersistenceArgs`, switching initial load and post-save node selection updates to canonical `SelectionContext` (`selectNode`) within `useAiPathsPersistence`/`usePathPersistence`, and updating settings/test wiring to match.
34. Reduced mode-actions graph mirror-setter seam by removing `setPaths`/`setPathConfigs` injection from `useAiPathsSettingsModeActions`, wiring it directly to canonical `GraphContext` actions (`useGraphActions`), and updating mode-actions tests + settings composition accordingly.
35. Reduced cleanup-actions graph mirror-setter seam by removing `setEdges`/`setPathConfigs` injection from `useAiPathsSettingsCleanupActions`, wiring cleanup mutations directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition wiring.
36. Reduced path-actions graph mirror-setter seam by removing `setPaths`/`setPathConfigs` injection from `useAiPathsSettingsPathActions`, wiring path list/config mutations directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition plus switch-path tests to mock graph actions.
37. Reduced path-actions graph mirror-setter seam (nodes/edges) by removing `setNodes`/`setEdges` injection from `useAiPathsSettingsPathActions`, wiring path-apply graph updates directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition plus switch-path tests to mock graph actions.
38. Reduced presets graph mirror-setter seam by removing `setNodes`/`setEdges` injection from `useAiPathsPresets`, wiring preset-apply graph updates directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition wiring.
39. Reduced node-config graph mirror-setter seam by removing `setNodes` injection from `useAiPathsNodeConfigActions`, wiring node patch/config updates directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition wiring.
40. Reduced persistence graph mirror-setter seam by removing `setNodes`/`setEdges`/`setPathConfigs`/`setPaths` injection from `UseAiPathsPersistenceArgs`, wiring load/prefetch/save graph mutations directly through canonical `GraphContext` actions (`useGraphActions`) in `useAiPathsPersistence` and `usePathPersistence`, and updating settings + prefetch test wiring.
41. Reduced runtime graph mirror-setter seam by removing `setPathConfigs` injection from runtime arg contracts (`UseAiPathsRuntimeArgs`, `ServerExecutionArgs`, `LocalExecutionArgs`), wiring server/local run outcome path-config updates directly to canonical `GraphContext` actions (`useGraphActions`) in runtime segments, and updating settings runtime composition wiring.
42. Reduced runtime diagnostics mirror-setter seam by removing `setPathDebugSnapshots` injection from runtime arg contracts (`UseAiPathsRuntimeArgs`, `LocalExecutionArgs`), wiring local-run debug snapshot persistence updates directly to canonical `RuntimeContext` actions (`useRuntimeActions`) in `useLocalRunOutcome`, and updating settings runtime composition wiring.
43. Reduced runtime-management mirror-setter seam by removing `setRuntimeState` injection from `useAiPathsRuntimeManagement`, wiring runtime input/node cleanup updates directly to canonical `RuntimeContext` actions (`useRuntimeActions`), and updating settings composition wiring.
44. Reduced runtime-state mirror-setter seam by removing `setRuntimeState` injection from orchestrator-facing runtime args (`UseAiPathsRuntimeArgs`), wiring runtime state mutations in `useAiPathsRuntime` directly through canonical `RuntimeContext` actions (`useRuntimeActions`) while preserving internal local/server runtime engine contracts, and updating settings runtime composition wiring.
45. Reduced public orchestrator setter exposure by removing `setNodes`/`setEdges` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload, rewiring `simulation-dialog` node config updates to canonical `GraphContext` actions (`useGraphActions`) instead of orchestrator-provided graph setters.
46. Reduced persistence runtime mirror-setter seam by removing `setRuntimeState`/`setPathDebugSnapshots` injection from `UseAiPathsPersistenceArgs`, wiring persistence-time runtime hydration to canonical `RuntimeContext` actions (`useRuntimeActions`) in `useAiPathsPersistence`, and pruning public settings composition + test fixture wiring accordingly.
47. Reduced path/cleanup runtime mirror-setter seam by removing `setRuntimeState` injection from `useAiPathsSettingsPathActions` and `useAiPathsSettingsCleanupActions`, wiring both hooks to canonical `RuntimeContext` actions (`useRuntimeActions`) for runtime-state transitions, and updating settings composition + path-actions test harness wiring.
48. Reduced persistence graph/runtime/selection/persistence mirror-setter seam by removing orchestrator-injected setters (`setActivePathId`, `setActiveTrigger`, `setPathName`, `setPathDescription`, `setExecutionMode`, `setFlowIntensity`, `setRunMode`, `setStrictFlowMode`, `setIsPathLocked`, `setIsPathActive`, `setParserSamples`, `setUpdaterSamples`, `setLastRunAt`, `setConfigOpen`, `setLoading`) from `UseAiPathsPersistenceArgs`, wiring those writes directly to canonical `GraphContext`/`RuntimeContext`/`SelectionContext`/`PersistenceContext` actions in `useAiPathsPersistence`, and moving save-clear error writes in `usePathPersistence` to `RuntimeContext`.
49. Reduced mode-actions graph mirror-setter seam by removing `setIsPathLocked`/`setIsPathActive`/`setExecutionMode`/`setFlowIntensity`/`setRunMode`/`setStrictFlowMode` injection from `useAiPathsSettingsModeActions`, wiring mode/toggle updates directly to canonical `GraphContext` actions (`useGraphActions`), and updating settings composition plus mode-actions tests to match.
50. Pruned dead persistence compatibility payload fields by removing unused preset/normalizer/error-callback wiring (`normalizeDbNodePreset`, `normalizeDbQueryPreset`, `persistLastError`, `setClusterPresets`, `setDbNodePresets`, `setDbQueryPresets`, `setExpandedPaletteGroups`, `setPaletteCollapsed`) from `UseAiPathsPersistenceArgs` plus settings/test callsites, leaving `useAiPathsPersistence` contracts aligned to actively consumed state/actions only.
51. Reduced runtime mirror-setter seam by removing orchestrator-facing `setLastRunAt` injection from `UseAiPathsRuntimeArgs`, wiring runtime engines in `useAiPathsRuntime` to canonical `RuntimeContext` action `setLastRunAt` directly while preserving server/local execution contracts.
52. Reduced samples mirror-setter seam by removing `setParserSamples`/`setUpdaterSamples` injection from `useAiPathsSettingsSamples`, wiring parser/updater sample writes directly to canonical `RuntimeContext` actions (`useRuntimeActions`) and pruning settings composition wiring.
53. Reduced runtime state mirror payload seam by removing orchestrator-facing `runtimeState` injection from `UseAiPathsRuntimeArgs`, wiring `useAiPathsRuntime` to read active runtime state directly from canonical `RuntimeContext` for runtime refs and preview source-output resolution, and pruning settings composition wiring.
54. Reduced runtime samples mirror payload seam by removing orchestrator-facing `parserSamples`/`updaterSamples` injection from `UseAiPathsRuntimeArgs`, wiring `useAiPathsRuntime` to read active parser/updater samples directly from canonical `RuntimeContext` and forwarding them to server/local runtime engines internally.
55. Pruned dead runtime arg surface by removing unused `lastRunAt` from `UseAiPathsRuntimeArgs` after runtime last-run timestamp ownership moved to canonical `RuntimeContext` actions/state.
56. Migrated execution-settings ownership into canonical `GraphContext` by adding `blockedRunPolicy`, `aiPathsValidation`, `historyRetentionPasses`, and `historyRetentionOptionsMax` to graph state/actions and rewiring `useExecutionSettingsState` to context-backed dispatch-compatible wrappers.
57. Reduced path-actions execution mirror-setter seam by removing `setBlockedRunPolicy`/`setAiPathsValidation` injection from `useAiPathsSettingsPathActions`, wiring path-apply updates directly to canonical `GraphContext` actions.
58. Reduced mode/persistence execution mirror-setter seam by removing `setBlockedRunPolicy`/`setHistoryRetentionPasses` injection from `useAiPathsSettingsModeActions` and removing `setBlockedRunPolicy`/`setAiPathsValidation`/`setHistoryRetentionPasses`/`setHistoryRetentionOptionsMax` injection from `UseAiPathsPersistenceArgs`, wiring these updates directly through canonical `GraphContext` actions in both hooks.
59. Migrated path-switching UI ownership into canonical `PersistenceContext` by adding `isPathSwitching` state plus `setIsPathSwitching` action, rewiring `useContextSettingsState` to expose dispatch-compatible accessors from persistence context, and deleting the obsolete local UI state hook (`useUiSettingsState`).
60. Reduced path-actions UI mirror-setter seam by removing `setIsPathSwitching` injection from `useAiPathsSettingsPathActions`, wiring path-switch lifecycle updates directly to canonical `PersistenceContext` actions (`usePersistenceActions`) and updating settings composition/tests accordingly.
61. Reduced error-state mirror-setter seam by removing `setAiPathsValidationState`/`setLastError` injection from `useAiPathsErrorState`, wiring validation/error writes directly to canonical `GraphContext` and `RuntimeContext` actions while preserving existing error-reporting APIs for callers.
62. Reduced public orchestrator UI setter exposure by removing `setIsPathSwitching` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload, keeping path-switch state readable while enforcing context-owned writes through action hooks.
63. Pruned dead context adapter surface by removing unused `setIsPathSwitching` wrapper from `useContextSettingsState` after path-switch writes moved to canonical `PersistenceContext` actions.
64. Reduced public orchestrator validation setter exposure by removing `setAiPathsValidation` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload; callers use `updateAiPathsValidation` and context-owned validation actions instead.
65. Reduced public orchestrator error setter exposure by removing `setLastError` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload; canvas error-clear/retry actions now use `persistLastError(null)` (runtime-context owned) instead of direct setter writes.
66. Pruned dead context adapter surface by removing unused `setLastError` wrapper from `useContextSettingsState` after orchestrator/page-context setter exposure was removed.
67. Pruned remaining dead context adapter wrappers from `useContextSettingsState` (`setRuntimeState`, `setPathDebugSnapshots`, `setLastRunAt`, `setSelectedNodeId`, `setLoading`) after orchestrator composition stopped consuming those dispatch-compat adapters.
68. Reduced public orchestrator persistence setter exposure by removing `setLoadNonce` from `UseAiPathsSettingsStateReturn`, adding explicit `incrementLoadNonce` action in `useAiPathsSettingsState`, and rewiring page-value nonce bump logic to call the action instead of passing a raw setter through page context.
69. Reduced public orchestrator path-meta setter exposure by removing `setPathName`/`setPathDescription` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload; page-level rename now uses explicit `updateActivePathMeta` action.
70. Reduced public orchestrator selection/UI setter exposure by removing `setConfigOpen` and `setSimulationOpenNodeId` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload; simulation dialog close now uses canonical `SelectionContext` action (`useSelectionActions`) instead of orchestrator passthrough setter.
71. Pruned dead context adapter surface by removing unused `setConfigOpen` and `setSimulationOpenNodeId` wrappers from `useContextSettingsState` after orchestrator setter exposure removal.
72. Reduced public orchestrator selection/UI read-surface by removing `configOpen` and `simulationOpenNodeId` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload; both states remain context-owned for internal orchestration only.
73. Rewired `simulation-dialog` to read simulation-open state directly from canonical `SelectionContext` (`useSelectionState`) while preserving close behavior through `SelectionContext` actions (`useSelectionActions`), eliminating remaining dependency on orchestrator-owned simulation-open state passthrough.
74. Reduced public orchestrator selection/UI setter exposure by removing `setNodeConfigDirty` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload.
75. Pruned dead context adapter surface by removing unused `setNodeConfigDirty` wrapper from `useContextSettingsState`, and rewired node-switch confirm dirty-reset to canonical `SelectionContext` action (`useSelectionActions.setNodeConfigDirty`) instead of dispatch-compatible adapter passthrough.
76. Reduced public orchestrator selection/UI read-surface by removing `nodeConfigDirty` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` return payload.
77. Rewired canvas top-bar save warning to read `nodeConfigDirty` directly from canonical `SelectionContext` (`useSelectionState`) instead of page-context/orchestrator passthrough.
78. Pruned dead context adapter read-surface by removing `nodeConfigDirty` from `useContextSettingsState` return payload and reading dirty-state directly from canonical `SelectionContext` inside `useAiPathsSettingsState` for node-switch confirm flow.
79. Pruned dead context adapter read-surface by removing `configOpen` from `useContextSettingsState` return payload and reading it directly from canonical `SelectionContext` inside `useAiPathsSettingsState` for node-switch confirm and cleanup flows.
80. Pruned dead context adapter read-surface by removing `selectedNodeId` from `useContextSettingsState` return payload and reading it directly from canonical `SelectionContext` inside `useAiPathsSettingsState` for node-config, switch-confirm, presets, and persistence flows.
81. Pruned dead context adapter read-surface by removing `isPathSwitching` from `useContextSettingsState` return payload and reading it directly from canonical `PersistenceContext` (`usePersistenceState`) inside `useAiPathsSettingsState` for canvas interaction gating and UI state exposure.
82. Pruned dead context adapter read-surface by removing `loading` from `useContextSettingsState` return payload and reading it directly from canonical `PersistenceContext` (`usePersistenceState`) inside `useAiPathsSettingsState` for persistence orchestration and loading-state UI exposure.
83. Pruned dead context adapter read/write surface by removing `loadNonce` and `setLoadNonce` from `useContextSettingsState`; `useAiPathsSettingsState` now reads `loadNonce` and calls canonical `PersistenceContext` action `incrementLoadNonce` directly.
84. Removed the obsolete settings context adapter hook (`hooks/state/useContextSettingsState.ts`) by rewiring `useAiPathsSettingsState` to read runtime state (`runtimeState`, samples, debug snapshots, `lastRunAt`, `lastError`) from canonical `RuntimeContext` (`useRuntimeState`) and write sample updates via canonical `RuntimeContext` actions (`useRuntimeActions`).
85. Pruned dead orchestrator/persistence passthrough `persistRuntimePathState` from `UseAiPathsPersistenceResult` and `UseAiPathsSettingsStateReturn`, removed its unused `usePathPersistence` implementation, and removed the unsafe cast in `useAiPathsSettingsState` that previously bridged incompatible signatures.
86. Pruned dead orchestrator debug mirror `lastGraphModelPayload` from `UseAiPathsSettingsStateReturn` and `useAiPathsSettingsState` (it was always `null`), and rewired `graph-model-debug-panel` to read canonical `runtimeState` directly from orchestrator context.
87. Removed legacy prefetch compatibility retry in `useAiPathsPersistence` that rewrote invalid runtime payloads (`runtimeState: ''`) for `sanitizePrefetchedPathConfig`; prefetch now strictly skips incompatible configs, with regression coverage in `useAiPathsPersistence.prefetch.test.tsx`.
88. Normalized canvas edge-sanitization mutation metadata source from `settings.canvas.compat.sanitizeEdges` to canonical `settings.canvas.sanitizeEdges` in `useAiPathsCanvasInteractions` after compatibility bridge removal.
89. Removed single-selection fallback seam from `useCanvasStateHandlers.resolveActiveNodeSelectionIds` by dropping `selectedNodeId` input fallback and relying only on canonical `SelectionContext.selectedNodeIds` ownership; updated `useCanvasInteractions` wiring and selection handler regression tests.
90. Pruned legacy-token save-error branching in `usePathPersistence` by removing `deprecated ai snapshot keys` / `legacy ai paths` message matching; raw error passthrough now only applies to canonical path/runtime validation failures (`AI Path config contains...`, `Invalid AI Paths runtime state payload...`).
91. Pruned dead canvas state-handler adapter surface by removing unused `useCanvasStateHandlers` args (`isPathLocked`, `edges`, `setNodes`, `setRuntimeState`, `selectionToolMode`, `selectionScopeMode`, `setNodeSelection`, `toggleNodeSelection`) and deleting unused `resolveNodeSelectionByScope`, then rewired `useCanvasInteractions` and selection-handler tests to the slimmer canonical contract.
92. Pruned dead node-interactions selection mirror input by removing `selectedNodeId` from `useCanvasInteractionsNodes` args and relying on canonical `selectedNodeIds`/`selectedNodeIdSet` state for single-select early-return checks; rewired `useCanvasInteractions` and drag-threshold test fixtures to the slimmer contract.
93. Pruned dead runtime-state subscription from `useCanvasInteractions` by removing unused `useRuntimeState()` read and its import, keeping canvas interactions bound only to required runtime actions (`useRuntimeActions`) while preserving existing drag/wiring behavior.
94. Pruned dead settings-wrapper selection fallback in `useAiPathsCanvasInteractions` by removing `selectedNodeId` reads/fallbacks and relying on canonical `selectedNodeIds` for delete-shortcut gating, node-delete resolution, and same-node select no-op checks.
95. Pruned dead canvas-wrapper error passthrough by removing unused `reportAiPathsError` argument from `useAiPathsCanvasInteractions` contract and rewiring settings/test callsites to the slimmer signature.
96. Restored trigger-chip drag-suppression guard in `CanvasSvgNode` (`consumeSuppressedNodeClick(node.id)` on trigger action click) so post-drag suppressed clicks cannot fire trigger actions, preserving canvas interaction invariants.
97. Pruned stale type-compat casts in settings cleanup wiring by removing `as unknown as Edge[]` adapters around `pruneRuntimeInputsState` in `useAiPathsSettingsState`; cleanup now passes canonical edge arrays directly.
98. Pruned dead prune-runtime adapter lambda in `useAiPathsSettingsState` by wiring `pruneRuntimeInputs` directly to canonical `pruneRuntimeInputsState` instead of a pass-through wrapper.
99. Pruned dead canvas ref passthrough in context interaction hooks by removing unused `canvasRef` args from `useCanvasInteractionsNodes` and `useCanvasEventHandlers`, rewiring `useCanvasInteractions` callsites, and deleting related `canvasRef` cast/test fixture plumbing.
100. Pruned redundant toast type adapters (`as unknown as Toast`) by wiring canonical `useToast().toast` directly into `useCanvasStateHandlers` and `useAiPathsValidationActions` (`useAiPathsErrorState`) without unsafe casting.
101. Pruned viewport ref adapter casts in `useCanvasInteractions` by widening handler hook contracts (`useCanvasStateHandlers`, `useCanvasEventHandlers`) to accept canonical `RefObject<HTMLDivElement | null>` directly, removing callsite cast shims.
102. Pruned wheel-event adapter casts in `useCanvasEventHandlers` by forwarding both React and native wheel events directly to the shared `WheelLikeEvent` contract, removing `as unknown as` shims without changing zoom/scroll capture behavior.
103. Pruned run-history list-response cast in `useAiPathsRunHistory` by normalizing `listAiPathRuns` results through `aiPathRunRecordSchema.safeParse`, returning canonical run arrays without `as unknown as` API adapters.
104. Pruned db-node preset config cast in `PresetsContext` by replacing `as unknown as DatabaseConfig` with schema-based coercion (`databaseConfigSchema.safeParse`) and canonical operation fallback (`query`), with regression coverage in `PresetsContext.normalizeDbNodePreset.test.tsx`.
105. Pruned server-execution stream casts in `useAiPathsServerExecution` by replacing `as unknown as AiPathRunNodeRecord[]` parsing with `aiPathRunNodeSchema.safeParse` normalization and emitting fully-typed runtime stream events (`type: 'log'`) without `as unknown as AiPathRuntimeEvent`.
106. Pruned database-node config hook casts in `useDatabaseNodeConfigState` by wiring canonical orchestrator `toast` directly into `useDatabaseQueryExecution` and replacing schema fetch `dbApi.schema()` cast adapters with explicit API-result handling (`result.ok` guard + `result.data` return).
107. Pruned db-schema node UI collection casts in `DbSchemaNodeConfigSection` by replacing `as unknown as CollectionSchema[]` adapters with typed collection guards (`isCollectionSchema`) and normalization (`resolveCollectionList`) across multi-source and provider-specific schema flows.
108. Pruned runtime schema/template collection casts by replacing `as unknown as CollectionSchema[]` adapters in `integration-schema-handler` and `integration-database-template-context` with typed collection normalization helpers (`resolveCollectionList` + `isCollectionSchema`) shared at callsite level.
109. Pruned node-docs definition config casts in `core/docs/node-docs.ts` by replacing `def as unknown as { config... }` adapters with guarded extraction via `resolveDefaultConfigFromDefinition` (`isObjectRecord` + indexed `config` read).
110. Pruned logical-condition handler cast in `runtime/handlers/common.ts` by replacing `as unknown as LogicalConditionConfig` with `logicalConditionConfigSchema.safeParse` normalization and explicit `inputPort` coercion (`normalizeLogicalInputPort`) for condition evaluation.
111. Pruned string-mutator dialog cast in `StringMutatorNodeConfigSection` by introducing `StringMutatorOperationDraft` (`StringMutatorOperation & { id?: string }`) and preserving operation IDs without `as unknown as StringMutatorOperation`.
112. Pruned trigger-buttons editor key casts in `AdminAiPathsTriggerButtonsPage` by replacing `'locations' as unknown as keyof TriggerButtonDraft` and `'id' as unknown as keyof TriggerButtonDraft` with direct typed keys.
113. Pruned initial-segments node cast in `core/constants/segments/initial-state.ts` by declaring `initialNodes` as `AiNode[]` directly and removing `as unknown as AiNode[]`.
114. Pruned starter-workflows registry casts by widening canonical helpers (`buildCanonicalNodeShape`, `buildCanonicalEdgeShape`, `edgeSignature`) to accept `unknown` and normalize via `toRecord`, removing all `as unknown as Record<string, unknown>` callsite adapters.
115. Pruned repository-layer cast adapters by replacing Prisma run-node status `as unknown as` coercion with explicit `toPrismaRunNodeStatus` mapping in `prisma-path-run-repository` and replacing Mongo run-graph `as unknown as` coercion with schema-validated `toRunGraph` normalization in `mongo-path-run-repository`.
116. Pruned audio runtime handler cast adapters in `runtime/handlers/audio.ts` by replacing `globalThis as unknown as ...`/`AudioPlaybackState` shims with guarded constructor/state resolvers (`resolveGlobalAudioConstructors`, `isAudioPlaybackState`) and direct oscillator config normalization via `buildOscillatorSignal`.
117. Pruned dead bridge-era graph mutation reason from `GraphContext` by removing `bridge_sync` from `GraphMutationReason` and dropping it from node-count invariant enforcement; graph mutation guards now track only canonical reasons (`drag`, `select`, `load_path`).
118. Pruned settings page context fallback seam by removing the empty-context compatibility return from `useAiPathsSettingsPageContext`; the hook now enforces canonical provider ownership and throws when `AiPathsSettingsPageProvider` is missing.
119. Added migration hardening guardrail `migration.no-unknown-casts.test.ts` to fail CI when `as unknown as` reappears in non-test AI-Paths runtime source trees (`src/features/ai/ai-paths`, `src/shared/lib/ai-paths`).
120. Pruned residual path-save raw-message compatibility token matching in `useAiPathsPersistence.helpers` by removing deprecated snapshot-key branching; raw passthrough now remains limited to canonical path/runtime validation failures only.
121. Pruned starter-workflow factory node-shape cast in `core/utils/factory.ts` by typing raw seed nodes as `Omit<AiNode, 'createdAt' | 'updatedAt' | 'data'>` and removing the cast adapter in `createAiDescriptionPath`.
122. Extended canonical guardrails in `scripts/ai-paths/check-canonical.mjs` to block reintroduction of legacy path-save raw-message patterns (`/deprecated ai snapshot keys/i`, `/legacy ai paths/i`) while requiring canonical validation patterns (`/ai path config contains/i`, `/invalid ai paths runtime state payload/i`, `/^invalid payload\\b/i`).
123. Pruned run-execution metadata compatibility aliases in `job-queue-panel-utils` by removing fallback reads from legacy/synthetic keys (`execution_mode`, `runMode`, `run_mode`, `mode`) and resolving execution kind from canonical `executionMode` paths only (`meta.executionMode`, `meta.runtime.executionMode`).
124. Extended canonical guardrails in `scripts/ai-paths/check-canonical.mjs` to block reintroduction of legacy run-execution metadata alias snippets in `job-queue-panel-utils` while requiring canonical `executionMode` metadata reads.
125. Retired deprecated maintenance action id `upgrade_server_execution_mode` from canonical maintenance contracts (`src/shared/contracts/ai-paths.ts`, `settings-store.constants.ts`) and canonical guard expectations in `scripts/ai-paths/check-canonical.mjs`.
126. Pruned dead server-execution-mode maintenance compatibility runtime by deleting `settings-store-execution-mode-server.ts` (+ test), removing upgrade counting/apply branches from `settings-store.maintenance.ts`, and rewiring maintenance API/server tests to the canonical action set only.
127. Pruned enqueue metadata source compatibility rewrite in `src/app/api/ai-paths/runs/enqueue/handler.ts`; object-shaped `meta.source` payloads are now rejected (`meta.source must be a string`) instead of being rewritten to compatibility metadata.
128. Extended canonical guardrails in `scripts/ai-paths/check-canonical.mjs` to block reintroduction of enqueue source-object compatibility rewrite snippets and require the canonical rejection guard.
129. Pruned run-source metadata compatibility in queue/repository listing flows by removing object/tab/sourceInfo source fallbacks (`meta.source.tab`, `meta.sourceInfo.tab`, `sourceInfo.executionMode`) from `job-queue-panel-utils`, `prisma-path-run-repository`, and `mongo-path-run-repository`; filtering/origin now use canonical string `meta.source` only.
130. Extended canonical guardrails and regression coverage for canonical run-source filtering:
    1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of repository source-tab/sourceInfo compatibility snippets.
    2. Added `run-source-filters.canonical.test.ts` to lock canonical-only source filter behavior in Prisma/Mongo repository builders.
131. Pruned queue-cache run-source compatibility in `src/shared/lib/query-invalidation.ts` by removing object/tab/sourceInfo fallback parsing (`meta.source.tab`, `meta.sourceInfo.tab`, `tab:*`) and matching node-origin source only via canonical string `meta.source`.
132. Extended canonical guardrails and queue-cache regression coverage for canonical run-source metadata:
    1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of queue-cache source fallback snippets in `query-invalidation.ts`.
    2. `__tests__/shared/lib/query-invalidation.test.ts` now verifies `ai_paths_ui` source-filtered queue cache accepts canonical string sources and ignores removed object-shaped source metadata.
133. Pruned residual run-source tab-helper compatibility surface by reducing `src/shared/lib/ai-paths/run-sources.ts` to canonical source-value helpers only (`AI_PATHS_RUN_SOURCE_VALUES`, `isAiPathsRunSourceValue`) and removing tab alias exports (`AI_PATHS_RUN_SOURCE_TABS`, `isAiPathsRunSourceTab`).
134. Pruned dead duplicate feature-local run-source helper module by deleting `src/features/ai/ai-paths/lib/run-sources.ts` and extending canonical guardrails to block its reintroduction.
135. Pruned legacy run-mode alias compatibility in settings runtime state application by removing `runMode === 'queue'` fallback branches from:
    1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts`
    2. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
    Canonical run-mode normalization now accepts only `manual`/`automatic`/`step`, otherwise defaults to `manual`.
136. Extended canonical guardrails and regression coverage for run-mode alias pruning:
    1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `runMode === 'queue'` compatibility snippets in settings persistence/path-actions runtime files.
    2. `useAiPathsSettingsPathActions.switch-path.test.tsx` now verifies legacy `runMode: 'queue'` path payloads resolve to canonical `setRunMode('manual')`.
137. Pruned requestId dedupe compatibility scan in `src/features/ai/ai-paths/services/path-run-service.ts` by removing provider fallback list-scan logic; enqueue dedupe now relies only on canonical repository requestId filtering (`listRuns` with `requestId`, `limit: 1`, `offset: 0`).
138. Extended canonical guardrails and service regression coverage for requestId dedupe canonicalization:
    1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of requestId scan fallback snippets (`existingByScan`, provider-safe fallback comment) in `path-run-service.ts`.
    2. `path-run-service.test.ts` now verifies canonical requestId dedupe performs a single repository lookup and does not enqueue/create a duplicate run when a matching active run exists.

Session 6 explicit deletion checklist (prepared):

1. Completed on 2026-03-04: deleted temporary test bridge harness and bridge-specific tests:
   1. `src/features/ai/ai-paths/context/__tests__/helpers/AiPathsStateBridger.tsx`
   2. `src/features/ai/ai-paths/context/__tests__/helpers/useStateBridge.ts`
   3. `src/features/ai/ai-paths/context/__tests__/state-bridge-canvas-ownership.test.tsx`
   4. `src/features/ai/ai-paths/context/__tests__/state-bridge-drop-click-race.test.tsx`
   5. `src/features/ai/ai-paths/context/__tests__/state-bridge-graph-ownership.test.tsx`
2. Completed on 2026-03-04: deleted legacy metadata alias routes:
   1. `src/app/api/countries/route.ts`, `src/app/api/countries/[id]/route.ts`
   2. `src/app/api/languages/route.ts`, `src/app/api/languages/[id]/route.ts`
   3. `src/app/api/currencies/route.ts`, `src/app/api/currencies/[id]/route.ts`
   4. `src/app/api/price-groups/route.ts`, `src/app/api/price-groups/[id]/route.ts`
3. Completed on 2026-03-04: deleted migrated legacy integrations alias route entrypoints:
   1. `src/app/api/integrations/imports/base/**/route.ts` alias surface
   2. `src/app/api/integrations/exports/base/[setting]/route.ts`
   3. `src/app/api/integrations/with-connections/route.ts`
   4. `src/app/api/integrations/jobs/route.ts`
   5. `src/app/api/integrations/queues/tradera/route.ts`
   6. `src/app/api/integrations/product-listings/route.ts`
   7. `src/app/api/integrations/images/sync-base/all/route.ts`
4. Completed on 2026-03-04: deleted migrated legacy integrations products alias route entrypoints:
   1. `src/app/api/integrations/products/[id]/**/*/route.ts` legacy alias surface
5. Completed on 2026-03-04: deleted legacy compatibility counters endpoint after alias route deletion:
   1. `src/app/api/ai-paths/legacy-compat/counters/handler.ts`
   2. `src/app/api/ai-paths/legacy-compat/counters/route.ts`
   3. `src/app/api/ai-paths/legacy-compat/counters/handler.test.ts`
6. Completed on 2026-03-04: deleted migrated legacy integrations connection alias route entrypoints:
   1. `src/app/api/integrations/route.ts`
   2. `src/app/api/integrations/[id]/connections/route.ts`
   3. `src/app/api/integrations/connections/[id]/route.ts`
   4. `src/app/api/integrations/connections/[id]/session/route.ts`
   5. `src/app/api/integrations/[id]/connections/[connectionId]/test/route.ts`
   6. `src/app/api/integrations/[id]/connections/[connectionId]/base/test/route.ts`
   7. `src/app/api/integrations/[id]/connections/[connectionId]/base/request/route.ts`
   8. `src/app/api/integrations/[id]/connections/[connectionId]/allegro/test/route.ts`
   9. `src/app/api/integrations/[id]/connections/[connectionId]/allegro/request/route.ts`
   10. `src/app/api/integrations/[id]/connections/[connectionId]/allegro/disconnect/route.ts`
   11. `src/app/api/integrations/[id]/connections/[connectionId]/allegro/authorize/route.ts`
   12. `src/app/api/integrations/[id]/connections/[connectionId]/allegro/callback/route.ts`
   13. `src/app/api/integrations/[id]/connections/[connectionId]/base/inventories/route.ts`
   14. `src/app/api/integrations/[id]/connections/[connectionId]/base/products/route.ts`
7. Completed on 2026-03-04: pruned dead legacy route-compat internals:
   1. deleted `src/shared/lib/ai-paths/legacy-compat/server.ts`
   2. deleted `src/shared/lib/ai-paths/legacy-compat/server.test.ts`
   3. removed `isLegacyCompatRoutesEnabled` from `src/shared/lib/ai-paths/legacy-compat/flags.ts`
   4. removed unused snapshot helpers and `compat_route_hit` shape from `src/shared/lib/observability/legacy-compat-counters.ts`

## Session 7: Release hardening

Scope:

1. Run focused regression, then full quality checks.
2. Capture before/after architecture diffs.

Acceptance:

1. All AI-Paths targeted tests pass.
2. No lint/type regressions.
3. Migration checklist signed off.

Progress (2026-03-04):

1. Ran the full AI-Paths targeted quality-gate suites from this playbook:
   1. `useCanvasInteractions.connections.race.test.tsx`
   2. `canvas-board.connection-wiring.test.tsx`
   3. `useCanvasInteractions.nodes.drag-threshold.test.tsx`
   4. `AiPathsCanvasView.switching-delete-guard.test.tsx`
   5. `canvas-svg-trigger-node-interactions.test.tsx`
   6. `canvas-svg-trigger-node-interaction-regression.test.tsx`
   7. `canvas-connection-preview.test.tsx`
   Result: 7 files passed, 21 tests passed.
2. Re-ran integrations migration parity suites after legacy route-file pruning:
   1. `src/app/api/v2/integrations/routes-parity.test.ts`
   2. `src/app/api/v2/integrations/imports/base/routes-parity.test.ts`
   3. `src/app/api/v2/integrations/exports/base/routes-parity.test.ts`
   Result: 3 files passed, 13 tests passed.
3. Ran compatibility smoke coverage for migrated metadata contracts:
   1. `src/app/api/v2/metadata/handler.compat.test.ts`
   2. `src/app/api/v2/products/metadata/handler.compat.test.ts`
   Result: 2 files passed, 6 tests passed.
4. Ran repository lint gate (`npm run lint`), fixed two `@typescript-eslint/no-unsafe-assignment` violations in:
   1. `src/app/api/v2/products/metadata/handler.ts`
   2. `src/app/api/v2/products/metadata/[type]/[id]/handler.ts`
   Result: lint passes (`eslint src`).
5. Ran production build gate (`npm run build`) after migration and lint fixes.
   Result: build passes.
6. Captured architecture diff highlights (before/after migration endpoint surface):
   1. Removed legacy API entrypoints:
      1. `/api/integrations/products/[id]/*` route aliases (`route.ts` files)
      2. `/api/integrations` connection-management/action route aliases (full migrated surface)
      3. `/api/ai-paths/legacy-compat/counters`
   2. Enforced canonical route surface via parity guards:
      1. `src/app/api/v2/integrations/routes-parity.test.ts` now asserts removed legacy aliases remain deleted.
7. Re-ran focused AI-Paths regression bundle after seams 120-121 and drag/wiring hardening lint repairs:
   1. `canvas-svg-trigger-node-interactions.test.tsx`
   2. `canvas-svg-trigger-node-interaction-regression.test.tsx`
   3. `canvas-connection-preview.test.tsx`
   4. `canvas-board.connection-wiring.test.tsx`
   5. `useCanvasInteractions.nodes.drag-threshold.test.tsx`
   6. `useCanvasInteractions.connections.race.test.tsx`
   7. `AiPathsCanvasView.switching-delete-guard.test.tsx`
   8. `useAiPathsPersistence.helpers.test.ts`
   9. `useAiPathsPersistence.prefetch.test.tsx`
   10. `migration.no-unknown-casts.test.ts`
   Result: 10 files passed, 40 tests passed.
8. Re-ran starter-workflow/factory regression bundle after seam 121:
   1. `starter-workflows/__tests__/registry.test.ts`
   2. `semantic-grammar/__tests__/semantic-grammar.test.ts`
   3. `normalization/__tests__/validation-pattern-defaults.test.ts`
   4. `normalization/__tests__/input-contract-backfill.test.ts`
   Result: 4 files passed, 15 tests passed.
9. Re-ran canonical and quality gates:
   1. `npm run ai-paths:check:canonical` -> passed (`4206` files scanned).
   2. `npm run lint` -> passed (`eslint src`).
   3. `npm run build` -> passed (`next build` exit `0`) with a non-blocking trace-copy warning for missing temp file `tmp/integration-slug-audit.cjs`.
10. Added queue-panel execution-kind regression coverage after seam 123 and re-validated canonical guardrails:
   1. `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts` -> passed (`1` file, `6` tests).
   2. `npm run ai-paths:check:canonical` -> passed (`4207` files scanned).
11. Re-ran production build from a clean output directory (`rm -rf .next && npm run build`):
   1. Build passed (`next build` exit `0`).
   2. Previous trace-copy warning for `tmp/integration-slug-audit.cjs` did not reproduce after clean build (stale trace-cache artifact).
12. Re-ran maintenance contract regression after seams 125-126 and re-validated canonical guards:
   1. `src/app/api/ai-paths/settings/maintenance/handler.test.ts`
   2. `src/features/ai/ai-paths/server/__tests__/settings-store-maintenance.translation-en-pl.test.ts`
   3. `src/features/ai/ai-paths/server/__tests__/starter-workflow-guardrails.test.ts`
   Result: `3` files passed, `9` tests passed.
   4. `npm run ai-paths:check:canonical` -> passed (`4206` files scanned).
13. Post-seam full build validation currently blocked by unrelated workspace import regressions outside AI-Paths migration scope:
   1. `src/features/ai/chatbot/pages/AdminChatbotPage.tsx` -> missing `../components/DebugPanel`.
   2. `src/features/products/components/ProductForm.tsx` -> missing `@/features/products/components/DebugPanel`.
   3. `src/features/products/pages/AdminProductsPage.tsx` -> missing `@/features/products/components/DebugPanel`.
14. Re-ran enqueue metadata contract regression after seam 127 and re-validated canonical guards:
   1. `src/app/api/ai-paths/runs/enqueue/handler.test.ts` -> passed (`1` file, `4` tests).
   2. `npm run ai-paths:check:canonical` -> passed (`4209` files scanned).
15. Pruned queue-panel run-source metadata compatibility in seam 129:
   1. `src/features/ai/ai-paths/components/job-queue-panel-utils.ts` now resolves run source from canonical string `meta.source` only.
   2. Removed compatibility reads for object-shaped `meta.source.tab`, `meta.sourceInfo.tab`, `sourceInfo.executionMode`, and `tab:*` origin classification.
   3. Added regression coverage in `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts` for canonical source resolution and removed object-source compatibility.
   4. Extended canonical guardrails (`scripts/ai-paths/check-canonical.mjs`) to block reintroduction of queue-panel source metadata compatibility snippets.
16. Pruned repository run-source filter compatibility in seams 129-130 and re-validated canonical guards:
   1. `src/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository.ts`
      1. removed `meta.source.tab` / `meta.sourceInfo.tab` compatibility filter paths.
      2. canonical source filtering now matches `meta.source` only.
   2. `src/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository.ts`
      1. removed `meta.source.tab` / `meta.sourceInfo.tab` compatibility filter clauses.
      2. canonical source filtering now matches `meta.source` only.
   3. Added regression tests:
      1. `src/features/ai/ai-paths/services/path-run-repository/__tests__/run-source-filters.canonical.test.ts` -> passed (`1` file, `4` tests).
   4. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/services/path-run-repository/__tests__/run-source-filters.canonical.test.ts`
      2. `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts`
      3. `src/app/api/ai-paths/runs/enqueue/handler.test.ts`
      Result: `3` files passed, `17` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4212` files scanned).
17. Pruned queue-cache run-source compatibility in seams 131-132 and re-validated canonical guards:
   1. `src/shared/lib/query-invalidation.ts`
      1. removed object/tab/sourceInfo source fallback parsing from queue-cache filter logic.
      2. node-source matching now uses canonical string `meta.source` values only.
   2. Added queue-cache regression coverage:
      1. `__tests__/shared/lib/query-invalidation.test.ts` now asserts canonical string-source inclusion and object-shaped source exclusion for `source=ai_paths_ui` filters.
   3. Re-ran focused regression bundle:
      1. `__tests__/shared/lib/query-invalidation.test.ts`
      2. `src/features/ai/ai-paths/services/path-run-repository/__tests__/run-source-filters.canonical.test.ts`
      3. `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts`
      4. `src/app/api/ai-paths/runs/enqueue/handler.test.ts`
      Result: `4` files passed, `33` tests passed.
   4. `npm run ai-paths:check:canonical` -> passed (`4213` files scanned).
18. Pruned run-source helper compatibility surfaces in seams 133-134 and re-validated canonical guards:
   1. `src/shared/lib/ai-paths/run-sources.ts`
      1. removed tab helper exports (`AI_PATHS_RUN_SOURCE_TABS`, `isAiPathsRunSourceTab`).
      2. retained canonical source-value helpers only.
   2. Deleted dead duplicate module `src/features/ai/ai-paths/lib/run-sources.ts`.
   3. Added canonical guardrail checks in `scripts/ai-paths/check-canonical.mjs`:
      1. duplicate feature-local run-sources file must remain deleted.
      2. shared run-sources must not reintroduce tab-helper compatibility exports.
   4. Re-ran focused regression bundle:
      1. `__tests__/features/ai/ai-paths/lib/run-sources.test.ts`
      2. `__tests__/shared/lib/query-invalidation.test.ts`
      3. `src/features/ai/ai-paths/services/path-run-repository/__tests__/run-source-filters.canonical.test.ts`
      4. `src/features/ai/ai-paths/components/__tests__/job-queue-panel-utils.test.ts`
      5. `src/app/api/ai-paths/runs/enqueue/handler.test.ts`
      Result: `5` files passed, `34` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4212` files scanned).
19. Pruned run-mode queue alias compatibility in seams 135-136 and re-validated canonical guards:
   1. Removed runtime `runMode === 'queue'` compatibility mapping in:
      1. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts`
      2. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPathActions.ts`
   2. Added regression assertion:
      1. `src/features/ai/ai-paths/components/ai-paths-settings/__tests__/useAiPathsSettingsPathActions.switch-path.test.tsx`
         verifies fetched config with `runMode: 'queue'` resolves via canonical fallback to `setRunMode('manual')`.
   3. Re-ran focused regression bundle:
      1. `useAiPathsSettingsPathActions.switch-path.test.tsx`
      2. `useAiPathsPersistence.prefetch.test.tsx`
      3. `__tests__/shared/lib/query-invalidation.test.ts`
      4. `__tests__/features/ai/ai-paths/lib/run-sources.test.ts`
      5. `run-source-filters.canonical.test.ts`
      6. `job-queue-panel-utils.test.ts`
      7. `enqueue/handler.test.ts`
      Result: `7` files passed, `42` tests passed.
   4. `npm run ai-paths:check:canonical` -> passed (`4214` files scanned).
20. Pruned requestId dedupe compatibility scan in seams 137-138 and re-validated canonical guards:
   1. `src/features/ai/ai-paths/services/path-run-service.ts`
      1. removed provider fallback list-scan branch for requestId dedupe.
      2. canonical dedupe lookup now uses `listRuns({ requestId, limit: 1, offset: 0 })` only.
   2. Added regression:
      1. `src/features/ai/ai-paths/services/__tests__/path-run-service.test.ts`
         verifies requestId dedupe uses one canonical lookup and returns existing run without create.
   3. Re-ran focused regression bundle:
      1. `path-run-service.test.ts`
      2. `useAiPathsSettingsPathActions.switch-path.test.tsx`
      3. `useAiPathsPersistence.prefetch.test.tsx`
      4. `__tests__/shared/lib/query-invalidation.test.ts`
      5. `__tests__/features/ai/ai-paths/lib/run-sources.test.ts`
      6. `run-source-filters.canonical.test.ts`
      7. `job-queue-panel-utils.test.ts`
      8. `enqueue/handler.test.ts`
      Result: `8` files passed, `45` tests passed.
   4. `npm run ai-paths:check:canonical` -> passed (`4218` files scanned).

## Deprecation map

1. `AiPathsStateBridger.tsx` -> completed on 2026-03-04 (deleted).
2. `useStateBridge.ts` -> completed on 2026-03-04 (deleted).
3. `useAiPathsCanvasInteractions.ts` and `hooks/useCanvas*` (settings version) -> completed on 2026-03-04 (rewired to canonical context interactions; settings `useCanvasConnection`/`useCanvasNodeDrag`/`useCanvasView` deleted).
4. Monolith state mirror setters (`setNodes`, `setEdges`, `setSelectedNodeId`, etc.) -> replace with domain actions from context.

## Quality gates per session

Run at least:

```bash
npx vitest run src/features/ai/ai-paths/context/__tests__/useCanvasInteractions.connections.race.test.tsx \
  src/features/ai/ai-paths/components/__tests__/canvas-board.connection-wiring.test.tsx \
  src/features/ai/ai-paths/context/__tests__/useCanvasInteractions.nodes.drag-threshold.test.tsx \
  src/features/ai/ai-paths/components/ai-paths-settings/__tests__/AiPathsCanvasView.switching-delete-guard.test.tsx
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
