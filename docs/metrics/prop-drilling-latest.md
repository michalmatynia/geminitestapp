# Prop Drilling Scan

Generated at: 2026-03-07T15:31:28.475Z

## Snapshot

- Scanned source files: 4416
- JSX files scanned: 1642
- Components detected: 2470
- Components forwarding parent props (hotspot threshold): 33
- Components forwarding parent props (any): 61
- Resolved forwarded transitions: 153
- Candidate chains (depth >= 2): 153
- Candidate chains (depth >= 3): 14
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 10
- Hotspot forwarding components backlog size: 33

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 55 |
| `feature:cms` | 4 |
| `feature:foldertree` | 1 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 12 | 21 | no | yes |
| 2 | `KangurSectionHeading` | `src/features/kangur/ui/design/primitives.tsx` | 6 | 7 | no | yes |
| 3 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives.tsx` | 6 | 6 | yes | yes |
| 4 | `KangurFeatureHeader` | `src/features/kangur/ui/design/primitives.tsx` | 5 | 6 | no | yes |
| 5 | `KangurSummaryPanel` | `src/features/kangur/ui/design/primitives.tsx` | 5 | 6 | yes | yes |
| 6 | `NavAction` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 4 | 4 | no | yes |
| 7 | `KangurGlassPanel` | `src/features/kangur/ui/design/primitives.tsx` | 4 | 4 | yes | yes |
| 8 | `ExamQuestion` | `src/features/kangur/ui/components/KangurExam.tsx` | 3 | 5 | no | yes |
| 9 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 3 | 4 | no | yes |
| 10 | `KangurPriorityAssignments` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx` | 3 | 4 | no | yes |
| 11 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 4 | no | yes |
| 12 | `CheckboxCardField` | `src/features/foldertree/pages/folder-tree-settings/InstanceSettingsPanel.tsx` | 3 | 3 | no | yes |
| 13 | `SvgCodeEditor` | `src/features/kangur/admin/components/SvgCodeEditor.tsx` | 3 | 3 | no | yes |
| 14 | `ExamSummary` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 3 | 3 | no | yes |
| 15 | `KangurTestSuitePlayer` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 3 | 3 | no | yes |
| 16 | `KangurEmptyState` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 17 | `KangurMetricCard` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 18 | `SummaryContent` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 2 | 11 | no | yes |
| 19 | `SectionView` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 2 | 3 | no | yes |
| 20 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 2 | 3 | no | yes |
| 21 | `AnalyticsCountList` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 2 | 2 | no | yes |
| 22 | `StatefulQuestionEditorHarness` | `src/features/kangur/admin/KangurTestQuestionEditor.test.tsx` | 2 | 2 | no | yes |
| 23 | `KangurDocsTooltipEnhancer` | `src/features/kangur/docs/tooltips.tsx` | 2 | 2 | no | yes |
| 24 | `QuestionView` | `src/features/kangur/ui/components/KangurGame.tsx` | 2 | 2 | no | yes |
| 25 | `KangurQuestionIllustrationRenderer` | `src/features/kangur/ui/components/KangurQuestionIllustrationRenderer.tsx` | 2 | 2 | no | yes |
| 26 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 2 | 2 | no | yes |
| 27 | `LessonHub` | `src/features/kangur/ui/components/LessonHub.tsx` | 2 | 2 | no | yes |
| 28 | `ResultScreen` | `src/features/kangur/ui/components/ResultScreen.tsx` | 2 | 2 | no | yes |
| 29 | `PerformanceBaselineCard` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 2 | no | no |
| 30 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 2 | no | no |
| 31 | `KangurPracticeAssignmentBanner` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx` | 1 | 2 | no | no |
| 32 | `CmsBuilderLeftPanel` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx` | 1 | 1 | no | no |
| 33 | `MetricCard` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 1 | no | no |
| 34 | `AdminKangurPageShell` | `src/features/kangur/admin/AdminKangurPageShell.tsx` | 1 | 1 | no | no |
| 35 | `StatefulNarrationPanelHarness` | `src/features/kangur/admin/KangurLessonNarrationPanel.test.tsx` | 1 | 1 | no | no |
| 36 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 37 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 38 | `SlotZone` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 39 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 40 | `AddingSynthesisGame` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 1 | 1 | no | no |
| 41 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 42 | `CalendarTrainingGame` | `src/features/kangur/ui/components/CalendarTrainingGame.tsx` | 1 | 1 | no | no |
| 43 | `DraggableClock` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 44 | `ClockTrainingGame` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 45 | `DifficultySelector` | `src/features/kangur/ui/components/DifficultySelector.tsx` | 1 | 1 | no | no |
| 46 | `DivisionGame` | `src/features/kangur/ui/components/DivisionGame.tsx` | 1 | 1 | no | no |
| 47 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 48 | `KangurAssignmentManager` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1 | 1 | no | no |
| 49 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 1 | 1 | no | no |
| 50 | `KangurLearnerAssignmentsPanel` | `src/features/kangur/ui/components/KangurLearnerAssignmentsPanel.tsx` | 1 | 1 | no | no |
| 51 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 52 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 53 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 54 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 1 | no | no |
| 55 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 56 | `KangurLessonNavigationBoundary` | `src/features/kangur/ui/context/KangurLessonNavigationContext.tsx` | 1 | 1 | no | no |
| 57 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 58 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 59 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRendererServer.tsx` | 0 | 0 | yes | yes |
| 60 | `KangurTestQuestionEditor` | `src/features/kangur/admin/KangurTestQuestionEditor.tsx` | 0 | 0 | yes | yes |
| 61 | `VectorCanvas` | `src/shared/ui/vector-canvas/index.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 148 | `SummaryContent` | `StatusBadge` | 10 | 2 | `summary -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:513` |
| 2 | 148 | `SummaryContent` | `MetadataItem` | 10 | 2 | `summary -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:526` |
| 3 | 142 | `SummaryContent` | `MetricCard` | 10 | 1 | `summary -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:545` |
| 4 | 142 | `SummaryContent` | `MetricCard` | 10 | 1 | `summary -> hint` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:552` |
| 5 | 142 | `SummaryContent` | `AlertsGrid` | 10 | 1 | `summary -> alerts` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:578` |
| 6 | 142 | `SummaryContent` | `RouteMetricCard` | 10 | 1 | `summary -> route` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:586` |
| 7 | 142 | `SummaryContent` | `PerformanceBaselineCard` | 10 | 1 | `summary -> baseline` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:596` |
| 8 | 142 | `SummaryContent` | `AnalyticsCountList` | 10 | 1 | `summary -> items` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:600` |
| 9 | 142 | `SummaryContent` | `RecentAnalyticsEvents` | 10 | 1 | `summary -> events` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:632` |
| 10 | 142 | `SummaryContent` | `RecentServerLogs` | 10 | 1 | `summary -> logs` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:633` |
| 11 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `onHomeClick -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 12 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `basePath -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 13 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `currentPage -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 14 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `onHomeClick -> href` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124` |
| 15 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `basePath -> href` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124` |
| 16 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `onHomeClick -> onClick` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124` |
| 17 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `currentPage -> active` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:140` |
| 18 | 72 | `KangurPrimaryNavigation` | `KangurProfileMenu` | 3 | 1 | `currentPage -> isActive` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:156` |
| 19 | 68 | `PerformanceBaselineCard` | `StatusBadge` | 2 | 2 | `baseline -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:449` |
| 20 | 68 | `PerformanceBaselineCard` | `MetadataItem` | 2 | 2 | `baseline -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:463` |
| 21 | 64 | `KangurPrimaryNavigation` | `KangurProfileMenu` | 3 | 1 | `basePath -> basePath` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:156` |
| 22 | 62 | `SectionView` | `KangurGlassPanel` | 2 | 1 | `sectionId -> data-testid` | `src/features/kangur/ui/components/CalendarLesson.tsx:255` |
| 23 | 62 | `SectionView` | `KangurHeadline` | 2 | 1 | `sectionId -> data-testid` | `src/features/kangur/ui/components/CalendarLesson.tsx:284` |
| 24 | 62 | `KangurAssignmentsList` | `KangurGlassPanel` | 2 | 1 | `compact -> surface` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:83` |
| 25 | 62 | `KangurAssignmentsList` | `KangurButton` | 2 | 1 | `compact -> variant` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:243` |
| 26 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `qIndex -> aria-valuetext` | `src/features/kangur/ui/components/KangurExam.tsx:109` |
| 27 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `total -> aria-valuetext` | `src/features/kangur/ui/components/KangurExam.tsx:109` |
| 28 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `qIndex -> value` | `src/features/kangur/ui/components/KangurExam.tsx:109` |
| 29 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `total -> value` | `src/features/kangur/ui/components/KangurExam.tsx:109` |
| 30 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:253` |
| 31 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> disabled` | `src/features/kangur/ui/components/KangurExam.tsx:253` |
| 32 | 62 | `KangurPracticeAssignmentBanner` | `KangurSummaryPanel` | 2 | 1 | `assignment -> description` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:76` |
| 33 | 62 | `KangurPracticeAssignmentBanner` | `KangurProgressBar` | 2 | 1 | `assignment -> value` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:84` |
| 34 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `navLabel -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 35 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `homeActive -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 36 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `className -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 37 | 62 | `KangurPrimaryNavigation` | `KangurTopNavGroup` | 2 | 1 | `navLabel -> label` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:123` |
| 38 | 62 | `KangurPrimaryNavigation` | `NavAction` | 2 | 1 | `homeActive -> active` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124` |
| 39 | 62 | `KangurPriorityAssignments` | `KangurEmptyState` | 2 | 1 | `emptyLabel -> description` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx:96` |
| 40 | 62 | `KangurProfileMenu` | `KangurButton` | 2 | 1 | `isActive -> aria-current` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:21` |
| 41 | 62 | `KangurProfileMenu` | `KangurButton` | 2 | 1 | `isActive -> variant` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:21` |
| 42 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> onClick` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:88` |
| 43 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> className` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:88` |
| 44 | 58 | `CmsBuilderLeftPanel` | `SectionHeader` | 1 | 2 | `variant -> actions` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx:62` |
| 45 | 58 | `MetricCard` | `StatusBadge` | 1 | 2 | `alert -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:155` |
| 46 | 58 | `AnalyticsCountList` | `EmptyState` | 1 | 2 | `emptyTitle -> title` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:320` |
| 47 | 58 | `SummaryContent` | `MetadataItem` | 1 | 2 | `range -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:527` |
| 48 | 58 | `SvgCodeEditor` | `Button` | 1 | 2 | `onChange -> onClick` | `src/features/kangur/admin/components/SvgCodeEditor.tsx:182` |
| 49 | 54 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `className -> className` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 50 | 54 | `KangurPriorityAssignments` | `KangurAssignmentsList` | 2 | 1 | `emptyLabel -> emptyLabel` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx:107` |
| 51 | 54 | `KangurFeatureHeader` | `KangurIconBadge` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:720` |
| 52 | 54 | `KangurFeatureHeader` | `KangurHeadline` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:723` |
| 53 | 54 | `KangurSectionHeading` | `KangurIconBadge` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:776` |
| 54 | 54 | `KangurSectionHeading` | `KangurHeadline` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:781` |
| 55 | 54 | `KangurSummaryPanel` | `KangurInfoCard` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1170` |
| 56 | 54 | `KangurSummaryPanel` | `KangurStatusChip` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1178` |
| 57 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/ui/components/AddingBallGame.tsx:332` |
| 58 | 52 | `SlotZone` | `KangurInfoCard` | 1 | 1 | `id -> data-testid` | `src/features/kangur/ui/components/AddingBallGame.tsx:416` |
| 59 | 52 | `AddingBallGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingBallGame.tsx:826` |
| 60 | 52 | `AddingSynthesisGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:463` |
| 61 | 52 | `CalendarInteractiveGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx:342` |
| 62 | 52 | `SectionView` | `KangurButton` | 1 | 1 | `onBack -> onClick` | `src/features/kangur/ui/components/CalendarLesson.tsx:305` |
| 63 | 52 | `CalendarTrainingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/CalendarTrainingGame.tsx:219` |
| 64 | 52 | `DraggableClock` | `KangurButton` | 1 | 1 | `onSubmit -> onClick` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:587` |
| 65 | 52 | `ClockTrainingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:831` |
| 66 | 52 | `DifficultySelector` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/DifficultySelector.tsx:74` |
| 67 | 52 | `DivisionGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/DivisionGame.tsx:243` |
| 68 | 52 | `GeometryDrawingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx:537` |
| 69 | 52 | `KangurAssignmentsList` | `KangurEmptyState` | 1 | 1 | `emptyLabel -> description` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:107` |
| 70 | 52 | `KangurAssignmentsList` | `KangurButton` | 1 | 1 | `onArchive -> onClick` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:249` |
| 71 | 52 | `ExamQuestion` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:172` |
| 72 | 52 | `QuestionView` | `KangurProgressBar` | 1 | 1 | `qIndex -> value` | `src/features/kangur/ui/components/KangurGame.tsx:92` |
| 73 | 52 | `QuestionView` | `KangurProgressBar` | 1 | 1 | `total -> value` | `src/features/kangur/ui/components/KangurGame.tsx:92` |
| 74 | 52 | `ResultView` | `KangurButton` | 1 | 1 | `onRestart -> onClick` | `src/features/kangur/ui/components/KangurGame.tsx:285` |
| 75 | 52 | `NavAction` | `KangurButton` | 1 | 1 | `active -> aria-current` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:62` |
| 76 | 52 | `NavAction` | `KangurButton` | 1 | 1 | `docId -> data-doc-id` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:62` |
| 77 | 52 | `KangurPrimaryNavigation` | `NavAction` | 1 | 1 | `onLogout -> onClick` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:107` |
| 78 | 52 | `KangurPrimaryNavigation` | `NavAction` | 1 | 1 | `onLogin -> onClick` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:112` |
| 79 | 52 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 1 | 1 | `showTests -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |
| 80 | 52 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 1 | 1 | `showParentDashboard -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 179 | 3 | `SummaryContent` | `StatusBadge` | 10 | 2 | `summary -> baseline -> status` |
| 2 | 179 | 3 | `SummaryContent` | `MetadataItem` | 10 | 2 | `summary -> baseline -> value` |
| 3 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `onHomeClick -> onClick -> onClick` |
| 4 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> isActive -> aria-current` |
| 5 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> isActive -> variant` |
| 6 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> active -> aria-current` |
| 7 | 93 | 3 | `KangurAssignmentsList` | `KangurPanel` | 2 | 1 | `compact -> surface -> className` |
| 8 | 93 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 2 | 1 | `homeActive -> active -> aria-current` |
| 9 | 93 | 3 | `KangurPriorityAssignments` | `KangurEmptyState` | 2 | 1 | `emptyLabel -> emptyLabel -> description` |
| 10 | 83 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 1 | 1 | `onLogout -> onClick -> onClick` |
| 11 | 83 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 1 | 1 | `onLogin -> onClick -> onClick` |
| 12 | 83 | 3 | `KangurTestQuestionRenderer` | `KangurMediaFrame` | 1 | 1 | `question -> illustration -> dangerouslySetInnerHTML` |
| 13 | 83 | 3 | `KangurInlineFallback` | `KangurInfoCard` | 1 | 1 | `accent -> accent -> accent` |
| 14 | 83 | 3 | `KangurInlineFallback` | `KangurInfoCard` | 1 | 1 | `className -> className -> className` |

