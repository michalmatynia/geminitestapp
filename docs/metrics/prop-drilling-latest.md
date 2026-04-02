---
owner: 'Platform Team'
last_reviewed: '2026-04-01'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-01T22:13:14.653Z

## Snapshot

- Scanned source files: 6562
- JSX files scanned: 2428
- Components detected: 4226
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 304
- Resolved forwarded transitions: 1508
- Candidate chains (depth >= 2): 1508
- Candidate chains (depth >= 3): 322
- High-priority chains (depth >= 4): 95
- Unknown spread forwarding edges: 9
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 267 |
| `feature:filemaker` | 14 |
| `shared-ui` | 6 |
| `feature:admin` | 4 |
| `feature:products` | 4 |
| `feature:cms` | 4 |
| `feature:ai` | 2 |
| `feature:integrations` | 1 |
| `feature:notesapp` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurMusicPianoRollControls` | `src/features/kangur/ui/components/music/KangurMusicPianoRollControls.tsx` | 18 | 31 | no | yes |
| 2 | `AddingSynthesisPlayingView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 18 | 27 | no | yes |
| 3 | `KangurParentDashboardAssignmentsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx` | 17 | 18 | no | yes |
| 4 | `MailThreadsSection` | `src/features/filemaker/pages/mail-page-sections/MailThreadsSection.tsx` | 16 | 26 | no | yes |
| 5 | `LaunchSchedulingSection` | `src/features/filemaker/pages/campaign-edit-sections/LaunchSchedulingSection.tsx` | 16 | 16 | no | yes |
| 6 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 14 | 16 | no | yes |
| 7 | `KangurAssignmentManagerCatalogSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 13 | 28 | no | yes |
| 8 | `KangurPrimaryNavigationAuthActions` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 13 | 14 | no | yes |
| 9 | `DeliveryGovernanceSection` | `src/features/filemaker/pages/campaign-edit-sections/DeliveryGovernanceSection.tsx` | 12 | 13 | no | yes |
| 10 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.components.tsx` | 12 | 12 | no | yes |
| 11 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 12 | 12 | no | yes |
| 12 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 13 | `KangurGameOperationSelectorTrainingSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorTrainingSection.tsx` | 11 | 11 | no | yes |
| 14 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 10 | 17 | no | yes |
| 15 | `MailAccountSettingsSection` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.tsx` | 10 | 15 | no | yes |
| 16 | `KangurAssignmentManagerListsSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 14 | no | yes |
| 17 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 10 | 14 | no | yes |
| 18 | `MultiplicationArrayRoundView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 10 | 11 | no | yes |
| 19 | `KangurAssignmentManagerCatalogActions` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 11 | no | yes |
| 20 | `LessonActivityShellBody` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 10 | 11 | no | yes |
| 21 | `KangurGameOperationSelectorQuickPracticeSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx` | 9 | 14 | no | yes |
| 22 | `AddingSynthesisPlayingBoard` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 9 | 12 | no | yes |
| 23 | `KangurGameHomeQuestPanel` | `src/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget.tsx` | 9 | 11 | no | yes |
| 24 | `KangurParentDashboardMonitoringHistorySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 9 | 10 | no | yes |
| 25 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 9 | 9 | no | yes |
| 26 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 27 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 28 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 8 | 17 | no | yes |
| 29 | `DivisionGroupsBoard` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 16 | no | yes |
| 30 | `DivisionGameRoundView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 15 | no | yes |
| 31 | `SubtractingGameRoundView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 15 | no | yes |
| 32 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 33 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 34 | `DivisionGroupsSummaryView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 10 | no | yes |
| 35 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 36 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 37 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 9 | no | yes |
| 38 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 39 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 8 | 9 | no | yes |
| 40 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 41 | `HierarchyList` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 8 | no | yes |
| 42 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 43 | `DivisionGroupsPool` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 7 | 9 | no | yes |
| 44 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 45 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 46 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 7 | 7 | no | yes |
| 47 | `NumberBalanceRushTray` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 7 | 7 | no | yes |
| 48 | `AiTutorGuardrailsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 6 | 14 | no | yes |
| 49 | `KangurAssignmentManagerSuggestedCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 50 | `KangurAssignmentManagerCatalogCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 51 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 6 | 11 | no | yes |
| 52 | `DivisionGroupsGroupGrid` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 6 | 8 | no | yes |
| 53 | `AddingSynthesisPlayingSidebar` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 6 | 8 | no | yes |
| 54 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 55 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 56 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 57 | `KangurPrimaryNavigationTopBarContent` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 6 | 6 | no | yes |
| 58 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 59 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 60 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 10 | no | yes |
| 61 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 62 | `KangurLearnerProfileOverviewMetrics` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 5 | 10 | no | yes |
| 63 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 64 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 65 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 66 | `DivisionGroupsDropZone` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 5 | 6 | no | yes |
| 67 | `AddingSynthesisLaneChoices` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 5 | 6 | no | yes |
| 68 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 69 | `KangurPrimaryNavigationGuestPlayerNameAction` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 5 | 6 | no | yes |
| 70 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 71 | `MultiplicationArrayGroups` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 5 | no | yes |
| 72 | `AddingSynthesisPlayingHud` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 5 | 5 | no | yes |
| 73 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 74 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 4 | 10 | no | yes |
| 75 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 76 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 77 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 78 | `KangurParentDashboardMasterySummarySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx` | 4 | 7 | no | yes |
| 79 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 80 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 81 | `AiTutorUiModeSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 6 | no | yes |
| 82 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 83 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 84 | `NumberBalanceRushTileZone` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 5 | no | yes |
| 85 | `AddingSynthesisSummaryView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 4 | 5 | no | yes |
| 86 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 87 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 88 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 89 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 90 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 91 | `AudienceSourceSection` | `src/features/filemaker/pages/campaign-edit-sections/AudienceSourceSection.tsx` | 4 | 4 | no | yes |
| 92 | `AddingSynthesisIntroView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 4 | 4 | no | yes |
| 93 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 94 | `KangurAssignmentsList` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 95 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 96 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 97 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 98 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 99 | `AiTutorAvailabilityRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 100 | `AiTutorSaveAction` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 101 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 102 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 103 | `KangurParentDashboardDailyQuestSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx` | 3 | 15 | no | yes |
| 104 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 105 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 3 | 8 | no | yes |
| 106 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 107 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 3 | 5 | no | yes |
| 108 | `KangurLearnerProfileActivityPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 109 | `KangurLearnerProfileOperationsPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 110 | `NavTreeItem` | `src/features/admin/components/menu/NavTree.tsx` | 3 | 4 | no | yes |
| 111 | `DivisionGameChoicesGrid` | `src/features/kangur/ui/components/DivisionGame.tsx` | 3 | 4 | no | yes |
| 112 | `ShapeRecognitionFinishedView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 3 | 4 | no | yes |
| 113 | `SubtractingGameChoicesGrid` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 3 | 4 | no | yes |
| 114 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 115 | `KangurGameOperationSelectorOperationSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorOperationSection.tsx` | 3 | 4 | no | yes |
| 116 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 117 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 118 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 119 | `RecentRunsSection` | `src/features/filemaker/pages/campaign-edit-sections/CampaignInsightsSections.tsx` | 3 | 3 | no | yes |
| 120 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 262 | `AiTutorConfiguredPanel` | `AiTutorPanelHeader` | 22 | 1 | `state -> sectionSummary` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515` |
| 2 | 262 | `AiTutorConfiguredPanel` | `AiTutorPanelHeader` | 22 | 1 | `state -> sectionTitle` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515` |
| 3 | 262 | `AiTutorConfiguredPanel` | `AiTutorPanelHeader` | 22 | 1 | `state -> title` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515` |
| 4 | 262 | `AiTutorConfiguredPanel` | `AiTutorMoodSection` | 22 | 1 | `state -> presentation` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:520` |
| 5 | 262 | `AiTutorConfiguredPanel` | `AiTutorUsageSection` | 22 | 1 | `state -> presentation` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:524` |
| 6 | 262 | `AiTutorConfiguredPanel` | `AiTutorAvailabilityRow` | 22 | 1 | `state -> compactActionClassName` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528` |
| 7 | 262 | `AiTutorConfiguredPanel` | `AiTutorAvailabilityRow` | 22 | 1 | `state -> enabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528` |
| 8 | 262 | `AiTutorConfiguredPanel` | `AiTutorAvailabilityRow` | 22 | 1 | `state -> isTemporarilyDisabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528` |
| 9 | 262 | `AiTutorConfiguredPanel` | `AiTutorAvailabilityRow` | 22 | 1 | `state -> onToggleEnabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528` |
| 10 | 262 | `AiTutorConfiguredPanel` | `AiTutorGuardrailsSection` | 22 | 1 | `state -> controlsDisabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535` |
| 11 | 262 | `AiTutorConfiguredPanel` | `AiTutorGuardrailsSection` | 22 | 1 | `state -> formBindings` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535` |
| 12 | 262 | `AiTutorConfiguredPanel` | `AiTutorGuardrailsSection` | 22 | 1 | `state -> hintDepthFieldId` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535` |
| 13 | 262 | `AiTutorConfiguredPanel` | `AiTutorGuardrailsSection` | 22 | 1 | `state -> proactiveNudgesFieldId` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535` |
| 14 | 262 | `AiTutorConfiguredPanel` | `AiTutorGuardrailsSection` | 22 | 1 | `state -> testAccessModeFieldId` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535` |
| 15 | 262 | `AiTutorConfiguredPanel` | `AiTutorUiModeSection` | 22 | 1 | `state -> controlsDisabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543` |
| 16 | 262 | `AiTutorConfiguredPanel` | `AiTutorUiModeSection` | 22 | 1 | `state -> formBindings` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543` |
| 17 | 262 | `AiTutorConfiguredPanel` | `AiTutorUiModeSection` | 22 | 1 | `state -> uiModeFieldId` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543` |
| 18 | 262 | `AiTutorConfiguredPanel` | `AiTutorSaveAction` | 22 | 1 | `state -> feedback` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:549` |
| 19 | 262 | `AiTutorConfiguredPanel` | `AiTutorSaveAction` | 22 | 1 | `state -> fullWidthActionClassName` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:549` |
| 20 | 262 | `AiTutorConfiguredPanel` | `AiTutorSaveAction` | 22 | 1 | `state -> isSaving` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:549` |
| 21 | 262 | `AiTutorConfiguredPanel` | `AiTutorSaveAction` | 22 | 1 | `state -> isTemporarilyDisabled` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:549` |
| 22 | 262 | `AiTutorConfiguredPanel` | `AiTutorSaveAction` | 22 | 1 | `state -> onSave` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:549` |
| 23 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 24 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 25 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 26 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 27 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 28 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 29 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 30 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 31 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 32 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 33 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 34 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:357` |
| 35 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:366` |
| 36 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:366` |
| 37 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 38 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 39 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 40 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 41 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 42 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 43 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 44 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 45 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 46 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 47 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 48 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:378` |
| 49 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:387` |
| 50 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.overlays.tsx:387` |
| 51 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> action` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 52 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> description` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 53 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> footer` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 54 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> progressAccent` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 55 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> progressLabel` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 56 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> questLabel` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 57 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> rewardAccent` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 58 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> rewardLabel` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 59 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurDailyQuestHighlightCardContent` | 11 | 1 | `dailyQuestPresentation -> title` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:346` |
| 60 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurTransitionLink` | 11 | 1 | `dailyQuestPresentation -> href` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:350` |
| 61 | 152 | `KangurParentDashboardDailyQuestSection` | `KangurTransitionLink` | 11 | 1 | `dailyQuestPresentation -> targetPageKey` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx:350` |
| 62 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsLoading` | 10 | 1 | `state -> loadingLabel` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:244` |
| 63 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsError` | 10 | 1 | `state -> error` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:248` |
| 64 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> emptyDescription` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 65 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> summary` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 66 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> title` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 67 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> zeroCountLabel` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 68 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> items` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 69 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> title` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 70 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> summary` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 71 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> onItemActionClick` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 72 | 132 | `KangurLessonActivityRuntime` | `CalendarInteractiveGame` | 9 | 1 | `rendererProps -> calendarSection` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:73` |
| 73 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> hideModeSwitch` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 74 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> initialMode` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 75 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> section` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 76 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showHourHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 77 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showMinuteHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 78 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTaskTitle` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 79 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTimeDisplay` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 80 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> action` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> summary -> summary -> description` |
| 2 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> title -> title -> title` |
| 3 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 4 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 5 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 6 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 7 | 205 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 3 | 1 | `t -> t -> t -> t -> aria-label` |
| 8 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> noteId -> key` |
| 9 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> aria-disabled` |
| 10 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> interactive` |
| 11 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> onClick` |
| 12 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> uiModeFieldId -> id -> id` |
| 13 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 14 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 15 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 16 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id -> id` |
| 17 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id -> id` |
| 18 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> hintDepthFieldId -> id -> id` |
| 19 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 20 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 21 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 22 | 185 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 1 | 1 | `onChoose -> onChoose -> onChoose -> onChoose -> onClick` |
| 23 | 176 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 4 | 1 | `translations -> translations -> translations -> ariaLabel` |
| 24 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> summary -> summary` |
| 25 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> title -> title` |
| 26 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> items -> items` |
| 27 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> emptyDescription -> description` |
| 28 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurSummaryPanel` | 10 | 1 | `state -> error -> description` |
| 29 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> loadingLabel -> description` |
| 30 | 166 | 4 | `AddingSynthesisGame` | `KangurButton` | 3 | 1 | `onFinish -> onFinish -> onFinish -> onClick` |
| 31 | 166 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 3 | 1 | `t -> t -> t -> t` |
| 32 | 166 | 4 | `KangurAssignmentManagerListsSection` | `KangurPanelIntro` | 3 | 1 | `translations -> title -> title -> title` |
| 33 | 156 | 4 | `AgenticDocsHierarchyGame` | `HierarchyItemButton` | 2 | 1 | `accent -> accent -> accent -> accent` |
| 34 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 35 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isLocked -> isLocked -> isLocked -> isDragDisabled` |
| 36 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onClick` |
| 37 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onSelect` |
| 38 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `selectedTokenId -> selectedTokenId -> selectedTokenId -> isSelected` |
| 39 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 40 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 41 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> key` |
| 42 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> noteId` |
| 43 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback` |
| 44 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 45 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 46 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 47 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 48 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 49 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 50 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 51 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 52 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 53 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onSave -> onClick` |
| 54 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 55 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isSaving -> disabled` |
| 56 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> fullWidthActionClassName -> className` |
| 57 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> uiModeFieldId -> id` |
| 58 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 59 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 60 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 61 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id` |
| 62 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id` |
| 63 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> hintDepthFieldId -> id` |
| 64 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> checked` |
| 65 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 66 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 67 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 68 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> disabled` |
| 69 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 70 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 71 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onToggleEnabled -> onClick` |
| 72 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 73 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> enabled -> variant` |
| 74 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> compactActionClassName -> className` |
| 75 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> accent` |
| 76 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> data-mood-id` |
| 77 | 156 | 4 | `AiTutorConfigPanel` | `KangurLabeledValueSummary` | 2 | 1 | `state -> state -> presentation -> value` |
| 78 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> title -> title` |
| 79 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionTitle -> eyebrow` |
| 80 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionSummary -> description` |

## Top Chain Details (Depth >= 3)

### 1. KangurPriorityAssignmentsContent -> KangurPanelIntro

- Score: 236
- Depth: 4
- Root fanout: 10
- Prop path: state -> summary -> summary -> description
- Component path:
  - `KangurPriorityAssignmentsContent` (src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurAssignmentsListShell` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurPanelIntro` (src/features/kangur/ui/design/primitives/KangurPanelIntro.tsx)
- Transition lines:
  - `KangurPriorityAssignmentsContent` -> `KangurAssignmentsList`: `state` -> `summary` at src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263
  - `KangurAssignmentsList` -> `KangurAssignmentsListShell`: `summary` -> `summary` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:640
  - `KangurAssignmentsListShell` -> `KangurPanelIntro`: `summary` -> `description` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:371

### 2. KangurPriorityAssignmentsContent -> KangurPanelIntro

- Score: 236
- Depth: 4
- Root fanout: 10
- Prop path: state -> title -> title -> title
- Component path:
  - `KangurPriorityAssignmentsContent` (src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurAssignmentsListShell` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurPanelIntro` (src/features/kangur/ui/design/primitives/KangurPanelIntro.tsx)
- Transition lines:
  - `KangurPriorityAssignmentsContent` -> `KangurAssignmentsList`: `state` -> `title` at src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263
  - `KangurAssignmentsList` -> `KangurAssignmentsListShell`: `title` -> `title` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:640
  - `KangurAssignmentsListShell` -> `KangurPanelIntro`: `title` -> `title` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:371

### 3. KangurAssignmentManagerCatalogSection -> KangurButton

- Score: 216
- Depth: 4
- Root fanout: 8
- Prop path: translations -> translations -> translations -> aria-label
- Component path:
  - `KangurAssignmentManagerCatalogSection` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogSection` -> `KangurAssignmentManagerCatalogCard`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:411
  - `KangurAssignmentManagerCatalogCard` -> `KangurAssignmentManagerCatalogActions`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:244
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `translations` -> `aria-label` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:137

