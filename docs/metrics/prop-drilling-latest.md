# Prop Drilling Scan

Generated at: 2026-03-04T20:05:12.912Z

## Snapshot

- Scanned source files: 3888
- JSX files scanned: 1371
- Components detected: 2023
- Components forwarding parent props: 263
- Resolved forwarded transitions: 1740
- Candidate chains (depth >= 3): 421
- High-priority chains (depth >= 4): 39
- Unknown spread forwarding edges: 12

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `shared-ui` | 59 |
| `feature:ai` | 57 |
| `feature:cms` | 35 |
| `feature:products` | 30 |
| `feature:case-resolver` | 19 |
| `shared-lib` | 12 |
| `feature:integrations` | 7 |
| `feature:database` | 6 |
| `feature:notesapp` | 6 |
| `feature:foldertree` | 5 |
| `feature:document-editor` | 4 |
| `feature:filemaker` | 4 |
| `feature:viewer3d` | 4 |
| `feature:prompt-exploder` | 4 |
| `feature:files` | 3 |
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
| 4 | `DetailModal` | `src/shared/ui/templates/modals/DetailModal.tsx` | 18 | 19 | no |
| 5 | `VectorDrawingCanvas` | `src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx` | 18 | 18 | no |
| 6 | `MemoizedViewer3D` | `src/features/cms/components/page-builder/preview/MemoizedViewer3D.tsx` | 17 | 17 | no |
| 7 | `CenterPreviewCanvas` | `src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx` | 16 | 18 | no |
| 8 | `PromptGenerationSection` | `src/shared/ui/PromptGenerationSection.tsx` | 16 | 18 | no |
| 9 | `SettingsPanelBuilder` | `src/shared/ui/templates/SettingsPanelBuilder.tsx` | 14 | 16 | no |
| 10 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 14 | 14 | no |
| 11 | `FilemakerEntityTablePage` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 13 | 21 | no |
| 12 | `DocumentAddForm` | `src/features/ai/agentcreator/teaching/components/DocumentAddForm.tsx` | 12 | 13 | no |
| 13 | `AiPathsProvider` | `src/features/ai/ai-paths/context/AiPathsProvider.tsx` | 12 | 12 | no |
| 14 | `DocumentWysiwygEditor` | `src/features/document-editor/components/DocumentWysiwygEditor.tsx` | 11 | 11 | no |
| 15 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 11 | 11 | no |
| 16 | `RegexConfigBasicTab` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexConfigBasicTab.tsx` | 10 | 17 | no |
| 17 | `AdvancedFilterGroupEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 10 | 15 | no |
| 18 | `CanvasControlPanel` | `src/features/ai/ai-paths/components/CanvasControlPanel.tsx` | 10 | 12 | no |
| 19 | `SequenceRunCard` | `src/features/ai/image-studio/components/sequencing/SequenceRunCard.tsx` | 10 | 11 | no |
| 20 | `SelectSimple` | `src/shared/ui/select-simple.tsx` | 10 | 11 | no |
| 21 | `CaseListSorting` | `src/features/case-resolver/components/list/sections/CaseListSorting.tsx` | 10 | 10 | no |
| 22 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 10 | 10 | no |
| 23 | `ConfirmDialog` | `src/shared/ui/confirm-dialog.tsx` | 10 | 10 | no |
| 24 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 10 | 10 | no |
| 25 | `SearchSimulator` | `src/features/ai/agentcreator/teaching/components/SearchSimulator.tsx` | 9 | 18 | no |
| 26 | `PromptExploderCaptureMappingModal` | `src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx` | 9 | 18 | no |
| 27 | `SequenceGroupFolderNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/SequenceGroupFolderNodeItem.tsx` | 9 | 13 | no |
| 28 | `JSONImportModal` | `src/shared/ui/templates/modals/JSONImportModal.tsx` | 9 | 11 | no |
| 29 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no |
| 30 | `AdvancedFilterConditionEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 9 | 9 | no |
| 31 | `SelectionBar` | `src/shared/ui/selection-bar.tsx` | 9 | 9 | no |
| 32 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no |
| 33 | `ParserSampleSection` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserSampleSection.tsx` | 8 | 22 | no |
| 34 | `ItemLibrary` | `src/shared/ui/item-library.tsx` | 8 | 20 | no |
| 35 | `FilemakerEntityCardsSection` | `src/features/filemaker/components/shared/FilemakerEntityCardsSection.tsx` | 8 | 10 | no |
| 36 | `FormActions` | `src/shared/ui/FormActions.tsx` | 8 | 9 | no |
| 37 | `PromptModal` | `src/shared/ui/templates/modals/PromptModal.tsx` | 8 | 9 | no |
| 38 | `CaseListHeader` | `src/features/case-resolver/components/list/CaseListHeader.tsx` | 8 | 8 | no |
| 39 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 40 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 2 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 3 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 4 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 5 | 229 | 3 | `SettingsFieldRenderer` | `SelectSimple` | 15 | 2 | `field -> options -> options` |
| 6 | 229 | 3 | `SettingsFieldRenderer` | `SelectSimple` | 15 | 2 | `field -> value -> value` |
| 7 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 8 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 9 | 229 | 3 | `SettingsFieldRenderer` | `FormField` | 15 | 2 | `field -> label -> label` |
| 10 | 191 | 5 | `AdvancedFilterModal` | `Input` | 1 | 2 | `fieldValueOptions -> fieldValueOptions -> fieldValueOptions -> valueOptions -> list` |
| 11 | 185 | 5 | `FilterPanel` | `DropdownMenuCheckboxItem` | 1 | 1 | `values -> values -> value -> selected -> checked` |
| 12 | 185 | 5 | `FilterPanel` | `Button` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onClear -> onClick` |
| 13 | 185 | 5 | `FilterPanel` | `Select` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onValueChange -> onValueChange` |
| 14 | 172 | 4 | `PromptExploderCaptureMappingModal` | `Input` | 3 | 2 | `applying -> loading -> loading -> disabled` |
| 15 | 172 | 4 | `PromptExploderCaptureMappingModal` | `Button` | 3 | 2 | `applying -> loading -> loading -> disabled` |
| 16 | 172 | 4 | `PromptExploderCaptureMappingModal` | `Button` | 3 | 2 | `applying -> loading -> loading -> loading` |
| 17 | 169 | 3 | `SectionBlockNodeItem` | `GenericPickerDropdown` | 9 | 2 | `block -> onSelect -> onSelect` |
| 18 | 169 | 3 | `InstanceSettingsPanel` | `Select` | 9 | 2 | `meta -> onValueChange -> onValueChange` |
| 19 | 166 | 4 | `SettingsPanelBuilder` | `Select` | 3 | 1 | `isSaving -> disabled -> disabled -> disabled` |
| 20 | 166 | 4 | `SettingsPanelBuilder` | `SelectItem` | 3 | 1 | `isSaving -> disabled -> disabled -> disabled` |
| 21 | 163 | 3 | `ItemLibrary` | `AppModal` | 9 | 1 | `entityName -> title -> title` |
| 22 | 163 | 3 | `ItemLibrary` | `ConfirmModal` | 9 | 1 | `entityName -> description -> message` |
| 23 | 163 | 3 | `ItemLibrary` | `ConfirmModal` | 9 | 1 | `entityName -> title -> title` |
| 24 | 162 | 4 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> disabled -> disabled` |
| 25 | 159 | 3 | `ParserSampleSection` | `Select` | 8 | 2 | `sampleState -> onValueChange -> onValueChange` |
| 26 | 159 | 3 | `SlideshowFrameNodeItem` | `GenericPickerDropdown` | 8 | 2 | `frame -> onSelect -> onSelect` |
| 27 | 153 | 3 | `PreviewSection` | `SectionBlockProvider` | 8 | 1 | `section -> blocks -> blocks` |
| 28 | 153 | 3 | `PreviewSection` | `SectionBlockProvider` | 8 | 1 | `section -> settings -> settings` |
| 29 | 153 | 3 | `PreviewSection` | `SectionBlockProvider` | 8 | 1 | `section -> sectionId -> sectionId` |
| 30 | 153 | 3 | `PreviewSection` | `SectionRendererInner` | 8 | 1 | `section -> type -> type` |
| 31 | 152 | 4 | `SequenceStackCard` | `Select` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> disabled -> disabled` |
| 32 | 152 | 4 | `SequenceStackCard` | `SelectItem` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> disabled -> disabled` |
| 33 | 152 | 4 | `SequenceStackCard` | `Select` | 1 | 2 | `cropShapeGeometryById -> cropShapeGeometryById -> onValueChange -> onValueChange` |
| 34 | 152 | 4 | `CaseResolverTreeHeader` | `Input` | 1 | 3 | `searchQuery -> value -> value -> value` |
| 35 | 152 | 4 | `CaseResolverTreeHeader` | `Button` | 1 | 3 | `onSearchChange -> onChange -> onClear -> onClick` |
| 36 | 152 | 4 | `CaseListHeader` | `Select` | 1 | 2 | `onPageChange -> onPageChange -> onValueChange -> onValueChange` |
| 37 | 152 | 4 | `CaseListHeader` | `Select` | 1 | 2 | `onPageSizeChange -> onPageSizeChange -> onValueChange -> onValueChange` |
| 38 | 152 | 4 | `CaseListHeader` | `Input` | 1 | 3 | `searchQuery -> value -> value -> value` |
| 39 | 152 | 4 | `CaseListHeader` | `Button` | 1 | 3 | `onSearchChange -> onChange -> onClear -> onClick` |
| 40 | 152 | 4 | `RestoreModal` | `AppModal` | 1 | 2 | `title -> title -> title -> title` |
| 41 | 152 | 4 | `RestoreModal` | `AppModal` | 1 | 2 | `size -> size -> size -> size` |
| 42 | 152 | 4 | `CategoryMapperSelectCell` | `Button` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 43 | 152 | 4 | `CategoryMapperSelectCell` | `DropdownMenuCheckboxItem` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 44 | 152 | 4 | `AdvancedFilterBuilder` | `Select` | 1 | 2 | `group -> group -> onValueChange -> onValueChange` |
| 45 | 152 | 4 | `AdvancedFilterBuilder` | `Select` | 1 | 2 | `onChange -> onChange -> onValueChange -> onValueChange` |
| 46 | 152 | 4 | `CatalogModal` | `AppModal` | 1 | 2 | `item -> title -> title -> title` |
| 47 | 152 | 4 | `PriceGroupModal` | `AppModal` | 1 | 2 | `item -> title -> title -> title` |
| 48 | 152 | 4 | `ValidatorPatternImportModal` | `AppModal` | 1 | 2 | `open -> isOpen -> isOpen -> open` |
| 49 | 149 | 3 | `Asset3DCard` | `Badge` | 7 | 2 | `asset -> label -> removeLabel` |
| 50 | 149 | 3 | `Asset3DCard` | `Card` | 7 | 2 | `asset -> onClick -> onClick` |
| 51 | 149 | 3 | `Asset3DCard` | `Card` | 7 | 2 | `asset -> onClick -> className` |
| 52 | 146 | 4 | `AdvancedFilterModal` | `AdvancedFilterConditionEditor` | 1 | 1 | `fieldValueOptions -> fieldValueOptions -> fieldValueOptions -> valueOptions` |
| 53 | 146 | 4 | `FilterPanel` | `MultiSelect` | 1 | 1 | `values -> values -> value -> selected` |
| 54 | 146 | 4 | `FilterPanel` | `SelectSimple` | 1 | 1 | `values -> values -> value -> value` |
| 55 | 146 | 4 | `FilterPanel` | `Checkbox` | 1 | 1 | `values -> values -> value -> checked` |
| 56 | 146 | 4 | `FilterPanel` | `MultiSelect` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onChange` |
| 57 | 146 | 4 | `FilterPanel` | `SelectSimple` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onValueChange` |
| 58 | 146 | 4 | `FilterPanel` | `SearchInput` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onClear` |
| 59 | 146 | 4 | `FilterPanel` | `Checkbox` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onCheckedChange` |
| 60 | 146 | 4 | `FilterPanel` | `Input` | 1 | 1 | `onFilterChange -> onFilterChange -> onChange -> onChange` |
| 61 | 146 | 4 | `PanelPagination` | `Select` | 1 | 1 | `onPageChange -> onPageChange -> onValueChange -> onValueChange` |
| 62 | 146 | 4 | `PanelPagination` | `Select` | 1 | 1 | `onPageSizeChange -> onPageSizeChange -> onValueChange -> onValueChange` |
| 63 | 139 | 3 | `ColumnNodeItem` | `GenericPickerDropdown` | 6 | 2 | `column -> onSelect -> onSelect` |
| 64 | 139 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 6 | 2 | `detail -> foreignKeys -> data` |
| 65 | 139 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 6 | 2 | `detail -> indexes -> data` |
| 66 | 139 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 6 | 2 | `detail -> columns -> data` |
| 67 | 139 | 3 | `TableDetailCard` | `SectionHeader` | 6 | 2 | `detail -> actions -> actions` |
| 68 | 139 | 3 | `TableDetailCard` | `SectionHeader` | 6 | 2 | `detail -> title -> title` |
| 69 | 133 | 3 | `FilterControl` | `SelectTrigger` | 6 | 1 | `field -> ariaLabel -> aria-label` |
| 70 | 133 | 3 | `FilterControl` | `SelectValue` | 6 | 1 | `field -> placeholder -> placeholder` |
| 71 | 129 | 3 | `HomeCmsDefaultContent` | `MediaStylesProvider` | 5 | 2 | `themeSettings -> mediaStyles -> value` |
| 72 | 129 | 3 | `HomeCmsDefaultContent` | `CmsPageProvider` | 5 | 2 | `themeSettings -> layout -> layout` |
| 73 | 129 | 3 | `AssetPreviewModal` | `AppModal` | 5 | 2 | `item -> subtitle -> subtitle` |
| 74 | 129 | 3 | `AssetPreviewModal` | `AppModal` | 5 | 2 | `item -> title -> title` |
| 75 | 129 | 3 | `InstanceSettingsPanel` | `Select` | 5 | 2 | `updateProfile -> onValueChange -> onValueChange` |
| 76 | 129 | 3 | `LearnedRuleItem` | `SectionHeader` | 5 | 2 | `draft -> actions -> actions` |
| 77 | 129 | 3 | `Asset3DCard` | `Card` | 5 | 2 | `className -> className -> className` |
| 78 | 123 | 3 | `SectionNodeItem` | `BlockPicker` | 5 | 1 | `section -> onSelect -> onSelect` |
| 79 | 123 | 3 | `SectionNodeItem` | `SectionPicker` | 5 | 1 | `section -> onSelect -> onSelect` |
| 80 | 123 | 3 | `SectionNodeItem` | `BlockPicker` | 5 | 1 | `section -> sectionType -> sectionType` |

## Top Chain Details

### 1. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `ColorField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `ColorField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:273
  - `ColorField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:251

