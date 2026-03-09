---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

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
2. `docs/ai-paths/overview.md` and linked architecture docs.

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
   1. `src/app/api/v2/metadata/handler.canonical.test.ts`
   2. `src/app/api/v2/products/metadata/handler.canonical.test.ts`
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
21. Pruned runtime node-status run-alias compatibility in seams 139-140 and re-validated canonical guards:
   1. Removed run-status alias mapping from runtime node-status normalizers:
      1. `src/features/ai/ai-paths/services/path-run-executor.logic.ts` no longer maps `paused -> running` or `dead_lettered -> failed` in `toRuntimeNodeStatus`.
      2. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts` no longer maps `paused`/`dead_lettered` aliases when merging runtime node outputs.
   2. Hardened runtime snapshot merge to drop unsupported incoming node status literals while preserving previous canonical status when present:
      1. `mergeRuntimeNodeOutputsForStatus` now strips raw `status` from incoming payload and re-applies only normalized canonical status.
   3. Added/updated regression coverage:
      1. `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts` now asserts run-only statuses are rejected (`null`) by node-status normalization.
      2. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts` now asserts alias statuses are not remapped and unknown status values are dropped without previous canonical state.
   4. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `paused`/`dead_lettered` node-status alias snippets in executor logic and runtime utils.
   5. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/services/__tests__/path-run-executor.logic.test.ts`
      2. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/runtime-utils.test.ts`
      Result: `2` files passed, `14` tests passed.
   6. `npm run ai-paths:check:canonical` -> passed (`4219` files scanned).
22. Pruned PresetsContext collection-alias auto-migration compatibility in seams 141-142 and re-validated canonical guards:
   1. Removed runtime DB collection alias auto-migration from preset normalization:
      1. `src/features/ai/ai-paths/context/PresetsContext.tsx`
      2. `normalizeDbNodePreset` now persists `normalizeDatabasePresetConfig(raw.config)` directly without calling `migrateDatabaseConfigCollections`.
   2. Added regression coverage:
      1. `src/features/ai/ai-paths/context/__tests__/PresetsContext.normalizeDbNodePreset.test.tsx`
         now verifies legacy collection aliases (e.g. `product_parameter`) are not auto-canonicalized during runtime preset normalization.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `migrateDatabaseConfigCollections` usage in `PresetsContext.tsx` and requires canonical direct normalization snippet.
   4. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/context/__tests__/PresetsContext.normalizeDbNodePreset.test.tsx`
      2. `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
      Result: `2` files passed, `4` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4219` files scanned).
23. Pruned validation-config legacy schema gating compatibility in seams 143-144 and re-validated canonical guards:
   1. Removed schema-version-gated `lastEvaluatedAt` compatibility branch:
      1. `src/shared/lib/ai-paths/core/validation-engine/defaults.ts`
      2. `normalizeAiPathsValidationConfig` now preserves sanitized `lastEvaluatedAt` without nulling it for legacy `schemaVersion`.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/validation-engine/__tests__/defaults.normalization.test.ts`
         verifies `lastEvaluatedAt` remains preserved for `schemaVersion: 1` payloads and remains `null` when absent.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `legacySchemaVersion`/schema-gated `lastEvaluatedAt` compatibility snippets in validation defaults and requires canonical `lastEvaluatedAt` normalization snippet.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/validation-engine/__tests__/defaults.normalization.test.ts`
      2. `src/shared/lib/ai-paths/core/validation-engine/__tests__/docs-inference.test.ts`
      3. `src/shared/lib/ai-paths/core/validation-engine/__tests__/semantic-grammar-operators.test.ts`
      Result: `3` files passed, `13` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4220` files scanned).
24. Retired dead collection-alias migration helper surface in seams 145-146 and re-validated canonical guards:
   1. Removed unused migration-only helper exports from runtime collection utility module:
      1. `src/shared/lib/ai-paths/core/utils/collection-names.ts`
      2. deleted `migrateDatabaseConfigCollections` and `migratePathConfigCollections` (plus internal migration helpers), keeping canonical APIs:
         1. `canonicalizeAiPathsCollectionName`
         2. `findPathConfigCollectionAliasIssues`
   2. Updated collection utility regressions to canonical-only expectations:
      1. `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
      2. replaced migration-output assertions with canonical alias-issue detection and canonicalization behavior checks.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `migrateDatabaseConfigCollections` / `migratePathConfigCollections` exports in `collection-names.ts` and requires canonical alias APIs.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
      2. `src/features/ai/ai-paths/context/__tests__/PresetsContext.normalizeDbNodePreset.test.tsx`
      Result: `2` files passed, `5` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4222` files scanned).
25. Pruned settings-store backup payload legacy-shape compatibility in seams 147-148 and re-validated canonical guards:
   1. Tightened backup payload parsing to canonical structured shape only:
      1. `src/shared/lib/ai-paths/settings-store-client.ts`
      2. `readBackupSettings` now accepts only object payloads with:
         1. numeric `savedAt`
         2. array `records`
      3. removed legacy array-root backup payload parsing path.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
      2. verifies structured backup fallback works when API fetch fails and legacy array-root backup payloads are ignored.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of array-root backup payload compatibility parsing in `settings-store-client.ts` and requires canonical structured backup parsing snippets.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
      2. `src/shared/lib/ai-paths/core/utils/__tests__/collection-names.test.ts`
      3. `src/shared/lib/ai-paths/core/validation-engine/__tests__/defaults.normalization.test.ts`
      Result: `3` files passed, `7` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4223` files scanned).
26. Pruned validation-admin path-meta fallback compatibility in seams 149-150 and re-validated canonical guards:
   1. Removed config-record fallback meta synthesis from validation settings parsing:
      1. `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
      2. `parseAiPathsSettings` now composes `pathMetas` from canonical `PATH_INDEX_KEY` entries only.
   2. Added regression coverage:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. verifies legacy `ai_path_index` payloads and missing canonical index entries no longer synthesize selectable path metas.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `fallbackMetas` synthesis in admin validation parsing and requires canonical index-driven `pathMetas` assembly.
   4. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
      Result: `2` files passed, `6` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4224` files scanned).
27. Pruned validation collection-map legacy delimiter compatibility in seams 151-152 and re-validated canonical guards:
   1. Removed `=` delimiter compatibility from validation collection-map parsing:
      1. `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
      2. `parseCollectionMapText` now parses only canonical `entity:collection` lines.
   2. Added regression coverage:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. verifies canonical `:` lines parse and legacy `=` lines are ignored.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `=` delimiter compatibility snippets in validation collection-map parsing and requires canonical `line.indexOf(':')` parsing.
   4. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
      Result: `2` files passed, `8` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4226` files scanned).
28. Pruned validation docs-sources legacy delimiter compatibility in seams 153-154 and re-validated canonical guards:
   1. Removed comma-delimiter compatibility from docs-sources parsing:
      1. `src/features/ai/ai-paths/pages/AdminAiPathsValidationUtils.ts`
      2. `parseDocsSourcesText` now parses canonical newline-delimited sources and ignores comma-delimited lines.
   2. Added regression coverage:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. verifies canonical newline parsing and legacy comma-delimited docs-source rejection.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of comma-delimiter docs-sources parsing and requires canonical newline parsing + comma-line rejection snippets.
   4. Re-ran focused regression bundle:
      1. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      2. `src/shared/lib/ai-paths/__tests__/settings-store-client.backup.test.ts`
      Result: `2` files passed, `10` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4235` files scanned).
