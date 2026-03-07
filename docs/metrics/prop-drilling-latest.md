# Prop Drilling Scan

Generated at: 2026-03-07T07:25:00.958Z

## Snapshot

- Scanned source files: 4322
- JSX files scanned: 1577
- Components detected: 2392
- Components forwarding parent props (hotspot threshold): 20
- Components forwarding parent props (any): 53
- Resolved forwarded transitions: 99
- Candidate chains (depth >= 2): 99
- Candidate chains (depth >= 3): 10
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 5
- Hotspot forwarding components backlog size: 20

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 51 |
| `feature:cms` | 1 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 6 | 6 | no | yes |
| 2 | `KangurSummaryPanel` | `src/features/kangur/ui/design/primitives.tsx` | 5 | 6 | yes | yes |
| 3 | `KangurCmsPreviewPanel` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx` | 4 | 8 | no | yes |
| 4 | `LessonSvgQuickAddModal` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx` | 4 | 5 | no | yes |
| 5 | `ExamSummary` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 4 | 4 | no | yes |
| 6 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 3 | 4 | no | yes |
| 7 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 4 | no | yes |
| 8 | `SvgCodeEditor` | `src/features/kangur/admin/components/SvgCodeEditor.tsx` | 3 | 3 | no | yes |
| 9 | `KangurPriorityAssignments` | `src/features/kangur/ui/components/KangurPriorityAssignments.tsx` | 3 | 3 | no | yes |
| 10 | `KangurEmptyState` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 11 | `KangurMetricCard` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 12 | `KangurQuestionsManagerPanel` | `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx` | 2 | 3 | no | yes |
| 13 | `KangurTestSuitePlayer` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 2 | 3 | no | yes |
| 14 | `KangurDocsTooltipEnhancer` | `src/features/kangur/docs/tooltips.tsx` | 2 | 2 | no | yes |
| 15 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 2 | 2 | no | yes |
| 16 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 2 | 2 | no | yes |
| 17 | `ResultScreen` | `src/features/kangur/ui/components/ResultScreen.tsx` | 2 | 2 | no | yes |
| 18 | `TrainingSetup` | `src/features/kangur/ui/components/TrainingSetup.tsx` | 2 | 2 | no | yes |
| 19 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 2 | no | no |
| 20 | `CmsBuilderLeftPanel` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx` | 1 | 1 | no | no |
| 21 | `AdminKangurPageShell` | `src/features/kangur/admin/AdminKangurPageShell.tsx` | 1 | 1 | no | no |
| 22 | `StatefulEditorHarness` | `src/features/kangur/admin/KangurLessonDocumentEditor.test.tsx` | 1 | 1 | no | no |
| 23 | `StatefulNarrationPanelHarness` | `src/features/kangur/admin/KangurLessonNarrationPanel.test.tsx` | 1 | 1 | no | no |
| 24 | `StatefulQuestionEditorHarness` | `src/features/kangur/admin/KangurTestQuestionEditor.test.tsx` | 1 | 1 | no | no |
| 25 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 26 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 27 | `SlotZone` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 28 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 29 | `AddingSynthesisGame` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 1 | 1 | no | no |
| 30 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 31 | `SectionView` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 1 | 1 | no | no |
| 32 | `CalendarTrainingGame` | `src/features/kangur/ui/components/CalendarTrainingGame.tsx` | 1 | 1 | no | no |
| 33 | `DraggableClock` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 34 | `ClockTrainingGame` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1 | 1 | no | no |
| 35 | `DifficultySelector` | `src/features/kangur/ui/components/DifficultySelector.tsx` | 1 | 1 | no | no |
| 36 | `DivisionGame` | `src/features/kangur/ui/components/DivisionGame.tsx` | 1 | 1 | no | no |
| 37 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 38 | `KangurAssignmentManager` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1 | 1 | no | no |
| 39 | `ExamQuestion` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 1 | no | no |
| 40 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 1 | 1 | no | no |
| 41 | `KangurLearnerAssignmentsPanel` | `src/features/kangur/ui/components/KangurLearnerAssignmentsPanel.tsx` | 1 | 1 | no | no |
| 42 | `KangurPracticeAssignmentBanner` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx` | 1 | 1 | no | no |
| 43 | `DropdownMenuContent` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 1 | 1 | no | no |
| 44 | `LessonHub` | `src/features/kangur/ui/components/LessonHub.tsx` | 1 | 1 | no | no |
| 45 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 46 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 47 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 48 | `OperationSelector` | `src/features/kangur/ui/components/OperationSelector.tsx` | 1 | 1 | no | no |
| 49 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 1 | no | no |
| 50 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 51 | `KangurLessonNavigationBoundary` | `src/features/kangur/ui/context/KangurLessonNavigationContext.tsx` | 1 | 1 | no | no |
| 52 | `KangurTestQuestionEditor` | `src/features/kangur/admin/KangurTestQuestionEditor.tsx` | 0 | 0 | yes | yes |
| 53 | `VectorCanvas` | `src/shared/ui/vector-canvas/index.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 98 | `KangurCmsPreviewPanel` | `Button` | 5 | 2 | `activeScreenKey -> variant` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:437` |
| 2 | 92 | `KangurCmsPreviewPanel` | `KangurRoutingProvider` | 5 | 1 | `activeScreenKey -> pageKey` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:547` |
| 3 | 92 | `KangurCmsPreviewPanel` | `KangurLessonsRuntimeBoundary` | 5 | 1 | `activeScreenKey -> enabled` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:554` |
| 4 | 92 | `KangurCmsPreviewPanel` | `KangurLearnerProfileRuntimeBoundary` | 5 | 1 | `activeScreenKey -> enabled` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:555` |
| 5 | 92 | `KangurCmsPreviewPanel` | `KangurParentDashboardRuntimeBoundary` | 5 | 1 | `activeScreenKey -> enabled` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:558` |
| 6 | 68 | `KangurQuestionsManagerPanel` | `FormModal` | 2 | 2 | `suite -> subtitle` | `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx:304` |
| 7 | 68 | `LessonSvgQuickAddModal` | `FormModal` | 2 | 2 | `isSaving -> isSaveDisabled` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47` |
| 8 | 62 | `KangurQuestionsManagerPanel` | `KangurTestQuestionEditor` | 2 | 1 | `suite -> suiteTitle` | `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx:322` |
| 9 | 62 | `KangurAssignmentsList` | `KangurPanel` | 2 | 1 | `compact -> className` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:80` |
| 10 | 62 | `KangurAssignmentsList` | `KangurButton` | 2 | 1 | `compact -> variant` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:224` |
| 11 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:212` |
| 12 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> disabled` | `src/features/kangur/ui/components/KangurExam.tsx:212` |
| 13 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> onClick` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:85` |
| 14 | 62 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 2 | 1 | `showAnswer -> className` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:85` |
| 15 | 62 | `KangurTestSuitePlayer` | `KangurTestQuestionRenderer` | 2 | 1 | `questions -> totalQuestions` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:184` |
| 16 | 60 | `LessonSvgQuickAddModal` | `FormModal` | 2 | 2 | `isSaving -> isSaving` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47` |
| 17 | 58 | `CmsBuilderLeftPanel` | `SectionHeader` | 1 | 2 | `variant -> actions` | `src/features/cms/components/page-builder/CmsBuilderLeftPanel.tsx:62` |
| 18 | 58 | `KangurQuestionsManagerPanel` | `Button` | 1 | 2 | `onClose -> onClick` | `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx:179` |
| 19 | 58 | `LessonSvgQuickAddModal` | `FormModal` | 1 | 2 | `lesson -> title` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47` |
| 20 | 58 | `SvgCodeEditor` | `Button` | 1 | 2 | `onChange -> onClick` | `src/features/kangur/admin/components/SvgCodeEditor.tsx:182` |
| 21 | 58 | `KangurCmsPreviewPanel` | `Button` | 1 | 2 | `onSwitchScreen -> onClick` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:437` |
| 22 | 58 | `KangurCmsPreviewPanel` | `Button` | 1 | 2 | `onSave -> onClick` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:499` |
| 23 | 58 | `KangurCmsPreviewPanel` | `Button` | 1 | 2 | `isSaving -> disabled` | `src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:499` |
| 24 | 54 | `KangurTestSuitePlayer` | `ExamSummary` | 2 | 1 | `questions -> questions` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:148` |
| 25 | 54 | `KangurSummaryPanel` | `KangurInfoCard` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:308` |
| 26 | 54 | `KangurSummaryPanel` | `KangurStatusChip` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:316` |
| 27 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/ui/components/AddingBallGame.tsx:325` |
| 28 | 52 | `SlotZone` | `KangurInfoCard` | 1 | 1 | `id -> data-testid` | `src/features/kangur/ui/components/AddingBallGame.tsx:409` |
| 29 | 52 | `AddingBallGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingBallGame.tsx:817` |
| 30 | 52 | `AddingSynthesisGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:461` |
| 31 | 52 | `CalendarInteractiveGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx:325` |
| 32 | 52 | `SectionView` | `KangurButton` | 1 | 1 | `onBack -> onClick` | `src/features/kangur/ui/components/CalendarLesson.tsx:284` |
| 33 | 52 | `CalendarTrainingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/CalendarTrainingGame.tsx:201` |
| 34 | 52 | `DraggableClock` | `KangurButton` | 1 | 1 | `onSubmit -> onClick` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:563` |
| 35 | 52 | `ClockTrainingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:799` |
| 36 | 52 | `DifficultySelector` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/DifficultySelector.tsx:57` |
| 37 | 52 | `DivisionGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/DivisionGame.tsx:226` |
| 38 | 52 | `GeometryDrawingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx:418` |
| 39 | 52 | `KangurAssignmentsList` | `KangurEmptyState` | 1 | 1 | `emptyLabel -> description` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:98` |
| 40 | 52 | `KangurAssignmentsList` | `KangurButton` | 1 | 1 | `onArchive -> onClick` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:230` |
| 41 | 52 | `ExamQuestion` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:137` |
| 42 | 52 | `ResultView` | `KangurButton` | 1 | 1 | `onRestart -> onClick` | `src/features/kangur/ui/components/KangurGame.tsx:255` |
| 43 | 52 | `KangurPracticeAssignmentBanner` | `KangurSummaryPanel` | 1 | 1 | `assignment -> description` | `src/features/kangur/ui/components/KangurPracticeAssignmentBanner.tsx:67` |
| 44 | 52 | `KangurProfileMenu` | `DropdownMenuItem` | 1 | 1 | `onLogout -> onSelect` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:98` |
| 45 | 52 | `KangurProfileMenu` | `DropdownMenuItem` | 1 | 1 | `onLogin -> onSelect` | `src/features/kangur/ui/components/KangurProfileMenu.tsx:103` |
| 46 | 52 | `KangurSetup` | `KangurButton` | 1 | 1 | `onBack -> onClick` | `src/features/kangur/ui/components/KangurSetup.tsx:94` |
| 47 | 52 | `KangurSetup` | `KangurOptionCardButton` | 1 | 1 | `onStart -> onClick` | `src/features/kangur/ui/components/KangurSetup.tsx:199` |
| 48 | 52 | `KangurTestQuestionRenderer` | `KangurQuestionIllustrationRenderer` | 1 | 1 | `question -> illustration` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:53` |
| 49 | 52 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:85` |
| 50 | 52 | `ExamSummary` | `KangurSummaryPanel` | 1 | 1 | `score -> title` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:43` |
| 51 | 52 | `ExamSummary` | `KangurSummaryPanel` | 1 | 1 | `maxScore -> title` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:43` |
| 52 | 52 | `ExamSummary` | `KangurTestQuestionRenderer` | 1 | 1 | `questions -> totalQuestions` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:61` |
| 53 | 52 | `ExamSummary` | `KangurButton` | 1 | 1 | `onRestart -> onClick` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:74` |
| 54 | 52 | `LessonHub` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/LessonHub.tsx:70` |
| 55 | 52 | `InsightList` | `KangurEmptyState` | 1 | 1 | `emptyState -> description` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx:51` |
| 56 | 52 | `MultiplicationArrayGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx:170` |
| 57 | 52 | `MultiplicationGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/MultiplicationGame.tsx:206` |
| 58 | 52 | `OperationSelector` | `KangurOptionCardButton` | 1 | 1 | `onSelect -> onClick` | `src/features/kangur/ui/components/OperationSelector.tsx:113` |
| 59 | 52 | `ResultScreen` | `KangurButton` | 1 | 1 | `onRestart -> onClick` | `src/features/kangur/ui/components/ResultScreen.tsx:81` |
| 60 | 52 | `ResultScreen` | `KangurButton` | 1 | 1 | `onHome -> onClick` | `src/features/kangur/ui/components/ResultScreen.tsx:84` |
| 61 | 52 | `SubtractingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/SubtractingGame.tsx:179` |
| 62 | 52 | `TrainingSetup` | `KangurButton` | 1 | 1 | `onBack -> onClick` | `src/features/kangur/ui/components/TrainingSetup.tsx:117` |
| 63 | 52 | `TrainingSetup` | `KangurButton` | 1 | 1 | `onStart -> onClick` | `src/features/kangur/ui/components/TrainingSetup.tsx:120` |
| 64 | 52 | `KangurSummaryPanel` | `KangurStatusChip` | 1 | 1 | `labelAccent -> accent` | `src/features/kangur/ui/design/primitives.tsx:316` |
| 65 | 50 | `LessonSvgQuickAddModal` | `FormModal` | 1 | 2 | `isOpen -> isOpen` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47` |
| 66 | 50 | `LessonSvgQuickAddModal` | `FormModal` | 1 | 2 | `onClose -> onClose` | `src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47` |
| 67 | 50 | `SvgCodeEditor` | `Textarea` | 1 | 2 | `value -> value` | `src/features/kangur/admin/components/SvgCodeEditor.tsx:196` |
| 68 | 50 | `SvgCodeEditor` | `Textarea` | 1 | 2 | `placeholder -> placeholder` | `src/features/kangur/admin/components/SvgCodeEditor.tsx:196` |
| 69 | 50 | `KangurDocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `enabled -> enabled` | `src/features/kangur/docs/tooltips.tsx:46` |
| 70 | 50 | `KangurDocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `rootId -> rootId` | `src/features/kangur/docs/tooltips.tsx:46` |
| 71 | 44 | `AdminKangurPageShell` | `KangurFeaturePage` | 1 | 1 | `slug -> slug` | `src/features/kangur/admin/AdminKangurPageShell.tsx:13` |
| 72 | 44 | `StatefulEditorHarness` | `KangurLessonDocumentEditor` | 1 | 1 | `onChange -> onChange` | `src/features/kangur/admin/KangurLessonDocumentEditor.test.tsx:58` |
| 73 | 44 | `StatefulNarrationPanelHarness` | `KangurLessonNarrationPanel` | 1 | 1 | `lesson -> lesson` | `src/features/kangur/admin/KangurLessonNarrationPanel.test.tsx:31` |
| 74 | 44 | `StatefulQuestionEditorHarness` | `KangurTestQuestionEditor` | 1 | 1 | `onChange -> onChange` | `src/features/kangur/admin/KangurTestQuestionEditor.test.tsx:48` |
| 75 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `draftProject -> draftProject` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |
| 76 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `savedProject -> savedProject` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |
| 77 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `activeScreenKey -> activeScreenKey` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |
| 78 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `onSwitchScreen -> onSwitchScreen` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |
| 79 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `onSave -> onSave` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |
| 80 | 44 | `KangurCmsBuilderInner` | `KangurCmsPreviewPanel` | 1 | 1 | `isSaving -> isSaving` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 93 | 3 | `KangurTestSuitePlayer` | `KangurTestQuestionRenderer` | 2 | 1 | `questions -> questions -> totalQuestions` |
| 2 | 89 | 3 | `KangurCmsBuilderInner` | `Button` | 1 | 2 | `activeScreenKey -> activeScreenKey -> variant` |
| 3 | 89 | 3 | `KangurCmsBuilderInner` | `Button` | 1 | 2 | `onSwitchScreen -> onSwitchScreen -> onClick` |
| 4 | 89 | 3 | `KangurCmsBuilderInner` | `Button` | 1 | 2 | `onSave -> onSave -> onClick` |
| 5 | 89 | 3 | `KangurCmsBuilderInner` | `Button` | 1 | 2 | `isSaving -> isSaving -> disabled` |
| 6 | 83 | 3 | `KangurCmsBuilderInner` | `KangurRoutingProvider` | 1 | 1 | `activeScreenKey -> activeScreenKey -> pageKey` |
| 7 | 83 | 3 | `KangurCmsBuilderInner` | `KangurLessonsRuntimeBoundary` | 1 | 1 | `activeScreenKey -> activeScreenKey -> enabled` |
| 8 | 83 | 3 | `KangurCmsBuilderInner` | `KangurLearnerProfileRuntimeBoundary` | 1 | 1 | `activeScreenKey -> activeScreenKey -> enabled` |
| 9 | 83 | 3 | `KangurCmsBuilderInner` | `KangurParentDashboardRuntimeBoundary` | 1 | 1 | `activeScreenKey -> activeScreenKey -> enabled` |
| 10 | 83 | 3 | `KangurPriorityAssignments` | `KangurEmptyState` | 1 | 1 | `emptyLabel -> emptyLabel -> description` |

