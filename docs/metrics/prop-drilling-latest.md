# Prop Drilling Scan

Generated at: 2026-03-04T22:02:08.747Z

## Snapshot

- Scanned source files: 3895
- JSX files scanned: 1388
- Components detected: 2078
- Components forwarding parent props: 223
- Resolved forwarded transitions: 1348
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 55 |
| `shared-ui` | 40 |
| `feature:cms` | 32 |
| `feature:products` | 27 |
| `feature:case-resolver` | 18 |
| `shared-lib` | 10 |
| `feature:integrations` | 5 |
| `feature:document-editor` | 4 |
| `feature:filemaker` | 4 |
| `feature:database` | 4 |
| `feature:foldertree` | 4 |
| `feature:files` | 3 |
| `feature:notesapp` | 3 |
| `feature:viewer3d` | 3 |
| `feature:prompt-exploder` | 3 |
| `feature:playwright` | 2 |
| `feature:prompt-engine` | 2 |
| `app` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `DocsRuntimeStateSection` | `src/features/ai/image-studio/components/docs/sections/DocsRuntimeStateSection.tsx` | 34 | 35 | no |
| 2 | `MarkdownToolbar` | `src/features/document-editor/components/MarkdownToolbar.tsx` | 22 | 24 | no |
| 3 | `AnalysisSettingsSection` | `src/features/ai/image-studio/components/analysis/sections/AnalysisSettingsSection.tsx` | 21 | 22 | no |
| 4 | `VectorDrawingCanvas` | `src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx` | 18 | 18 | no |
| 5 | `MemoizedViewer3D` | `src/features/cms/components/page-builder/preview/MemoizedViewer3D.tsx` | 17 | 17 | no |
| 6 | `DocumentAddForm` | `src/features/ai/agentcreator/teaching/components/DocumentAddForm.tsx` | 12 | 13 | no |
| 7 | `AiPathsProvider` | `src/features/ai/ai-paths/context/AiPathsProvider.tsx` | 12 | 12 | no |
| 8 | `DocumentWysiwygEditor` | `src/features/document-editor/components/DocumentWysiwygEditor.tsx` | 11 | 11 | no |
| 9 | `RegexConfigBasicTab` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexConfigBasicTab.tsx` | 10 | 17 | no |
| 10 | `CanvasControlPanel` | `src/features/ai/ai-paths/components/CanvasControlPanel.tsx` | 10 | 12 | no |
| 11 | `SequenceRunCard` | `src/features/ai/image-studio/components/sequencing/SequenceRunCard.tsx` | 10 | 11 | no |
| 12 | `CaseListSorting` | `src/features/case-resolver/components/list/sections/CaseListSorting.tsx` | 10 | 10 | no |
| 13 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 10 | 10 | no |
| 14 | `SearchSimulator` | `src/features/ai/agentcreator/teaching/components/SearchSimulator.tsx` | 9 | 18 | no |
| 15 | `PromptExploderCaptureMappingModal` | `src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx` | 9 | 18 | no |
| 16 | `AdvancedFilterGroupEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 9 | 13 | no |
| 17 | `SequenceGroupFolderNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/SequenceGroupFolderNodeItem.tsx` | 9 | 13 | no |
| 18 | `SelectionBar` | `src/shared/ui/selection-bar.tsx` | 9 | 9 | no |
| 19 | `ParserSampleSection` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserSampleSection.tsx` | 8 | 22 | no |
| 20 | `ItemLibrary` | `src/shared/ui/item-library.tsx` | 8 | 20 | no |
| 21 | `FilemakerEntityCardsSection` | `src/features/filemaker/components/shared/FilemakerEntityCardsSection.tsx` | 8 | 10 | no |
| 22 | `PromptModal` | `src/shared/ui/templates/modals/PromptModal.tsx` | 8 | 9 | no |
| 23 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 24 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |
| 25 | `AdvancedFilterConditionEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 8 | 8 | no |
| 26 | `ListPanel` | `src/shared/ui/list-panel.tsx` | 8 | 8 | no |
| 27 | `ContentDisplayModal` | `src/shared/ui/templates/ContentDisplayModal.tsx` | 8 | 8 | no |
| 28 | `RegexAiPromptSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx` | 7 | 14 | no |
| 29 | `CardNodeItem` | `src/features/ai/image-studio/components/slot-tree/CardNodeItem.tsx` | 7 | 10 | no |
| 30 | `FolderNodeItem` | `src/features/ai/image-studio/components/slot-tree/FolderNodeItem.tsx` | 7 | 10 | no |
| 31 | `PatternNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/PatternNodeItem.tsx` | 7 | 9 | no |
| 32 | `BrainRoutingFeatureNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingFeatureNodeItem.tsx` | 7 | 9 | no |
| 33 | `PlaceholderMatrixDialog` | `src/features/ai/ai-paths/components/node-config/database/PlaceholderMatrixDialog.tsx` | 7 | 8 | no |
| 34 | `CircleIconButton` | `src/features/products/components/list/ProductColumns.tsx` | 7 | 8 | no |
| 35 | `DocumentSearchPage` | `src/shared/ui/templates/DocumentSearchPage.tsx` | 7 | 8 | no |
| 36 | `LabeledSlider` | `src/features/ai/image-studio/components/LabeledSlider.tsx` | 7 | 7 | no |
| 37 | `CenterPreviewCanvas` | `src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx` | 7 | 7 | no |
| 38 | `SectionPickerModal` | `src/features/cms/components/page-builder/SectionPickerModal.tsx` | 7 | 7 | no |
| 39 | `SelectField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 7 | 7 | no |
| 40 | `FilemakerEntityTablePage` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 7 | 7 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |

## Top Chain Details

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
