---
owner: 'Platform Team'
last_reviewed: '2026-04-01'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-01T08:30:53.637Z

## Snapshot

- Scanned source files: 6552
- JSX files scanned: 2421
- Components detected: 4216
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 331
- Resolved forwarded transitions: 1923
- Candidate chains (depth >= 2): 1923
- Candidate chains (depth >= 3): 542
- High-priority chains (depth >= 4): 156
- Unknown spread forwarding edges: 6
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 295 |
| `feature:filemaker` | 14 |
| `shared-ui` | 6 |
| `feature:admin` | 4 |
| `feature:products` | 4 |
| `feature:cms` | 3 |
| `feature:ai` | 2 |
| `feature:integrations` | 1 |
| `feature:notesapp` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `LearnerManagementModal` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 32 | 39 | no | yes |
| 2 | `ClockTrainingGameView` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 27 | 32 | no | yes |
| 3 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 23 | 37 | no | yes |
| 4 | `SocialSettingsCaptureTab` | `src/features/kangur/social/admin/workspace/social-settings-modal/SocialSettingsCaptureTab.tsx` | 21 | 22 | no | yes |
| 5 | `ClockTrainingActiveView` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 20 | 42 | no | yes |
| 6 | `KangurParentDashboardMonitoringHistorySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 20 | 21 | no | yes |
| 7 | `LearnerSettingsPanel` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 19 | 34 | no | yes |
| 8 | `CalendarInteractiveRoundView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 19 | 33 | no | yes |
| 9 | `KangurMusicPianoRollControls` | `src/features/kangur/ui/components/music/KangurMusicPianoRollControls.tsx` | 18 | 31 | no | yes |
| 10 | `AddingSynthesisPlayingView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 18 | 27 | no | yes |
| 11 | `KangurParentDashboardAssignmentsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx` | 17 | 18 | no | yes |
| 12 | `MailThreadsSection` | `src/features/filemaker/pages/mail-page-sections/MailThreadsSection.tsx` | 16 | 26 | no | yes |
| 13 | `LaunchSchedulingSection` | `src/features/filemaker/pages/campaign-edit-sections/LaunchSchedulingSection.tsx` | 16 | 16 | no | yes |
| 14 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 14 | 16 | no | yes |
| 15 | `KangurAssignmentManagerCatalogSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 13 | 28 | no | yes |
| 16 | `KangurParentDashboardAuthenticatedBody` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 13 | 20 | no | yes |
| 17 | `KangurPrimaryNavigationAuthActions` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 13 | 14 | no | yes |
| 18 | `DeliveryGovernanceSection` | `src/features/filemaker/pages/campaign-edit-sections/DeliveryGovernanceSection.tsx` | 12 | 13 | no | yes |
| 19 | `ClockTrainingSummaryView` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 12 | 13 | no | yes |
| 20 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.components.tsx` | 12 | 12 | no | yes |
| 21 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 12 | 12 | no | yes |
| 22 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 23 | `LearnerMetricsPanel` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 11 | 12 | no | yes |
| 24 | `KangurGameOperationSelectorTrainingSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorTrainingSection.tsx` | 11 | 11 | no | yes |
| 25 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 10 | 17 | no | yes |
| 26 | `MailAccountSettingsSection` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.tsx` | 10 | 15 | no | yes |
| 27 | `KangurAssignmentManagerListsSection` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 14 | no | yes |
| 28 | `SocialSettingsDocumentationTab` | `src/features/kangur/social/admin/workspace/social-settings-modal/SocialSettingsDocumentationTab.tsx` | 10 | 11 | no | yes |
| 29 | `MultiplicationArrayRoundView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 10 | 11 | no | yes |
| 30 | `KangurAssignmentManagerCatalogActions` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 10 | 11 | no | yes |
| 31 | `LessonActivityShellBody` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 10 | 11 | no | yes |
| 32 | `LearnerSessionsCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 10 | 10 | no | yes |
| 33 | `KangurGameOperationSelectorQuickPracticeSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx` | 9 | 14 | no | yes |
| 34 | `AddingSynthesisPlayingBoard` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 9 | 12 | no | yes |
| 35 | `KangurGameHomeQuestPanel` | `src/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget.tsx` | 9 | 11 | no | yes |
| 36 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 9 | 9 | no | yes |
| 37 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 38 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 39 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 8 | 17 | no | yes |
| 40 | `DivisionGroupsBoard` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 16 | no | yes |
| 41 | `DivisionGameRoundView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 15 | no | yes |
| 42 | `SubtractingGameRoundView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 15 | no | yes |
| 43 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 44 | `KangurParentDashboardMonitoringHistoryFilters` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 8 | 11 | no | yes |
| 45 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 8 | 11 | no | yes |
| 46 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 47 | `DivisionGroupsSummaryView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 10 | no | yes |
| 48 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 49 | `MultiplicationGameSummaryView` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 8 | 10 | no | yes |
| 50 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 51 | `LearnerSessionsContent` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 8 | 10 | no | yes |
| 52 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 9 | no | yes |
| 53 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 54 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 8 | 9 | no | yes |
| 55 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 56 | `HierarchyList` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 8 | no | yes |
| 57 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 58 | `MultiplicationGameRoundView` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 7 | 13 | no | yes |
| 59 | `DivisionGroupsPool` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 7 | 9 | no | yes |
| 60 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 61 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 62 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 7 | 7 | no | yes |
| 63 | `NumberBalanceRushTray` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 7 | 7 | no | yes |
| 64 | `AiTutorGuardrailsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 6 | 14 | no | yes |
| 65 | `KangurAssignmentManagerSuggestedCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 66 | `KangurAssignmentManagerCatalogCard` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx` | 6 | 12 | no | yes |
| 67 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 6 | 11 | no | yes |
| 68 | `DivisionGroupsGroupGrid` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 6 | 8 | no | yes |
| 69 | `AddingSynthesisPlayingSidebar` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 6 | 8 | no | yes |
| 70 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 6 | 8 | no | yes |
| 71 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 72 | `KangurParentDashboardMonitoringHistoryContent` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 6 | 7 | no | yes |
| 73 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 74 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 75 | `KangurParentDashboardLearnerActivitySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 6 | 6 | no | yes |
| 76 | `KangurPrimaryNavigationTopBarContent` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 6 | 6 | no | yes |
| 77 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 78 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 79 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 10 | no | yes |
| 80 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 81 | `KangurLearnerProfileOverviewMetrics` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 5 | 10 | no | yes |
| 82 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 83 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 84 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 85 | `SocialSettingsPublishingTab` | `src/features/kangur/social/admin/workspace/social-settings-modal/SocialSettingsPublishingTab.tsx` | 5 | 6 | no | yes |
| 86 | `CalendarInteractiveDayGrid` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 6 | no | yes |
| 87 | `DivisionGroupsDropZone` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 5 | 6 | no | yes |
| 88 | `AddingSynthesisLaneChoices` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 5 | 6 | no | yes |
| 89 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 90 | `KangurPrimaryNavigationGuestPlayerNameAction` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.sections.tsx` | 5 | 6 | no | yes |
| 91 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 92 | `MultiplicationArrayGroups` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 5 | no | yes |
| 93 | `AddingSynthesisPlayingHud` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 5 | 5 | no | yes |
| 94 | `KangurParentDashboardQuickActions` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 5 | 5 | no | yes |
| 95 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 96 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 4 | 10 | no | yes |
| 97 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 98 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 99 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 100 | `KangurParentDashboardMasterySummarySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardProgressWidget.sections.tsx` | 4 | 7 | no | yes |
| 101 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 102 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 103 | `AiTutorUiModeSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 6 | no | yes |
| 104 | `SocialSettingsProjectTab` | `src/features/kangur/social/admin/workspace/social-settings-modal/SocialSettingsProjectTab.tsx` | 4 | 5 | no | yes |
| 105 | `NumberBalanceRushTileZone` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 5 | no | yes |
| 106 | `AddingSynthesisSummaryView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 4 | 5 | no | yes |
| 107 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 108 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 109 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 110 | `LearnerManagementSettingsShortcut` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx` | 4 | 5 | no | yes |
| 111 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 112 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 113 | `AudienceSourceSection` | `src/features/filemaker/pages/campaign-edit-sections/AudienceSourceSection.tsx` | 4 | 4 | no | yes |
| 114 | `AddingSynthesisIntroView` | `src/features/kangur/ui/components/adding-synthesis/AddingSynthesisGame.sections.tsx` | 4 | 4 | no | yes |
| 115 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 116 | `KangurAssignmentsList` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 117 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 118 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 119 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 120 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |

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
| 1 | 254 | 6 | `LearnerManagementModal` | `LearnerSessionItem` | 4 | 1 | `copy -> copy -> copy -> copy -> copy -> copy` |
| 2 | 244 | 6 | `LearnerManagementModal` | `KangurButton` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 3 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> summary -> summary -> description` |
| 4 | 236 | 4 | `KangurPriorityAssignmentsContent` | `KangurPanelIntro` | 10 | 1 | `state -> title -> title -> title` |
| 5 | 224 | 6 | `LearnerManagementModal` | `KangurButton` | 1 | 1 | `isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> disabled` |
| 6 | 224 | 6 | `LearnerManagementModal` | `KangurButton` | 1 | 1 | `onLoadMoreSessions -> onLoadMore -> onLoadMore -> onLoadMore -> onLoadMore -> onClick` |
| 7 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 8 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 9 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> aria-label` |
| 10 | 216 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 8 | 1 | `translations -> translations -> translations -> title` |
| 11 | 215 | 5 | `LearnerManagementModal` | `KangurEmptyState` | 4 | 1 | `copy -> copy -> copy -> copy -> title` |
| 12 | 215 | 5 | `LearnerManagementModal` | `KangurEmptyState` | 4 | 1 | `copy -> copy -> copy -> copy -> description` |
| 13 | 215 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 4 | 1 | `copy -> copy -> copy -> copy -> copy` |
| 14 | 205 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 3 | 1 | `t -> t -> t -> t -> aria-label` |
| 15 | 205 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 16 | 196 | 4 | `KangurParentDashboardManagedCard` | `KangurTopNavGroup` | 6 | 1 | `translations -> translations -> translations -> label` |
| 17 | 196 | 4 | `KangurParentDashboardManagedCard` | `KangurEmptyState` | 6 | 1 | `translations -> translations -> translations -> title` |
| 18 | 196 | 4 | `KangurParentDashboardManagedCard` | `KangurEmptyState` | 6 | 1 | `translations -> translations -> translations -> description` |
| 19 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> noteId -> key` |
| 20 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> aria-disabled` |
| 21 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> interactive` |
| 22 | 195 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback -> onClick` |
| 23 | 195 | 5 | `ClockTrainingGameView` | `KangurButton` | 2 | 1 | `gameMode -> gameMode -> gameMode -> gameMode -> variant` |
| 24 | 195 | 5 | `ClockTrainingGameView` | `KangurButton` | 2 | 1 | `onResetSession -> onResetSession -> onResetSession -> onResetSession -> onClick` |
| 25 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> uiModeFieldId -> id -> id` |
| 26 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 27 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 28 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 29 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id -> id` |
| 30 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id -> id` |
| 31 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> hintDepthFieldId -> id -> id` |
| 32 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 33 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 34 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 35 | 185 | 5 | `AddingSynthesisPlayingView` | `KangurAnswerChoiceCard` | 1 | 1 | `onChoose -> onChoose -> onChoose -> onChoose -> onClick` |
| 36 | 185 | 5 | `ClockTrainingGameView` | `KangurButton` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 37 | 185 | 5 | `ClockTrainingGameView` | `KangurInfoCard` | 1 | 1 | `trainingSectionContent -> trainingSectionContent -> trainingSectionContent -> trainingSectionContent -> accent` |
| 38 | 185 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 1 | 1 | `sessions -> sessions -> sessions -> sessions -> sessions` |
| 39 | 185 | 5 | `LearnerManagementModal` | `KangurSummaryPanel` | 1 | 1 | `sessionsLoadMoreError -> sessionsLoadMoreError -> sessionsLoadMoreError -> sessionsLoadMoreError -> description` |
| 40 | 185 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 1 | 1 | `hasMoreSessions -> hasMoreSessions -> hasMoreSessions -> hasMoreSessions -> hasMoreSessions` |
| 41 | 185 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 1 | 1 | `isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions` |
| 42 | 185 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 1 | 1 | `activeProfileId -> activeProfileId -> activeProfileId -> activeProfileId -> activeProfileId` |
| 43 | 185 | 5 | `LearnerManagementModal` | `LearnerSessionsList` | 1 | 1 | `onLoadMoreSessions -> onLoadMore -> onLoadMore -> onLoadMore -> onLoadMore` |
| 44 | 176 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 4 | 1 | `translations -> translations -> translations -> ariaLabel` |
| 45 | 176 | 4 | `LearnerManagementModal` | `LearnerSessionsContent` | 4 | 1 | `copy -> copy -> copy -> copy` |
| 46 | 176 | 4 | `LearnerManagementModal` | `KangurSelectField` | 4 | 1 | `copy -> copy -> copy -> aria-label` |
| 47 | 176 | 4 | `LearnerManagementModal` | `KangurSelectField` | 4 | 1 | `copy -> copy -> copy -> title` |
| 48 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> summary -> summary` |
| 49 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> title -> title` |
| 50 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> items -> items` |
| 51 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> emptyDescription -> description` |
| 52 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurSummaryPanel` | 10 | 1 | `state -> error -> description` |
| 53 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> loadingLabel -> description` |
| 54 | 166 | 4 | `AddingSynthesisGame` | `KangurButton` | 3 | 1 | `onFinish -> onFinish -> onFinish -> onClick` |
| 55 | 166 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 3 | 1 | `t -> t -> t -> t` |
| 56 | 166 | 4 | `KangurAssignmentManagerListsSection` | `KangurPanelIntro` | 3 | 1 | `translations -> title -> title -> title` |
| 57 | 166 | 4 | `KangurParentDashboardManagedCard` | `KangurButton` | 3 | 1 | `compactWideActionClassName -> compactWideActionClassName -> compactWideActionClassName -> className` |
| 58 | 166 | 4 | `KangurParentDashboardManagedCard` | `KangurButton` | 3 | 1 | `compactWideActionClassName -> compactWideActionClassName -> compactWideActionClassName -> className` |
| 59 | 166 | 4 | `LearnerManagementModal` | `LearnerSessionsContent` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 60 | 166 | 4 | `LearnerManagementModal` | `KangurButton` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 61 | 166 | 4 | `LearnerManagementModal` | `KangurButton` | 3 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |
| 62 | 156 | 4 | `AgenticDocsHierarchyGame` | `HierarchyItemButton` | 2 | 1 | `accent -> accent -> accent -> accent` |
| 63 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 64 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isLocked -> isLocked -> isLocked -> isDragDisabled` |
| 65 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onClick` |
| 66 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onSelect` |
| 67 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `selectedTokenId -> selectedTokenId -> selectedTokenId -> isSelected` |
| 68 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 69 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 70 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> key` |
| 71 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `currentNote -> currentNote -> currentNote -> noteId` |
| 72 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `feedback -> feedback -> feedback -> feedback` |
| 73 | 156 | 4 | `AddingSynthesisPlayingView` | `AddingSynthesisLaneChoiceCard` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 74 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 75 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleAssign -> handleAssign -> handleAssign -> onClick` |
| 76 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 77 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> handleOpenTimeLimitModalForCatalog -> onClick` |
| 78 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 79 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `handleUnassign -> handleUnassign -> handleUnassign -> onClick` |
| 80 | 156 | 4 | `KangurAssignmentManagerCatalogSection` | `KangurButton` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className` |

