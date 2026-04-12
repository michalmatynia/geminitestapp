---
owner: 'Platform Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-04-12T19:07:01.811Z

## Snapshot

- Scanned source files: 7300
- JSX files scanned: 2538
- Components detected: 4457
- Components forwarding parent props (hotspot threshold): 120
- Components forwarding parent props (any): 261
- Resolved forwarded transitions: 871
- Candidate chains (depth >= 2): 871
- Candidate chains (depth >= 3): 25
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 14
- Hotspot forwarding components backlog size: 120

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 198 |
| `feature:integrations` | 13 |
| `shared-ui` | 10 |
| `feature:ai` | 7 |
| `feature:products` | 7 |
| `feature:filemaker` | 6 |
| `feature:cms` | 4 |
| `feature:case-resolver` | 4 |
| `shared-lib` | 3 |
| `feature:admin` | 3 |
| `feature:playwright` | 2 |
| `app` | 2 |
| `feature:notesapp` | 1 |
| `shared` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `LaunchSchedulingSection` | `src/features/filemaker/pages/campaign-edit-sections/LaunchSchedulingSection.tsx` | 16 | 16 | no | yes |
| 2 | `FilemakerMailSidebar` | `src/features/filemaker/components/FilemakerMailSidebar.tsx` | 11 | 28 | no | yes |
| 3 | `IntegrationSelectorFields` | `src/features/integrations/components/listings/IntegrationSelectorFields.tsx` | 11 | 15 | no | yes |
| 4 | `MailAccountSettingsSection` | `src/features/filemaker/pages/mail-page-sections/MailAccountSettingsSection.tsx` | 10 | 15 | no | yes |
| 5 | `AiPathsMasterTreePanel` | `src/features/ai/ai-paths/components/ai-paths-settings/AiPathsMasterTreePanel.tsx` | 9 | 12 | no | yes |
| 6 | `KangurAssignmentSpotlightContent` | `src/features/kangur/ui/components/assignments/KangurAssignmentSpotlight.tsx` | 9 | 9 | no | yes |
| 7 | `StructureTab` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx` | 8 | 24 | no | yes |
| 8 | `KangurLearnerAssignmentsMetrics` | `src/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel.tsx` | 8 | 11 | no | yes |
| 9 | `DivisionGameSummaryView` | `src/features/kangur/ui/components/DivisionGame.tsx` | 8 | 10 | no | yes |
| 10 | `MultiplicationArraySummaryView` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 8 | 10 | no | yes |
| 11 | `SubtractingGameSummaryView` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 8 | 10 | no | yes |
| 12 | `KangurAssignmentManagerTimeLimitModal` | `src/features/kangur/ui/components/assignment-manager/KangurAssignmentManager.modals.tsx` | 8 | 9 | no | yes |
| 13 | `AgenticSortBinsGrid` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 8 | 8 | no | yes |
| 14 | `GameHeader` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 8 | 8 | no | yes |
| 15 | `AgenticSortBin` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 7 | 8 | no | yes |
| 16 | `ShapeRecognitionRoundView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 7 | 8 | no | yes |
| 17 | `AgenticSortPool` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 7 | no | yes |
| 18 | `AgenticSortActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx` | 6 | 6 | no | yes |
| 19 | `AgenticTrimActionsPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 6 | 6 | no | yes |
| 20 | `DailyQuestCard` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget.tsx` | 5 | 15 | no | yes |
| 21 | `CatalogTab` | `src/features/kangur/ui/pages/games-library-tabs/CatalogTab.tsx` | 5 | 11 | no | yes |
| 22 | `KangurGameResultFollowupSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 5 | 10 | no | yes |
| 23 | `InstanceSettingsPanel` | `src/shared/lib/text-editor-engine/pages/AdminTextEditorSettingsPage.tsx` | 5 | 9 | no | yes |
| 24 | `CalendarInteractiveGameSummaryView` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 5 | 8 | no | yes |
| 25 | `AdminKangurSocialSettingsModal` | `src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx` | 5 | 7 | no | yes |
| 26 | `MailSearchSection` | `src/features/filemaker/pages/mail-page-sections/MailSearchSection.tsx` | 5 | 6 | no | yes |
| 27 | `KangurAssignmentsListPrimaryAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 5 | 6 | no | yes |
| 28 | `OrderDetails` | `src/features/products/pages/AdminProductOrdersImportPage.OrderDetails.tsx` | 5 | 6 | no | yes |
| 29 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 5 | 5 | no | yes |
| 30 | `LessonsCatalogResolvedContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 9 | no | yes |
| 31 | `KangurLaunchableGameInstanceRuntime` | `src/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime.tsx` | 4 | 8 | no | yes |
| 32 | `NumberBalanceRushSummaryView` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 7 | no | yes |
| 33 | `SocialCaptureSectionSelector` | `src/features/kangur/social/admin/workspace/SocialCaptureSectionSelector.tsx` | 4 | 6 | no | yes |
| 34 | `ClockHands` | `src/features/kangur/ui/components/ClockLesson.visuals.tsx` | 4 | 6 | no | yes |
| 35 | `KangurParentDashboardGuestCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 36 | `KangurParentDashboardRestrictedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 37 | `KangurParentDashboardManagedCard` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardHeroWidget.tsx` | 4 | 6 | no | yes |
| 38 | `StructuredProductNameField` | `src/features/products/components/form/StructuredProductNameField.tsx` | 4 | 6 | no | yes |
| 39 | `AiPathsCanvasToolbar` | `src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasToolbar.tsx` | 4 | 5 | no | yes |
| 40 | `KangurAssignmentsListTimeLimitAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 41 | `KangurLearnerProfileAiTutorMoodStats` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget.tsx` | 4 | 5 | no | yes |
| 42 | `KangurLessonActivityPrintButton` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 5 | no | yes |
| 43 | `GamesLibraryGameDialog` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 5 | no | yes |
| 44 | `LessonsCatalogIntroCardWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 4 | 5 | no | yes |
| 45 | `ProductListActivityPill` | `src/features/products/components/list/ProductListActivityPill.tsx` | 4 | 5 | no | yes |
| 46 | `ListingRowView` | `src/features/integrations/components/listings/TraderaStatusCheckModal.RowItem.tsx` | 4 | 4 | no | yes |
| 47 | `NumberBalanceRushBoardSide` | `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 4 | 4 | no | yes |
| 48 | `KangurAssignmentsListReassignAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 4 | 4 | no | yes |
| 49 | `ClockTrainingModeSwitchSlot` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 4 | 4 | no | yes |
| 50 | `DraggableClockFace` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 4 | 4 | no | yes |
| 51 | `KangurLessonActivityRuntimeState` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 4 | 4 | no | yes |
| 52 | `LessonActivityShellPillsRow` | `src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx` | 4 | 4 | no | yes |
| 53 | `AiTutorSelectFieldRow` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 4 | 4 | no | yes |
| 54 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | no | yes |
| 55 | `GameStats` | `src/features/kangur/ui/pages/GamesLibraryGameModal.components.tsx` | 4 | 4 | no | yes |
| 56 | `GenericPickerDropdownMenu` | `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx` | 4 | 4 | no | yes |
| 57 | `ScoreHistoryRecentSessionEntry` | `src/features/kangur/ui/components/ScoreHistory.tsx` | 3 | 10 | no | yes |
| 58 | `PlaywrightCaptureRoutesEditor` | `src/shared/ui/playwright/PlaywrightCaptureRoutesEditor.tsx` | 3 | 7 | no | yes |
| 59 | `AddingSynthesisLaneChoiceCard` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 3 | 6 | no | yes |
| 60 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 3 | 5 | no | yes |
| 61 | `KangurGameResultRecommendationSection` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 3 | 5 | no | yes |
| 62 | `HierarchyDraggableItem` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 3 | 4 | no | yes |
| 63 | `ShapeRecognitionFinishedView` | `src/features/kangur/ui/components/ShapeRecognitionGame.tsx` | 3 | 4 | no | yes |
| 64 | `KangurGameOperationRecommendationCard` | `src/features/kangur/ui/components/game-setup/KangurGameOperationRecommendationCard.tsx` | 3 | 4 | no | yes |
| 65 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 3 | 4 | no | yes |
| 66 | `CanvasSelectedWireEndpointCard` | `src/features/ai/ai-paths/components/canvas-sidebar-primitives.tsx` | 3 | 3 | no | yes |
| 67 | `ThemeSettingsFieldsSection` | `src/features/cms/components/page-builder/theme/ThemeSettingsFieldsSection.tsx` | 3 | 3 | no | yes |
| 68 | `ExportLogsPanel` | `src/features/integrations/components/listings/ExportLogsPanel.tsx` | 3 | 3 | no | yes |
| 69 | `CatalogCategoryTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogCategoryTable.tsx` | 3 | 3 | no | yes |
| 70 | `CatalogEntriesTable` | `src/features/integrations/pages/marketplaces/tradera/components/CatalogEntriesTable.tsx` | 3 | 3 | no | yes |
| 71 | `MappingsRulesTable` | `src/features/integrations/pages/marketplaces/tradera/components/MappingsRulesTable.tsx` | 3 | 3 | no | yes |
| 72 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 3 | 3 | no | yes |
| 73 | `SocialCaptureBatchHistory` | `src/features/kangur/social/admin/workspace/SocialCaptureBatchHistory.tsx` | 3 | 3 | no | yes |
| 74 | `SocialJobStatusPill` | `src/features/kangur/social/admin/workspace/SocialJobStatusPill.tsx` | 3 | 3 | no | yes |
| 75 | `AgenticTrimTokenPanel` | `src/features/kangur/ui/components/AgenticCodingMiniGames.trim.tsx` | 3 | 3 | no | yes |
| 76 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 3 | 3 | no | yes |
| 77 | `GuestIntroProposal` | `src/features/kangur/ui/components/KangurAiTutorGuestIntroPanel.tsx` | 3 | 3 | no | yes |
| 78 | `MultiplicationArrayCounters` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 3 | 3 | no | yes |
| 79 | `KangurAssignmentsListArchiveAction` | `src/features/kangur/ui/components/assignments/KangurAssignmentsList.tsx` | 3 | 3 | no | yes |
| 80 | `ClockTrainingModeSwitch` | `src/features/kangur/ui/components/clock-training/ClockTrainingGame.views.tsx` | 3 | 3 | no | yes |
| 81 | `DraggableClockSnapModeSwitch` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 82 | `DraggableClockSubmitArea` | `src/features/kangur/ui/components/clock-training/DraggableClock.parts.tsx` | 3 | 3 | no | yes |
| 83 | `KangurGameOperationPracticeAssignmentBanner` | `src/features/kangur/ui/components/game-setup/KangurGameOperationPracticeAssignmentBanner.tsx` | 3 | 3 | no | yes |
| 84 | `KangurLessonActivityEditorPreview` | `src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx` | 3 | 3 | no | yes |
| 85 | `AiTutorPanelHeader` | `src/features/kangur/ui/components/parent-dashboard/KangurParentDashboardAiTutorWidget.sections.tsx` | 3 | 3 | no | yes |
| 86 | `KangurPrimaryNavigationMobileMenuOverlay` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 3 | 3 | no | yes |
| 87 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives/KangurInlineFallback.tsx` | 3 | 3 | no | yes |
| 88 | `KangurPrimaryNavigationChoiceDialogs` | `src/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.tsx` | 2 | 28 | no | yes |
| 89 | `KangurLessonActivityRuntime` | `src/features/kangur/ui/components/KangurLessonActivityRuntime.tsx` | 2 | 12 | no | yes |
| 90 | `PlayerProgressGuidedMomentumSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 7 | no | yes |
| 91 | `RuntimeTab` | `src/features/kangur/ui/pages/games-library-tabs/RuntimeTab.tsx` | 2 | 7 | no | yes |
| 92 | `CanvasSvgNode` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx` | 2 | 6 | no | yes |
| 93 | `KangurLearnerProfileOverviewDailyQuestMetric` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget.tsx` | 2 | 6 | no | yes |
| 94 | `PlayerProgressNextBadgeSection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 5 | no | yes |
| 95 | `PlayerProgressTopActivitySection` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 2 | 4 | no | yes |
| 96 | `NavTreeNode` | `src/features/admin/components/menu/NavTree.tsx` | 2 | 3 | no | yes |
| 97 | `CaseResolverNestedScopeToggle` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 98 | `CaseResolverCreateActionBar` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 3 | no | yes |
| 99 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 2 | 3 | no | yes |
| 100 | `KangurGameResultAssignmentBanner` | `src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx` | 2 | 3 | no | yes |
| 101 | `OperationSelectorRecommendationChip` | `src/features/kangur/ui/components/game-setup/OperationSelector.tsx` | 2 | 3 | no | yes |
| 102 | `LessonsCatalogEmptyStateWithPageContent` | `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx` | 2 | 3 | no | yes |
| 103 | `PlaywrightEngineSettingsModal` | `src/features/playwright/components/PlaywrightEngineSettingsModal.tsx` | 2 | 3 | no | yes |
| 104 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 2 | 2 | no | yes |
| 105 | `CaseResolverContextNotice` | `src/features/case-resolver/components/CaseResolverTreeHeader.tsx` | 2 | 2 | no | yes |
| 106 | `RunDeliveryLogSection` | `src/features/filemaker/pages/campaign-run-sections/RunDeliveryLogSection.tsx` | 2 | 2 | no | yes |
| 107 | `BrowserSessionCard` | `src/features/integrations/components/connections/integration-modal/IntegrationSettingsContent.tsx` | 2 | 2 | no | yes |
| 108 | `IntegrationSelectionLoadingState` | `src/features/integrations/components/listings/IntegrationSelectionLoadingState.tsx` | 2 | 2 | no | yes |
| 109 | `ListingSettingsModalProvider` | `src/features/integrations/components/listings/ListingSettingsModalProvider.tsx` | 2 | 2 | no | yes |
| 110 | `TraderaQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/TraderaQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 111 | `VintedQuickExportRecoveryBanner` | `src/features/integrations/components/listings/product-listings-modal/VintedQuickExportRecoveryBanner.tsx` | 2 | 2 | no | yes |
| 112 | `SocialPostEditorModal` | `src/features/kangur/social/admin/workspace/SocialPost.EditorModal.tsx` | 2 | 2 | no | yes |
| 113 | `HierarchyList` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 2 | 2 | no | yes |
| 114 | `ArtShapesRotationGapGameFinishedView` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx` | 2 | 2 | no | yes |
| 115 | `DivisionGroupsSummaryView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 2 | 2 | no | yes |
| 116 | `DivisionGroupsRoundView` | `src/features/kangur/ui/components/DivisionGroupsGame.tsx` | 2 | 2 | no | yes |
| 117 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 2 | 2 | no | yes |
| 118 | `KangurLanguageSwitcherMenu` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 119 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 2 | 2 | no | yes |
| 120 | `KangurNavActionButton` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 2 | 2 | no | yes |

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
| 55 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 56 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 57 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryOptionCard` | 8 | 1 | `option -> onClick` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:50` |
| 58 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> aside` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:64` |
| 59 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconSummaryCardContent` | 8 | 1 | `option -> icon` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:64` |
| 60 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:67` |
| 61 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurStatusChip` | 8 | 1 | `option -> data-testid` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:67` |
| 62 | 122 | `KangurGameOperationSelectorQuickPracticeOptionCard` | `KangurIconBadge` | 8 | 1 | `option -> accent` | `src/features/kangur/ui/components/game-setup/KangurGameOperationSelectorQuickPracticeOptionCard.tsx:104` |
| 63 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 64 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 65 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> summary` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:103` |
| 66 | 122 | `StructureTab` | `GamesLibraryCompactMetric` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:109` |
| 67 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> title` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 68 | 122 | `StructureTab` | `KangurEmptyState` | 8 | 1 | `translations -> description` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:130` |
| 69 | 122 | `StructureTab` | `GamesLibrarySectionHeader` | 8 | 1 | `translations -> eyebrow` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:139` |
| 70 | 122 | `StructureTab` | `GamesLibraryDetailSurface` | 8 | 1 | `translations -> label` | `src/features/kangur/ui/pages/games-library-tabs/StructureTab.tsx:213` |
| 71 | 112 | `KangurLearnerProfileOperationCard` | `KangurInfoCard` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:138` |
| 72 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> href` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 73 | 112 | `KangurLearnerProfileOperationCard` | `KangurTransitionLink` | 7 | 1 | `item -> transitionSourceId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:168` |
| 74 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> dataTestId` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 75 | 112 | `KangurLearnerProfileOperationCard` | `KangurLearnerProfileOperationStat` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:179` |
| 76 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> data-testid` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 77 | 112 | `KangurLearnerProfileOperationCard` | `KangurProgressBar` | 7 | 1 | `item -> value` | `src/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget.tsx:201` |
| 78 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> nodeId` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 79 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelSelectionBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:651` |
| 80 | 92 | `CanvasSvgNode` | `CanvasSvgNodeModelCapabilityBadge` | 5 | 1 | `node -> visible` | `src/features/ai/ai-paths/components/CanvasSvgNode.tsx:658` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 93 | 3 | `KangurGameResultFollowupSection` | `KangurProgressBar` | 2 | 1 | `nextBadge -> nextBadge -> value` |
| 2 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `checked -> checked -> isCorrect` |
| 3 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `draggingId -> draggingId -> draggingId` |
| 4 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> isCoarsePointer` |
| 5 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onSelectItem -> onSelectItem -> onSelect` |
| 6 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onStartDragging -> onStartDragging -> onDragStart` |
| 7 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `onStartDragging -> onStartDragging -> onDragEnd` |
| 8 | 83 | 3 | `AgenticSortBinsGrid` | `DraggableToken` | 1 | 1 | `selectedItemId -> selectedItemId -> isSelected` |
| 9 | 83 | 3 | `HierarchyList` | `HierarchyItemButton` | 1 | 1 | `onItemClick -> onItemClick -> onItemClick` |
| 10 | 83 | 3 | `ArtShapesRotationGapGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 11 | 83 | 3 | `DivisionGroupsRoundView` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel -> finishLabel` |
| 12 | 83 | 3 | `DivisionGroupsRoundView` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish -> onFinish` |
| 13 | 83 | 3 | `ScoreHistory` | `KangurTransitionLink` | 1 | 1 | `basePath -> basePath -> href` |
| 14 | 83 | 3 | `ShapeRecognitionGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 15 | 83 | 3 | `ShapeRecognitionGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> variant` |
| 16 | 83 | 3 | `CompleteEquationMobile` | `KangurButton` | 1 | 1 | `onResult -> onCheck -> onClick` |
| 17 | 83 | 3 | `CompleteEquationDesktop` | `KangurButton` | 1 | 1 | `onResult -> onCheck -> onClick` |
| 18 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `gameMode -> gameMode -> variant` |
| 19 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `isCoarsePointer -> isCoarsePointer -> className` |
| 20 | 83 | 3 | `ClockTrainingModeSwitchSlot` | `KangurButton` | 1 | 1 | `onResetSession -> onResetSession -> onClick` |
| 21 | 83 | 3 | `ClockTrainingGuidanceSlot` | `KangurInfoCard` | 1 | 1 | `trainingSectionContent -> trainingSectionContent -> accent` |
| 22 | 83 | 3 | `KangurGameResultFollowupSection` | `KangurStatusChip` | 1 | 1 | `currentQuest -> currentQuest -> accent` |
| 23 | 83 | 3 | `KangurLessonActivityRuntimeState` | `CalendarInteractiveGame` | 1 | 1 | `onFinish -> onFinish -> onFinish` |
| 24 | 83 | 3 | `KangurLessonActivityRuntimeState` | `ClockTrainingGame` | 1 | 1 | `onFinish -> onFinish -> onFinish` |
| 25 | 83 | 3 | `KangurLessonActivityRuntimeState` | `GeometryDrawingGame` | 1 | 1 | `onFinish -> onFinish -> onFinish` |

