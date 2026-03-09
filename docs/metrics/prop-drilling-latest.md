---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-09T08:50:05.103Z

## Snapshot

- Scanned source files: 4724
- JSX files scanned: 1726
- Components detected: 2546
- Components forwarding parent props (hotspot threshold): 43
- Components forwarding parent props (any): 80
- Resolved forwarded transitions: 219
- Candidate chains (depth >= 2): 219
- Candidate chains (depth >= 3): 25
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11
- Hotspot forwarding components backlog size: 43

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 73 |
| `feature:cms` | 4 |
| `feature:ai` | 1 |
| `app` | 1 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 15 | 24 | no | yes |
| 2 | `KangurPageIntroCard` | `src/features/kangur/ui/components/KangurPageIntroCard.tsx` | 10 | 10 | no | yes |
| 3 | `KangurAdminContentShell` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx` | 8 | 13 | no | yes |
| 4 | `KangurActiveLessonHeader` | `src/features/kangur/ui/components/KangurActiveLessonHeader.tsx` | 8 | 9 | no | yes |
| 5 | `NavAction` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 7 | 7 | no | yes |
| 6 | `KangurSectionHeading` | `src/features/kangur/ui/design/primitives.tsx` | 6 | 7 | no | yes |
| 7 | `KangurInlineFallback` | `src/features/kangur/ui/design/primitives.tsx` | 6 | 6 | yes | yes |
| 8 | `KangurFeatureHeader` | `src/features/kangur/ui/design/primitives.tsx` | 5 | 6 | no | yes |
| 9 | `KangurSummaryPanel` | `src/features/kangur/ui/design/primitives.tsx` | 5 | 6 | yes | yes |
| 10 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 4 | 5 | no | yes |
| 11 | `KangurGlassPanel` | `src/features/kangur/ui/design/primitives.tsx` | 4 | 4 | yes | yes |
| 12 | `ExamQuestion` | `src/features/kangur/ui/components/KangurExam.tsx` | 3 | 5 | no | yes |
| 13 | `KangurPriorityAssignments` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx` | 3 | 4 | no | yes |
| 14 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 3 | 4 | no | yes |
| 15 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 4 | no | yes |
| 16 | `AgentPersonaSettingsForm` | `src/features/ai/agentcreator/components/AgentPersonaSettingsForm.tsx` | 3 | 3 | no | yes |
| 17 | `SvgCodeEditor` | `src/features/kangur/admin/components/SvgCodeEditor.tsx` | 3 | 3 | no | yes |
| 18 | `KangurPublicErrorFallback` | `src/features/kangur/ui/KangurPublicErrorBoundary.tsx` | 3 | 3 | no | yes |
| 19 | `ExamSummary` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 3 | 3 | no | yes |
| 20 | `KangurTestSuitePlayer` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 3 | 3 | no | yes |
| 21 | `KangurEmptyState` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 22 | `KangurMetricCard` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 23 | `SummaryContent` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 2 | 11 | no | yes |
| 24 | `KangurPracticeAssignmentBanner` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx` | 2 | 4 | no | yes |
| 25 | `SettingsChoiceCard` | `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 2 | 3 | no | yes |
| 26 | `SectionView` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 2 | 3 | no | yes |
| 27 | `KangurErrorBoundary` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 28 | `AnalyticsCountList` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 2 | 2 | no | yes |
| 29 | `StatefulQuestionEditorHarness` | `src/features/kangur/admin/KangurTestQuestionEditor.test.tsx` | 2 | 2 | no | yes |
| 30 | `KangurDocsTooltipEnhancer` | `src/features/kangur/docs/tooltips.tsx` | 2 | 2 | no | yes |
| 31 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 2 | 2 | no | yes |
| 32 | `QuestionView` | `src/features/kangur/ui/components/KangurGame.tsx` | 2 | 2 | no | yes |
| 33 | `KangurQuestionIllustrationRenderer` | `src/features/kangur/ui/components/KangurQuestionIllustrationRenderer.tsx` | 2 | 2 | no | yes |
| 34 | `LessonHub` | `src/features/kangur/ui/components/LessonHub.tsx` | 2 | 2 | no | yes |
| 35 | `ResultScreen` | `src/features/kangur/ui/components/ResultScreen.tsx` | 2 | 2 | no | yes |
| 36 | `KangurAiTutorProvider` | `src/features/kangur/ui/context/KangurAiTutorContext.tsx` | 2 | 2 | no | yes |
| 37 | `KangurAiTutorSessionSync` | `src/features/kangur/ui/context/KangurAiTutorContext.tsx` | 2 | 2 | no | yes |
| 38 | `PerformanceBaselineCard` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 2 | no | no |
| 39 | `KangurAssignmentManager` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1 | 2 | no | no |
| 40 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 2 | no | no |
| 41 | `KangurHomeActionCard` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx` | 1 | 2 | no | no |
| 42 | `CmsBuilderLeftPanel` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx` | 1 | 1 | no | no |
| 43 | `MetricCard` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 1 | no | no |
| 44 | `AdminKangurPageShell` | `src/features/kangur/admin/AdminKangurPageShell.tsx` | 1 | 1 | no | no |
| 45 | `StatefulNarrationPanelHarness` | `src/features/kangur/admin/KangurLessonNarrationPanel.test.tsx` | 1 | 1 | no | no |
| 46 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 47 | `KangurFeatureRouteShell` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx` | 1 | 1 | no | no |
| 48 | `KangurPublicErrorBoundary` | `src/features/kangur/ui/KangurPublicErrorBoundary.tsx` | 1 | 1 | no | no |
| 49 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 50 | `SlotZone` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 51 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 52 | `AddingSynthesisGame` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 1 | 1 | no | no |
| 53 | `AssignmentPanel` | `src/features/kangur/ui/components/AssignmentPanel.tsx` | 1 | 1 | no | no |
| 54 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 55 | `CalendarTrainingGame` | `src/features/kangur/ui/components/CalendarTrainingGame.tsx` | 1 | 1 | no | no |
| 56 | `DraggableClock` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 57 | `ClockTrainingGame` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 58 | `DifficultySelector` | `src/features/kangur/ui/components/DifficultySelector.tsx` | 1 | 1 | no | no |
| 59 | `DivisionGame` | `src/features/kangur/ui/components/DivisionGame.tsx` | 1 | 1 | no | no |
| 60 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 61 | `KangurAssignmentSpotlight` | `src/features/kangur/ui/components/KangurAssignmentSpotlight.tsx` | 1 | 1 | no | no |
| 62 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 1 | 1 | no | no |
| 63 | `KangurLearnerAssignmentsPanel` | `src/features/kangur/ui/components/KangurLearnerAssignmentsPanel.tsx` | 1 | 1 | no | no |
| 64 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 65 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 66 | `KangurParentDashboardTabsWidget` | `src/features/kangur/ui/components/KangurParentDashboardTabsWidget.tsx` | 1 | 1 | no | no |
| 67 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 1 | 1 | no | no |
| 68 | `KangurTopNavigationController` | `src/features/kangur/ui/components/KangurTopNavigationController.tsx` | 1 | 1 | no | no |
| 69 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 70 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 71 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 72 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 1 | no | no |
| 73 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 74 | `KangurLessonNavigationBoundary` | `src/features/kangur/ui/context/KangurLessonNavigationContext.tsx` | 1 | 1 | no | no |
| 75 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 76 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 77 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRendererServer.tsx` | 0 | 0 | yes | yes |
| 78 | `KangurTestQuestionEditor` | `src/features/kangur/admin/KangurTestQuestionEditor.tsx` | 0 | 0 | yes | yes |
| 79 | `KangurLoginPage` | `src/features/kangur/ui/KangurLoginPage.tsx` | 0 | 0 | yes | yes |
| 80 | `VectorCanvas` | `src/shared/ui/vector-canvas/index.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 148 | `SummaryContent` | `StatusBadge` | 10 | 2 | `summary -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:518` |
| 2 | 148 | `SummaryContent` | `MetadataItem` | 10 | 2 | `summary -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:531` |
| 3 | 142 | `SummaryContent` | `MetricCard` | 10 | 1 | `summary -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:550` |
| 4 | 142 | `SummaryContent` | `MetricCard` | 10 | 1 | `summary -> hint` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:557` |
| 5 | 142 | `SummaryContent` | `AlertsGrid` | 10 | 1 | `summary -> alerts` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:590` |
| 6 | 142 | `SummaryContent` | `RouteMetricCard` | 10 | 1 | `summary -> route` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:598` |
| 7 | 142 | `SummaryContent` | `PerformanceBaselineCard` | 10 | 1 | `summary -> baseline` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:608` |
| 8 | 142 | `SummaryContent` | `AnalyticsCountList` | 10 | 1 | `summary -> items` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:612` |
| 9 | 142 | `SummaryContent` | `RecentAnalyticsEvents` | 10 | 1 | `summary -> events` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:644` |
| 10 | 142 | `SummaryContent` | `RecentServerLogs` | 10 | 1 | `summary -> logs` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:645` |
| 11 | 72 | `KangurPracticeAssignmentBanner` | `KangurSummaryPanel` | 3 | 1 | `assignment -> description` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:75` |
| 12 | 72 | `KangurPracticeAssignmentBanner` | `KangurProgressBar` | 3 | 1 | `assignment -> value` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:83` |
| 13 | 72 | `KangurPracticeAssignmentBanner` | `KangurTransitionLink` | 3 | 1 | `assignment -> href` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:93` |
| 14 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `onHomeClick -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 15 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `basePath -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 16 | 72 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 3 | 1 | `currentPage -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 17 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `onHomeClick -> href` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247` |
| 18 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `basePath -> href` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247` |
| 19 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `onHomeClick -> onClick` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247` |
| 20 | 72 | `KangurPrimaryNavigation` | `NavAction` | 3 | 1 | `currentPage -> active` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:265` |
| 21 | 72 | `KangurPrimaryNavigation` | `KangurProfileMenu` | 3 | 1 | `currentPage -> isActive` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:290` |
| 22 | 68 | `PerformanceBaselineCard` | `StatusBadge` | 2 | 2 | `baseline -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:449` |
| 23 | 68 | `PerformanceBaselineCard` | `MetadataItem` | 2 | 2 | `baseline -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:463` |
| 24 | 68 | `SettingsChoiceCard` | `Card` | 2 | 2 | `checked -> className` | `src/features/kangur/admin/AdminKangurSettingsPage.tsx:168` |
| 25 | 68 | `SettingsChoiceCard` | `Badge` | 2 | 2 | `checked -> variant` | `src/features/kangur/admin/AdminKangurSettingsPage.tsx:187` |
| 26 | 68 | `KangurAdminContentShell` | `ListPanel` | 2 | 2 | `title -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 27 | 68 | `KangurAdminContentShell` | `ListPanel` | 2 | 2 | `description -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 28 | 68 | `KangurAdminContentShell` | `ListPanel` | 2 | 2 | `headerActions -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 29 | 68 | `KangurAdminContentShell` | `ListPanel` | 2 | 2 | `refresh -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 30 | 68 | `KangurAdminContentShell` | `ListPanel` | 2 | 2 | `breadcrumbs -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 31 | 68 | `KangurAdminContentShell` | `SectionHeader` | 2 | 2 | `headerActions -> actions` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:46` |
| 32 | 68 | `KangurAdminContentShell` | `Breadcrumbs` | 2 | 2 | `breadcrumbs -> items` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:53` |
| 33 | 64 | `KangurPrimaryNavigation` | `KangurProfileMenu` | 3 | 1 | `basePath -> basePath` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:290` |
| 34 | 62 | `SectionView` | `KangurGlassPanel` | 2 | 1 | `sectionId -> data-testid` | `src/features/kangur/ui/components/CalendarLesson.tsx:283` |
| 35 | 62 | `SectionView` | `KangurHeadline` | 2 | 1 | `sectionId -> data-testid` | `src/features/kangur/ui/components/CalendarLesson.tsx:289` |
| 36 | 62 | `KangurActiveLessonHeader` | `KangurGradientIconTile` | 2 | 1 | `lesson -> gradientClass` | `src/features/kangur/ui/components/KangurActiveLessonHeader.tsx:59` |
| 37 | 62 | `KangurAssignmentManager` | `KangurTransitionLink` | 2 | 1 | `basePath -> href` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:538` |
| 38 | 62 | `KangurAssignmentsList` | `KangurGlassPanel` | 2 | 1 | `compact -> surface` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:82` |
| 39 | 62 | `KangurAssignmentsList` | `KangurButton` | 2 | 1 | `compact -> variant` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:242` |
| 40 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `qIndex -> aria-valuetext` | `src/features/kangur/ui/components/KangurExam.tsx:135` |
| 41 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `total -> aria-valuetext` | `src/features/kangur/ui/components/KangurExam.tsx:135` |
| 42 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `qIndex -> value` | `src/features/kangur/ui/components/KangurExam.tsx:135` |
| 43 | 62 | `ExamQuestion` | `KangurProgressBar` | 2 | 1 | `total -> value` | `src/features/kangur/ui/components/KangurExam.tsx:135` |
| 44 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:294` |
| 45 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> disabled` | `src/features/kangur/ui/components/KangurExam.tsx:294` |
| 46 | 62 | `KangurHomeActionCard` | `KangurTransitionLink` | 2 | 1 | `action -> href` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145` |
| 47 | 62 | `KangurHomeActionCard` | `KangurTransitionLink` | 2 | 1 | `action -> targetPageKey` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145` |
| 48 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `navLabel -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 49 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `homeActive -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 50 | 62 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `className -> left` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 51 | 62 | `KangurPrimaryNavigation` | `KangurTopNavGroup` | 2 | 1 | `navLabel -> label` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:246` |
| 52 | 62 | `KangurPrimaryNavigation` | `NavAction` | 2 | 1 | `homeActive -> active` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247` |
| 53 | 62 | `KangurPriorityAssignments` | `KangurEmptyState` | 2 | 1 | `emptyLabel -> description` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx:96` |
| 54 | 62 | `KangurProfileMenu` | `KangurButton` | 2 | 1 | `isActive -> aria-current` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:21` |
| 55 | 62 | `KangurProfileMenu` | `KangurButton` | 2 | 1 | `isActive -> variant` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:21` |
| 56 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> onClick` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:138` |
| 57 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> className` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:138` |
| 58 | 60 | `KangurAdminContentShell` | `SectionHeader` | 2 | 2 | `title -> title` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:46` |
| 59 | 60 | `KangurAdminContentShell` | `SectionHeader` | 2 | 2 | `description -> description` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:46` |
| 60 | 60 | `KangurAdminContentShell` | `SectionHeader` | 2 | 2 | `refresh -> refresh` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:46` |
| 61 | 58 | `CmsBuilderLeftPanel` | `SectionHeader` | 1 | 2 | `variant -> actions` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx:62` |
| 62 | 58 | `MetricCard` | `StatusBadge` | 1 | 2 | `alert -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:155` |
| 63 | 58 | `AnalyticsCountList` | `EmptyState` | 1 | 2 | `emptyTitle -> title` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:320` |
| 64 | 58 | `SummaryContent` | `MetadataItem` | 1 | 2 | `range -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:532` |
| 65 | 58 | `KangurAdminContentShell` | `ListPanel` | 1 | 2 | `className -> header` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 66 | 58 | `KangurAdminContentShell` | `ListPanel` | 1 | 2 | `panelClassName -> className` | `src/features/kangur/admin/components/KangurAdminContentShell.tsx:44` |
| 67 | 58 | `SvgCodeEditor` | `Button` | 1 | 2 | `onChange -> onClick` | `src/features/kangur/admin/components/SvgCodeEditor.tsx:182` |
| 68 | 54 | `KangurActiveLessonHeader` | `KangurLessonNarrator` | 2 | 1 | `lesson -> lesson` | `src/features/kangur/ui/components/KangurActiveLessonHeader.tsx:66` |
| 69 | 54 | `KangurAssignmentManager` | `KangurAssignmentsList` | 2 | 1 | `basePath -> basePath` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:550` |
| 70 | 54 | `KangurPrimaryNavigation` | `KangurPageTopBar` | 2 | 1 | `className -> className` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242` |
| 71 | 54 | `KangurPriorityAssignments` | `KangurAssignmentsList` | 2 | 1 | `emptyLabel -> emptyLabel` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx:107` |
| 72 | 54 | `KangurFeatureHeader` | `KangurIconBadge` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:733` |
| 73 | 54 | `KangurFeatureHeader` | `KangurHeadline` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:736` |
| 74 | 54 | `KangurSectionHeading` | `KangurIconBadge` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:789` |
| 75 | 54 | `KangurSectionHeading` | `KangurHeadline` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:794` |
| 76 | 54 | `KangurSummaryPanel` | `KangurInfoCard` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1183` |
| 77 | 54 | `KangurSummaryPanel` | `KangurStatusChip` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1191` |
| 78 | 52 | `AgentPersonaSettingsForm` | `AgentPersonaMoodEditor` | 1 | 1 | `item -> moods` | `src/features/ai/agentcreator/components/AgentPersonaSettingsForm.tsx:152` |
| 79 | 52 | `AgentPersonaSettingsForm` | `AgentPersonaMoodEditor` | 1 | 1 | `originalItem -> originalMoods` | `src/features/ai/agentcreator/components/AgentPersonaSettingsForm.tsx:152` |
| 80 | 52 | `KangurPublicErrorFallback` | `KangurErrorFallback` | 1 | 1 | `resetErrorBoundary -> reset` | `src/features/kangur/ui/KangurPublicErrorBoundary.tsx:30` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 179 | 3 | `SummaryContent` | `StatusBadge` | 10 | 2 | `summary -> baseline -> status` |
| 2 | 179 | 3 | `SummaryContent` | `MetadataItem` | 10 | 2 | `summary -> baseline -> value` |
| 3 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `onHomeClick -> onClick -> onClick` |
| 4 | 103 | 3 | `KangurPrimaryNavigation` | `KangurTransitionLink` | 3 | 1 | `onHomeClick -> href -> href` |
| 5 | 103 | 3 | `KangurPrimaryNavigation` | `KangurTransitionLink` | 3 | 1 | `basePath -> basePath -> href` |
| 6 | 103 | 3 | `KangurPrimaryNavigation` | `KangurTransitionLink` | 3 | 1 | `basePath -> href -> href` |
| 7 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> isActive -> aria-current` |
| 8 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> isActive -> variant` |
| 9 | 103 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 3 | 1 | `currentPage -> active -> aria-current` |
| 10 | 93 | 3 | `KangurAssignmentManager` | `KangurTransitionLink` | 2 | 1 | `basePath -> basePath -> href` |
| 11 | 93 | 3 | `KangurAssignmentsList` | `KangurPanel` | 2 | 1 | `compact -> surface -> className` |
| 12 | 93 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 2 | 1 | `homeActive -> active -> aria-current` |
| 13 | 93 | 3 | `KangurPriorityAssignments` | `KangurEmptyState` | 2 | 1 | `emptyLabel -> emptyLabel -> description` |
| 14 | 83 | 3 | `KangurPublicApp` | `KangurRoutingProvider` | 1 | 1 | `embedded -> embedded -> embedded` |
| 15 | 83 | 3 | `KangurPublicErrorBoundary` | `KangurErrorFallback` | 1 | 1 | `homeHref -> homeHref -> homeHref` |
| 16 | 83 | 3 | `KangurLearnerAssignmentsPanel` | `KangurTransitionLink` | 1 | 1 | `basePath -> basePath -> href` |
| 17 | 83 | 3 | `KangurPageIntroCard` | `KangurPanel` | 1 | 1 | `className -> className -> className` |
| 18 | 83 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 1 | 1 | `onLogout -> onClick -> onClick` |
| 19 | 83 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 1 | 1 | `onCreateAccount -> onClick -> onClick` |
| 20 | 83 | 3 | `KangurPrimaryNavigation` | `KangurButton` | 1 | 1 | `onLogin -> onClick -> onClick` |
| 21 | 83 | 3 | `KangurPriorityAssignments` | `KangurTransitionLink` | 1 | 1 | `basePath -> basePath -> href` |
| 22 | 83 | 3 | `KangurTestQuestionRenderer` | `KangurMediaFrame` | 1 | 1 | `question -> illustration -> dangerouslySetInnerHTML` |
| 23 | 83 | 3 | `KangurTestSuitePlayer` | `KangurAiTutorSessionSyncInner` | 1 | 1 | `learnerId -> learnerId -> learnerId` |
| 24 | 83 | 3 | `KangurInlineFallback` | `KangurInfoCard` | 1 | 1 | `accent -> accent -> accent` |
| 25 | 83 | 3 | `KangurInlineFallback` | `KangurInfoCard` | 1 | 1 | `className -> className -> className` |

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
  - `SummaryContent` -> `PerformanceBaselineCard`: `summary` -> `baseline` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:608
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
  - `SummaryContent` -> `PerformanceBaselineCard`: `summary` -> `baseline` at src/features/kangur/admin/AdminKangurObservabilityPage.tsx:608
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
  - `KangurPrimaryNavigation` -> `NavAction`: `onHomeClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247
  - `NavAction` -> `KangurButton`: `onClick` -> `onClick` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:96