29. Pruned database-template catalogId alias auto-promotion compatibility in seams 155-156 and re-validated canonical guards:
   1. Removed template-context catalogId alias sync helpers:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context.ts`
      2. `prepareDatabaseTemplateContext` now keeps `catalogId` context/input wiring explicit and no longer infers/promotes it from nested `context/entity/catalogs` payloads.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-template-context.test.ts`
      2. verifies nested catalog metadata does not auto-populate top-level `catalogId`, and canonical explicit `catalogId` input remains preserved.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of database-template catalogId alias helpers (`resolveCatalogIdFromTemplateInputs`, `applyCatalogIdAliases`, `syncCatalogId`) and requires canonical template-context assembly snippets.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-template-context.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-input-resolution.test.ts`
      3. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      Result: `3` files passed, `14` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4235` files scanned).
30. Pruned database-input nested catalogId alias compatibility in seams 157-158 and re-validated canonical guards:
   1. Removed nested catalogId alias traversal from database input resolution:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-input-resolution.ts`
      2. `resolveDatabaseInputs` now resolves `catalogId` from explicit `catalogId` fields only (no nested `entity/catalogs/entityJson/product/bundle` traversal).
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-input-resolution.test.ts`
      2. verifies nested context catalog metadata no longer auto-populates top-level `catalogId`, while direct canonical fields remain preserved.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of nested catalog alias traversal helpers in database input resolution and requires canonical direct `catalogId` read.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-input-resolution.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-template-context.test.ts`
      3. `src/features/ai/ai-paths/pages/__tests__/AdminAiPathsValidationUtils.test.ts`
      Result: `3` files passed, `16` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4235` files scanned).
31. Pruned database provider-fallback metadata compatibility in seams 159-160 and re-validated canonical guards:
   1. Removed provider-fallback compatibility propagation in database runtime handlers:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
      3. runtime outputs/execution meta no longer include `providerFallback` derived from provider response `fallback` payloads.
   2. Removed local runtime provider-fallback extraction:
      1. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
      2. `extractDatabaseRuntimeMetadata` now keeps canonical provider metadata only.
   3. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      3. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      4. verifies provider `fallback` payloads do not surface as `providerFallback` metadata.
   4. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of provider `fallback` -> `providerFallback` compatibility snippets across query/update handlers and local runtime metadata helpers, while requiring canonical provider metadata snippets.
   5. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      3. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-input-resolution.test.ts`
      Result: `4` files passed, `13` tests passed.
   6. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
32. Pruned database provider alias metadata compatibility in seams 161-162 and re-validated canonical guards:
   1. Removed duplicate `provider` alias emission from query runtime bundles:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
      2. runtime bundles now expose canonical `resolvedProvider` only.
   2. Removed local runtime provider alias fallback:
      1. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
      2. runtime metadata extraction now reads provider metadata from canonical `resolvedProvider` only.
   3. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      3. verifies no legacy `provider` alias surface remains in runtime metadata extraction.
   4. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `resolvedProvider -> provider` alias emission and `bundle.provider` fallback metadata reads, while requiring canonical `resolvedProvider` metadata snippet.
   5. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `3` files passed, `8` tests passed.
   6. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
33. Pruned database-update provider alias metadata compatibility in seam 163 and re-validated canonical guards:
   1. Removed legacy `provider` alias fallback in update execution provider metadata parsing:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
      2. `resolveProviderMeta` now derives provider metadata from canonical `resolvedProvider` only.
      3. removed deprecated `provider` field from `DbActionResult` metadata interface.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      2. verifies provider-only response payloads do not populate `resolvedProvider`.
      3. verifies canonical `resolvedProvider` response metadata remains surfaced in execution metadata.
   3. Validated canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` blocks reintroduction of update provider-alias fallback snippets and requires canonical `resolvedProvider` metadata snippets in update execution handler provider parsing.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      3. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      Result: `3` files passed, `10` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4233` files scanned).
34. Pruned database-query provider-response alias metadata compatibility in seam 164 and re-validated canonical guards:
   1. Removed legacy query-response `provider` alias dependency in query runtime metadata parsing:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
      2. query runtime provider metadata now derives from canonical response fields:
         1. `requestedProvider`
         2. `resolvedProvider`
      3. removed deprecated `provider` field from `DbQueryResult` metadata interface.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. verifies canonical `resolvedProvider` response metadata remains surfaced in runtime bundle.
      3. verifies provider-only response payloads do not populate `resolvedProvider`.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of query-response provider alias parsing snippets and requires canonical `resolvedProvider` parsing snippets in query execution handler metadata derivation.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      3. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/__tests__/useAiPathsLocalExecution.helpers.test.ts`
      Result: `3` files passed, `11` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4234` files scanned).
35. Pruned DB-command provider payload alias metadata compatibility in seam 165 and re-validated canonical guards:
   1. Removed legacy DB-command response `provider` alias emission:
      1. `src/app/api/ai-paths/db-command/handler.ts`
      2. `withProviderPayload` now emits canonical `requestedProvider`/`resolvedProvider` only.
   2. Updated regression coverage:
      1. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      2. verifies fallback responses no longer expose response `provider` alias.
      3. verifies canonical `resolvedProvider` metadata remains surfaced for fallback outcomes.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of DB-command response `provider` alias payload snippets and requires canonical `requestedProvider`/`resolvedProvider` snippets.
   4. Re-ran focused regression bundle:
      1. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `3` files passed, `13` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4236` files scanned).
