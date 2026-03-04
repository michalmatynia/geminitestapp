# Prop Drilling Scan

Generated at: 2026-03-04T21:11:57.935Z

## Snapshot

- Scanned source files: 3901
- JSX files scanned: 1388
- Components detected: 2055
- Components forwarding parent props: 230
- Resolved forwarded transitions: 1434
- Candidate chains (depth >= 3): 19
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 55 |
| `shared-ui` | 47 |
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
| 6 | `PromptGenerationSection` | `src/shared/ui/PromptGenerationSection.tsx` | 16 | 18 | no |
| 7 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 14 | 14 | no |
| 8 | `DocumentAddForm` | `src/features/ai/agentcreator/teaching/components/DocumentAddForm.tsx` | 12 | 13 | no |
| 9 | `AiPathsProvider` | `src/features/ai/ai-paths/context/AiPathsProvider.tsx` | 12 | 12 | no |
| 10 | `DocumentWysiwygEditor` | `src/features/document-editor/components/DocumentWysiwygEditor.tsx` | 11 | 11 | no |
| 11 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 11 | 11 | no |
| 12 | `RegexConfigBasicTab` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexConfigBasicTab.tsx` | 10 | 17 | no |
| 13 | `CanvasControlPanel` | `src/features/ai/ai-paths/components/CanvasControlPanel.tsx` | 10 | 12 | no |
| 14 | `SequenceRunCard` | `src/features/ai/image-studio/components/sequencing/SequenceRunCard.tsx` | 10 | 11 | no |
| 15 | `CaseListSorting` | `src/features/case-resolver/components/list/sections/CaseListSorting.tsx` | 10 | 10 | no |
| 16 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 10 | 10 | no |
| 17 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 10 | 10 | no |
| 18 | `SearchSimulator` | `src/features/ai/agentcreator/teaching/components/SearchSimulator.tsx` | 9 | 18 | no |
| 19 | `PromptExploderCaptureMappingModal` | `src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx` | 9 | 18 | no |
| 20 | `AdvancedFilterGroupEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 9 | 13 | no |
| 21 | `SequenceGroupFolderNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/SequenceGroupFolderNodeItem.tsx` | 9 | 13 | no |
| 22 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no |
| 23 | `SelectionBar` | `src/shared/ui/selection-bar.tsx` | 9 | 9 | no |
| 24 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no |
| 25 | `ParserSampleSection` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserSampleSection.tsx` | 8 | 22 | no |
| 26 | `ItemLibrary` | `src/shared/ui/item-library.tsx` | 8 | 20 | no |
| 27 | `FilemakerEntityCardsSection` | `src/features/filemaker/components/shared/FilemakerEntityCardsSection.tsx` | 8 | 10 | no |
| 28 | `PromptModal` | `src/shared/ui/templates/modals/PromptModal.tsx` | 8 | 9 | no |
| 29 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 30 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |
| 31 | `AdvancedFilterConditionEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 8 | 8 | no |
| 32 | `ListPanel` | `src/shared/ui/list-panel.tsx` | 8 | 8 | no |
| 33 | `ContentDisplayModal` | `src/shared/ui/templates/ContentDisplayModal.tsx` | 8 | 8 | no |
| 34 | `RegexAiPromptSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx` | 7 | 14 | no |
| 35 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 7 | 11 | no |
| 36 | `CardNodeItem` | `src/features/ai/image-studio/components/slot-tree/CardNodeItem.tsx` | 7 | 10 | no |
| 37 | `FolderNodeItem` | `src/features/ai/image-studio/components/slot-tree/FolderNodeItem.tsx` | 7 | 10 | no |
| 38 | `PatternNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/PatternNodeItem.tsx` | 7 | 9 | no |
| 39 | `BrainRoutingFeatureNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingFeatureNodeItem.tsx` | 7 | 9 | no |
| 40 | `PlaceholderMatrixDialog` | `src/features/ai/ai-paths/components/node-config/database/PlaceholderMatrixDialog.tsx` | 7 | 8 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 89 | 3 | `ValidatedField` | `Label` | 1 | 2 | `required -> required -> className` |
| 2 | 83 | 3 | `EditProductPage` | `ProductFormCoreProvider` | 1 | 1 | `product -> product -> product` |
| 3 | 83 | 3 | `FilterPanel` | `Input` | 1 | 1 | `searchPlaceholder -> searchPlaceholder -> placeholder` |
| 4 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `size -> size -> size` |
| 5 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `variant -> variant -> variant` |
| 6 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `padding -> padding -> padding` |
| 7 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `title -> title -> title` |
| 8 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `description -> description -> description` |
| 9 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> actions` |
| 10 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `refresh -> refresh -> refresh` |
| 11 | 83 | 3 | `SelectModal` | `AppModal` | 1 | 1 | `size -> size -> size` |
| 12 | 83 | 3 | `PanelPagination` | `Button` | 1 | 1 | `page -> page -> onClick` |
| 13 | 83 | 3 | `PanelPagination` | `Button` | 1 | 1 | `page -> page -> disabled` |
| 14 | 83 | 3 | `PanelPagination` | `SelectSimple` | 1 | 1 | `pageSize -> pageSize -> value` |
| 15 | 83 | 3 | `PanelPagination` | `SelectSimple` | 1 | 1 | `pageSizeOptions -> pageSizeOptions -> options` |
| 16 | 83 | 3 | `PanelPagination` | `Button` | 1 | 1 | `isLoading -> isLoading -> disabled` |
| 17 | 83 | 3 | `PanelPagination` | `SelectSimple` | 1 | 1 | `onPageChange -> onPageChange -> onValueChange` |
| 18 | 83 | 3 | `PanelPagination` | `Button` | 1 | 1 | `onPageChange -> onPageChange -> onClick` |
| 19 | 83 | 3 | `PanelPagination` | `SelectSimple` | 1 | 1 | `onPageSizeChange -> onPageSizeChange -> onValueChange` |

## Top Chain Details

### 1. ValidatedField -> Label

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: required -> required -> className
- Component path:
  - `ValidatedField` (src/features/products/components/form/ValidatedField.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
  - `Label` (src/shared/ui/label.tsx)
- Transition lines:
  - `ValidatedField` -> `FormField`: `required` -> `required` at src/features/products/components/form/ValidatedField.tsx:61
  - `FormField` -> `Label`: `required` -> `className` at src/shared/ui/form-section.tsx:111

### 2. EditProductPage -> ProductFormCoreProvider

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: product -> product -> product
- Component path:
  - `EditProductPage` (src/features/products/components/EditProductForm.tsx)
  - `ProductFormProvider` (src/features/products/context/ProductFormContext.tsx)
  - `ProductFormCoreProvider` (src/features/products/context/ProductFormCoreContext.tsx)
- Transition lines:
  - `EditProductPage` -> `ProductFormProvider`: `product` -> `product` at src/features/products/components/EditProductForm.tsx:82
  - `ProductFormProvider` -> `ProductFormCoreProvider`: `product` -> `product` at src/features/products/context/ProductFormContext.tsx:406

### 3. FilterPanel -> Input

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: searchPlaceholder -> searchPlaceholder -> placeholder
- Component path:
  - `FilterPanel` (src/shared/ui/templates/FilterPanel.tsx)
  - `PanelFilters` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `FilterPanel` -> `PanelFilters`: `searchPlaceholder` -> `searchPlaceholder` at src/shared/ui/templates/FilterPanel.tsx:106
  - `PanelFilters` -> `Input`: `searchPlaceholder` -> `placeholder` at src/shared/ui/templates/panels/PanelFilters.tsx:148

### 4. SettingsFormModal -> AppModal

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: size -> size -> size
- Component path:
  - `SettingsFormModal` (src/shared/ui/templates/SettingsFormModal.tsx)
  - `FormModal` (src/shared/ui/FormModal.tsx)
  - `AppModal` (src/shared/ui/app-modal.tsx)
- Transition lines:
  - `SettingsFormModal` -> `FormModal`: `size` -> `size` at src/shared/ui/templates/SettingsFormModal.tsx:46
  - `FormModal` -> `AppModal`: `size` -> `size` at src/shared/ui/FormModal.tsx:212

### 5. SettingsFormModal -> AppModal

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: variant -> variant -> variant
- Component path:
  - `SettingsFormModal` (src/shared/ui/templates/SettingsFormModal.tsx)
  - `FormModal` (src/shared/ui/FormModal.tsx)
  - `AppModal` (src/shared/ui/app-modal.tsx)
- Transition lines:
  - `SettingsFormModal` -> `FormModal`: `variant` -> `variant` at src/shared/ui/templates/SettingsFormModal.tsx:46
  - `FormModal` -> `AppModal`: `variant` -> `variant` at src/shared/ui/FormModal.tsx:212

### 6. SettingsFormModal -> AppModal

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: padding -> padding -> padding
- Component path:
  - `SettingsFormModal` (src/shared/ui/templates/SettingsFormModal.tsx)
  - `FormModal` (src/shared/ui/FormModal.tsx)
  - `AppModal` (src/shared/ui/app-modal.tsx)
- Transition lines:
  - `SettingsFormModal` -> `FormModal`: `padding` -> `padding` at src/shared/ui/templates/SettingsFormModal.tsx:46
  - `FormModal` -> `AppModal`: `padding` -> `padding` at src/shared/ui/FormModal.tsx:212

### 7. StandardDataTablePanel -> SectionHeader

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: title -> title -> title
- Component path:
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `StandardDataTablePanel` -> `ListPanel`: `title` -> `title` at src/shared/ui/templates/StandardDataTablePanel.tsx:134
  - `ListPanel` -> `SectionHeader`: `title` -> `title` at src/shared/ui/list-panel.tsx:81

### 8. StandardDataTablePanel -> SectionHeader

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: description -> description -> description
- Component path:
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `StandardDataTablePanel` -> `ListPanel`: `description` -> `description` at src/shared/ui/templates/StandardDataTablePanel.tsx:134
  - `ListPanel` -> `SectionHeader`: `description` -> `description` at src/shared/ui/list-panel.tsx:81

### 9. StandardDataTablePanel -> SectionHeader

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: headerActions -> headerActions -> actions
- Component path:
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `StandardDataTablePanel` -> `ListPanel`: `headerActions` -> `headerActions` at src/shared/ui/templates/StandardDataTablePanel.tsx:134
  - `ListPanel` -> `SectionHeader`: `headerActions` -> `actions` at src/shared/ui/list-panel.tsx:81

### 10. StandardDataTablePanel -> SectionHeader

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: refresh -> refresh -> refresh
- Component path:
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `StandardDataTablePanel` -> `ListPanel`: `refresh` -> `refresh` at src/shared/ui/templates/StandardDataTablePanel.tsx:134
  - `ListPanel` -> `SectionHeader`: `refresh` -> `refresh` at src/shared/ui/list-panel.tsx:81

### 11. SelectModal -> AppModal

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: size -> size -> size
- Component path:
  - `SelectModal` (src/shared/ui/templates/modals/SelectModal.tsx)
  - `FormModal` (src/shared/ui/FormModal.tsx)
  - `AppModal` (src/shared/ui/app-modal.tsx)
- Transition lines:
  - `SelectModal` -> `FormModal`: `size` -> `size` at src/shared/ui/templates/modals/SelectModal.tsx:85
  - `FormModal` -> `AppModal`: `size` -> `size` at src/shared/ui/FormModal.tsx:212

### 12. PanelPagination -> Button

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: page -> page -> onClick
- Component path:
  - `PanelPagination` (src/shared/ui/templates/panels/PanelPagination.tsx)
  - `Pagination` (src/shared/ui/pagination.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `PanelPagination` -> `Pagination`: `page` -> `page` at src/shared/ui/templates/panels/PanelPagination.tsx:34
  - `Pagination` -> `Button`: `page` -> `onClick` at src/shared/ui/pagination.tsx:118

### 13. PanelPagination -> Button

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: page -> page -> disabled
- Component path:
  - `PanelPagination` (src/shared/ui/templates/panels/PanelPagination.tsx)
  - `Pagination` (src/shared/ui/pagination.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `PanelPagination` -> `Pagination`: `page` -> `page` at src/shared/ui/templates/panels/PanelPagination.tsx:34
  - `Pagination` -> `Button`: `page` -> `disabled` at src/shared/ui/pagination.tsx:118

### 14. PanelPagination -> SelectSimple

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: pageSize -> pageSize -> value
- Component path:
  - `PanelPagination` (src/shared/ui/templates/panels/PanelPagination.tsx)
  - `Pagination` (src/shared/ui/pagination.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
- Transition lines:
  - `PanelPagination` -> `Pagination`: `pageSize` -> `pageSize` at src/shared/ui/templates/panels/PanelPagination.tsx:34
  - `Pagination` -> `SelectSimple`: `pageSize` -> `value` at src/shared/ui/pagination.tsx:100

### 15. PanelPagination -> SelectSimple

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: pageSizeOptions -> pageSizeOptions -> options
- Component path:
  - `PanelPagination` (src/shared/ui/templates/panels/PanelPagination.tsx)
  - `Pagination` (src/shared/ui/pagination.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
- Transition lines:
  - `PanelPagination` -> `Pagination`: `pageSizeOptions` -> `pageSizeOptions` at src/shared/ui/templates/panels/PanelPagination.tsx:34
  - `Pagination` -> `SelectSimple`: `pageSizeOptions` -> `options` at src/shared/ui/pagination.tsx:100

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
