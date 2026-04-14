---
owner: 'Platform Team'
last_reviewed: '2026-04-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-14T02:22:43.714Z

## Snapshot

- Scanned source files: 7312
- JSX files scanned: 2541
- Components detected: 4466
- Components forwarding parent props (hotspot threshold): 67
- Components forwarding parent props (any): 171
- Resolved forwarded transitions: 280
- Candidate chains (depth >= 2): 280
- Candidate chains (depth >= 3): 9
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 13
- Hotspot forwarding components backlog size: 67

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 128 |
| `shared-ui` | 9 |
| `feature:integrations` | 8 |
| `feature:products` | 6 |
| `feature:admin` | 3 |
| `feature:case-resolver` | 3 |
| `feature:ai` | 3 |
| `feature:playwright` | 2 |
| `shared-lib` | 2 |
| `feature:cms` | 2 |
| `app` | 2 |
| `feature:filemaker` | 1 |
| `feature:notesapp` | 1 |
| `shared` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 6 | no | yes |
| 2 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 3 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 4 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 5 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 6 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 2 | 5 | no | yes |
| 7 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 2 | 3 | no | yes |
| 8 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 9 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 2 | 3 | no | yes |
| 10 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |
| 11 | `OperationSelectorRecommendationChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 3 | no | yes |
| 12 | `LessonsCatalogEmptyStateWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 2 | 3 | no | yes |
| 13 | `PlaywrightEngineSettingsModal` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx` | 2 | 3 | no | yes |
| 14 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 2 | 2 | no | yes |
| 15 | `CaseResolverContextNotice` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 2 | no | yes |
| 16 | `RunDeliveryLogSection` | `src/features/filemaker/pages/campaign-run-sections/RunDeliveryLogSection.tsx` | 2 | 2 | no | yes |
| 17 | `BrowserSessionCard` | `src/features/integrations/components/connections/integration-modal/IntegrationSettingsContent.tsx` | 2 | 2 | no | yes |
| 18 | `IntegrationSelectionLoadingState` | `src/features/integrations/components/listings/IntegrationSelectionLoadingState.tsx` | 2 | 2 | no | yes |
| 19 | `ListingSettingsModalProvider` | `src/features/integrations/components/listings/ListingSettingsModalProvider.tsx` | 2 | 2 | no | yes |
| 20 | `TraderaQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 21 | `VintedQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/VintedQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 22 | `SocialPostEditorModal` | `src/features/kangur/social/admin/workspace/SocialPost.EditorModal.tsx` | 2 | 2 | no | yes |
| 23 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 2 | no | yes |
| 24 | `KangurLanguageSwitcherMenu` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 25 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 26 | `KangurLessonActivityInstanceRuntimeView` | `src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx` | 2 | 2 | no | yes |
| 27 | `KangurNavActionButton` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 2 | 2 | no | yes |
| 28 | `PointerDraggableBall` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 2 | 2 | no | yes |
| 29 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx` | 2 | 2 | no | yes |
| 30 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 31 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 2 | 2 | no | yes |
| 32 | `KangurGameQuestionAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget.tsx` | 2 | 2 | no | yes |
| 33 | `OperationSelectorPriorityChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 34 | `OperationSelectorCard` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 35 | `KangurLearnerProfileHeroAuthActions` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget.tsx` | 2 | 2 | no | yes |
| 36 | `KangurLessonsCatalogWidgetEmptyState` | `src/features/kangur/ui/components/lesson-library/KangurLessonsCatalogWidget.tsx` | 2 | 2 | no | yes |
| 37 | `KangurResolvedPageIntroCardBody` | `src/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard.tsx` | 2 | 2 | no | yes |
| 38 | `KangurLessonActivityCompletedState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 2 | 2 | no | yes |
| 39 | `LearnerPasswordField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 40 | `LearnerStatusField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 41 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 2 | 2 | no | yes |
| 42 | `KangurSectionHeadingOptionalDescription` | `src/features/kangur/ui/design/primitives/KangurSectionHeading.tsx` | 2 | 2 | no | yes |
| 43 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 2 | 2 | no | yes |
| 44 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 45 | `LessonsDeferredEnhancements` | `src/features/kangur/ui/pages/lessons/LessonsDeferredEnhancements.tsx` | 2 | 2 | no | yes |
| 46 | `TextBlock` | `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 2 | 2 | no | yes |
| 47 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 2 | 2 | no | yes |
| 48 | `KangurLessonActivityRuntime` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx` | 1 | 9 | no | yes |
| 49 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 1 | 9 | no | yes |
| 50 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 1 | 8 | no | yes |
| 51 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 1 | 8 | no | yes |
| 52 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 1 | 7 | no | yes |
| 53 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 4 | no | yes |
| 54 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 1 | 3 | no | yes |
| 55 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 1 | 3 | no | yes |
| 56 | `CanvasRunControlNotice` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 1 | 2 | no | no |
| 57 | `ProductListingItem` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx` | 1 | 2 | no | no |
| 58 | `AdminKangurLessonsManagerPage` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1 | 2 | no | no |
| 59 | `AgenticSortGameCallout` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 2 | no | no |
| 60 | `AlphabetLiteracyGame` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx` | 1 | 2 | no | no |
| 61 | `ColorHarmonyGame` | `src/features/kangur/ui/components/ColorHarmonyGame.tsx` | 1 | 2 | no | no |
| 62 | `LogicalReasoningIfThenGame` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx` | 1 | 2 | no | no |
| 63 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 2 | no | no |
| 64 | `PickAnswer` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer.tsx` | 1 | 2 | no | no |
| 65 | `ParentDashboardResolvedContent` | `src/features/kangur/ui/pages/ParentDashboard.tsx` | 1 | 2 | no | no |
| 66 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 1 | 2 | no | no |
| 67 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 68 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 2 | no | no |
| 69 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 1 | 1 | no | no |
| 70 | `AiPathsCanvasSectionBoundary` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx` | 1 | 1 | no | no |
| 71 | `PathsTabPanel` | `src/features/ai/ai-paths/components/ui-panels/PathsTabPanel.tsx` | 1 | 1 | no | no |
| 72 | `ClearPartySelectionButton` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 1 | 1 | no | no |
| 73 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 74 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 75 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 1 | 1 | no | no |
| 76 | `CategoryMapperPage` | `src/features/integrations/pages/CategoryMapperPage.tsx` | 1 | 1 | no | no |
| 77 | `KangurSocialPipelineQueuePanel` | `src/features/kangur/social/admin/workspace/KangurSocialPipelineQueuePanel.tsx` | 1 | 1 | no | no |
| 78 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 1 | 1 | no | no |
| 79 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 1 | 1 | no | no |
| 80 | `FrontendRouteLoadingFallback` | `src/features/kangur/ui/FrontendRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 81 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 82 | `KangurFeatureRouteShell` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx` | 1 | 1 | no | no |
| 83 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 84 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 1 | no | no |
| 85 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 1 | no | no |
| 86 | `AgenticDocsHierarchyGame` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 1 | 1 | no | no |
| 87 | `AgenticLessonQuickCheck` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx` | 1 | 1 | no | no |
| 88 | `ActionMotionStrip` | `src/features/kangur/ui/components/EnglishAdverbsActionStudioGame.components.tsx` | 1 | 1 | no | no |
| 89 | `EnglishAdverbsActionStudioGame` | `src/features/kangur/ui/components/EnglishAdverbsActionStudioGame.tsx` | 1 | 1 | no | no |
| 90 | `EnglishAdverbsFrequencyRoutineGame` | `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx` | 1 | 1 | no | no |
| 91 | `EnglishArticlesDragDropGame` | `src/features/kangur/ui/components/EnglishArticlesDragDropGame.tsx` | 1 | 1 | no | no |
| 92 | `EnglishComparativesSuperlativesCrownGame` | `src/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame.tsx` | 1 | 1 | no | no |
| 93 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 1 | 1 | no | no |
| 94 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 1 | 1 | no | no |
| 95 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 1 | 1 | no | no |
| 96 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 1 | 1 | no | no |
| 97 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 1 | 1 | no | no |
| 98 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 1 | 1 | no | no |
| 99 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 1 | 1 | no | no |
| 100 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 1 | 1 | no | no |
| 101 | `KangurAiTutorGuestIntroPanel` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 1 | 1 | no | no |
| 102 | `KangurNavActionLink` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 1 | 1 | no | no |
| 103 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.shared.tsx` | 1 | 1 | no | no |
| 104 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.shared.tsx` | 1 | 1 | no | no |
| 105 | `LessonsLibraryTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 106 | `LessonsFocusTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 107 | `GameHomeTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 108 | `StandardTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 109 | `KangurRouteLoadingFallback` | `src/features/kangur/ui/components/KangurRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 110 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 111 | `LogicalPatternsWorkshopGame` | `src/features/kangur/ui/components/LogicalPatternsWorkshopGame.tsx` | 1 | 1 | no | no |
| 112 | `MultiplicationArrayRoundView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 113 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1 | 1 | no | no |
| 114 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1 | 1 | no | no |
| 115 | `CompleteEquationCheckButton` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 1 | 1 | no | no |
| 116 | `CompleteEquationMobile` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 1 | 1 | no | no |
| 117 | `CompleteEquationDesktop` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 1 | 1 | no | no |
| 118 | `DragOverlay` | `src/features/kangur/ui/components/adding-ball-game/PointerDragProvider.tsx` | 1 | 1 | no | no |
| 119 | `SubtractingSvgAnimation` | `src/features/kangur/ui/components/animations/SubtractingAnimations.tsx` | 1 | 1 | no | no |
| 120 | `SubtractingNumberLineAnimation` | `src/features/kangur/ui/components/animations/SubtractingAnimations.tsx` | 1 | 1 | no | no |

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
| 19 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> accent` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 20 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> dataTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 21 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> durationText` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 22 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 23 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreText` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 24 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> subtitle` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 25 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
| 26 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpText` | `src/features/kangur/ui/components/ScoreHistory.tsx:325` |
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
| 42 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> onClick` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 43 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> className` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 44 | 88 | `TriggerButtonBar` | `DropdownMenuItem` | 4 | 2 | `disabled -> onSelect` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:443` |
| 45 | 80 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> disabled` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 46 | 78 | `StructuredProductNameField` | `FormField` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:714` |
| 47 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:735` |
| 48 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> onChange` | `src/features/products/components/form/StructuredProductNameField.tsx:735` |
| 49 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> aria-label` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 50 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> data-testid` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 51 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 52 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> description` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 53 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> headerExtras` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 54 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> title` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 55 | 68 | `NavTreeNode` | `Button` | 2 | 2 | `item -> aria-controls` | `src/features/admin/components/menu/NavTree.tsx:282` |
| 56 | 68 | `NavTreeNode` | `Tooltip` | 2 | 2 | `item -> content` | `src/features/admin/components/menu/NavTree.tsx:325` |
| 57 | 68 | `CanvasRunControlNotice` | `Card` | 2 | 2 | `variant -> className` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx:48` |
| 58 | 68 | `CaseResolverCreateActionBar` | `Button` | 2 | 2 | `createContextTooltip -> title` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx:245` |
| 59 | 68 | `CaseResolverCreateActionBar` | `Button` | 2 | 2 | `createContextTooltip -> aria-label` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx:245` |
| 60 | 68 | `PlaywrightEngineSettingsModal` | `AppModal` | 2 | 2 | `onClose -> onOpenChange` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx:25` |
| 61 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> step` | `src/features/products/components/EditableCell.tsx:151` |
| 62 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> aria-label` | `src/features/products/components/EditableCell.tsx:151` |
| 63 | 62 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 2 | 1 | `choice -> key` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 64 | 62 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 2 | 1 | `choice -> aria-label` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 65 | 62 | `HierarchyDraggableItem` | `HierarchyItemButton` | 2 | 1 | `item -> isSelected` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:232` |
| 66 | 62 | `AlphabetLiteracyGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx:74` |
| 67 | 62 | `AlphabetLiteracyGame` | `KangurButton` | 2 | 1 | `onFinish -> variant` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx:86` |
| 68 | 62 | `ColorHarmonyGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ColorHarmonyGame.tsx:254` |
| 69 | 62 | `ColorHarmonyGame` | `KangurButton` | 2 | 1 | `onFinish -> variant` | `src/features/kangur/ui/components/ColorHarmonyGame.tsx:266` |
| 70 | 62 | `LogicalReasoningIfThenGame` | `KangurInfoCard` | 2 | 1 | `copy -> aria-label` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx:486` |
| 71 | 62 | `MultiplicationArrayGroupCard` | `KangurAnswerChoiceCard` | 2 | 1 | `groupIndex -> data-testid` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx:396` |
| 72 | 62 | `MultiplicationArrayGroupCard` | `KangurAnswerChoiceCard` | 2 | 1 | `groupIndex -> onClick` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx:396` |
| 73 | 62 | `PickAnswer` | `PickAnswerSlot` | 2 | 1 | `round -> correctAnswer` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer.tsx:81` |
| 74 | 62 | `PickAnswer` | `PickAnswerFeedback` | 2 | 1 | `round -> correctAnswer` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer.tsx:90` |
| 75 | 62 | `KangurGameResultAssignmentBanner` | `KangurPracticeAssignmentBanner` | 2 | 1 | `resultPracticeAssignment -> assignment` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:212` |
| 76 | 62 | `KangurGameResultAssignmentBanner` | `KangurPracticeAssignmentBanner` | 2 | 1 | `resultPracticeAssignment -> mode` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:212` |
| 77 | 62 | `OperationSelectorRecommendationChip` | `KangurStatusChip` | 2 | 1 | `operation -> accent` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx:95` |
| 78 | 62 | `OperationSelectorRecommendationChip` | `KangurStatusChip` | 2 | 1 | `operation -> data-testid` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx:95` |
| 79 | 62 | `CatalogTab` | `KangurInfoCard` | 2 | 1 | `setSelectedGame -> onClick` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:195` |
| 80 | 62 | `CatalogTab` | `KangurButton` | 2 | 1 | `setSelectedGame -> onClick` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx:278` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `CalendarInteractiveGame` | 1 | 1 | `rendererProps -> rendererProps -> calendarSection` |
| 2 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> hideModeSwitch` |
| 3 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> initialMode` |
| 4 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> section` |
| 5 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showHourHand` |
| 6 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showMinuteHand` |
| 7 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showTaskTitle` |
| 8 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `ClockTrainingGame` | 1 | 1 | `rendererProps -> rendererProps -> showTimeDisplay` |
| 9 | 83 | 3 | `KangurLessonActivityInstanceRuntimeView` | `GeometryDrawingGame` | 1 | 1 | `rendererProps -> rendererProps -> rendererProps` |

## Top Chain Details (Depth >= 3)

### 1. KangurLessonActivityInstanceRuntimeView -> CalendarInteractiveGame

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

### 2. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 3. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 4. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 5. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 6. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 7. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 8. KangurLessonActivityInstanceRuntimeView -> ClockTrainingGame

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

### 9. KangurLessonActivityInstanceRuntimeView -> GeometryDrawingGame

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