### 4. KangurAssignmentManagerCatalogSection -> KangurButton

- Score: 216
- Depth: 4
- Root fanout: 8
- Prop path: translations -> translations -> translations -> title
- Component path:
  - `KangurAssignmentManagerCatalogSection` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogSection` -> `KangurAssignmentManagerCatalogCard`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:411
  - `KangurAssignmentManagerCatalogCard` -> `KangurAssignmentManagerCatalogActions`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:244
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `translations` -> `title` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:137

### 5. KangurAssignmentManagerCatalogSection -> KangurButton

- Score: 216
- Depth: 4
- Root fanout: 8
- Prop path: translations -> translations -> translations -> aria-label
- Component path:
  - `KangurAssignmentManagerCatalogSection` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerSuggestedCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogSection` -> `KangurAssignmentManagerSuggestedCard`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:337
  - `KangurAssignmentManagerSuggestedCard` -> `KangurAssignmentManagerCatalogActions`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:191
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `translations` -> `aria-label` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:137

### 6. KangurAssignmentManagerCatalogSection -> KangurButton

- Score: 216
- Depth: 4
- Root fanout: 8
- Prop path: translations -> translations -> translations -> title
- Component path:
  - `KangurAssignmentManagerCatalogSection` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerSuggestedCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogSection` -> `KangurAssignmentManagerSuggestedCard`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:337
  - `KangurAssignmentManagerSuggestedCard` -> `KangurAssignmentManagerCatalogActions`: `translations` -> `translations` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:191
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `translations` -> `title` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:137

### 7. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

- Score: 205
- Depth: 5
- Root fanout: 3
- Prop path: t -> t -> t -> t -> aria-label
- Component path:
  - `AddingSynthesisPlayingView` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisPlayingBoard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoices` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoiceCard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `AddingSynthesisPlayingView` -> `AddingSynthesisPlayingBoard`: `t` -> `t` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:806
  - `AddingSynthesisPlayingBoard` -> `AddingSynthesisLaneChoices`: `t` -> `t` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:642
  - `AddingSynthesisLaneChoices` -> `AddingSynthesisLaneChoiceCard`: `t` -> `t` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:572
  - `AddingSynthesisLaneChoiceCard` -> `KangurAnswerChoiceCard`: `t` -> `aria-label` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:523