## Top Chain Details (Depth >= 3)

### 1. KangurGameResultFollowupSection -> KangurProgressBar

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: nextBadge -> nextBadge -> value
- Component path:
  - `KangurGameResultFollowupSection` (src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx)
  - `KangurGameResultFollowupContent` (src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx)
  - `KangurProgressBar` (src/features/kangur/ui/design/primitives/KangurProgressBar.tsx)
- Transition lines:
  - `KangurGameResultFollowupSection` -> `KangurGameResultFollowupContent`: `nextBadge` -> `nextBadge` at src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:566
  - `KangurGameResultFollowupContent` -> `KangurProgressBar`: `nextBadge` -> `value` at src/features/kangur/ui/components/game-runtime/KangurGameResultWidget.tsx:532

### 2. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: checked -> checked -> isCorrect
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `checked` -> `checked` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `checked` -> `isCorrect` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 3. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: draggingId -> draggingId -> draggingId
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `draggingId` -> `draggingId` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `draggingId` -> `draggingId` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 4. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: isCoarsePointer -> isCoarsePointer -> isCoarsePointer
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `isCoarsePointer` -> `isCoarsePointer` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 5. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onSelectItem -> onSelectItem -> onSelect
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `onSelectItem` -> `onSelectItem` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `onSelectItem` -> `onSelect` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 6. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onStartDragging -> onStartDragging -> onDragStart
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `onStartDragging` -> `onStartDragging` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `onStartDragging` -> `onDragStart` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 7. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onStartDragging -> onStartDragging -> onDragEnd
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `onStartDragging` -> `onStartDragging` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `onStartDragging` -> `onDragEnd` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 8. AgenticSortBinsGrid -> DraggableToken

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: selectedItemId -> selectedItemId -> isSelected
- Component path:
  - `AgenticSortBinsGrid` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `AgenticSortBin` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
  - `DraggableToken` (src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx)
