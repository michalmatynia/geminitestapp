# Prop Drilling Scan

Generated at: 2026-03-05T00:56:46.950Z

## Snapshot

- Scanned source files: 3892
- JSX files scanned: 1392
- Components detected: 2084
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 61
- Resolved forwarded transitions: 67
- Candidate chains (depth >= 2): 67
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:cms` | 17 |
| `feature:ai` | 9 |
| `shared-ui` | 8 |
| `app` | 5 |
| `feature:notesapp` | 4 |
| `feature:products` | 4 |
| `shared-lib` | 4 |
| `feature:case-resolver` | 3 |
| `feature:admin` | 2 |
| `feature:database` | 2 |
| `feature:document-editor` | 1 |
| `feature:integrations` | 1 |
| `feature:viewer3d` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AiPathAnalysisTriggerSection` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx` | 1 | 2 | no | no |
| 2 | `ZoneFooterNode` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx` | 1 | 2 | no | no |
| 3 | `RichTextEditorImpl` | `src/features/document-editor/components/RichTextEditorImpl.tsx` | 1 | 2 | no | no |
| 4 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 5 | `MarkdownEditor` | `src/features/notesapp/components/editor/MarkdownEditor.tsx` | 1 | 2 | no | no |
| 6 | `PanelHeader` | `src/shared/ui/templates/panels/PanelHeader.tsx` | 1 | 2 | no | no |
| 7 | `AdminError` | `src/app/(admin)/admin/error.tsx` | 1 | 1 | no | no |
| 8 | `NotesError` | `src/app/(admin)/admin/notes/error.tsx` | 1 | 1 | no | no |
| 9 | `FrontendError` | `src/app/(frontend)/error.tsx` | 1 | 1 | no | no |
| 10 | `HomeFallbackContent` | `src/app/(frontend)/home-fallback-content.tsx` | 1 | 1 | no | no |
| 11 | `GlobalError` | `src/app/error.tsx` | 1 | 1 | no | no |
| 12 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 1 | 1 | no | no |
| 13 | `ValidatorListTree` | `src/features/admin/pages/validator-lists/ValidatorListTree.tsx` | 1 | 1 | no | no |
| 14 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 1 | 1 | no | no |
| 15 | `CanvasBoard` | `src/features/ai/ai-paths/components/canvas-board.tsx` | 1 | 1 | no | no |
| 16 | `RunningIndicator` | `src/features/ai/ai-paths/components/job-queue-running-indicator.tsx` | 1 | 1 | no | no |
| 17 | `ChatbotDebugPanel` | `src/features/ai/chatbot/components/ChatbotDebugPanel.tsx` | 1 | 1 | no | no |
| 18 | `StudioCard` | `src/features/ai/image-studio/components/StudioCard.tsx` | 1 | 1 | no | no |
| 19 | `InlineImagePreviewCanvas` | `src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx` | 1 | 1 | no | no |
| 20 | `PromptExtractionHistoryPanel` | `src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx` | 1 | 1 | no | no |
| 21 | `AdminImageStudioValidationPatternsPage` | `src/features/ai/image-studio/pages/AdminImageStudioValidationPatternsPage.tsx` | 1 | 1 | no | no |
| 22 | `CaseResolverRelationsWorkspace` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx` | 1 | 1 | no | no |
| 23 | `CaseTreeRenderer` | `src/features/case-resolver/components/CaseTreeRenderer.tsx` | 1 | 1 | no | no |
| 24 | `CaseListHeader` | `src/features/case-resolver/components/list/CaseListHeader.tsx` | 1 | 1 | no | no |
| 25 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 26 | `AccordionItem` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx` | 1 | 1 | no | no |
| 27 | `SectionBlockRenderer` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx` | 1 | 1 | no | no |
| 28 | `AppEmbedsPanel` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx` | 1 | 1 | no | no |
| 29 | `BlockPickerDropdown` | `src/features/cms/components/page-builder/BlockPicker.tsx` | 1 | 1 | no | no |
| 30 | `ColumnBlockPickerDropdown` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx` | 1 | 1 | no | no |
| 31 | `PageBuilderLayout` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx` | 1 | 1 | no | no |
| 32 | `SectionPicker` | `src/features/cms/components/page-builder/SectionPicker.tsx` | 1 | 1 | no | no |
| 33 | `ThemeSettingsPanel` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1 | 1 | no | no |
| 34 | `PreviewSlideshowBlock` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx` | 1 | 1 | no | no |
| 35 | `PreviewBlockSectionBlock` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx` | 1 | 1 | no | no |
| 36 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 1 | 1 | no | no |
| 37 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 38 | `EditPageContent` | `src/features/cms/pages/pages/EditPagePage.tsx` | 1 | 1 | no | no |
| 39 | `EditSlugForm` | `src/features/cms/pages/slugs/EditSlugPage.tsx` | 1 | 1 | no | no |
| 40 | `ThemeEditor` | `src/features/cms/pages/themes/EditThemePage.tsx` | 1 | 1 | no | no |
| 41 | `ProviderBadge` | `src/features/database/components/ControlPanelColumns.tsx` | 1 | 1 | no | no |
| 42 | `DatabaseActionsCell` | `src/features/database/components/DatabaseColumns.tsx` | 1 | 1 | no | no |
| 43 | `CategoryMapperNameCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperNameCell.tsx` | 1 | 1 | no | no |
| 44 | `NoteCardFooter` | `src/features/notesapp/components/list/NoteCardFooter.tsx` | 1 | 1 | no | no |
| 45 | `NotesAppTreeHeader` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx` | 1 | 1 | no | no |
| 46 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 1 | no | no |
| 47 | `ProductCard` | `src/features/products/components/ProductCard.tsx` | 1 | 1 | no | no |
| 48 | `ValidatorDocTooltip` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx` | 1 | 1 | no | no |
| 49 | `ValidatorPatternImportModal` | `src/features/products/components/settings/validator-settings/ValidatorPatternImportModal.tsx` | 1 | 1 | no | no |
| 50 | `Asset3DUploader` | `src/features/viewer3d/components/Asset3DUploader.tsx` | 1 | 1 | no | no |
| 51 | `BrainCatalogTree` | `src/shared/lib/ai-brain/components/BrainCatalogTree.tsx` | 1 | 1 | no | no |
| 52 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 1 | no | no |
| 53 | `AnalyticsEventDetails` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx` | 1 | 1 | no | no |
| 54 | `AnalyticsStatCard` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx` | 1 | 1 | no | no |
| 55 | `AppErrorFallback` | `src/shared/ui/AppErrorBoundary.tsx` | 1 | 1 | no | no |
| 56 | `AppModal` | `src/shared/ui/app-modal.tsx` | 1 | 1 | no | no |
| 57 | `DataTableSortableHeader` | `src/shared/ui/data-table.tsx` | 1 | 1 | no | no |
| 58 | `MetadataItem` | `src/shared/ui/metadata-item.tsx` | 1 | 1 | no | no |
| 59 | `ConfirmModal` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 1 | 1 | no | no |
| 60 | `DetailModalSection` | `src/shared/ui/templates/modals/DetailModalSection.tsx` | 1 | 1 | no | no |
| 61 | `PanelAlerts` | `src/shared/ui/templates/panels/PanelAlerts.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 68 | `RichTextEditorImpl` | `SelectSimple` | 2 | 2 | `variant -> triggerClassName` | `src/features/document-editor/components/RichTextEditorImpl.tsx:534` |
| 2 | 68 | `MarkdownEditor` | `MarkdownSplitEditor` | 2 | 2 | `isCodeMode -> placeholder` | `src/features/notesapp/components/editor/MarkdownEditor.tsx:38` |
| 3 | 62 | `ZoneFooterNode` | `TreeSectionPicker` | 2 | 1 | `zone -> onSelect` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:75` |
| 4 | 62 | `PanelHeader` | `Button` | 2 | 1 | `isRefreshing -> disabled` | `src/shared/ui/templates/panels/PanelHeader.tsx:89` |
| 5 | 60 | `MarkdownEditor` | `MarkdownSplitEditor` | 2 | 2 | `isCodeMode -> isCodeMode` | `src/features/notesapp/components/editor/MarkdownEditor.tsx:38` |
| 6 | 58 | `AdminError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(admin)/admin/error.tsx:28` |
| 7 | 58 | `NotesError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(admin)/admin/notes/error.tsx:36` |
| 8 | 58 | `FrontendError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(frontend)/error.tsx:30` |
| 9 | 58 | `GlobalError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/error.tsx:28` |
| 10 | 58 | `ValidatorListTree` | `FolderTreeViewportV2` | 1 | 2 | `isPending -> enableDnd` | `src/features/admin/pages/validator-lists/ValidatorListTree.tsx:96` |
| 11 | 58 | `RunningIndicator` | `StatusBadge` | 1 | 2 | `label -> status` | `src/features/ai/ai-paths/components/job-queue-running-indicator.tsx:7` |
| 12 | 58 | `ChatbotDebugPanel` | `LogList` | 1 | 2 | `agentRunLogs -> logs` | `src/features/ai/chatbot/components/ChatbotDebugPanel.tsx:41` |
| 13 | 58 | `InlineImagePreviewCanvas` | `Button` | 1 | 2 | `imageSrc -> disabled` | `src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx:112` |
| 14 | 58 | `PromptExtractionHistoryPanel` | `Button` | 1 | 2 | `onClearHistory -> onClick` | `src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx:36` |
| 15 | 58 | `CaseListHeader` | `Button` | 1 | 2 | `onCreateCase -> onClick` | `src/features/case-resolver/components/list/CaseListHeader.tsx:100` |
| 16 | 58 | `AttachSlugModal` | `FormModal` | 1 | 2 | `isOpen -> open` | `src/features/cms/components/slugs/AttachSlugModal.tsx:70` |
| 17 | 58 | `EditPageContent` | `Button` | 1 | 2 | `id -> onClick` | `src/features/cms/pages/pages/EditPagePage.tsx:301` |
| 18 | 58 | `ProviderBadge` | `StatusBadge` | 1 | 2 | `count -> status` | `src/features/database/components/ControlPanelColumns.tsx:19` |
| 19 | 58 | `DatabaseActionsCell` | `DropdownMenuItem` | 1 | 2 | `backup -> onClick` | `src/features/database/components/DatabaseColumns.tsx:44` |
| 20 | 58 | `CategoryMapperNameCell` | `Button` | 1 | 2 | `onToggleExpand -> onClick` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperNameCell.tsx:34` |
| 21 | 58 | `NotesAppTreeHeader` | `Button` | 1 | 2 | `controller -> onClick` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx:159` |
| 22 | 58 | `EditableCell` | `Input` | 1 | 2 | `field -> step` | `src/features/products/components/EditableCell.tsx:93` |
| 23 | 58 | `ProductCard` | `ResourceCard` | 1 | 2 | `product -> footer` | `src/features/products/components/ProductCard.tsx:22` |
| 24 | 58 | `ValidatorPatternImportModal` | `JSONImportModal` | 1 | 2 | `open -> isOpen` | `src/features/products/components/settings/validator-settings/ValidatorPatternImportModal.tsx:147` |
| 25 | 58 | `Asset3DUploader` | `FormActions` | 1 | 2 | `className -> saveIcon` | `src/features/viewer3d/components/Asset3DUploader.tsx:324` |
| 26 | 58 | `BrainCatalogTree` | `FolderTreeViewportV2` | 1 | 2 | `isPending -> enableDnd` | `src/shared/lib/ai-brain/components/BrainCatalogTree.tsx:97` |
| 27 | 58 | `TriggerButtonBar` | `ToggleRow` | 1 | 2 | `className -> icon` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:72` |
| 28 | 54 | `AiPathAnalysisTriggerSection` | `AiPathAnalysisTriggerCompact` | 2 | 1 | `analysis -> analysis` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:492` |
| 29 | 54 | `AiPathAnalysisTriggerSection` | `AiPathAnalysisTriggerFull` | 2 | 1 | `analysis -> analysis` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:496` |
| 30 | 54 | `ZoneFooterNode` | `TreeSectionPicker` | 2 | 1 | `zone -> zone` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:75` |
| 31 | 54 | `RichTextEditorImpl` | `ToolbarButton` | 2 | 1 | `variant -> variant` | `src/features/document-editor/components/RichTextEditorImpl.tsx:360` |
| 32 | 54 | `NoteCardBase` | `NoteCardContent` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:135` |
| 33 | 54 | `NoteCardBase` | `NoteCardFooter` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:136` |
| 34 | 54 | `PanelHeader` | `RefreshButton` | 2 | 1 | `isRefreshing -> isRefreshing` | `src/shared/ui/templates/panels/PanelHeader.tsx:107` |
| 35 | 52 | `HomeFallbackContent` | `SocialLinks` | 1 | 1 | `themeSettings -> theme` | `src/app/(frontend)/home-fallback-content.tsx:224` |
| 36 | 52 | `CanvasBoard` | `CanvasConnectorTooltip` | 1 | 1 | `resolveConnectorTooltip -> override` | `src/features/ai/ai-paths/components/canvas-board.tsx:434` |
| 37 | 52 | `CaseResolverRelationsWorkspace` | `CaseResolverRelationsWorkspaceProvider` | 1 | 1 | `focusCaseId -> value` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:480` |
| 38 | 52 | `AccordionItem` | `FrontendBlockRenderer` | 1 | 1 | `item -> block` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx:91` |
| 39 | 52 | `SectionBlockRenderer` | `SectionBlockProvider` | 1 | 1 | `block -> settings` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx:228` |
| 40 | 52 | `PreviewSlideshowBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx:405` |
| 41 | 52 | `PreviewBlockSectionBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx:232` |
| 42 | 52 | `EditSlugForm` | `SlugForm` | 1 | 1 | `initialSlug -> initialData` | `src/features/cms/pages/slugs/EditSlugPage.tsx:121` |
| 43 | 52 | `ThemeEditor` | `ThemeForm` | 1 | 1 | `theme -> initialData` | `src/features/cms/pages/themes/EditThemePage.tsx:64` |
| 44 | 52 | `AnalyticsEventDetails` | `DetailItem` | 1 | 1 | `event -> value` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx:28` |
| 45 | 52 | `AppErrorFallback` | `Button` | 1 | 1 | `resetErrorBoundary -> onClick` | `src/shared/ui/AppErrorBoundary.tsx:47` |
| 46 | 52 | `AppModal` | `DialogContent` | 1 | 1 | `contentClassName -> className` | `src/shared/ui/app-modal.tsx:196` |
| 47 | 52 | `MetadataItem` | `Label` | 1 | 1 | `labelClassName -> className` | `src/shared/ui/metadata-item.tsx:45` |
| 48 | 52 | `ConfirmModal` | `AlertDialogDescription` | 1 | 1 | `subtitle -> className` | `src/shared/ui/templates/modals/ConfirmModal.tsx:187` |
| 49 | 50 | `StudioCard` | `Card` | 1 | 2 | `className -> className` | `src/features/ai/image-studio/components/StudioCard.tsx:22` |
| 50 | 50 | `AdminImageStudioValidationPatternsPage` | `AdminPromptEngineValidationPatternsPage` | 1 | 2 | `embedded -> embedded` | `src/features/ai/image-studio/pages/AdminImageStudioValidationPatternsPage.tsx:17` |
| 51 | 50 | `CmsDomainSelector` | `SelectSimple` | 1 | 2 | `triggerClassName -> triggerClassName` | `src/features/cms/components/CmsDomainSelector.tsx:63` |
| 52 | 50 | `BlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/BlockPicker.tsx:41` |
| 53 | 50 | `ColumnBlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx:51` |
| 54 | 50 | `SectionPicker` | `Button` | 1 | 2 | `disabled -> disabled` | `src/features/cms/components/page-builder/SectionPicker.tsx:40` |
| 55 | 50 | `ThemeSettingsFieldsSection` | `SettingsFieldsRenderer` | 1 | 2 | `fields -> fields` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33` |
| 56 | 50 | `NoteCardFooter` | `Breadcrumbs` | 1 | 2 | `backgroundColor -> backgroundColor` | `src/features/notesapp/components/list/NoteCardFooter.tsx:105` |
| 57 | 50 | `ValidatorDocTooltip` | `DocumentationTooltip` | 1 | 2 | `docId -> docId` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67` |
| 58 | 50 | `AnalyticsStatCard` | `FormSection` | 1 | 2 | `title -> title` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18` |
| 59 | 44 | `AdminLayout` | `AdminLayoutProvider` | 1 | 1 | `initialMenuCollapsed -> initialMenuCollapsed` | `src/features/admin/layout/AdminLayout.tsx:197` |
| 60 | 44 | `CanvasSvgNode` | `CanvasSvgNodePorts` | 1 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:560` |
| 61 | 44 | `CaseTreeRenderer` | `CaseTreeRenderer` | 1 | 1 | `depth -> depth` | `src/features/case-resolver/components/CaseTreeRenderer.tsx:326` |
| 62 | 44 | `AppEmbedsPanel` | `AppEmbedsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx:15` |
| 63 | 44 | `PageBuilderLayout` | `PageBuilderProvider` | 1 | 1 | `initialState -> initialState` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx:112` |
| 64 | 44 | `ThemeSettingsPanel` | `ThemeSettingsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx:235` |
| 65 | 44 | `DataTableSortableHeader` | `Button` | 1 | 1 | `className -> className` | `src/shared/ui/data-table.tsx:67` |
| 66 | 44 | `DetailModalSection` | `Card` | 1 | 1 | `className -> className` | `src/shared/ui/templates/modals/DetailModalSection.tsx:27` |
| 67 | 44 | `PanelAlerts` | `Alert` | 1 | 1 | `onDismiss -> onDismiss` | `src/shared/ui/templates/panels/PanelAlerts.tsx:60` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. RichTextEditorImpl -> SelectSimple

- Score: 68
- Root fanout: 2
- Prop mapping: variant -> triggerClassName
- Location: src/features/document-editor/components/RichTextEditorImpl.tsx:534

### 2. MarkdownEditor -> MarkdownSplitEditor

- Score: 68
- Root fanout: 2
- Prop mapping: isCodeMode -> placeholder
- Location: src/features/notesapp/components/editor/MarkdownEditor.tsx:38

### 3. ZoneFooterNode -> TreeSectionPicker

- Score: 62
- Root fanout: 2
- Prop mapping: zone -> onSelect
- Location: src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:75

### 4. PanelHeader -> Button

- Score: 62
- Root fanout: 2
- Prop mapping: isRefreshing -> disabled
- Location: src/shared/ui/templates/panels/PanelHeader.tsx:89

### 5. MarkdownEditor -> MarkdownSplitEditor

- Score: 60
- Root fanout: 2
- Prop mapping: isCodeMode -> isCodeMode
- Location: src/features/notesapp/components/editor/MarkdownEditor.tsx:38

### 6. AdminError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(admin)/admin/error.tsx:28

### 7. NotesError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(admin)/admin/notes/error.tsx:36

### 8. FrontendError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(frontend)/error.tsx:30

### 9. GlobalError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/error.tsx:28

### 10. ValidatorListTree -> FolderTreeViewportV2

- Score: 58
- Root fanout: 1
- Prop mapping: isPending -> enableDnd
- Location: src/features/admin/pages/validator-lists/ValidatorListTree.tsx:96

### 11. RunningIndicator -> StatusBadge

- Score: 58
- Root fanout: 1
- Prop mapping: label -> status
- Location: src/features/ai/ai-paths/components/job-queue-running-indicator.tsx:7

### 12. ChatbotDebugPanel -> LogList

- Score: 58
- Root fanout: 1
- Prop mapping: agentRunLogs -> logs
- Location: src/features/ai/chatbot/components/ChatbotDebugPanel.tsx:41

### 13. InlineImagePreviewCanvas -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: imageSrc -> disabled
- Location: src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx:112

### 14. PromptExtractionHistoryPanel -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: onClearHistory -> onClick
- Location: src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx:36

### 15. CaseListHeader -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: onCreateCase -> onClick
- Location: src/features/case-resolver/components/list/CaseListHeader.tsx:100

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