### 8. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: currentNote -> currentNote -> currentNote -> noteId -> key
- Component path:
  - `AddingSynthesisPlayingView` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisPlayingBoard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoices` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoiceCard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `AddingSynthesisPlayingView` -> `AddingSynthesisPlayingBoard`: `currentNote` -> `currentNote` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:806
  - `AddingSynthesisPlayingBoard` -> `AddingSynthesisLaneChoices`: `currentNote` -> `currentNote` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:642
  - `AddingSynthesisLaneChoices` -> `AddingSynthesisLaneChoiceCard`: `currentNote` -> `noteId` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:572
  - `AddingSynthesisLaneChoiceCard` -> `KangurAnswerChoiceCard`: `noteId` -> `key` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:523

### 9. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: feedback -> feedback -> feedback -> feedback -> aria-disabled
- Component path:
  - `AddingSynthesisPlayingView` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisPlayingBoard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoices` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoiceCard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `AddingSynthesisPlayingView` -> `AddingSynthesisPlayingBoard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:806
  - `AddingSynthesisPlayingBoard` -> `AddingSynthesisLaneChoices`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:642
  - `AddingSynthesisLaneChoices` -> `AddingSynthesisLaneChoiceCard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:572
  - `AddingSynthesisLaneChoiceCard` -> `KangurAnswerChoiceCard`: `feedback` -> `aria-disabled` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:523

