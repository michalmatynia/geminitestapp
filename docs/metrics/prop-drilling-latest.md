---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-11T15:56:11.767Z

## Snapshot

- Scanned source files: 7250
- JSX files scanned: 2525
- Components detected: 4430
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 284
- Resolved forwarded transitions: 1076
- Candidate chains (depth >= 2): 1076
- Candidate chains (depth >= 3): 88
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 221 |
| `feature:integrations` | 13 |
| `shared-ui` | 10 |
| `feature:ai` | 7 |
| `feature:filemaker` | 6 |
| `feature:products` | 6 |
| `feature:admin` | 4 |
| `feature:cms` | 4 |
| `feature:case-resolver` | 4 |
| `shared-lib` | 3 |
| `feature:playwright` | 2 |
| `app` | 2 |
| `feature:notesapp` | 1 |
| `shared` | 1 |

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
| 9 | `KangurGameOperationSelectorQuickPracticeSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx` | 9 | 14 | no | yes |
| 10 | `AiPathsMasterTreePanel` | `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsMasterTreePanel.tsx` | 9 | 12 | no | yes |
| 11 | `KangurGameHomeQuestPanel` | `src/features/kangur/ui/components/game-home/KangurGameHomeQuestWidget.tsx` | 9 | 11 | no | yes |
| 12 | `KangurParentDashboardMonitoringHistorySection` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget.tsx` | 9 | 10 | no | yes |
| 13 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 9 | 9 | no | yes |
| 14 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 15 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 16 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx` | 8 | 17 | no | yes |
| 17 | `DivisionGameRoundView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 15 | no | yes |
| 18 | `SubtractingGameRoundView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 15 | no | yes |
| 19 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 20 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 21 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 22 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 23 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 24 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 25 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 26 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 27 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 28 | `NavTree` | `src/features/admin/components/menu/NavTree.tsx` | 7 | 7 | no | yes |
| 29 | `NumberBalanceRushTray` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 7 | 7 | no | yes |
| 30 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 31 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 32 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 33 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 34 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 35 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 36 | `KangurLearnerProfileOverviewMetrics` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 5 | 10 | no | yes |
| 37 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 5 | 9 | no | yes |
| 38 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 39 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 40 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 41 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 42 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 43 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 44 | `KangurLearnerProfileOperationCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 4 | 10 | no | yes |
| 45 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 46 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 47 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 48 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 49 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 50 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 51 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 52 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 53 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 4 | 6 | no | yes |
| 54 | `AiPathsCanvasToolbar` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasToolbar.tsx` | 4 | 5 | no | yes |
| 55 | `NumberBalanceRushTileZone` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 5 | no | yes |
| 56 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 57 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 58 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 59 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 60 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 61 | `ProductListActivityPill` | `src/features/products/components/list/ProductListActivityPill.tsx` | 4 | 5 | no | yes |
| 62 | `ListingRowView` | `src/features/integrations/components/listings/TraderaStatusCheckModal.RowItem.tsx` | 4 | 4 | no | yes |
| 63 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 64 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 65 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 66 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 67 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 68 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 69 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 70 | `GenericPickerDropdownMenu` | `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx` | 4 | 4 | no | yes |
| 71 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 72 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 3 | 8 | no | yes |
| 73 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 74 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 3 | 6 | no | yes |
| 75 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 76 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 3 | 5 | no | yes |
| 77 | `KangurLearnerProfileActivityPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 78 | `KangurLearnerProfileOperationsPanel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx` | 3 | 5 | no | yes |
| 79 | `NavTreeItem` | `src/features/admin/components/menu/NavTree.tsx` | 3 | 4 | no | yes |
| 80 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 3 | 4 | no | yes |
| 81 | `DivisionGameChoicesGrid` | `src/features/kangur/ui/components/DivisionGame.tsx` | 3 | 4 | no | yes |
| 82 | `ShapeRecognitionFinishedView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 3 | 4 | no | yes |
| 83 | `SubtractingGameChoicesGrid` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 3 | 4 | no | yes |
| 84 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 85 | `KangurGameOperationSelectorOperationSection` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorOperationSection.tsx` | 3 | 4 | no | yes |
| 86 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 87 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 88 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 89 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 3 | 3 | no | yes |
| 90 | `CatalogCategoryTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogCategoryTable.tsx` | 3 | 3 | no | yes |
| 91 | `CatalogEntriesTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogEntriesTable.tsx` | 3 | 3 | no | yes |
| 92 | `MappingsRulesTable` | `src/features/integrations/pages/marketplaces/tradera/components/MappingsRulesTable.tsx` | 3 | 3 | no | yes |
| 93 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 94 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 95 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 96 | `AgenticTrimTokenPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 3 | 3 | no | yes |
| 97 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 98 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 3 | 3 | no | yes |
| 99 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 100 | `KangurAssignmentsListArchiveAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |
| 101 | `ClockTrainingModeSwitch` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 3 | 3 | no | yes |
| 102 | `DraggableClockSnapModeSwitch` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 103 | `DraggableClockSubmitArea` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 104 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 105 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 106 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 107 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 108 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |
| 109 | `KangurPrimaryNavigationChoiceDialogs` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 2 | 28 | no | yes |
| 110 | `KangurLessonActivityRuntime` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx` | 2 | 12 | no | yes |
| 111 | `PlayerProgressGuidedMomentumSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 7 | no | yes |
| 112 | `RuntimeTab` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx` | 2 | 7 | no | yes |
| 113 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 2 | 6 | no | yes |
| 114 | `PlayerProgressNextBadgeSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 5 | no | yes |
| 115 | `KangurLearnerProfileOverviewGuidedRoundsMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 5 | no | yes |
| 116 | `PlayerProgressTopActivitySection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 4 | no | yes |
| 117 | `CaseResolverNestedScopeToggle` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 118 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 119 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 2 | 3 | no | yes |
| 120 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 2 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 3 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 4 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 5 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 6 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 7 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 8 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 9 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 10 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 11 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 12 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735` |
| 13 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744` |
| 14 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `subjectDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744` |
| 15 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> closeAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 16 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> contentId` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 17 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> currentChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 18 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> defaultChoiceLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 19 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 20 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> doneLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 21 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> groupAriaLabel` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 22 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> header` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 23 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> onOpenChange` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 24 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> open` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 25 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> options` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 26 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurChoiceDialog` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756` |
| 27 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> description` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:765` |
| 28 | 182 | `KangurPrimaryNavigationChoiceDialogs` | `KangurDialogMeta` | 14 | 1 | `ageGroupDialog -> title` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:765` |
| 29 | 132 | `KangurLessonActivityRuntime` | `CalendarInteractiveGame` | 9 | 1 | `rendererProps -> calendarSection` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:73` |
| 30 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> hideModeSwitch` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 31 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> initialMode` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 32 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> section` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 33 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showHourHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 34 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showMinuteHand` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 35 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTaskTitle` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 36 | 132 | `KangurLessonActivityRuntime` | `ClockTrainingGame` | 9 | 1 | `rendererProps -> showTimeDisplay` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:82` |
| 37 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> action` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 38 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 39 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> progressLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 40 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> questLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 41 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardAccent` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 42 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> rewardLabel` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 43 | 132 | `DailyQuestCard` | `KangurDailyQuestHighlightCardContent` | 9 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:78` |
| 44 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 45 | 132 | `DailyQuestCard` | `KangurTransitionLink` | 9 | 1 | `dailyQuest -> targetPageKey` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx:81` |
| 46 | 124 | `KangurLessonActivityRuntime` | `GeometryDrawingGame` | 9 | 1 | `rendererProps -> rendererProps` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx:97` |
| 47 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> accent` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 48 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> dataTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 49 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> durationText` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 50 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 51 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> scoreText` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 52 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> subtitle` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 53 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpTestId` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 54 | 122 | `ScoreHistoryRecentSessionEntry` | `KangurSessionHistoryRow` | 8 | 1 | `score -> xpText` | `src/features/kangur/ui/components/ScoreHistory.tsx:319` |
| 55 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:57` |
| 56 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:57` |
| 57 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> onClick` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:57` |
| 58 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> aside` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:71` |
| 59 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> icon` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:71` |
| 60 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:74` |
| 61 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:74` |
| 62 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconBadge` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:111` |
| 63 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 64 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 65 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> summary` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 66 | 122 | `StructureTab` | `GamesLibraryCompactMetric` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:109` |
| 67 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 68 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 69 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> eyebrow` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:139` |
| 70 | 122 | `StructureTab` | `GamesLibraryDetailSurface` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:213` |
| 71 | 112 | `KangurLearnerProfileOperationCard` | `KangurInfoCard` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:155` |
| 72 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:185` |
| 73 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> transitionSourceId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:185` |
| 74 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> dataTestId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:196` |
| 75 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:196` |
| 76 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:218` |
| 77 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:218` |
| 78 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 79 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 80 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelCapabilityBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:658` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurButton` | 5 | 1 | `item -> item -> onClick` |
| 2 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurAssignmentPriorityChip` | 5 | 1 | `item -> priority -> priority` |
| 3 | 123 | 3 | `KangurAssignmentManagerSuggestedCard` | `KangurGlassPanel` | 5 | 1 | `item -> testId -> data-testid` |
| 4 | 123 | 3 | `KangurAssignmentManagerCatalogCard` | `KangurButton` | 5 | 1 | `item -> item -> onClick` |
| 5 | 123 | 3 | `KangurAssignmentManagerCatalogCard` | `KangurGlassPanel` | 5 | 1 | `item -> testId -> data-testid` |
| 6 | 113 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryCardContent` | 4 | 1 | `isSixYearOld -> isSixYearOld -> aside` |
| 7 | 113 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 4 | 1 | `translations -> translations -> description` |
| 8 | 113 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 4 | 1 | `translations -> translations -> label` |
| 9 | 113 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 4 | 1 | `translations -> translations -> description` |
| 10 | 113 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 4 | 1 | `translations -> translations -> label` |
| 11 | 103 | 3 | `DivisionGameRoundView` | `ShareVisual` | 3 | 1 | `question -> question -> a` |
| 12 | 103 | 3 | `DivisionGameRoundView` | `ShareVisual` | 3 | 1 | `question -> question -> b` |
| 13 | 103 | 3 | `DivisionGameRoundView` | `ShareVisual` | 3 | 1 | `question -> question -> quotient` |
| 14 | 103 | 3 | `DivisionGameRoundView` | `KangurAnswerChoiceCard` | 3 | 1 | `confirmed -> confirmed -> buttonClassName` |
| 15 | 103 | 3 | `DivisionGameRoundView` | `KangurAnswerChoiceCard` | 3 | 1 | `confirmed -> confirmed -> interactive` |
| 16 | 103 | 3 | `SubtractingGameRoundView` | `AppleVisual` | 3 | 1 | `question -> question -> a` |
| 17 | 103 | 3 | `SubtractingGameRoundView` | `AppleVisual` | 3 | 1 | `question -> question -> b` |
| 18 | 103 | 3 | `SubtractingGameRoundView` | `KangurAnswerChoiceCard` | 3 | 1 | `confirmed -> confirmed -> buttonClassName` |
| 19 | 103 | 3 | `SubtractingGameRoundView` | `KangurAnswerChoiceCard` | 3 | 1 | `confirmed -> confirmed -> interactive` |
| 20 | 103 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 3 | 1 | `snapshot -> snapshot -> description` |
| 21 | 103 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 3 | 1 | `snapshot -> snapshot -> value` |
| 22 | 103 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurProgressBar` | 3 | 1 | `snapshot -> snapshot -> value` |
| 23 | 103 | 3 | `KangurLearnerProfileOperationsPanel` | `KangurLearnerProfileOperationStat` | 3 | 1 | `translations -> translations -> label` |
| 24 | 99 | 3 | `NavTreeNode` | `Button` | 2 | 2 | `item -> item -> aria-controls` |
| 25 | 99 | 3 | `NavTreeNode` | `Tooltip` | 2 | 2 | `item -> item -> content` |
| 26 | 93 | 3 | `DivisionGameRoundView` | `KangurAnswerChoiceCard` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> buttonClassName` |
| 27 | 93 | 3 | `SubtractingGameRoundView` | `KangurAnswerChoiceCard` | 2 | 1 | `isCoarsePointer -> isCoarsePointer -> buttonClassName` |
| 28 | 93 | 3 | `KangurGameResultFollowupSection` | `KangurProgressBar` | 2 | 1 | `nextBadge -> nextBadge -> value` |
| 29 | 93 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryOptionCard` | 2 | 1 | `gamePageTranslations -> gamePageTranslations -> aria-label` |
| 30 | 93 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryOptionCard` | 2 | 1 | `fallbackCopy -> fallbackCopy -> aria-label` |
| 31 | 93 | 3 | `KangurLearnerProfileActivityPanel` | `KangurActivityColumn` | 2 | 1 | `translations -> translations -> title` |
| 32 | 93 | 3 | `KangurParentDashboardMonitoringHistorySection` | `KangurEmptyState` | 2 | 1 | `translate -> translate -> description` |
| 33 | 93 | 3 | `KangurParentDashboardMonitoringHistorySection` | `KangurEmptyState` | 2 | 1 | `translate -> translate -> title` |
| 34 | 93 | 3 | `KangurParentDashboardMonitoringHistorySection` | `KangurTextField` | 2 | 1 | `translate -> translate -> aria-label` |
| 35 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `checked -> checked -> isCorrect` |
| 36 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `draggingId -> draggingId -> draggingId` |
| 37 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 38 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onSelectItem -> onSelectItem -> onSelect` |
| 39 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onStartDragging -> onStartDragging -> onDragStart` |
| 40 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onStartDragging -> onStartDragging -> onDragEnd` |
| 41 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `selectedItemId -> selectedItemId -> isSelected` |
| 42 | 83 | 3 | `HierarchyList` | `HierarchyItemButton` | 1 | 1 | `onItemClick -> onItemClick -> onItemClick` |
| 43 | 83 | 3 | `ArtShapesRotationGapGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 44 | 83 | 3 | `DivisionGameRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `onSelect -> onSelect -> onClick` |
| 45 | 83 | 3 | `DivisionGroupsRoundView` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel -> finishLabel` |
| 46 | 83 | 3 | `DivisionGroupsRoundView` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish -> onFinish` |
| 47 | 83 | 3 | `NumberBalanceRushBoardSide` | `NumberTile` | 1 | 1 | `canInteract -> canInteract -> isDragDisabled` |
| 48 | 83 | 3 | `NumberBalanceRushBoardSide` | `NumberTile` | 1 | 1 | `canInteract -> canInteract -> onClick` |
| 49 | 83 | 3 | `NumberBalanceRushBoardSide` | `NumberTile` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 50 | 83 | 3 | `NumberBalanceRushBoardSide` | `NumberTile` | 1 | 1 | `selectedTileId -> selectedTileId -> isSelected` |
| 51 | 83 | 3 | `NumberBalanceRushBoardSide` | `NumberTile` | 1 | 1 | `setSelectedTileId -> setSelectedTileId -> onClick` |
| 52 | 83 | 3 | `NumberBalanceRushTray` | `NumberTile` | 1 | 1 | `canInteract -> canInteract -> isDragDisabled` |
| 53 | 83 | 3 | `NumberBalanceRushTray` | `NumberTile` | 1 | 1 | `canInteract -> canInteract -> onClick` |
| 54 | 83 | 3 | `NumberBalanceRushTray` | `NumberTile` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 55 | 83 | 3 | `NumberBalanceRushTray` | `NumberTile` | 1 | 1 | `selectedTileId -> selectedTileId -> isSelected` |
| 56 | 83 | 3 | `NumberBalanceRushTray` | `NumberTile` | 1 | 1 | `setSelectedTileId -> setSelectedTileId -> onClick` |
| 57 | 83 | 3 | `ScoreHistory` | `KangurTransitionLink` | 1 | 1 | `basePath -> basePath -> href` |
| 58 | 83 | 3 | `ShapeRecognitionGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 59 | 83 | 3 | `ShapeRecognitionGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> variant` |
| 60 | 83 | 3 | `SubtractingGameRoundView` | `KangurAnswerChoiceCard` | 1 | 1 | `onSelect -> onSelect -> onClick` |
| 61 | 83 | 3 | `CompleteEquationMobile` | `KangurButton` | 1 | 1 | `onResult -> onCheck -> onClick` |
| 62 | 83 | 3 | `CompleteEquationDesktop` | `KangurButton` | 1 | 1 | `onResult -> onCheck -> onClick` |
| 63 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `gameMode -> gameMode -> variant` |
| 64 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> className` |
| 65 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `onResetSession -> onResetSession -> onClick` |
| 66 | 83 | 3 | `ClockTrainingGuidanceSlot` | `KangurInfoCard` | 1 | 1 | `trainingSectionContent -> trainingSectionContent -> accent` |
| 67 | 83 | 3 | `KangurGameResultFollowupSection` | `KangurStatusChip` | 1 | 1 | `currentQuest -> currentQuest -> accent` |
| 68 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryCardContent` | 1 | 1 | `recommendedLessonQuizScreen -> isRecommended -> aside` |
| 69 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryCardContent` | 1 | 1 | `quickPracticeGameChipLabel -> quickPracticeGameChipLabel -> aside` |
| 70 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurStatusChip` | 1 | 1 | `quickPracticeGameChipLabel -> quickPracticeGameChipLabel -> aria-label` |
| 71 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryCardContent` | 1 | 1 | `recommendation -> recommendation -> aside` |
| 72 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurStatusChip` | 1 | 1 | `recommendation -> recommendation -> aria-label` |
| 73 | 83 | 3 | `KangurGameOperationSelectorQuickPracticeSection` | `KangurIconSummaryOptionCard` | 1 | 1 | `setScreen -> setScreen -> onClick` |
| 74 | 83 | 3 | `KangurGameOperationSelectorTrainingSection` | `KangurPracticeAssignmentBanner` | 1 | 1 | `mixedPracticeAssignment -> assignment -> assignment` |
| 75 | 83 | 3 | `KangurGameOperationSelectorTrainingSection` | `KangurPracticeAssignmentBanner` | 1 | 1 | `basePath -> basePath -> basePath` |
| 76 | 83 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 1 | 1 | `dailyQuest -> dailyQuest -> description` |
| 77 | 83 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 1 | 1 | `dailyQuest -> dailyQuest -> value` |
| 78 | 83 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurProgressBar` | 1 | 1 | `dailyQuest -> dailyQuest -> accent` |
| 79 | 83 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurProgressBar` | 1 | 1 | `dailyQuest -> dailyQuest -> value` |
| 80 | 83 | 3 | `KangurLearnerProfileOverviewMetrics` | `KangurMetricCard` | 1 | 1 | `dailyQuestAccent -> dailyQuestAccent -> accent` |