## Top Chain Details (Depth >= 3)

### 1. SummaryContent -> StatusBadge

- Score: 179
- Depth: 3
- Root fanout: 10
- Prop path: summary -> baseline -> status
- Component path:
  - `SummaryContent` (src/features/kangur/admin/AdminKangurObservabilityPage.tsx)
  - `PerformanceBaselineCard` (src/features/kangur/admin/AdminKangurObservabilityPage.tsx)
  - `StatusBadge` (src/shared/ui/status-badge.tsx)
- Transition lines:
  - `SummaryContent` -> `PerformanceBaselineCard`: `summary` -> `baseline` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:596
  - `PerformanceBaselineCard` -> `StatusBadge`: `baseline` -> `status` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:449

### 2. SummaryContent -> MetadataItem

- Score: 179
- Depth: 3
- Root fanout: 10
- Prop path: summary -> baseline -> value
- Component path:
  - `SummaryContent` (src/features/kangur/admin/AdminKangurObservabilityPage.tsx)
  - `PerformanceBaselineCard` (src/features/kangur/admin/AdminKangurObservabilityPage.tsx)
  - `MetadataItem` (src/shared/ui/metadata-item.tsx)
- Transition lines:
  - `SummaryContent` -> `PerformanceBaselineCard`: `summary` -> `baseline` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:596
  - `PerformanceBaselineCard` -> `MetadataItem`: `baseline` -> `value` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:463