36. Pruned database client legacy db-query/db-update route compatibility in seam 166 and re-validated canonical guards:
   1. Removed legacy shim-route usage in AI Paths database client query/update helpers:
      1. `src/shared/lib/ai-paths/api/client/database.ts`
      2. `databaseQuery` now routes through canonical `/api/ai-paths/db-action` payload mapping (`find`/`findOne`).
      3. `databaseUpdate` now routes through canonical `/api/ai-paths/db-action` payload mapping (`updateOne`/`updateMany`).
      4. provider forwarding remains canonical enum-only (`auto`/`mongodb`/`prisma`) with invalid values dropped.
   2. Added regression coverage:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. verifies canonical query/update payload mapping and invalid provider drop behavior.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of `/api/ai-paths/db-query` and `/api/ai-paths/db-update` usage in runtime database client and requires canonical db-action routing snippets.
   4. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `4` files passed, `16` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4237` files scanned).
37. Retired DB-query/DB-update shim routes in seam 167 and re-validated canonical guards:
   1. Removed legacy shim endpoints that only proxied into DB-action handling:
      1. deleted `src/app/api/ai-paths/db-query/handler.ts`
      2. deleted `src/app/api/ai-paths/db-query/route.ts`
      3. deleted `src/app/api/ai-paths/db-update/handler.ts`
      4. deleted `src/app/api/ai-paths/db-update/route.ts`
   2. Updated fallback API coverage to canonical DB-action payloads:
      1. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      2. update/fallback coverage now runs against canonical `/api/ai-paths/db-action` payload contracts (`action`, `filter`, `update`) rather than shim payload aliases (`query`, `updates`, `single`).
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs` now blocks reintroduction of DB-query/DB-update shim route files and requires canonical DB-action route files to remain present.
   4. Re-ran focused regression bundle:
      1. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      2. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `4` files passed, `16` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4233` files scanned).
38. Retired DB-command handler module path in seam 168 and re-validated canonical guards:
   1. Moved DB-action implementation out of legacy DB-command module path:
      1. moved `src/app/api/ai-paths/db-command/handler.ts`
      2. to canonical `src/app/api/ai-paths/db-action/handler.ts`
      3. deleted legacy `src/app/api/ai-paths/db-command/handler.ts`.
   2. Preserved canonical route handler export:
      1. `src/app/api/ai-paths/db-action/handler.ts`
      2. added `POST_handler` delegating to `postAiPathsDbActionHandler` to keep route wiring stable.
   3. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. provider metadata contract check now validates canonical `db-action/handler.ts`.
      3. shim retirement guard now blocks reintroduction of `src/app/api/ai-paths/db-command/handler.ts`.
   4. Re-ran focused regression bundle:
      1. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      2. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `4` files passed, `16` tests passed.
   5. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
39. Pruned DB-action request alias compatibility in seam 169 and re-validated canonical guards:
   1. Removed legacy DB-action request alias acceptance from canonical handler contract:
      1. `src/app/api/ai-paths/db-action/handler.ts`
      2. schema now rejects deprecated alias keys: `query`, `updates`.
      3. runtime now reads canonical keys only:
         1. `filter` for predicate payloads.
         2. `update` for write payloads.
      4. removed alias fallback snippets (`filter || query`, `update || updates`) across Prisma and Mongo branches.
   2. Updated canonical DB-action client request mapping:
      1. `src/shared/lib/ai-paths/api/client/database.ts`
      2. `databaseQuery` now maps `DbQueryPayload.query` into canonical DB-action key `filter`.
   3. Updated regression coverage:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. `__tests__/features/ai/ai-paths/api/db-query.test.ts`
      3. db-action route tests now post canonical route URL and canonical request key `filter`.
   4. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added DB-action request contract prune check blocking `query`/`updates` alias schema/runtime fallback snippets and requiring canonical snippets.
      3. strengthened database client route guard to block `query: payload.query` emission and require `filter: payload.query`.
   5. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. `src/app/api/ai-paths/__tests__/db-provider-fallback.test.ts`
      3. `__tests__/features/ai/ai-paths/api/db-query.test.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      5. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      Result: `5` files passed, `20` tests passed.
   6. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
40. Canonicalized DB client query/update payload field contract in seam 170 and re-validated canonical guards:
   1. Canonicalized database client payload type surface:
      1. `src/shared/lib/ai-paths/api/client/database.ts`
      2. `DbQueryPayload` now uses `filter` (legacy `query` removed).
      3. `DbUpdatePayload` now uses `filter` + `update` (legacy `query` / `updates` removed).
      4. `databaseQuery` / `databaseUpdate` now forward canonical keys only.
   2. Propagated canonical payload shape through runtime helpers and call sites:
      1. `src/shared/lib/ai-paths/core/runtime/utils.ts`
      2. `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
      4. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
      5. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-operation.ts`
      6. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-mongo-actions.ts`
      7. `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsSamples.ts`
      8. `src/app/api/v2/products/validator-runtime/evaluate/handler.ts`
   3. Updated regression expectations:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
   4. Extended canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. database-client route compatibility check now blocks legacy `DbQueryPayload.query` / `DbUpdatePayload.query|updates` snippets and requires canonical `filter` / `update` snippets.
      3. blocks reintroduction of legacy payload forwarding snippets (`query: payload.query`, `update: payload.updates`).
   5. Re-ran focused regression bundle:
      1. `src/shared/lib/ai-paths/api/__tests__/database-client.canonical.test.ts`
      2. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-query-execution.guardrails.test.ts`
      3. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-update-execution.test.ts`
      4. `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
      5. `__tests__/features/ai/ai-paths/api/db-query.test.ts`
      Result: `5` files passed, `32` tests passed.
   6. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
   7. `npm run typecheck` -> passed.
41. Pruned validator runtime DB payload alias surface in seam 171 and re-validated canonical guards:
   1. Canonicalized runtime DB payload schema to reject legacy `query` alias:
      1. `src/features/products/validations/validator-runtime-config.ts`
      2. `databaseQueryPayloadSchema` now requires canonical `filter` and blocks `query` via `z.never()`.
   2. Updated runtime UI guidance and prune tests:
      1. `src/features/products/components/settings/validator-settings/modal/ValidatorPatternModalRuntimeSection.tsx`
      2. `__tests__/features/products/validations/validator-runtime-config.test.ts`
      3. `src/features/products/validations/__tests__/runtime-prune.test.ts`
      4. placeholder now documents canonical `payload.filter` and `replacementPaths`.
      5. guard suite now blocks runtime schema/evaluator alias fallback snippets for `payload.query`.
   3. Validation:
      1. `npx vitest run __tests__/features/products/validations/validator-runtime-config.test.ts src/features/products/validations/__tests__/runtime-prune.test.ts` -> passed.
      2. `npm run typecheck` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
42. Pruned DB-schema provider `all` alias surface in seam 172 and re-validated canonical guards:
   1. Removed deprecated provider alias from DB-schema node-config contract:
      1. `src/features/ai/ai-paths/components/node-config/DbSchemaNodeConfigSection.tsx`
      2. provider contract now allows only `auto | mongodb | prisma`.
      3. removed UI selector option `All Providers`.
      4. added canonical provider normalizer that coerces stale non-canonical persisted values to `auto`.
   2. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added DB-schema provider contract prune check that blocks `all` alias snippets and requires canonical provider normalization snippets.
   3. Validation:
      1. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      2. `npm run typecheck` -> passed.