## Top Chain Details (Depth >= 3)

### 1. KangurAssignmentManagerSuggestedCard -> KangurButton

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: item -> item -> onClick
- Component path:
  - `KangurAssignmentManagerSuggestedCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerSuggestedCard` -> `KangurAssignmentManagerCatalogActions`: `item` -> `item` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:174
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `item` -> `onClick` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:116

### 2. KangurAssignmentManagerSuggestedCard -> KangurAssignmentPriorityChip

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: item -> priority -> priority
- Component path:
  - `KangurAssignmentManagerSuggestedCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCardHeader` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx)
  - `KangurAssignmentPriorityChip` (src/features/kangur/ui/components/assignments/KangurAssignmentPriorityChip.tsx)
- Transition lines:
  - `KangurAssignmentManagerSuggestedCard` -> `KangurAssignmentManagerCardHeader`: `item` -> `priority` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:165
  - `KangurAssignmentManagerCardHeader` -> `KangurAssignmentPriorityChip`: `priority` -> `priority` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx:24

### 3. KangurAssignmentManagerSuggestedCard -> KangurGlassPanel

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: item -> testId -> data-testid
- Component path:
  - `KangurAssignmentManagerSuggestedCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerItemCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx)
  - `KangurGlassPanel` (src/features/kangur/ui/design/primitives/KangurPanel.tsx)
- Transition lines:
  - `KangurAssignmentManagerSuggestedCard` -> `KangurAssignmentManagerItemCard`: `item` -> `testId` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:162
  - `KangurAssignmentManagerItemCard` -> `KangurGlassPanel`: `testId` -> `data-testid` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx:57

### 4. KangurAssignmentManagerCatalogCard -> KangurButton

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: item -> item -> onClick
- Component path:
  - `KangurAssignmentManagerCatalogCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerCatalogActions` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogCard` -> `KangurAssignmentManagerCatalogActions`: `item` -> `item` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:200
  - `KangurAssignmentManagerCatalogActions` -> `KangurButton`: `item` -> `onClick` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:116

