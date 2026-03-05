# Master Folder Tree Migration Plan (Newest Form, Legacy Prune)

Date: 2026-03-04
Owner: Folder Tree maintainers + feature owners

## Goal

Move Master Folder Tree to a single canonical runtime form across all instances, then delete compatibility shims and dead legacy pathways.

## Execution Status (2026-03-04)

Completed in codebase:

1. Added dedicated `admin_menu_layout` instance and moved Admin Menu settings to that instance.
2. Removed legacy compatibility shims (`src/features/foldertree/master/internal-drop.ts`, `src/features/foldertree/master/external-drop.ts`).
3. Removed legacy aggregate profile APIs and settings key usage (`parseFolderTreeProfilesV2`, `coerceProfileV2`, `FOLDER_TREE_PROFILES_V2_SETTING_KEY`).
4. Added instance parity guard test for profile defaults + settings metadata + persistence feedback.
5. Added DB migration script `scripts/db/migrate-master-folder-tree-profiles-v2.ts` with `--dry-run`/`--apply`, provider selection, optional `--report-json`, and optional `--delete-legacy-key`.
6. Standardized remaining inline transaction adapters to shared factory helper:
   - Added `src/features/foldertree/v2/adapter/createMasterFolderTreeTransactionAdapter.ts`
   - Added tests in `src/features/foldertree/v2/__tests__/createMasterFolderTreeTransactionAdapter.test.ts`
   - Updated: Admin Menu, Validator Lists, Validator Patterns, Prompt Exploder (segments/hierarchy/subsections), Brain Catalog.
7. Executed migration script:
   - Dry-run report: `/tmp/master-folder-tree-migration-dryrun.json`
   - Apply report: `/tmp/master-folder-tree-migration-apply.json`
   - Result: legacy `folder_tree_profiles_v2` key not present, no writes required (`writesApplied: 0`).
8. Added runtime consumer usage guard:
   - `src/shared/utils/__tests__/folder-tree-instance-consumer-usage.test.ts`
   - Ensures every registered folder-tree instance has at least one runtime consumer reference in `src/`.

Operational follow-up required:

1. Run migration in dry-run mode in each target environment.
2. Review generated report.
3. Run in apply mode and optionally delete the legacy aggregate key (if present in that environment).

## Execution Status (2026-03-05, Shell Runtime Decoupling)

Completed in codebase:

1. Introduced runtime bus factory + explicit runtime types:
   - `src/features/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus.ts`
   - `src/features/foldertree/v2/runtime/types.ts`
2. Refactored `MasterFolderTreeRuntimeProvider` to use the factory runtime object lifecycle (`dispose` on unmount) instead of embedding runtime state/event logic directly.
3. Added shell runtime injection primitives:
   - `useFolderTreeShellRuntime`
   - `useSharedMasterFolderTreeRuntime`
4. Updated v2 internals to consume injected runtime (with context fallback):
   - `useFolderTreeInstanceV2`
   - `useFolderTreeTransaction`
   - `useFolderTreeKeyboardNav`
   - `useFolderTreeUiState`
   - `useMasterFolderTreeShell`
   - `FolderTreeViewportV2`
5. Migrated `RelationTreeBrowser` to a self-contained shared runtime coordinator (no hard provider dependency for tree runtime behavior) and updated related tests to run without `MasterFolderTreeRuntimeProvider`.
6. Started layout-level runtime-provider unwind:
   - Removed global `MasterFolderTreeRuntimeProvider` wrapping from `src/app/layout.tsx`.
   - Removed admin `MasterFolderTreeRuntimeProvider` wrapping from `src/app/(admin)/layout.tsx`.
7. Added shared shell runtime fallback for provider-less execution:
   - `useFolderTreeShellRuntime` now resolves to a shared runtime bus singleton when context runtime is absent.
8. Removed additional provider wrappers from folder-tree viewport search/multi-select tests by injecting runtime directly.
9. Removed remaining provider wrappers from runtime-coupled shell metrics tests by injecting `createMasterFolderTreeRuntimeBus` directly:
   - `FolderTreeViewportV2.metrics.test.tsx`
   - `useFolderTreeInstanceV2.external-sync.test.tsx`
   - `useFolderTreeUiState.metrics.test.tsx`