43. Pruned database-node legacy query-provider normalization branch in seam 173 and re-validated canonical guards:
   1. Removed legacy normalization helpers from database node config state:
      1. `src/features/ai/ai-paths/hooks/useDatabaseNodeConfigState.ts`
      2. deleted:
         1. `LEGACY_MONGO_DEFAULT_QUERY_TEMPLATE`
         2. `isLegacyMongoDefaultQuery`
         3. `normalizeLegacyQueryProvider`
      3. introduced canonical `normalizeQueryConfig` helper that normalizes `queryTemplate` only.
   2. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkDatabaseNodeLegacyProviderNormalizationPrune`:
         1. blocks reintroduction of legacy provider/default-query normalization snippets.
         2. requires canonical `normalizeQueryConfig` usage snippet.
   3. Validation:
      1. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      2. `npm run typecheck` -> passed.
44. Pruned entity-update legacy simple-parameters alias compatibility in seam 174 and re-validated canonical guards:
   1. Removed legacy `simpleParameters` inference/merge compatibility branch:
      1. `src/app/api/ai-paths/update/handler.ts`
      2. deleted helper/constants:
         1. `LEGACY_SIMPLE_PARAMETER_PREFIX`
         2. `normalizeLegacySimpleParameterUpdates`
         3. `normalizeExistingParameterValues`
         4. `mergeLegacySimpleParameterInferenceWithExisting`
      3. product update path now explicitly rejects `updates.simpleParameters` with canonical guidance to use `updates.parameters`.
   2. Updated API regression:
      1. `__tests__/features/ai/ai-paths/api/update-handler.test.ts`
      2. now verifies deprecated alias rejection and no product update write call.
   3. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkEntityUpdateSimpleParametersAliasPrune`:
         1. blocks reintroduction of legacy alias merge/inference snippets.
         2. requires canonical explicit rejection snippet/message.
   4. Validation:
      1. `npx vitest run __tests__/features/ai/ai-paths/api/update-handler.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      3. `npm run typecheck` -> passed.
45. Pruned parameter-inference target-path compatibility in seam 175 and re-validated canonical guards:
   1. Enforced canonical parameter-inference target path in runtime guard:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/database-parameter-inference.ts`
      2. `applyParameterInferenceGuard` now blocks non-canonical `parameterInferenceGuard.targetPath`.
      3. canonical allowed target path is `parameters`; deprecated target paths now return blocked outcome with canonical error message.
   2. Updated runtime regressions:
      1. `src/shared/lib/ai-paths/core/runtime/handlers/__tests__/database-parameter-inference.test.ts`
      2. added coverage that `targetPath: 'simpleParameters'` is blocked and dropped from updates.
      3. `__tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts`
      4. migrated remaining simple-parameters fixture to canonical `parameters` target path.
   3. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkParameterInferenceTargetPathCompatibilityPrune`:
         1. requires canonical target-path rejection snippets.
         2. blocks legacy target-path compatibility snippet patterns from reintroduction.
   4. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/core/runtime/handlers/__tests__/database-parameter-inference.test.ts __tests__/features/ai/ai-paths/runtime/handlers/integration.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      3. `npm run typecheck` -> passed.
46. Pruned parameter-inference target-path edit/sanitizer compatibility in seam 176 and re-validated canonical guards:
   1. Enforced canonical target-path at DB node settings edit-time:
      1. `src/features/ai/ai-paths/components/node-config/database/DatabaseSettingsTab.tsx`
      2. introduced canonical target-path constant/normalizer (`parameters`).
      3. enable-flow now persists canonical target path explicitly.
      4. loaded non-canonical target paths are auto-corrected when guard is enabled.
      5. target-path field is read-only and pinned to canonical value.
   2. Enforced canonical target-path rejection during path-config sanitization:
      1. `src/features/ai/ai-paths/components/AiPathsSettingsUtils.ts`
      2. `src/features/products/hooks/useAiPathSettings.ts`
      3. both sanitizers now reject non-canonical `parameterInferenceGuard.targetPath` with `deprecated_parameter_inference_target_path`.
   3. Updated regression coverage:
      1. `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
      2. `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
      3. both suites now assert rejection of `targetPath: 'simpleParameters'`.
   4. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added:
         1. `checkDatabaseSettingsTargetPathEditTimeCanonicalizationPrune`
         2. `checkParameterInferenceTargetPathSanitizationPrune`
      3. guardrails now enforce canonical UI edit-time behavior and sanitizer rejection snippets.
   5. Validation:
      1. `npx vitest run src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      3. `npm run typecheck` -> passed.
47. Pruned loaded-config edge alias fallback in seam 177 and re-validated canonical guards:
   1. Enforced canonical edge source parsing in product-path loaded-config sanitizer:
      1. `src/features/products/hooks/useAiPathSettings.ts`
      2. `resolveEdgeSourceNodeId` now reads only canonical `from`.
      3. `resolveEdgeSourcePort` now reads only canonical `fromPort`.
   2. Updated regression coverage:
      1. `src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts`
      2. added alias-only edge shape rejection coverage (`source` / `target` / `sourceHandle` / `targetHandle`) to enforce canonical edge contracts.
   3. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkLoadedPathSettingsEdgeAliasCompatibilityPrune`:
         1. blocks reintroduction of loaded-config `source` / `sourceHandle` fallback snippets in `useAiPathSettings.ts`.
         2. requires canonical `from` / `fromPort` parsing snippets.
   4. Validation:
      1. `npx vitest run src/features/products/hooks/__tests__/useAiPathSettings.sanitize-loaded-path-config.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      3. `npm run typecheck` -> passed.
48. Pruned semantic-grammar edge alias compatibility in seam 178 and re-validated canonical guards:
   1. Enforced canonical edge serialization in semantic grammar:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/serialize.ts`
      2. removed fallback reads from `source` / `target` / `sourceHandle` / `targetHandle`.
      3. semantic edge export now reads canonical `from` / `to` / `fromPort` / `toPort` only.
   2. Enforced canonical edge deserialization in semantic grammar:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/deserialize.ts`
      2. removed alias writes to `source` / `target` / `sourceHandle` / `targetHandle`.
      3. semantic edge import now emits canonical edge keys only.
   3. Updated regression coverage:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
      2. added alias-only edge serialization coverage (no compatibility upgrade from alias-only shape).
      3. added deserialization coverage that canonical edge keys are emitted without alias fields.
   4. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkSemanticGrammarEdgeAliasCompatibilityPrune` for semantic serialize/deserialize modules.
      3. aligned `checkParameterInferenceTargetPathSanitizationPrune` expected snippets to current canonical unsupported semantics (`unsupported parameter inference target path`, `unsupported_parameter_inference_target_path`).
   5. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4232` files scanned).
      3. `npm run typecheck` -> passed.