### 5. KangurAssignmentManagerCatalogCard -> KangurGlassPanel

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: item -> testId -> data-testid
- Component path:
  - `KangurAssignmentManagerCatalogCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx)
  - `KangurAssignmentManagerItemCard` (src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx)
  - `KangurGlassPanel` (src/features/kangur/ui/design/primitives/KangurPanel.tsx)
- Transition lines:
  - `KangurAssignmentManagerCatalogCard` -> `KangurAssignmentManagerItemCard`: `item` -> `testId` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.tsx:191
  - `KangurAssignmentManagerItemCard` -> `KangurGlassPanel`: `testId` -> `data-testid` at src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.cards.tsx:57

### 6. KangurGameOperationSelectorQuickPracticeSection -> KangurIconSummaryCardContent

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: isSixYearOld -> isSixYearOld -> aside
- Component path:
  - `KangurGameOperationSelectorQuickPracticeSection` (src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx)
  - `KangurGameOperationSelectorQuickPracticeOptionCard` (src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx)
  - `KangurIconSummaryCardContent` (src/features/kangur/ui/components/summary-cards/KangurIconSummaryCardContent.tsx)
- Transition lines:
  - `KangurGameOperationSelectorQuickPracticeSection` -> `KangurGameOperationSelectorQuickPracticeOptionCard`: `isSixYearOld` -> `isSixYearOld` at src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeSection.tsx:64
  - `KangurGameOperationSelectorQuickPracticeOptionCard` -> `KangurIconSummaryCardContent`: `isSixYearOld` -> `aside` at src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:71

### 7. KangurLearnerProfileOverviewMetrics -> KangurMetricCard

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: translations -> translations -> description
- Component path:
  - `KangurLearnerProfileOverviewMetrics` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurLearnerProfileOverviewDailyQuestMetric` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurMetricCard` (src/features/kangur/ui/design/primitives/KangurMetricCard.tsx)
- Transition lines:
  - `KangurLearnerProfileOverviewMetrics` -> `KangurLearnerProfileOverviewDailyQuestMetric`: `translations` -> `translations` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:449
  - `KangurLearnerProfileOverviewDailyQuestMetric` -> `KangurMetricCard`: `translations` -> `description` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:363

### 8. KangurLearnerProfileOverviewMetrics -> KangurMetricCard

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: translations -> translations -> label
- Component path:
  - `KangurLearnerProfileOverviewMetrics` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurLearnerProfileOverviewDailyQuestMetric` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurMetricCard` (src/features/kangur/ui/design/primitives/KangurMetricCard.tsx)
- Transition lines:
  - `KangurLearnerProfileOverviewMetrics` -> `KangurLearnerProfileOverviewDailyQuestMetric`: `translations` -> `translations` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:449
  - `KangurLearnerProfileOverviewDailyQuestMetric` -> `KangurMetricCard`: `translations` -> `label` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:363

### 9. KangurLearnerProfileOverviewMetrics -> KangurMetricCard

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: translations -> translations -> description
- Component path:
  - `KangurLearnerProfileOverviewMetrics` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurLearnerProfileOverviewGuidedRoundsMetric` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurMetricCard` (src/features/kangur/ui/design/primitives/KangurMetricCard.tsx)
- Transition lines:
  - `KangurLearnerProfileOverviewMetrics` -> `KangurLearnerProfileOverviewGuidedRoundsMetric`: `translations` -> `translations` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:444
  - `KangurLearnerProfileOverviewGuidedRoundsMetric` -> `KangurMetricCard`: `translations` -> `description` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:327

### 10. KangurLearnerProfileOverviewMetrics -> KangurMetricCard

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: translations -> translations -> label
- Component path:
  - `KangurLearnerProfileOverviewMetrics` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurLearnerProfileOverviewGuidedRoundsMetric` (src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx)
  - `KangurMetricCard` (src/features/kangur/ui/design/primitives/KangurMetricCard.tsx)
