---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-07T11:43:12.358Z

## Snapshot

- Scanned source files: 7048
- JSX files scanned: 2493
- Components detected: 4340
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 294
- Resolved forwarded transitions: 1228
- Candidate chains (depth >= 2): 1228
- Candidate chains (depth >= 3): 230
- High-priority chains (depth >= 4): 66
- Unknown spread forwarding edges: 12
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 248 |
| `shared-ui` | 9 |
| `feature:integrations` | 7 |
| `feature:filemaker` | 6 |
| `feature:admin` | 4 |
| `feature:products` | 4 |
| `feature:cms` | 4 |
| `feature:case-resolver` | 4 |
| `feature:ai` | 3 |
| `shared-lib` | 2 |
| `feature:playwright` | 2 |
| `feature:notesapp` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `LaunchSchedulingSection` | `src/features/filemaker/pages/campaign-edit-sections/LaunchSchedulingSection.tsx` | 16 | 16 | no | yes |
| 2 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.components.tsx` | 12 | 12 | no | yes |
| 3 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 12 | 12 | no | yes |
| 4 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 5 | `IntegrationSelectorFields` | `src/features/integrations/components/listings/IntegrationSelectorFields.tsx` | 11 | 15 | no | yes |
| 6 | `KangurGameOperationSelectorTrainingSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorTrainingSection.tsx` | 11 | 11 | no | yes |
| 7 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 10 | 17 | no | yes |
| 8 | `MailAccountSettingsSection` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.tsx` | 10 | 15 | no | yes |
| 9 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 10 | 14 | no | yes |
| 10 | `MultiplicationArrayRoundView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 10 | 11 | no | yes |
| 11 | `LessonActivityShellBody` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 10 | 11 | no | yes |
| 12 | `KangurGameOperationSelectorQuickPracticeSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx` | 9 | 14 | no | yes |
| 13 | `KangurGameHomeQuestPanel` | `src/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget.tsx` | 9 | 11 | no | yes |
| 14 | `KangurParentDashboardMonitoringHistorySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 9 | 10 | no | yes |
| 15 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 9 | 9 | no | yes |
| 16 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 17 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 18 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 8 | 17 | no | yes |
| 19 | `DivisionGroupsBoard` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 16 | no | yes |
| 20 | `DivisionGameRoundView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 15 | no | yes |
| 21 | `SubtractingGameRoundView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 15 | no | yes |
| 22 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 23 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 24 | `DivisionGroupsSummaryView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 8 | 10 | no | yes |
| 25 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 26 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 27 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 9 | no | yes |
| 28 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 29 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 30 | `HierarchyList` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 8 | 8 | no | yes |
| 31 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 32 | `DivisionGroupsPool` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 7 | 9 | no | yes |
| 33 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 34 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 35 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 7 | 7 | no | yes |
| 36 | `NumberBalanceRushTray` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 7 | 7 | no | yes |
| 37 | `AiTutorGuardrailsSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 6 | 14 | no | yes |
| 38 | `DivisionGroupsGroupGrid` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 6 | 8 | no | yes |
| 39 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 40 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 41 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 42 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 43 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 44 | `MultiplicationArrayGroupCard` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 10 | no | yes |
| 45 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 46 | `KangurLearnerProfileOverviewMetrics` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 5 | 10 | no | yes |
| 47 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 5 | 9 | no | yes |
| 48 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 49 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 50 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 51 | `DivisionGroupsDropZone` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 5 | 6 | no | yes |
| 52 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 53 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 54 | `MultiplicationArrayGroups` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 5 | 5 | no | yes |
| 55 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 56 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 4 | 10 | no | yes |
| 57 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 58 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 59 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 60 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 61 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 62 | `AiTutorUiModeSection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 6 | no | yes |
| 63 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 64 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 65 | `NumberBalanceRushTileZone` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 5 | no | yes |
| 66 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 67 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 68 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 69 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 70 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 71 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 72 | `KangurAssignmentsList` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 73 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 74 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 75 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 76 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 77 | `AiTutorAvailabilityRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 78 | `AiTutorSaveAction` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 79 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 80 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 81 | `GenericPickerDropdownMenu` | `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx` | 4 | 4 | no | yes |
| 82 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 83 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 3 | 8 | no | yes |
| 84 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 85 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 3 | 6 | no | yes |
| 86 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 87 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 3 | 5 | no | yes |
| 88 | `KangurLearnerProfileActivityPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 89 | `KangurLearnerProfileOperationsPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 90 | `NavTreeItem` | `src/features/admin/components/menu/NavTree.tsx` | 3 | 4 | no | yes |
| 91 | `DivisionGameChoicesGrid` | `src/features/kangur/ui/components/DivisionGame.tsx` | 3 | 4 | no | yes |
| 92 | `ShapeRecognitionFinishedView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 3 | 4 | no | yes |
| 93 | `SubtractingGameChoicesGrid` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 3 | 4 | no | yes |
| 94 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 95 | `KangurGameOperationSelectorOperationSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorOperationSection.tsx` | 3 | 4 | no | yes |
| 96 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 97 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 98 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 99 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 3 | 3 | no | yes |
| 100 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 101 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 102 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 103 | `AgenticTrimTokenPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 3 | 3 | no | yes |
| 104 | `DivisionGroupsCheckAction` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 3 | 3 | no | yes |
| 105 | `DivisionGroupsRoundView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 3 | 3 | no | yes |
| 106 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 107 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 3 | 3 | no | yes |
| 108 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 109 | `KangurAssignmentsListArchiveAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |
| 110 | `KangurAssignmentsListShell` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |
| 111 | `ClockTrainingModeSwitch` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 3 | 3 | no | yes |
| 112 | `DraggableClockSnapModeSwitch` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 113 | `DraggableClockSubmitArea` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 114 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 115 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 116 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 117 | `KangurParentDashboardAuthenticatedBody` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 3 | 3 | no | yes |
| 118 | `KangurParentDashboardHeroWidget` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 3 | 3 | no | yes |
| 119 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 120 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |

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
| 23 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 24 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 25 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 26 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 27 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 28 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 29 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 30 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 31 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 32 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 33 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 34 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 35 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744` |
| 36 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744` |
| 37 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 38 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 39 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 40 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 41 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 42 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 43 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 44 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 45 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 46 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 47 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 48 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 49 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:765` |
| 50 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:765` |
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
| 3 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> uiModeFieldId -> id -> id` |
| 4 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 5 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 6 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 7 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id -> id` |
| 8 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id -> id` |
| 9 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> hintDepthFieldId -> id -> id` |
| 10 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> onChange -> onChange` |
| 11 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> formBindings -> value -> value` |
| 12 | 195 | 5 | `AiTutorConfigPanel` | `KangurSelectField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled -> disabled` |
| 13 | 176 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 4 | 1 | `translations -> translations -> translations -> ariaLabel` |
| 14 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> summary -> summary` |
| 15 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> title -> title` |
| 16 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurAssignmentsListShell` | 10 | 1 | `state -> items -> items` |
| 17 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> emptyDescription -> description` |
| 18 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurSummaryPanel` | 10 | 1 | `state -> error -> description` |
| 19 | 173 | 3 | `KangurPriorityAssignmentsContent` | `KangurEmptyState` | 10 | 1 | `state -> loadingLabel -> description` |
| 20 | 156 | 4 | `AgenticDocsHierarchyGame` | `HierarchyItemButton` | 2 | 1 | `accent -> accent -> accent -> accent` |
| 21 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 22 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `isLocked -> isLocked -> isLocked -> isDragDisabled` |
| 23 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onClick` |
| 24 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `onSelectToken -> onSelectToken -> onSelectToken -> onSelect` |
| 25 | 156 | 4 | `DivisionGroupsBoard` | `DraggableToken` | 2 | 1 | `selectedTokenId -> selectedTokenId -> selectedTokenId -> isSelected` |
| 26 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 27 | 156 | 4 | `GroupSum` | `KangurButton` | 2 | 1 | `onResult -> onResult -> onCheck -> onClick` |
| 28 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onSave -> onClick` |
| 29 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 30 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isSaving -> disabled` |
| 31 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> fullWidthActionClassName -> className` |
| 32 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> uiModeFieldId -> id` |
| 33 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 34 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 35 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 36 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> testAccessModeFieldId -> id` |
| 37 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> proactiveNudgesFieldId -> id` |
| 38 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> hintDepthFieldId -> id` |
| 39 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> checked` |
| 40 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 41 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> value` |
| 42 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> formBindings -> onChange` |
| 43 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> formBindings -> disabled` |
| 44 | 156 | 4 | `AiTutorConfigPanel` | `TutorToggleField` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 45 | 156 | 4 | `AiTutorConfigPanel` | `AiTutorSelectFieldRow` | 2 | 1 | `state -> state -> controlsDisabled -> disabled` |
| 46 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> onToggleEnabled -> onClick` |
| 47 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> isTemporarilyDisabled -> disabled` |
| 48 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> enabled -> variant` |
| 49 | 156 | 4 | `AiTutorConfigPanel` | `KangurButton` | 2 | 1 | `state -> state -> compactActionClassName -> className` |
| 50 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> accent` |
| 51 | 156 | 4 | `AiTutorConfigPanel` | `KangurStatusChip` | 2 | 1 | `state -> state -> presentation -> data-mood-id` |
| 52 | 156 | 4 | `AiTutorConfigPanel` | `KangurLabeledValueSummary` | 2 | 1 | `state -> state -> presentation -> value` |
| 53 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> title -> title` |
| 54 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionTitle -> eyebrow` |
| 55 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionSummary -> description` |
| 56 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> title -> title` |
| 57 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionTitle -> eyebrow` |
| 58 | 156 | 4 | `AiTutorConfigPanel` | `KangurPanelIntro` | 2 | 1 | `state -> state -> sectionSummary -> description` |
| 59 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `celebrating -> celebrating -> celebrating -> buttonClassName` |
| 60 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `celebrating -> celebrating -> celebrating -> interactive` |
| 61 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> aria-pressed` |
| 62 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> buttonClassName` |
| 63 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> emphasis` |
| 64 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `collected -> collected -> isCollected -> interactive` |
| 65 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer -> buttonClassName` |
| 66 | 146 | 4 | `MultiplicationArrayRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `onTapGroup -> onTap -> onTap -> onClick` |
| 67 | 146 | 4 | `KangurLessonActivityRuntimeState` | `CalendarInteractiveGameContent` | 1 | 1 | `onFinish -> onFinish -> onFinish -> onFinish` |
| 68 | 146 | 4 | `KangurParentDashboardManagedCard` | `KangurSummaryPanel` | 1 | 1 | `learnerLiveState -> learnerLiveState -> learnerLiveState -> accent` |
| 69 | 146 | 4 | `KangurParentDashboardManagedCard` | `KangurSummaryPanel` | 1 | 1 | `learnerLiveState -> learnerLiveState -> learnerLiveState -> description` |
| 70 | 146 | 4 | `KangurParentDashboardManagedCard` | `KangurSummaryPanel` | 1 | 1 | `learnerLiveState -> learnerLiveState -> learnerLiveState -> label` |
| 71 | 146 | 4 | `KangurParentDashboardManagedCard` | `KangurTransitionLink` | 1 | 1 | `learnerLiveState -> learnerLiveState -> learnerLiveState -> href` |
| 72 | 146 | 4 | `KangurParentDashboardHeroWidget` | `KangurParentDashboardLearnerManagementSection` | 1 | 1 | `learnerManagementAnchorRef -> learnerManagementAnchorRef -> learnerManagementAnchorRef -> learnerManagementAnchorRef` |
| 73 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurButton` | 5 | 1 | `item -> item -> onClick` |
| 74 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurAssignmentPriorityChip` | 5 | 1 | `item -> priority -> priority` |
| 75 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurGlassPanel` | 5 | 1 | `item -> testId -> data-testid` |
| 76 | 123 | 3 | `KangurAssignmentManagerCatalogCard` | `KangurButton` | 5 | 1 | `item -> item -> onClick` |
| 77 | 123 | 3 | `KangurAssignmentManagerCatalogCard` | `KangurGlassPanel` | 5 | 1 | `item -> testId -> data-testid` |
| 78 | 113 | 3 | `DivisionGroupsBoard` | `DraggableToken` | 4 | 1 | `translations -> translations -> ariaLabel` |
| 79 | 113 | 3 | `DivisionGroupsBoard` | `DivisionGroupsDropZone` | 4 | 1 | `translations -> translations -> ariaLabel` |
| 80 | 113 | 3 | `DivisionGroupsBoard` | `DivisionGroupsDropZone` | 4 | 1 | `translations -> translations -> label` |

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

