---
owner: 'Platform Team'
last_reviewed: '2026-04-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-14T00:41:04.093Z

## Snapshot

- Scanned source files: 7311
- JSX files scanned: 2541
- Components detected: 4466
- Components forwarding parent props (hotspot threshold): 76
- Components forwarding parent props (any): 179
- Resolved forwarded transitions: 311
- Candidate chains (depth >= 2): 311
- Candidate chains (depth >= 3): 9
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 13
- Hotspot forwarding components backlog size: 76

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 134 |
| `shared-ui` | 9 |
| `feature:integrations` | 8 |
| `feature:products` | 6 |
| `feature:ai` | 4 |
| `feature:case-resolver` | 4 |
| `feature:admin` | 3 |
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
| 6 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 7 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 8 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |
| 9 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 2 | 6 | no | yes |
| 10 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 6 | no | yes |
| 11 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 2 | 5 | no | yes |
| 12 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 2 | 3 | no | yes |
| 13 | `CaseResolverNestedScopeToggle` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 14 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 15 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 2 | 3 | no | yes |
| 16 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 2 | 3 | no | yes |
| 17 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |
| 18 | `OperationSelectorRecommendationChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 3 | no | yes |
| 19 | `LessonsCatalogEmptyStateWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 2 | 3 | no | yes |
| 20 | `PlaywrightEngineSettingsModal` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx` | 2 | 3 | no | yes |
| 21 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 2 | 2 | no | yes |
| 22 | `CaseResolverContextNotice` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 2 | no | yes |
| 23 | `RunDeliveryLogSection` | `src/features/filemaker/pages/campaign-run-sections/RunDeliveryLogSection.tsx` | 2 | 2 | no | yes |
| 24 | `BrowserSessionCard` | `src/features/integrations/components/connections/integration-modal/IntegrationSettingsContent.tsx` | 2 | 2 | no | yes |
| 25 | `IntegrationSelectionLoadingState` | `src/features/integrations/components/listings/IntegrationSelectionLoadingState.tsx` | 2 | 2 | no | yes |
| 26 | `ListingSettingsModalProvider` | `src/features/integrations/components/listings/ListingSettingsModalProvider.tsx` | 2 | 2 | no | yes |
| 27 | `TraderaQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 28 | `VintedQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/VintedQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 29 | `SocialPostEditorModal` | `src/features/kangur/social/admin/workspace/SocialPost.EditorModal.tsx` | 2 | 2 | no | yes |
| 30 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 2 | no | yes |
| 31 | `KangurLanguageSwitcherMenu` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 32 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 33 | `KangurLessonActivityInstanceRuntimeView` | `src/features/kangur/ui/components/KangurLessonActivityInstanceRuntime.tsx` | 2 | 2 | no | yes |
| 34 | `KangurNavActionButton` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 2 | 2 | no | yes |
| 35 | `PointerDraggableBall` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.Shared.tsx` | 2 | 2 | no | yes |
| 36 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx` | 2 | 2 | no | yes |
| 37 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 38 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 2 | 2 | no | yes |
| 39 | `KangurGameQuestionAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameQuestionWidget.tsx` | 2 | 2 | no | yes |
| 40 | `OperationSelectorPriorityChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 41 | `OperationSelectorCard` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 2 | no | yes |
| 42 | `KangurLearnerProfileHeroAuthActions` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget.tsx` | 2 | 2 | no | yes |
| 43 | `KangurLearnerProfileOverviewAvatarPicker` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 2 | no | yes |
| 44 | `KangurLessonsCatalogWidgetEmptyState` | `src/features/kangur/ui/components/lesson-library/KangurLessonsCatalogWidget.tsx` | 2 | 2 | no | yes |
| 45 | `KangurResolvedPageIntroCardBody` | `src/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard.tsx` | 2 | 2 | no | yes |
| 46 | `KangurLessonActivityCompletedState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 2 | 2 | no | yes |
| 47 | `LearnerPasswordField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 48 | `LearnerStatusField` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 2 | 2 | no | yes |
| 49 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 2 | 2 | no | yes |
| 50 | `KangurSectionHeadingOptionalDescription` | `src/features/kangur/ui/design/primitives/KangurSectionHeading.tsx` | 2 | 2 | no | yes |
| 51 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 2 | 2 | no | yes |
| 52 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 53 | `LessonsDeferredEnhancements` | `src/features/kangur/ui/pages/lessons/LessonsDeferredEnhancements.tsx` | 2 | 2 | no | yes |
| 54 | `TextBlock` | `src/features/products/components/scans/ProductScanAmazonDetails.tsx` | 2 | 2 | no | yes |
| 55 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 2 | 2 | no | yes |
| 56 | `KangurLessonActivityRuntime` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx` | 1 | 9 | no | yes |
| 57 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 1 | 9 | no | yes |
| 58 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 1 | 8 | no | yes |
| 59 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 1 | 8 | no | yes |
| 60 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 1 | 7 | no | yes |
| 61 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 4 | no | yes |
| 62 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 1 | 3 | no | yes |
| 63 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 1 | 3 | no | yes |
| 64 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 1 | 3 | no | yes |
| 65 | `CanvasRunControlNotice` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 1 | 2 | no | no |
| 66 | `ProductListingItem` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx` | 1 | 2 | no | no |
| 67 | `AdminKangurLessonsManagerPage` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1 | 2 | no | no |
| 68 | `AgenticSortGameCallout` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 2 | no | no |
| 69 | `AlphabetLiteracyGame` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx` | 1 | 2 | no | no |
| 70 | `ColorHarmonyGame` | `src/features/kangur/ui/components/ColorHarmonyGame.tsx` | 1 | 2 | no | no |
| 71 | `LogicalReasoningIfThenGame` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx` | 1 | 2 | no | no |
| 72 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 2 | no | no |
| 73 | `PickAnswer` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.PickAnswer.tsx` | 1 | 2 | no | no |
| 74 | `ParentDashboardResolvedContent` | `src/features/kangur/ui/pages/ParentDashboard.tsx` | 1 | 2 | no | no |
| 75 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 1 | 2 | no | no |
| 76 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 77 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 2 | no | no |
| 78 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 1 | 1 | no | no |
| 79 | `AiPathsCanvasSectionBoundary` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx` | 1 | 1 | no | no |
| 80 | `PathsTabPanel` | `src/features/ai/ai-paths/components/ui-panels/PathsTabPanel.tsx` | 1 | 1 | no | no |
| 81 | `ClearPartySelectionButton` | `src/features/case-resolver/components/page/CaseResolverPartySelectField.tsx` | 1 | 1 | no | no |
| 82 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 83 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 84 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 1 | 1 | no | no |
| 85 | `CategoryMapperPage` | `src/features/integrations/pages/CategoryMapperPage.tsx` | 1 | 1 | no | no |
| 86 | `KangurSocialPipelineQueuePanel` | `src/features/kangur/social/admin/workspace/KangurSocialPipelineQueuePanel.tsx` | 1 | 1 | no | no |
| 87 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 1 | 1 | no | no |
| 88 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 1 | 1 | no | no |
| 89 | `FrontendRouteLoadingFallback` | `src/features/kangur/ui/FrontendRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 90 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 91 | `KangurFeatureRouteShell` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx` | 1 | 1 | no | no |
| 92 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 93 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 1 | no | no |
| 94 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 1 | 1 | no | no |
| 95 | `AgenticDocsHierarchyGame` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 1 | 1 | no | no |
| 96 | `AgenticLessonQuickCheck` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx` | 1 | 1 | no | no |
| 97 | `ActionMotionStrip` | `src/features/kangur/ui/components/EnglishAdverbsActionStudioGame.components.tsx` | 1 | 1 | no | no |
| 98 | `EnglishAdverbsActionStudioGame` | `src/features/kangur/ui/components/EnglishAdverbsActionStudioGame.tsx` | 1 | 1 | no | no |
| 99 | `EnglishAdverbsFrequencyRoutineGame` | `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx` | 1 | 1 | no | no |
| 100 | `EnglishArticlesDragDropGame` | `src/features/kangur/ui/components/EnglishArticlesDragDropGame.tsx` | 1 | 1 | no | no |
| 101 | `EnglishComparativesSuperlativesCrownGame` | `src/features/kangur/ui/components/EnglishComparativesSuperlativesCrownGame.tsx` | 1 | 1 | no | no |
| 102 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 1 | 1 | no | no |
| 103 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 1 | 1 | no | no |
| 104 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 1 | 1 | no | no |
| 105 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 1 | 1 | no | no |
| 106 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 1 | 1 | no | no |
| 107 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 1 | 1 | no | no |
| 108 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 1 | 1 | no | no |
| 109 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 1 | 1 | no | no |
| 110 | `KangurAiTutorGuestIntroPanel` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 1 | 1 | no | no |
| 111 | `KangurNavActionLink` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 1 | 1 | no | no |
| 112 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.shared.tsx` | 1 | 1 | no | no |
| 113 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.shared.tsx` | 1 | 1 | no | no |
| 114 | `LessonsLibraryTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 115 | `LessonsFocusTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 116 | `GameHomeTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 117 | `StandardTransitionSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 118 | `KangurRouteLoadingFallback` | `src/features/kangur/ui/components/KangurRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 119 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 120 | `LogicalPatternsWorkshopGame` | `src/features/kangur/ui/components/LogicalPatternsWorkshopGame.tsx` | 1 | 1 | no | no |

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
| 42 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 43 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 44 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelCapabilityBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:658` |
| 45 | 92 | `CanvasSvgNode` | `CanvasSvgNodeDiagnosticsBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:732` |
| 46 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> onClick` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 47 | 88 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> className` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 48 | 88 | `TriggerButtonBar` | `DropdownMenuItem` | 4 | 2 | `disabled -> onSelect` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:443` |
| 49 | 84 | `CanvasSvgNode` | `CanvasSvgNodeTriggerAction` | 5 | 1 | `node -> node` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:741` |
| 50 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurMetricCard` | 4 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:361` |
| 51 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurMetricCard` | 4 | 1 | `dailyQuest -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:361` |
| 52 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurProgressBar` | 4 | 1 | `dailyQuest -> accent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:377` |
| 53 | 82 | `KangurLearnerProfileOverviewDailyQuestMetric` | `KangurProgressBar` | 4 | 1 | `dailyQuest -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:377` |
| 54 | 80 | `TriggerButtonBar` | `Button` | 4 | 2 | `disabled -> disabled` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:381` |
| 55 | 78 | `StructuredProductNameField` | `FormField` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:714` |
| 56 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> id` | `src/features/products/components/form/StructuredProductNameField.tsx:735` |
| 57 | 78 | `StructuredProductNameField` | `Input` | 3 | 2 | `fieldName -> onChange` | `src/features/products/components/form/StructuredProductNameField.tsx:735` |
| 58 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> aria-label` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 59 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> data-testid` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 60 | 72 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 3 | 1 | `laneIndex -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 61 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> description` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 62 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> headerExtras` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 63 | 72 | `KangurGameResultRecommendationSection` | `KangurRecommendationCard` | 3 | 1 | `activeSessionRecommendation -> title` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:317` |
| 64 | 72 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `KangurMetricCard` | 3 | 1 | `snapshot -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:326` |
| 65 | 72 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `KangurMetricCard` | 3 | 1 | `snapshot -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:326` |
| 66 | 72 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `KangurProgressBar` | 3 | 1 | `snapshot -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:341` |
| 67 | 68 | `NavTreeNode` | `Button` | 2 | 2 | `item -> aria-controls` | `src/features/admin/components/menu/NavTree.tsx:282` |
| 68 | 68 | `NavTreeNode` | `Tooltip` | 2 | 2 | `item -> content` | `src/features/admin/components/menu/NavTree.tsx:325` |
| 69 | 68 | `CanvasRunControlNotice` | `Card` | 2 | 2 | `variant -> className` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx:48` |
| 70 | 68 | `CaseResolverNestedScopeToggle` | `Switch` | 2 | 2 | `checked -> onCheckedChange` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx:154` |
| 71 | 68 | `CaseResolverCreateActionBar` | `Button` | 2 | 2 | `createContextTooltip -> title` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx:230` |
| 72 | 68 | `CaseResolverCreateActionBar` | `Button` | 2 | 2 | `createContextTooltip -> aria-label` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx:230` |
| 73 | 68 | `PlaywrightEngineSettingsModal` | `AppModal` | 2 | 2 | `onClose -> onOpenChange` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx:25` |
| 74 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> step` | `src/features/products/components/EditableCell.tsx:151` |
| 75 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> aria-label` | `src/features/products/components/EditableCell.tsx:151` |
| 76 | 62 | `KangurCmsBuilderInner` | `KangurCmsBuilderRightPanel` | 2 | 1 | `themePreviewMode -> themePreviewTheme` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:231` |
| 77 | 62 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 2 | 1 | `choice -> key` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 78 | 62 | `AddingSynthesisLaneChoiceCard` | `KangurAnswerChoiceCard` | 2 | 1 | `choice -> aria-label` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:528` |
| 79 | 62 | `HierarchyDraggableItem` | `HierarchyItemButton` | 2 | 1 | `item -> isSelected` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:230` |
| 80 | 62 | `AlphabetLiteracyGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AlphabetLiteracyGame.tsx:74` |

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
