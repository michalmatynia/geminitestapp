# Prop Drilling Scan

Generated at: 2026-03-04T23:01:04.168Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 112
- Resolved forwarded transitions: 439
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 27 |
| `feature:cms` | 19 |
| `feature:products` | 17 |
| `shared-ui` | 14 |
| `feature:case-resolver` | 8 |
| `shared-lib` | 5 |
| `feature:foldertree` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:playwright` | 2 |
| `feature:viewer3d` | 2 |
| `feature:integrations` | 2 |
| `feature:notesapp` | 2 |
| `feature:prompt-engine` | 2 |
| `feature:database` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |
| `feature:files` | 1 |
| `feature:tooltip-engine` | 1 |
| `feature:document-editor` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `ImagePickerField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 5 | no |
| 2 | `RowFormModal` | `src/features/database/components/CrudPanel.tsx` | 3 | 5 | no |
| 3 | `DelayInputs` | `src/features/playwright/components/PlaywrightSettingsForm.tsx` | 3 | 5 | no |
| 4 | `CategoryIssueHintRow` | `src/features/products/components/form/ProductFormOther.tsx` | 3 | 5 | no |
| 5 | `AdvancedFilterModal` | `src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx` | 3 | 5 | no |
| 6 | `CategoryTreeNodeRenderer` | `src/features/products/components/settings/CategoryTreeNodeRenderer.tsx` | 3 | 5 | no |
| 7 | `Asset3DPreviewModal` | `src/features/viewer3d/components/Asset3DPreviewModalImpl.tsx` | 3 | 5 | no |
| 8 | `RangeField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 4 | no |
| 9 | `ComponentTreeNodeRenderer` | `src/features/cms/components/page-builder/tree/ComponentTreeNodeRenderer.tsx` | 3 | 4 | no |
| 10 | `FolderTreeSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchBar.tsx` | 3 | 4 | no |
| 11 | `BaseQuickExportButton` | `src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx` | 3 | 4 | no |
| 12 | `TraderaStatusButton` | `src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx` | 3 | 4 | no |
| 13 | `ResourceCard` | `src/shared/ui/ResourceCard.tsx` | 3 | 4 | no |
| 14 | `ValidatorListNodeItem` | `src/features/admin/pages/validator-lists/ValidatorListNodeItem.tsx` | 3 | 3 | no |
| 15 | `RenamePathModal` | `src/features/ai/ai-paths/components/modals/RenamePathModal.tsx` | 3 | 3 | no |
| 16 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/BoundsNormalizerNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 17 | `FieldInput` | `src/features/ai/ai-paths/components/node-config/dialog/CanvasOutputNodeConfigSectionImpl.tsx` | 3 | 3 | no |
| 18 | `RegexAiProposalSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiProposalSection.tsx` | 3 | 3 | no |
| 19 | `ToggleButtonGroup` | `src/features/ai/image-studio/components/ToggleButtonGroup.tsx` | 3 | 3 | no |
| 20 | `VersionNodeDetailsModal` | `src/features/ai/image-studio/components/VersionNodeDetailsModal.tsx` | 3 | 3 | no |
| 21 | `AnalysisResultSection` | `src/features/ai/image-studio/components/analysis/sections/AnalysisResultSection.tsx` | 3 | 3 | no |
| 22 | `SequenceStepEditor` | `src/features/ai/image-studio/components/sequencing/SequenceStepEditor.tsx` | 3 | 3 | no |
| 23 | `ThemeForm` | `src/features/cms/components/ThemeForm.tsx` | 3 | 3 | no |
| 24 | `CmsPageShell` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no |
| 25 | `Asset3DPickerField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 3 | no |
| 26 | `CheckboxField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 3 | no |
| 27 | `EditProductModal` | `src/features/products/components/ProductModals.tsx` | 3 | 3 | no |
| 28 | `ProducerMultiSelectField` | `src/features/products/components/form/ProducerMultiSelectField.tsx` | 3 | 3 | yes |
| 29 | `TagMultiSelectField` | `src/features/products/components/form/TagMultiSelectField.tsx` | 3 | 3 | yes |
| 30 | `CatalogModal` | `src/features/products/components/settings/modals/catalog-modal/CatalogModal.tsx` | 3 | 3 | no |
| 31 | `PriceGroupModal` | `src/features/products/components/settings/modals/price-group-modal/PriceGroupModal.tsx` | 3 | 3 | no |
| 32 | `Asset3DEditModal` | `src/features/viewer3d/components/Asset3DEditModalImpl.tsx` | 3 | 3 | no |
| 33 | `BrainRoutingEditModal` | `src/shared/lib/ai-brain/components/BrainRoutingEditModal.tsx` | 3 | 3 | no |
| 34 | `CatalogEditorField` | `src/shared/lib/ai-brain/components/CatalogEditorField.tsx` | 3 | 3 | no |
| 35 | `Drawer` | `src/shared/ui/Drawer.tsx` | 3 | 3 | no |
| 36 | `FolderTreePanel` | `src/shared/ui/FolderTreePanel.tsx` | 3 | 3 | no |
| 37 | `Hint` | `src/shared/ui/Hint.tsx` | 3 | 3 | no |
| 38 | `FileUploadButton` | `src/shared/ui/file-upload.tsx` | 3 | 3 | yes |
| 39 | `FileUploadTrigger` | `src/shared/ui/file-upload.tsx` | 3 | 3 | no |
| 40 | `ImageRetryDropdown` | `src/shared/ui/image-retry-dropdown.tsx` | 3 | 3 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
