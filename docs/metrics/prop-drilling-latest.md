---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-10T13:39:52.943Z

## Snapshot

- Scanned source files: 4570
- JSX files scanned: 1642
- Components detected: 2617
- Components forwarding parent props (hotspot threshold): 11
- Components forwarding parent props (any): 47
- Resolved forwarded transitions: 51
- Candidate chains (depth >= 2): 51
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 8
- Hotspot forwarding components backlog size: 11

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 42 |
| `feature:cms` | 3 |
| `shared-lib` | 1 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurEmptyState` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 2 | `KangurMetricCard` | `src/features/kangur/ui/design/primitives.tsx` | 3 | 3 | yes | yes |
| 3 | `KangurHeroMilestoneSummary` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx` | 2 | 2 | no | yes |
| 4 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 2 | 2 | no | yes |
| 5 | `KangurAiTutorProvider` | `src/features/kangur/ui/context/KangurAiTutorContext.tsx` | 2 | 2 | no | yes |
| 6 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 2 | no | no |
| 7 | `KangurHomeActionCard` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx` | 1 | 2 | no | no |
| 8 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 2 | no | no |
| 9 | `MetricCard` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 1 | no | no |
| 10 | `LessonContentEditorDialogContent` | `src/features/kangur/admin/components/LessonContentEditorDialog.tsx` | 1 | 1 | no | no |
| 11 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 12 | `KangurFeatureRouteShell` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx` | 1 | 1 | no | no |
| 13 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 14 | `KangurPublicErrorBoundary` | `src/features/kangur/ui/KangurPublicErrorBoundary.tsx` | 1 | 1 | no | no |
| 15 | `CompleteEquation` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 16 | `SlotZone` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 17 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 18 | `AddingSynthesisGame` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx` | 1 | 1 | no | no |
| 19 | `AssignmentPanel` | `src/features/kangur/ui/components/AssignmentPanel.tsx` | 1 | 1 | no | no |
| 20 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 21 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 22 | `KangurActiveLessonHeader` | `src/features/kangur/ui/components/KangurActiveLessonHeader.tsx` | 1 | 1 | no | no |
| 23 | `KangurAiTutorGuidedCallout` | `src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx` | 1 | 1 | no | no |
| 24 | `KangurAssignmentSpotlight` | `src/features/kangur/ui/components/KangurAssignmentSpotlight.tsx` | 1 | 1 | no | no |
| 25 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 1 | 1 | no | no |
| 26 | `KangurBadgeTrackHighlights` | `src/features/kangur/ui/components/KangurBadgeTrackHighlights.tsx` | 1 | 1 | no | no |
| 27 | `KangurGameHomeMomentumWidget` | `src/features/kangur/ui/components/KangurGameHomeMomentumWidget.tsx` | 1 | 1 | no | no |
| 28 | `KangurNarratorControl` | `src/features/kangur/ui/components/KangurNarratorControl.tsx` | 1 | 1 | no | no |
| 29 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 30 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 31 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 1 | 1 | no | no |
| 32 | `KangurTopNavigationController` | `src/features/kangur/ui/components/KangurTopNavigationController.tsx` | 1 | 1 | no | no |
| 33 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 34 | `LessonSlideSection` | `src/features/kangur/ui/components/LessonSlideSection.tsx` | 1 | 1 | no | no |
| 35 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 36 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 37 | `PlayerProgressCard` | `src/features/kangur/ui/components/PlayerProgressCard.tsx` | 1 | 1 | no | no |
| 38 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 39 | `XpToast` | `src/features/kangur/ui/components/XpToast.tsx` | 1 | 1 | no | no |
| 40 | `KangurLessonNavigationBoundary` | `src/features/kangur/ui/context/KangurLessonNavigationContext.tsx` | 1 | 1 | no | no |
| 41 | `TriggerButtonBar` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx` | 1 | 1 | no | no |
| 42 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 43 | `SectionRenderer` | `src/features/cms/components/frontend/CmsPageRenderer.tsx` | 0 | 0 | yes | yes |
| 44 | `CmsPageRenderer` | `src/features/cms/components/frontend/CmsPageRendererServer.tsx` | 0 | 0 | yes | yes |
| 45 | `KangurTestQuestionEditor` | `src/features/kangur/admin/KangurTestQuestionEditor.tsx` | 0 | 0 | yes | yes |
| 46 | `KangurLoginPage` | `src/features/kangur/ui/KangurLoginPage.tsx` | 0 | 0 | yes | yes |
| 47 | `VectorCanvas` | `src/shared/ui/vector-canvas/index.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> onClick` | `src/features/kangur/ui/components/KangurExam.tsx:301` |
| 2 | 62 | `ExamSummary` | `KangurButton` | 2 | 1 | `questions -> disabled` | `src/features/kangur/ui/components/KangurExam.tsx:301` |
| 3 | 62 | `KangurHomeActionCard` | `KangurTransitionLink` | 2 | 1 | `action -> href` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145` |
| 4 | 62 | `KangurHomeActionCard` | `KangurTransitionLink` | 2 | 1 | `action -> targetPageKey` | `src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145` |
| 5 | 58 | `MetricCard` | `StatusBadge` | 1 | 2 | `alert -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:167` |
| 6 | 54 | `ProgressOverview` | `LessonMasteryInsights` | 2 | 1 | `progress -> progress` | `src/features/kangur/ui/components/ProgressOverview.tsx:184` |
| 7 | 54 | `ProgressOverview` | `KangurBadgeTrackGrid` | 2 | 1 | `progress -> progress` | `src/features/kangur/ui/components/ProgressOverview.tsx:237` |
| 8 | 52 | `CompleteEquation` | `SlotZone` | 1 | 1 | `round -> label` | `src/features/kangur/ui/components/AddingBallGame.tsx:338` |
| 9 | 52 | `SlotZone` | `KangurInfoCard` | 1 | 1 | `id -> data-testid` | `src/features/kangur/ui/components/AddingBallGame.tsx:422` |
| 10 | 52 | `AddingBallGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingBallGame.tsx:857` |
| 11 | 52 | `AddingSynthesisGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AddingSynthesisGame.tsx:478` |
| 12 | 52 | `AssignmentPanel` | `KangurTransitionLink` | 1 | 1 | `basePath -> href` | `src/features/kangur/ui/components/AssignmentPanel.tsx:151` |
| 13 | 52 | `CalendarInteractiveGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx:454` |
| 14 | 52 | `GeometryDrawingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx:562` |
| 15 | 52 | `KangurActiveLessonHeader` | `KangurGlassPanel` | 1 | 1 | `headerTestId -> data-testid` | `src/features/kangur/ui/components/KangurActiveLessonHeader.tsx:233` |
| 16 | 52 | `KangurAiTutorGuidedCallout` | `KangurButton` | 1 | 1 | `onAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx:169` |
| 17 | 52 | `KangurAssignmentSpotlight` | `KangurTransitionLink` | 1 | 1 | `basePath -> href` | `src/features/kangur/ui/components/KangurAssignmentSpotlight.tsx:118` |
| 18 | 52 | `KangurAssignmentsList` | `KangurEmptyState` | 1 | 1 | `emptyLabel -> description` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:259` |
| 19 | 52 | `KangurBadgeTrackHighlights` | `KangurProgressBar` | 1 | 1 | `dataTestIdPrefix -> data-testid` | `src/features/kangur/ui/components/KangurBadgeTrackHighlights.tsx:86` |
| 20 | 52 | `KangurGameHomeMomentumWidget` | `KangurTransitionLink` | 1 | 1 | `basePath -> href` | `src/features/kangur/ui/components/KangurGameHomeMomentumWidget.tsx:292` |
| 21 | 52 | `KangurHeroMilestoneSummary` | `KangurProgressBar` | 1 | 1 | `dataTestIdPrefix -> data-testid` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx:58` |
| 22 | 52 | `KangurSetup` | `KangurOptionCardButton` | 1 | 1 | `recommendedMode -> emphasis` | `src/features/kangur/ui/components/KangurSetup.tsx:266` |
| 23 | 52 | `KangurSetup` | `KangurOptionCardButton` | 1 | 1 | `onStart -> onClick` | `src/features/kangur/ui/components/KangurSetup.tsx:266` |
| 24 | 52 | `KangurTestQuestionRenderer` | `KangurLessonDocumentRenderer` | 1 | 1 | `question -> document` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:246` |
| 25 | 52 | `InsightList` | `KangurEmptyState` | 1 | 1 | `emptyState -> description` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx:51` |
| 26 | 52 | `LessonSlideSection` | `KangurButton` | 1 | 1 | `slides -> onClick` | `src/features/kangur/ui/components/LessonSlideSection.tsx:186` |
| 27 | 52 | `MultiplicationArrayGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx:199` |
| 28 | 52 | `MultiplicationGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/MultiplicationGame.tsx:233` |
| 29 | 52 | `SubtractingGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/SubtractingGame.tsx:208` |
| 30 | 44 | `LessonContentEditorDialogContent` | `LessonMetadataWorkspacePanel` | 1 | 1 | `onLessonChange -> onLessonChange` | `src/features/kangur/admin/components/LessonContentEditorDialog.tsx:414` |
| 31 | 44 | `KangurFeaturePage` | `KangurRoutingProvider` | 1 | 1 | `embedded -> embedded` | `src/features/kangur/ui/KangurFeaturePage.tsx:88` |
| 32 | 44 | `KangurFeatureRouteShell` | `KangurRoutingProvider` | 1 | 1 | `embedded -> embedded` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx:73` |
| 33 | 44 | `KangurPublicApp` | `KangurRoutingProvider` | 1 | 1 | `embedded -> embedded` | `src/features/kangur/ui/KangurPublicApp.tsx:31` |
| 34 | 44 | `KangurPublicErrorBoundary` | `KangurErrorFallback` | 1 | 1 | `homeHref -> homeHref` | `src/features/kangur/ui/KangurPublicErrorBoundary.tsx:34` |
| 35 | 44 | `KangurHeroMilestoneSummary` | `KangurBadgeTrackHighlights` | 1 | 1 | `progress -> progress` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx:69` |
| 36 | 44 | `KangurNarratorControl` | `KangurButton` | 1 | 1 | `docId -> docId` | `src/features/kangur/ui/components/KangurNarratorControl.tsx:404` |
| 37 | 44 | `SkeletonChip` | `SkeletonBlock` | 1 | 1 | `className -> className` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx:37` |
| 38 | 44 | `SkeletonLine` | `SkeletonBlock` | 1 | 1 | `className -> className` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx:63` |
| 39 | 44 | `KangurTopNavigationController` | `KangurPrimaryNavigation` | 1 | 1 | `navigation -> navigation` | `src/features/kangur/ui/components/KangurTopNavigationController.tsx:47` |
| 40 | 44 | `PlayerProgressCard` | `KangurBadgeTrackGrid` | 1 | 1 | `progress -> progress` | `src/features/kangur/ui/components/PlayerProgressCard.tsx:199` |
| 41 | 44 | `XpToast` | `KangurRewardBreakdownChips` | 1 | 1 | `breakdown -> breakdown` | `src/features/kangur/ui/components/XpToast.tsx:61` |
| 42 | 44 | `KangurAiTutorProvider` | `KangurAiTutorSessionSyncInner` | 1 | 1 | `learnerId -> learnerId` | `src/features/kangur/ui/context/KangurAiTutorContext.tsx:41` |
| 43 | 44 | `KangurAiTutorProvider` | `KangurAiTutorSessionSyncInner` | 1 | 1 | `sessionContext -> sessionContext` | `src/features/kangur/ui/context/KangurAiTutorContext.tsx:41` |
| 44 | 44 | `KangurLessonNavigationBoundary` | `KangurLessonNavigationProvider` | 1 | 1 | `onBack -> onBack` | `src/features/kangur/ui/context/KangurLessonNavigationContext.tsx:92` |
| 45 | 44 | `KangurEmptyState` | `KangurInfoCard` | 1 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1273` |
| 46 | 44 | `KangurEmptyState` | `KangurInfoCard` | 1 | 1 | `className -> className` | `src/features/kangur/ui/design/primitives.tsx:1273` |
| 47 | 44 | `KangurEmptyState` | `KangurInfoCard` | 1 | 1 | `padding -> padding` | `src/features/kangur/ui/design/primitives.tsx:1273` |
| 48 | 44 | `KangurMetricCard` | `KangurInfoCard` | 1 | 1 | `accent -> accent` | `src/features/kangur/ui/design/primitives.tsx:1372` |
| 49 | 44 | `KangurMetricCard` | `KangurInfoCard` | 1 | 1 | `className -> className` | `src/features/kangur/ui/design/primitives.tsx:1372` |
| 50 | 44 | `KangurMetricCard` | `KangurInfoCard` | 1 | 1 | `padding -> padding` | `src/features/kangur/ui/design/primitives.tsx:1372` |
| 51 | 44 | `TriggerButtonBar` | `TriggerRunFeedback` | 1 | 1 | `location -> location` | `src/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar.tsx:303` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. ExamSummary -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: questions -> onClick
- Location: src/features/kangur/ui/components/KangurExam.tsx:301