10. Added deterministic shell-runtime hardening tests:
   - `frame_budget_miss` metric assertion for drag-frame budget overruns (`FolderTreeViewportV2.metrics.test.tsx`).
   - repeated mount/unmount runtime-registration churn cleanup assertion (`useFolderTreeInstanceV2.external-sync.test.tsx`).
11. Added Phase 2 route-lifecycle churn hardening suite for providerless shell runtime:
   - `src/features/foldertree/v2/__tests__/shell-runtime-route-churn.test.tsx`
   - Locks shared-runtime identity stability, stale registration cleanup, focused-instance reassignment, and keyboard-handler non-leakage across repeated route remount.

## Canonical Target (Newest Form)

- Runtime/UI: `useMasterFolderTreeShell` + `FolderTreeViewportV2` for all interactive instances.
- Adapter contract: `MasterFolderTreeAdapterV3` only.
- Persistence keys: per-instance keys only:
  - `folder_tree_profile::{instance}`
  - `folder_tree_ui_state::{instance}`
- Profiles: strict per-instance `FolderTreeProfileV2` parsing and canonicalized data.

## Current Legacy/Compatibility Surfaces To Prune

1. Legacy re-export shims:
   - `src/features/foldertree/master/internal-drop.ts`
   - `src/features/foldertree/master/external-drop.ts`
2. Legacy aggregate profile API/key (not used by active runtime):
   - `FOLDER_TREE_PROFILES_V2_SETTING_KEY` (`folder_tree_profiles_v2`)
   - `parseFolderTreeProfilesV2` / `coerceProfileV2`
3. Compatibility alias type:
   - `MasterFolderTreeAdapter = MasterFolderTreeAdapterV3`
4. Cross-instance coupling:
   - Resolved by introducing dedicated `admin_menu_layout` instance key.

## Instance Coverage Matrix

Registered instances (current 16):

1. `notes` (`src/features/notesapp/components/NotesAppFolderTree.tsx`)
2. `image_studio` (`src/features/ai/image-studio/components/SlotTree.tsx`)
3. `product_categories` (`src/features/products/components/settings/CategoriesSettings.tsx`)
4. `cms_page_builder` (`src/features/cms/components/page-builder/ComponentTreePanel.tsx`)
5. `case_resolver` (`src/features/case-resolver/components/CaseResolverFolderTree.tsx`)
6. `case_resolver_case_hierarchy` (`src/features/case-resolver/components/CaseListPanel.tsx`)
7. `case_resolver_document_relations` (`src/features/case-resolver/components/page/CaseResolverDocumentEditor.tsx`)
8. `case_resolver_nodefile_relations` (`src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx`)
9. `case_resolver_scanfile_relations` (`src/features/case-resolver/components/page/CaseResolverScanFileEditor.tsx`)
10. `validator_list_tree` (`src/features/admin/pages/validator-lists/ValidatorListTree.tsx`)
11. `validator_pattern_tree` (`src/features/products/components/settings/validator-settings/ValidatorPatternTree.tsx`)
12. `prompt_exploder_segments` (`src/features/prompt-exploder/components/tree/PromptExploderSegmentsTreeEditor.tsx`)
13. `prompt_exploder_hierarchy` (`src/features/prompt-exploder/components/PromptExploderHierarchyTreeEditor.tsx` + `PromptExploderSubsectionsTreeEditor.tsx`)
14. `admin_menu_layout` (`src/features/admin/pages/AdminMenuSettingsPage.tsx`)
15. `brain_catalog_tree` (`src/shared/lib/ai-brain/components/BrainCatalogTree.tsx`)
16. `brain_routing_tree` (`src/shared/lib/ai-brain/components/BrainRoutingTree.tsx`)

## Migration Sequence (PR-by-PR)

### PR1: Contract Freeze + Instance Parity Guardrails

Scope:

- Document canonical form and lock scope.
- Add tests that fail if an instance exists in one registry but not others.

Changes:

- Add parity test over:
  - `folderTreeInstanceValues`
  - `defaultFolderTreeProfilesV2`
  - `folderTreeSettingsMetaByInstance`
  - `folderTreePersistFeedbackByInstance`
- Add instance usage audit test (or script) to ensure each registered instance has at least one runtime consumer.

Exit criteria:

- Instance registry drift is CI-blocking.

### PR2: Data Migration (Settings Keys + Canonical Profile Payloads)

Scope:

- Migrate any persisted `folder_tree_profiles_v2` aggregate payload into per-instance keys.
- Canonicalize/validate saved per-instance profiles.

