# Prop Drilling Scan

Generated at: 2026-03-04T20:45:05.693Z

## Snapshot

- Scanned source files: 3898
- JSX files scanned: 1388
- Components detected: 2043
- Components forwarding parent props: 246
- Resolved forwarded transitions: 1517
- Candidate chains (depth >= 3): 87
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 56 |
| `shared-ui` | 47 |
| `feature:cms` | 33 |
| `feature:products` | 29 |
| `feature:case-resolver` | 22 |
| `shared-lib` | 12 |
| `feature:integrations` | 7 |
| `feature:database` | 5 |
| `feature:foldertree` | 5 |
| `feature:document-editor` | 4 |
| `feature:filemaker` | 4 |
| `feature:notesapp` | 4 |
| `feature:prompt-exploder` | 4 |
| `feature:files` | 3 |
| `feature:viewer3d` | 3 |
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
| 29 | `CaseListHeader` | `src/features/case-resolver/components/list/CaseListHeader.tsx` | 8 | 8 | no |
| 30 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 31 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |
| 32 | `AdvancedFilterConditionEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 8 | 8 | no |
| 33 | `BrainRoutingCapabilityNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem.tsx` | 8 | 8 | no |
| 34 | `JobTable` | `src/shared/lib/jobs/components/JobTable.tsx` | 8 | 8 | no |
| 35 | `ListPanel` | `src/shared/ui/list-panel.tsx` | 8 | 8 | no |
| 36 | `ContentDisplayModal` | `src/shared/ui/templates/ContentDisplayModal.tsx` | 8 | 8 | no |
| 37 | `RegexAiPromptSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx` | 7 | 14 | no |
| 38 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 7 | 11 | no |
| 39 | `CardNodeItem` | `src/features/ai/image-studio/components/slot-tree/CardNodeItem.tsx` | 7 | 10 | no |
| 40 | `FolderNodeItem` | `src/features/ai/image-studio/components/slot-tree/FolderNodeItem.tsx` | 7 | 10 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 99 | 3 | `Asset3DPickerField` | `Button` | 2 | 2 | `onChange -> onSelect -> onClick` |
| 2 | 99 | 3 | `EditPageContent` | `Checkbox` | 2 | 2 | `id -> onToggle -> onCheckedChange` |
| 3 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> onClick` |
| 4 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> disabled` |
| 5 | 99 | 3 | `ProductListingItem` | `ActionMenu` | 2 | 2 | `listing -> listing -> disabled` |
| 6 | 99 | 3 | `ProductListingItem` | `DropdownMenuItem` | 2 | 2 | `listing -> listing -> onSelect` |
| 7 | 99 | 3 | `ProductListingItem` | `Label` | 2 | 2 | `listing -> listing -> htmlFor` |
| 8 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> id` |
| 9 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> value` |
| 10 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> onChange` |
| 11 | 99 | 3 | `ProductListingItem` | `StatusBadge` | 2 | 2 | `listing -> listing -> status` |
| 12 | 99 | 3 | `ProductListingItem` | `MetadataItem` | 2 | 2 | `listing -> listing -> value` |
| 13 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> onClick` |
| 14 | 99 | 3 | `NotesAppTreeHeader` | `SectionHeader` | 2 | 2 | `selectedFolderForCreate -> actions -> actions` |
| 15 | 99 | 3 | `NotesAppTreeHeader` | `SectionHeader` | 2 | 2 | `setPanelCollapsed -> actions -> actions` |
| 16 | 99 | 3 | `PromptExploderHeaderBar` | `ToggleRow` | 2 | 2 | `docsTooltipsEnabled -> docsTooltipsEnabled -> checked` |
| 17 | 99 | 3 | `PromptExploderHeaderBar` | `ToggleRow` | 2 | 2 | `onDocsTooltipsChange -> onDocsTooltipsChange -> onCheckedChange` |
| 18 | 99 | 3 | `JobStatusCell` | `Badge` | 2 | 2 | `status -> icon -> icon` |
| 19 | 89 | 3 | `DriveImportModal` | `FileManagerProvider` | 1 | 2 | `onSelectFile -> onSelectFile -> onSelectFile` |
| 20 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> options` |
| 21 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> disabled` |
| 22 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeGeometryById -> cropShapeGeometryById -> onValueChange` |
| 23 | 89 | 3 | `CaseIdentifierTextSelector` | `DropdownMenuCheckboxItem` | 1 | 2 | `value -> selected -> checked` |
| 24 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `value -> value -> value` |
| 25 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `onChange -> onChange -> onChange` |
| 26 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `placeholder -> placeholder -> placeholder` |
| 27 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `searchQuery -> value -> value` |
| 28 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onChange` |
| 29 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onClear` |
| 30 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `page -> page -> onClick` |
| 31 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `page -> page -> disabled` |
| 32 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `onPageChange -> onPageChange -> onValueChange` |
| 33 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `onPageChange -> onPageChange -> onClick` |
| 34 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `pageSize -> pageSize -> value` |
| 35 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `onPageSizeChange -> onPageSizeChange -> onValueChange` |
| 36 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `searchQuery -> value -> value` |
| 37 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onChange` |
| 38 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onClear` |
| 39 | 89 | 3 | `ThemeSettingsFieldsSection` | `FormField` | 1 | 2 | `className -> className -> actions` |
| 40 | 89 | 3 | `ProviderBadge` | `Badge` | 1 | 2 | `label -> title -> title` |
| 41 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `isOpen -> open -> open` |
| 42 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `title -> title -> title` |
| 43 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `size -> size -> size` |
| 44 | 89 | 3 | `FolderTreeSearchViewport` | `SearchInput` | 1 | 2 | `searchPlaceholder -> placeholder -> placeholder` |
| 45 | 89 | 3 | `ProductMetadataMultiSelectField` | `Button` | 1 | 2 | `disabled -> disabled -> disabled` |
| 46 | 89 | 3 | `ProductMetadataMultiSelectField` | `DropdownMenuCheckboxItem` | 1 | 2 | `disabled -> disabled -> disabled` |
| 47 | 89 | 3 | `ValidatedField` | `Label` | 1 | 2 | `required -> required -> className` |
| 48 | 89 | 3 | `AdvancedFilterBuilder` | `SelectSimple` | 1 | 2 | `group -> group -> value` |
| 49 | 89 | 3 | `AdvancedFilterBuilder` | `SelectSimple` | 1 | 2 | `group -> group -> onValueChange` |
| 50 | 89 | 3 | `AdvancedFilterBuilder` | `Checkbox` | 1 | 2 | `group -> group -> checked` |
| 51 | 89 | 3 | `AdvancedFilterBuilder` | `Checkbox` | 1 | 2 | `group -> group -> onCheckedChange` |
| 52 | 89 | 3 | `AdvancedFilterBuilder` | `SelectSimple` | 1 | 2 | `onChange -> onChange -> onValueChange` |
| 53 | 89 | 3 | `AdvancedFilterBuilder` | `Checkbox` | 1 | 2 | `onChange -> onChange -> onCheckedChange` |
| 54 | 89 | 3 | `BrainCatalogTree` | `TreeContextMenu` | 1 | 2 | `onEdit -> onEdit -> items` |
| 55 | 89 | 3 | `BrainCatalogTree` | `TreeContextMenu` | 1 | 2 | `onRemove -> onRemove -> items` |
| 56 | 89 | 3 | `BrainRoutingTree` | `StatusToggle` | 1 | 2 | `onToggleEnabled -> onToggleEnabled -> onToggle` |
| 57 | 89 | 3 | `BrainRoutingTree` | `TreeContextMenu` | 1 | 2 | `onEdit -> onEdit -> items` |
| 58 | 89 | 3 | `BrainRoutingTree` | `StatusToggle` | 1 | 2 | `isPending -> isPending -> disabled` |
| 59 | 89 | 3 | `JobTable` | `Button` | 1 | 2 | `onDelete -> onDelete -> onClick` |
| 60 | 89 | 3 | `JobTable` | `Button` | 1 | 2 | `isDeleting -> isDeleting -> loading` |
| 61 | 89 | 3 | `JobTable` | `ListPanel` | 1 | 2 | `header -> header -> header` |
| 62 | 89 | 3 | `JobTable` | `ListPanel` | 1 | 2 | `alerts -> alerts -> alerts` |
| 63 | 89 | 3 | `JobTable` | `ListPanel` | 1 | 2 | `filters -> filters -> filters` |
| 64 | 89 | 3 | `JobTable` | `ListPanel` | 1 | 2 | `footer -> footer -> footer` |
| 65 | 83 | 3 | `DocumentRelationSearchPanel` | `RelationTreeBrowser` | 1 | 1 | `relationTreeInstance -> relationTreeInstance -> instance` |
| 66 | 83 | 3 | `FolderTreeSearchViewport` | `DefaultRow` | 1 | 1 | `controller -> controller -> isRenaming` |
| 67 | 83 | 3 | `FolderTreeSearchViewport` | `DefaultRow` | 1 | 1 | `controller -> controller -> toggleExpand` |
| 68 | 83 | 3 | `FolderTreeSearchViewport` | `DefaultRow` | 1 | 1 | `controller -> controller -> startRename` |
| 69 | 83 | 3 | `FolderTreeSearchViewport` | `FolderTreeContextMenu` | 1 | 1 | `controller -> controller -> controller` |
| 70 | 83 | 3 | `EditProductPage` | `ProductFormCoreProvider` | 1 | 1 | `product -> product -> product` |
| 71 | 83 | 3 | `FilterPanel` | `Input` | 1 | 1 | `searchPlaceholder -> searchPlaceholder -> placeholder` |
| 72 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `size -> size -> size` |
| 73 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `variant -> variant -> variant` |
| 74 | 83 | 3 | `SettingsFormModal` | `AppModal` | 1 | 1 | `padding -> padding -> padding` |
| 75 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `title -> title -> title` |
| 76 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `description -> description -> description` |
| 77 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> actions` |
| 78 | 83 | 3 | `StandardDataTablePanel` | `SectionHeader` | 1 | 1 | `refresh -> refresh -> refresh` |
| 79 | 83 | 3 | `SelectModal` | `AppModal` | 1 | 1 | `size -> size -> size` |
| 80 | 83 | 3 | `PanelPagination` | `Button` | 1 | 1 | `page -> page -> onClick` |

## Top Chain Details

### 1. Asset3DPickerField -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: onChange -> onSelect -> onClick
- Component path:
  - `Asset3DPickerField` (src/features/cms/components/page-builder/shared-fields.tsx)
  - `Asset3DPickerModal` (src/features/cms/components/page-builder/Asset3DPickerModal.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `Asset3DPickerField` -> `Asset3DPickerModal`: `onChange` -> `onSelect` at src/features/cms/components/page-builder/shared-fields.tsx:224
  - `Asset3DPickerModal` -> `Button`: `onSelect` -> `onClick` at src/features/cms/components/page-builder/Asset3DPickerModal.tsx:146

### 2. EditPageContent -> Checkbox

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: id -> onToggle -> onCheckedChange
- Component path:
  - `EditPageContent` (src/features/cms/pages/pages/EditPagePage.tsx)
  - `SearchableList` (src/shared/ui/SearchableList.tsx)
  - `Checkbox` (src/shared/ui/checkbox.tsx)
- Transition lines:
  - `EditPageContent` -> `SearchableList`: `id` -> `onToggle` at src/features/cms/pages/pages/EditPagePage.tsx:229
  - `SearchableList` -> `Checkbox`: `onToggle` -> `onCheckedChange` at src/shared/ui/SearchableList.tsx:95

### 3. ProductListingItem -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> onClick
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Button`: `listing` -> `onClick` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:76