49. Pruned semantic-subgraph edge alias compatibility in seam 179 and re-validated canonical guards:
   1. Enforced canonical edge shape in semantic-subgraph apply flow:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts`
      2. removed alias writes from appended edges (`source` / `target` / `sourceHandle` / `targetHandle`).
      3. subgraph edge application now emits canonical edge keys only (`from`, `to`, `fromPort`, `toPort`).
   2. Tightened semantic-grammar regression coverage:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
      2. alias-only edge serialization assertion now requires empty canonical endpoints (no alias upgrade fallback).
      3. deserialization canonical-shape assertion now requires no alias keys.
      4. subgraph-apply test now asserts appended edges are canonical-only (no alias keys).
   3. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. `checkSemanticGrammarEdgeAliasCompatibilityPrune` now also enforces canonical edge shape in `semantic-grammar/subgraph.ts`.
   4. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4234` files scanned).
      3. `npm run typecheck` -> passed.
50. Pruned semantic-subgraph dangling-edge alias compatibility in seam 180 and re-validated canonical guards:
   1. Enforced canonical endpoint parsing in semantic-subgraph dangling-edge detection:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/subgraph.ts`
      2. `resolveEdgeFromNodeId` now reads canonical `edge.from` only.
      3. `resolveEdgeToNodeId` now reads canonical `edge.to` only.
   2. Tightened semantic-grammar regression coverage:
      1. `src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts`
      2. added subgraph dangling-edge guard coverage:
         1. alias-only edge shape (`source`/`target`) is treated as dangling.
         2. canonical edge shape (`from`/`to`) remains non-dangling.
   3. Extended AI Paths canonical guardrails:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. `checkSemanticGrammarEdgeAliasCompatibilityPrune` now also blocks and enforces canonical endpoint parsing snippets in `semantic-grammar/subgraph.ts` (no `edge.source`/`edge.target` fallback).
   4. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/core/semantic-grammar/__tests__/semantic-grammar.test.ts` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed (`4234` files scanned).
      3. `npm run typecheck` -> passed.
51. Started bulk-prune Phase 1 foundation in seam 181:
   1. Added central AI Paths legacy-prune manifest:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. seed rule families cover edge-shape canonicalization and target-path reason-channel canonicalization.
   2. Added shared manifest utilities:
      1. `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
      2. includes manifest load/validation and reusable rule evaluation engine.
   3. Added bulk-prune scanner scaffold:
      1. `scripts/ai-paths/bulk-prune.mjs`
      2. supports Phase 1 scan mode + optional JSON report output.
      3. added npm scripts:
         1. `ai-paths:bulk-prune:scan`
         2. `ai-paths:bulk-prune:report`
   4. Wired canonical guardrail to manifest-driven checks:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. added `checkManifestLegacyPruneRules` so guardrails consume manifest rules in addition to bespoke checks.
   5. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed.
      2. `npm run ai-paths:check:canonical` -> passed.
      3. `npm run typecheck` -> passed.
52. Started bulk-prune Phase 2 codemod execution in seam 182:
   1. Extended manifest target schema with optional deterministic replacements:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added `replacements[]` mappings for canonical edge-shape and target-path message/reason channels.
      3. manifest version bumped to `phase2-2026-03-05`.
   2. Extended shared manifest utilities with apply engine:
      1. `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
      2. validates replacement schema (`from`, `to`, optional `replaceAll`).
      3. added `applyLegacyPruneManifest(...)` with dry-run support and per-target replacement report output.
   3. Implemented bulk-prune apply mode:
      1. `scripts/ai-paths/bulk-prune.mjs`
      2. `--mode apply` now executes manifest replacements (or dry-run with `--dry-run`) and emits post-apply findings.
      3. apply report includes changed file count, replaced snippet count, and detailed target replacement telemetry.
   4. Added npm entrypoints for apply workflow:
      1. `package.json`
      2. `ai-paths:bulk-prune:apply:dry-run`
      3. `ai-paths:bulk-prune:apply`
   5. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed.
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:bulk-prune:apply` -> passed.
      4. `npm run ai-paths:check:canonical` -> passed (`4237` files scanned).
      5. `npm run typecheck` -> fails due pre-existing unrelated compile errors in currently-migrating edge-shape call sites (`source` / `target` usage in Case Resolver and AI Paths simulation surfaces).
53. Expanded bulk-prune manifest coverage (Phase 2) and started guardrail consolidation (Phase 3) in seam 183:
   1. Expanded manifest rule coverage from seed set to broader AI Paths legacy-compat surfaces:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. rule count increased to `15` rules across `20` targets.
      3. added rule families for:
         1. database template/input catalog alias prune.
         2. db-action provider/request alias prune.
         3. database client legacy-route/payload alias prune.
         4. API client CSRF helper alias prune.
         5. DB schema provider `all` alias prune.
         6. entity-update simpleParameters alias prune.
         7. database-settings target-path edit canonicalization.
         8. starter-workflow edge alias prune.
         9. core factory/node-identity edge alias cleanup prune.
   2. Started Phase 3 manifest-first guardrail consolidation:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct execution of migrated bespoke checks from `main` and left those surfaces to `checkManifestLegacyPruneRules`.
      3. retained bespoke checks only for non-manifested logic (cross-file scans, file existence checks, and dynamic checks not yet manifest-ready).
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`15` rules, `20` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4237` files scanned).
      4. `npm run typecheck` -> fails due pre-existing Case Resolver edge-shape contract drift (e.g. `src/features/case-resolver/hooks/useNodeFileWorkspaceState.ts`, `src/features/case-resolver/node-file-snapshots.ts`, `src/features/case-resolver/settings-graph.ts`).
54. Continued Phase 3 manifest-first consolidation for database provider fallback/alias in seam 184:
   1. Expanded bulk-prune manifest coverage for database provider fallback/alias metadata channels:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule `database_provider_fallback_alias_metadata` across:
         1. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-query-execution.ts`
         2. `src/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution.ts`
         3. `src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers.ts`
      3. rule enforces canonical requested/resolved provider metadata and blocks fallback/provider alias snippet reintroduction.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of:
         1. `checkDatabaseProviderFallbackCompatibilityPrune`
         2. `checkDatabaseProviderAliasCompatibilityPrune`
         3. `checkDatabaseUpdateProviderAliasCompatibilityPrune`
         4. `checkDatabaseQueryProviderResponseAliasCompatibilityPrune`
      3. these surfaces are now enforced through `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`16` rules across `23` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4237` files scanned).
      4. `npm run typecheck` -> fails due pre-existing unrelated compile error in runtime module typing (`src/shared/lib/ai-paths/core/runtime/engine-modules/engine-state-manager.ts`).
55. Continued Phase 3 manifest-first consolidation for runtime/simulation reason-channel checks in seam 185:
   1. Expanded manifest rule coverage for remaining runtime reason-channel and simulation alias checks:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `parameter_inference_target_path_runtime`
         2. `database_schema_snapshot_provider_error_channel`
         3. `trigger_data_collection_alias_error_channel`
         4. `runtime_node_identity_reason_channel`
         5. `simulation_edge_alias`
      3. bulk-prune manifest now covers `21` rules across `35` targets.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkParameterInferenceTargetPathCompatibilityPrune`
         2. `checkDatabaseSchemaSnapshotProviderErrorChannelPrune`
         3. `checkTriggerDataAndCollectionAliasErrorChannelPrune`
         4. `checkRuntimeAndNodeIdentityReasonChannelPrune`
         5. `checkEdgeAliasCleanupCompatibilityPrune`
         6. `checkSimulationEdgeAliasCompatibilityPrune`
      3. these surfaces are now enforced by `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`21` rules across `35` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4239` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> passed.