- Transition lines:
  - `KangurLearnerProfileOverviewMetrics` -> `KangurLearnerProfileOverviewGuidedRoundsMetric`: `translations` -> `translations` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:444
  - `KangurLearnerProfileOverviewGuidedRoundsMetric` -> `KangurMetricCard`: `translations` -> `label` at src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx:327

### 11. DivisionGameRoundView -> ShareVisual

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: question -> question -> a
- Component path:
  - `DivisionGameRoundView` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `DivisionGameQuestionPanel` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `ShareVisual` (src/features/kangur/ui/components/DivisionGame.tsx)
- Transition lines:
  - `DivisionGameRoundView` -> `DivisionGameQuestionPanel`: `question` -> `question` at src/features/kangur/ui/components/DivisionGame.tsx:625
  - `DivisionGameQuestionPanel` -> `ShareVisual`: `question` -> `a` at src/features/kangur/ui/components/DivisionGame.tsx:507

### 12. DivisionGameRoundView -> ShareVisual

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: question -> question -> b
- Component path:
  - `DivisionGameRoundView` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `DivisionGameQuestionPanel` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `ShareVisual` (src/features/kangur/ui/components/DivisionGame.tsx)
- Transition lines:
  - `DivisionGameRoundView` -> `DivisionGameQuestionPanel`: `question` -> `question` at src/features/kangur/ui/components/DivisionGame.tsx:625
  - `DivisionGameQuestionPanel` -> `ShareVisual`: `question` -> `b` at src/features/kangur/ui/components/DivisionGame.tsx:507

