---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-26T20:30:52.748Z

## Snapshot

- Scanned source files: 5867
- JSX files scanned: 2139
- Components detected: 3580
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 205
- Resolved forwarded transitions: 933
- Candidate chains (depth >= 2): 933
- Candidate chains (depth >= 3): 109
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 115 |
| `shared-ui` | 35 |
| `feature:ai` | 25 |
| `feature:database` | 7 |
| `feature:cms` | 6 |
| `feature:products` | 5 |
| `feature:foldertree` | 2 |
| `feature:integrations` | 2 |
| `feature:observability` | 2 |
| `shared-lib` | 1 |
| `feature:filemaker` | 1 |
| `feature:viewer3d` | 1 |
| `app` | 1 |
| `feature:notesapp` | 1 |
| `feature:admin` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `AdminKangurLessonsManagerTreePanel` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx` | 30 | 51 | no | yes |
| 2 | `KangurDrawingPracticeBoard` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard.tsx` | 28 | 29 | no | yes |
| 3 | `KangurDrawingUtilityActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx` | 21 | 26 | no | yes |
| 4 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 19 | 22 | no | yes |
| 5 | `KangurDrawingFreeformToolbar` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx` | 15 | 17 | no | yes |
| 6 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 14 | 14 | no | yes |
| 7 | `SelectSimple` | `src/shared/ui/select-simple.tsx` | 13 | 14 | no | yes |
| 8 | `KangurTracingBoard` | `src/features/kangur/ui/components/drawing-engine/KangurTracingBoard.tsx` | 12 | 12 | no | yes |
| 9 | `FilterPanelMainFilters` | `src/shared/ui/templates/FilterPanel.tsx` | 12 | 12 | no | yes |
| 10 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 11 | 16 | no | yes |
| 11 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 11 | 15 | no | yes |
| 12 | `KangurResultsWidgetContent` | `src/features/kangur/ui/components/KangurResultsWidgetContent.tsx` | 11 | 12 | no | yes |
| 13 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 11 | 11 | no | yes |
| 14 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 15 | `RotationOptionCard` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.visuals.tsx` | 10 | 13 | no | yes |
| 16 | `KangurDrawingHistoryActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx` | 10 | 10 | no | yes |
| 17 | `ConfirmDialog` | `src/shared/ui/confirm-dialog.tsx` | 10 | 10 | no | yes |
| 18 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no | yes |
| 19 | `FormModalHeaderContent` | `src/shared/ui/FormModal.tsx` | 9 | 9 | no | yes |
| 20 | `AppModal` | `src/shared/ui/app-modal.tsx` | 9 | 9 | no | yes |
| 21 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no | yes |
| 22 | `ClockTrainingStageGame` | `src/features/kangur/ui/components/ClockTrainingStageGame.tsx` | 8 | 12 | no | yes |
| 23 | `AnalyticsEventsTable` | `src/shared/lib/analytics/components/AnalyticsEventsTable.tsx` | 8 | 11 | no | yes |
| 24 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/KangurAssignmentManagerTimeLimitModal.tsx` | 8 | 10 | no | yes |
| 25 | `KangurDrawingSnapshotActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions.tsx` | 8 | 9 | no | yes |
| 26 | `DetailModal` | `src/shared/ui/templates/modals/DetailModal.tsx` | 8 | 9 | no | yes |
| 27 | `KangurGameSetupStage` | `src/features/kangur/ui/components/KangurGameSetupStage.tsx` | 8 | 8 | no | yes |
| 28 | `KangurDrawingActionRow` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow.tsx` | 8 | 8 | no | yes |
| 29 | `SearchableSelect` | `src/shared/ui/searchable-select.tsx` | 8 | 8 | no | yes |
| 30 | `VectorToolbarActionButtons` | `src/shared/ui/vector-canvas.rendering.tsx` | 8 | 8 | no | yes |
| 31 | `ActionMenu` | `src/shared/ui/ActionMenu.tsx` | 7 | 9 | no | yes |
| 32 | `SelectModal` | `src/shared/ui/templates/modals/SelectModal.tsx` | 7 | 8 | no | yes |
| 33 | `Tag` | `src/shared/ui/tag.tsx` | 6 | 8 | no | yes |
| 34 | `ConfirmModal` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 6 | 8 | no | yes |
| 35 | `KangurUnifiedLessonBase` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 6 | 7 | no | yes |
| 36 | `RuntimeEventEntry` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx` | 5 | 9 | no | yes |
| 37 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 5 | 7 | no | yes |
| 38 | `AttachSlugFormModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 5 | 6 | no | yes |
| 39 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 40 | `PromptGenerationOutputPromptPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 5 | 6 | no | yes |
| 41 | `JobQueueJsonField` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 5 | 5 | no | yes |
| 42 | `KangurAdminWorkspaceIntroCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceIntroCard.tsx` | 5 | 5 | no | yes |
| 43 | `KangurAdminWorkspaceSectionCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceSectionCard.tsx` | 5 | 5 | no | yes |
| 44 | `KangurGameQuizStage` | `src/features/kangur/ui/components/KangurGameQuizStage.tsx` | 5 | 5 | no | yes |
| 45 | `SkeletonGlassPanel` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 5 | 5 | no | yes |
| 46 | `RefreshButton` | `src/shared/ui/RefreshButton.tsx` | 5 | 5 | no | yes |
| 47 | `SearchInput` | `src/shared/ui/search-input.tsx` | 5 | 5 | no | yes |
| 48 | `ProductListMobileCard` | `src/features/products/components/list/ProductListMobileCards.tsx` | 4 | 20 | no | yes |
| 49 | `TreeSectionPicker` | `src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx` | 4 | 6 | no | yes |
| 50 | `AdminKangurSocialSettingsModal` | `src/features/kangur/admin/admin-kangur-social/AdminKangurSocialSettingsModal.tsx` | 4 | 6 | no | yes |
| 51 | `JobQueueJsonTextarea` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 4 | 5 | no | yes |
| 52 | `CentralDocsSyncCandidateCard` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 4 | 5 | no | yes |
| 53 | `SocialPostImagesPanel` | `src/features/kangur/admin/admin-kangur-social/SocialPost.ImagesPanel.tsx` | 4 | 5 | no | yes |
| 54 | `PromptGenerationInputPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 55 | `PromptGenerationModelPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 56 | `PromptGenerationOutputToggle` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 57 | `FolderTreeSearchViewportTree` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 4 | 4 | no | yes |
| 58 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 4 | 4 | no | yes |
| 59 | `KangurDialogHeader` | `src/features/kangur/ui/components/KangurDialogHeader.tsx` | 4 | 4 | no | yes |
| 60 | `SkeletonInfoSurface` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 4 | 4 | no | yes |
| 61 | `KangurTracingLessonFooter` | `src/features/kangur/ui/components/drawing-engine/KangurTracingLessonFooter.tsx` | 4 | 4 | no | yes |
| 62 | `ProductMetadataMultiSelectField` | `src/features/products/components/form/ProductMetadataMultiSelectField.tsx` | 4 | 4 | no | yes |
| 63 | `TableDetailCard` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 11 | no | yes |
| 64 | `GamesLibraryGameModal` | `src/features/kangur/ui/pages/GamesLibraryGameModal.tsx` | 3 | 6 | no | yes |
| 65 | `RunComparisonRowSummary` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx` | 3 | 5 | no | yes |
| 66 | `FilemakerEntityTableFilters` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 3 | 5 | no | yes |
| 67 | `JobRow` | `src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx` | 3 | 4 | no | yes |
| 68 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 3 | 4 | no | yes |
| 69 | `PointerDropZone` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 3 | 4 | no | yes |
| 70 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar.tsx` | 3 | 3 | no | yes |
| 71 | `RuntimeEventLogActionButton` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 72 | `RuntimeEventLogCountBadge` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 73 | `CentralDocsSyncSummaryBadge` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 3 | 3 | no | yes |
| 74 | `ValidationMetaBadge` | `src/features/ai/ai-paths/components/validation/ValidationMetaBadge.tsx` | 3 | 3 | no | yes |
| 75 | `TableDetailCardActions` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 3 | no | yes |
| 76 | `FolderTreeSearchViewportSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 3 | 3 | no | yes |
| 77 | `KangurAdminCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 78 | `KangurAdminInsetCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 79 | `KangurCmsBuilderRightPanel` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx` | 3 | 3 | no | yes |
| 80 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 3 | 3 | no | yes |
| 81 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 3 | 3 | no | yes |
| 82 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 3 | 3 | no | yes |
| 83 | `KangurElevatedUserMenu` | `src/features/kangur/ui/components/KangurElevatedUserMenu.tsx` | 3 | 3 | no | yes |
| 84 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 85 | `KangurUnifiedLessonPanel` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 3 | 3 | yes | yes |
| 86 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 3 | 3 | no | yes |
| 87 | `PromptGenerationInitialResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 88 | `PromptGenerationFinalResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 89 | `Asset3DCard` | `src/features/viewer3d/components/Asset3DCard.tsx` | 2 | 9 | no | yes |
| 90 | `AgenticAssignmentGame` | `src/features/kangur/ui/components/AgenticAssignmentGame.tsx` | 2 | 8 | no | yes |
| 91 | `AgenticDrawGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.draw.tsx` | 2 | 7 | no | yes |
| 92 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 2 | 7 | no | yes |
| 93 | `KangurTrainingSetupPanel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx` | 2 | 6 | no | yes |
| 94 | `AgenticSequenceGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sequence.tsx` | 2 | 5 | no | yes |
| 95 | `AgenticSortGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 2 | 5 | no | yes |
| 96 | `AgenticTrimGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 2 | 5 | no | yes |
| 97 | `CompleteEquation` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 2 | 4 | no | yes |
| 98 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 99 | `CategoryMapperNameCell` | `src/features/integrations/components/marketplaces/category-mapper/category-table/CategoryMapperNameCell.tsx` | 2 | 3 | no | yes |
| 100 | `SocialPostEditorModal` | `src/features/kangur/admin/admin-kangur-social/SocialPost.EditorModal.tsx` | 2 | 3 | no | yes |
| 101 | `CalendarInteractiveStageGame` | `src/features/kangur/ui/components/CalendarInteractiveStageGame.tsx` | 2 | 3 | no | yes |
| 102 | `BedroomScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 3 | no | yes |
| 103 | `ToyShelfScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 3 | no | yes |
| 104 | `StudyCornerScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 3 | no | yes |
| 105 | `PortraitScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 3 | no | yes |
| 106 | `PlaygroundScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 3 | no | yes |
| 107 | `KangurLessonLibraryCardAside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx` | 2 | 3 | no | yes |
| 108 | `LessonsLibrarySkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 2 | 3 | no | yes |
| 109 | `SystemLogDetailsContent` | `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` | 2 | 3 | no | yes |
| 110 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 111 | `VectorToolbarToolButtons` | `src/shared/ui/vector-canvas.rendering.tsx` | 2 | 3 | no | yes |
| 112 | `Error` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 113 | `FrontendPublicOwnerShellClient` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx` | 2 | 2 | no | yes |
| 114 | `KangurCheckButton` | `src/features/kangur/ui/components/KangurCheckButton.tsx` | 2 | 2 | yes | yes |
| 115 | `KangurUnifiedLessonSubsection` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 2 | 2 | yes | yes |
| 116 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 117 | `RuntimeEventLogEventRow` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 1 | 6 | no | yes |
| 118 | `KangurConfigurableLaunchableGameScreen` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx` | 1 | 6 | no | yes |
| 119 | `AdjectiveStudioScene` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 1 | 5 | no | yes |
| 120 | `ProductListProvider` | `src/features/products/context/ProductListContext.tsx` | 1 | 4 | no | yes |

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
| 41 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> accent` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 42 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> description` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 43 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> icon` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 44 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> screen` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 45 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> shellTestId` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 46 | 102 | `KangurConfigurableLaunchableGameScreen` | `KangurGameQuizStage` | 6 | 1 | `runtime -> title` | `src/features/kangur/ui/pages/Game.launchable-screens.tsx:149` |
| 47 | 98 | `Asset3DCard` | `ResourceCard` | 5 | 2 | `className -> actions` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 48 | 98 | `Asset3DCard` | `ResourceCard` | 5 | 2 | `className -> media` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 49 | 98 | `Asset3DCard` | `ResourceCard` | 5 | 2 | `className -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 50 | 98 | `Asset3DCard` | `ResourceCard` | 5 | 2 | `className -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 51 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> onStart` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 52 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestedSelection` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 53 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionDescription` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 54 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionLabel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 55 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionTitle` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 56 | 90 | `Asset3DCard` | `ResourceCard` | 5 | 2 | `className -> className` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 57 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreePanel` | 4 | 2 | `isCatalogMode -> header` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:112` |
| 58 | 88 | `AdminKangurLessonsManagerTreePanel` | `Button` | 4 | 2 | `isCatalogMode -> className` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:132` |
| 59 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeSearchBar` | 4 | 2 | `isCatalogMode -> placeholder` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:306` |
| 60 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeViewportV2` | 4 | 2 | `isCatalogMode -> rootDropUi` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:334` |
| 61 | 88 | `Asset3DCard` | `ResourceCard` | 4 | 2 | `asset -> description` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 62 | 88 | `Asset3DCard` | `ResourceCard` | 4 | 2 | `asset -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 63 | 88 | `Asset3DCard` | `ResourceCard` | 4 | 2 | `asset -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:50` |
| 64 | 88 | `Asset3DCard` | `Tag` | 4 | 2 | `asset -> label` | `src/features/viewer3d/components/Asset3DCard.tsx:141` |
| 65 | 84 | `AdjectiveStudioScene` | `ToyShelfScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1320` |
| 66 | 84 | `AdjectiveStudioScene` | `StudyCornerScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1323` |
| 67 | 84 | `AdjectiveStudioScene` | `PortraitScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1326` |
| 68 | 84 | `AdjectiveStudioScene` | `PlaygroundScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1329` |
| 69 | 84 | `AdjectiveStudioScene` | `BedroomScene` | 5 | 1 | `translate -> translate` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1331` |
| 70 | 82 | `ProductListMobileCard` | `CircleIconButton` | 4 | 1 | `prefetchListings -> onMouseEnter` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 71 | 82 | `ProductListMobileCard` | `CircleIconButton` | 4 | 1 | `prefetchListings -> onFocus` | `src/features/products/components/list/ProductListMobileCards.tsx:331` |
| 72 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> data` | `src/features/products/context/ProductListContext.tsx:262` |
| 73 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> queuedProductIds` | `src/features/products/context/ProductListContext.tsx:262` |
| 74 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> productAiRunStatusByProductId` | `src/features/products/context/ProductListContext.tsx:262` |
| 75 | 82 | `ProductListProvider` | `ProductListRuntimeBridge` | 4 | 1 | `value -> triggerListingStatusHighlight` | `src/features/products/context/ProductListContext.tsx:262` |
| 76 | 78 | `RunComparisonRowSummary` | `StatusBadge` | 3 | 2 | `row -> status` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:257` |
| 77 | 78 | `RunComparisonRowSummary` | `StatusBadge` | 3 | 2 | `row -> variant` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx:257` |
| 78 | 78 | `RuntimeEventEntry` | `StatusBadge` | 3 | 2 | `hideLevelLabel -> status` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx:53` |
| 79 | 78 | `RuntimeEventEntry` | `StatusBadge` | 3 | 2 | `hideLevelLabel -> variant` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx:53` |
| 80 | 78 | `RuntimeEventEntry` | `StatusBadge` | 3 | 2 | `hideLevelLabel -> hideLabel` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx:53` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 2 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 3 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 4 | 149 | 3 | `TableDetailCard` | `Button` | 7 | 2 | `detail -> detail -> onClick` |
| 5 | 139 | 3 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> status` |
| 6 | 139 | 3 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> variant` |
| 7 | 139 | 3 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> status` |
| 8 | 139 | 3 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> variant` |
| 9 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> shellTestId -> shellTestId` |
| 10 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> icon -> icon` |
| 11 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> accent -> accent` |
| 12 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 13 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 14 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 15 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 16 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 17 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 18 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 19 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 20 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 21 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 22 | 119 | 3 | `Asset3DCard` | `Badge` | 4 | 2 | `asset -> label -> removeLabel` |
| 23 | 103 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> className` |
| 24 | 99 | 3 | `TableDetailCard` | `Button` | 2 | 2 | `onQueryTable -> onQueryTable -> onClick` |
| 25 | 99 | 3 | `TableDetailCard` | `Button` | 2 | 2 | `onManageTable -> onManageTable -> onClick` |
| 26 | 99 | 3 | `FilemakerEntityTableFilters` | `Button` | 2 | 2 | `onQueryChange -> onClear -> onClick` |
| 27 | 99 | 3 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `title -> emptyState -> emptyState` |
| 28 | 99 | 3 | `AnalyticsEventsTable` | `SectionHeader` | 2 | 2 | `title -> title -> title` |
| 29 | 99 | 3 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyTitle -> emptyState -> emptyState` |
| 30 | 99 | 3 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyDescription -> emptyState -> emptyState` |
| 31 | 93 | 3 | `KangurCmsBuilderInner` | `KangurThemePreviewPanel` | 2 | 1 | `themePreviewMode -> themePreviewMode -> mode` |
| 32 | 93 | 3 | `KangurCmsBuilderInner` | `KangurThemePreviewPanel` | 2 | 1 | `themePreviewMode -> themePreviewTheme -> theme` |
| 33 | 93 | 3 | `CompleteEquation` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onClick` |
| 34 | 93 | 3 | `CompleteEquation` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onClick` |
| 35 | 93 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> className` |
| 36 | 93 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 2 | 1 | `size -> size -> size` |
| 37 | 93 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 2 | 1 | `size -> size -> size` |
| 38 | 93 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 2 | 1 | `variant -> variant -> variant` |
| 39 | 93 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 2 | 1 | `variant -> variant -> variant` |
| 40 | 93 | 3 | `PromptGenerationModelPanel` | `SelectTrigger` | 2 | 1 | `modelSelectId -> id -> id` |
| 41 | 93 | 3 | `FilterPanel` | `PanelFilters` | 2 | 1 | `values -> values -> values` |
| 42 | 93 | 3 | `FilterPanel` | `PanelFilters` | 2 | 1 | `activeValues -> activeValues -> activeValues` |
| 43 | 93 | 3 | `FilterPanel` | `PanelFilters` | 2 | 1 | `search -> search -> search` |
| 44 | 89 | 3 | `JobQueueJsonField` | `Textarea` | 1 | 2 | `value -> value -> value` |
| 45 | 89 | 3 | `JobQueueJsonField` | `Textarea` | 1 | 2 | `minHeightClassName -> minHeightClassName -> className` |
| 46 | 89 | 3 | `JobQueueJsonField` | `Textarea` | 1 | 2 | `ariaLabel -> ariaLabel -> aria-label` |
| 47 | 89 | 3 | `JobQueueJsonField` | `Textarea` | 1 | 2 | `ariaLabel -> ariaLabel -> title` |
| 48 | 89 | 3 | `JobQueueJsonField` | `Textarea` | 1 | 2 | `title -> title -> title` |
| 49 | 89 | 3 | `CentralDocsSyncCandidateCard` | `Badge` | 1 | 2 | `changeKind -> variant -> variant` |
| 50 | 89 | 3 | `CmsDomainSelector` | `SelectTrigger` | 1 | 2 | `triggerClassName -> triggerClassName -> className` |
| 51 | 89 | 3 | `AttachSlugModal` | `FormModal` | 1 | 2 | `isOpen -> isOpen -> open` |
| 52 | 89 | 3 | `FilemakerEntityTableFilters` | `Input` | 1 | 2 | `query -> value -> value` |
| 53 | 89 | 3 | `KangurAdminMetricCard` | `Card` | 1 | 2 | `className -> className -> className` |
| 54 | 89 | 3 | `KangurAdminWorkspaceIntroCard` | `Card` | 1 | 2 | `className -> className -> className` |
| 55 | 89 | 3 | `KangurAdminWorkspaceSectionCard` | `Card` | 1 | 2 | `className -> className -> className` |
| 56 | 89 | 3 | `EventStreamPanel` | `ListPanel` | 1 | 2 | `showFooterPagination -> footer -> footer` |
| 57 | 89 | 3 | `AnalyticsEventsTable` | `ListPanel` | 1 | 2 | `footer -> footer -> footer` |
| 58 | 89 | 3 | `AnalyticsEventsTable` | `SectionHeader` | 1 | 2 | `showTypeColumn -> title -> title` |
| 59 | 83 | 3 | `FrontendPublicOwnerShellClient` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `kangurInitialMode -> initialAppearance -> initialAppearance` |
| 60 | 83 | 3 | `FrontendPublicOwnerShellClient` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `kangurInitialThemeSettings -> initialAppearance -> initialAppearance` |
| 61 | 83 | 3 | `AgenticApprovalGateGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 62 | 83 | 3 | `AgenticReasoningRouterGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 63 | 83 | 3 | `AgenticSurfaceMatchGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 64 | 83 | 3 | `RotationOptionCard` | `RotationGlyphVisual` | 1 | 1 | `tile -> tile -> glyph` |
| 65 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `onRedo -> onRedo -> onClick` |
| 66 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `onUndo -> onUndo -> onClick` |
| 67 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canRedo -> redoDisabled -> disabled` |
| 68 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `redoLabel -> redoLabel -> aria-label` |
| 69 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canUndo -> undoDisabled -> disabled` |
| 70 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `undoLabel -> undoLabel -> aria-label` |
| 71 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canExport -> exportDisabled -> disabled` |
| 72 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `exportLabel -> exportLabel -> aria-label` |
| 73 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `exportLabel -> exportLabel -> title` |
| 74 | 83 | 3 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `onExport -> onExport -> onClick` |
| 75 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `onRedo -> onRedo -> onClick` |
| 76 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `onUndo -> onUndo -> onClick` |
| 77 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `redoDisabled -> redoDisabled -> disabled` |
| 78 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `redoLabel -> redoLabel -> aria-label` |
| 79 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `redoTestId -> redoTestId -> data-testid` |
| 80 | 83 | 3 | `KangurDrawingUtilityActions` | `KangurButton` | 1 | 1 | `undoDisabled -> undoDisabled -> disabled` |