### 4. ProductListingItem -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> disabled
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Button`: `listing` -> `disabled` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:76

### 5. ProductListingItem -> ActionMenu

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> disabled
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `ActionMenu` (src/shared/ui/ActionMenu.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `ActionMenu`: `listing` -> `disabled` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:88

### 6. ProductListingItem -> DropdownMenuItem

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> onSelect
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `DropdownMenuItem` (src/shared/ui/dropdown-menu.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `DropdownMenuItem`: `listing` -> `onSelect` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:96

### 7. ProductListingItem -> Label

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> htmlFor
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Label` (src/shared/ui/label.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Label`: `listing` -> `htmlFor` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:126

### 8. ProductListingItem -> Input

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> id
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Input`: `listing` -> `id` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:127

### 9. ProductListingItem -> Input

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> value
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Input`: `listing` -> `value` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:127

### 10. ProductListingItem -> Input

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> onChange
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingActions` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingActions`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:16
  - `ProductListingActions` -> `Input`: `listing` -> `onChange` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions.tsx:127

### 11. ProductListingItem -> StatusBadge

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> status
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingDetails` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingDetails`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:15
  - `ProductListingDetails` -> `StatusBadge`: `listing` -> `status` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx:57

### 12. ProductListingItem -> MetadataItem

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> value
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingDetails` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx)
  - `MetadataItem` (src/shared/ui/metadata-item.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingDetails`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:15
  - `ProductListingDetails` -> `MetadataItem`: `listing` -> `value` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx:61

### 13. ProductListingItem -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: listing -> listing -> onClick
- Component path:
  - `ProductListingItem` (src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx)
  - `ProductListingDetails` (src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `ProductListingItem` -> `ProductListingDetails`: `listing` -> `listing` at src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:15
  - `ProductListingDetails` -> `Button`: `listing` -> `onClick` at src/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails.tsx:120

### 14. NotesAppTreeHeader -> SectionHeader

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: selectedFolderForCreate -> actions -> actions
- Component path:
  - `NotesAppTreeHeader` (src/features/notesapp/components/tree/NotesAppTreeHeader.tsx)
  - `TreeHeader` (src/shared/ui/tree/TreeHeader.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `NotesAppTreeHeader` -> `TreeHeader`: `selectedFolderForCreate` -> `actions` at src/features/notesapp/components/tree/NotesAppTreeHeader.tsx:44
  - `TreeHeader` -> `SectionHeader`: `actions` -> `actions` at src/shared/ui/tree/TreeHeader.tsx:25

### 15. NotesAppTreeHeader -> SectionHeader

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: setPanelCollapsed -> actions -> actions
- Component path:
  - `NotesAppTreeHeader` (src/features/notesapp/components/tree/NotesAppTreeHeader.tsx)
  - `TreeHeader` (src/shared/ui/tree/TreeHeader.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `NotesAppTreeHeader` -> `TreeHeader`: `setPanelCollapsed` -> `actions` at src/features/notesapp/components/tree/NotesAppTreeHeader.tsx:44
  - `TreeHeader` -> `SectionHeader`: `actions` -> `actions` at src/shared/ui/tree/TreeHeader.tsx:25

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