### 2. ExamSummary -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: questions -> disabled
- Location: src/features/kangur/ui/components/KangurExam.tsx:301

### 3. KangurHomeActionCard -> KangurTransitionLink

- Score: 62
- Root fanout: 2
- Prop mapping: action -> href
- Location: src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145

### 4. KangurHomeActionCard -> KangurTransitionLink

- Score: 62
- Root fanout: 2
- Prop mapping: action -> targetPageKey
- Location: src/features/kangur/ui/components/KangurGameHomeActionsWidget.tsx:145

### 5. MetricCard -> StatusBadge

- Score: 58
- Root fanout: 1
- Prop mapping: alert -> status
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:167

### 6. ProgressOverview -> LessonMasteryInsights

- Score: 54
- Root fanout: 2
- Prop mapping: progress -> progress
- Location: src/features/kangur/ui/components/ProgressOverview.tsx:184

### 7. ProgressOverview -> KangurBadgeTrackGrid

- Score: 54
- Root fanout: 2
- Prop mapping: progress -> progress
- Location: src/features/kangur/ui/components/ProgressOverview.tsx:237

### 8. CompleteEquation -> SlotZone

- Score: 52
- Root fanout: 1
- Prop mapping: round -> label
- Location: src/features/kangur/ui/components/AddingBallGame.tsx:338

### 9. SlotZone -> KangurInfoCard

- Score: 52
- Root fanout: 1
- Prop mapping: id -> data-testid
- Location: src/features/kangur/ui/components/AddingBallGame.tsx:422

### 10. AddingBallGame -> KangurButton

- Score: 52
- Root fanout: 1
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/AddingBallGame.tsx:857

### 11. AddingSynthesisGame -> KangurButton

- Score: 52
- Root fanout: 1
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/AddingSynthesisGame.tsx:478

### 12. AssignmentPanel -> KangurTransitionLink

- Score: 52
- Root fanout: 1
- Prop mapping: basePath -> href
- Location: src/features/kangur/ui/components/AssignmentPanel.tsx:151

### 13. CalendarInteractiveGame -> KangurButton

- Score: 52
- Root fanout: 1
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/CalendarInteractiveGame.tsx:454

### 14. GeometryDrawingGame -> KangurButton

- Score: 52
- Root fanout: 1
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/GeometryDrawingGame.tsx:562

### 15. KangurActiveLessonHeader -> KangurGlassPanel

- Score: 52
- Root fanout: 1
- Prop mapping: headerTestId -> data-testid
- Location: src/features/kangur/ui/components/KangurActiveLessonHeader.tsx:233

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
