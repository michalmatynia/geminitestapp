# Prop Drilling Scan

Generated at: 2026-03-04T22:45:21.725Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 172
- Resolved forwarded transitions: 771
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 38 |
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
| 2 | `RegexPendingAiProposal` | `src/features/ai/ai-paths/components/node-config/dialog/RegexPendingAiProposal.tsx` | 5 | 7 | no |
| 3 | `DriveImportModal` | `src/features/ai/image-studio/components/modals/DriveImportModal.tsx` | 5 | 7 | no |
| 4 | `SlotInlineEditModal` | `src/features/ai/image-studio/components/modals/SlotInlineEditModal.tsx` | 5 | 7 | no |
| 5 | `CaseResolverPartySelectField` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 5 | 7 | no |
| 6 | `ParserMappingList` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserMappingList.tsx` | 5 | 6 | no |
| 7 | `ProductFormModalInner` | `src/features/products/components/modals/ProductFormModal.tsx` | 5 | 6 | no |
| 8 | `GenericApiConsole` | `src/shared/ui/templates/GenericApiConsole.tsx` | 5 | 6 | no |
| 9 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 10 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 11 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |
| 12 | `ColorField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 5 | 5 | no |
| 13 | `SqlHistoryDropdown` | `src/features/database/components/sql/SqlHistoryDropdown.tsx` | 5 | 5 | no |
| 14 | `CategoryMapperTableHeaderActions` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTableHeaderActions.tsx` | 5 | 5 | no |
| 15 | `ParametersSettings` | `src/features/products/components/constructor/ParametersSettings.tsx` | 5 | 5 | no |
| 16 | `BrainCatalogNodeItem` | `src/shared/lib/ai-brain/components/BrainCatalogNodeItem.tsx` | 5 | 5 | no |
| 17 | `CopyButton` | `src/shared/ui/copy-button.tsx` | 5 | 5 | no |
| 18 | `StatusBadge` | `src/shared/ui/status-badge.tsx` | 5 | 5 | no |
| 19 | `GenericMapperHeaderActions` | `src/shared/ui/templates/mappers/GenericMapperHeaderActions.tsx` | 5 | 5 | no |
| 20 | `SettingsFieldsRenderer` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 4 | 13 | no |
| 21 | `ChatbotContextModal` | `src/features/ai/chatbot/components/ChatbotContextModalImpl.tsx` | 4 | 11 | no |
| 22 | `CaseListHeldDock` | `src/features/case-resolver/components/list/sections/CaseListHeldDock.tsx` | 4 | 7 | no |
| 23 | `InsightsResultPanel` | `src/features/ai/insights/components/InsightsResultPanel.tsx` | 4 | 6 | no |
| 24 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 25 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 26 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 27 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 28 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 29 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 30 | `FiltersContainer` | `src/shared/ui/filters-container.tsx` | 4 | 5 | no |
| 31 | `MultiSelect` | `src/shared/ui/multi-select.tsx` | 4 | 5 | no |
| 32 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 33 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 34 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |
| 35 | `RichTextToolbarButton` | `src/features/cms/components/page-builder/theme/MiniRichTextEditor.tsx` | 4 | 4 | no |
| 36 | `LogModal` | `src/features/database/components/LogModal.tsx` | 4 | 4 | no |
| 37 | `RestoreModal` | `src/features/database/components/RestoreModal.tsx` | 4 | 4 | no |
| 38 | `FilemakerPartyEditPageLayout` | `src/features/filemaker/components/shared/FilemakerPartyEditPageLayout.tsx` | 4 | 4 | no |
| 39 | `CategoryMapperSelectCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperSelectCell.tsx` | 4 | 4 | no |
| 40 | `NotesAppTreeNode` | `src/features/notesapp/components/tree/NotesAppTreeNode.tsx` | 4 | 4 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