### 2. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `RangeField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `RangeField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:237
  - `RangeField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:335

### 3. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `ImagePickerField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `ImagePickerField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:228
  - `ImagePickerField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:70

### 4. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `Asset3DPickerField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `Asset3DPickerField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:190
  - `Asset3DPickerField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:157

### 5. SettingsFieldRenderer -> SelectSimple

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> options -> options
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `SelectField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `SelectField`: `field` -> `options` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:140
  - `SelectField` -> `SelectSimple`: `options` -> `options` at src/features/cms/components/page-builder/shared-fields.tsx:375

### 6. SettingsFieldRenderer -> SelectSimple

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> value -> value
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `SelectField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `SelectField`: `field` -> `value` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:140
  - `SelectField` -> `SelectSimple`: `value` -> `value` at src/features/cms/components/page-builder/shared-fields.tsx:375

### 7. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `SelectField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `SelectField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:140
  - `SelectField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:374

### 8. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `NumberField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `NumberField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:129
  - `NumberField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:297

### 9. SettingsFieldRenderer -> FormField

- Score: 229
- Depth: 3
- Root fanout: 15
- Prop path: field -> label -> label
- Component path:
  - `SettingsFieldRenderer` (src/features/cms/components/page-builder/SettingsFieldRenderer.tsx)
  - `TextField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `FormField` (src/shared/ui/form-section.tsx)