56. Continued Phase 3 manifest-first consolidation for settings/validation guardrails in seam 186:
   1. Expanded manifest coverage for settings-handler and validation-formatting guardrails:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `settings_handler_versioned_key_guards`
         2. `maintenance_handler_enum_contract`
         3. `trigger_buttons_api_client`
         4. `preset_collection_migration`
         5. `validation_config_schema`
         6. `settings_backup_payload`
         7. `validation_path_index_meta_fallback`
         8. `validation_collection_map_delimiter`
         9. `validation_docs_sources_delimiter`
      3. bulk-prune manifest now covers `30` rules across `44` targets.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkSettingsHandlerVersionedKeyGuards`
         2. `checkMaintenanceHandlerEnum`
         3. `checkTriggerButtonsApiCompatibilityPrune`
         4. `checkPresetCollectionMigrationCompatibilityPrune`
         5. `checkValidationConfigLegacySchemaCompatibilityPrune`
         6. `checkSettingsBackupPayloadCompatibilityPrune`
         7. `checkValidationPathIndexMetaFallbackCompatibilityPrune`
         8. `checkValidationCollectionMapLegacyDelimiterCompatibilityPrune`
         9. `checkValidationDocsSourcesLegacyDelimiterCompatibilityPrune`
      3. these surfaces are now enforced by `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`30` rules across `44` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4241` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> passed.
57. Continued Phase 3 manifest-first consolidation for dbQuery + run-source/meta guardrails in seam 187:
   1. Expanded manifest coverage for database dbQuery compatibility and run-source/meta channels:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `database_node_legacy_dbquery`
         2. `collection_names_legacy_dbquery`
         3. `run_execution_meta_contract`
         4. `run_source_meta_contract`
         5. `enqueue_meta_source_contract`
         6. `run_source_filter_contract`
         7. `queue_cache_run_source_contract`
         8. `run_source_helpers_contract`
      3. bulk-prune manifest now covers `38` rules across `53` targets.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkDatabaseNodeLegacyDbQueryPrune`
         2. `checkCollectionNamesLegacyDbQueryPrune`
         3. `checkRunExecutionMetaCompatibilityPrune`
         4. `checkRunSourceMetaCompatibilityPrune`
         5. `checkEnqueueMetaSourceCompatibilityPrune`
         6. `checkRunSourceFilterCompatibilityPrune`
         7. `checkQueueCacheRunSourceCompatibilityPrune`
      3. `checkRunSourceHelpersCompatibilityPrune` now retains only the file-presence guard (`src/features/ai/ai-paths/lib/run-sources.ts`) while snippet checks moved to manifest.
      4. migrated surfaces are now enforced by `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`38` rules across `53` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4242` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> passed.
58. Continued Phase 3 manifest-first consolidation for runtime retry/halt + runMode/requestId/status guardrails in seam 188:
   1. Expanded manifest coverage for runtime retry/halt controls and runtime identity/status aliases:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `runtime_retry_legacy_enabled`
         2. `runtime_halt_legacy_control`
         3. `run_mode_queue_alias`
         4. `request_id_lookup_contract`
         5. `runtime_node_status_alias`
      3. bulk-prune manifest now covers `43` rules across `60` targets.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkRuntimeRetryLegacyEnabledPrune`
         2. `checkRuntimeHaltLegacyControlPrune`
         3. `checkRunModeQueueCompatibilityPrune`
         4. `checkRequestIdLookupCompatibilityPrune`
         5. `checkRuntimeNodeStatusAliasCompatibilityPrune`
      3. migrated surfaces are now enforced by `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`43` rules across `60` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4244` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> failed at `src/features/ai/image-studio/components/CenterPreview.tsx:769` (`Property 'vectorContextValue' does not exist on type 'IntrinsicAttributes'.`).
59. Continued Phase 3 manifest-first consolidation for provider/ports/path-save/docs naming guardrails in seam 189:
   1. Expanded manifest coverage for database provider normalization, graph ports alias cleanup, path-save raw-message contract, and docs fallback naming:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `database_node_provider_normalization_contract`
         2. `graph_ports_legacy_alias_cleanup`
         3. `path_save_raw_message_contract`
         4. `validation_docs_fallback_manifest_naming_channel`
      3. bulk-prune manifest now covers `47` rules across `65` targets.
   2. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkDatabaseNodeLegacyProviderNormalizationPrune`
         2. `checkLegacyPortAliasPrune`
         3. `checkPathSaveRawMessageCompatibilityPrune`
         4. `checkValidationDocsFallbackManifestNamingChannelPrune`
      3. migrated surfaces are now enforced by `checkManifestLegacyPruneRules`.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`47` rules across `65` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4246` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> failed with current pre-existing Image Studio typing drift in `src/features/ai/image-studio/components/CenterPreview.tsx`:
         1. `TS6133`: `CenterPreviewDetailsModal` is declared but never read (`:62`).
         2. `TS2552`: `detailsSlotId` cannot be found (`:652`, repeated).
         3. `TS2304`: `VersionNode` cannot be found (`:656`).
         4. `TS2304`: `buildDetailsNodeForCenterPreview` cannot be found (`:657`).
         5. `TS2304`: `VersionNodeDetailsModal` cannot be found (`:830`).
60. Continued Phase 3 manifest-first consolidation for source-scan + retired-file guardrails in seam 190:
   1. Extended manifest engine capabilities for remaining bulk-only compatibility surfaces:
      1. `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
      2. added target modes/controls:
         1. `mode: "source_scan"` for non-test runtime source token scanning under target roots.
         2. `expectedState: "missing"` for retired-file invariants.
      3. evaluator/apply reporting now supports these target shapes while preserving existing file-snippet rules.
   2. Expanded manifest coverage for legacy runtime key/action token scans and retired migration/shim files:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule families:
         1. `legacy_validation_key_runtime_source_scan`
         2. `legacy_index_key_runtime_source_scan`
         3. `forbidden_maintenance_action_ids_runtime_source_scan`
         4. `trigger_fetcher_migration_module_removed`
         5. `trigger_fetcher_migration_tokens_runtime_source_scan`
         6. `legacy_dbquery_provider_migration_tokens_runtime_source_scan`
         7. `feature_run_sources_duplicate_module_removed`
         8. `db_query_update_shim_retirement_state`
      3. bulk-prune manifest now covers `55` rules across `80` targets.
   3. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of migrated checks:
         1. `checkLegacyValidationKeyUsage`
         2. `checkLegacyIndexKeyUsage`
         3. `checkForbiddenMaintenanceActionIds`
         4. `checkTriggerFetcherLegacyMigrationPrune`
         5. `checkLegacyDbQueryProviderMigrationPrune`
         6. `checkRunSourceHelpersCompatibilityPrune`
         7. `checkDbQueryUpdateShimRetirement`
      3. migrated surfaces are now enforced by `checkManifestLegacyPruneRules`.
   4. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`55` rules across `80` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4249` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> passed.
61. Continued Phase 3 manifest-first consolidation for maintenance action-id exactness in seam 191:
   1. Extended manifest engine capabilities for exact const-array invariants:
      1. `scripts/ai-paths/legacy-prune-manifest-utils.mjs`
      2. added target mode:
         1. `mode: "const_array"` parses a named `... = [ ... ] as const` list and enforces exact ordered items.
      3. evaluator/apply reporting now supports const-array targets without changing file-rewrite behavior.
   2. Expanded manifest coverage for maintenance action-id contract:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule:
         1. `maintenance_action_ids_const_array_contract`
      3. bulk-prune manifest now covers `56` rules across `81` targets.
   3. Consolidated canonical guardrail execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed direct `main` execution of:
         1. `checkMaintenanceConstants`
      3. removed now-unused helper/constants for this check:
         1. `parseMaintenanceActionIds`
         2. `EXPECTED_MAINTENANCE_ACTION_IDS`
         3. `MAINTENANCE_CONSTANTS_FILE`
      4. migrated surface is now enforced by `checkManifestLegacyPruneRules`.
   4. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`56` rules across `81` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4250` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> passed.
