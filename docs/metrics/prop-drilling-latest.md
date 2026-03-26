---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-26T15:10:56.459Z

## Snapshot

- Scanned source files: 5831
- JSX files scanned: 2136
- Components detected: 3635
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 271
- Resolved forwarded transitions: 1221
- Candidate chains (depth >= 2): 1221
- Candidate chains (depth >= 3): 275
- High-priority chains (depth >= 4): 58
- Unknown spread forwarding edges: 32
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 139 |
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
| 2 | `KangurDrawingPracticeBoard` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard.tsx` | 28 | 29 | no | yes |
| 3 | `KangurDrawingUtilityActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx` | 21 | 26 | no | yes |
| 4 | `FilterPanel` | `src/shared/ui/templates/FilterPanel.tsx` | 19 | 22 | no | yes |
| 5 | `DetailModal` | `src/shared/ui/templates/modals/DetailModal.tsx` | 18 | 19 | no | yes |
| 6 | `KangurNavAction` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 15 | 16 | no | yes |
| 7 | `KangurDrawingFreeformToolbar` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx` | 15 | 16 | no | yes |
| 8 | `SelectSimpleControl` | `src/shared/ui/select-simple.tsx` | 15 | 16 | no | yes |
| 9 | `PageLayout` | `src/shared/ui/PageLayout.tsx` | 15 | 15 | no | yes |
| 10 | `PageLayoutRuntime` | `src/shared/ui/PageLayout.tsx` | 14 | 14 | no | yes |
| 11 | `SelectSimple` | `src/shared/ui/select-simple.tsx` | 13 | 13 | no | yes |
| 12 | `KangurTracingBoard` | `src/features/kangur/ui/components/drawing-engine/KangurTracingBoard.tsx` | 12 | 12 | no | yes |
| 13 | `FilterPanelMainFilters` | `src/shared/ui/templates/FilterPanel.tsx` | 12 | 12 | no | yes |
| 14 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 11 | 16 | no | yes |
| 15 | `VectorToolbar` | `src/shared/ui/vector-canvas.rendering.tsx` | 11 | 15 | no | yes |
| 16 | `KangurResultsWidgetContent` | `src/features/kangur/ui/components/KangurResultsWidgetContent.tsx` | 11 | 12 | no | yes |
| 17 | `StandardDataTablePanelRender` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 11 | 11 | no | yes |
| 18 | `StandardDataTablePanel` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 11 | 11 | no | yes |
| 19 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 20 | `RotationOptionCard` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.visuals.tsx` | 10 | 13 | no | yes |
| 21 | `ConfirmModal` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 10 | 11 | no | yes |
| 22 | `KangurDrawingHistoryActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx` | 10 | 10 | no | yes |
| 23 | `ConfirmDialog` | `src/shared/ui/confirm-dialog.tsx` | 10 | 10 | no | yes |
| 24 | `SearchableSelectControl` | `src/shared/ui/searchable-select.tsx` | 10 | 10 | no | yes |
| 25 | `SettingsFormModal` | `src/shared/ui/templates/SettingsFormModal.tsx` | 9 | 10 | no | yes |
| 26 | `AiPathsPillButton` | `src/features/ai/ai-paths/components/AiPathsPillButton.tsx` | 9 | 9 | no | yes |
| 27 | `ActionMenu` | `src/shared/ui/ActionMenu.tsx` | 9 | 9 | no | yes |
| 28 | `FormModalHeaderContent` | `src/shared/ui/FormModal.tsx` | 9 | 9 | no | yes |
| 29 | `PanelPagination` | `src/shared/ui/templates/panels/PanelPagination.tsx` | 9 | 9 | no | yes |
| 30 | `AnalyticsEventsTable` | `src/shared/lib/analytics/components/AnalyticsEventsTable.tsx` | 8 | 11 | no | yes |
| 31 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/KangurAssignmentManagerTimeLimitModal.tsx` | 8 | 10 | no | yes |
| 32 | `KangurDrawingSnapshotActions` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions.tsx` | 8 | 9 | no | yes |
| 33 | `KangurGameSetupStage` | `src/features/kangur/ui/components/KangurGameSetupStage.tsx` | 8 | 8 | no | yes |
| 34 | `KangurDrawingActionRow` | `src/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow.tsx` | 8 | 8 | no | yes |
| 35 | `SearchableSelect` | `src/shared/ui/searchable-select.tsx` | 8 | 8 | no | yes |
| 36 | `VectorToolbarActionButtons` | `src/shared/ui/vector-canvas.rendering.tsx` | 8 | 8 | no | yes |
| 37 | `StatusToggle` | `src/shared/ui/status-toggle.tsx` | 7 | 11 | no | yes |
| 38 | `ActionMenuContent` | `src/shared/ui/ActionMenu.tsx` | 7 | 9 | no | yes |
| 39 | `AppModalDefaultHeader` | `src/shared/ui/app-modal.tsx` | 7 | 9 | no | yes |
| 40 | `EditableCellInput` | `src/features/products/components/EditableCell.tsx` | 7 | 8 | no | yes |
| 41 | `SelectModal` | `src/shared/ui/templates/modals/SelectModal.tsx` | 7 | 8 | no | yes |
| 42 | `Asset3DResourceCard` | `src/features/viewer3d/components/Asset3DCard.tsx` | 6 | 17 | no | yes |
| 43 | `TagBadge` | `src/shared/ui/tag.tsx` | 6 | 8 | no | yes |
| 44 | `KangurUnifiedLessonBase` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 6 | 7 | no | yes |
| 45 | `ValidationActionButton` | `src/features/ai/ai-paths/components/validation/ValidationActionButton.tsx` | 6 | 6 | no | yes |
| 46 | `PageLayoutHeader` | `src/shared/ui/PageLayout.tsx` | 6 | 6 | no | yes |
| 47 | `RefreshButton` | `src/shared/ui/RefreshButton.tsx` | 6 | 6 | no | yes |
| 48 | `AppModal` | `src/shared/ui/app-modal.tsx` | 6 | 6 | no | yes |
| 49 | `SearchInput` | `src/shared/ui/search-input.tsx` | 6 | 6 | no | yes |
| 50 | `Tag` | `src/shared/ui/tag.tsx` | 6 | 6 | no | yes |
| 51 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 5 | 7 | no | yes |
| 52 | `AttachSlugFormModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 5 | 6 | no | yes |
| 53 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 54 | `KangurManagedDrawingUtilityActions` | `src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx` | 5 | 6 | yes | yes |
| 55 | `PromptGenerationOutputPromptPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 5 | 6 | no | yes |
| 56 | `ConfirmModalFooterActions` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 5 | 6 | no | yes |
| 57 | `JobQueueJsonField` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 5 | 5 | no | yes |
| 58 | `RuntimeEventEntry` | `src/features/ai/ai-paths/components/runtime-event-entry.tsx` | 5 | 5 | no | yes |
| 59 | `CmsDomainSelectorControl` | `src/features/cms/components/CmsDomainSelector.tsx` | 5 | 5 | no | yes |
| 60 | `KangurAdminWorkspaceIntroCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceIntroCard.tsx` | 5 | 5 | no | yes |
| 61 | `KangurAdminWorkspaceSectionCard` | `src/features/kangur/admin/components/KangurAdminWorkspaceSectionCard.tsx` | 5 | 5 | no | yes |
| 62 | `KangurGameQuizStage` | `src/features/kangur/ui/components/KangurGameQuizStage.tsx` | 5 | 5 | no | yes |
| 63 | `SkeletonGlassPanel` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 5 | 5 | no | yes |
| 64 | `RefreshButtonControl` | `src/shared/ui/RefreshButton.tsx` | 5 | 5 | no | yes |
| 65 | `SearchInputContent` | `src/shared/ui/search-input.tsx` | 5 | 5 | no | yes |
| 66 | `ProductListMobileCard` | `src/features/products/components/list/ProductListMobileCards.tsx` | 4 | 20 | no | yes |
| 67 | `TreeSectionPicker` | `src/features/cms/components/page-builder/tree/TreeSectionPicker.tsx` | 4 | 6 | no | yes |
| 68 | `AdminKangurSocialSettingsModal` | `src/features/kangur/admin/admin-kangur-social/AdminKangurSocialSettingsModal.tsx` | 4 | 6 | no | yes |
| 69 | `JobQueueJsonTextarea` | `src/features/ai/ai-paths/components/job-queue-run-card.tsx` | 4 | 5 | no | yes |
| 70 | `CentralDocsSyncCandidateCard` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 4 | 5 | no | yes |
| 71 | `SocialPostImagesPanel` | `src/features/kangur/admin/admin-kangur-social/SocialPost.ImagesPanel.tsx` | 4 | 5 | no | yes |
| 72 | `PromptGenerationInputPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 73 | `PromptGenerationModelPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 74 | `PromptGenerationOutputToggle` | `src/shared/ui/PromptGenerationSection.tsx` | 4 | 5 | no | yes |
| 75 | `FolderTreeSearchViewportTree` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 4 | 4 | no | yes |
| 76 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 4 | 4 | no | yes |
| 77 | `KangurDialogHeader` | `src/features/kangur/ui/components/KangurDialogHeader.tsx` | 4 | 4 | no | yes |
| 78 | `SkeletonInfoSurface` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 4 | 4 | no | yes |
| 79 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 4 | 4 | no | yes |
| 80 | `KangurTextWordmark` | `src/features/kangur/ui/components/KangurTextWordmark.tsx` | 4 | 4 | yes | yes |
| 81 | `KangurTracingLessonFooter` | `src/features/kangur/ui/components/drawing-engine/KangurTracingLessonFooter.tsx` | 4 | 4 | no | yes |
| 82 | `NotesAppTreeHeaderQuickFilters` | `src/features/notesapp/components/tree/NotesAppTreeHeader.tsx` | 4 | 4 | no | yes |
| 83 | `ProductMetadataMultiSelectField` | `src/features/products/components/form/ProductMetadataMultiSelectField.tsx` | 4 | 4 | no | yes |
| 84 | `PageLayoutSaveFooter` | `src/shared/ui/PageLayout.tsx` | 4 | 4 | no | yes |
| 85 | `StandardDataTablePanelGeneratedHeader` | `src/shared/ui/templates/StandardDataTablePanel.tsx` | 4 | 4 | no | yes |
| 86 | `TableDetailCard` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 11 | no | yes |
| 87 | `RuntimeEventLevelBadge` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx` | 3 | 6 | no | yes |
| 88 | `RunComparisonRowSummary` | `src/features/ai/ai-paths/components/RunComparisonTool.tsx` | 3 | 5 | no | yes |
| 89 | `FilemakerEntityTableFilters` | `src/features/filemaker/components/shared/FilemakerEntityTablePage.tsx` | 3 | 5 | no | yes |
| 90 | `DatabaseActionsRestoreItem` | `src/features/database/components/DatabaseColumns.tsx` | 3 | 4 | no | yes |
| 91 | `DatabaseActionsDeleteItem` | `src/features/database/components/DatabaseColumns.tsx` | 3 | 4 | no | yes |
| 92 | `JobRow` | `src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx` | 3 | 4 | no | yes |
| 93 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 3 | 4 | no | yes |
| 94 | `PointerDropZone` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 3 | 4 | no | yes |
| 95 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar.tsx` | 3 | 3 | no | yes |
| 96 | `RuntimeEventLogActionButton` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 97 | `RuntimeEventLogCountBadge` | `src/features/ai/ai-paths/components/runtime-event-log-panel.tsx` | 3 | 3 | no | yes |
| 98 | `CentralDocsSyncSummaryBadge` | `src/features/ai/ai-paths/components/validation/CentralDocsSyncPanel.tsx` | 3 | 3 | no | yes |
| 99 | `ValidationMetaBadge` | `src/features/ai/ai-paths/components/validation/ValidationMetaBadge.tsx` | 3 | 3 | no | yes |
| 100 | `TableDetailCardActions` | `src/features/database/pages/DatabasePreviewPage.tsx` | 3 | 3 | no | yes |
| 101 | `FolderTreeSearchViewportSearchBar` | `src/features/foldertree/v2/search/FolderTreeSearchViewport.tsx` | 3 | 3 | no | yes |
| 102 | `KangurAdminCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 103 | `KangurAdminInsetCard` | `src/features/kangur/admin/components/KangurAdminCard.tsx` | 3 | 3 | yes | yes |
| 104 | `KangurCmsBuilderRightPanel` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx` | 3 | 3 | no | yes |
| 105 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 3 | 3 | no | yes |
| 106 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 3 | 3 | no | yes |
| 107 | `KangurDuelsWordmark` | `src/features/kangur/ui/components/KangurDuelsWordmark.tsx` | 3 | 3 | yes | yes |
| 108 | `KangurElevatedUserMenu` | `src/features/kangur/ui/components/KangurElevatedUserMenu.tsx` | 3 | 3 | no | yes |
| 109 | `KangurGrajmyWordmark` | `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx` | 3 | 3 | yes | yes |
| 110 | `KangurKangurWordmark` | `src/features/kangur/ui/components/KangurKangurWordmark.tsx` | 3 | 3 | yes | yes |
| 111 | `KangurLessonsWordmark` | `src/features/kangur/ui/components/KangurLessonsWordmark.tsx` | 3 | 3 | yes | yes |
| 112 | `KangurLocalizedPathWordmark` | `src/features/kangur/ui/components/KangurLocalizedPathWordmark.tsx` | 3 | 3 | yes | yes |
| 113 | `KangurParentDashboardWordmark` | `src/features/kangur/ui/components/KangurParentDashboardWordmark.tsx` | 3 | 3 | yes | yes |
| 114 | `KangurTestsWordmark` | `src/features/kangur/ui/components/KangurTestsWordmark.tsx` | 3 | 3 | yes | yes |
| 115 | `KangurTreningWordmark` | `src/features/kangur/ui/components/KangurTreningWordmark.tsx` | 3 | 3 | yes | yes |
| 116 | `KangurUnifiedLessonPanel` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 3 | 3 | yes | yes |
| 117 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 3 | 3 | no | yes |
| 118 | `PromptGenerationInitialResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 119 | `PromptGenerationFinalResultPanel` | `src/shared/ui/PromptGenerationSection.tsx` | 3 | 3 | no | yes |
| 120 | `AppModalDialogContentShell` | `src/shared/ui/app-modal.tsx` | 3 | 3 | no | yes |

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
| 47 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> actions` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 48 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> media` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 49 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 50 | 98 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 51 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> onStart` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 52 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestedSelection` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 53 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionDescription` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 54 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionLabel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 55 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionTitle` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 56 | 90 | `Asset3DResourceCard` | `ResourceCard` | 5 | 2 | `className -> className` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 57 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreePanel` | 4 | 2 | `isCatalogMode -> header` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:112` |
| 58 | 88 | `AdminKangurLessonsManagerTreePanel` | `Button` | 4 | 2 | `isCatalogMode -> className` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:132` |
| 59 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeSearchBar` | 4 | 2 | `isCatalogMode -> placeholder` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:306` |
| 60 | 88 | `AdminKangurLessonsManagerTreePanel` | `FolderTreeViewportV2` | 4 | 2 | `isCatalogMode -> rootDropUi` | `src/features/kangur/admin/components/AdminKangurLessonsManagerTreePanel.tsx:334` |
| 61 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> description` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 62 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> badges` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 63 | 88 | `Asset3DResourceCard` | `ResourceCard` | 4 | 2 | `asset -> footer` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |
| 64 | 88 | `Asset3DResourceCard` | `Tag` | 4 | 2 | `asset -> label` | `src/features/viewer3d/components/Asset3DCard.tsx:144` |
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
| 78 | 78 | `RuntimeEventLevelBadge` | `StatusBadge` | 3 | 2 | `hideLabel -> status` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx:56` |
| 79 | 78 | `RuntimeEventLevelBadge` | `StatusBadge` | 3 | 2 | `hideLabel -> variant` | `src/features/ai/ai-paths/components/runtime-event-badges.tsx:56` |
| 80 | 78 | `Asset3DResourceCard` | `ResourceCard` | 3 | 2 | `isDeleting -> actions` | `src/features/viewer3d/components/Asset3DCard.tsx:51` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> kind -> status` |
| 2 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> kind -> kind -> variant` |
| 3 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> level -> status` |
| 4 | 202 | 4 | `RuntimeEventLogEventRow` | `StatusBadge` | 6 | 2 | `event -> level -> level -> variant` |
| 5 | 191 | 5 | `CmsDomainSelector` | `SelectTrigger` | 1 | 2 | `triggerClassName -> triggerClassName -> triggerClassName -> triggerClassName -> className` |
| 6 | 191 | 5 | `Asset3DCard` | `Badge` | 1 | 2 | `asset -> asset -> label -> label -> removeLabel` |
| 7 | 185 | 5 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canExport -> canExport -> exportDisabled -> exportDisabled -> disabled` |
| 8 | 185 | 5 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canRedo -> canRedo -> redoDisabled -> redoDisabled -> disabled` |
| 9 | 185 | 5 | `KangurDrawingFreeformToolbar` | `KangurButton` | 1 | 1 | `canUndo -> canUndo -> undoDisabled -> undoDisabled -> disabled` |
| 10 | 185 | 5 | `DetailModal` | `RadixOverlayContentShell` | 1 | 1 | `contentClassName -> contentClassName -> modalContentClassName -> className -> contentProps` |
| 11 | 162 | 4 | `FilemakerEntityTableFilters` | `Button` | 2 | 2 | `onQueryChange -> onClear -> onClear -> onClick` |
| 12 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `title -> emptyState -> emptyState -> emptyState` |
| 13 | 162 | 4 | `AnalyticsEventsTable` | `SectionHeader` | 2 | 2 | `title -> title -> title -> title` |
| 14 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyTitle -> emptyState -> emptyState -> emptyState` |
| 15 | 162 | 4 | `AnalyticsEventsTable` | `ListPanel` | 2 | 2 | `emptyDescription -> emptyState -> emptyState -> emptyState` |
| 16 | 156 | 4 | `KangurManagedDrawingUtilityActions` | `KangurButton` | 2 | 1 | `historyLocked -> undoDisabled -> undoDisabled -> disabled` |
| 17 | 156 | 4 | `KangurManagedDrawingUtilityActions` | `KangurButton` | 2 | 1 | `historyLocked -> redoDisabled -> redoDisabled -> disabled` |
| 18 | 156 | 4 | `PromptGenerationModelPanel` | `SelectTrigger` | 2 | 1 | `modelSelectId -> id -> id -> id` |
| 19 | 152 | 4 | `DatabaseCollectionTypeField` | `Select` | 1 | 2 | `onValueChange -> onValueChange -> onValueChange -> onValueChange` |
| 20 | 152 | 4 | `CmsDomainSelectorControl` | `Select` | 1 | 2 | `handleChange -> onValueChange -> onValueChange -> onValueChange` |
| 21 | 152 | 4 | `CmsDomainSelectorControl` | `Select` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 22 | 152 | 4 | `CmsDomainSelectorControl` | `SelectItem` | 1 | 2 | `disabled -> disabled -> disabled -> disabled` |
| 23 | 152 | 4 | `CmsDomainSelector` | `SelectSimpleControl` | 1 | 2 | `triggerClassName -> triggerClassName -> triggerClassName -> triggerClassName` |
| 24 | 152 | 4 | `FilemakerEntityTableFilters` | `Input` | 1 | 2 | `query -> value -> value -> value` |
| 25 | 152 | 4 | `Asset3DCard` | `TagBadge` | 1 | 2 | `asset -> asset -> label -> label` |
| 26 | 152 | 4 | `AnalyticsEventsTable` | `SectionHeader` | 1 | 2 | `showTypeColumn -> title -> title -> title` |
| 27 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 28 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 29 | 149 | 3 | `TableDetailCard` | `StandardDataTablePanel` | 7 | 2 | `detail -> detail -> data` |
| 30 | 149 | 3 | `TableDetailCard` | `Button` | 7 | 2 | `detail -> detail -> onClick` |
| 31 | 146 | 4 | `KangurDuelsWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 32 | 146 | 4 | `LessonsLibrarySkeleton` | `KangurLocalizedPathWordmark` | 1 | 1 | `lessonsTitle -> lessonsTitle -> label -> label` |
| 33 | 146 | 4 | `LessonsLibrarySkeleton` | `KangurLocalizedPathWordmark` | 1 | 1 | `locale -> locale -> locale -> locale` |
| 34 | 146 | 4 | `KangurParentDashboardWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 35 | 146 | 4 | `KangurTestsWordmark` | `KangurWordmarkBase` | 1 | 1 | `idPrefix -> idPrefix -> idPrefix -> idPrefix` |
| 36 | 146 | 4 | `KangurDrawingFreeformToolbar` | `KangurDrawingSnapshotActions` | 1 | 1 | `canExport -> canExport -> exportDisabled -> exportDisabled` |
| 37 | 146 | 4 | `KangurDrawingFreeformToolbar` | `KangurDrawingHistoryActions` | 1 | 1 | `canRedo -> canRedo -> redoDisabled -> redoDisabled` |
| 38 | 146 | 4 | `KangurDrawingFreeformToolbar` | `KangurDrawingHistoryActions` | 1 | 1 | `canUndo -> canUndo -> undoDisabled -> undoDisabled` |
| 39 | 146 | 4 | `KangurManagedDrawingUtilityActions` | `KangurButton` | 1 | 1 | `exportLocked -> exportDisabled -> exportDisabled -> disabled` |
| 40 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `title -> title -> title -> title` |
| 41 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `description -> description -> description -> description` |
| 42 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `eyebrow -> eyebrow -> eyebrow -> eyebrow` |
| 43 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `icon -> icon -> icon -> icon` |
| 44 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> headerActions -> actions` |
| 45 | 146 | 4 | `PageLayout` | `SectionHeader` | 1 | 1 | `refresh -> refresh -> refresh -> refresh` |
| 46 | 146 | 4 | `PageLayout` | `TabsList` | 1 | 1 | `tabs -> tabs -> tabs -> style` |
| 47 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `onSave -> onSave -> onSave -> onSave` |
| 48 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `isSaving -> isSaving -> isSaving -> isSaving` |
| 49 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `saveText -> saveText -> saveText -> saveText` |
| 50 | 146 | 4 | `PageLayout` | `FormActions` | 1 | 1 | `stickyFooter -> stickyFooter -> stickyFooter -> className` |
| 51 | 146 | 4 | `PromptGenerationModelPanel` | `Select` | 1 | 1 | `onModelChange -> onValueChange -> onValueChange -> onValueChange` |
| 52 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `onOpenChange -> onClose -> onClose -> onClick` |
| 53 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `onCancel -> onClose -> onClose -> onClick` |
| 54 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `variant -> isDangerous -> isDangerous -> variant` |
| 55 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `loading -> loading -> loading -> disabled` |
| 56 | 146 | 4 | `ConfirmDialog` | `Button` | 1 | 1 | `loading -> loading -> loading -> loading` |
| 57 | 146 | 4 | `ConfirmDialog` | `Input` | 1 | 1 | `loading -> loading -> loading -> disabled` |
| 58 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `title -> title -> title -> title` |
| 59 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `subtitle -> subtitle -> subtitle -> subtitle` |
| 60 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `headerActions -> headerActions -> headerActions -> actions` |
| 61 | 146 | 4 | `DetailModal` | `DialogContent` | 1 | 1 | `contentClassName -> contentClassName -> modalContentClassName -> className` |
| 62 | 146 | 4 | `DetailModal` | `SectionHeader` | 1 | 1 | `showClose -> showClose -> showClose -> actions` |
| 63 | 133 | 3 | `RuntimeEventLogEventRow` | `RuntimeEventKindBadge` | 6 | 1 | `event -> kind -> kind` |
| 64 | 133 | 3 | `RuntimeEventLogEventRow` | `RuntimeEventLevelBadge` | 6 | 1 | `event -> level -> level` |
| 65 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> shellTestId -> shellTestId` |
| 66 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> icon -> icon` |
| 67 | 133 | 3 | `KangurConfigurableLaunchableGameScreen` | `LessonActivityStage` | 6 | 1 | `runtime -> accent -> accent` |
| 68 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 69 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 70 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 71 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 72 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 73 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 74 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 75 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 76 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> label` |
| 77 | 123 | 3 | `AdjectiveStudioScene` | `ObjectSceneBadge` | 5 | 1 | `translate -> translate -> value` |
| 78 | 109 | 3 | `RunComparisonRowSummary` | `Button` | 3 | 2 | `row -> onClick -> onClick` |
| 79 | 109 | 3 | `DatabaseActionsCell` | `DropdownMenuItem` | 3 | 2 | `backup -> backup -> onClick` |
| 80 | 109 | 3 | `DatabaseActionsCell` | `DropdownMenuItem` | 3 | 2 | `backup -> backup -> onClick` |

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