## Top Chain Details (Depth >= 3)

### 1. KangurTestSuitePlayer -> KangurTestQuestionRenderer

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: questions -> questions -> totalQuestions
- Component path:
  - `KangurTestSuitePlayer` (src/features/kangur/ui/components/KangurTestSuitePlayer.tsx)
  - `ExamSummary` (src/features/kangur/ui/components/KangurTestSuitePlayer.tsx)
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
- Transition lines:
  - `KangurTestSuitePlayer` -> `ExamSummary`: `questions` -> `questions` at src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:148
  - `ExamSummary` -> `KangurTestQuestionRenderer`: `questions` -> `totalQuestions` at src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:61

### 2. KangurCmsBuilderInner -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: activeScreenKey -> activeScreenKey -> variant
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `activeScreenKey` -> `activeScreenKey` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `Button`: `activeScreenKey` -> `variant` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:437

### 3. KangurCmsBuilderInner -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: onSwitchScreen -> onSwitchScreen -> onClick
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `onSwitchScreen` -> `onSwitchScreen` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `Button`: `onSwitchScreen` -> `onClick` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:437

### 4. KangurCmsBuilderInner -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: onSave -> onSave -> onClick
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `onSave` -> `onSave` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `Button`: `onSave` -> `onClick` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:499

### 5. KangurCmsBuilderInner -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: isSaving -> isSaving -> disabled
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `isSaving` -> `isSaving` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `Button`: `isSaving` -> `disabled` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:499

