# Prop Drilling Scan

Generated at: 2026-03-04T22:47:41.989Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 164
- Resolved forwarded transitions: 716
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 34 |
| `shared-ui` | 28 |
| `feature:cms` | 27 |
| `feature:products` | 19 |
| `feature:case-resolver` | 13 |
| `shared-lib` | 7 |
| `feature:integrations` | 5 |
| `feature:database` | 4 |
| `feature:foldertree` | 4 |
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
| 2 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 3 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |
| 4 | `ColorField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 5 | 5 | no |
| 5 | `SqlHistoryDropdown` | `src/features/database/components/sql/SqlHistoryDropdown.tsx` | 5 | 5 | no |
| 6 | `CategoryMapperTableHeaderActions` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTableHeaderActions.tsx` | 5 | 5 | no |
| 7 | `ParametersSettings` | `src/features/products/components/constructor/ParametersSettings.tsx` | 5 | 5 | no |
| 8 | `BrainCatalogNodeItem` | `src/shared/lib/ai-brain/components/BrainCatalogNodeItem.tsx` | 5 | 5 | no |
| 9 | `CopyButton` | `src/shared/ui/copy-button.tsx` | 5 | 5 | no |
| 10 | `StatusBadge` | `src/shared/ui/status-badge.tsx` | 5 | 5 | no |
| 11 | `GenericMapperHeaderActions` | `src/shared/ui/templates/mappers/GenericMapperHeaderActions.tsx` | 5 | 5 | no |
| 12 | `SettingsFieldsRenderer` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 4 | 13 | no |
| 13 | `ChatbotContextModal` | `src/features/ai/chatbot/components/ChatbotContextModalImpl.tsx` | 4 | 11 | no |
| 14 | `CaseListHeldDock` | `src/features/case-resolver/components/list/sections/CaseListHeldDock.tsx` | 4 | 7 | no |
| 15 | `InsightsResultPanel` | `src/features/ai/insights/components/InsightsResultPanel.tsx` | 4 | 6 | no |
| 16 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 17 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 18 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 19 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 20 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 21 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 22 | `FiltersContainer` | `src/shared/ui/filters-container.tsx` | 4 | 5 | no |
| 23 | `MultiSelect` | `src/shared/ui/multi-select.tsx` | 4 | 5 | no |
| 24 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 25 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 26 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |
| 27 | `RichTextToolbarButton` | `src/features/cms/components/page-builder/theme/MiniRichTextEditor.tsx` | 4 | 4 | no |
| 28 | `LogModal` | `src/features/database/components/LogModal.tsx` | 4 | 4 | no |
| 29 | `RestoreModal` | `src/features/database/components/RestoreModal.tsx` | 4 | 4 | no |
| 30 | `FilemakerPartyEditPageLayout` | `src/features/filemaker/components/shared/FilemakerPartyEditPageLayout.tsx` | 4 | 4 | no |
| 31 | `CategoryMapperSelectCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx` | 4 | 4 | no |
| 32 | `NotesAppTreeNode` | `src/features/notesapp/components/tree/NotesAppTreeNode.tsx` | 4 | 4 | no |
| 33 | `ProductImageManager` | `src/features/products/components/ProductImageManager.tsx` | 4 | 4 | no |
| 34 | `Viewer3D` | `src/features/viewer3d/components/Viewer3D.tsx` | 4 | 4 | no |
| 35 | `JobActionsCell` | `src/shared/lib/jobs/components/job-table/JobActionsCell.tsx` | 4 | 4 | no |
| 36 | `DocumentationList` | `src/shared/ui/DocumentationList.tsx` | 4 | 4 | no |
| 37 | `FormModal` | `src/shared/ui/FormModal.tsx` | 4 | 4 | no |
| 38 | `SearchableList` | `src/shared/ui/SearchableList.tsx` | 4 | 4 | no |
| 39 | `Chip` | `src/shared/ui/chip.tsx` | 4 | 4 | no |
| 40 | `CollapsibleSection` | `src/shared/ui/collapsible.tsx` | 4 | 4 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