### 3. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: onHomeClick -> onClick -> onClick
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `onHomeClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124
  - `NavAction` -> `KangurButton`: `onClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:76

### 4. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> isActive -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurProfileMenu` (src/features/kangur/ui/components/KangurProfileMenu.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `KangurProfileMenu`: `currentPage` -> `isActive` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:156
  - `KangurProfileMenu` -> `KangurButton`: `isActive` -> `aria-current` at src/features/kangur/ui/components/KangurProfileMenu.tsx:21

### 5. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> isActive -> variant
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurProfileMenu` (src/features/kangur/ui/components/KangurProfileMenu.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `KangurProfileMenu`: `currentPage` -> `isActive` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:156
  - `KangurProfileMenu` -> `KangurButton`: `isActive` -> `variant` at src/features/kangur/ui/components/KangurProfileMenu.tsx:21

### 6. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> active -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `currentPage` -> `active` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:140
  - `NavAction` -> `KangurButton`: `active` -> `aria-current` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:62

### 7. KangurAssignmentsList -> KangurPanel

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: compact -> surface -> className
- Component path:
  - `KangurAssignmentsList` (src/features/kangur/ui/components/KangurAssignmentsList.tsx)
  - `KangurGlassPanel` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurPanel` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurAssignmentsList` -> `KangurGlassPanel`: `compact` -> `surface` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:83
  - `KangurGlassPanel` -> `KangurPanel`: `surface` -> `className` at src/features/kangur/ui/design/primitives.tsx:488

### 8. KangurPrimaryNavigation -> KangurButton

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: homeActive -> active -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `homeActive` -> `active` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124
  - `NavAction` -> `KangurButton`: `active` -> `aria-current` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:62

### 9. KangurPriorityAssignments -> KangurEmptyState

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: emptyLabel -> emptyLabel -> description
- Component path:
  - `KangurPriorityAssignments` (src/features/kangur/ui/components/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/KangurAssignmentsList.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPriorityAssignments` -> `KangurAssignmentsList`: `emptyLabel` -> `emptyLabel` at src/features/kangur/ui/components/KangurPriorityAssignments.tsx:107
  - `KangurAssignmentsList` -> `KangurEmptyState`: `emptyLabel` -> `description` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:107