62. Continued Phase 3 canonical-guardrail runner simplification in seam 192:
   1. Simplified canonical check runner to manifest-only execution path:
      1. `scripts/ai-paths/check-canonical.mjs`
      2. removed legacy in-file compatibility-check function surface and retained:
         1. source-file counting helper (`collectSourceFiles`)
         2. manifest load/evaluate violation reporting (`checkManifestLegacyPruneRules`)
         3. canonical pass/fail output contract
      3. enforcement remains entirely manifest-driven via `checkManifestLegacyPruneRules`.
   2. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`56` rules across `81` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4245` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run typecheck` -> failed with current repository typing drift at `src/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository.ts:804` (`TS2322: Type 'null' is not assignable to type 'Condition<string | Date | undefined>'.`).
63. Continued Phase 3 manifest-utils hardening + maintenance const-array ownership retarget in seam 193:
   1. Added regression coverage for new manifest target modes:
      1. `__tests__/scripts/ai-paths/legacy-prune-manifest-utils.test.ts`
      2. covered behaviors:
         1. `source_scan` flags runtime tokens and skips test files.
         2. `expectedState: "missing"` reports present retired files.
         3. `const_array` enforces exact ordered list values.
   2. Retargeted maintenance const-array rule to canonical ownership file:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. `maintenance_action_ids_const_array_contract` target updated:
         1. `src/features/ai/ai-paths/server/settings-store.constants.ts` -> `src/shared/contracts/ai-paths.ts`
      3. bulk-prune manifest remains at `56` rules across `81` targets.
   3. Validation:
      1. `npx vitest run __tests__/scripts/ai-paths/legacy-prune-manifest-utils.test.ts` -> passed (`3` tests).
      2. `npm run ai-paths:bulk-prune:scan` -> passed (`56` rules across `81` targets).
      3. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      4. `npm run ai-paths:check:canonical` -> passed (`4216` files scanned).
      5. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      6. `npm run typecheck` -> failed with current repository typing drift:
         1. `src/features/products/validations/context.tsx:7` (`TS2307: Cannot find module './validators' or its corresponding type declarations.`)
         2. `src/features/products/validations/hooks.ts:5` (`TS2307: Cannot find module './validators' or its corresponding type declarations.`)
