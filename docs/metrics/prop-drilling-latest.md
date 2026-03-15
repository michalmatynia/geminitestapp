---
owner: 'Platform Team'
last_reviewed: '2026-03-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-15T07:47:17.113Z

## Snapshot

- Scanned source files: 4809
- JSX files scanned: 1796
- Components detected: 2921
- Components forwarding parent props (hotspot threshold): 49
- Components forwarding parent props (any): 49
- Resolved forwarded transitions: 160
- Candidate chains (depth >= 2): 160
- Candidate chains (depth >= 3): 7
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 6
- Hotspot forwarding components backlog size: 49

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 44 |
| `feature:ai` | 2 |
| `feature:integrations` | 1 |
| `feature:cms` | 1 |
| `shared-ui` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurPracticeGameSummaryProgress` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 6 | 6 | no | yes |
| 2 | `KangurAiTutorPanelChrome` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx` | 5 | 5 | no | yes |
| 3 | `KangurProgressHighlightHeader` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 5 | 5 | no | yes |
| 4 | `KangurRecommendationCardHeader` | `src/features/kangur/ui/components/KangurRecommendationCard.tsx` | 5 | 5 | no | yes |
| 5 | `KangurCmsBuilderLeftPanel` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx` | 4 | 8 | no | yes |
| 6 | `KangurAiTutorPanelContextCard` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx` | 4 | 7 | no | yes |
| 7 | `KangurBadgeTrackCardBar` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 4 | 4 | no | yes |
| 8 | `KangurHeroMilestoneSummary` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx` | 4 | 4 | no | yes |
| 9 | `KangurPracticeGameProgress` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 4 | 4 | no | yes |
| 10 | `KangurPracticeGameSummaryActions` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 4 | 4 | no | yes |
| 11 | `KangurProgressHighlightBar` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 4 | 4 | no | yes |
| 12 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 7 | no | yes |
| 13 | `AllegroSubpageScaffold` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx` | 3 | 6 | no | yes |
| 14 | `ImageStudioWorkspaceSlotInfo` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx` | 3 | 5 | no | yes |
| 15 | `CmsPageShellFrame` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no | yes |
| 16 | `KangurCmsBuilderRightPanel` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx` | 3 | 3 | no | yes |
| 17 | `SlotZone` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 3 | 3 | no | yes |
| 18 | `DraggableBall` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 3 | 3 | no | yes |
| 19 | `KangurActivitySummaryCard` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx` | 3 | 3 | no | yes |
| 20 | `KangurBadgeTrackCardHeader` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 3 | 3 | no | yes |
| 21 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 3 | 3 | no | yes |
| 22 | `KangurLabeledValueSummary` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx` | 3 | 3 | no | yes |
| 23 | `KangurPanelSectionHeading` | `src/features/kangur/ui/components/KangurPanelSectionHeading.tsx` | 3 | 3 | yes | yes |
| 24 | `KangurPracticeGameSummaryBreakdown` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 3 | 3 | no | yes |
| 25 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 3 | 3 | no | yes |
| 26 | `KangurSessionHistoryAside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx` | 3 | 3 | no | yes |
| 27 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 3 | 3 | no | yes |
| 28 | `TrainingSetup` | `src/features/kangur/ui/components/TrainingSetup.tsx` | 3 | 3 | no | yes |
| 29 | `KangurFeatureHeader` | `src/features/kangur/ui/design/primitives/KangurFeatureHeader.tsx` | 3 | 3 | yes | yes |
| 30 | `NavigationCard` | `src/shared/ui/navigation-card.tsx` | 3 | 3 | no | yes |
| 31 | `ImageStudioWorkspaceStudioControls` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx` | 2 | 2 | no | yes |
| 32 | `KangurThemeSettingsPanel` | `src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx` | 2 | 2 | no | yes |
| 33 | `GeometryBasicsWorkshopGame` | `src/features/kangur/ui/components/GeometryBasicsWorkshopGame.tsx` | 2 | 2 | no | yes |
| 34 | `GeometryPerimeterDrawingGame` | `src/features/kangur/ui/components/GeometryPerimeterDrawingGame.tsx` | 2 | 2 | no | yes |
| 35 | `KangurAiTutorWarmOverlayPanel` | `src/features/kangur/ui/components/KangurAiTutorChrome.tsx` | 2 | 2 | yes | yes |
| 36 | `KangurAiTutorDrawingSidePanel` | `src/features/kangur/ui/components/KangurAiTutorDrawingSidePanel.tsx` | 2 | 2 | no | yes |
| 37 | `KangurAnswerChoiceCard` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx` | 2 | 2 | yes | yes |
| 38 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 2 | 2 | no | yes |
| 39 | `KangurAssignmentPriorityChip` | `src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx` | 2 | 2 | yes | yes |
| 40 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 41 | `KangurBadgeTrackSectionHeader` | `src/features/kangur/ui/components/KangurBadgeTrackSection.tsx` | 2 | 2 | no | yes |
| 42 | `KangurBadgeTrackSummaryCard` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 2 | 2 | no | yes |
| 43 | `KangurResultSectionCard` | `src/features/kangur/ui/components/KangurGameResultWidget.tsx` | 2 | 2 | no | yes |
| 44 | `KangurIconSummaryOptionCard` | `src/features/kangur/ui/components/KangurIconSummaryOptionCard.tsx` | 2 | 2 | yes | yes |
| 45 | `KangurLessonLibraryCardAside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx` | 2 | 2 | no | yes |
| 46 | `KangurLessonNavigationWidget` | `src/features/kangur/ui/components/KangurLessonNavigationWidget.tsx` | 2 | 2 | no | yes |
| 47 | `KangurPracticeGameSummaryEmoji` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 2 | 2 | no | yes |
| 48 | `KangurPracticeGameSummary` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 2 | 2 | no | yes |
| 49 | `KangurProgressHighlightChip` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 2 | 2 | no | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 92 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 5 | 1 | `showAnswer -> description` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156` |
| 2 | 92 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 5 | 1 | `showAnswer -> title` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156` |
| 3 | 92 | `KangurTestQuestionRenderer` | `KangurAnswerChoiceCard` | 5 | 1 | `showAnswer -> interactive` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:228` |
| 4 | 84 | `KangurTestQuestionRenderer` | `KangurTestChoiceCard` | 5 | 1 | `showAnswer -> showAnswer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:219` |
| 5 | 84 | `KangurTestQuestionRenderer` | `KangurTestChoiceCardFeedback` | 5 | 1 | `showAnswer -> showAnswer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:243` |
| 6 | 78 | `ImageStudioWorkspaceSlotInfo` | `Tooltip` | 3 | 2 | `selectedSlot -> content` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:117` |
| 7 | 78 | `ImageStudioWorkspaceSlotInfo` | `CopyButton` | 3 | 2 | `selectedSlot -> value` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:118` |
| 8 | 78 | `ImageStudioWorkspaceSlotInfo` | `CopyButton` | 3 | 2 | `selectedSlot -> disabled` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:118` |
| 9 | 78 | `AllegroSubpageScaffold` | `PageLayout` | 3 | 2 | `title -> eyebrow` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22` |
| 10 | 78 | `AllegroSubpageScaffold` | `AdminIntegrationsBreadcrumbs` | 3 | 2 | `title -> current` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:26` |
| 11 | 70 | `AllegroSubpageScaffold` | `PageLayout` | 3 | 2 | `title -> title` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22` |
| 12 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> title` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:35` |
| 13 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> description` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:35` |
| 14 | 68 | `KangurCmsBuilderLeftPanel` | `CmsBuilderLeftPanel` | 2 | 2 | `onThemeSectionChange -> themePanel` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23` |
| 15 | 68 | `KangurCmsBuilderLeftPanel` | `CmsBuilderLeftPanel` | 2 | 2 | `onThemeChange -> themePanel` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23` |
| 16 | 68 | `KangurCmsBuilderLeftPanel` | `CmsBuilderLeftPanel` | 2 | 2 | `onModeChange -> themePanel` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23` |
| 17 | 68 | `KangurCmsBuilderLeftPanel` | `CmsBuilderLeftPanel` | 2 | 2 | `onThemeModeChange -> themePanel` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23` |
| 18 | 62 | `KangurCmsBuilderLeftPanel` | `KangurThemeSettingsPanel` | 2 | 1 | `onThemeSectionChange -> onSectionChange` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:27` |
| 19 | 62 | `KangurCmsBuilderLeftPanel` | `KangurThemeSettingsPanel` | 2 | 1 | `onThemeModeChange -> onModeChange` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:27` |
| 20 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 21 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 22 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 23 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 24 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 25 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> tone` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 26 | 60 | `KangurCmsBuilderLeftPanel` | `CmsBuilderLeftPanel` | 2 | 2 | `onModeChange -> onModeChange` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23` |
| 27 | 58 | `ImageStudioWorkspaceSlotInfo` | `Tooltip` | 1 | 2 | `copyCardNameTooltip -> content` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:117` |
| 28 | 58 | `ImageStudioWorkspaceSlotInfo` | `Tooltip` | 1 | 2 | `selectCardFirstTooltip -> content` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:117` |
| 29 | 54 | `KangurCmsBuilderLeftPanel` | `KangurThemeSettingsPanel` | 2 | 1 | `onThemeChange -> onThemeChange` | `src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:27` |
| 30 | 52 | `ImageStudioWorkspaceStudioControls` | `ToggleButtonGroup` | 1 | 1 | `previewCanvasSize -> value` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:86` |
| 31 | 52 | `ImageStudioWorkspaceStudioControls` | `ToggleButtonGroup` | 1 | 1 | `onPreviewCanvasSizeChange -> onChange` | `src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:86` |
| 32 | 52 | `KangurCmsBuilderRightPanel` | `KangurThemePreviewPanel` | 1 | 1 | `themePreviewSection -> section` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx:36` |
| 33 | 52 | `KangurCmsBuilderRightPanel` | `KangurThemePreviewPanel` | 1 | 1 | `themePreviewTheme -> theme` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx:36` |
| 34 | 52 | `KangurCmsBuilderRightPanel` | `KangurThemePreviewPanel` | 1 | 1 | `themePreviewMode -> mode` | `src/features/kangur/cms-builder/KangurCmsBuilderRightPanel.tsx:36` |
| 35 | 52 | `SlotZone` | `DraggableBall` | 1 | 1 | `checked -> isDragDisabled` | `src/features/kangur/ui/components/AddingBallGame.tsx:557` |
| 36 | 52 | `SlotZone` | `DraggableBall` | 1 | 1 | `selectedBallId -> isSelected` | `src/features/kangur/ui/components/AddingBallGame.tsx:557` |
| 37 | 52 | `SlotZone` | `DraggableBall` | 1 | 1 | `onSelectBall -> onSelect` | `src/features/kangur/ui/components/AddingBallGame.tsx:557` |
| 38 | 52 | `KangurActivitySummaryCard` | `KangurInfoCard` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:31` |
| 39 | 52 | `KangurActivitySummaryCard` | `KangurSectionEyebrow` | 1 | 1 | `eyebrowClassName -> className` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:38` |
| 40 | 52 | `KangurActivitySummaryCard` | `KangurCardDescription` | 1 | 1 | `descriptionClassName -> className` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:43` |
| 41 | 52 | `KangurAiTutorWarmOverlayPanel` | `KangurGlassPanel` | 1 | 1 | `tone -> className` | `src/features/kangur/ui/components/KangurAiTutorChrome.tsx:145` |
| 42 | 52 | `KangurAiTutorDrawingSidePanel` | `KangurAiTutorDrawingCanvas` | 1 | 1 | `onClose -> onCancel` | `src/features/kangur/ui/components/KangurAiTutorDrawingSidePanel.tsx:53` |
| 43 | 52 | `KangurAiTutorPanelChrome` | `KangurAiTutorChromeTextButton` | 1 | 1 | `onDetachPanelFromContext -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx:726` |
| 44 | 52 | `KangurAiTutorPanelChrome` | `KangurAiTutorChromeTextButton` | 1 | 1 | `onMovePanelToContext -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx:737` |
| 45 | 52 | `KangurAiTutorPanelChrome` | `KangurAiTutorChromeTextButton` | 1 | 1 | `onResetPanelPosition -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx:748` |
| 46 | 52 | `KangurAiTutorPanelChrome` | `KangurAiTutorChromeTextButton` | 1 | 1 | `onDisableTutor -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx:758` |
| 47 | 52 | `KangurAiTutorPanelChrome` | `KangurAiTutorChromeCloseButton` | 1 | 1 | `onClose -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx:765` |
| 48 | 52 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:66` |
| 49 | 52 | `KangurAnswerChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `interactive -> className` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:49` |
| 50 | 52 | `KangurAnswerChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `buttonClassName -> className` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:49` |
| 51 | 52 | `KangurAssignmentManagerItemCard` | `KangurInfoCard` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:60` |
| 52 | 52 | `KangurAssignmentPriorityChip` | `KangurStatusChip` | 1 | 1 | `priority -> accent` | `src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx:23` |
| 53 | 52 | `KangurAssignmentsList` | `KangurPanelIntro` | 1 | 1 | `summary -> description` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx:230` |
| 54 | 52 | `KangurBadgeTrackSectionHeader` | `KangurSectionEyebrow` | 1 | 1 | `headingAs -> as` | `src/features/kangur/ui/components/KangurBadgeTrackSection.tsx:19` |
| 55 | 52 | `KangurBadgeTrackCardHeader` | `KangurSectionEyebrow` | 1 | 1 | `labelClassName -> className` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx:44` |
| 56 | 52 | `KangurBadgeTrackCardHeader` | `KangurStatusChip` | 1 | 1 | `statusChipClassName -> className` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx:50` |
| 57 | 52 | `KangurBadgeTrackCardBar` | `KangurProgressBar` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx:97` |
| 58 | 52 | `KangurBadgeTrackSummaryCard` | `KangurInfoCard` | 1 | 1 | `cardClassName -> className` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx:121` |
| 59 | 52 | `KangurBadgeTrackSummaryCard` | `KangurInfoCard` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx:121` |
| 60 | 52 | `ResultView` | `KangurPracticeGameSummaryTitle` | 1 | 1 | `score -> title` | `src/features/kangur/ui/components/KangurGame.tsx:284` |
| 61 | 52 | `ResultView` | `KangurPracticeGameSummaryTitle` | 1 | 1 | `total -> title` | `src/features/kangur/ui/components/KangurGame.tsx:284` |
| 62 | 52 | `KangurResultSectionCard` | `KangurInfoCard` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurGameResultWidget.tsx:31` |
| 63 | 52 | `KangurHeroMilestoneSummary` | `KangurBadgeTrackHighlights` | 1 | 1 | `trackLimit -> limit` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx:101` |
| 64 | 52 | `KangurHeroMilestoneSummary` | `KangurBadgeTrackHighlights` | 1 | 1 | `trackMinimumItems -> minimumItems` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx:101` |
| 65 | 52 | `KangurIconSummaryOptionCard` | `KangurOptionCardButton` | 1 | 1 | `buttonClassName -> className` | `src/features/kangur/ui/components/KangurIconSummaryOptionCard.tsx:20` |
| 66 | 52 | `KangurLabeledValueSummary` | `KangurSectionEyebrow` | 1 | 1 | `labelClassName -> className` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx:34` |
| 67 | 52 | `KangurLabeledValueSummary` | `KangurCardDescription` | 1 | 1 | `descriptionClassName -> className` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx:44` |
| 68 | 52 | `KangurLabeledValueSummary` | `KangurCardDescription` | 1 | 1 | `descriptionSize -> size` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx:44` |
| 69 | 52 | `KangurLessonLibraryCardAside` | `KangurStatusChip` | 1 | 1 | `masteryPresentation -> accent` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:30` |
| 70 | 52 | `KangurLessonLibraryCardAside` | `KangurAssignmentPriorityChip` | 1 | 1 | `lessonAssignment -> priority` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:38` |
| 71 | 52 | `KangurLessonNavigationWidget` | `KangurPanelIntro` | 1 | 1 | `sectionSummary -> description` | `src/features/kangur/ui/components/KangurLessonNavigationWidget.tsx:41` |
| 72 | 52 | `KangurLessonNavigationWidget` | `KangurPanelIntro` | 1 | 1 | `sectionTitle -> title` | `src/features/kangur/ui/components/KangurLessonNavigationWidget.tsx:41` |
| 73 | 52 | `KangurPracticeGameProgress` | `KangurProgressBar` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:47` |
| 74 | 52 | `KangurPracticeGameProgress` | `KangurProgressBar` | 1 | 1 | `currentRound -> value` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:47` |
| 75 | 52 | `KangurPracticeGameProgress` | `KangurProgressBar` | 1 | 1 | `totalRounds -> value` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:47` |
| 76 | 52 | `KangurPracticeGameSummaryEmoji` | `KangurDisplayEmoji` | 1 | 1 | `ariaHidden -> aria-hidden` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:73` |
| 77 | 52 | `KangurPracticeGameSummaryEmoji` | `KangurDisplayEmoji` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:73` |
| 78 | 52 | `KangurPracticeGameSummaryProgress` | `KangurProgressBar` | 1 | 1 | `ariaLabel -> aria-label` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:160` |
| 79 | 52 | `KangurPracticeGameSummaryProgress` | `KangurProgressBar` | 1 | 1 | `ariaValueText -> aria-valuetext` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:160` |
| 80 | 52 | `KangurPracticeGameSummaryProgress` | `KangurProgressBar` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:160` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 123 | 3 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 5 | 1 | `showAnswer -> interactive -> className` |
| 2 | 93 | 3 | `KangurCmsBuilderLeftPanel` | `KangurThemeSettingsEditor` | 2 | 1 | `onThemeSectionChange -> onSectionChange -> onSectionChange` |
| 3 | 93 | 3 | `KangurCmsBuilderLeftPanel` | `KangurThemeSettingsEditor` | 2 | 1 | `onThemeChange -> onThemeChange -> onThemeChange` |
| 4 | 83 | 3 | `SlotZone` | `Ball` | 1 | 1 | `selectedBallId -> isSelected -> isSelected` |
| 5 | 83 | 3 | `GeometryBasicsWorkshopGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 6 | 83 | 3 | `GeometryPerimeterDrawingGame` | `KangurButton` | 1 | 1 | `onFinish -> onFinish -> onClick` |
| 7 | 83 | 3 | `KangurLessonLibraryCardAside` | `KangurStatusChip` | 1 | 1 | `lessonAssignment -> priority -> accent` |

