---
owner: 'Platform Team'
last_reviewed: '2026-03-24'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-24T23:07:34.712Z

## Snapshot

- Scanned source files: 5724
- JSX files scanned: 2107
- Components detected: 3608
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 249
- Resolved forwarded transitions: 1059
- Candidate chains (depth >= 2): 1059
- Candidate chains (depth >= 3): 233
- High-priority chains (depth >= 4): 49
- Unknown spread forwarding edges: 31
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 117 |
| `shared-ui` | 54 |
| `feature:ai` | 37 |
| `feature:database` | 10 |
| `feature:cms` | 7 |
| `feature:products` | 6 |
| `feature:notesapp` | 3 |
| `feature:integrations` | 3 |
| `feature:viewer3d` | 2 |
| `feature:foldertree` | 2 |
| `feature:filemaker` | 2 |
| `feature:observability` | 2 |
| `shared-lib` | 1 |
| `app` | 1 |
| `feature:document-editor` | 1 |
| `feature:admin` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AdminKangurLessonsManagerTreePanel` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx` | 30 | 51 | no | yes |
| 2 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 19 | 22 | no | yes |
| 3 | `DetailModal` | `src/shared/ui/templates/modals/DetailModal.tsx` | 18 | 19 | no | yes |
| 4 | `KangurNavAction` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 15 | 16 | no | yes |
| 5 | `SelectSimpleControl` | `src/shared/ui/select-simple.tsx` | 15 | 16 | no | yes |
| 6 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 15 | 15 | no | yes |
| 7 | `PageLayoutRuntime` | `src/shared/ui/PageLayout.tsx` | 14 | 14 | no | yes |
| 8 | `SelectSimple` | `src/shared/ui/select-simple.tsx` | 13 | 13 | no | yes |
| 9 | `FilterPanelMainFilters` | `src/shared/ui/templates/FilterPanel.tsx` | 12 | 12 | no | yes |
| 10 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 11 | 16 | no | yes |
| 11 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 11 | 15 | no | yes |
| 12 | `StandardDataTablePanelRender` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 11 | 11 | no | yes |
| 13 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 11 | 11 | no | yes |
| 14 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 15 | `RotationOptionCard` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.visuals.tsx` | 10 | 13 | no | yes |
| 16 | `ConfirmModal` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 10 | 11 | no | yes |
| 17 | `ConfirmDialog` | `src/shared/ui/confirm-dialog.tsx` | 10 | 10 | no | yes |
| 18 | `SearchableSelectControl` | `src/shared/ui/searchable-select.tsx` | 10 | 10 | no | yes |
| 19 | `KangurResultsWidgetContent` | `src/features/kangur/ui/components/KangurResultsWidgetContent.tsx` | 9 | 10 | no | yes |
| 20 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no | yes |
| 21 | `AiPathsPillButton` | `src/features/ai/ai-paths/components/AiPathsPillButton.tsx` | 9 | 9 | no | yes |
| 22 | `ActionMenu` | `src/shared/ui/ActionMenu.tsx` | 9 | 9 | no | yes |
| 23 | `FormModalHeaderContent` | `src/shared/ui/FormModal.tsx` | 9 | 9 | no | yes |
| 24 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no | yes |
| 25 | `AnalyticsEventsTable` | `src/shared/lib/analytics/components/AnalyticsEventsTable.tsx` | 8 | 11 | no | yes |
| 26 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/KangurAssignmentManagerTimeLimitModal.tsx` | 8 | 10 | no | yes |
| 27 | `KangurGameSetupStage` | `src/features/kangur/ui/components/KangurGameSetupStage.tsx` | 8 | 8 | no | yes |
| 28 | `SearchableSelect` | `src/shared/ui/searchable-select.tsx` | 8 | 8 | no | yes |
| 29 | `VectorToolbarActionButtons` | `src/shared/ui/vector-canvas.rendering.tsx` | 8 | 8 | no | yes |
| 30 | `StatusToggle` | `src/shared/ui/status-toggle.tsx` | 7 | 11 | no | yes |
| 31 | `ActionMenuContent` | `src/shared/ui/ActionMenu.tsx` | 7 | 9 | no | yes |
| 32 | `AppModalDefaultHeader` | `src/shared/ui/app-modal.tsx` | 7 | 9 | no | yes |
| 33 | `EditableCellInput` | `src/features/products/components/EditableCell.tsx` | 7 | 8 | no | yes |
| 34 | `SelectModal` | `src/shared/ui/templates/modals/SelectModal.tsx` | 7 | 8 | no | yes |
| 35 | `Asset3DResourceCard` | `src/features/viewer3d/components/Asset3DCard.tsx` | 6 | 17 | no | yes |
| 36 | `TagBadge` | `src/shared/ui/tag.tsx` | 6 | 8 | no | yes |
| 37 | `KangurUnifiedLessonBase` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 6 | 7 | no | yes |
| 38 | `ValidationActionButton` | `src/features/ai/ai-paths/components/validation/ValidationActionButton.tsx` | 6 | 6 | no | yes |
| 39 | `PageLayoutHeader` | `src/shared/ui/PageLayout.tsx` | 6 | 6 | no | yes |
| 40 | `RefreshButton` | `src/shared/ui/RefreshButton.tsx` | 6 | 6 | no | yes |
| 41 | `AppModal` | `src/shared/ui/app-modal.tsx` | 6 | 6 | no | yes |
| 42 | `SearchInput` | `src/shared/ui/search-input.tsx` | 6 | 6 | no | yes |
| 43 | `Tag` | `src/shared/ui/tag.tsx` | 6 | 6 | no | yes |
| 44 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 5 | 7 | no | yes |
| 45 | `AttachSlugFormModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 5 | 6 | no | yes |
| 46 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 47 | `PromptGenerationOutputPromptPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 5 | 6 | no | yes |
| 48 | `ConfirmModalFooterActions` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 5 | 6 | no | yes |
| 49 | `JobQueueJsonField` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 5 | 5 | no | yes |
| 50 | `RuntimeEventEntry` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx` | 5 | 5 | no | yes |
| 51 | `CmsDomainSelectorControl` | `src/features/cms/components/CmsDomainSelector.tsx` | 5 | 5 | no | yes |
| 52 | `KangurAdminWorkspaceIntroCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceIntroCard.tsx` | 5 | 5 | no | yes |
| 53 | `KangurAdminWorkspaceSectionCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceSectionCard.tsx` | 5 | 5 | no | yes |
| 54 | `KangurGameQuizStage` | `src/features/kangur/ui/components/KangurGameQuizStage.tsx` | 5 | 5 | no | yes |
| 55 | `SkeletonGlassPanel` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 5 | 5 | no | yes |
| 56 | `RefreshButtonControl` | `src/shared/ui/RefreshButton.tsx` | 5 | 5 | no | yes |
| 57 | `SearchInputContent` | `src/shared/ui/search-input.tsx` | 5 | 5 | no | yes |
| 58 | `ProductListMobileCard` | `src/features/products/components/list/ProductListMobileCards.tsx` | 4 | 20 | no | yes |
| 59 | `TreeSectionPicker` | `src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx` | 4 | 6 | no | yes |
| 60 | `AdminKangurSocialSettingsModal` | `src/features/kangur/admin/admin-kangur-social/AdminKangurSocialSettingsModal.tsx` | 4 | 6 | no | yes |
| 61 | `JobQueueJsonTextarea` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 4 | 5 | no | yes |
| 62 | `CentralDocsSyncCandidateCard` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 4 | 5 | no | yes |
| 63 | `SocialPostImagesPanel` | `src/features/kangur/admin/admin-kangur-social/SocialPost.ImagesPanel.tsx` | 4 | 5 | no | yes |
| 64 | `PromptGenerationInputPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 65 | `PromptGenerationModelPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 66 | `PromptGenerationOutputToggle` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 67 | `FolderTreeSearchViewportTree` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 4 | 4 | no | yes |
| 68 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 4 | 4 | no | yes |
| 69 | `KangurDialogHeader` | `src/features/kangur/ui/components/KangurDialogHeader.tsx` | 4 | 4 | no | yes |
| 70 | `SkeletonInfoSurface` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 4 | 4 | no | yes |
| 71 | `KangurTextWordmark` | `src/features/kangur/ui/components/KangurTextWordmark.tsx` | 4 | 4 | yes | yes |
| 72 | `NotesAppTreeHeaderQuickFilters` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx` | 4 | 4 | no | yes |
| 73 | `ProductMetadataMultiSelectField` | `src/features/products/components/form/ProductMetadataMultiSelectField.tsx` | 4 | 4 | no | yes |
| 74 | `PageLayoutSaveFooter` | `src/shared/ui/PageLayout.tsx` | 4 | 4 | no | yes |
| 75 | `StandardDataTablePanelGeneratedHeader` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 4 | 4 | no | yes |
| 76 | `TableDetailCard` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 11 | no | yes |
| 77 | `RuntimeEventLevelBadge` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx` | 3 | 6 | no | yes |
| 78 | `RunComparisonRowSummary` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx` | 3 | 5 | no | yes |
| 79 | `FilemakerEntityTableFilters` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 3 | 5 | no | yes |
| 80 | `DatabaseActionsRestoreItem` | `src/features/database/components/DatabaseColumns.tsx` | 3 | 4 | no | yes |
| 81 | `DatabaseActionsDeleteItem` | `src/features/database/components/DatabaseColumns.tsx` | 3 | 4 | no | yes |
| 82 | `JobRow` | `src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx` | 3 | 4 | no | yes |
| 83 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 3 | 4 | no | yes |
| 84 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar.tsx` | 3 | 3 | no | yes |
| 85 | `RuntimeEventLogActionButton` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 86 | `RuntimeEventLogCountBadge` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 87 | `CentralDocsSyncSummaryBadge` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 3 | 3 | no | yes |
| 88 | `ValidationMetaBadge` | `src/features/ai/ai-paths/components/validation/ValidationMetaBadge.tsx` | 3 | 3 | no | yes |
| 89 | `TableDetailCardActions` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 3 | no | yes |
| 90 | `FolderTreeSearchViewportSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 3 | 3 | no | yes |
| 91 | `KangurAdminCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 92 | `KangurAdminInsetCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 93 | `KangurCmsBuilderRightPanel` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx` | 3 | 3 | no | yes |
| 94 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 3 | 3 | no | yes |
| 95 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 3 | 3 | no | yes |
| 96 | `KangurDuelsWordmark` | `src/features/kangur/ui/components/KangurDuelsWordmark.tsx` | 3 | 3 | yes | yes |
| 97 | `KangurGrajmyWordmark` | `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx` | 3 | 3 | yes | yes |
| 98 | `KangurKangurWordmark` | `src/features/kangur/ui/components/KangurKangurWordmark.tsx` | 3 | 3 | yes | yes |
| 99 | `KangurLessonsWordmark` | `src/features/kangur/ui/components/KangurLessonsWordmark.tsx` | 3 | 3 | yes | yes |
| 100 | `KangurLocalizedPathWordmark` | `src/features/kangur/ui/components/KangurLocalizedPathWordmark.tsx` | 3 | 3 | yes | yes |
| 101 | `KangurParentDashboardWordmark` | `src/features/kangur/ui/components/KangurParentDashboardWordmark.tsx` | 3 | 3 | yes | yes |
| 102 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 103 | `KangurTestsWordmark` | `src/features/kangur/ui/components/KangurTestsWordmark.tsx` | 3 | 3 | yes | yes |
| 104 | `KangurTreningWordmark` | `src/features/kangur/ui/components/KangurTreningWordmark.tsx` | 3 | 3 | yes | yes |
| 105 | `KangurUnifiedLessonPanel` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 3 | 3 | yes | yes |
| 106 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 3 | 3 | no | yes |
| 107 | `PromptGenerationInitialResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 108 | `PromptGenerationFinalResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 109 | `AppModalDialogContentShell` | `src/shared/ui/app-modal.tsx` | 3 | 3 | no | yes |
| 110 | `ConfirmModalPasswordField` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 3 | 3 | no | yes |
| 111 | `AgenticAssignmentGame` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx` | 2 | 8 | no | yes |
| 112 | `AgenticDrawGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx` | 2 | 7 | no | yes |
| 113 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 2 | 7 | no | yes |
| 114 | `KangurTrainingSetupPanel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx` | 2 | 6 | no | yes |
| 115 | `AgenticSequenceGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sequence.tsx` | 2 | 5 | no | yes |
| 116 | `AgenticSortGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 2 | 5 | no | yes |
| 117 | `AgenticTrimGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 2 | 5 | no | yes |
| 118 | `LessonsLibraryIntroSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 2 | 5 | no | yes |
| 119 | `PortableEngineOutlineBadge` | `src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx` | 2 | 3 | yes | yes |
| 120 | `RuntimeEventKindBadge` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx` | 2 | 3 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 188 | `ProductListMobileCard` | `Checkbox` | 14 | 2 | `product -> onCheckedChange` | `src/features/products/components/list/ProductListMobileCards.tsx:218` |
| 2 | 188 | `ProductListMobileCard` | `DropdownMenuItem` | 14 | 2 | `product -> onSelect` | `src/features/products/components/list/ProductListMobileCards.tsx:267` |
| 3 | 182 | `ProductListMobileCard` | `ProductImageCell` | 14 | 1 | `product -> productName` | `src/features/products/components/list/ProductListMobileCards.tsx:225` |
| 4 | 182 | `ProductListMobileCard` | `CircleIconButton` | 14 | 1 | `product -> onClick` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 5 | 182 | `ProductListMobileCard` | `CircleIconButton` | 14 | 1 | `product -> onMouseEnter` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 6 | 182 | `ProductListMobileCard` | `CircleIconButton` | 14 | 1 | `product -> onFocus` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 7 | 182 | `ProductListMobileCard` | `BaseQuickExportButton` | 14 | 1 | `product -> prefetchListings` | `src/features/products/components/list/ProductListMobileCards.tsx:346` |
| 8 | 182 | `ProductListMobileCard` | `BaseQuickExportButton` | 14 | 1 | `product -> onOpenIntegrations` | `src/features/products/components/list/ProductListMobileCards.tsx:346` |
| 9 | 182 | `ProductListMobileCard` | `BaseQuickExportButton` | 14 | 1 | `product -> onOpenExportSettings` | `src/features/products/components/list/ProductListMobileCards.tsx:346` |
| 10 | 182 | `ProductListMobileCard` | `TriggerButtonBar` | 14 | 1 | `product -> entityId` | `src/features/products/components/list/ProductListMobileCards.tsx:355` |
| 11 | 182 | `ProductListMobileCard` | `TriggerButtonBar` | 14 | 1 | `product -> getEntityJson` | `src/features/products/components/list/ProductListMobileCards.tsx:355` |
| 12 | 182 | `ProductListMobileCard` | `TraderaStatusButton` | 14 | 1 | `product -> prefetchListings` | `src/features/products/components/list/ProductListMobileCards.tsx:369` |
| 13 | 182 | `ProductListMobileCard` | `TraderaStatusButton` | 14 | 1 | `product -> onOpenListings` | `src/features/products/components/list/ProductListMobileCards.tsx:369` |
| 14 | 174 | `ProductListMobileCard` | `BaseQuickExportButton` | 14 | 1 | `product -> product` | `src/features/products/components/list/ProductListMobileCards.tsx:346` |
| 15 | 118 | `TableDetailCard` | `CollapsibleSection` | 7 | 2 | `detail -> title` | `src/features/database/pages/DatabasePreviewPage.tsx:162` |
| 16 | 118 | `TableDetailCard` | `CollapsibleSection` | 7 | 2 | `detail -> actions` | `src/features/database/pages/DatabasePreviewPage.tsx:162` |
| 17 | 112 | `AgenticAssignmentGame` | `KangurStatusChip` | 7 | 1 | `theme -> accent` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:162` |
| 18 | 112 | `AgenticAssignmentGame` | `KangurGradientHeading` | 7 | 1 | `theme -> gradientClass` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:165` |
| 19 | 112 | `AgenticAssignmentGame` | `KangurLessonCallout` | 7 | 1 | `theme -> accent` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:169` |
| 20 | 112 | `AgenticAssignmentGame` | `KangurInfoCard` | 7 | 1 | `theme -> accent` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:180` |
| 21 | 112 | `AgenticAssignmentGame` | `KangurLessonCaption` | 7 | 1 | `theme -> className` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:194` |
| 22 | 112 | `AgenticAssignmentGame` | `KangurProgressBar` | 7 | 1 | `theme -> accent` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:204` |
| 23 | 112 | `AgenticAssignmentGame` | `KangurLessonInset` | 7 | 1 | `theme -> accent` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx:274` |
| 24 | 104 | `TableDetailCard` | `TableDetailCardTitle` | 7 | 1 | `detail -> detail` | `src/features/database/pages/DatabasePreviewPage.tsx:165` |
| 25 | 104 | `TableDetailCard` | `TableDetailCardActions` | 7 | 1 | `detail -> detail` | `src/features/database/pages/DatabasePreviewPage.tsx:167` |
| 26 | 104 | `TableDetailCard` | `ColumnsTab` | 7 | 1 | `detail -> detail` | `src/features/database/pages/DatabasePreviewPage.tsx:200` |
| 27 | 104 | `TableDetailCard` | `IndexesTab` | 7 | 1 | `detail -> detail` | `src/features/database/pages/DatabasePreviewPage.tsx:204` |
| 28 | 104 | `TableDetailCard` | `ForeignKeysTab` | 7 | 1 | `detail -> detail` | `src/features/database/pages/DatabasePreviewPage.tsx:208` |
| 29 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> timestamp` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 30 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> level` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 31 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> kind` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 32 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> message` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 33 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> trailingMetadata` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 34 | 102 | `RuntimeEventLogEventRow` | `RuntimeEventEntry` | 6 | 1 | `event -> inlinePrefix` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90` |
| 35 | 102 | `KangurMusicPianoRoll` | `KangurButton` | 6 | 1 | `stepTestIdPrefix -> data-testid` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1281` |
| 36 | 102 | `KangurMusicPianoRoll` | `KangurVisualCueContent` | 6 | 1 | `stepTestIdPrefix -> iconTestId` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1290` |
| 37 | 102 | `KangurMusicPianoRoll` | `KangurMusicWaveformIcon` | 6 | 1 | `stepTestIdPrefix -> data-testid` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1341` |
| 38 | 102 | `KangurMusicPianoRoll` | `KangurVisualCueContent` | 6 | 1 | `stepTestIdPrefix -> detailTestId` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1372` |
| 39 | 102 | `KangurMusicPianoRoll` | `KangurDialog` | 6 | 1 | `stepTestIdPrefix -> contentProps` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1640` |
| 40 | 102 | `KangurMusicPianoRoll` | `KangurVisualCueContent` | 6 | 1 | `stepTestIdPrefix -> detail` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1823` |
| 41 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> actions` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 42 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> media` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 43 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 44 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 45 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> onStart` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 46 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestedSelection` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 47 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionDescription` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 48 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionLabel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 49 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionTitle` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 50 | 90 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> className` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 51 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreePanel` | 4 | 2 | `isCatalogMode -> header` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:112` |
| 52 | 88 | `AdminKangurLessonsManagerTreePanel` | `Button` | 4 | 2 | `isCatalogMode -> className` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:132` |
| 53 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeSearchBar` | 4 | 2 | `isCatalogMode -> placeholder` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:306` |
| 54 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeViewportV2` | 4 | 2 | `isCatalogMode -> rootDropUi` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:334` |
| 55 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> description` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 56 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 57 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 58 | 88 | `Asset3DResourceCard` | `Tag` | 4 | 2 | `asset -> label` | `src/features/viewer3d/components/Asset3DCard.tsx:144` |
| 59 | 84 | `AdjectiveStudioScene` | `ToyShelfScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1320` |
| 60 | 84 | `AdjectiveStudioScene` | `StudyCornerScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1323` |
| 61 | 84 | `AdjectiveStudioScene` | `PortraitScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1326` |
| 62 | 84 | `AdjectiveStudioScene` | `PlaygroundScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1329` |
| 63 | 84 | `AdjectiveStudioScene` | `BedroomScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1331` |
| 64 | 82 | `ProductListMobileCard` | `CircleIconButton` | 4 | 1 | `prefetchListings -> onMouseEnter` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 65 | 82 | `ProductListMobileCard` | `CircleIconButton` | 4 | 1 | `prefetchListings -> onFocus` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 66 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> data` | `src/features/products/context/ProductListContext.tsx:262` |
| 67 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> queuedProductIds` | `src/features/products/context/ProductListContext.tsx:262` |
| 68 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> productAiRunStatusByProductId` | `src/features/products/context/ProductListContext.tsx:262` |
| 69 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> triggerListingStatusHighlight` | `src/features/products/context/ProductListContext.tsx:262` |
| 70 | 78 | `RunComparisonRowSummary` | `StatusBadge` | 3 | 2 | `row -> status` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:257` |
| 71 | 78 | `RunComparisonRowSummary` | `StatusBadge` | 3 | 2 | `row -> variant` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:257` |
| 72 | 78 | `RuntimeEventLevelBadge` | `StatusBadge` | 3 | 2 | `hideLabel -> status` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx:56` |
| 73 | 78 | `RuntimeEventLevelBadge` | `StatusBadge` | 3 | 2 | `hideLabel -> variant` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx:56` |
| 74 | 78 | `Asset3DResourceCard` | `ResourceCard` | 3 | 2 | `isDeleting -> actions` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 75 | 78 | `Asset3DResourceCard` | `Button` | 3 | 2 | `isDeleting -> disabled` | `src/features/viewer3d/components/Asset3DCard.tsx:70` |
| 76 | 78 | `Asset3DResourceCard` | `Button` | 3 | 2 | `isDeleting -> loading` | `src/features/viewer3d/components/Asset3DCard.tsx:70` |
| 77 | 74 | `AgenticDrawGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx:105` |
| 78 | 74 | `AgenticDrawGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx:121` |
| 79 | 74 | `AgenticDrawGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx:123` |
| 80 | 74 | `AgenticDrawGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx:135` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> kind -> status` |
| 2 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> kind -> variant` |
| 3 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> level -> status` |
| 4 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> level -> variant` |
| 5 | 191 | 5 | `CmsDomainSelector` | `SelectTrigger` | 1 | 2 | `triggerClassName -> triggerClassName -> triggerClassName -> triggerClassName -> className` |
| 6 | 191 | 5 | `Asset3DCard` | `Badge` | 1 | 2 | `asset -> asset -> label -> label -> removeLabel` |
| 7 | 185 | 5 | `DetailModal` | `RadixOverlayContentShell` | 1 | 1 | `contentClassName -> contentClassName -> modalContentClassName -> className -> contentProps` |
| 8 | 162 | 4 | `FilemakerEntityTableFilters` | `Button` | 2 | 2 | `onQueryChange -> onClear -> onClear -> onClick` |
| 9 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `title -> emptyState -> emptyState -> emptyState` |
| 10 | 162 | 4 | `AnalyticsEventsTable` | `SectionHeader` | 2 | 2 | `title -> title -> title -> title` |
| 11 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyTitle -> emptyState -> emptyState -> emptyState` |
| 12 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyDescription -> emptyState -> emptyState -> emptyState` |
| 13 | 156 | 4 | `PromptGenerationModelPanel` | `SelectTrigger` | 2 | 1 | `modelSelectId -> id -> id -> id` |
| 14 | 152 | 4 | `DatabaseCollectionTypeField` | `Select` | 1 | 2 | `onValueChange -> onValueChange -> onValueChange -> onValueChange` |
| 15 | 152 | 4 | `CmsDomainSelectorControl` | `Select` | 1 | 2 | `handleChange -> onValueChange -> onValueChange -> onValueChange` |
| 16 | 152 | 4 | `CmsDomainSelectorControl` | `Select` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 17 | 152 | 4 | `CmsDomainSelectorControl` | `SelectItem` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 18 | 152 | 4 | `CmsDomainSelector` | `SelectSimpleControl` | 1 | 2 | `triggerClassName -> triggerClassName -> triggerClassName -> triggerClassName` |
| 19 | 152 | 4 | `FilemakerEntityTableFilters` | `Input` | 1 | 2 | `query -> value -> value -> value` |
| 20 | 152 | 4 | `Asset3DCard` | `TagBadge` | 1 | 2 | `asset -> asset -> label -> label` |
| 21 | 152 | 4 | `AnalyticsEventsTable` | `SectionHeader` | 1 | 2 | `showTypeColumn -> title -> title -> title` |
| 22 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 23 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 24 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 25 | 149 | 3 | `TableDetailCard` | `Button` | 7 | 2 | `detail -> detail -> onClick` |
| 26 | 146 | 4 | `KangurDuelsWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 27 | 146 | 4 | `LessonsLibrarySkeleton` | `KangurLocalizedPathWordmark` | 1 | 1 | `lessonsTitle -> lessonsTitle -> label -> label` |
| 28 | 146 | 4 | `LessonsLibrarySkeleton` | `KangurLocalizedPathWordmark` | 1 | 1 | `locale -> locale -> locale -> locale` |
| 29 | 146 | 4 | `KangurParentDashboardWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 30 | 146 | 4 | `KangurTestsWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 31 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `title -> title -> title -> title` |
| 32 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `description -> description -> description -> description` |
| 33 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `eyebrow -> eyebrow -> eyebrow -> eyebrow` |
| 34 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `icon -> icon -> icon -> icon` |
| 35 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> headerActions -> actions` |
| 36 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `refresh -> refresh -> refresh -> refresh` |
| 37 | 146 | 4 | `PageLayout` | `TabsList` | 1 | 1 | `tabs -> tabs -> tabs -> style` |
| 38 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `onSave -> onSave -> onSave -> onSave` |
| 39 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `isSaving -> isSaving -> isSaving -> isSaving` |
| 40 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `saveText -> saveText -> saveText -> saveText` |
| 41 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `stickyFooter -> stickyFooter -> stickyFooter -> className` |
| 42 | 146 | 4 | `PromptGenerationModelPanel` | `Select` | 1 | 1 | `onModelChange -> onValueChange -> onValueChange -> onValueChange` |
| 43 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `onOpenChange -> onClose -> onClose -> onClick` |
| 44 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `onCancel -> onClose -> onClose -> onClick` |
| 45 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `variant -> isDangerous -> isDangerous -> variant` |
| 46 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `loading -> loading -> loading -> disabled` |
| 47 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `loading -> loading -> loading -> loading` |
| 48 | 146 | 4 | `ConfirmDialog` | `Input` | 1 | 1 | `loading -> loading -> loading -> disabled` |
| 49 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `title -> title -> title -> title` |
| 50 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `subtitle -> subtitle -> subtitle -> subtitle` |
| 51 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> headerActions -> actions` |
| 52 | 146 | 4 | `DetailModal` | `DialogContent` | 1 | 1 | `contentClassName -> contentClassName -> modalContentClassName -> className` |
| 53 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `showClose -> showClose -> showClose -> actions` |
| 54 | 133 | 3 | `RuntimeEventLogEventRow` | `RuntimeEventKindBadge` | 6 | 1 | `event -> kind -> kind` |
| 55 | 133 | 3 | `RuntimeEventLogEventRow` | `RuntimeEventLevelBadge` | 6 | 1 | `event -> level -> level` |
| 56 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 57 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 58 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 59 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 60 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 61 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 62 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 63 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 64 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 65 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 66 | 109 | 3 | `RunComparisonRowSummary` | `Button` | 3 | 2 | `row -> onClick -> onClick` |
| 67 | 109 | 3 | `DatabaseActionsCell` | `DropdownMenuItem` | 3 | 2 | `backup -> backup -> onClick` |
| 68 | 109 | 3 | `DatabaseActionsCell` | `DropdownMenuItem` | 3 | 2 | `backup -> backup -> onClick` |
| 69 | 109 | 3 | `DatabaseActionsCell` | `DropdownMenuItem` | 3 | 2 | `backup -> backup -> onClick` |
| 70 | 99 | 3 | `CentralDocsSyncCandidateCard` | `Button` | 2 | 2 | `rule -> onClick -> onClick` |
| 71 | 99 | 3 | `TableDetailCard` | `Button` | 2 | 2 | `onQueryTable -> onQueryTable -> onClick` |
| 72 | 99 | 3 | `TableDetailCard` | `Button` | 2 | 2 | `onManageTable -> onManageTable -> onClick` |
| 73 | 99 | 3 | `FilemakerEntityTableFilters` | `SearchInputContent` | 2 | 2 | `onQueryChange -> onClear -> onClear` |
| 74 | 99 | 3 | `AnalyticsEventsTable` | `StandardDataTablePanelRender` | 2 | 2 | `title -> emptyState -> emptyState` |
| 75 | 99 | 3 | `AnalyticsEventsTable` | `StandardDataTablePanelGeneratedHeader` | 2 | 2 | `title -> title -> title` |
| 76 | 99 | 3 | `AnalyticsEventsTable` | `StandardDataTablePanelRender` | 2 | 2 | `emptyTitle -> emptyState -> emptyState` |
| 77 | 99 | 3 | `AnalyticsEventsTable` | `StandardDataTablePanelRender` | 2 | 2 | `emptyDescription -> emptyState -> emptyState` |
| 78 | 93 | 3 | `KangurCmsBuilderInner` | `KangurThemePreviewPanel` | 2 | 1 | `themePreviewMode -> themePreviewMode -> mode` |
| 79 | 93 | 3 | `KangurCmsBuilderInner` | `KangurThemePreviewPanel` | 2 | 1 | `themePreviewMode -> themePreviewTheme -> theme` |
| 80 | 93 | 3 | `PromptGenerationModelPanel` | `SelectSimpleControl` | 2 | 1 | `modelSelectId -> id -> id` |

## Top Chain Details (Depth >= 3)

### 1. RuntimeEventLogEventRow -> StatusBadge

- Score: 202
- Depth: 4
- Root fanout: 6
- Prop path: event -> kind -> kind -> status
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `RuntimeEventKindBadge` (src/features/ai/ai-paths/components/runtime-event-badges.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `kind` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `RuntimeEventKindBadge`: `kind` -> `kind` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:56
  - `RuntimeEventKindBadge` -> `StatusBadge`: `kind` -> `status` at src/features/ai/ai-paths/components/runtime-event-badges.tsx:71

### 2. RuntimeEventLogEventRow -> StatusBadge

- Score: 202
- Depth: 4
- Root fanout: 6
- Prop path: event -> kind -> kind -> variant
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `RuntimeEventKindBadge` (src/features/ai/ai-paths/components/runtime-event-badges.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `kind` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `RuntimeEventKindBadge`: `kind` -> `kind` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:56
  - `RuntimeEventKindBadge` -> `StatusBadge`: `kind` -> `variant` at src/features/ai/ai-paths/components/runtime-event-badges.tsx:71

### 3. RuntimeEventLogEventRow -> StatusBadge

- Score: 202
- Depth: 4
- Root fanout: 6
- Prop path: event -> level -> level -> status
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `RuntimeEventLevelBadge` (src/features/ai/ai-paths/components/runtime-event-badges.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `level` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `RuntimeEventLevelBadge`: `level` -> `level` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:51
  - `RuntimeEventLevelBadge` -> `StatusBadge`: `level` -> `status` at src/features/ai/ai-paths/components/runtime-event-badges.tsx:56

### 4. RuntimeEventLogEventRow -> StatusBadge

- Score: 202
- Depth: 4
- Root fanout: 6
- Prop path: event -> level -> level -> variant
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `RuntimeEventLevelBadge` (src/features/ai/ai-paths/components/runtime-event-badges.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `level` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `RuntimeEventLevelBadge`: `level` -> `level` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:51
  - `RuntimeEventLevelBadge` -> `StatusBadge`: `level` -> `variant` at src/features/ai/ai-paths/components/runtime-event-badges.tsx:56

### 5. CmsDomainSelector -> SelectTrigger

- Score: 191
- Depth: 5
- Root fanout: 1
- Prop path: triggerClassName -> triggerClassName -> triggerClassName -> triggerClassName -> className
- Component path:
  - `CmsDomainSelector` (src/features/cms/components/CmsDomainSelector.tsx)
  - `CmsDomainSelectorControl` (src/features/cms/components/CmsDomainSelector.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
  - `SelectSimpleControl` (src/shared/ui/select-simple.tsx)
  - `SelectTrigger` (src/shared/ui/select.tsx)
- Transition lines:
  - `CmsDomainSelector` -> `CmsDomainSelectorControl`: `triggerClassName` -> `triggerClassName` at src/features/cms/components/CmsDomainSelector.tsx:108
  - `CmsDomainSelectorControl` -> `SelectSimple`: `triggerClassName` -> `triggerClassName` at src/features/cms/components/CmsDomainSelector.tsx:32
  - `SelectSimple` -> `SelectSimpleControl`: `triggerClassName` -> `triggerClassName` at src/shared/ui/select-simple.tsx:230
  - `SelectSimpleControl` -> `SelectTrigger`: `triggerClassName` -> `className` at src/shared/ui/select-simple.tsx:104

### 6. Asset3DCard -> Badge

- Score: 191
- Depth: 5
- Root fanout: 1
- Prop path: asset -> asset -> label -> label -> removeLabel
- Component path:
  - `Asset3DCard` (src/features/viewer3d/components/Asset3DCard.tsx)
  - `Asset3DResourceCard` (src/features/viewer3d/components/Asset3DCard.tsx)
  - `Tag` (src/shared/ui/tag.tsx)
  - `TagBadge` (src/shared/ui/tag.tsx)
  - `Badge` (src/shared/ui/badge.tsx)
- Transition lines:
  - `Asset3DCard` -> `Asset3DResourceCard`: `asset` -> `asset` at src/features/viewer3d/components/Asset3DCard.tsx:175
  - `Asset3DResourceCard` -> `Tag`: `asset` -> `label` at src/features/viewer3d/components/Asset3DCard.tsx:144
  - `Tag` -> `TagBadge`: `label` -> `label` at src/shared/ui/tag.tsx:71
  - `TagBadge` -> `Badge`: `label` -> `removeLabel` at src/shared/ui/tag.tsx:36

### 7. DetailModal -> RadixOverlayContentShell

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: contentClassName -> contentClassName -> modalContentClassName -> className -> contentProps
- Component path:
  - `DetailModal` (src/shared/ui/templates/modals/DetailModal.tsx)
  - `AppModal` (src/shared/ui/app-modal.tsx)
  - `AppModalDialogContentShell` (src/shared/ui/app-modal.tsx)
  - `DialogContent` (src/shared/ui/dialog.tsx)
  - `RadixOverlayContentShell` (src/shared/ui/radix-overlay-content-shell.tsx)
- Transition lines:
  - `DetailModal` -> `AppModal`: `contentClassName` -> `contentClassName` at src/shared/ui/templates/modals/DetailModal.tsx:56
  - `AppModal` -> `AppModalDialogContentShell`: `contentClassName` -> `modalContentClassName` at src/shared/ui/app-modal.tsx:198
  - `AppModalDialogContentShell` -> `DialogContent`: `modalContentClassName` -> `className` at src/shared/ui/app-modal.tsx:101
  - `DialogContent` -> `RadixOverlayContentShell`: `className` -> `contentProps` at src/shared/ui/dialog.tsx:39

### 8. FilemakerEntityTableFilters -> Button

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: onQueryChange -> onClear -> onClear -> onClick
- Component path:
  - `FilemakerEntityTableFilters` (src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx)
  - `SearchInput` (src/shared/ui/search-input.tsx)
  - `SearchInputContent` (src/shared/ui/search-input.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `FilemakerEntityTableFilters` -> `SearchInput`: `onQueryChange` -> `onClear` at src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx:48
  - `SearchInput` -> `SearchInputContent`: `onClear` -> `onClear` at src/shared/ui/search-input.tsx:107
  - `SearchInputContent` -> `Button`: `onClear` -> `onClick` at src/shared/ui/search-input.tsx:77

### 9. AnalyticsEventsTable -> ListPanel

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: title -> emptyState -> emptyState -> emptyState
- Component path:
  - `AnalyticsEventsTable` (src/shared/lib/analytics/components/AnalyticsEventsTable.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `StandardDataTablePanelRender` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
- Transition lines:
  - `AnalyticsEventsTable` -> `StandardDataTablePanel`: `title` -> `emptyState` at src/shared/lib/analytics/components/AnalyticsEventsTable.tsx:426
  - `StandardDataTablePanel` -> `StandardDataTablePanelRender`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:301
  - `StandardDataTablePanelRender` -> `ListPanel`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:167

### 10. AnalyticsEventsTable -> SectionHeader

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: title -> title -> title -> title
- Component path:
  - `AnalyticsEventsTable` (src/shared/lib/analytics/components/AnalyticsEventsTable.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `StandardDataTablePanelGeneratedHeader` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `SectionHeader` (src/shared/ui/section-header.tsx)
- Transition lines:
  - `AnalyticsEventsTable` -> `StandardDataTablePanel`: `title` -> `title` at src/shared/lib/analytics/components/AnalyticsEventsTable.tsx:426
  - `StandardDataTablePanel` -> `StandardDataTablePanelGeneratedHeader`: `title` -> `title` at src/shared/ui/templates/StandardDataTablePanel.tsx:269
  - `StandardDataTablePanelGeneratedHeader` -> `SectionHeader`: `title` -> `title` at src/shared/ui/templates/StandardDataTablePanel.tsx:102

### 11. AnalyticsEventsTable -> ListPanel

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: emptyTitle -> emptyState -> emptyState -> emptyState
- Component path:
  - `AnalyticsEventsTable` (src/shared/lib/analytics/components/AnalyticsEventsTable.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `StandardDataTablePanelRender` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
- Transition lines:
  - `AnalyticsEventsTable` -> `StandardDataTablePanel`: `emptyTitle` -> `emptyState` at src/shared/lib/analytics/components/AnalyticsEventsTable.tsx:426
  - `StandardDataTablePanel` -> `StandardDataTablePanelRender`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:301
  - `StandardDataTablePanelRender` -> `ListPanel`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:167

### 12. AnalyticsEventsTable -> ListPanel

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: emptyDescription -> emptyState -> emptyState -> emptyState
- Component path:
  - `AnalyticsEventsTable` (src/shared/lib/analytics/components/AnalyticsEventsTable.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `StandardDataTablePanelRender` (src/shared/ui/templates/StandardDataTablePanel.tsx)
  - `ListPanel` (src/shared/ui/list-panel.tsx)
- Transition lines:
  - `AnalyticsEventsTable` -> `StandardDataTablePanel`: `emptyDescription` -> `emptyState` at src/shared/lib/analytics/components/AnalyticsEventsTable.tsx:426
  - `StandardDataTablePanel` -> `StandardDataTablePanelRender`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:301
  - `StandardDataTablePanelRender` -> `ListPanel`: `emptyState` -> `emptyState` at src/shared/ui/templates/StandardDataTablePanel.tsx:167

### 13. PromptGenerationModelPanel -> SelectTrigger

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: modelSelectId -> id -> id -> id
- Component path:
  - `PromptGenerationModelPanel` (src/shared/ui/PromptGenerationSection.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
  - `SelectSimpleControl` (src/shared/ui/select-simple.tsx)
  - `SelectTrigger` (src/shared/ui/select.tsx)
- Transition lines:
  - `PromptGenerationModelPanel` -> `SelectSimple`: `modelSelectId` -> `id` at src/shared/ui/PromptGenerationSection.tsx:181
  - `SelectSimple` -> `SelectSimpleControl`: `id` -> `id` at src/shared/ui/select-simple.tsx:230
  - `SelectSimpleControl` -> `SelectTrigger`: `id` -> `id` at src/shared/ui/select-simple.tsx:104

### 14. DatabaseCollectionTypeField -> Select

- Score: 152
- Depth: 4
- Root fanout: 1
- Prop path: onValueChange -> onValueChange -> onValueChange -> onValueChange
- Component path:
  - `DatabaseCollectionTypeField` (src/features/ai/ai-paths/components/node-config/database/DatabaseSettingsTab.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
  - `SelectSimpleControl` (src/shared/ui/select-simple.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `DatabaseCollectionTypeField` -> `SelectSimple`: `onValueChange` -> `onValueChange` at src/features/ai/ai-paths/components/node-config/database/DatabaseSettingsTab.tsx:102
  - `SelectSimple` -> `SelectSimpleControl`: `onValueChange` -> `onValueChange` at src/shared/ui/select-simple.tsx:230
  - `SelectSimpleControl` -> `Select`: `onValueChange` -> `onValueChange` at src/shared/ui/select-simple.tsx:103

### 15. CmsDomainSelectorControl -> Select

- Score: 152
- Depth: 4
- Root fanout: 1
- Prop path: handleChange -> onValueChange -> onValueChange -> onValueChange
- Component path:
  - `CmsDomainSelectorControl` (src/features/cms/components/CmsDomainSelector.tsx)
  - `SelectSimple` (src/shared/ui/select-simple.tsx)
  - `SelectSimpleControl` (src/shared/ui/select-simple.tsx)
  - `Select` (src/shared/ui/select.tsx)
- Transition lines:
  - `CmsDomainSelectorControl` -> `SelectSimple`: `handleChange` -> `onValueChange` at src/features/cms/components/CmsDomainSelector.tsx:32
  - `SelectSimple` -> `SelectSimpleControl`: `onValueChange` -> `onValueChange` at src/shared/ui/select-simple.tsx:230
  - `SelectSimpleControl` -> `Select`: `onValueChange` -> `onValueChange` at src/shared/ui/select-simple.tsx:103

## Top Transition Details (Depth = 2)

### 1. ProductListMobileCard -> Checkbox

- Score: 188
- Root fanout: 14
- Prop mapping: product -> onCheckedChange
- Location: src/features/products/components/list/ProductListMobileCards.tsx:218

### 2. ProductListMobileCard -> DropdownMenuItem

- Score: 188
- Root fanout: 14
- Prop mapping: product -> onSelect
- Location: src/features/products/components/list/ProductListMobileCards.tsx:267

### 3. ProductListMobileCard -> ProductImageCell

- Score: 182
- Root fanout: 14
- Prop mapping: product -> productName
- Location: src/features/products/components/list/ProductListMobileCards.tsx:225

### 4. ProductListMobileCard -> CircleIconButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onClick
- Location: src/features/products/components/list/ProductListMobileCards.tsx:331

### 5. ProductListMobileCard -> CircleIconButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onMouseEnter
- Location: src/features/products/components/list/ProductListMobileCards.tsx:331

### 6. ProductListMobileCard -> CircleIconButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onFocus
- Location: src/features/products/components/list/ProductListMobileCards.tsx:331

### 7. ProductListMobileCard -> BaseQuickExportButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> prefetchListings
- Location: src/features/products/components/list/ProductListMobileCards.tsx:346

### 8. ProductListMobileCard -> BaseQuickExportButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onOpenIntegrations
- Location: src/features/products/components/list/ProductListMobileCards.tsx:346

### 9. ProductListMobileCard -> BaseQuickExportButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onOpenExportSettings
- Location: src/features/products/components/list/ProductListMobileCards.tsx:346

### 10. ProductListMobileCard -> TriggerButtonBar

- Score: 182
- Root fanout: 14
- Prop mapping: product -> entityId
- Location: src/features/products/components/list/ProductListMobileCards.tsx:355

### 11. ProductListMobileCard -> TriggerButtonBar

- Score: 182
- Root fanout: 14
- Prop mapping: product -> getEntityJson
- Location: src/features/products/components/list/ProductListMobileCards.tsx:355

### 12. ProductListMobileCard -> TraderaStatusButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> prefetchListings
- Location: src/features/products/components/list/ProductListMobileCards.tsx:369

### 13. ProductListMobileCard -> TraderaStatusButton

- Score: 182
- Root fanout: 14
- Prop mapping: product -> onOpenListings
- Location: src/features/products/components/list/ProductListMobileCards.tsx:369

### 14. ProductListMobileCard -> BaseQuickExportButton

- Score: 174
- Root fanout: 14
- Prop mapping: product -> product
- Location: src/features/products/components/list/ProductListMobileCards.tsx:346

### 15. TableDetailCard -> CollapsibleSection

- Score: 118
- Root fanout: 7
- Prop mapping: detail -> title
- Location: src/features/database/pages/DatabasePreviewPage.tsx:162

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
