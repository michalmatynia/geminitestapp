# Prop Drilling Scan

Generated at: 2026-03-04T22:58:57.247Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 122
- Resolved forwarded transitions: 512
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 28 |
| `feature:cms` | 20 |
| `feature:products` | 18 |
| `shared-ui` | 14 |
| `feature:case-resolver` | 9 |
| `shared-lib` | 6 |
| `feature:foldertree` | 4 |
| `feature:viewer3d` | 3 |
| `feature:integrations` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:files` | 2 |
| `feature:playwright` | 2 |
| `feature:notesapp` | 2 |
| `feature:prompt-engine` | 2 |
| `app` | 1 |
| `feature:database` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `ProductImageManager` | `src/features/products/components/ProductImageManager.tsx` | 4 | 4 | no |
| 2 | `Viewer3D` | `src/features/viewer3d/components/Viewer3D.tsx` | 4 | 4 | no |
| 3 | `JobActionsCell` | `src/shared/lib/jobs/components/job-table/JobActionsCell.tsx` | 4 | 4 | no |
| 4 | `InstanceSettingsPanel` | `src/features/foldertree/pages/folder-tree-settings/InstanceSettingsPanel.tsx` | 3 | 19 | no |
| 5 | `BlockNodeItem` | `src/features/cms/components/page-builder/tree/BlockNodeItem.tsx` | 3 | 10 | no |
| 6 | `HomeCmsDefaultContent` | `src/app/(frontend)/home-cms-default-content.tsx` | 3 | 7 | no |
| 7 | `AssetPreviewModal` | `src/features/files/components/file-manager/AssetPreviewModalImpl.tsx` | 3 | 7 | no |
| 8 | `ConnectionFormFields` | `src/features/integrations/components/connections/manager/ConnectionFormFields.tsx` | 3 | 7 | no |
| 9 | `RelationTreeBrowser` | `src/features/case-resolver/relation-search/components/RelationTreeBrowser.tsx` | 3 | 6 | no |
| 10 | `JobQueueOverview` | `src/features/ai/ai-paths/components/job-queue-overview.tsx` | 3 | 5 | no |
| 11 | `ImagePickerField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 5 | no |
| 12 | `RowFormModal` | `src/features/database/components/CrudPanel.tsx` | 3 | 5 | no |
| 13 | `DelayInputs` | `src/features/playwright/components/PlaywrightSettingsForm.tsx` | 3 | 5 | no |
| 14 | `CategoryIssueHintRow` | `src/features/products/components/form/ProductFormOther.tsx` | 3 | 5 | no |
| 15 | `AdvancedFilterModal` | `src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx` | 3 | 5 | no |
| 16 | `CategoryTreeNodeRenderer` | `src/features/products/components/settings/CategoryTreeNodeRenderer.tsx` | 3 | 5 | no |
| 17 | `Asset3DPreviewModal` | `src/features/viewer3d/components/Asset3DPreviewModalImpl.tsx` | 3 | 5 | no |
| 18 | `RangeField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 4 | no |
| 19 | `ComponentTreeNodeRenderer` | `src/features/cms/components/page-builder/tree/ComponentTreeNodeRenderer.tsx` | 3 | 4 | no |
| 20 | `FolderTreeSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchBar.tsx` | 3 | 4 | no |
| 21 | `BaseQuickExportButton` | `src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx` | 3 | 4 | no |
| 22 | `TraderaStatusButton` | `src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx` | 3 | 4 | no |
| 23 | `ResourceCard` | `src/shared/ui/ResourceCard.tsx` | 3 | 4 | no |
| 24 | `ValidatorListNodeItem` | `src/features/admin/pages/validator-lists/ValidatorListNodeItem.tsx` | 3 | 3 | no |
| 25 | `RenamePathModal` | `src/features/ai/ai-paths/components/modals/RenamePathModal.tsx` | 3 | 3 | no |
| 26 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/BoundsNormalizerNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 27 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/CanvasOutputNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 28 | `RegexAiProposalSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiProposalSection.tsx` | 3 | 3 | no |
| 29 | `ToggleButtonGroup` | `src/features/ai/image-studio/components/ToggleButtonGroup.tsx` | 3 | 3 | no |
| 30 | `VersionNodeDetailsModal` | `src/features/ai/image-studio/components/VersionNodeDetailsModal.tsx` | 3 | 3 | no |
| 31 | `AnalysisResultSection` | `src/features/ai/image-studio/components/analysis/sections/AnalysisResultSection.tsx` | 3 | 3 | no |
| 32 | `SequenceStepEditor` | `src/features/ai/image-studio/components/sequencing/SequenceStepEditor.tsx` | 3 | 3 | no |
| 33 | `ThemeForm` | `src/features/cms/components/ThemeForm.tsx` | 3 | 3 | no |
| 34 | `CmsPageShell` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no |
| 35 | `Asset3DPickerField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 3 | no |
| 36 | `CheckboxField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 3 | no |
| 37 | `EditProductModal` | `src/features/products/components/ProductModals.tsx` | 3 | 3 | no |
| 38 | `ProducerMultiSelectField` | `src/features/products/components/form/ProducerMultiSelectField.tsx` | 3 | 3 | yes |
| 39 | `TagMultiSelectField` | `src/features/products/components/form/TagMultiSelectField.tsx` | 3 | 3 | yes |
| 40 | `CatalogModal` | `src/features/products/components/settings/modals/catalog-modal/CatalogModal.tsx` | 3 | 3 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
