# Prop Drilling Scan

Generated at: 2026-03-05T01:11:24.991Z

## Snapshot

- Scanned source files: 3890
- JSX files scanned: 1392
- Components detected: 2082
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 59
- Resolved forwarded transitions: 62
- Candidate chains (depth >= 2): 62
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
| `feature:products` | 4 |
| `shared-lib` | 4 |
| `feature:notesapp` | 3 |
| `feature:case-resolver` | 3 |
| `feature:admin` | 2 |
| `feature:database` | 2 |
| `feature:integrations` | 1 |
| `feature:viewer3d` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AiPathAnalysisTriggerSection` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx` | 1 | 2 | no | no |
| 2 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 3 | `PanelHeader` | `src/shared/ui/templates/panels/PanelHeader.tsx` | 1 | 2 | no | no |
| 4 | `AdminError` | `src/app/(admin)/admin/error.tsx` | 1 | 1 | no | no |
| 5 | `NotesError` | `src/app/(admin)/admin/notes/error.tsx` | 1 | 1 | no | no |
| 6 | `FrontendError` | `src/app/(frontend)/error.tsx` | 1 | 1 | no | no |
| 7 | `HomeFallbackContent` | `src/app/(frontend)/home-fallback-content.tsx` | 1 | 1 | no | no |
| 8 | `GlobalError` | `src/app/error.tsx` | 1 | 1 | no | no |
| 9 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 1 | 1 | no | no |
| 10 | `ValidatorListTree` | `src/features/admin/pages/validator-lists/ValidatorListTree.tsx` | 1 | 1 | no | no |
| 11 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 1 | 1 | no | no |
| 12 | `CanvasBoard` | `src/features/ai/ai-paths/components/canvas-board.tsx` | 1 | 1 | no | no |
| 13 | `RunningIndicator` | `src/features/ai/ai-paths/components/job-queue-running-indicator.tsx` | 1 | 1 | no | no |
| 14 | `ChatbotDebugPanel` | `src/features/ai/chatbot/components/ChatbotDebugPanel.tsx` | 1 | 1 | no | no |
| 15 | `StudioCard` | `src/features/ai/image-studio/components/StudioCard.tsx` | 1 | 1 | no | no |
| 16 | `InlineImagePreviewCanvas` | `src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx` | 1 | 1 | no | no |
| 17 | `PromptExtractionHistoryPanel` | `src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx` | 1 | 1 | no | no |
| 18 | `AdminImageStudioValidationPatternsPage` | `src/features/ai/image-studio/pages/AdminImageStudioValidationPatternsPage.tsx` | 1 | 1 | no | no |
| 19 | `CaseResolverRelationsWorkspace` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx` | 1 | 1 | no | no |
| 20 | `CaseTreeRenderer` | `src/features/case-resolver/components/CaseTreeRenderer.tsx` | 1 | 1 | no | no |
| 21 | `CaseListHeader` | `src/features/case-resolver/components/list/CaseListHeader.tsx` | 1 | 1 | no | no |
| 22 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 23 | `AccordionItem` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx` | 1 | 1 | no | no |
| 24 | `SectionBlockRenderer` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx` | 1 | 1 | no | no |
| 25 | `AppEmbedsPanel` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx` | 1 | 1 | no | no |
| 26 | `BlockPickerDropdown` | `src/features/cms/components/page-builder/BlockPicker.tsx` | 1 | 1 | no | no |
| 27 | `ColumnBlockPickerDropdown` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx` | 1 | 1 | no | no |
| 28 | `PageBuilderLayout` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx` | 1 | 1 | no | no |
| 29 | `SectionPicker` | `src/features/cms/components/page-builder/SectionPicker.tsx` | 1 | 1 | no | no |
| 30 | `ThemeSettingsPanel` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx` | 1 | 1 | no | no |
| 31 | `PreviewSlideshowBlock` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx` | 1 | 1 | no | no |
| 32 | `PreviewBlockSectionBlock` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx` | 1 | 1 | no | no |
| 33 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 1 | 1 | no | no |
| 34 | `ZoneFooterNode` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx` | 1 | 1 | no | no |
| 35 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 36 | `EditPageContent` | `src/features/cms/pages/pages/EditPagePage.tsx` | 1 | 1 | no | no |
| 37 | `EditSlugForm` | `src/features/cms/pages/slugs/EditSlugPage.tsx` | 1 | 1 | no | no |
| 38 | `ThemeEditor` | `src/features/cms/pages/themes/EditThemePage.tsx` | 1 | 1 | no | no |
| 39 | `ProviderBadge` | `src/features/database/components/ControlPanelColumns.tsx` | 1 | 1 | no | no |
| 40 | `DatabaseActionsCell` | `src/features/database/components/DatabaseColumns.tsx` | 1 | 1 | no | no |
| 41 | `CategoryMapperNameCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperNameCell.tsx` | 1 | 1 | no | no |
| 42 | `NoteCardFooter` | `src/features/notesapp/components/list/NoteCardFooter.tsx` | 1 | 1 | no | no |
| 43 | `NotesAppTreeHeader` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx` | 1 | 1 | no | no |
| 44 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 1 | no | no |
| 45 | `ProductCard` | `src/features/products/components/ProductCard.tsx` | 1 | 1 | no | no |
| 46 | `ValidatorDocTooltip` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx` | 1 | 1 | no | no |
| 47 | `ValidatorPatternImportModal` | `src/features/products/components/settings/validator-settings/ValidatorPatternImportModal.tsx` | 1 | 1 | no | no |
| 48 | `Asset3DUploader` | `src/features/viewer3d/components/Asset3DUploader.tsx` | 1 | 1 | no | no |
| 49 | `BrainCatalogTree` | `src/shared/lib/ai-brain/components/BrainCatalogTree.tsx` | 1 | 1 | no | no |
| 50 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 1 | no | no |
| 51 | `AnalyticsEventDetails` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx` | 1 | 1 | no | no |
| 52 | `AnalyticsStatCard` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx` | 1 | 1 | no | no |
| 53 | `AppErrorFallback` | `src/shared/ui/AppErrorBoundary.tsx` | 1 | 1 | no | no |
| 54 | `AppModal` | `src/shared/ui/app-modal.tsx` | 1 | 1 | no | no |
| 55 | `DataTableSortableHeader` | `src/shared/ui/data-table.tsx` | 1 | 1 | no | no |
| 56 | `MetadataItem` | `src/shared/ui/metadata-item.tsx` | 1 | 1 | no | no |
| 57 | `ConfirmModal` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 1 | 1 | no | no |
| 58 | `DetailModalSection` | `src/shared/ui/templates/modals/DetailModalSection.tsx` | 1 | 1 | no | no |
| 59 | `PanelAlerts` | `src/shared/ui/templates/panels/PanelAlerts.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 62 | `PanelHeader` | `Button` | 2 | 1 | `isRefreshing -> disabled` | `src/shared/ui/templates/panels/PanelHeader.tsx:89` |
| 2 | 58 | `AdminError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(admin)/admin/error.tsx:28` |
| 3 | 58 | `NotesError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(admin)/admin/notes/error.tsx:36` |
| 4 | 58 | `FrontendError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/(frontend)/error.tsx:30` |
| 5 | 58 | `GlobalError` | `Button` | 1 | 2 | `reset -> onClick` | `src/app/error.tsx:28` |
| 6 | 58 | `ValidatorListTree` | `FolderTreeViewportV2` | 1 | 2 | `isPending -> enableDnd` | `src/features/admin/pages/validator-lists/ValidatorListTree.tsx:96` |
| 7 | 58 | `RunningIndicator` | `StatusBadge` | 1 | 2 | `label -> status` | `src/features/ai/ai-paths/components/job-queue-running-indicator.tsx:7` |
| 8 | 58 | `ChatbotDebugPanel` | `LogList` | 1 | 2 | `agentRunLogs -> logs` | `src/features/ai/chatbot/components/ChatbotDebugPanel.tsx:41` |
| 9 | 58 | `InlineImagePreviewCanvas` | `Button` | 1 | 2 | `imageSrc -> disabled` | `src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx:112` |
| 10 | 58 | `PromptExtractionHistoryPanel` | `Button` | 1 | 2 | `onClearHistory -> onClick` | `src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx:36` |
| 11 | 58 | `CaseListHeader` | `Button` | 1 | 2 | `onCreateCase -> onClick` | `src/features/case-resolver/components/list/CaseListHeader.tsx:100` |
| 12 | 58 | `AttachSlugModal` | `FormModal` | 1 | 2 | `isOpen -> open` | `src/features/cms/components/slugs/AttachSlugModal.tsx:70` |
| 13 | 58 | `EditPageContent` | `Button` | 1 | 2 | `id -> onClick` | `src/features/cms/pages/pages/EditPagePage.tsx:301` |
| 14 | 58 | `ProviderBadge` | `StatusBadge` | 1 | 2 | `count -> status` | `src/features/database/components/ControlPanelColumns.tsx:19` |
| 15 | 58 | `DatabaseActionsCell` | `DropdownMenuItem` | 1 | 2 | `backup -> onClick` | `src/features/database/components/DatabaseColumns.tsx:44` |
| 16 | 58 | `CategoryMapperNameCell` | `Button` | 1 | 2 | `onToggleExpand -> onClick` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperNameCell.tsx:34` |
| 17 | 58 | `NotesAppTreeHeader` | `Button` | 1 | 2 | `controller -> onClick` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx:159` |
| 18 | 58 | `EditableCell` | `Input` | 1 | 2 | `field -> step` | `src/features/products/components/EditableCell.tsx:93` |
| 19 | 58 | `ProductCard` | `ResourceCard` | 1 | 2 | `product -> footer` | `src/features/products/components/ProductCard.tsx:22` |
| 20 | 58 | `ValidatorPatternImportModal` | `JSONImportModal` | 1 | 2 | `open -> isOpen` | `src/features/products/components/settings/validator-settings/ValidatorPatternImportModal.tsx:147` |
| 21 | 58 | `Asset3DUploader` | `FormActions` | 1 | 2 | `className -> saveIcon` | `src/features/viewer3d/components/Asset3DUploader.tsx:324` |
| 22 | 58 | `BrainCatalogTree` | `FolderTreeViewportV2` | 1 | 2 | `isPending -> enableDnd` | `src/shared/lib/ai-brain/components/BrainCatalogTree.tsx:97` |
| 23 | 58 | `TriggerButtonBar` | `ToggleRow` | 1 | 2 | `className -> icon` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:72` |
| 24 | 54 | `AiPathAnalysisTriggerSection` | `AiPathAnalysisTriggerCompact` | 2 | 1 | `analysis -> analysis` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:492` |
| 25 | 54 | `AiPathAnalysisTriggerSection` | `AiPathAnalysisTriggerFull` | 2 | 1 | `analysis -> analysis` | `src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:496` |
| 26 | 54 | `NoteCardBase` | `NoteCardContent` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:135` |
| 27 | 54 | `NoteCardBase` | `NoteCardFooter` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:136` |
| 28 | 54 | `PanelHeader` | `RefreshButton` | 2 | 1 | `isRefreshing -> isRefreshing` | `src/shared/ui/templates/panels/PanelHeader.tsx:107` |
| 29 | 52 | `HomeFallbackContent` | `SocialLinks` | 1 | 1 | `themeSettings -> theme` | `src/app/(frontend)/home-fallback-content.tsx:224` |
| 30 | 52 | `CanvasBoard` | `CanvasConnectorTooltip` | 1 | 1 | `resolveConnectorTooltip -> override` | `src/features/ai/ai-paths/components/canvas-board.tsx:434` |
| 31 | 52 | `CaseResolverRelationsWorkspace` | `CaseResolverRelationsWorkspaceProvider` | 1 | 1 | `focusCaseId -> value` | `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx:480` |
| 32 | 52 | `AccordionItem` | `FrontendBlockRenderer` | 1 | 1 | `item -> block` | `src/features/cms/components/frontend/sections/FrontendAccordionSection.tsx:91` |
| 33 | 52 | `SectionBlockRenderer` | `SectionBlockProvider` | 1 | 1 | `block -> settings` | `src/features/cms/components/frontend/sections/grid/SectionBlockRenderer.tsx:228` |
| 34 | 52 | `PreviewSlideshowBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewCarouselBlocks.tsx:405` |
| 35 | 52 | `PreviewBlockSectionBlock` | `BlockContextProvider` | 1 | 1 | `stretch -> value` | `src/features/cms/components/page-builder/preview/PreviewSectionBlocks.tsx:232` |
| 36 | 52 | `EditSlugForm` | `SlugForm` | 1 | 1 | `initialSlug -> initialData` | `src/features/cms/pages/slugs/EditSlugPage.tsx:121` |
| 37 | 52 | `ThemeEditor` | `ThemeForm` | 1 | 1 | `theme -> initialData` | `src/features/cms/pages/themes/EditThemePage.tsx:64` |
| 38 | 52 | `AnalyticsEventDetails` | `DetailItem` | 1 | 1 | `event -> value` | `src/shared/lib/analytics/components/AnalyticsEventDetails.tsx:28` |
| 39 | 52 | `AppErrorFallback` | `Button` | 1 | 1 | `resetErrorBoundary -> onClick` | `src/shared/ui/AppErrorBoundary.tsx:47` |
| 40 | 52 | `AppModal` | `DialogContent` | 1 | 1 | `contentClassName -> className` | `src/shared/ui/app-modal.tsx:196` |
| 41 | 52 | `MetadataItem` | `Label` | 1 | 1 | `labelClassName -> className` | `src/shared/ui/metadata-item.tsx:45` |
| 42 | 52 | `ConfirmModal` | `AlertDialogDescription` | 1 | 1 | `subtitle -> className` | `src/shared/ui/templates/modals/ConfirmModal.tsx:187` |
| 43 | 50 | `StudioCard` | `Card` | 1 | 2 | `className -> className` | `src/features/ai/image-studio/components/StudioCard.tsx:22` |
| 44 | 50 | `AdminImageStudioValidationPatternsPage` | `AdminPromptEngineValidationPatternsPage` | 1 | 2 | `embedded -> embedded` | `src/features/ai/image-studio/pages/AdminImageStudioValidationPatternsPage.tsx:17` |
| 45 | 50 | `CmsDomainSelector` | `SelectSimple` | 1 | 2 | `triggerClassName -> triggerClassName` | `src/features/cms/components/CmsDomainSelector.tsx:63` |
| 46 | 50 | `BlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/BlockPicker.tsx:41` |
| 47 | 50 | `ColumnBlockPickerDropdown` | `GenericPickerDropdown` | 1 | 2 | `groups -> groups` | `src/features/cms/components/page-builder/ColumnBlockPicker.tsx:51` |
| 48 | 50 | `SectionPicker` | `Button` | 1 | 2 | `disabled -> disabled` | `src/features/cms/components/page-builder/SectionPicker.tsx:40` |
| 49 | 50 | `ThemeSettingsFieldsSection` | `SettingsFieldsRenderer` | 1 | 2 | `fields -> fields` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx:33` |
| 50 | 50 | `NoteCardFooter` | `Breadcrumbs` | 1 | 2 | `backgroundColor -> backgroundColor` | `src/features/notesapp/components/list/NoteCardFooter.tsx:105` |
| 51 | 50 | `ValidatorDocTooltip` | `DocumentationTooltip` | 1 | 2 | `docId -> docId` | `src/features/products/components/settings/validator-settings/ValidatorDocsTooltips.tsx:67` |
| 52 | 50 | `AnalyticsStatCard` | `FormSection` | 1 | 2 | `title -> title` | `src/shared/lib/analytics/components/AnalyticsStatCard.tsx:18` |
| 53 | 44 | `AdminLayout` | `AdminLayoutProvider` | 1 | 1 | `initialMenuCollapsed -> initialMenuCollapsed` | `src/features/admin/layout/AdminLayout.tsx:197` |
| 54 | 44 | `CanvasSvgNode` | `CanvasSvgNodePorts` | 1 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:560` |
| 55 | 44 | `CaseTreeRenderer` | `CaseTreeRenderer` | 1 | 1 | `depth -> depth` | `src/features/case-resolver/components/CaseTreeRenderer.tsx:326` |
| 56 | 44 | `AppEmbedsPanel` | `AppEmbedsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/AppEmbedsPanel.tsx:15` |
| 57 | 44 | `PageBuilderLayout` | `PageBuilderProvider` | 1 | 1 | `initialState -> initialState` | `src/features/cms/components/page-builder/PageBuilderLayout.tsx:112` |
| 58 | 44 | `ThemeSettingsPanel` | `ThemeSettingsPanelContent` | 1 | 1 | `showHeader -> showHeader` | `src/features/cms/components/page-builder/ThemeSettingsPanel.tsx:235` |
| 59 | 44 | `ZoneFooterNode` | `TreeSectionPicker` | 1 | 1 | `zone -> zone` | `src/features/cms/components/page-builder/tree/ZoneFooterNode.tsx:73` |
| 60 | 44 | `DataTableSortableHeader` | `Button` | 1 | 1 | `className -> className` | `src/shared/ui/data-table.tsx:67` |
| 61 | 44 | `DetailModalSection` | `Card` | 1 | 1 | `className -> className` | `src/shared/ui/templates/modals/DetailModalSection.tsx:27` |
| 62 | 44 | `PanelAlerts` | `Alert` | 1 | 1 | `onDismiss -> onDismiss` | `src/shared/ui/templates/panels/PanelAlerts.tsx:60` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. PanelHeader -> Button

- Score: 62
- Root fanout: 2
- Prop mapping: isRefreshing -> disabled
- Location: src/shared/ui/templates/panels/PanelHeader.tsx:89

### 2. AdminError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(admin)/admin/error.tsx:28

### 3. NotesError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(admin)/admin/notes/error.tsx:36

### 4. FrontendError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/(frontend)/error.tsx:30

### 5. GlobalError -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: reset -> onClick
- Location: src/app/error.tsx:28

### 6. ValidatorListTree -> FolderTreeViewportV2

- Score: 58
- Root fanout: 1
- Prop mapping: isPending -> enableDnd
- Location: src/features/admin/pages/validator-lists/ValidatorListTree.tsx:96

### 7. RunningIndicator -> StatusBadge

- Score: 58
- Root fanout: 1
- Prop mapping: label -> status
- Location: src/features/ai/ai-paths/components/job-queue-running-indicator.tsx:7

### 8. ChatbotDebugPanel -> LogList

- Score: 58
- Root fanout: 1
- Prop mapping: agentRunLogs -> logs
- Location: src/features/ai/chatbot/components/ChatbotDebugPanel.tsx:41

### 9. InlineImagePreviewCanvas -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: imageSrc -> disabled
- Location: src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx:112

### 10. PromptExtractionHistoryPanel -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: onClearHistory -> onClick
- Location: src/features/ai/image-studio/components/studio-modals/PromptExtractionHistoryPanel.tsx:36

### 11. CaseListHeader -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: onCreateCase -> onClick
- Location: src/features/case-resolver/components/list/CaseListHeader.tsx:100

### 12. AttachSlugModal -> FormModal

- Score: 58
- Root fanout: 1
- Prop mapping: isOpen -> open
- Location: src/features/cms/components/slugs/AttachSlugModal.tsx:70

### 13. EditPageContent -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: id -> onClick
- Location: src/features/cms/pages/pages/EditPagePage.tsx:301

### 14. ProviderBadge -> StatusBadge

- Score: 58
- Root fanout: 1
- Prop mapping: count -> status
- Location: src/features/database/components/ControlPanelColumns.tsx:19

### 15. DatabaseActionsCell -> DropdownMenuItem

- Score: 58
- Root fanout: 1
- Prop mapping: backup -> onClick
- Location: src/features/database/components/DatabaseColumns.tsx:44

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
