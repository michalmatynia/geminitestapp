---
owner: 'Platform Team'
last_reviewed: '2026-04-13'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-13T22:30:53.677Z

## Snapshot

- Scanned source files: 7311
- JSX files scanned: 2541
- Components detected: 4464
- Components forwarding parent props (hotspot threshold): 108
- Components forwarding parent props (any): 206
- Resolved forwarded transitions: 439
- Candidate chains (depth >= 2): 439
- Candidate chains (depth >= 3): 10
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 13
- Hotspot forwarding components backlog size: 108

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 152 |
| `feature:integrations` | 11 |
| `shared-ui` | 10 |
| `feature:products` | 7 |
| `feature:ai` | 5 |
| `feature:cms` | 4 |
| `feature:case-resolver` | 4 |
| `shared-lib` | 3 |
| `feature:admin` | 3 |
| `feature:playwright` | 2 |
| `app` | 2 |
| `feature:filemaker` | 1 |
| `feature:notesapp` | 1 |
| `shared` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 4 | 6 | no | yes |
| 2 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 3 | `ProductListActivityPill` | `src/features/products/components/list/ProductListActivityPill.tsx` | 4 | 5 | no | yes |
| 4 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 4 | 4 | no | yes |
| 5 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 4 | no | yes |
| 6 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 4 | no | yes |
| 7 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 4 | 4 | no | yes |
| 8 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 9 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 10 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 11 | `GenericPickerDropdownMenu` | `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx` | 4 | 4 | no | yes |
| 12 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 13 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 14 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 3 | 6 | no | yes |
| 15 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 3 | 6 | no | yes |
| 16 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 17 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 3 | 5 | no | yes |
| 18 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 19 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 20 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 21 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 22 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 3 | 3 | no | yes |
| 23 | `CatalogCategoryTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogCategoryTable.tsx` | 3 | 3 | no | yes |
| 24 | `CatalogEntriesTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogEntriesTable.tsx` | 3 | 3 | no | yes |
| 25 | `MappingsRulesTable` | `src/features/integrations/pages/marketplaces/tradera/components/MappingsRulesTable.tsx` | 3 | 3 | no | yes |
| 26 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 27 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 28 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 29 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 3 | 3 | no | yes |
| 30 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 31 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 3 | 3 | no | yes |
| 32 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 33 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 34 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 3 | 3 | no | yes |
| 35 | `DraggableClockSnapModeSwitch` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 36 | `DraggableClockSubmitArea` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 37 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 38 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 39 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 40 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 41 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 42 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |
| 43 | `PlayerProgressGuidedMomentumSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 7 | no | yes |
| 44 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 2 | 6 | no | yes |
| 45 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 6 | no | yes |
| 46 | `PlayerProgressNextBadgeSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 5 | no | yes |
| 47 | `PlayerProgressTopActivitySection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 4 | no | yes |
| 48 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 2 | 3 | no | yes |
| 49 | `CaseResolverNestedScopeToggle` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 50 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 51 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 2 | 3 | no | yes |
| 52 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 2 | 3 | no | yes |
| 53 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |
| 54 | `OperationSelectorRecommendationChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 3 | no | yes |
| 55 | `LessonsCatalogEmptyStateWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 2 | 3 | no | yes |
| 56 | `PlaywrightEngineSettingsModal` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx` | 2 | 3 | no | yes |
| 57 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 2 | 2 | no | yes |
| 58 | `CaseResolverContextNotice` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 2 | no | yes |
| 59 | `RunDeliveryLogSection` | `src/features/filemaker/pages/campaign-run-sections/RunDeliveryLogSection.tsx` | 2 | 2 | no | yes |
| 60 | `BrowserSessionCard` | `src/features/integrations/components/connections/integration-modal/IntegrationSettingsContent.tsx` | 2 | 2 | no | yes |
| 61 | `IntegrationSelectionLoadingState` | `src/features/integrations/components/listings/IntegrationSelectionLoadingState.tsx` | 2 | 2 | no | yes |
| 62 | `ListingSettingsModalProvider` | `src/features/integrations/components/listings/ListingSettingsModalProvider.tsx` | 2 | 2 | no | yes |
| 63 | `TraderaQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 64 | `VintedQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/VintedQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 65 | `SocialPostEditorModal` | `src/features/kangur/social/admin/workspace/SocialPost.EditorModal.tsx` | 2 | 2 | no | yes |
| 66 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 2 | no | yes |
| 67 | `KangurLanguageSwitcherMenu` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 68 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 69 | `KangurLessonActivityInstanceRuntimeView` | `src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx` | 2 | 2 | no | yes |
| 70 | `KangurNavActionButton` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 2 | 2 | no | yes |
| 71 | `PointerDraggableBall` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 2 | 2 | no | yes |
| 72 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx` | 2 | 2 | no | yes |
| 73 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 74 | `KangurGameQuestionAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget.tsx` | 2 | 2 | no | yes |
| 75 | `OperationSelectorPriorityChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 76 | `OperationSelectorCard` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 77 | `KangurLearnerProfileHeroAuthActions` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget.tsx` | 2 | 2 | no | yes |
| 78 | `KangurLearnerProfileOverviewAvatarPicker` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 2 | no | yes |
| 79 | `KangurLessonsCatalogWidgetEmptyState` | `src/features/kangur/ui/components/lesson-library/KangurLessonsCatalogWidget.tsx` | 2 | 2 | no | yes |
| 80 | `KangurResolvedPageIntroCardBody` | `src/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard.tsx` | 2 | 2 | no | yes |
| 81 | `KangurLessonActivityCompletedState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 2 | 2 | no | yes |
| 82 | `LearnerPasswordField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 83 | `LearnerStatusField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 84 | `KangurSectionHeadingOptionalDescription` | `src/features/kangur/ui/design/primitives/KangurSectionHeading.tsx` | 2 | 2 | no | yes |
| 85 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 86 | `LessonsDeferredEnhancements` | `src/features/kangur/ui/pages/lessons/LessonsDeferredEnhancements.tsx` | 2 | 2 | no | yes |
| 87 | `TextBlock` | `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 2 | 2 | no | yes |
| 88 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 2 | 2 | no | yes |
| 89 | `RouteRow` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 2 | 2 | no | yes |
| 90 | `KangurLessonActivityRuntime` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx` | 1 | 9 | no | yes |
| 91 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 1 | 9 | no | yes |
| 92 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 1 | 8 | no | yes |
| 93 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 1 | 7 | no | yes |
| 94 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 4 | no | yes |
| 95 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 1 | 3 | no | yes |
| 96 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 1 | 3 | no | yes |
| 97 | `CanvasRunControlNotice` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 1 | 2 | no | no |
| 98 | `ProductListingItem` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx` | 1 | 2 | no | no |
| 99 | `AdminKangurLessonsManagerPage` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1 | 2 | no | no |
| 100 | `AgenticSortGameCallout` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 2 | no | no |
| 101 | `AlphabetLiteracyGame` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx` | 1 | 2 | no | no |
| 102 | `ColorHarmonyGame` | `src/features/kangur/ui/components/ColorHarmonyGame.tsx` | 1 | 2 | no | no |
| 103 | `LogicalReasoningIfThenGame` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx` | 1 | 2 | no | no |
| 104 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 2 | no | no |
| 105 | `PickAnswer` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer.tsx` | 1 | 2 | no | no |
| 106 | `ParentDashboardResolvedContent` | `src/features/kangur/ui/pages/ParentDashboard.tsx` | 1 | 2 | no | no |
| 107 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 1 | 2 | no | no |
| 108 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 109 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 2 | no | no |
| 110 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 1 | 1 | no | no |
| 111 | `AiPathsCanvasSectionBoundary` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx` | 1 | 1 | no | no |
| 112 | `PathsTabPanel` | `src/features/ai/ai-paths/components/ui-panels/PathsTabPanel.tsx` | 1 | 1 | no | no |
| 113 | `ClearPartySelectionButton` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 1 | 1 | no | no |
| 114 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 115 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 116 | `CategoryMapperPage` | `src/features/integrations/pages/CategoryMapperPage.tsx` | 1 | 1 | no | no |
| 117 | `KangurSocialPipelineQueuePanel` | `src/features/kangur/social/admin/workspace/KangurSocialPipelineQueuePanel.tsx` | 1 | 1 | no | no |
| 118 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 1 | 1 | no | no |
| 119 | `FrontendRouteLoadingFallback` | `src/features/kangur/ui/FrontendRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 120 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |

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
| 9 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> action` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 10 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 11 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> progressLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 12 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> questLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 13 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardAccent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 14 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 15 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82` |
| 16 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:85` |
| 17 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> targetPageKey` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:85` |
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
| 35 | 112 | `KangurLearnerProfileOperationCard` | `KangurInfoCard` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:138` |
| 36 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 37 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> transitionSourceId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 38 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> dataTestId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 39 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 40 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 41 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 42 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 43 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 44 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelCapabilityBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:658` |
| 45 | 92 | `CanvasSvgNode` | `CanvasSvgNodeDiagnosticsBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:732` |
| 46 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> onClick` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 47 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> className` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 48 | 88 | `TriggerButtonBar` | `DropdownMenuItem` | 4 | 2 | `disabled -> onSelect` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:443` |
| 49 | 84 | `CanvasSvgNode` | `CanvasSvgNodeTriggerAction` | 5 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:741` |
| 50 | 82 | `PlayerProgressNextBadgeSection` | `KangurProgressHighlightHeader` | 4 | 1 | `nextBadge -> description` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:119` |
| 51 | 82 | `PlayerProgressNextBadgeSection` | `KangurProgressHighlightHeader` | 4 | 1 | `nextBadge -> title` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:119` |
| 52 | 82 | `PlayerProgressNextBadgeSection` | `KangurProgressHighlightChip` | 4 | 1 | `nextBadge -> label` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:129` |
| 53 | 82 | `PlayerProgressNextBadgeSection` | `KangurProgressHighlightBar` | 4 | 1 | `nextBadge -> value` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:131` |
| 54 | 82 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightHeader` | 4 | 1 | `guidedMomentum -> description` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:159` |
| 55 | 82 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightHeader` | 4 | 1 | `guidedMomentum -> title` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:159` |
| 56 | 82 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightChip` | 4 | 1 | `guidedMomentum -> label` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:174` |
| 57 | 82 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightBar` | 4 | 1 | `guidedMomentum -> value` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:176` |
| 58 | 82 | `KangurLearnerAssignmentsMetrics` | `KangurMetricCard` | 4 | 1 | `fallbackCopy -> description` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx:397` |
| 59 | 82 | `KangurLearnerAssignmentsMetrics` | `KangurMetricCard` | 4 | 1 | `fallbackCopy -> label` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx:397` |
| 60 | 82 | `KangurLearnerAssignmentsMetrics` | `KangurSummaryPanel` | 4 | 1 | `fallbackCopy -> description` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx:430` |
| 61 | 82 | `KangurLearnerAssignmentsMetrics` | `KangurSummaryPanel` | 4 | 1 | `fallbackCopy -> label` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx:430` |
| 62 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurMetricCard` | 4 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:361` |
| 63 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurMetricCard` | 4 | 1 | `dailyQuest -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:361` |
| 64 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurProgressBar` | 4 | 1 | `dailyQuest -> accent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:377` |
| 65 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurProgressBar` | 4 | 1 | `dailyQuest -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:377` |
| 66 | 80 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> disabled` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 67 | 78 | `StructuredProductNameField` | `FormField` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:706` |
| 68 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:727` |
| 69 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> onChange` | `src/features/products/components/form/StructuredProductNameField.tsx:727` |
| 70 | 78 | `InstanceSettingsPanel` | `SelectSimple` | 3 | 2 | `id -> onValueChange` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx:132` |
| 71 | 78 | `InstanceSettingsPanel` | `ToggleRow` | 3 | 2 | `id -> onCheckedChange` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx:152` |
| 72 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> aria-label` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:533` |
| 73 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> data-testid` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:533` |
| 74 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:533` |
| 75 | 72 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightHeader` | 3 | 1 | `translations -> description` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:159` |
| 76 | 72 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightHeader` | 3 | 1 | `translations -> eyebrow` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:159` |
| 77 | 72 | `PlayerProgressGuidedMomentumSection` | `KangurProgressHighlightHeader` | 3 | 1 | `translations -> title` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:159` |
| 78 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> description` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 79 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> headerExtras` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 80 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> title` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 83 | 3 | `KangurLaunchableGameInstanceRuntime` | `KangurLessonActivityRuntimeProvider` | 1 | 1 | `onFinish -> onFinish -> onFinish` |
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

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onFinish
- Component path:
  - `KangurLaunchableGameInstanceRuntime` (src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx)
  - `KangurLessonActivityInstanceRuntime` (src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx)
  - `KangurLessonActivityRuntimeProvider` (src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx)
- Transition lines:
  - `KangurLaunchableGameInstanceRuntime` -> `KangurLessonActivityInstanceRuntime`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx:409
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
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 10. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> description
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 11. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> progressLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 12. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> questLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 13. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> rewardAccent
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 14. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> rewardLabel
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

### 15. DailyQuestCard -> KangurDailyQuestHighlightCardContent

- Score: 132
- Root fanout: 9
- Prop mapping: dailyQuest -> title
- Location: src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:82

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