### 13. DivisionGameRoundView -> ShareVisual

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: question -> question -> quotient
- Component path:
  - `DivisionGameRoundView` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `DivisionGameQuestionPanel` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `ShareVisual` (src/features/kangur/ui/components/DivisionGame.tsx)
- Transition lines:
  - `DivisionGameRoundView` -> `DivisionGameQuestionPanel`: `question` -> `question` at src/features/kangur/ui/components/DivisionGame.tsx:625
  - `DivisionGameQuestionPanel` -> `ShareVisual`: `question` -> `quotient` at src/features/kangur/ui/components/DivisionGame.tsx:507

### 14. DivisionGameRoundView -> KangurAnswerChoiceCard

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: confirmed -> confirmed -> buttonClassName
- Component path:
  - `DivisionGameRoundView` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `DivisionGameChoicesGrid` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `DivisionGameRoundView` -> `DivisionGameChoicesGrid`: `confirmed` -> `confirmed` at src/features/kangur/ui/components/DivisionGame.tsx:633
  - `DivisionGameChoicesGrid` -> `KangurAnswerChoiceCard`: `confirmed` -> `buttonClassName` at src/features/kangur/ui/components/DivisionGame.tsx:561

### 15. DivisionGameRoundView -> KangurAnswerChoiceCard

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: confirmed -> confirmed -> interactive
- Component path:
  - `DivisionGameRoundView` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `DivisionGameChoicesGrid` (src/features/kangur/ui/components/DivisionGame.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
- Transition lines:
  - `DivisionGameRoundView` -> `DivisionGameChoicesGrid`: `confirmed` -> `confirmed` at src/features/kangur/ui/components/DivisionGame.tsx:633
  - `DivisionGameChoicesGrid` -> `KangurAnswerChoiceCard`: `confirmed` -> `interactive` at src/features/kangur/ui/components/DivisionGame.tsx:561

## Top Transition Details (Depth = 2)

### 1. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> closeAriaLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 2. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> contentId
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 3. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> currentChoiceLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 4. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> defaultChoiceLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 5. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> doneAriaLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 6. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> doneLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 7. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> groupAriaLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 8. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> header
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 9. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> onOpenChange
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 10. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> open
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 11. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> options
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 12. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> title
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:735

### 13. KangurPrimaryNavigationChoiceDialogs -> KangurDialogMeta

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> description
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744

### 14. KangurPrimaryNavigationChoiceDialogs -> KangurDialogMeta

- Score: 182
- Root fanout: 14
- Prop mapping: subjectDialog -> title
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:744

### 15. KangurPrimaryNavigationChoiceDialogs -> KangurChoiceDialog

- Score: 182
- Root fanout: 14
- Prop mapping: ageGroupDialog -> closeAriaLabel
- Location: src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx:756

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