### 6. KangurCmsBuilderInner -> KangurRoutingProvider

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: activeScreenKey -> activeScreenKey -> pageKey
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `KangurRoutingProvider` (src/features/kangur/ui/context/KangurRoutingContext.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `activeScreenKey` -> `activeScreenKey` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `KangurRoutingProvider`: `activeScreenKey` -> `pageKey` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:547

### 7. KangurCmsBuilderInner -> KangurLessonsRuntimeBoundary

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: activeScreenKey -> activeScreenKey -> enabled
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `KangurLessonsRuntimeBoundary` (src/features/kangur/ui/context/KangurLessonsRuntimeContext.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `activeScreenKey` -> `activeScreenKey` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `KangurLessonsRuntimeBoundary`: `activeScreenKey` -> `enabled` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:554

### 8. KangurCmsBuilderInner -> KangurLearnerProfileRuntimeBoundary

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: activeScreenKey -> activeScreenKey -> enabled
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `KangurLearnerProfileRuntimeBoundary` (src/features/kangur/ui/context/KangurLearnerProfileRuntimeContext.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `activeScreenKey` -> `activeScreenKey` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `KangurLearnerProfileRuntimeBoundary`: `activeScreenKey` -> `enabled` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:555

### 9. KangurCmsBuilderInner -> KangurParentDashboardRuntimeBoundary

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: activeScreenKey -> activeScreenKey -> enabled
- Component path:
  - `KangurCmsBuilderInner` (src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx)
  - `KangurCmsPreviewPanel` (src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx)
  - `KangurParentDashboardRuntimeBoundary` (src/features/kangur/ui/context/KangurParentDashboardRuntimeContext.tsx)
- Transition lines:
  - `KangurCmsBuilderInner` -> `KangurCmsPreviewPanel`: `activeScreenKey` -> `activeScreenKey` at src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:122
  - `KangurCmsPreviewPanel` -> `KangurParentDashboardRuntimeBoundary`: `activeScreenKey` -> `enabled` at src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:558

### 10. KangurPriorityAssignments -> KangurEmptyState

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: emptyLabel -> emptyLabel -> description
- Component path:
  - `KangurPriorityAssignments` (src/features/kangur/ui/components/KangurPriorityAssignments.tsx)
  - `KangurAssignmentsList` (src/features/kangur/ui/components/KangurAssignmentsList.tsx)
  - `KangurEmptyState` (src/features/kangur/ui/design/primitives.tsx)
- Transition lines:
  - `KangurPriorityAssignments` -> `KangurAssignmentsList`: `emptyLabel` -> `emptyLabel` at src/features/kangur/ui/components/KangurPriorityAssignments.tsx:70
  - `KangurAssignmentsList` -> `KangurEmptyState`: `emptyLabel` -> `description` at src/features/kangur/ui/components/KangurAssignmentsList.tsx:98

## Top Transition Details (Depth = 2)

### 1. KangurCmsPreviewPanel -> Button

- Score: 98
- Root fanout: 5
- Prop mapping: activeScreenKey -> variant
- Location: src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:437

### 2. KangurCmsPreviewPanel -> KangurRoutingProvider

- Score: 92
- Root fanout: 5
- Prop mapping: activeScreenKey -> pageKey
- Location: src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:547

### 3. KangurCmsPreviewPanel -> KangurLessonsRuntimeBoundary

- Score: 92
- Root fanout: 5
- Prop mapping: activeScreenKey -> enabled
- Location: src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:554

### 4. KangurCmsPreviewPanel -> KangurLearnerProfileRuntimeBoundary

- Score: 92
- Root fanout: 5
- Prop mapping: activeScreenKey -> enabled
- Location: src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:555

### 5. KangurCmsPreviewPanel -> KangurParentDashboardRuntimeBoundary

- Score: 92
- Root fanout: 5
- Prop mapping: activeScreenKey -> enabled
- Location: src/features/kangur/cms-builder/KangurCmsPreviewPanel.tsx:558

### 6. KangurQuestionsManagerPanel -> FormModal

- Score: 68
- Root fanout: 2
- Prop mapping: suite -> subtitle
- Location: src/features/kangur/admin/KangurQuestionsManagerPanel.tsx:304

### 7. LessonSvgQuickAddModal -> FormModal

- Score: 68
- Root fanout: 2
- Prop mapping: isSaving -> isSaveDisabled
- Location: src/features/kangur/admin/components/LessonSvgQuickAddModal.tsx:47

### 8. KangurQuestionsManagerPanel -> KangurTestQuestionEditor

- Score: 62
- Root fanout: 2
- Prop mapping: suite -> suiteTitle
- Location: src/features/kangur/admin/KangurQuestionsManagerPanel.tsx:322

### 9. KangurAssignmentsList -> KangurPanel

- Score: 62
- Root fanout: 2
- Prop mapping: compact -> className
- Location: src/features/kangur/ui/components/KangurAssignmentsList.tsx:80

### 10. KangurAssignmentsList -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: compact -> variant
- Location: src/features/kangur/ui/components/KangurAssignmentsList.tsx:224

### 11. ExamSummary -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: questions -> onClick
- Location: src/features/kangur/ui/components/KangurExam.tsx:212

### 12. ExamSummary -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: questions -> disabled
- Location: src/features/kangur/ui/components/KangurExam.tsx:212

### 13. KangurTestQuestionRenderer -> KangurOptionCardButton

- Score: 62
- Root fanout: 2
- Prop mapping: showAnswer -> onClick
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:85

### 14. KangurTestQuestionRenderer -> KangurOptionCardButton

- Score: 62
- Root fanout: 2
- Prop mapping: showAnswer -> className
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:85

### 15. KangurTestSuitePlayer -> KangurTestQuestionRenderer

- Score: 62
- Root fanout: 2
- Prop mapping: questions -> totalQuestions
- Location: src/features/kangur/ui/components/KangurTestSuitePlayer.tsx:184

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