## Top Chain Details (Depth >= 3)

### 1. TableDetailCard -> StandardDataTablePanel

- Score: 149
- Depth: 3
- Root fanout: 7
- Prop path: detail -> detail -> data
- Component path:
  - `TableDetailCard` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `ForeignKeysTab` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
- Transition lines:
  - `TableDetailCard` -> `ForeignKeysTab`: `detail` -> `detail` at src/features/database/pages/DatabasePreviewPage.tsx:208
  - `ForeignKeysTab` -> `StandardDataTablePanel`: `detail` -> `data` at src/features/database/pages/DatabasePreviewPage.tsx:368

### 2. TableDetailCard -> StandardDataTablePanel

- Score: 149
- Depth: 3
- Root fanout: 7
- Prop path: detail -> detail -> data
- Component path:
  - `TableDetailCard` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `IndexesTab` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
- Transition lines:
  - `TableDetailCard` -> `IndexesTab`: `detail` -> `detail` at src/features/database/pages/DatabasePreviewPage.tsx:204
  - `IndexesTab` -> `StandardDataTablePanel`: `detail` -> `data` at src/features/database/pages/DatabasePreviewPage.tsx:326

### 3. TableDetailCard -> StandardDataTablePanel

- Score: 149
- Depth: 3
- Root fanout: 7
- Prop path: detail -> detail -> data
- Component path:
  - `TableDetailCard` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `ColumnsTab` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `StandardDataTablePanel` (src/shared/ui/templates/StandardDataTablePanel.tsx)