- Transition lines:
  - `SettingsFieldRenderer` -> `TextField`: `field` -> `label` at src/features/cms/components/page-builder/SettingsFieldRenderer.tsx:111
  - `TextField` -> `FormField`: `label` -> `label` at src/features/cms/components/page-builder/shared-fields.tsx:428

### 10. AdvancedFilterModal -> Input

- Score: 191
- Depth: 5
- Root fanout: 1
- Prop path: fieldValueOptions -> fieldValueOptions -> fieldValueOptions -> valueOptions -> list
- Component path:
  - `AdvancedFilterModal` (src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx)
  - `AdvancedFilterBuilder` (src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx)
  - `AdvancedFilterGroupEditor` (src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx)
  - `AdvancedFilterConditionEditor` (src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `AdvancedFilterModal` -> `AdvancedFilterBuilder`: `fieldValueOptions` -> `fieldValueOptions` at src/features/products/components/list/advanced-filter/AdvancedFilterModal.tsx:120
  - `AdvancedFilterBuilder` -> `AdvancedFilterGroupEditor`: `fieldValueOptions` -> `fieldValueOptions` at src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx:730
  - `AdvancedFilterGroupEditor` -> `AdvancedFilterConditionEditor`: `fieldValueOptions` -> `valueOptions` at src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx:669
  - `AdvancedFilterConditionEditor` -> `Input`: `valueOptions` -> `list` at src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx:397

### 11. FilterPanel -> DropdownMenuCheckboxItem

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: values -> values -> value -> selected -> checked
- Component path:
  - `FilterPanel` (src/shared/ui/templates/FilterPanel.tsx)
  - `PanelFilters` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `FilterControl` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `MultiSelect` (src/shared/ui/multi-select.tsx)
  - `DropdownMenuCheckboxItem` (src/shared/ui/dropdown-menu.tsx)
- Transition lines:
  - `FilterPanel` -> `PanelFilters`: `values` -> `values` at src/shared/ui/templates/FilterPanel.tsx:106
  - `PanelFilters` -> `FilterControl`: `values` -> `value` at src/shared/ui/templates/panels/PanelFilters.tsx:176
  - `FilterControl` -> `MultiSelect`: `value` -> `selected` at src/shared/ui/templates/panels/PanelFilters.tsx:259
  - `MultiSelect` -> `DropdownMenuCheckboxItem`: `selected` -> `checked` at src/shared/ui/multi-select.tsx:125

### 12. FilterPanel -> Button

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: onFilterChange -> onFilterChange -> onChange -> onClear -> onClick
- Component path:
  - `FilterPanel` (src/shared/ui/templates/FilterPanel.tsx)
  - `PanelFilters` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `FilterControl` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `SearchInput` (src/shared/ui/search-input.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `FilterPanel` -> `PanelFilters`: `onFilterChange` -> `onFilterChange` at src/shared/ui/templates/FilterPanel.tsx:106
  - `PanelFilters` -> `FilterControl`: `onFilterChange` -> `onChange` at src/shared/ui/templates/panels/PanelFilters.tsx:176
  - `FilterControl` -> `SearchInput`: `onChange` -> `onClear` at src/shared/ui/templates/panels/PanelFilters.tsx:294
  - `SearchInput` -> `Button`: `onClear` -> `onClick` at src/shared/ui/search-input.tsx:44

### 13. FilterPanel -> Select

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: onFilterChange -> onFilterChange -> onChange -> onValueChange -> onValueChange
- Component path:
  - `FilterPanel` (src/shared/ui/templates/FilterPanel.tsx)
  - `PanelFilters` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `FilterControl` (src/shared/ui/templates/panels/PanelFilters.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `FilterPanel` -> `PanelFilters`: `onFilterChange` -> `onFilterChange` at src/shared/ui/templates/FilterPanel.tsx:106
  - `PanelFilters` -> `FilterControl`: `onFilterChange` -> `onChange` at src/shared/ui/templates/panels/PanelFilters.tsx:176
  - `FilterControl` -> `SelectSimple`: `onChange` -> `onValueChange` at src/shared/ui/templates/panels/PanelFilters.tsx:275
  - `SelectSimple` -> `Select`: `onValueChange` -> `onValueChange` at src/shared/ui/select-simple.tsx:90

### 14. PromptExploderCaptureMappingModal -> Input

- Score: 172
- Depth: 4
- Root fanout: 3
- Prop path: applying -> loading -> loading -> disabled
- Component path:
  - `PromptExploderCaptureMappingModal` (src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx)
  - `ConfirmDialog` (src/shared/ui/confirm-dialog.tsx)
  - `ConfirmModal` (src/shared/ui/templates/modals/ConfirmModal.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `PromptExploderCaptureMappingModal` -> `ConfirmDialog`: `applying` -> `loading` at src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx:325
  - `ConfirmDialog` -> `ConfirmModal`: `loading` -> `loading` at src/shared/ui/confirm-dialog.tsx:35
  - `ConfirmModal` -> `Input`: `loading` -> `disabled` at src/shared/ui/templates/modals/ConfirmModal.tsx:105

### 15. PromptExploderCaptureMappingModal -> Button

- Score: 172
- Depth: 4
- Root fanout: 3
- Prop path: applying -> loading -> loading -> disabled
- Component path:
  - `PromptExploderCaptureMappingModal` (src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx)
  - `ConfirmDialog` (src/shared/ui/confirm-dialog.tsx)
  - `ConfirmModal` (src/shared/ui/templates/modals/ConfirmModal.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `PromptExploderCaptureMappingModal` -> `ConfirmDialog`: `applying` -> `loading` at src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx:325
  - `ConfirmDialog` -> `ConfirmModal`: `loading` -> `loading` at src/shared/ui/confirm-dialog.tsx:35
  - `ConfirmModal` -> `Button`: `loading` -> `disabled` at src/shared/ui/templates/modals/ConfirmModal.tsx:124

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