- Transition lines:
  - `AgenticSortBinsGrid` -> `AgenticSortBin`: `selectedItemId` -> `selectedItemId` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:374
  - `AgenticSortBin` -> `DraggableToken`: `selectedItemId` -> `isSelected` at src/features/kangur/ui/components/AgenticCodingMiniGames.sort.tsx:330

### 9. HierarchyList -> HierarchyItemButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onItemClick -> onItemClick -> onItemClick
- Component path:
  - `HierarchyList` (src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx)
  - `HierarchyDraggableItem` (src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx)
  - `HierarchyItemButton` (src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx)
- Transition lines:
  - `HierarchyList` -> `HierarchyDraggableItem`: `onItemClick` -> `onItemClick` at src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:288
  - `HierarchyDraggableItem` -> `HierarchyItemButton`: `onItemClick` -> `onItemClick` at src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:232

### 10. ArtShapesRotationGapGame -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onClick
- Component path:
  - `ArtShapesRotationGapGame` (src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx)
  - `ArtShapesRotationGapGameFinishedView` (src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `ArtShapesRotationGapGame` -> `ArtShapesRotationGapGameFinishedView`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx:384
  - `ArtShapesRotationGapGameFinishedView` -> `KangurButton`: `onFinish` -> `onClick` at src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx:191

### 11. DivisionGroupsRoundView -> KangurPracticeGameSummaryActions

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: finishLabel -> finishLabel -> finishLabel
- Component path:
  - `DivisionGroupsRoundView` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `DivisionGroupsSummaryView` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `KangurPracticeGameSummaryActions` (src/features/kangur/ui/components/KangurPracticeGameChrome.tsx)
- Transition lines:
  - `DivisionGroupsRoundView` -> `DivisionGroupsSummaryView`: `finishLabel` -> `finishLabel` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:602
  - `DivisionGroupsSummaryView` -> `KangurPracticeGameSummaryActions`: `finishLabel` -> `finishLabel` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:290

### 12. DivisionGroupsRoundView -> KangurPracticeGameSummaryActions

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onFinish
- Component path:
  - `DivisionGroupsRoundView` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `DivisionGroupsSummaryView` (src/features/kangur/ui/components/DivisionGroupsGame.tsx)
  - `KangurPracticeGameSummaryActions` (src/features/kangur/ui/components/KangurPracticeGameChrome.tsx)
- Transition lines:
  - `DivisionGroupsRoundView` -> `DivisionGroupsSummaryView`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:602
  - `DivisionGroupsSummaryView` -> `KangurPracticeGameSummaryActions`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/DivisionGroupsGame.tsx:290

### 13. ScoreHistory -> KangurTransitionLink

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: basePath -> basePath -> href
- Component path:
  - `ScoreHistory` (src/features/kangur/ui/components/ScoreHistory.tsx)
  - `ScoreHistoryWeakestPanel` (src/features/kangur/ui/components/ScoreHistory.tsx)
  - `KangurTransitionLink` (src/features/kangur/ui/components/KangurTransitionLink.tsx)
- Transition lines:
  - `ScoreHistory` -> `ScoreHistoryWeakestPanel`: `basePath` -> `basePath` at src/features/kangur/ui/components/ScoreHistory.tsx:461
  - `ScoreHistoryWeakestPanel` -> `KangurTransitionLink`: `basePath` -> `href` at src/features/kangur/ui/components/ScoreHistory.tsx:248

### 14. ShapeRecognitionGame -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onClick
- Component path:
  - `ShapeRecognitionGame` (src/features/kangur/ui/components/ShapeRecognitionGame.tsx)
  - `ShapeRecognitionFinishedView` (src/features/kangur/ui/components/ShapeRecognitionGame.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `ShapeRecognitionGame` -> `ShapeRecognitionFinishedView`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/ShapeRecognitionGame.tsx:304
  - `ShapeRecognitionFinishedView` -> `KangurButton`: `onFinish` -> `onClick` at src/features/kangur/ui/components/ShapeRecognitionGame.tsx:146

### 15. ShapeRecognitionGame -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> variant
- Component path:
  - `ShapeRecognitionGame` (src/features/kangur/ui/components/ShapeRecognitionGame.tsx)
  - `ShapeRecognitionFinishedView` (src/features/kangur/ui/components/ShapeRecognitionGame.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `ShapeRecognitionGame` -> `ShapeRecognitionFinishedView`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/ShapeRecognitionGame.tsx:304
  - `ShapeRecognitionFinishedView` -> `KangurButton`: `onFinish` -> `variant` at src/features/kangur/ui/components/ShapeRecognitionGame.tsx:157

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
