---
owner: 'Folder Tree Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:foldertree'
canonical: true
---

# Master Folder Tree Shell Migration Phase 1: Parity Baseline and Test Lock

Date: 2026-03-05  
Scope owner: Folder tree maintainers

## Phase 1 Objective

Lock behavior parity before pure-shell runtime extraction by:

1. Defining the feature parity checklist.
2. Mapping existing test coverage to each parity item.
3. Adding missing baseline tests for runtime-coupled behavior.

## Parity Checklist (Locked)

| Parity item | Required behavior | Coverage status | Tests |
| --- | --- | --- | --- |
| Focus routing | Active tree instance becomes runtime-focused when user interacts with that instance. | Locked | `useFolderTreeInstanceV2.external-sync.test.tsx` (`routes focused instance to runtime when selection changes`) |
| Keyboard shortcut routing | Global keydown dispatch reaches only focused tree instance handler (outside inputs). | Locked | `runtime-provider.test.tsx` (`dispatches keyboard handlers only for the focused instance`) |
| Undo target selection | Cmd/Ctrl+Z routes to focused tree, including multi-instance pages. | Locked | `runtime-provider.test.tsx` (`forwards Cmd/Ctrl+Z...`, `routes undo shortcut to the currently focused instance...`, `does not hijack undo shortcut while typing in input`) |
| Transaction failure semantics | Adapter failures trigger rollback and preserve consistent error state. | Locked | `useFolderTreeInstanceV2.external-sync.test.tsx` (`records conflict metric...`, `records rollback metric...`) |
| Conflict vs rollback telemetry | Conflict failures increment `transaction_conflict`; non-conflict failures increment `transaction_rollback`. | Locked | `useFolderTreeInstanceV2.external-sync.test.tsx` (`records conflict metric...`, `records rollback metric...`) |
| Runtime search cache lifecycle | Per-instance search cache can be read/written and is cleared on unregister. | Locked | `runtime-provider.test.tsx` (`stores search cache per instance and clears it after unregister`) |
| Performance metrics plumbing | Viewport render path records runtime performance counters (`row_rerender`). | Locked (baseline) | `FolderTreeViewportV2.metrics.test.tsx` (`records row rerender metrics through the runtime bus`) |
| Parse failure telemetry | Invalid persisted UI payload increments `ui_state_parse_failure` and logs client error. | Locked | `useFolderTreeUiState.metrics.test.tsx` (`records parse metric and logs client error...`) |

## Existing Core Coverage Inventory (Retained)

1. Tree rendering and interaction
- `FolderTreeViewportV2.search.test.tsx` (highlight/filter/empty search rendering)
- `FolderTreeViewportV2.multiselect.test.tsx` (single-select vs multi-select pointer behavior)
- `core-flatten.test.ts` (visible-node flattening based on expansion state)

2. Contracts and adapters
- `settings.test.ts` (strict UI/profile parsing)
- `createMasterFolderTreeAdapterV3.test.ts` (transaction handler delegation)
- `createMasterFolderTreeTransactionAdapter.test.ts` (transaction envelope behavior)
- `useFolderTreeInstanceV2.external-sync.test.tsx` (external sync short-circuit path and adapter shape guard)

3. Relation-browser shell consumers
- `relation-tree-browser.test.tsx`
- `case-resolver-document-relations.test.tsx`
- `case-resolver-scan-relations.test.tsx`
- `document-relation-search-hook.test.ts`
- `case-list-search-runtime.test.tsx`

## Phase 1 Delta Added

1. Expanded runtime provider tests for:
- focused undo arbitration across multiple instances
- focused keyboard handler dispatch
- runtime search cache lifecycle

2. Expanded `useFolderTreeInstanceV2` test coverage for:
- runtime focus routing from instance selection
- transaction conflict/rollback metrics and rollback stage assertions

3. Added metric-focused tests for:
- viewport `row_rerender` runtime metric
- UI state parse-failure metric (`ui_state_parse_failure`)

4. Follow-up shell-purity hardening:
- removed runtime-provider wrapper dependency from runtime metric suites by passing explicit runtime buses
- added deterministic `frame_budget_miss` assertion driven by controlled animation-frame timing
- added repeated mount/unmount churn assertion to verify runtime registration cleanup across instance lifecycle churn

## Remaining Risks (For Phase 2/3)

1. Cross-route churn is covered by Phase 2 runtime tests and browser lifecycle stress is covered by Phase 3 (`e2e/features/foldertree/foldertree-runtime-lifecycle.spec.ts`); remaining lifecycle risk is cross-browser (WebKit/Firefox) parity.

## Verification Gate For Phase 1

Run:

1. `npx vitest run src/features/foldertree/v2/__tests__/runtime-provider.test.tsx`
2. `npx vitest run src/features/foldertree/v2/__tests__/useFolderTreeInstanceV2.external-sync.test.tsx`
3. `npx vitest run src/features/foldertree/v2/__tests__/useFolderTreeUiState.metrics.test.tsx`
4. `npx vitest run src/features/foldertree/v2/components/__tests__/FolderTreeViewportV2.metrics.test.tsx`