### 10. KangurPrimaryNavigation -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onLogout -> onClick -> onClick
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `onLogout` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:107
  - `NavAction` -> `KangurButton`: `onClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:76

### 11. KangurPrimaryNavigation -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onLogin -> onClick -> onClick
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `onLogin` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:112
  - `NavAction` -> `KangurButton`: `onClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:76

### 12. KangurTestQuestionRenderer -> KangurMediaFrame

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: question -> illustration -> dangerouslySetInnerHTML
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurQuestionIllustrationRenderer` (src/features/kangur/ui/components/KangurQuestionIllustrationRenderer.tsx)
  - `KangurMediaFrame` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurQuestionIllustrationRenderer`: `question` -> `illustration` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:56
  - `KangurQuestionIllustrationRenderer` -> `KangurMediaFrame`: `illustration` -> `dangerouslySetInnerHTML` at src/features/kangur/ui/components/KangurQuestionIllustrationRenderer.tsx:24

### 13. KangurInlineFallback -> KangurInfoCard

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: accent -> accent -> accent
- Component path:
  - `KangurInlineFallback` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurInfoCard` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurInlineFallback` -> `KangurEmptyState`: `accent` -> `accent` at src/features/kangur/ui/design/primitives.tsx:1278
  - `KangurEmptyState` -> `KangurInfoCard`: `accent` -> `accent` at src/features/kangur/ui/design/primitives.tsx:1234