64. Continued Phase 3 portable-engine path-config warning-channel canonicalization in seam 194:
   1. Canonicalized portable-engine path-config migration warning code/message and local naming:
      1. `src/shared/lib/ai-paths/portable-engine/index.ts`
      2. changes:
         1. `PortablePathMigrationWarningCode`: `'legacy_path_config_upgraded'` -> `'path_config_upgraded'`
         2. message: `Legacy path config payload upgraded to portable package v1.` -> `Path config payload upgraded to portable package v1.`
         3. local var: `normalizedLegacyPathConfig` -> `normalizedPathConfig`
   2. Added regression coverage + manifest guardrail for the warning-channel rename:
      1. `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts`
      2. assertion now expects `warning.code === 'path_config_upgraded'`
      3. `scripts/ai-paths/legacy-prune-manifest.json`
      4. added rule family:
         1. `portable_engine_path_config_warning_channel`
      5. bulk-prune manifest now covers `57` rules across `82` targets.
   3. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts __tests__/scripts/ai-paths/legacy-prune-manifest-utils.test.ts` -> passed (`32` tests).
      2. `npm run ai-paths:bulk-prune:scan` -> passed (`57` rules across `82` targets).
      3. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      4. `npm run ai-paths:check:canonical` -> passed (`4216` files scanned).
      5. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      6. `npm run typecheck` -> failed with current repository typing drift at `src/features/observability/context/SystemLogsContext.tsx:529` (`TS2353: Object literal may only specify known properties, and 'setPage' does not exist in type 'SystemLogsStateContextValue'.`)
65. Continued Phase 3 portable-engine warning-channel site-wide guardrail alignment in seam 195:
   1. Extended site-wide canonical runtime guardrails for portable-engine warning-channel canonicalization:
      1. `scripts/canonical/check-sitewide.mjs`
      2. added forbidden tokens:
         1. `legacy_path_config_upgraded`
         2. `Legacy path config payload upgraded to portable package v1.`
   2. Validation:
      1. `npm run canonical:check:sitewide` -> passed (`3816` runtime source files, `4` docs artifacts).
      2. `npm run ai-paths:bulk-prune:scan` -> passed (`57` rules across `82` targets).
      3. `npm run ai-paths:check:canonical` -> passed (`4217` files scanned).
      4. `npm run typecheck` -> failed with current repository typing drift at `src/features/cms/components/frontend/blocks/BlockContext.tsx:3` (`TS6133: 'React' is declared but its value is never read.`).
66. Continued Phase 3 stable-hash seed contract hardening in seam 196:
   1. Expanded manifest coverage for deterministic node-id hash seed continuity channels:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule family:
         1. `node_identity_stable_hash_legacy_seed_contract`
      3. rule requires intentional stable hash-seed keys in runtime:
         1. `src/shared/lib/ai-paths/core/utils/factory.ts` -> `legacyId: sourceId,`
         2. `src/shared/lib/ai-paths/core/utils/node-identity.ts` -> `legacyNodeTypeId: ...` and `legacyId: ...`
      4. bulk-prune manifest now covers `58` rules across `84` targets.
   2. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`58` rules across `84` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4217` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run canonical:check:sitewide` -> passed (`3816` runtime source files, `4` docs artifacts).
      6. `npm run typecheck` -> passed.
67. Continued Phase 3 trigger database-guard naming canonicalization in seam 197:
   1. Canonicalized trigger normalization guard helper naming from deprecated to unsupported channel:
      1. `src/shared/lib/ai-paths/core/normalization/trigger-normalization.ts`
      2. renamed:
         1. `assertNoDeprecatedTriggerDatabaseConfig` -> `assertNoUnsupportedTriggerDatabaseConfig`
      3. updated sanitize flow callsite to use canonical helper name.
   2. Extended AI Paths and site-wide guardrails for this naming channel:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule family:
         1. `trigger_database_guard_unsupported_naming`
      3. `scripts/canonical/check-sitewide.mjs`
      4. added forbidden token:
         1. `assertNoDeprecatedTriggerDatabaseConfig`
      5. bulk-prune manifest now covers `59` rules across `85` targets.
   3. Validation:
      1. `npm run ai-paths:bulk-prune:scan` -> passed (`59` rules across `85` targets).
      2. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      3. `npm run ai-paths:check:canonical` -> passed (`4220` files scanned).
      4. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      5. `npm run canonical:check:sitewide` -> passed (`3818` runtime source files, `4` docs artifacts).
      6. `npm run typecheck` -> failed with current repository typing drift:
         1. `src/features/ai/ai-paths/context/PersistenceContext.tsx:13` (`TS6192: All imports in import declaration are unused.`)
         2. `src/features/ai/ai-paths/context/RunHistoryContext.tsx:15` (`TS6196: 'AiPathRunNodeRecord' is declared but never used.`)
         3. `src/features/ai/image-studio/server/autoscale-service.ts:23` (`TS6133: 'getImageStudioSlotById' is declared but its value is never read.`)
68. Continued Phase 3 run-enqueued event contract hard-cut in seam 198:
   1. Removed legacy product-run browser event channel and productId detail fallback from runtime listeners:
      1. `src/shared/lib/query-invalidation.ts`
      2. removed legacy `ai-path-product-run-queued` dispatch branch.
      3. `src/features/products/hooks/useProductAiPathsRunSync.ts`
      4. removed `detail['productId']` fallback resolution and removed `ai-path-product-run-queued` listener.
   2. Updated regression tests for canonical event-only behavior:
      1. `src/features/products/hooks/useProductAiPathsRunSync.test.tsx`
      2. renamed legacy support assertion to enforce ignored legacy event.
      3. `__tests__/shared/lib/query-invalidation.test.ts`
      4. added test asserting `notifyAiPathRunEnqueued` does not emit legacy `ai-path-product-run-queued`.
   3. Extended AI Paths and site-wide guardrails for this event-contract channel:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule family:
         1. `run_enqueued_event_contract`
      3. `scripts/canonical/check-sitewide.mjs`
      4. added forbidden token:
         1. `ai-path-product-run-queued`
      5. bulk-prune manifest now covers `60` rules across `87` targets.
   4. Validation:
      1. `npx vitest run src/features/products/hooks/useProductAiPathsRunSync.test.tsx __tests__/shared/lib/query-invalidation.test.ts` -> passed (`20` tests).
      2. `npm run ai-paths:bulk-prune:scan` -> passed (`60` rules across `87` targets).
      3. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      4. `npm run ai-paths:check:canonical` -> passed (`4214` files scanned).
      5. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      6. `npm run canonical:check:sitewide` -> passed (`3812` runtime source files, `4` docs artifacts).
      7. `npm run typecheck` -> terminated in this environment without diagnostics (`exit code 137`; log contains only `tsc --noEmit --incremental false` startup line).
69. Continued Phase 3 portable-engine path-config edge-alias hard-cut in seam 199:
   1. Removed path-config edge alias upgrade fallback from portable-engine normalization:
      1. `src/shared/lib/ai-paths/portable-engine/index.ts`
      2. canonical edge normalization now resolves only `from` / `to` / `fromPort` / `toPort`.
      3. removed alias fallback reads for:
         1. `source` / `target`
         2. `sourceHandle` / `targetHandle`
      4. renamed helper:
         1. `normalizePathConfigEdgeAliases` -> `normalizePathConfigEdges`
   2. Updated portable-engine regression coverage for canonical-only edge normalization:
      1. `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts`
      2. alias-only path-config edge test now asserts unresolved canonical edge endpoints (`from`/`to` empty; no port aliases upgraded).
   3. Extended AI Paths and site-wide guardrails for this edge-alias channel:
      1. `scripts/ai-paths/legacy-prune-manifest.json`
      2. added rule family:
         1. `portable_engine_path_config_edge_alias_hard_cut`
      3. `scripts/canonical/check-sitewide.mjs`
      4. added forbidden tokens:
         1. `asTrimmedString(edge.from) ?? asTrimmedString(edge.source)`
         2. `asTrimmedString(edge.to) ?? asTrimmedString(edge.target)`
         3. `resolveEdgePort(edge, 'fromPort', 'sourceHandle')`
         4. `resolveEdgePort(edge, 'toPort', 'targetHandle')`
      5. bulk-prune manifest now covers `61` rules across `88` targets.
   4. Validation:
      1. `npx vitest run src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` -> passed (`37` tests).
      2. `npm run ai-paths:bulk-prune:scan` -> passed (`61` rules across `88` targets).
      3. `npm run ai-paths:bulk-prune:apply:dry-run -- --write-report docs/metrics/ai-paths-bulk-prune-apply-dry-run-latest.json` -> passed.
      4. `npm run ai-paths:check:canonical` -> passed (`4204` files scanned).
      5. `npm run ai-paths:bulk-prune:report` -> passed (report refreshed).
      6. `npm run canonical:check:sitewide` -> passed (`3802` runtime source files, `4` docs artifacts).
      7. `npm run typecheck` -> passed.

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