### 7. KangurDrawingFreeformToolbar -> KangurButton

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: canExport -> canExport -> exportDisabled -> exportDisabled -> disabled
- Component path:
  - `KangurDrawingFreeformToolbar` (src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx)
  - `KangurManagedDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx)
  - `KangurDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx)
  - `KangurDrawingSnapshotActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurDrawingFreeformToolbar` -> `KangurManagedDrawingUtilityActions`: `canExport` -> `canExport` at src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx:189
  - `KangurManagedDrawingUtilityActions` -> `KangurDrawingUtilityActions`: `canExport` -> `exportDisabled` at src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx:90
  - `KangurDrawingUtilityActions` -> `KangurDrawingSnapshotActions`: `exportDisabled` -> `exportDisabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx:73
  - `KangurDrawingSnapshotActions` -> `KangurButton`: `exportDisabled` -> `disabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions.tsx:37

### 8. KangurDrawingFreeformToolbar -> KangurButton

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: canRedo -> canRedo -> redoDisabled -> redoDisabled -> disabled
- Component path:
  - `KangurDrawingFreeformToolbar` (src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx)
  - `KangurManagedDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx)
  - `KangurDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx)
  - `KangurDrawingHistoryActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurDrawingFreeformToolbar` -> `KangurManagedDrawingUtilityActions`: `canRedo` -> `canRedo` at src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx:189
  - `KangurManagedDrawingUtilityActions` -> `KangurDrawingUtilityActions`: `canRedo` -> `redoDisabled` at src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx:90
  - `KangurDrawingUtilityActions` -> `KangurDrawingHistoryActions`: `redoDisabled` -> `redoDisabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx:56
  - `KangurDrawingHistoryActions` -> `KangurButton`: `redoDisabled` -> `disabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx:61