## Top Chain Details (Depth >= 3)

### 1. LearnerManagementModal -> LearnerSessionItem

- Score: 254
- Depth: 6
- Root fanout: 4
- Prop path: copy -> copy -> copy -> copy -> copy -> copy
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionItem` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589
  - `LearnerSessionsList` -> `LearnerSessionItem`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:534

### 2. LearnerManagementModal -> KangurButton

- Score: 244
- Depth: 6
- Root fanout: 3
- Prop path: isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> className
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589
  - `LearnerSessionsList` -> `KangurButton`: `isCoarsePointer` -> `className` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:542

### 3. KangurPriorityAssignmentsContent -> KangurPanelIntro

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

### 4. KangurPriorityAssignmentsContent -> KangurPanelIntro

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

### 5. LearnerManagementModal -> KangurButton

- Score: 224
- Depth: 6
- Root fanout: 1
- Prop path: isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> isLoadingMoreSessions -> disabled
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `isLoadingMoreSessions` -> `isLoadingMoreSessions` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `isLoadingMoreSessions` -> `isLoadingMoreSessions` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `isLoadingMoreSessions` -> `isLoadingMoreSessions` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `isLoadingMoreSessions` -> `isLoadingMoreSessions` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589
  - `LearnerSessionsList` -> `KangurButton`: `isLoadingMoreSessions` -> `disabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:542