### 14. KangurInlineFallback -> KangurInfoCard

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: className -> className -> className
- Component path:
  - `KangurInlineFallback` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurInfoCard` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurInlineFallback` -> `KangurEmptyState`: `className` -> `className` at src/features/kangur/ui/design/primitives.tsx:1278
  - `KangurEmptyState` -> `KangurInfoCard`: `className` -> `className` at src/features/kangur/ui/design/primitives.tsx:1234

## Top Transition Details (Depth = 2)

### 1. SummaryContent -> StatusBadge

- Score: 148
- Root fanout: 10
- Prop mapping: summary -> status
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:513

### 2. SummaryContent -> MetadataItem

- Score: 148
- Root fanout: 10
- Prop mapping: summary -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:526

### 3. SummaryContent -> MetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:545

### 4. SummaryContent -> MetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> hint
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:552

### 5. SummaryContent -> AlertsGrid

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> alerts
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:578

### 6. SummaryContent -> RouteMetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> route
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:586

### 7. SummaryContent -> PerformanceBaselineCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> baseline
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:596

### 8. SummaryContent -> AnalyticsCountList

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> items
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:600

### 9. SummaryContent -> RecentAnalyticsEvents

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> events
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:632

### 10. SummaryContent -> RecentServerLogs

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> logs
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:633

### 11. KangurPrimaryNavigation -> KangurPageTopBar

- Score: 72
- Root fanout: 3
- Prop mapping: onHomeClick -> left
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119

### 12. KangurPrimaryNavigation -> KangurPageTopBar

- Score: 72
- Root fanout: 3
- Prop mapping: basePath -> left
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119

### 13. KangurPrimaryNavigation -> KangurPageTopBar

- Score: 72
- Root fanout: 3
- Prop mapping: currentPage -> left
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:119

### 14. KangurPrimaryNavigation -> NavAction

- Score: 72
- Root fanout: 3
- Prop mapping: onHomeClick -> href
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124

### 15. KangurPrimaryNavigation -> NavAction

- Score: 72
- Root fanout: 3
- Prop mapping: basePath -> href
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:124

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
