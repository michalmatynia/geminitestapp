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

Operational follow-up required:

1. Run migration in dry-run mode in each target environment.
2. Review generated report.
3. Run in apply mode and optionally delete the legacy aggregate key.

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
   - Admin menu tree currently uses `prompt_exploder_hierarchy` instance key.

## Instance Coverage Matrix

Registered instances (current 15):

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
14. `brain_catalog_tree` (`src/shared/lib/ai-brain/components/BrainCatalogTree.tsx`)
15. `brain_routing_tree` (`src/shared/lib/ai-brain/components/BrainRoutingTree.tsx`)

Additional non-registered consumer to migrate:

16. Admin menu custom layout (`src/features/admin/pages/AdminMenuSettingsPage.tsx`) using `prompt_exploder_hierarchy` today.

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