- Transition lines:
  - `TableDetailCard` -> `ColumnsTab`: `detail` -> `detail` at src/features/database/pages/DatabasePreviewPage.tsx:200
  - `ColumnsTab` -> `StandardDataTablePanel`: `detail` -> `data` at src/features/database/pages/DatabasePreviewPage.tsx:278

### 4. TableDetailCard -> Button

- Score: 149
- Depth: 3
- Root fanout: 7
- Prop path: detail -> detail -> onClick
- Component path:
  - `TableDetailCard` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `TableDetailCardActions` (src/features/database/pages/DatabasePreviewPage.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `TableDetailCard` -> `TableDetailCardActions`: `detail` -> `detail` at src/features/database/pages/DatabasePreviewPage.tsx:167
  - `TableDetailCardActions` -> `Button`: `detail` -> `onClick` at src/features/database/pages/DatabasePreviewPage.tsx:113

### 5. RuntimeEventLogEventRow -> StatusBadge

- Score: 139
- Depth: 3
- Root fanout: 6
- Prop path: event -> kind -> status
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `kind` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `StatusBadge`: `kind` -> `status` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:62

### 6. RuntimeEventLogEventRow -> StatusBadge

- Score: 139
- Depth: 3
- Root fanout: 6
- Prop path: event -> kind -> variant
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `kind` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `StatusBadge`: `kind` -> `variant` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:62

### 7. RuntimeEventLogEventRow -> StatusBadge

- Score: 139
- Depth: 3
- Root fanout: 6
- Prop path: event -> level -> status
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `level` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `StatusBadge`: `level` -> `status` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:53

### 8. RuntimeEventLogEventRow -> StatusBadge

- Score: 139
- Depth: 3
- Root fanout: 6
- Prop path: event -> level -> variant
- Component path:
  - `RuntimeEventLogEventRow` (src/features/ai/ai-paths/components/runtime-event-log-panel.tsx)
  - `RuntimeEventEntry` (src/features/ai/ai-paths/components/runtime-event-entry.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `RuntimeEventLogEventRow` -> `RuntimeEventEntry`: `event` -> `level` at src/features/ai/ai-paths/components/runtime-event-log-panel.tsx:90
  - `RuntimeEventEntry` -> `StatusBadge`: `level` -> `variant` at src/features/ai/ai-paths/components/runtime-event-entry.tsx:53

### 9. KangurConfigurableLaunchableGameScreen -> LessonActivityStage

- Score: 133
- Depth: 3
- Root fanout: 6
- Prop path: runtime -> shellTestId -> shellTestId
- Component path:
  - `KangurConfigurableLaunchableGameScreen` (src/features/kangur/ui/pages/Game.launchable-screens.tsx)
  - `KangurGameQuizStage` (src/features/kangur/ui/components/KangurGameQuizStage.tsx)
  - `LessonActivityStage` (src/features/kangur/ui/components/LessonActivityStage.tsx)
- Transition lines:
  - `KangurConfigurableLaunchableGameScreen` -> `KangurGameQuizStage`: `runtime` -> `shellTestId` at src/features/kangur/ui/pages/Game.launchable-screens.tsx:149
  - `KangurGameQuizStage` -> `LessonActivityStage`: `shellTestId` -> `shellTestId` at src/features/kangur/ui/components/KangurGameQuizStage.tsx:54

### 10. KangurConfigurableLaunchableGameScreen -> LessonActivityStage

- Score: 133
- Depth: 3
- Root fanout: 6
- Prop path: runtime -> icon -> icon
- Component path:
  - `KangurConfigurableLaunchableGameScreen` (src/features/kangur/ui/pages/Game.launchable-screens.tsx)
  - `KangurGameQuizStage` (src/features/kangur/ui/components/KangurGameQuizStage.tsx)
  - `LessonActivityStage` (src/features/kangur/ui/components/LessonActivityStage.tsx)
- Transition lines:
  - `KangurConfigurableLaunchableGameScreen` -> `KangurGameQuizStage`: `runtime` -> `icon` at src/features/kangur/ui/pages/Game.launchable-screens.tsx:149
  - `KangurGameQuizStage` -> `LessonActivityStage`: `icon` -> `icon` at src/features/kangur/ui/components/KangurGameQuizStage.tsx:54

### 11. KangurConfigurableLaunchableGameScreen -> LessonActivityStage

- Score: 133
- Depth: 3
- Root fanout: 6
- Prop path: runtime -> accent -> accent
- Component path:
  - `KangurConfigurableLaunchableGameScreen` (src/features/kangur/ui/pages/Game.launchable-screens.tsx)
  - `KangurGameQuizStage` (src/features/kangur/ui/components/KangurGameQuizStage.tsx)
  - `LessonActivityStage` (src/features/kangur/ui/components/LessonActivityStage.tsx)
- Transition lines:
  - `KangurConfigurableLaunchableGameScreen` -> `KangurGameQuizStage`: `runtime` -> `accent` at src/features/kangur/ui/pages/Game.launchable-screens.tsx:149
  - `KangurGameQuizStage` -> `LessonActivityStage`: `accent` -> `accent` at src/features/kangur/ui/components/KangurGameQuizStage.tsx:54

### 12. AdjectiveStudioScene -> ObjectSceneBadge

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: translate -> translate -> label
- Component path:
  - `AdjectiveStudioScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `BedroomScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `ObjectSceneBadge` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
- Transition lines:
  - `AdjectiveStudioScene` -> `BedroomScene`: `translate` -> `translate` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1331
  - `BedroomScene` -> `ObjectSceneBadge`: `translate` -> `label` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1469

### 13. AdjectiveStudioScene -> ObjectSceneBadge

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: translate -> translate -> value
- Component path:
  - `AdjectiveStudioScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `BedroomScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `ObjectSceneBadge` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
- Transition lines:
  - `AdjectiveStudioScene` -> `BedroomScene`: `translate` -> `translate` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1331
  - `BedroomScene` -> `ObjectSceneBadge`: `translate` -> `value` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1469

### 14. AdjectiveStudioScene -> ObjectSceneBadge

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: translate -> translate -> label
- Component path:
  - `AdjectiveStudioScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `PlaygroundScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `ObjectSceneBadge` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
- Transition lines:
  - `AdjectiveStudioScene` -> `PlaygroundScene`: `translate` -> `translate` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1329
  - `PlaygroundScene` -> `ObjectSceneBadge`: `translate` -> `label` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:2237

### 15. AdjectiveStudioScene -> ObjectSceneBadge

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: translate -> translate -> value
- Component path:
  - `AdjectiveStudioScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `PlaygroundScene` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
  - `ObjectSceneBadge` (src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx)
- Transition lines:
  - `AdjectiveStudioScene` -> `PlaygroundScene`: `translate` -> `translate` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:1329
  - `PlaygroundScene` -> `ObjectSceneBadge`: `translate` -> `value` at src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:2237

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
