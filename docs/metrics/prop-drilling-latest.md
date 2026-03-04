# Prop Drilling Scan

Generated at: 2026-03-04T22:36:36.767Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2081
- Components forwarding parent props: 201
- Resolved forwarded transitions: 1006
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 46 |
| `shared-ui` | 36 |
| `feature:cms` | 31 |
| `feature:products` | 24 |
| `feature:case-resolver` | 16 |
| `shared-lib` | 9 |
| `feature:integrations` | 5 |
| `feature:filemaker` | 4 |
| `feature:database` | 4 |
| `feature:foldertree` | 4 |
| `feature:files` | 3 |
| `feature:notesapp` | 3 |
| `feature:viewer3d` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:document-editor` | 2 |
| `feature:playwright` | 2 |
| `feature:prompt-engine` | 2 |
| `app` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `FilemakerEntityCardsSection` | `src/features/filemaker/components/shared/FilemakerEntityCardsSection.tsx` | 8 | 10 | no |
| 2 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 3 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |
| 4 | `ListPanel` | `src/shared/ui/list-panel.tsx` | 8 | 8 | no |
| 5 | `ContentDisplayModal` | `src/shared/ui/templates/ContentDisplayModal.tsx` | 8 | 8 | no |
| 6 | `RegexAiPromptSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx` | 7 | 14 | no |
| 7 | `CardNodeItem` | `src/features/ai/image-studio/components/slot-tree/CardNodeItem.tsx` | 7 | 10 | no |
| 8 | `FolderNodeItem` | `src/features/ai/image-studio/components/slot-tree/FolderNodeItem.tsx` | 7 | 10 | no |
| 9 | `PatternNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/PatternNodeItem.tsx` | 7 | 9 | no |
| 10 | `BrainRoutingFeatureNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingFeatureNodeItem.tsx` | 7 | 9 | no |
| 11 | `PlaceholderMatrixDialog` | `src/features/ai/ai-paths/components/node-config/database/PlaceholderMatrixDialog.tsx` | 7 | 8 | no |
| 12 | `CircleIconButton` | `src/features/products/components/list/ProductColumns.tsx` | 7 | 8 | no |
| 13 | `DocumentSearchPage` | `src/shared/ui/templates/DocumentSearchPage.tsx` | 7 | 8 | no |
| 14 | `LabeledSlider` | `src/features/ai/image-studio/components/LabeledSlider.tsx` | 7 | 7 | no |
| 15 | `CenterPreviewCanvas` | `src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx` | 7 | 7 | no |
| 16 | `SectionPickerModal` | `src/features/cms/components/page-builder/SectionPickerModal.tsx` | 7 | 7 | no |
| 17 | `SelectField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 7 | 7 | no |
| 18 | `FilemakerEntityTablePage` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 7 | 7 | no |
| 19 | `IntegrationSelector` | `src/shared/ui/integration-selector.tsx` | 7 | 7 | no |
| 20 | `RegexTemplatesTabContent` | `src/features/ai/ai-paths/components/node-config/dialog/RegexTemplatesTabContent.tsx` | 6 | 10 | no |
| 21 | `CaseListNodeItem` | `src/features/case-resolver/components/list/sections/CaseListNodeItem.tsx` | 6 | 9 | no |
| 22 | `ValidatorFormatterToggle` | `src/shared/ui/validator-formatter-toggle.tsx` | 6 | 9 | no |
| 23 | `GroupSettingsPanel` | `src/features/products/components/settings/validator-settings/ValidatorPatternTree.tsx` | 6 | 8 | no |
| 24 | `Pagination` | `src/shared/ui/pagination.tsx` | 6 | 8 | no |
| 25 | `BrainRoutingCapabilityNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem.tsx` | 6 | 7 | no |
| 26 | `StudioPromptTextSection` | `src/features/ai/image-studio/components/modals/StudioPromptTextSection.tsx` | 6 | 6 | no |
| 27 | `DocumentRelationSearchPanel` | `src/features/case-resolver/relation-search/components/DocumentRelationSearchPanel.tsx` | 6 | 6 | no |
| 28 | `TextField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 6 | 6 | no |
| 29 | `TreeHeader` | `src/shared/ui/tree/TreeHeader.tsx` | 6 | 6 | no |
| 30 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 5 | 9 | no |
| 31 | `RegexPendingAiProposal` | `src/features/ai/ai-paths/components/node-config/dialog/RegexPendingAiProposal.tsx` | 5 | 7 | no |
| 32 | `DriveImportModal` | `src/features/ai/image-studio/components/modals/DriveImportModal.tsx` | 5 | 7 | no |
| 33 | `SlotInlineEditModal` | `src/features/ai/image-studio/components/modals/SlotInlineEditModal.tsx` | 5 | 7 | no |
| 34 | `CaseResolverPartySelectField` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 5 | 7 | no |
| 35 | `ParserMappingList` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserMappingList.tsx` | 5 | 6 | no |
| 36 | `ProductFormModalInner` | `src/features/products/components/modals/ProductFormModal.tsx` | 5 | 6 | no |
| 37 | `GenericApiConsole` | `src/shared/ui/templates/GenericApiConsole.tsx` | 5 | 6 | no |
| 38 | `EditRow` | `src/features/ai/image-studio/components/analysis/sections/CustomTriggerButtonsSection.tsx` | 5 | 5 | no |
| 39 | `CaseFileEditorModal` | `src/features/case-resolver/components/modals/CaseFileEditorModal.tsx` | 5 | 5 | no |
| 40 | `RelationTreeNodeItem` | `src/features/case-resolver/relation-search/components/RelationTreeNodeItem.tsx` | 5 | 5 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