### 10. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: feedback -> feedback -> feedback -> feedback -> interactive
- Component path:
  - `AddingSynthesisPlayingView` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisPlayingBoard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoices` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoiceCard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `AddingSynthesisPlayingView` -> `AddingSynthesisPlayingBoard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:806
  - `AddingSynthesisPlayingBoard` -> `AddingSynthesisLaneChoices`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:642
  - `AddingSynthesisLaneChoices` -> `AddingSynthesisLaneChoiceCard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:572
  - `AddingSynthesisLaneChoiceCard` -> `KangurAnswerChoiceCard`: `feedback` -> `interactive` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:523

### 11. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: feedback -> feedback -> feedback -> feedback -> onClick
- Component path:
  - `AddingSynthesisPlayingView` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisPlayingBoard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoices` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `AddingSynthesisLaneChoiceCard` (src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `AddingSynthesisPlayingView` -> `AddingSynthesisPlayingBoard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:806
  - `AddingSynthesisPlayingBoard` -> `AddingSynthesisLaneChoices`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:642
  - `AddingSynthesisLaneChoices` -> `AddingSynthesisLaneChoiceCard`: `feedback` -> `feedback` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:572
  - `AddingSynthesisLaneChoiceCard` -> `KangurAnswerChoiceCard`: `feedback` -> `onClick` at src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx:523

### 12. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> uiModeFieldId -> id -> id
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorUiModeSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorUiModeSection`: `state` -> `uiModeFieldId` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543
  - `AiTutorUiModeSection` -> `AiTutorSelectFieldRow`: `uiModeFieldId` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:445
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `id` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 13. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> formBindings -> onChange -> onChange
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorUiModeSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorUiModeSection`: `state` -> `formBindings` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543
  - `AiTutorUiModeSection` -> `AiTutorSelectFieldRow`: `formBindings` -> `onChange` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:445
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `onChange` -> `onChange` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 14. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> formBindings -> value -> value
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorUiModeSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorUiModeSection`: `state` -> `formBindings` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543
  - `AiTutorUiModeSection` -> `AiTutorSelectFieldRow`: `formBindings` -> `value` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:445
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `value` -> `value` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 15. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> controlsDisabled -> disabled -> disabled
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorUiModeSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorUiModeSection`: `state` -> `controlsDisabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543
  - `AiTutorUiModeSection` -> `AiTutorSelectFieldRow`: `controlsDisabled` -> `disabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:445
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `disabled` -> `disabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

## Top Transition Details (Depth = 2)

### 1. AiTutorConfiguredPanel -> AiTutorPanelHeader

- Score: 262
- Root fanout: 22
- Prop mapping: state -> sectionSummary
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515

### 2. AiTutorConfiguredPanel -> AiTutorPanelHeader

- Score: 262
- Root fanout: 22
- Prop mapping: state -> sectionTitle
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515

### 3. AiTutorConfiguredPanel -> AiTutorPanelHeader

- Score: 262
- Root fanout: 22
- Prop mapping: state -> title
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:515

### 4. AiTutorConfiguredPanel -> AiTutorMoodSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> presentation
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:520

### 5. AiTutorConfiguredPanel -> AiTutorUsageSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> presentation
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:524

### 6. AiTutorConfiguredPanel -> AiTutorAvailabilityRow

- Score: 262
- Root fanout: 22
- Prop mapping: state -> compactActionClassName
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528

### 7. AiTutorConfiguredPanel -> AiTutorAvailabilityRow

- Score: 262
- Root fanout: 22
- Prop mapping: state -> enabled
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528

### 8. AiTutorConfiguredPanel -> AiTutorAvailabilityRow

- Score: 262
- Root fanout: 22
- Prop mapping: state -> isTemporarilyDisabled
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528

### 9. AiTutorConfiguredPanel -> AiTutorAvailabilityRow

- Score: 262
- Root fanout: 22
- Prop mapping: state -> onToggleEnabled
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:528

### 10. AiTutorConfiguredPanel -> AiTutorGuardrailsSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> controlsDisabled
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535

### 11. AiTutorConfiguredPanel -> AiTutorGuardrailsSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> formBindings
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535

### 12. AiTutorConfiguredPanel -> AiTutorGuardrailsSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> hintDepthFieldId
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535

### 13. AiTutorConfiguredPanel -> AiTutorGuardrailsSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> proactiveNudgesFieldId
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535

### 14. AiTutorConfiguredPanel -> AiTutorGuardrailsSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> testAccessModeFieldId
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535

### 15. AiTutorConfiguredPanel -> AiTutorUiModeSection

- Score: 262
- Root fanout: 22
- Prop mapping: state -> controlsDisabled
- Location: src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:543

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
