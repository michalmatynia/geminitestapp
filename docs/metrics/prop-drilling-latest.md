---
owner: 'Platform Team'
last_reviewed: '2026-04-02'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-02T10:03:36.712Z

## Snapshot

- Scanned source files: 6607
- JSX files scanned: 2444
- Components detected: 4251
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 293
- Resolved forwarded transitions: 1353
- Candidate chains (depth >= 2): 1353
- Candidate chains (depth >= 3): 273
- High-priority chains (depth >= 4): 79
- Unknown spread forwarding edges: 10
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 251 |
| `feature:filemaker` | 14 |
| `shared-ui` | 6 |
| `feature:admin` | 4 |
| `feature:products` | 4 |
| `feature:ai` | 4 |
| `feature:cms` | 4 |
| `feature:playwright` | 2 |
| `shared-lib` | 1 |
| `feature:integrations` | 1 |
| `feature:notesapp` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 18 | 20 | no | yes |
| 2 | `LaunchSchedulingSection` | `src/features/filemaker/pages/campaign-edit-sections/LaunchSchedulingSection.tsx` | 16 | 16 | no | yes |
| 3 | `KangurAssignmentManagerCatalogSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 13 | 28 | no | yes |
| 4 | `KangurPrimaryNavigationAuthActions` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 13 | 14 | no | yes |
| 5 | `DeliveryGovernanceSection` | `src/features/filemaker/pages/campaign-edit-sections/DeliveryGovernanceSection.tsx` | 12 | 13 | no | yes |
| 6 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.components.tsx` | 12 | 12 | no | yes |
| 7 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 12 | 12 | no | yes |
| 8 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 9 | `KangurGameOperationSelectorTrainingSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorTrainingSection.tsx` | 11 | 11 | no | yes |
| 10 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 10 | 17 | no | yes |
| 11 | `MailAccountSettingsSection` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.tsx` | 10 | 15 | no | yes |
| 12 | `KangurAssignmentManagerListsSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 14 | no | yes |
| 13 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 10 | 14 | no | yes |
| 14 | `MultiplicationArrayRoundView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 10 | 11 | no | yes |
| 15 | `KangurAssignmentManagerCatalogActions` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 11 | no | yes |
| 16 | `LessonActivityShellBody` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 10 | 11 | no | yes |
| 17 | `KangurGameOperationSelectorQuickPracticeSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx` | 9 | 14 | no | yes |
| 18 | `KangurGameHomeQuestPanel` | `src/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget.tsx` | 9 | 11 | no | yes |
| 19 | `KangurParentDashboardMonitoringHistorySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 9 | 10 | no | yes |
| 20 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 9 | 9 | no | yes |
| 21 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 22 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 23 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 8 | 17 | no | yes |
| 24 | `DivisionGroupsBoard` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 16 | no | yes |
| 25 | `DivisionGameRoundView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 15 | no | yes |
| 26 | `SubtractingGameRoundView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 15 | no | yes |
| 27 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 28 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 29 | `DivisionGroupsSummaryView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 10 | no | yes |
| 30 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 31 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 32 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 9 | no | yes |
| 33 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 34 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 8 | 9 | no | yes |
| 35 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 36 | `HierarchyList` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 8 | no | yes |
| 37 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 38 | `DivisionGroupsPool` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 7 | 9 | no | yes |
| 39 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 40 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 41 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 7 | 7 | no | yes |
| 42 | `NumberBalanceRushTray` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 7 | 7 | no | yes |
| 43 | `AiTutorGuardrailsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 6 | 14 | no | yes |
| 44 | `KangurAssignmentManagerSuggestedCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 45 | `KangurAssignmentManagerCatalogCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 46 | `DivisionGroupsGroupGrid` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 6 | 8 | no | yes |
| 47 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 48 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 49 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 50 | `KangurPrimaryNavigationTopBarContent` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 6 | 6 | no | yes |
| 51 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 52 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 53 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 10 | no | yes |
| 54 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 55 | `KangurLearnerProfileOverviewMetrics` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 5 | 10 | no | yes |
| 56 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 5 | 9 | no | yes |
| 57 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 58 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 59 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 60 | `DivisionGroupsDropZone` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 5 | 6 | no | yes |
| 61 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 62 | `KangurPrimaryNavigationGuestPlayerNameAction` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 5 | 6 | no | yes |
| 63 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 64 | `MultiplicationArrayGroups` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 5 | no | yes |
| 65 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 66 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 4 | 10 | no | yes |
| 67 | `CampaignDetailsSection` | `src/features/filemaker/pages/AdminFilemakerCampaignEditPage.sections.tsx` | 4 | 9 | no | yes |
| 68 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 69 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 70 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 71 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 72 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 73 | `AiTutorUiModeSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 6 | no | yes |
| 74 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 75 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 76 | `CampaignTestSendSection` | `src/features/filemaker/pages/AdminFilemakerCampaignEditPage.sections.tsx` | 4 | 5 | no | yes |
| 77 | `NumberBalanceRushTileZone` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 5 | no | yes |
| 78 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 79 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 80 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 81 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 82 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 83 | `AudienceSourceSection` | `src/features/filemaker/pages/campaign-edit-sections/AudienceSourceSection.tsx` | 4 | 4 | no | yes |
| 84 | `RecentRunsSection` | `src/features/filemaker/pages/campaign-edit-sections/CampaignInsightsSections.tsx` | 4 | 4 | no | yes |
| 85 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 86 | `KangurAssignmentsList` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 87 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 88 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 89 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 90 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 91 | `AiTutorAvailabilityRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 92 | `AiTutorSaveAction` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 93 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 94 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 95 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 96 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 3 | 8 | no | yes |
| 97 | `PlaywrightCaptureRoutesEditor` | `src/features/ai/ai-paths/components/node-config/dialog/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 98 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 3 | 6 | no | yes |
| 99 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 100 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 3 | 5 | no | yes |
| 101 | `KangurLearnerProfileActivityPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 102 | `KangurLearnerProfileOperationsPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 103 | `NavTreeItem` | `src/features/admin/components/menu/NavTree.tsx` | 3 | 4 | no | yes |
| 104 | `DivisionGameChoicesGrid` | `src/features/kangur/ui/components/DivisionGame.tsx` | 3 | 4 | no | yes |
| 105 | `ShapeRecognitionFinishedView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 3 | 4 | no | yes |
| 106 | `SubtractingGameChoicesGrid` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 3 | 4 | no | yes |
| 107 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 108 | `KangurGameOperationSelectorOperationSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorOperationSection.tsx` | 3 | 4 | no | yes |
| 109 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 110 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 111 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 112 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 113 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 114 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 115 | `AgenticTrimTokenPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 3 | 3 | no | yes |
| 116 | `DivisionGroupsCheckAction` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 3 | 3 | no | yes |
| 117 | `DivisionGroupsRoundView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 3 | 3 | no | yes |
| 118 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 119 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 120 | `KangurAssignmentsListArchiveAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |

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
| 51 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsLoading` | 10 | 1 | `state -> loadingLabel` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:244` |
| 52 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsError` | 10 | 1 | `state -> error` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:248` |
| 53 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> emptyDescription` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 54 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> summary` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 55 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> title` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 56 | 142 | `KangurPriorityAssignmentsContent` | `KangurPriorityAssignmentsEmpty` | 10 | 1 | `state -> zeroCountLabel` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:253` |
| 57 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> items` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 58 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> title` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 59 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> summary` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 60 | 142 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsList` | 10 | 1 | `state -> onItemActionClick` | `src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263` |
| 61 | 132 | `KangurLessonActivityRuntime` | `CalendarInteractiveGame` | 9 | 1 | `rendererProps -> calendarSection` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:73` |
| 62 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> hideModeSwitch` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 63 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> initialMode` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 64 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> section` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 65 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showHourHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 66 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showMinuteHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 67 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTaskTitle` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 68 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTimeDisplay` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 69 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> action` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 70 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 71 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> progressLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 72 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> questLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 73 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardAccent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 74 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 75 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 76 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 77 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> targetPageKey` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 78 | 124 | `KangurLessonActivityRuntime` | `GeometryDrawingGame` | 9 | 1 | `rendererProps -> rendererProps` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:97` |
| 79 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> accent` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 80 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> dataTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> summary -> summary -> description` |
| 2 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> title -> title -> title` |
| 3 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 4 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 5 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 6 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 7 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> uiModeFieldId -> id -> id` |
| 8 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 9 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 10 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 11 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id -> id` |
| 12 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id -> id` |
| 13 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> hintDepthFieldId -> id -> id` |
| 14 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 15 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 16 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 17 | 176 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 4 | 1 | `translations -> translations -> translations -> ariaLabel` |
| 18 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> summary -> summary` |
| 19 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> title -> title` |
| 20 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> items -> items` |
| 21 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> emptyDescription -> description` |
| 22 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurSummaryPanel` | 10 | 1 | `state -> error -> description` |
| 23 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> loadingLabel -> description` |
| 24 | 166 | 4 | `KangurAssignmentManagerListsSection` | `KangurPanelIntro` | 3 | 1 | `translations -> title -> title -> title` |
| 25 | 156 | 4 | `AgenticDocsHierarchyGame` | `HierarchyItemButton` | 2 | 1 | `accent -> accent -> accent -> accent` |
| 26 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 27 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isLocked -> isLocked -> isLocked -> isDragDisabled` |
| 28 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onClick` |
| 29 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onSelect` |
| 30 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `selectedTokenId -> selectedTokenId -> selectedTokenId -> isSelected` |
| 31 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 32 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 33 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 34 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 35 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 36 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 37 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 38 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 39 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 40 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 41 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onSave -> onClick` |
| 42 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 43 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isSaving -> disabled` |
| 44 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> fullWidthActionClassName -> className` |
| 45 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> uiModeFieldId -> id` |
| 46 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 47 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 48 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 49 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id` |
| 50 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id` |
| 51 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> hintDepthFieldId -> id` |
| 52 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> checked` |
| 53 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 54 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 55 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 56 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> disabled` |
| 57 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 58 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 59 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onToggleEnabled -> onClick` |
| 60 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 61 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> enabled -> variant` |
| 62 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> compactActionClassName -> className` |
| 63 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> accent` |
| 64 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> data-mood-id` |
| 65 | 156 | 4 | `AiTutorConfigPanel` | `KangurLabeledValueSummary` | 2 | 1 | `state -> state -> presentation -> value` |
| 66 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> title -> title` |
| 67 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionTitle -> eyebrow` |
| 68 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionSummary -> description` |
| 69 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> title -> title` |
| 70 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionTitle -> eyebrow` |
| 71 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionSummary -> description` |
| 72 | 153 | 3 | `KangurAssignmentManagerCatalogSection` | `KangurAssignmentManagerCatalogActions` | 8 | 1 | `translations -> translations -> assignLabel` |
| 73 | 153 | 3 | `KangurAssignmentManagerCatalogSection` | `KangurAssignmentManagerCatalogActions` | 8 | 1 | `translations -> translations -> translations` |
| 74 | 153 | 3 | `KangurAssignmentManagerCatalogSection` | `KangurAssignmentManagerCatalogActions` | 8 | 1 | `translations -> translations -> assignLabel` |
| 75 | 153 | 3 | `KangurAssignmentManagerCatalogSection` | `KangurAssignmentManagerCatalogActions` | 8 | 1 | `translations -> translations -> translations` |
| 76 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `celebrating -> celebrating -> celebrating -> buttonClassName` |
| 77 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `celebrating -> celebrating -> celebrating -> interactive` |
| 78 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> aria-pressed` |
| 79 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> buttonClassName` |
| 80 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> emphasis` |

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

### 7. AiTutorConfigPanel -> KangurSelectField

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

### 8. AiTutorConfigPanel -> KangurSelectField

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

### 9. AiTutorConfigPanel -> KangurSelectField

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

### 10. AiTutorConfigPanel -> KangurSelectField

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

### 11. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> testAccessModeFieldId -> id -> id
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `testAccessModeFieldId` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `testAccessModeFieldId` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:354
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `id` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 12. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> proactiveNudgesFieldId -> id -> id
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `proactiveNudgesFieldId` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `proactiveNudgesFieldId` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:385
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `id` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 13. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> hintDepthFieldId -> id -> id
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `hintDepthFieldId` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `hintDepthFieldId` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:370
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `id` -> `id` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 14. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> formBindings -> onChange -> onChange
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `formBindings` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `formBindings` -> `onChange` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:354
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `onChange` -> `onChange` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 15. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> formBindings -> value -> value
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `formBindings` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `formBindings` -> `value` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:354
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `value` -> `value` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

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