### 3. AiTutorConfigPanel -> KangurSelectField

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

### 4. AiTutorConfigPanel -> KangurSelectField

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

### 5. AiTutorConfigPanel -> KangurSelectField

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

### 6. AiTutorConfigPanel -> KangurSelectField

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

### 7. AiTutorConfigPanel -> KangurSelectField

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

### 8. AiTutorConfigPanel -> KangurSelectField

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

### 9. AiTutorConfigPanel -> KangurSelectField

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

### 10. AiTutorConfigPanel -> KangurSelectField

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

### 11. AiTutorConfigPanel -> KangurSelectField

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

### 12. AiTutorConfigPanel -> KangurSelectField

- Score: 195
- Depth: 5
- Root fanout: 2
- Prop path: state -> state -> controlsDisabled -> disabled -> disabled
- Component path:
  - `AiTutorConfigPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorConfiguredPanel` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorGuardrailsSection` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `AiTutorSelectFieldRow` (src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx)
  - `KangurSelectField` (src/features/kangur/ui/design/primitives/KangurTextField.tsx)
- Transition lines:
  - `AiTutorConfigPanel` -> `AiTutorConfiguredPanel`: `state` -> `state` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:577
  - `AiTutorConfiguredPanel` -> `AiTutorGuardrailsSection`: `state` -> `controlsDisabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:535
  - `AiTutorGuardrailsSection` -> `AiTutorSelectFieldRow`: `controlsDisabled` -> `disabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:354
  - `AiTutorSelectFieldRow` -> `KangurSelectField`: `disabled` -> `disabled` at src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx:120

### 13. DivisionGroupsBoard -> DraggableToken

- Score: 176
- Depth: 4
- Root fanout: 4
- Prop path: translations -> translations -> translations -> ariaLabel
- Component path:
  - `DivisionGroupsBoard` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `DivisionGroupsGroupGrid` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `DivisionGroupsDropZone` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/DivisionGroupsGame.components.tsx)
- Transition lines:
  - `DivisionGroupsBoard` -> `DivisionGroupsGroupGrid`: `translations` -> `translations` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:479
  - `DivisionGroupsGroupGrid` -> `DivisionGroupsDropZone`: `translations` -> `translations` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:436
  - `DivisionGroupsDropZone` -> `DraggableToken`: `translations` -> `ariaLabel` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:363

### 14. KangurPriorityAssignmentsContent -> KangurAssignmentsListShell

- Score: 173
- Depth: 3
- Root fanout: 10
- Prop path: state -> summary -> summary
- Component path:
  - `KangurPriorityAssignmentsContent` (src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurAssignmentsListShell` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
- Transition lines:
  - `KangurPriorityAssignmentsContent` -> `KangurAssignmentsList`: `state` -> `summary` at src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263
  - `KangurAssignmentsList` -> `KangurAssignmentsListShell`: `summary` -> `summary` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:640

### 15. KangurPriorityAssignmentsContent -> KangurAssignmentsListShell

- Score: 173
- Depth: 3
- Root fanout: 10
- Prop path: state -> title -> title
- Component path:
  - `KangurPriorityAssignmentsContent` (src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
  - `KangurAssignmentsListShell` (src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx)
- Transition lines:
  - `KangurPriorityAssignmentsContent` -> `KangurAssignmentsList`: `state` -> `title` at src/features/kangur/ui/components/assignments/KangurPriorityAssignments.tsx:263
  - `KangurAssignmentsList` -> `KangurAssignmentsListShell`: `title` -> `title` at src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx:640

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