## Top Chain Details (Depth >= 3)

### 1. KangurTestQuestionRenderer -> KangurOptionCardButton

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: showAnswer -> interactive -> className
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurOptionCardButton` (src/features/kangur/ui/design/primitives/KangurOptionCardButton.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:228
  - `KangurAnswerChoiceCard` -> `KangurOptionCardButton`: `interactive` -> `className` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:49

### 2. KangurCmsBuilderLeftPanel -> KangurThemeSettingsEditor

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: onThemeSectionChange -> onSectionChange -> onSectionChange
- Component path:
  - `KangurCmsBuilderLeftPanel` (src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx)
  - `KangurThemeSettingsPanel` (src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx)
  - `KangurThemeSettingsEditor` (src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx)
- Transition lines:
  - `KangurCmsBuilderLeftPanel` -> `KangurThemeSettingsPanel`: `onThemeSectionChange` -> `onSectionChange` at src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:27
  - `KangurThemeSettingsPanel` -> `KangurThemeSettingsEditor`: `onSectionChange` -> `onSectionChange` at src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx:738

### 3. KangurCmsBuilderLeftPanel -> KangurThemeSettingsEditor

- Score: 93
- Depth: 3
- Root fanout: 2
- Prop path: onThemeChange -> onThemeChange -> onThemeChange
- Component path:
  - `KangurCmsBuilderLeftPanel` (src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx)
  - `KangurThemeSettingsPanel` (src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx)
  - `KangurThemeSettingsEditor` (src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx)
- Transition lines:
  - `KangurCmsBuilderLeftPanel` -> `KangurThemeSettingsPanel`: `onThemeChange` -> `onThemeChange` at src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:27
  - `KangurThemeSettingsPanel` -> `KangurThemeSettingsEditor`: `onThemeChange` -> `onThemeChange` at src/features/kangur/admin/components/KangurThemeSettingsPanel.tsx:738

### 4. SlotZone -> Ball

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: selectedBallId -> isSelected -> isSelected
- Component path:
  - `SlotZone` (src/features/kangur/ui/components/AddingBallGame.tsx)
  - `DraggableBall` (src/features/kangur/ui/components/AddingBallGame.tsx)
  - `Ball` (src/features/kangur/ui/components/AddingBallGame.tsx)
- Transition lines:
  - `SlotZone` -> `DraggableBall`: `selectedBallId` -> `isSelected` at src/features/kangur/ui/components/AddingBallGame.tsx:557
  - `DraggableBall` -> `Ball`: `isSelected` -> `isSelected` at src/features/kangur/ui/components/AddingBallGame.tsx:1009

### 5. GeometryBasicsWorkshopGame -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onClick
- Component path:
  - `GeometryBasicsWorkshopGame` (src/features/kangur/ui/components/GeometryBasicsWorkshopGame.tsx)
  - `KangurPracticeGameSummaryActions` (src/features/kangur/ui/components/KangurPracticeGameChrome.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `GeometryBasicsWorkshopGame` -> `KangurPracticeGameSummaryActions`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/GeometryBasicsWorkshopGame.tsx:441
  - `KangurPracticeGameSummaryActions` -> `KangurButton`: `onFinish` -> `onClick` at src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:200

### 6. GeometryPerimeterDrawingGame -> KangurButton

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: onFinish -> onFinish -> onClick
- Component path:
  - `GeometryPerimeterDrawingGame` (src/features/kangur/ui/components/GeometryPerimeterDrawingGame.tsx)
  - `KangurPracticeGameSummaryActions` (src/features/kangur/ui/components/KangurPracticeGameChrome.tsx)
  - `KangurButton` (src/features/kangur/ui/design/primitives/KangurButton.tsx)
- Transition lines:
  - `GeometryPerimeterDrawingGame` -> `KangurPracticeGameSummaryActions`: `onFinish` -> `onFinish` at src/features/kangur/ui/components/GeometryPerimeterDrawingGame.tsx:619
  - `KangurPracticeGameSummaryActions` -> `KangurButton`: `onFinish` -> `onClick` at src/features/kangur/ui/components/KangurPracticeGameChrome.tsx:200

### 7. KangurLessonLibraryCardAside -> KangurStatusChip

- Score: 83
- Depth: 3
- Root fanout: 1
- Prop path: lessonAssignment -> priority -> accent
- Component path:
  - `KangurLessonLibraryCardAside` (src/features/kangur/ui/components/KangurLessonLibraryCard.tsx)
  - `KangurAssignmentPriorityChip` (src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx)
  - `KangurStatusChip` (src/features/kangur/ui/design/primitives/KangurStatusChip.tsx)
- Transition lines:
  - `KangurLessonLibraryCardAside` -> `KangurAssignmentPriorityChip`: `lessonAssignment` -> `priority` at src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:38
  - `KangurAssignmentPriorityChip` -> `KangurStatusChip`: `priority` -> `accent` at src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx:23

## Top Transition Details (Depth = 2)

### 1. KangurTestQuestionRenderer -> KangurPanelIntro

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> description
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156

### 2. KangurTestQuestionRenderer -> KangurPanelIntro

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> title
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156

### 3. KangurTestQuestionRenderer -> KangurAnswerChoiceCard

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> interactive
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:228

### 4. KangurTestQuestionRenderer -> KangurTestChoiceCard

- Score: 84
- Root fanout: 5
- Prop mapping: showAnswer -> showAnswer
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:219

### 5. KangurTestQuestionRenderer -> KangurTestChoiceCardFeedback

- Score: 84
- Root fanout: 5
- Prop mapping: showAnswer -> showAnswer
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:243

### 6. ImageStudioWorkspaceSlotInfo -> Tooltip

- Score: 78
- Root fanout: 3
- Prop mapping: selectedSlot -> content
- Location: src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:117

### 7. ImageStudioWorkspaceSlotInfo -> CopyButton

- Score: 78
- Root fanout: 3
- Prop mapping: selectedSlot -> value
- Location: src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:118

### 8. ImageStudioWorkspaceSlotInfo -> CopyButton

- Score: 78
- Root fanout: 3
- Prop mapping: selectedSlot -> disabled
- Location: src/features/ai/image-studio/components/ImageStudioWorkspaceHeader.tsx:118

### 9. AllegroSubpageScaffold -> PageLayout

- Score: 78
- Root fanout: 3
- Prop mapping: title -> eyebrow
- Location: src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22

### 10. AllegroSubpageScaffold -> AdminIntegrationsBreadcrumbs

- Score: 78
- Root fanout: 3
- Prop mapping: title -> current
- Location: src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:26

### 11. AllegroSubpageScaffold -> PageLayout

- Score: 70
- Root fanout: 3
- Prop mapping: title -> title
- Location: src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22

### 12. AllegroSubpageScaffold -> EmptyState

- Score: 68
- Root fanout: 2
- Prop mapping: emptyState -> title
- Location: src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:35

### 13. AllegroSubpageScaffold -> EmptyState

- Score: 68
- Root fanout: 2
- Prop mapping: emptyState -> description
- Location: src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:35

### 14. KangurCmsBuilderLeftPanel -> CmsBuilderLeftPanel

- Score: 68
- Root fanout: 2
- Prop mapping: onThemeSectionChange -> themePanel
- Location: src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23

### 15. KangurCmsBuilderLeftPanel -> CmsBuilderLeftPanel

- Score: 68
- Root fanout: 2
- Prop mapping: onThemeChange -> themePanel
- Location: src/features/kangur/cms-builder/KangurCmsBuilderLeftPanel.tsx:23

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