### 4. KangurPrimaryNavigation -> KangurTransitionLink

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: onHomeClick -> href -> href
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurTransitionLink` (src/features/kangur/ui/components/KangurTransitionLink.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `onHomeClick` -> `href` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247
  - `NavAction` -> `KangurTransitionLink`: `href` -> `href` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:88

### 5. KangurPrimaryNavigation -> KangurTransitionLink

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: basePath -> basePath -> href
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurProfileMenu` (src/features/kangur/ui/components/KangurProfileMenu.tsx)
  - `KangurTransitionLink` (src/features/kangur/ui/components/KangurTransitionLink.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `KangurProfileMenu`: `basePath` -> `basePath` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:290
  - `KangurProfileMenu` -> `KangurTransitionLink`: `basePath` -> `href` at src/features/kangur/ui/components/KangurProfileMenu.tsx:29

### 6. KangurPrimaryNavigation -> KangurTransitionLink

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: basePath -> href -> href
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurTransitionLink` (src/features/kangur/ui/components/KangurTransitionLink.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `basePath` -> `href` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247
  - `NavAction` -> `KangurTransitionLink`: `href` -> `href` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:88

### 7. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> isActive -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurProfileMenu` (src/features/kangur/ui/components/KangurProfileMenu.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `KangurProfileMenu`: `currentPage` -> `isActive` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:290
  - `KangurProfileMenu` -> `KangurButton`: `isActive` -> `aria-current` at src/features/kangur/ui/components/KangurProfileMenu.tsx:21

### 8. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> isActive -> variant
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurProfileMenu` (src/features/kangur/ui/components/KangurProfileMenu.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `KangurProfileMenu`: `currentPage` -> `isActive` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:290
  - `KangurProfileMenu` -> `KangurButton`: `isActive` -> `variant` at src/features/kangur/ui/components/KangurProfileMenu.tsx:21

### 9. KangurPrimaryNavigation -> KangurButton

- Score: 103
- Depth: 3
- Root fanout: 3
- Prop path: currentPage -> active -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `currentPage` -> `active` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:265
  - `NavAction` -> `KangurButton`: `active` -> `aria-current` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:79

### 10. KangurAssignmentManager -> KangurTransitionLink

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: basePath -> basePath -> href
- Component path:
  - `KangurAssignmentManager` (src/features/kangur/ui/components/KangurAssignmentManager.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/KangurAssignmentsList.tsx)
  - `KangurTransitionLink` (src/features/kangur/ui/components/KangurTransitionLink.tsx)
- Transition lines:
  - `KangurAssignmentManager` -> `KangurAssignmentsList`: `basePath` -> `basePath` at src/features/kangur/ui/components/KangurAssignmentManager.tsx:550
  - `KangurAssignmentsList` -> `KangurTransitionLink`: `basePath` -> `href` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:172

### 11. KangurAssignmentsList -> KangurPanel

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: compact -> surface -> className
- Component path:
  - `KangurAssignmentsList` (src/features/kangur/ui/components/KangurAssignmentsList.tsx)
  - `KangurGlassPanel` (src/features/kangur/ui/design/primitives.tsx)
  - `KangurPanel` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurAssignmentsList` -> `KangurGlassPanel`: `compact` -> `surface` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:82
  - `KangurGlassPanel` -> `KangurPanel`: `surface` -> `className` at src/features/kangur/ui/design/primitives.tsx:495

### 12. KangurPrimaryNavigation -> KangurButton

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: homeActive -> active -> aria-current
- Component path:
  - `KangurPrimaryNavigation` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `NavAction` (src/features/kangur/ui/components/KangurPrimaryNavigation.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPrimaryNavigation` -> `NavAction`: `homeActive` -> `active` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:247
  - `NavAction` -> `KangurButton`: `active` -> `aria-current` at src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:79

### 13. KangurPriorityAssignments -> KangurEmptyState

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
  - `KangurAssignmentsList` -> `KangurEmptyState`: `emptyLabel` -> `description` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:106

### 14. KangurPublicApp -> KangurRoutingProvider

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: embedded -> embedded -> embedded
- Component path:
  - `KangurPublicApp` (src/features/kangur/ui/KangurPublicApp.tsx)
  - `KangurFeaturePage` (src/features/kangur/ui/KangurFeaturePage.tsx)
  - `KangurRoutingProvider` (src/features/kangur/ui/context/KangurRoutingContext.tsx)
- Transition lines:
  - `KangurPublicApp` -> `KangurFeaturePage`: `embedded` -> `embedded` at src/features/kangur/ui/KangurPublicApp.tsx:23
  - `KangurFeaturePage` -> `KangurRoutingProvider`: `embedded` -> `embedded` at src/features/kangur/ui/KangurFeaturePage.tsx:53

### 15. KangurPublicErrorBoundary -> KangurErrorFallback

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: homeHref -> homeHref -> homeHref
- Component path:
  - `KangurPublicErrorBoundary` (src/features/kangur/ui/KangurPublicErrorBoundary.tsx)
  - `KangurPublicErrorFallback` (src/features/kangur/ui/KangurPublicErrorBoundary.tsx)
  - `KangurErrorFallback` (src/features/kangur/ui/KangurErrorFallback.tsx)
- Transition lines:
  - `KangurPublicErrorBoundary` -> `KangurPublicErrorFallback`: `homeHref` -> `homeHref` at src/features/kangur/ui/KangurPublicErrorBoundary.tsx:45
  - `KangurPublicErrorFallback` -> `KangurErrorFallback`: `homeHref` -> `homeHref` at src/features/kangur/ui/KangurPublicErrorBoundary.tsx:30

## Top Transition Details (Depth = 2)

### 1. SummaryContent -> StatusBadge

- Score: 148
- Root fanout: 10
- Prop mapping: summary -> status
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:518

### 2. SummaryContent -> MetadataItem

- Score: 148
- Root fanout: 10
- Prop mapping: summary -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:531

### 3. SummaryContent -> MetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:550

### 4. SummaryContent -> MetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> hint
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:557

### 5. SummaryContent -> AlertsGrid

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> alerts
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:590

### 6. SummaryContent -> RouteMetricCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> route
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:598

### 7. SummaryContent -> PerformanceBaselineCard

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> baseline
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:608

### 8. SummaryContent -> AnalyticsCountList

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> items
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:612

### 9. SummaryContent -> RecentAnalyticsEvents

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> events
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:644

### 10. SummaryContent -> RecentServerLogs

- Score: 142
- Root fanout: 10
- Prop mapping: summary -> logs
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:645

### 11. KangurPracticeAssignmentBanner -> KangurSummaryPanel

- Score: 72
- Root fanout: 3
- Prop mapping: assignment -> description
- Location: src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:75

### 12. KangurPracticeAssignmentBanner -> KangurProgressBar

- Score: 72
- Root fanout: 3
- Prop mapping: assignment -> value
- Location: src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:83

### 13. KangurPracticeAssignmentBanner -> KangurTransitionLink

- Score: 72
- Root fanout: 3
- Prop mapping: assignment -> href
- Location: src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:93

### 14. KangurPrimaryNavigation -> KangurPageTopBar

- Score: 72
- Root fanout: 3
- Prop mapping: onHomeClick -> left
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242

### 15. KangurPrimaryNavigation -> KangurPageTopBar

- Score: 72
- Root fanout: 3
- Prop mapping: basePath -> left
- Location: src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:242

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