### 6. LearnerManagementModal -> KangurButton

- Score: 224
- Depth: 6
- Root fanout: 1
- Prop path: onLoadMoreSessions -> onLoadMore -> onLoadMore -> onLoadMore -> onLoadMore -> onClick
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `onLoadMoreSessions` -> `onLoadMore` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `onLoadMore` -> `onLoadMore` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `onLoadMore` -> `onLoadMore` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `onLoadMore` -> `onLoadMore` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589
  - `LearnerSessionsList` -> `KangurButton`: `onLoadMore` -> `onClick` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:542

### 7. KangurAssignmentManagerCatalogSection -> KangurButton

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

### 8. KangurAssignmentManagerCatalogSection -> KangurButton

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

### 9. KangurAssignmentManagerCatalogSection -> KangurButton

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

### 10. KangurAssignmentManagerCatalogSection -> KangurButton

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

### 11. LearnerManagementModal -> KangurEmptyState

- Score: 215
- Depth: 5
- Root fanout: 4
- Prop path: copy -> copy -> copy -> copy -> title
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives/KangurEmptyState.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `KangurEmptyState`: `copy` -> `title` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:571

### 12. LearnerManagementModal -> KangurEmptyState

- Score: 215
- Depth: 5
- Root fanout: 4
- Prop path: copy -> copy -> copy -> copy -> description
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives/KangurEmptyState.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `KangurEmptyState`: `copy` -> `description` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:571

### 13. LearnerManagementModal -> LearnerSessionsList

- Score: 215
- Depth: 5
- Root fanout: 4
- Prop path: copy -> copy -> copy -> copy -> copy
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `copy` -> `copy` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589

### 14. AddingSynthesisPlayingView -> KangurAnswerChoiceCard

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

### 15. LearnerManagementModal -> LearnerSessionsList

- Score: 205
- Depth: 5
- Root fanout: 3
- Prop path: isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer
- Component path:
  - `LearnerManagementModal` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerMetricsPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsCard` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsContent` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
  - `LearnerSessionsList` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx)
- Transition lines:
  - `LearnerManagementModal` -> `LearnerMetricsPanel`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:768
  - `LearnerMetricsPanel` -> `LearnerSessionsCard`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:664
  - `LearnerSessionsCard` -> `LearnerSessionsContent`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:632
  - `LearnerSessionsContent` -> `LearnerSessionsList`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget.sections.tsx:589

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
