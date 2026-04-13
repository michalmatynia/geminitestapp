---
owner: 'Platform Team'
last_reviewed: '2026-04-13'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-13T20:42:41.464Z

## Snapshot

- Scanned source files: 7306
- JSX files scanned: 2537
- Components detected: 4458
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 236
- Resolved forwarded transitions: 732
- Candidate chains (depth >= 2): 732
- Candidate chains (depth >= 3): 10
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 13
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 177 |
| `feature:integrations` | 13 |
| `shared-ui` | 10 |
| `feature:ai` | 7 |
| `feature:products` | 7 |
| `feature:cms` | 4 |
| `feature:case-resolver` | 4 |
| `shared-lib` | 3 |
| `feature:admin` | 3 |
| `feature:filemaker` | 2 |
| `feature:playwright` | 2 |
| `app` | 2 |
| `feature:notesapp` | 1 |
| `shared` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 2 | `IntegrationSelectorFields` | `src/features/integrations/components/listings/IntegrationSelectorFields.tsx` | 11 | 15 | no | yes |
| 3 | `AiPathsMasterTreePanel` | `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsMasterTreePanel.tsx` | 9 | 12 | no | yes |
| 4 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 5 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 6 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 7 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 8 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 9 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 10 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 11 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 12 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 6 | 7 | no | yes |
| 13 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 14 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 15 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 16 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 5 | 9 | no | yes |
| 17 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 18 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 19 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 20 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 21 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 22 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 23 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 24 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 25 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 26 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 27 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 28 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 29 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 30 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 4 | 6 | no | yes |
| 31 | `AiPathsCanvasToolbar` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasToolbar.tsx` | 4 | 5 | no | yes |
| 32 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 33 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 34 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 35 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 36 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 37 | `ProductListActivityPill` | `src/features/products/components/list/ProductListActivityPill.tsx` | 4 | 5 | no | yes |
| 38 | `ListingRowView` | `src/features/integrations/components/listings/TraderaStatusCheckModal.RowItem.tsx` | 4 | 4 | no | yes |
| 39 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 4 | 4 | no | yes |
| 40 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 4 | no | yes |
| 41 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 42 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 4 | 4 | no | yes |
| 43 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 44 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 45 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 46 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 47 | `GenericPickerDropdownMenu` | `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx` | 4 | 4 | no | yes |
| 48 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 49 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 50 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 3 | 6 | no | yes |
| 51 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 52 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 53 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 54 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 55 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 56 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 3 | 3 | no | yes |
| 57 | `CatalogCategoryTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogCategoryTable.tsx` | 3 | 3 | no | yes |
| 58 | `CatalogEntriesTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogEntriesTable.tsx` | 3 | 3 | no | yes |
| 59 | `MappingsRulesTable` | `src/features/integrations/pages/marketplaces/tradera/components/MappingsRulesTable.tsx` | 3 | 3 | no | yes |
| 60 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 61 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 62 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 63 | `AgenticTrimTokenPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 3 | 3 | no | yes |
| 64 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 65 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 3 | 3 | no | yes |
| 66 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 67 | `KangurAssignmentsListArchiveAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |
| 68 | `DraggableClockSnapModeSwitch` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 69 | `DraggableClockSubmitArea` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 70 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 71 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 72 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 73 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 74 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 75 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |
| 76 | `PlayerProgressGuidedMomentumSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 7 | no | yes |
| 77 | `RuntimeTab` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx` | 2 | 7 | no | yes |
| 78 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 2 | 6 | no | yes |
| 79 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 6 | no | yes |
| 80 | `PlayerProgressNextBadgeSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 5 | no | yes |
| 81 | `PlayerProgressTopActivitySection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 4 | no | yes |
| 82 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 2 | 3 | no | yes |
| 83 | `CaseResolverNestedScopeToggle` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 84 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 85 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 2 | 3 | no | yes |
| 86 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 2 | 3 | no | yes |
| 87 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |
| 88 | `OperationSelectorRecommendationChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 3 | no | yes |
| 89 | `LessonsCatalogEmptyStateWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 2 | 3 | no | yes |
| 90 | `PlaywrightEngineSettingsModal` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx` | 2 | 3 | no | yes |
| 91 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 2 | 2 | no | yes |
| 92 | `CaseResolverContextNotice` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 2 | no | yes |
| 93 | `RunDeliveryLogSection` | `src/features/filemaker/pages/campaign-run-sections/RunDeliveryLogSection.tsx` | 2 | 2 | no | yes |
| 94 | `BrowserSessionCard` | `src/features/integrations/components/connections/integration-modal/IntegrationSettingsContent.tsx` | 2 | 2 | no | yes |
| 95 | `IntegrationSelectionLoadingState` | `src/features/integrations/components/listings/IntegrationSelectionLoadingState.tsx` | 2 | 2 | no | yes |
| 96 | `ListingSettingsModalProvider` | `src/features/integrations/components/listings/ListingSettingsModalProvider.tsx` | 2 | 2 | no | yes |
| 97 | `TraderaQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 98 | `VintedQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/VintedQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 99 | `SocialPostEditorModal` | `src/features/kangur/social/admin/workspace/SocialPost.EditorModal.tsx` | 2 | 2 | no | yes |
| 100 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 2 | no | yes |
| 101 | `KangurLanguageSwitcherMenu` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 102 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 103 | `KangurLessonActivityInstanceRuntimeView` | `src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx` | 2 | 2 | no | yes |
| 104 | `KangurNavActionButton` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 2 | 2 | no | yes |
| 105 | `PointerDraggableBall` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 2 | 2 | no | yes |
| 106 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx` | 2 | 2 | no | yes |
| 107 | `KangurAssignmentsListProgressMeta` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 108 | `KangurGameQuestionAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget.tsx` | 2 | 2 | no | yes |
| 109 | `OperationSelectorPriorityChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 110 | `OperationSelectorCard` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 111 | `KangurLearnerProfileHeroAuthActions` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget.tsx` | 2 | 2 | no | yes |
| 112 | `KangurLearnerProfileOverviewAvatarPicker` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 2 | no | yes |
| 113 | `KangurLessonsCatalogWidgetEmptyState` | `src/features/kangur/ui/components/lesson-library/KangurLessonsCatalogWidget.tsx` | 2 | 2 | no | yes |
| 114 | `KangurResolvedPageIntroCardBody` | `src/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard.tsx` | 2 | 2 | no | yes |
| 115 | `KangurLessonActivityCompletedState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 2 | 2 | no | yes |
| 116 | `LearnerPasswordField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 117 | `LearnerStatusField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 118 | `KangurSectionHeadingOptionalDescription` | `src/features/kangur/ui/design/primitives/KangurSectionHeading.tsx` | 2 | 2 | no | yes |
| 119 | `LessonsDeferredEnhancements` | `src/features/kangur/ui/pages/lessons/LessonsDeferredEnhancements.tsx` | 2 | 2 | no | yes |
| 120 | `TextBlock` | `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 2 | 2 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 132 | `KangurLessonActivityRuntime` | `CalendarInteractiveGame` | 9 | 1 | `rendererProps -> calendarSection` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:74` |
| 2 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> hideModeSwitch` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 3 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> initialMode` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 4 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> section` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 5 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showHourHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 6 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showMinuteHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 7 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTaskTitle` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 8 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTimeDisplay` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83` |
| 9 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> action` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 10 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 11 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> progressLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 12 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> questLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 13 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardAccent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 14 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 15 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 16 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 17 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> targetPageKey` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 18 | 124 | `KangurLessonActivityRuntime` | `GeometryDrawingGame` | 9 | 1 | `rendererProps -> rendererProps` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:98` |
| 19 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> accent` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 20 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> dataTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 21 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> durationText` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 22 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 23 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreText` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 24 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> subtitle` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 25 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 26 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpText` | `src/features/kangur/ui/components/ScoreHistory.tsx:323` |
| 27 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 28 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 29 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> onClick` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 30 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> aside` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:64` |
| 31 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> icon` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:64` |
| 32 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:67` |
| 33 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:67` |
| 34 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconBadge` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:104` |
| 35 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 36 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 37 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> summary` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 38 | 122 | `StructureTab` | `GamesLibraryCompactMetric` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:109` |
| 39 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 40 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 41 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> eyebrow` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:139` |
| 42 | 122 | `StructureTab` | `GamesLibraryDetailSurface` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:213` |
| 43 | 112 | `KangurLearnerProfileOperationCard` | `KangurInfoCard` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:138` |
| 44 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 45 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> transitionSourceId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 46 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> dataTestId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 47 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 48 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 49 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 50 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 51 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 52 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelCapabilityBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:658` |
| 53 | 92 | `CanvasSvgNode` | `CanvasSvgNodeDiagnosticsBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:732` |
| 54 | 92 | `CatalogTab` | `KangurEmptyState` | 5 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:119` |
| 55 | 92 | `CatalogTab` | `KangurEmptyState` | 5 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:119` |
| 56 | 92 | `CatalogTab` | `GamesLibraryCompactMetric` | 5 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:170` |
| 57 | 92 | `CatalogTab` | `GamesLibraryCompactMetric` | 5 | 1 | `translations -> value` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:264` |
| 58 | 92 | `CatalogTab` | `KangurButton` | 5 | 1 | `translations -> aria-label` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:289` |
| 59 | 92 | `RuntimeTab` | `GamesLibrarySectionHeader` | 5 | 1 | `translations -> eyebrow` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx:95` |
| 60 | 92 | `RuntimeTab` | `GamesLibrarySectionHeader` | 5 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx:95` |
| 61 | 92 | `RuntimeTab` | `GamesLibrarySectionHeader` | 5 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx:95` |
| 62 | 92 | `RuntimeTab` | `GamesLibrarySectionHeader` | 5 | 1 | `translations -> summary` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx:95` |
| 63 | 92 | `RuntimeTab` | `GamesLibraryCompactMetric` | 5 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx:101` |
| 64 | 88 | `FilemakerMailSidebar` | `FolderTreePanel` | 4 | 2 | `recentMailboxFilter -> header` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:345` |
| 65 | 88 | `FilemakerMailSidebar` | `FolderTreePanel` | 4 | 2 | `recentUnreadOnly -> header` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:345` |
| 66 | 88 | `FilemakerMailSidebar` | `FolderTreePanel` | 4 | 2 | `recentQuery -> header` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:345` |
| 67 | 88 | `FilemakerMailSidebar` | `Button` | 4 | 2 | `recentMailboxFilter -> onClick` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:374` |
| 68 | 88 | `FilemakerMailSidebar` | `Button` | 4 | 2 | `recentUnreadOnly -> onClick` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:374` |
| 69 | 88 | `FilemakerMailSidebar` | `Button` | 4 | 2 | `recentQuery -> onClick` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:374` |
| 70 | 88 | `FilemakerMailSidebar` | `SelectSimple` | 4 | 2 | `recentMailboxFilter -> value` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:441` |
| 71 | 88 | `FilemakerMailSidebar` | `SelectSimple` | 4 | 2 | `recentMailboxFilter -> onValueChange` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:441` |
| 72 | 88 | `FilemakerMailSidebar` | `Input` | 4 | 2 | `recentQuery -> value` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:454` |
| 73 | 88 | `FilemakerMailSidebar` | `Input` | 4 | 2 | `recentQuery -> onChange` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:454` |
| 74 | 88 | `FilemakerMailSidebar` | `Checkbox` | 4 | 2 | `recentUnreadOnly -> checked` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:471` |
| 75 | 88 | `FilemakerMailSidebar` | `Checkbox` | 4 | 2 | `recentUnreadOnly -> onCheckedChange` | `src/features/filemaker/components/FilemakerMailSidebar.tsx:471` |
| 76 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> onClick` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 77 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> className` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 78 | 88 | `TriggerButtonBar` | `DropdownMenuItem` | 4 | 2 | `disabled -> onSelect` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:443` |
| 79 | 84 | `CanvasSvgNode` | `CanvasSvgNodeTriggerAction` | 5 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:741` |
| 80 | 82 | `CalendarInteractiveGameSummaryView` | `KangurPracticeGameSummaryTitle` | 4 | 1 | `translations -> title` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx:74` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 93 | 3 | `KangurLaunchableGameInstanceRuntime` | `KangurLessonActivityRuntimeProvider` | 2 | 1 | `onFinish -> onFinish -> onFinish` |
| 2 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `CalendarInteractiveGame` | 1 | 1 | `rendererProps -> rendererProps -> calendarSection` |
| 3 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> hideModeSwitch` |
| 4 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> initialMode` |
| 5 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> section` |
| 6 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showHourHand` |
| 7 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showMinuteHand` |
| 8 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showTaskTitle` |
| 9 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showTimeDisplay` |
| 10 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `GeometryDrawingGame` | 1 | 1 | `rendererProps -> rendererProps -> rendererProps` |

## Top Chain Details (Depth >= 3)

### 1. KangurLaunchableGameInstanceRuntime -> KangurLessonActivityRuntimeProvider

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: onFinish -> onFinish -> onFinish
- Component path:
  - `KangurLaunchableGameInstanceRuntime` (src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx)
  - `KangurLessonActivityInstanceRuntime` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntimeProvider` (src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx)
