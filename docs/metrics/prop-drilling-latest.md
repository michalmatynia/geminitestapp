# Prop Drilling Scan

Generated at: 2026-03-04T22:43:58.923Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 178
- Resolved forwarded transitions: 810
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 39 |
| `shared-ui` | 30 |
| `feature:cms` | 28 |
| `feature:products` | 22 |
| `feature:case-resolver` | 15 |
| `shared-lib` | 8 |
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
| 1 | `GroupSettingsPanel` | `src/features/products/components/settings/validator-settings/ValidatorPatternTree.tsx` | 6 | 8 | no |
| 2 | `BrainRoutingCapabilityNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem.tsx` | 6 | 7 | no |
| 3 | `StudioPromptTextSection` | `src/features/ai/image-studio/components/modals/StudioPromptTextSection.tsx` | 6 | 6 | no |
| 4 | `DocumentRelationSearchPanel` | `src/features/case-resolver/relation-search/components/DocumentRelationSearchPanel.tsx` | 6 | 6 | no |
| 5 | `TextField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 6 | 6 | no |
| 6 | `TreeHeader` | `src/shared/ui/tree/TreeHeader.tsx` | 6 | 6 | no |
| 7 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 5 | 9 | no |
| 8 | `RegexPendingAiProposal` | `src/features/ai/ai-paths/components/node-config/dialog/RegexPendingAiProposal.tsx` | 5 | 7 | no |
| 9 | `DriveImportModal` | `src/features/ai/image-studio/components/modals/DriveImportModal.tsx` | 5 | 7 | no |
| 10 | `SlotInlineEditModal` | `src/features/ai/image-studio/components/modals/SlotInlineEditModal.tsx` | 5 | 7 | no |
| 11 | `CaseResolverPartySelectField` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 5 | 7 | no |
| 12 | `ParserMappingList` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserMappingList.tsx` | 5 | 6 | no |
| 13 | `ProductFormModalInner` | `src/features/products/components/modals/ProductFormModal.tsx` | 5 | 6 | no |
| 14 | `GenericApiConsole` | `src/shared/ui/templates/GenericApiConsole.tsx` | 5 | 6 | no |
| 15 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 16 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 17 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |
| 18 | `ColorField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 5 | 5 | no |
| 19 | `SqlHistoryDropdown` | `src/features/database/components/sql/SqlHistoryDropdown.tsx` | 5 | 5 | no |
| 20 | `CategoryMapperTableHeaderActions` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTableHeaderActions.tsx` | 5 | 5 | no |
| 21 | `ParametersSettings` | `src/features/products/components/constructor/ParametersSettings.tsx` | 5 | 5 | no |
| 22 | `BrainCatalogNodeItem` | `src/shared/lib/ai-brain/components/BrainCatalogNodeItem.tsx` | 5 | 5 | no |
| 23 | `CopyButton` | `src/shared/ui/copy-button.tsx` | 5 | 5 | no |
| 24 | `StatusBadge` | `src/shared/ui/status-badge.tsx` | 5 | 5 | no |
| 25 | `GenericMapperHeaderActions` | `src/shared/ui/templates/mappers/GenericMapperHeaderActions.tsx` | 5 | 5 | no |
| 26 | `SettingsFieldsRenderer` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 4 | 13 | no |
| 27 | `ChatbotContextModal` | `src/features/ai/chatbot/components/ChatbotContextModalImpl.tsx` | 4 | 11 | no |
| 28 | `CaseListHeldDock` | `src/features/case-resolver/components/list/sections/CaseListHeldDock.tsx` | 4 | 7 | no |
| 29 | `InsightsResultPanel` | `src/features/ai/insights/components/InsightsResultPanel.tsx` | 4 | 6 | no |
| 30 | `SplitViewControls` | `src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx` | 4 | 5 | no |
| 31 | `SlotCreateModal` | `src/features/ai/image-studio/components/modals/SlotCreateModal.tsx` | 4 | 5 | no |
| 32 | `SlugForm` | `src/features/cms/components/SlugForm.tsx` | 4 | 5 | no |
| 33 | `MediaLibraryPanel` | `src/features/cms/components/page-builder/MediaLibraryPanel.tsx` | 4 | 5 | no |
| 34 | `ToolbarButton` | `src/features/document-editor/components/rich-text/RichTextEditorToolbar.tsx` | 4 | 5 | no |
| 35 | `FilemakerLinkedEmailsSection` | `src/features/filemaker/components/shared/FilemakerLinkedEmailsSection.tsx` | 4 | 5 | no |
| 36 | `FiltersContainer` | `src/shared/ui/filters-container.tsx` | 4 | 5 | no |
| 37 | `MultiSelect` | `src/shared/ui/multi-select.tsx` | 4 | 5 | no |
| 38 | `NodeFileDocumentSearchPanel` | `src/features/case-resolver/components/NodeFileDocumentSearchPanel.tsx` | 4 | 4 | no |
| 39 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 4 | 4 | no |
| 40 | `PreviewSectionMediaButton` | `src/features/cms/components/page-builder/preview/sections/PreviewSectionMediaButton.tsx` | 4 | 4 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
