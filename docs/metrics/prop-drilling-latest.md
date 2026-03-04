# Prop Drilling Scan

Generated at: 2026-03-04T20:36:30.877Z

## Snapshot

- Scanned source files: 3898
- JSX files scanned: 1388
- Components detected: 2041
- Components forwarding parent props: 249
- Resolved forwarded transitions: 1569
- Candidate chains (depth >= 3): 118
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:ai` | 57 |
| `shared-ui` | 46 |
| `feature:cms` | 32 |
| `feature:products` | 30 |
| `feature:case-resolver` | 22 |
| `shared-lib` | 12 |
| `feature:integrations` | 7 |
| `feature:notesapp` | 6 |
| `feature:database` | 5 |
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
| 4 | `VectorDrawingCanvas` | `src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx` | 18 | 18 | no |
| 5 | `MemoizedViewer3D` | `src/features/cms/components/page-builder/preview/MemoizedViewer3D.tsx` | 17 | 17 | no |
| 6 | `CenterPreviewCanvas` | `src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx` | 16 | 18 | no |
| 7 | `PromptGenerationSection` | `src/shared/ui/PromptGenerationSection.tsx` | 16 | 18 | no |
| 8 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 14 | 14 | no |
| 9 | `FilemakerEntityTablePage` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 13 | 21 | no |
| 10 | `DocumentAddForm` | `src/features/ai/agentcreator/teaching/components/DocumentAddForm.tsx` | 12 | 13 | no |
| 11 | `AiPathsProvider` | `src/features/ai/ai-paths/context/AiPathsProvider.tsx` | 12 | 12 | no |
| 12 | `DocumentWysiwygEditor` | `src/features/document-editor/components/DocumentWysiwygEditor.tsx` | 11 | 11 | no |
| 13 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 11 | 11 | no |
| 14 | `RegexConfigBasicTab` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexConfigBasicTab.tsx` | 10 | 17 | no |
| 15 | `CanvasControlPanel` | `src/features/ai/ai-paths/components/CanvasControlPanel.tsx` | 10 | 12 | no |
| 16 | `SequenceRunCard` | `src/features/ai/image-studio/components/sequencing/SequenceRunCard.tsx` | 10 | 11 | no |
| 17 | `CaseListSorting` | `src/features/case-resolver/components/list/sections/CaseListSorting.tsx` | 10 | 10 | no |
| 18 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 10 | 10 | no |
| 19 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 10 | 10 | no |
| 20 | `SearchSimulator` | `src/features/ai/agentcreator/teaching/components/SearchSimulator.tsx` | 9 | 18 | no |
| 21 | `PromptExploderCaptureMappingModal` | `src/features/case-resolver/components/PromptExploderCaptureMappingModal.tsx` | 9 | 18 | no |
| 22 | `AdvancedFilterGroupEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 9 | 13 | no |
| 23 | `SequenceGroupFolderNodeItem` | `src/features/products/components/settings/validator-settings/pattern-tree/SequenceGroupFolderNodeItem.tsx` | 9 | 13 | no |
| 24 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no |
| 25 | `SelectionBar` | `src/shared/ui/selection-bar.tsx` | 9 | 9 | no |
| 26 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no |
| 27 | `ParserSampleSection` | `src/features/ai/ai-paths/components/node-config/dialog/parser/ParserSampleSection.tsx` | 8 | 22 | no |
| 28 | `ItemLibrary` | `src/shared/ui/item-library.tsx` | 8 | 20 | no |
| 29 | `FilemakerEntityCardsSection` | `src/features/filemaker/components/shared/FilemakerEntityCardsSection.tsx` | 8 | 10 | no |
| 30 | `PromptModal` | `src/shared/ui/templates/modals/PromptModal.tsx` | 8 | 9 | no |
| 31 | `CaseListHeader` | `src/features/case-resolver/components/list/CaseListHeader.tsx` | 8 | 8 | no |
| 32 | `NumberField` | `src/features/cms/components/page-builder/shared-fields.tsx` | 8 | 8 | no |
| 33 | `FileManager` | `src/features/files/components/FileManager.tsx` | 8 | 8 | no |
| 34 | `AdvancedFilterConditionEditor` | `src/features/products/components/list/advanced-filter/AdvancedFilterBuilder.tsx` | 8 | 8 | no |
| 35 | `BrainRoutingCapabilityNodeItem` | `src/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem.tsx` | 8 | 8 | no |
| 36 | `JobTable` | `src/shared/lib/jobs/components/JobTable.tsx` | 8 | 8 | no |
| 37 | `ListPanel` | `src/shared/ui/list-panel.tsx` | 8 | 8 | no |
| 38 | `ContentDisplayModal` | `src/shared/ui/templates/ContentDisplayModal.tsx` | 8 | 8 | no |
| 39 | `RegexAiPromptSection` | `src/features/ai/ai-paths/components/node-config/dialog/regex/RegexAiPromptSection.tsx` | 7 | 14 | no |
| 40 | `ValidatedField` | `src/features/products/components/form/ValidatedField.tsx` | 7 | 11 | no |

## Ranked Chain Backlog

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 109 | 3 | `ControlPromptModal` | `Button` | 3 | 2 | `onClose -> onOpenPromptExploder -> onClick` |
| 2 | 109 | 3 | `ControlPromptModal` | `Button` | 3 | 2 | `onClose -> onClose -> onClick` |
| 3 | 109 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 3 | 2 | `onQueryChange -> filters -> filters` |
| 4 | 109 | 3 | `NoteCardBase` | `CopyButton` | 3 | 2 | `note -> note -> value` |
| 5 | 109 | 3 | `NoteCardBase` | `Button` | 3 | 2 | `note -> note -> onClick` |
| 6 | 109 | 3 | `NoteCardBase` | `Button` | 3 | 2 | `note -> note -> aria-label` |
| 7 | 109 | 3 | `NoteCardBase` | `Button` | 3 | 2 | `note -> note -> title` |
| 8 | 109 | 3 | `CategoryIssueHintRow` | `Button` | 3 | 2 | `issue -> onReplace -> onClick` |
| 9 | 109 | 3 | `ProductMetadataMultiSelectField` | `SearchInput` | 3 | 2 | `label -> searchPlaceholder -> placeholder` |
| 10 | 109 | 3 | `IssueHintRow` | `Button` | 3 | 2 | `issue -> onReplace -> onClick` |
| 11 | 99 | 3 | `CenterPreviewCanvas` | `VectorCanvas` | 2 | 3 | `projectCanvasSize -> baseCanvasHeightPx -> baseCanvasHeightPx` |
| 12 | 99 | 3 | `CenterPreviewCanvas` | `VectorCanvas` | 2 | 3 | `projectCanvasSize -> baseCanvasWidthPx -> baseCanvasWidthPx` |
| 13 | 99 | 3 | `CenterPreviewCanvas` | `Button` | 2 | 2 | `handleGoToSourceSlot -> onGoToSourceSlot -> onClick` |
| 14 | 99 | 3 | `Asset3DPickerField` | `Button` | 2 | 2 | `onChange -> onSelect -> onClick` |
| 15 | 99 | 3 | `EditPageContent` | `Checkbox` | 2 | 2 | `id -> onToggle -> onCheckedChange` |
| 16 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `title -> emptyState -> emptyState` |
| 17 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `description -> emptyState -> emptyState` |
| 18 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `query -> filters -> filters` |
| 19 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `queryPlaceholder -> filters -> filters` |
| 20 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `emptyTitle -> emptyState -> emptyState` |
| 21 | 99 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 2 | 2 | `emptyDescription -> emptyState -> emptyState` |
| 22 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> onClick` |
| 23 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> disabled` |
| 24 | 99 | 3 | `ProductListingItem` | `ActionMenu` | 2 | 2 | `listing -> listing -> disabled` |
| 25 | 99 | 3 | `ProductListingItem` | `DropdownMenuItem` | 2 | 2 | `listing -> listing -> onSelect` |
| 26 | 99 | 3 | `ProductListingItem` | `Label` | 2 | 2 | `listing -> listing -> htmlFor` |
| 27 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> id` |
| 28 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> value` |
| 29 | 99 | 3 | `ProductListingItem` | `Input` | 2 | 2 | `listing -> listing -> onChange` |
| 30 | 99 | 3 | `ProductListingItem` | `StatusBadge` | 2 | 2 | `listing -> listing -> status` |
| 31 | 99 | 3 | `ProductListingItem` | `MetadataItem` | 2 | 2 | `listing -> listing -> value` |
| 32 | 99 | 3 | `ProductListingItem` | `Button` | 2 | 2 | `listing -> listing -> onClick` |
| 33 | 99 | 3 | `NotesAppTreeHeader` | `SectionHeader` | 2 | 2 | `selectedFolderForCreate -> actions -> actions` |
| 34 | 99 | 3 | `NotesAppTreeHeader` | `SectionHeader` | 2 | 2 | `setPanelCollapsed -> actions -> actions` |
| 35 | 99 | 3 | `PromptExploderHeaderBar` | `ToggleRow` | 2 | 2 | `docsTooltipsEnabled -> docsTooltipsEnabled -> checked` |
| 36 | 99 | 3 | `PromptExploderHeaderBar` | `ToggleRow` | 2 | 2 | `onDocsTooltipsChange -> onDocsTooltipsChange -> onCheckedChange` |
| 37 | 99 | 3 | `JobStatusCell` | `Badge` | 2 | 2 | `status -> icon -> icon` |
| 38 | 89 | 3 | `CenterPreviewCanvas` | `VectorCanvas` | 1 | 3 | `handlePreviewCanvasCropRectChange -> onViewCropRectChange -> onViewCropRectChange` |
| 39 | 89 | 3 | `CenterPreviewCanvas` | `VectorCanvas` | 1 | 3 | `handlePreviewCanvasImageFrameChange -> onImageContentFrameChange -> onImageContentFrameChange` |
| 40 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `canCompareSelectedVariants -> canCompare -> disabled` |
| 41 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `canCompareSelectedVariants -> canCompare -> title` |
| 42 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `canCompareWithSource -> canCompare -> disabled` |
| 43 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `canCompareWithSource -> canCompare -> title` |
| 44 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `handleToggleSourceVariantView -> onToggleSourceVariantView -> onClick` |
| 45 | 89 | 3 | `CenterPreviewCanvas` | `Button` | 1 | 2 | `handleToggleSplitVariantView -> onToggleSplitVariantView -> onClick` |
| 46 | 89 | 3 | `DriveImportModal` | `FileManagerProvider` | 1 | 2 | `onSelectFile -> onSelectFile -> onSelectFile` |
| 47 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> options` |
| 48 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeOptions -> cropShapeOptions -> disabled` |
| 49 | 89 | 3 | `SequenceStackCard` | `SelectSimple` | 1 | 2 | `cropShapeGeometryById -> cropShapeGeometryById -> onValueChange` |
| 50 | 89 | 3 | `CaseIdentifierTextSelector` | `DropdownMenuCheckboxItem` | 1 | 2 | `value -> selected -> checked` |
| 51 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `value -> value -> value` |
| 52 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `onChange -> onChange -> onChange` |
| 53 | 89 | 3 | `CaseResolverRichTextEditor` | `RichTextEditor` | 1 | 2 | `placeholder -> placeholder -> placeholder` |
| 54 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `searchQuery -> value -> value` |
| 55 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onChange` |
| 56 | 89 | 3 | `CaseResolverTreeHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onClear` |
| 57 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `page -> page -> onClick` |
| 58 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `page -> page -> disabled` |
| 59 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `onPageChange -> onPageChange -> onValueChange` |
| 60 | 89 | 3 | `CaseListHeader` | `Button` | 1 | 2 | `onPageChange -> onPageChange -> onClick` |
| 61 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `pageSize -> pageSize -> value` |
| 62 | 89 | 3 | `CaseListHeader` | `SelectSimple` | 1 | 2 | `onPageSizeChange -> onPageSizeChange -> onValueChange` |
| 63 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `searchQuery -> value -> value` |
| 64 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onChange` |
| 65 | 89 | 3 | `CaseListHeader` | `SearchInput` | 1 | 3 | `onSearchChange -> onChange -> onClear` |
| 66 | 89 | 3 | `ThemeSettingsFieldsSection` | `FormField` | 1 | 2 | `className -> className -> actions` |
| 67 | 89 | 3 | `ProviderBadge` | `Badge` | 1 | 2 | `label -> title -> title` |
| 68 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `isOpen -> open -> open` |
| 69 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `title -> title -> title` |
| 70 | 89 | 3 | `LogModal` | `AppModal` | 1 | 2 | `size -> size -> size` |
| 71 | 89 | 3 | `FilemakerEntityTablePage` | `ListPanel` | 1 | 2 | `badges -> filters -> filters` |
| 72 | 89 | 3 | `FolderTreeSearchViewport` | `SearchInput` | 1 | 2 | `searchPlaceholder -> placeholder -> placeholder` |
| 73 | 89 | 3 | `ProducerMultiSelectField` | `MultiSelect` | 1 | 2 | `placeholder -> placeholder -> placeholder` |
| 74 | 89 | 3 | `ProductMetadataMultiSelectField` | `Button` | 1 | 2 | `disabled -> disabled -> disabled` |
| 75 | 89 | 3 | `ProductMetadataMultiSelectField` | `DropdownMenuCheckboxItem` | 1 | 2 | `disabled -> disabled -> disabled` |
| 76 | 89 | 3 | `ProductMetadataMultiSelectField` | `SearchInput` | 1 | 2 | `searchPlaceholder -> searchPlaceholder -> placeholder` |
| 77 | 89 | 3 | `TagMultiSelectField` | `MultiSelect` | 1 | 2 | `placeholder -> placeholder -> placeholder` |
| 78 | 89 | 3 | `ValidatedField` | `Label` | 1 | 2 | `required -> required -> className` |
| 79 | 89 | 3 | `AdvancedFilterBuilder` | `SelectSimple` | 1 | 2 | `group -> group -> value` |
| 80 | 89 | 3 | `AdvancedFilterBuilder` | `SelectSimple` | 1 | 2 | `group -> group -> onValueChange` |

## Top Chain Details

### 1. ControlPromptModal -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: onClose -> onOpenPromptExploder -> onClick
- Component path:
  - `ControlPromptModal` (src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx)
  - `RightSidebarPromptControlHeader` (src/features/ai/image-studio/components/right-sidebar/RightSidebarPromptControlHeader.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `ControlPromptModal` -> `RightSidebarPromptControlHeader`: `onClose` -> `onOpenPromptExploder` at src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx:243
  - `RightSidebarPromptControlHeader` -> `Button`: `onOpenPromptExploder` -> `onClick` at src/features/ai/image-studio/components/right-sidebar/RightSidebarPromptControlHeader.tsx:38

### 2. ControlPromptModal -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: onClose -> onClose -> onClick
- Component path:
  - `ControlPromptModal` (src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx)
  - `RightSidebarPromptControlHeader` (src/features/ai/image-studio/components/right-sidebar/RightSidebarPromptControlHeader.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `ControlPromptModal` -> `RightSidebarPromptControlHeader`: `onClose` -> `onClose` at src/features/ai/image-studio/components/right-sidebar/ControlPromptModalImpl.tsx:243
  - `RightSidebarPromptControlHeader` -> `Button`: `onClose` -> `onClick` at src/features/ai/image-studio/components/right-sidebar/RightSidebarPromptControlHeader.tsx:49

### 3. FilemakerEntityTablePage -> ListPanel

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: onQueryChange -> filters -> filters
- Component path:
  - `FilemakerEntityTablePage` (src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
- Transition lines:
  - `FilemakerEntityTablePage` -> `StandardDataTablePanel`: `onQueryChange` -> `filters` at src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx:45
  - `StandardDataTablePanel` -> `ListPanel`: `filters` -> `filters` at src/shared/ui/templates/StandardDataTablePanel.tsx:119

### 4. NoteCardBase -> CopyButton

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: note -> note -> value
- Component path:
  - `NoteCardBase` (src/features/notesapp/components/NoteCard.tsx)
  - `NoteCardHeader` (src/features/notesapp/components/list/NoteCardHeader.tsx)
  - `CopyButton` (src/shared/ui/copy-button.tsx)
- Transition lines:
  - `NoteCardBase` -> `NoteCardHeader`: `note` -> `note` at src/features/notesapp/components/NoteCard.tsx:124
  - `NoteCardHeader` -> `CopyButton`: `note` -> `value` at src/features/notesapp/components/list/NoteCardHeader.tsx:34

### 5. NoteCardBase -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: note -> note -> onClick
- Component path:
  - `NoteCardBase` (src/features/notesapp/components/NoteCard.tsx)
  - `NoteCardHeader` (src/features/notesapp/components/list/NoteCardHeader.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `NoteCardBase` -> `NoteCardHeader`: `note` -> `note` at src/features/notesapp/components/NoteCard.tsx:124
  - `NoteCardHeader` -> `Button`: `note` -> `onClick` at src/features/notesapp/components/list/NoteCardHeader.tsx:36

### 6. NoteCardBase -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: note -> note -> aria-label
- Component path:
  - `NoteCardBase` (src/features/notesapp/components/NoteCard.tsx)
  - `NoteCardHeader` (src/features/notesapp/components/list/NoteCardHeader.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `NoteCardBase` -> `NoteCardHeader`: `note` -> `note` at src/features/notesapp/components/NoteCard.tsx:124
  - `NoteCardHeader` -> `Button`: `note` -> `aria-label` at src/features/notesapp/components/list/NoteCardHeader.tsx:36

### 7. NoteCardBase -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: note -> note -> title
- Component path:
  - `NoteCardBase` (src/features/notesapp/components/NoteCard.tsx)
  - `NoteCardHeader` (src/features/notesapp/components/list/NoteCardHeader.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `NoteCardBase` -> `NoteCardHeader`: `note` -> `note` at src/features/notesapp/components/NoteCard.tsx:124
  - `NoteCardHeader` -> `Button`: `note` -> `title` at src/features/notesapp/components/list/NoteCardHeader.tsx:36

### 8. CategoryIssueHintRow -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: issue -> onReplace -> onClick
- Component path:
  - `CategoryIssueHintRow` (src/features/products/components/form/ProductFormOther.tsx)
  - `ValidatorIssueHint` (src/features/products/components/form/ValidatorIssueHint.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `CategoryIssueHintRow` -> `ValidatorIssueHint`: `issue` -> `onReplace` at src/features/products/components/form/ProductFormOther.tsx:88
  - `ValidatorIssueHint` -> `Button`: `onReplace` -> `onClick` at src/features/products/components/form/ValidatorIssueHint.tsx:103

### 9. ProductMetadataMultiSelectField -> SearchInput

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: label -> searchPlaceholder -> placeholder
- Component path:
  - `ProductMetadataMultiSelectField` (src/features/products/components/form/ProductMetadataMultiSelectField.tsx)
  - `MultiSelect` (src/shared/ui/multi-select.tsx)
  - `SearchInput` (src/shared/ui/search-input.tsx)
- Transition lines:
  - `ProductMetadataMultiSelectField` -> `MultiSelect`: `label` -> `searchPlaceholder` at src/features/products/components/form/ProductMetadataMultiSelectField.tsx:333
  - `MultiSelect` -> `SearchInput`: `searchPlaceholder` -> `placeholder` at src/shared/ui/multi-select.tsx:108

### 10. IssueHintRow -> Button

- Score: 109
- Depth: 3
- Root fanout: 3
- Prop path: issue -> onReplace -> onClick
- Component path:
  - `IssueHintRow` (src/features/products/components/form/ValidatorIssueHint.tsx)
  - `ValidatorIssueHint` (src/features/products/components/form/ValidatorIssueHint.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `IssueHintRow` -> `ValidatorIssueHint`: `issue` -> `onReplace` at src/features/products/components/form/ValidatorIssueHint.tsx:204
  - `ValidatorIssueHint` -> `Button`: `onReplace` -> `onClick` at src/features/products/components/form/ValidatorIssueHint.tsx:103

### 11. CenterPreviewCanvas -> VectorCanvas

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: projectCanvasSize -> baseCanvasHeightPx -> baseCanvasHeightPx
- Component path:
  - `CenterPreviewCanvas` (src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx)
  - `VectorDrawingCanvas` (src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx)
  - `VectorCanvas` (src/shared/ui/vector-canvas/index.tsx)
- Transition lines:
  - `CenterPreviewCanvas` -> `VectorDrawingCanvas`: `projectCanvasSize` -> `baseCanvasHeightPx` at src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:111
  - `VectorDrawingCanvas` -> `VectorCanvas`: `baseCanvasHeightPx` -> `baseCanvasHeightPx` at src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx:73

### 12. CenterPreviewCanvas -> VectorCanvas

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: projectCanvasSize -> baseCanvasWidthPx -> baseCanvasWidthPx
- Component path:
  - `CenterPreviewCanvas` (src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx)
  - `VectorDrawingCanvas` (src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx)
  - `VectorCanvas` (src/shared/ui/vector-canvas/index.tsx)
- Transition lines:
  - `CenterPreviewCanvas` -> `VectorDrawingCanvas`: `projectCanvasSize` -> `baseCanvasWidthPx` at src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:111
  - `VectorDrawingCanvas` -> `VectorCanvas`: `baseCanvasWidthPx` -> `baseCanvasWidthPx` at src/shared/lib/vector-drawing/components/VectorDrawingCanvas.tsx:73

### 13. CenterPreviewCanvas -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: handleGoToSourceSlot -> onGoToSourceSlot -> onClick
- Component path:
  - `CenterPreviewCanvas` (src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx)
  - `SplitViewControls` (src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `CenterPreviewCanvas` -> `SplitViewControls`: `handleGoToSourceSlot` -> `onGoToSourceSlot` at src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:135
  - `SplitViewControls` -> `Button`: `onGoToSourceSlot` -> `onClick` at src/features/ai/image-studio/components/center-preview/SplitViewControls.tsx:27

### 14. Asset3DPickerField -> Button

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

### 15. EditPageContent -> Checkbox

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

## Execution Notes

- Start with depth >= 4 chains in `feature:*` scopes.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
