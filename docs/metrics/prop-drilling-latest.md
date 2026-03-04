# Prop Drilling Scan

Generated at: 2026-03-04T22:39:45.216Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 193
- Resolved forwarded transitions: 930
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 43 |
| `shared-ui` | 34 |
| `feature:cms` | 30 |
| `feature:products` | 24 |
| `feature:case-resolver` | 16 |
| `shared-lib` | 9 |
| `feature:integrations` | 5 |
| `feature:database` | 4 |
| `feature:foldertree` | 4 |
| `feature:filemaker` | 3 |
| `feature:notesapp` | 3 |
| `feature:viewer3d` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:document-editor` | 2 |
| `feature:files` | 2 |
| `feature:playwright` | 2 |
| `feature:prompt-engine` | 2 |
| `app` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `PatternNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/PatternNodeItem.tsx` | 7 | 9 | no |
| 2 | `BrainRoutingFeatureNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingFeatureNodeItem.tsx` | 7 | 9 | no |
| 3 | `PlaceholderMatrixDialog` | `src/features/ai/ai-paths/components/node-config/database/PlaceholderMatrixDialog.tsx` | 7 | 8 | no |
| 4 | `CircleIconButton` | `src/features/products/components/list/ProductColumns.tsx` | 7 | 8 | no |
| 5 | `DocumentSearchPage` | `src/shared/ui/templates/DocumentSearchPage.tsx` | 7 | 8 | no |
| 6 | `LabeledSlider` | `src/features/ai/image-studio/components/LabeledSlider.tsx` | 7 | 7 | no |
| 7 | `CenterPreviewCanvas` | `src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx` | 7 | 7 | no |
| 8 | `SectionPickerModal` | `src/features/cms/components/page-builder/SectionPickerModal.tsx` | 7 | 7 | no |
| 9 | `SelectField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 7 | 7 | no |
| 10 | `FilemakerEntityTablePage` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 7 | 7 | no |
| 11 | `IntegrationSelector` | `src/shared/ui/integration-selector.tsx` | 7 | 7 | no |
| 12 | `RegexTemplatesTabContent` | `src/features/ai/ai-paths/components/node-config/dialog/RegexTemplatesTabContent.tsx` | 6 | 10 | no |
| 13 | `CaseListNodeItem` | `src/features/case-resolver/components/list/sections/CaseListNodeItem.tsx` | 6 | 9 | no |
| 14 | `ValidatorFormatterToggle` | `src/shared/ui/validator-formatter-toggle.tsx` | 6 | 9 | no |
| 15 | `GroupSettingsPanel` | `src/features/products/components/settings/validator-settings/ValidatorPatternTree.tsx` | 6 | 8 | no |
| 16 | `Pagination` | `src/shared/ui/pagination.tsx` | 6 | 8 | no |
| 17 | `BrainRoutingCapabilityNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem.tsx` | 6 | 7 | no |
| 18 | `StudioPromptTextSection` | `src/features/ai/image-studio/components/modals/StudioPromptTextSection.tsx` | 6 | 6 | no |
| 19 | `DocumentRelationSearchPanel` | `src/features/case-resolver/relation-search/components/DocumentRelationSearchPanel.tsx` | 6 | 6 | no |
| 20 | `TextField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 6 | 6 | no |
| 21 | `TreeHeader` | `src/shared/ui/tree/TreeHeader.tsx` | 6 | 6 | no |
| 22 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 5 | 9 | no |
| 23 | `RegexPendingAiProposal` | `src/features/ai/ai-paths/components/node-config/dialog/RegexPendingAiProposal.tsx` | 5 | 7 | no |
| 24 | `DriveImportModal` | `src/features/ai/image-studio/components/modals/DriveImportModal.tsx` | 5 | 7 | no |
| 25 | `SlotInlineEditModal` | `src/features/ai/image-studio/components/modals/SlotInlineEditModal.tsx` | 5 | 7 | no |
| 26 | `CaseResolverPartySelectField` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 5 | 7 | no |
| 27 | `ParserMappingList` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserMappingList.tsx` | 5 | 6 | no |
| 28 | `ProductFormModalInner` | `src/features/products/components/modals/ProductFormModal.tsx` | 5 | 6 | no |
| 29 | `GenericApiConsole` | `src/shared/ui/templates/GenericApiConsole.tsx` | 5 | 6 | no |
| 30 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 31 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 32 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |
| 33 | `ColorField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 5 | 5 | no |
| 34 | `SqlHistoryDropdown` | `src/features/database/components/sql/SqlHistoryDropdown.tsx` | 5 | 5 | no |
| 35 | `CategoryMapperTableHeaderActions` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperTableHeaderActions.tsx` | 5 | 5 | no |
| 36 | `ParametersSettings` | `src/features/products/components/constructor/ParametersSettings.tsx` | 5 | 5 | no |
| 37 | `BrainCatalogNodeItem` | `src/shared/lib/ai-brain/components/BrainCatalogNodeItem.tsx` | 5 | 5 | no |
| 38 | `CopyButton` | `src/shared/ui/copy-button.tsx` | 5 | 5 | no |
| 39 | `StatusBadge` | `src/shared/ui/status-badge.tsx` | 5 | 5 | no |
| 40 | `GenericMapperHeaderActions` | `src/shared/ui/templates/mappers/GenericMapperHeaderActions.tsx` | 5 | 5 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