Changes:

- Add idempotent script:
  - `scripts/db/migrate-master-folder-tree-profiles-v2.ts`
- Script modes:
  - `--dry-run`
  - `--apply`
  - `--report-json <path>`
- For each record:
  - Parse aggregate payload.
  - Write `folder_tree_profile::{instance}` entries.
  - Normalize with strict canonical profile parser.
  - Keep migration log for rollback.

Exit criteria:

- No active records rely on `folder_tree_profiles_v2`.
- All persisted per-instance profiles pass strict parse.

### PR3: Instance Hardening and Decoupling

Scope:

- Remove cross-instance reuse and align every consumer with canonical instance ownership.

Changes:

- Introduce dedicated admin-menu instance id (for example `admin_menu_layout`) in:
  - `src/shared/utils/folder-tree-profiles-v2/types.ts`
  - `constants.ts`
  - `defaults.ts`
- Migrate `AdminMenuSettingsPage` from `prompt_exploder_hierarchy` to the new instance.
- Keep Prompt Exploder hierarchy instance exclusive to Prompt Exploder only.

Exit criteria:

- No feature shares another feature’s folder-tree instance key.

### PR4: Adapter Standardization

Scope:

- Standardize ad-hoc inline adapters to factory-backed construction where practical.

Targets:

- Inline adapter consumers:
  - `AdminMenuSettingsPage.tsx`
  - `ValidatorListTree.tsx`
  - `ValidatorPatternTree.tsx`
  - `PromptExploderHierarchyTreeEditor.tsx`
  - `PromptExploderSubsectionsTreeEditor.tsx`
  - `PromptExploderSegmentsTreeEditor.tsx`
  - `BrainCatalogTree.tsx`

Approach:

- Use `createMasterFolderTreeAdapterV3` directly, or introduce a tiny helper for in-memory reorder adapters.
- Keep behavior identical; reduce contract drift risk.

Exit criteria:

- Adapter construction is consistent and contract-safe across all instances.

### PR5: Legacy Compatibility Prune

Scope:

- Delete compatibility shims and dead legacy APIs after migration cutover.

Changes:

- Remove:
  - `src/features/foldertree/master/internal-drop.ts`
  - `src/features/foldertree/master/external-drop.ts`
  - `MasterFolderTreeAdapter` alias in `src/shared/contracts/master-folder-tree.ts`
  - Aggregate profile key/parser/coercion exports:
    - `FOLDER_TREE_PROFILES_V2_SETTING_KEY`
    - `parseFolderTreeProfilesV2`
    - `coerceProfileV2`
- Update:
  - `src/shared/lib/settings-lite-keys.ts` (drop aggregate key)
  - Related tests in `src/shared/utils/__tests__/folder-tree-profiles-v2.test.ts`

Exit criteria:

- No runtime or tests depend on aggregate profile compatibility path.
- No imports from `src/features/foldertree/master/*`.

### PR6: Verification + Release

Required verification:

1. `npm run build`
2. Targeted vitest suites for:
   - folder-tree core/ops/shell/settings
   - each instance adapter/builder touched in this migration
3. Manual smoke:
   - drag/drop, rename, reorder, undo for each instance class:
     - CRUD trees (notes/image/case resolver/categories/cms)
     - ordering-only trees (validator/brain/prompt-exploder/admin-menu)
     - relation browser trees

Release steps:

1. Deploy PR1.
2. Run PR2 migration in dry-run, review report, then apply.
3. Deploy PR3 + PR4.
4. Observe one release window.
5. Deploy PR5 cleanup.

## Risks and Mitigations

- Risk: shared admin-menu/profile key history may carry mixed semantics.
  - Mitigation: explicit instance split + one-time migration/bootstrap.
- Risk: strict parsing can surface previously hidden malformed settings.
  - Mitigation: preflight migration report + fail-safe fallback logging before prune.
- Risk: adapter behavior regressions in reorder-heavy UIs.
  - Mitigation: per-instance drag/drop tests and smoke checklist.

## Program-Level Acceptance Criteria

1. All folder-tree consumers run on one canonical contract (`V2` profile + `V3` adapter).
2. Every instance has dedicated instance ownership and profile keying.
3. Legacy compatibility paths are deleted, not just disabled.
4. Build and targeted tests pass after prune.
5. No production settings depend on `folder_tree_profiles_v2`.