### 9. KangurDrawingFreeformToolbar -> KangurButton

- Score: 185
- Depth: 5
- Root fanout: 1
- Prop path: canUndo -> canUndo -> undoDisabled -> undoDisabled -> disabled
- Component path:
  - `KangurDrawingFreeformToolbar` (src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx)
  - `KangurManagedDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx)
  - `KangurDrawingUtilityActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx)
  - `KangurDrawingHistoryActions` (src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurDrawingFreeformToolbar` -> `KangurManagedDrawingUtilityActions`: `canUndo` -> `canUndo` at src/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar.tsx:189
  - `KangurManagedDrawingUtilityActions` -> `KangurDrawingUtilityActions`: `canUndo` -> `undoDisabled` at src/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions.tsx:90
  - `KangurDrawingUtilityActions` -> `KangurDrawingHistoryActions`: `undoDisabled` -> `undoDisabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingUtilityActions.tsx:56
  - `KangurDrawingHistoryActions` -> `KangurButton`: `undoDisabled` -> `disabled` at src/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions.tsx:48

### 10. DetailModal -> RadixOverlayContentShell

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

### 11. FilemakerEntityTableFilters -> Button

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

### 12. AnalyticsEventsTable -> ListPanel

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

### 13. AnalyticsEventsTable -> SectionHeader

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

### 14. AnalyticsEventsTable -> ListPanel

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

### 15. AnalyticsEventsTable -> ListPanel

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
