# Prop Drilling Scan

Generated at: 2026-03-04T22:46:29.504Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 168
- Resolved forwarded transitions: 744
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 34 |
| `shared-ui` | 29 |
| `feature:cms` | 27 |
| `feature:products` | 21 |
| `feature:case-resolver` | 14 |
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
| 1 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 5 | 9 | no |
| 2 | `CaseResolverPartySelectField` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 5 | 7 | no |
| 3 | `ProductFormModalInner` | `src/features/products/components/modals/ProductFormModal.tsx` | 5 | 6 | no |
| 4 | `GenericApiConsole` | `src/shared/ui/templates/GenericApiConsole.tsx` | 5 | 6 | no |
| 5 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 6 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 7 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |
| 8 | `ColorField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 5 | 5 | no |
| 9 | `SqlHistoryDropdown` | `src/features/database/components/sql/SqlHistoryDropdown.tsx` | 5 | 5 | no |
| 10 | `CategoryMapperTableHeaderActions` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTableHeaderActions.tsx` | 5 | 5 | no |
| 11 | `ParametersSettings` | `src/features/products/components/constructor/ParametersSettings.tsx` | 5 | 5 | no |
| 12 | `BrainCatalogNodeItem` | `src/shared/lib/ai-brain/components/BrainCatalogNodeItem.tsx` | 5 | 5 | no |
| 13 | `CopyButton` | `src/shared/ui/copy-button.tsx` | 5 | 5 | no |
| 14 | `StatusBadge` | `src/shared/ui/status-badge.tsx` | 5 | 5 | no |
| 15 | `GenericMapperHeaderActions` | `src/shared/ui/templates/mappers/GenericMapperHeaderActions.tsx` | 5 | 5 | no |
| 16 | `SettingsFieldsRenderer` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 4 | 13 | no |
| 17 | `ChatbotContextModal` | `src/features/ai/chatbot/components/ChatbotContextModalImpl.tsx` | 4 | 11 | no |
| 18 | `CaseListHeldDock` | `src/features/case-resolver/components/list/sections/CaseListHeldDock.tsx` | 4 | 7 | no |
| 19 | `InsightsResultPanel` | `src/features/ai/insights/components/InsightsResultPanel.tsx` | 4 | 6 | no |
| 20 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 21 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 22 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 23 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 24 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 25 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 26 | `FiltersContainer` | `src/shared/ui/filters-container.tsx` | 4 | 5 | no |
| 27 | `MultiSelect` | `src/shared/ui/multi-select.tsx` | 4 | 5 | no |
| 28 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 29 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 30 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |
| 31 | `RichTextToolbarButton` | `src/features/cms/components/page-builder/theme/MiniRichTextEditor.tsx` | 4 | 4 | no |
| 32 | `LogModal` | `src/features/database/components/LogModal.tsx` | 4 | 4 | no |
| 33 | `RestoreModal` | `src/features/database/components/RestoreModal.tsx` | 4 | 4 | no |
| 34 | `FilemakerPartyEditPageLayout` | `src/features/filemaker/components/shared/FilemakerPartyEditPageLayout.tsx` | 4 | 4 | no |
| 35 | `CategoryMapperSelectCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx` | 4 | 4 | no |
| 36 | `NotesAppTreeNode` | `src/features/notesapp/components/tree/NotesAppTreeNode.tsx` | 4 | 4 | no |
| 37 | `ProductImageManager` | `src/features/products/components/ProductImageManager.tsx` | 4 | 4 | no |
| 38 | `Viewer3D` | `src/features/viewer3d/components/Viewer3D.tsx` | 4 | 4 | no |
| 39 | `JobActionsCell` | `src/shared/lib/jobs/components/job-table/JobActionsCell.tsx` | 4 | 4 | no |
| 40 | `DocumentationList` | `src/shared/ui/DocumentationList.tsx` | 4 | 4 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
