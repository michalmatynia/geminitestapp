# Prop Drilling Scan

Generated at: 2026-03-04T22:55:30.406Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 138
- Resolved forwarded transitions: 580
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 30 |
| `feature:cms` | 26 |
| `feature:products` | 18 |
| `shared-ui` | 14 |
| `feature:case-resolver` | 10 |
| `shared-lib` | 6 |
| `feature:integrations` | 4 |
| `feature:foldertree` | 4 |
| `feature:database` | 3 |
| `feature:notesapp` | 3 |
| `feature:viewer3d` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:document-editor` | 2 |
| `feature:filemaker` | 2 |
| `feature:files` | 2 |
| `feature:playwright` | 2 |
| `feature:prompt-engine` | 2 |
| `app` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 2 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 3 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 4 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 5 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 6 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 7 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 8 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 9 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |
| 10 | `RichTextToolbarButton` | `src/features/cms/components/page-builder/theme/MiniRichTextEditor.tsx` | 4 | 4 | no |
| 11 | `LogModal` | `src/features/database/components/LogModal.tsx` | 4 | 4 | no |
| 12 | `RestoreModal` | `src/features/database/components/RestoreModal.tsx` | 4 | 4 | no |
| 13 | `FilemakerPartyEditPageLayout` | `src/features/filemaker/components/shared/FilemakerPartyEditPageLayout.tsx` | 4 | 4 | no |
| 14 | `CategoryMapperSelectCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx` | 4 | 4 | no |
| 15 | `NotesAppTreeNode` | `src/features/notesapp/components/tree/NotesAppTreeNode.tsx` | 4 | 4 | no |
| 16 | `ProductImageManager` | `src/features/products/components/ProductImageManager.tsx` | 4 | 4 | no |
| 17 | `Viewer3D` | `src/features/viewer3d/components/Viewer3D.tsx` | 4 | 4 | no |
| 18 | `JobActionsCell` | `src/shared/lib/jobs/components/job-table/JobActionsCell.tsx` | 4 | 4 | no |
| 19 | `InstanceSettingsPanel` | `src/features/foldertree/pages/folder-tree-settings/InstanceSettingsPanel.tsx` | 3 | 19 | no |
| 20 | `BlockNodeItem` | `src/features/cms/components/page-builder/tree/BlockNodeItem.tsx` | 3 | 10 | no |
| 21 | `HomeCmsDefaultContent` | `src/app/(frontend)/home-cms-default-content.tsx` | 3 | 7 | no |
| 22 | `AssetPreviewModal` | `src/features/files/components/file-manager/AssetPreviewModalImpl.tsx` | 3 | 7 | no |
| 23 | `ConnectionFormFields` | `src/features/integrations/components/connections/manager/ConnectionFormFields.tsx` | 3 | 7 | no |
| 24 | `RelationTreeBrowser` | `src/features/case-resolver/relation-search/components/RelationTreeBrowser.tsx` | 3 | 6 | no |
| 25 | `JobQueueOverview` | `src/features/ai/ai-paths/components/job-queue-overview.tsx` | 3 | 5 | no |
| 26 | `ImagePickerField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 5 | no |
| 27 | `RowFormModal` | `src/features/database/components/CrudPanel.tsx` | 3 | 5 | no |
| 28 | `DelayInputs` | `src/features/playwright/components/PlaywrightSettingsForm.tsx` | 3 | 5 | no |
| 29 | `CategoryIssueHintRow` | `src/features/products/components/form/ProductFormOther.tsx` | 3 | 5 | no |
| 30 | `AdvancedFilterModal` | `src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx` | 3 | 5 | no |
| 31 | `CategoryTreeNodeRenderer` | `src/features/products/components/settings/CategoryTreeNodeRenderer.tsx` | 3 | 5 | no |
| 32 | `Asset3DPreviewModal` | `src/features/viewer3d/components/Asset3DPreviewModalImpl.tsx` | 3 | 5 | no |
| 33 | `RangeField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 3 | 4 | no |
| 34 | `ComponentTreeNodeRenderer` | `src/features/cms/components/page-builder/tree/ComponentTreeNodeRenderer.tsx` | 3 | 4 | no |
| 35 | `FolderTreeSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchBar.tsx` | 3 | 4 | no |
| 36 | `BaseQuickExportButton` | `src/features/products/components/list/columns/buttons/BaseQuickExportButton.tsx` | 3 | 4 | no |
| 37 | `TraderaStatusButton` | `src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx` | 3 | 4 | no |
| 38 | `ResourceCard` | `src/shared/ui/ResourceCard.tsx` | 3 | 4 | no |
| 39 | `ValidatorListNodeItem` | `src/features/admin/pages/validator-lists/ValidatorListNodeItem.tsx` | 3 | 3 | no |
| 40 | `RenamePathModal` | `src/features/ai/ai-paths/components/modals/RenamePathModal.tsx` | 3 | 3 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