- Transition lines:
  - `KangurLaunchableGameInstanceRuntime` -> `KangurLessonActivityInstanceRuntime`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx:415
  - `KangurLessonActivityInstanceRuntime` -> `KangurLessonActivityRuntimeProvider`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:254

### 2. KangurLessonActivityInstanceRuntimeView -> CalendarInteractiveGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> calendarSection
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `CalendarInteractiveGame` (src/features/kangur/ui/components/CalendarInteractiveGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `CalendarInteractiveGame`: `rendererProps` -> `calendarSection` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:74

### 3. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> hideModeSwitch
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `hideModeSwitch` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 4. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> initialMode
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `initialMode` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 5. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> section
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `section` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 6. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> showHourHand
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `showHourHand` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 7. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> showMinuteHand
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `showMinuteHand` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 8. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> showTaskTitle
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `showTaskTitle` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 9. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> showTimeDisplay
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `ClockTrainingGame` (src/features/kangur/ui/components/clock-training/ClockTrainingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `ClockTrainingGame`: `rendererProps` -> `showTimeDisplay` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 10. KangurLessonActivityInstanceRuntimeView -> GeometryDrawingGame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: rendererProps -> rendererProps -> rendererProps
- Component path:
  - `KangurLessonActivityInstanceRuntimeView` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntime` (src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx)
  - `GeometryDrawingGame` (src/features/kangur/ui/components/GeometryDrawingGame.tsx)
- Transition lines:
  - `KangurLessonActivityInstanceRuntimeView` -> `KangurLessonActivityRuntime`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx:169
  - `KangurLessonActivityRuntime` -> `GeometryDrawingGame`: `rendererProps` -> `rendererProps` at src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:98

## Top Transition Details (Depth = 2)

### 1. KangurLessonActivityRuntime -> CalendarInteractiveGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> calendarSection
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:74

### 2. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> hideModeSwitch
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 3. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> initialMode
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 4. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> section
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 5. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> showHourHand
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 6. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> showMinuteHand
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 7. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> showTaskTitle
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 8. KangurLessonActivityRuntime -> ClockTrainingGame

- Score: 132
- Root fanout: 9
- Prop mapping: rendererProps -> showTimeDisplay
- Location: src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:83

### 9. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> action
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 10. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> description
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 11. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> progressLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 12. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> questLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 13. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> rewardAccent
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 14. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> rewardLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

### 15. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> title
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
