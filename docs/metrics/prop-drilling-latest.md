# Prop Drilling Scan

Generated at: 2026-03-04T22:51:33.782Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 154
- Resolved forwarded transitions: 666
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 34 |
| `feature:cms` | 26 |
| `shared-ui` | 25 |
| `feature:products` | 18 |
| `feature:case-resolver` | 11 |
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
| 1 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 2 | `SettingsFieldsRenderer` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 4 | 13 | no |
| 3 | `ChatbotContextModal` | `src/features/ai/chatbot/components/ChatbotContextModalImpl.tsx` | 4 | 11 | no |
| 4 | `CaseListHeldDock` | `src/features/case-resolver/components/list/sections/CaseListHeldDock.tsx` | 4 | 7 | no |
| 5 | `InsightsResultPanel` | `src/features/ai/insights/components/InsightsResultPanel.tsx` | 4 | 6 | no |
| 6 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 7 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 8 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 9 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 10 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 11 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 12 | `FiltersContainer` | `src/shared/ui/filters-container.tsx` | 4 | 5 | no |
| 13 | `MultiSelect` | `src/shared/ui/multi-select.tsx` | 4 | 5 | no |
| 14 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 15 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 16 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |
| 17 | `RichTextToolbarButton` | `src/features/cms/components/page-builder/theme/MiniRichTextEditor.tsx` | 4 | 4 | no |
| 18 | `LogModal` | `src/features/database/components/LogModal.tsx` | 4 | 4 | no |
| 19 | `RestoreModal` | `src/features/database/components/RestoreModal.tsx` | 4 | 4 | no |
| 20 | `FilemakerPartyEditPageLayout` | `src/features/filemaker/components/shared/FilemakerPartyEditPageLayout.tsx` | 4 | 4 | no |
| 21 | `CategoryMapperSelectCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx` | 4 | 4 | no |
| 22 | `NotesAppTreeNode` | `src/features/notesapp/components/tree/NotesAppTreeNode.tsx` | 4 | 4 | no |
| 23 | `ProductImageManager` | `src/features/products/components/ProductImageManager.tsx` | 4 | 4 | no |
| 24 | `Viewer3D` | `src/features/viewer3d/components/Viewer3D.tsx` | 4 | 4 | no |
| 25 | `JobActionsCell` | `src/shared/lib/jobs/components/job-table/JobActionsCell.tsx` | 4 | 4 | no |
| 26 | `DocumentationList` | `src/shared/ui/DocumentationList.tsx` | 4 | 4 | no |
| 27 | `FormModal` | `src/shared/ui/FormModal.tsx` | 4 | 4 | no |
| 28 | `SearchableList` | `src/shared/ui/SearchableList.tsx` | 4 | 4 | no |
| 29 | `Chip` | `src/shared/ui/chip.tsx` | 4 | 4 | no |
| 30 | `CollapsibleSection` | `src/shared/ui/collapsible.tsx` | 4 | 4 | no |
| 31 | `GenericMapperExternalCell` | `src/shared/ui/templates/mappers/GenericMapperExternalCell.tsx` | 4 | 4 | no |
| 32 | `GenericMapperStats` | `src/shared/ui/templates/mappers/GenericMapperStats.tsx` | 4 | 4 | no |
| 33 | `JSONImportModal` | `src/shared/ui/templates/modals/JSONImportModal.tsx` | 4 | 4 | no |
| 34 | `InstanceSettingsPanel` | `src/features/foldertree/pages/folder-tree-settings/InstanceSettingsPanel.tsx` | 3 | 19 | no |
| 35 | `BlockNodeItem` | `src/features/cms/components/page-builder/tree/BlockNodeItem.tsx` | 3 | 10 | no |
| 36 | `HomeCmsDefaultContent` | `src/app/(frontend)/home-cms-default-content.tsx` | 3 | 7 | no |
| 37 | `AssetPreviewModal` | `src/features/files/components/file-manager/AssetPreviewModalImpl.tsx` | 3 | 7 | no |
| 38 | `ConnectionFormFields` | `src/features/integrations/components/connections/manager/ConnectionFormFields.tsx` | 3 | 7 | no |
| 39 | `RelationTreeBrowser` | `src/features/case-resolver/relation-search/components/RelationTreeBrowser.tsx` | 3 | 6 | no |
| 40 | `JobQueueOverview` | `src/features/ai/ai-paths/components/job-queue-overview.tsx` | 3 | 5 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
