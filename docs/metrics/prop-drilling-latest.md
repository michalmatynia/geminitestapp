---
owner: 'Platform Team'
last_reviewed: '2026-03-27'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-27T02:20:40.107Z

## Snapshot

- Scanned source files: 5876
- JSX files scanned: 2137
- Components detected: 3492
- Components forwarding parent props (hotspot threshold): 0
- Components forwarding parent props (any): 62
- Resolved forwarded transitions: 72
- Candidate chains (depth >= 2): 72
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 0
- Hotspot forwarding components backlog size: 0

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 48 |
| `shared-ui` | 6 |
| `feature:products` | 2 |
| `feature:cms` | 2 |
| `feature:integrations` | 1 |
| `feature:notesapp` | 1 |
| `feature:admin` | 1 |
| `feature:observability` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `ProductListingItem` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx` | 1 | 2 | no | no |
| 2 | `AdminKangurLessonsManagerPage` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1 | 2 | no | no |
| 3 | `KangurCmsBuilderInner` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx` | 1 | 2 | no | no |
| 4 | `AgenticDocsHierarchyGame` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 1 | 2 | no | no |
| 5 | `AlphabetLiteracyStageGame` | `src/features/kangur/ui/components/AlphabetLiteracyStageGame.tsx` | 1 | 2 | no | no |
| 6 | `ColorHarmonyStageGame` | `src/features/kangur/ui/components/ColorHarmonyStageGame.tsx` | 1 | 2 | no | no |
| 7 | `LogicalReasoningIfThenGame` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx` | 1 | 2 | no | no |
| 8 | `ShapeRecognitionStageGame` | `src/features/kangur/ui/components/ShapeRecognitionStageGame.tsx` | 1 | 2 | no | no |
| 9 | `NoteCardBase` | `src/features/notesapp/components/NoteCard.tsx` | 1 | 2 | no | no |
| 10 | `EditableCell` | `src/features/products/components/EditableCell.tsx` | 1 | 2 | no | no |
| 11 | `AdminLayout` | `src/features/admin/layout/AdminLayout.tsx` | 1 | 1 | no | no |
| 12 | `CmsDomainSelector` | `src/features/cms/components/CmsDomainSelector.tsx` | 1 | 1 | no | no |
| 13 | `AttachSlugModal` | `src/features/cms/components/slugs/AttachSlugModal.tsx` | 1 | 1 | no | no |
| 14 | `KangurSocialPipelineQueuePanel` | `src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx` | 1 | 1 | no | no |
| 15 | `SocialPostEditor` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx` | 1 | 1 | no | no |
| 16 | `FrontendPublicOwnerKangurShell` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` | 1 | 1 | no | no |
| 17 | `KangurFeaturePage` | `src/features/kangur/ui/KangurFeaturePage.tsx` | 1 | 1 | no | no |
| 18 | `KangurFeatureRouteShell` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx` | 1 | 1 | no | no |
| 19 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 20 | `AgenticLessonQuickCheck` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx` | 1 | 1 | no | no |
| 21 | `ArtShapesRotationGapGame` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx` | 1 | 1 | no | no |
| 22 | `EnglishAdjectivesSceneGame` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx` | 1 | 1 | no | no |
| 23 | `EnglishAdverbsFrequencyRoutineGame` | `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx` | 1 | 1 | no | no |
| 24 | `EnglishArticlesDragDropGame` | `src/features/kangur/ui/components/EnglishArticlesDragDropGame.tsx` | 1 | 1 | no | no |
| 25 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 1 | 1 | no | no |
| 26 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 1 | 1 | no | no |
| 27 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 1 | 1 | no | no |
| 28 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 1 | 1 | no | no |
| 29 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 1 | 1 | no | no |
| 30 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 1 | 1 | no | no |
| 31 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 1 | 1 | no | no |
| 32 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 1 | 1 | no | no |
| 33 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 34 | `KangurLanguageSwitcher` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx` | 1 | 1 | no | no |
| 35 | `LessonsCatalogCardSkeleton` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 36 | `KangurPrimaryNavigation` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 1 | 1 | no | no |
| 37 | `KangurRouteLoadingFallback` | `src/features/kangur/ui/components/KangurRouteLoadingFallback.tsx` | 1 | 1 | no | no |
| 38 | `LessonActivityStage` | `src/features/kangur/ui/components/LessonActivityStage.tsx` | 1 | 1 | no | no |
| 39 | `InsightList` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx` | 1 | 1 | no | no |
| 40 | `SubtractingSvgAnimation` | `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1 | 1 | no | no |
| 41 | `SubtractingNumberLineAnimation` | `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1 | 1 | no | no |
| 42 | `SubtractingTenFrameAnimation` | `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1 | 1 | no | no |
| 43 | `SubtractingDifferenceBarAnimation` | `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1 | 1 | no | no |
| 44 | `SubtractingAbacusAnimation` | `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1 | 1 | no | no |
| 45 | `CompleteEquationMobile` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 1 | 1 | no | no |
| 46 | `CompleteEquationDesktop` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx` | 1 | 1 | no | no |
| 47 | `GroupSum` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.GroupSum.tsx` | 1 | 1 | no | no |
| 48 | `DragOverlay` | `src/features/kangur/ui/components/adding-ball-game/PointerDragProvider.tsx` | 1 | 1 | no | no |
| 49 | `KangurMusicPianoRoll` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx` | 1 | 1 | no | no |
| 50 | `MusicMelodyRepeatGame` | `src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx` | 1 | 1 | no | no |
| 51 | `MusicPianoRollFreePlayGame` | `src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx` | 1 | 1 | no | no |
| 52 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 53 | `ParentDashboardResolvedContent` | `src/features/kangur/ui/pages/ParentDashboard.tsx` | 1 | 1 | no | no |
| 54 | `ParentDashboardAuthLoadingState` | `src/features/kangur/ui/pages/ParentDashboard.tsx` | 1 | 1 | no | no |
| 55 | `EventStreamPanel` | `src/features/observability/pages/system-logs/SystemLogs.Table.tsx` | 1 | 1 | no | no |
| 56 | `ValidatorPatternSemanticHistoryPanel` | `src/features/products/components/settings/validator-settings/ValidatorPatternSemanticHistoryPanel.tsx` | 1 | 1 | no | no |
| 57 | `JsonViewer` | `src/shared/ui/JsonViewer.tsx` | 1 | 1 | no | no |
| 58 | `PageLayoutTabs` | `src/shared/ui/PageLayout.tsx` | 1 | 1 | no | no |
| 59 | `AlertDialogContent` | `src/shared/ui/alert-dialog.tsx` | 1 | 1 | no | no |
| 60 | `DialogContent` | `src/shared/ui/dialog.tsx` | 1 | 1 | no | no |
| 61 | `DocumentationSection` | `src/shared/ui/documentation-section.tsx` | 1 | 1 | no | no |
| 62 | `ConfirmModalDescription` | `src/shared/ui/templates/modals/ConfirmModal.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> step` | `src/features/products/components/EditableCell.tsx:95` |
| 2 | 68 | `EditableCell` | `Input` | 2 | 2 | `field -> aria-label` | `src/features/products/components/EditableCell.tsx:95` |
| 3 | 62 | `KangurCmsBuilderInner` | `KangurCmsBuilderRightPanel` | 2 | 1 | `themePreviewMode -> themePreviewTheme` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:233` |
| 4 | 62 | `AlphabetLiteracyStageGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/AlphabetLiteracyStageGame.tsx:74` |
| 5 | 62 | `AlphabetLiteracyStageGame` | `KangurButton` | 2 | 1 | `onFinish -> variant` | `src/features/kangur/ui/components/AlphabetLiteracyStageGame.tsx:86` |
| 6 | 62 | `ColorHarmonyStageGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ColorHarmonyStageGame.tsx:254` |
| 7 | 62 | `ColorHarmonyStageGame` | `KangurButton` | 2 | 1 | `onFinish -> variant` | `src/features/kangur/ui/components/ColorHarmonyStageGame.tsx:266` |
| 8 | 62 | `LogicalReasoningIfThenGame` | `KangurInfoCard` | 2 | 1 | `copy -> aria-label` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx:505` |
| 9 | 62 | `ShapeRecognitionStageGame` | `KangurButton` | 2 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ShapeRecognitionStageGame.tsx:107` |
| 10 | 62 | `ShapeRecognitionStageGame` | `KangurButton` | 2 | 1 | `onFinish -> variant` | `src/features/kangur/ui/components/ShapeRecognitionStageGame.tsx:119` |
| 11 | 58 | `AttachSlugModal` | `FormModal` | 1 | 2 | `isOpen -> open` | `src/features/cms/components/slugs/AttachSlugModal.tsx:80` |
| 12 | 58 | `KangurSocialPipelineQueuePanel` | `ListPanel` | 1 | 2 | `variant -> header` | `src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx:252` |
| 13 | 58 | `EventStreamPanel` | `StandardDataTablePanel` | 1 | 2 | `showFooterPagination -> footer` | `src/features/observability/pages/system-logs/SystemLogs.Table.tsx:676` |
| 14 | 58 | `ValidatorPatternSemanticHistoryPanel` | `Button` | 1 | 2 | `onClose -> onClick` | `src/features/products/components/settings/validator-settings/ValidatorPatternSemanticHistoryPanel.tsx:93` |
| 15 | 54 | `ProductListingItem` | `ProductListingDetails` | 2 | 1 | `listing -> listing` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:18` |
| 16 | 54 | `ProductListingItem` | `ProductListingActions` | 2 | 1 | `listing -> listing` | `src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:19` |
| 17 | 54 | `AdminKangurLessonsManagerPage` | `AdminKangurLessonSectionsPanel` | 2 | 1 | `standalone -> standalone` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx:731` |
| 18 | 54 | `AdminKangurLessonsManagerPage` | `AdminKangurLessonsManagerTreePanel` | 2 | 1 | `standalone -> standalone` | `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx:733` |
| 19 | 54 | `KangurCmsBuilderInner` | `KangurCmsBuilderRightPanel` | 2 | 1 | `themePreviewMode -> themePreviewMode` | `src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:233` |
| 20 | 54 | `AgenticDocsHierarchyGame` | `KangurLessonCallout` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:130` |
| 21 | 54 | `AgenticDocsHierarchyGame` | `KangurStatusChip` | 2 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx:133` |
| 22 | 54 | `LogicalReasoningIfThenGame` | `DraggableCase` | 2 | 1 | `copy -> copy` | `src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx:480` |
| 23 | 54 | `NoteCardBase` | `NoteCardHeader` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:161` |
| 24 | 54 | `NoteCardBase` | `NoteCardFooter` | 2 | 1 | `note -> note` | `src/features/notesapp/components/NoteCard.tsx:169` |
| 25 | 52 | `ArtShapesRotationGapGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/ArtShapesRotationGapGame.tsx:196` |
| 26 | 52 | `LessonsCatalogCardSkeleton` | `KangurIconSummaryCardContent` | 1 | 1 | `chips -> aside` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx:744` |
| 27 | 52 | `KangurPrimaryNavigation` | `KangurVisualCueContent` | 1 | 1 | `className -> icon` | `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx:1035` |
| 28 | 52 | `KangurRouteLoadingFallback` | `KangurPageTransitionSkeleton` | 1 | 1 | `includeTopNavigationSkeleton -> renderInlineTopNavigationSkeleton` | `src/features/kangur/ui/components/KangurRouteLoadingFallback.tsx:106` |
| 29 | 52 | `LessonActivityStage` | `KangurGlassPanel` | 1 | 1 | `title -> data-kangur-print-panel-title` | `src/features/kangur/ui/components/LessonActivityStage.tsx:306` |
| 30 | 52 | `InsightList` | `KangurEmptyState` | 1 | 1 | `emptyState -> description` | `src/features/kangur/ui/components/LessonMasteryInsights.tsx:182` |
| 31 | 52 | `CompleteEquationMobile` | `KangurButton` | 1 | 1 | `onResult -> onClick` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx:130` |
| 32 | 52 | `CompleteEquationDesktop` | `KangurButton` | 1 | 1 | `onResult -> onClick` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.CompleteEquation.tsx:369` |
| 33 | 52 | `GroupSum` | `KangurButton` | 1 | 1 | `onResult -> onClick` | `src/features/kangur/ui/components/adding-ball-game/AddingBallGame.GroupSum.tsx:213` |
| 34 | 52 | `DragOverlay` | `Ball` | 1 | 1 | `state -> ball` | `src/features/kangur/ui/components/adding-ball-game/PointerDragProvider.tsx:220` |
| 35 | 52 | `KangurMusicPianoRoll` | `KangurButton` | 1 | 1 | `stepTestIdPrefix -> data-testid` | `src/features/kangur/ui/components/music/KangurMusicPianoRoll.tsx:1385` |
| 36 | 52 | `MusicPianoRollFreePlayGame` | `KangurButton` | 1 | 1 | `onFinish -> onClick` | `src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:262` |
| 37 | 52 | `LoginForm` | `KangurButton` | 1 | 1 | `isLoading -> disabled` | `src/features/kangur/ui/login-page/login-forms.tsx:145` |
| 38 | 52 | `PageLayoutTabs` | `TabsList` | 1 | 1 | `tabs -> style` | `src/shared/ui/PageLayout.tsx:75` |
| 39 | 52 | `AlertDialogContent` | `RadixOverlayContentShell` | 1 | 1 | `className -> contentProps` | `src/shared/ui/alert-dialog.tsx:31` |
| 40 | 52 | `DialogContent` | `RadixOverlayContentShell` | 1 | 1 | `className -> contentProps` | `src/shared/ui/dialog.tsx:39` |
| 41 | 52 | `ConfirmModalDescription` | `AlertDialogDescription` | 1 | 1 | `hasSubtitle -> className` | `src/shared/ui/templates/modals/ConfirmModal.tsx:52` |
| 42 | 50 | `AdminLayout` | `SettingsStoreProvider` | 1 | 2 | `canReadAdminSettings -> canReadAdminSettings` | `src/features/admin/layout/AdminLayout.tsx:309` |
| 43 | 50 | `CmsDomainSelector` | `SelectSimple` | 1 | 2 | `triggerClassName -> triggerClassName` | `src/features/cms/components/CmsDomainSelector.tsx:76` |
| 44 | 44 | `SocialPostEditor` | `SocialPostVisuals` | 1 | 1 | `showImagesPanel -> showImagesPanel` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:68` |
| 45 | 44 | `FrontendPublicOwnerKangurShell` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `initialAppearance -> initialAppearance` | `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx:39` |
| 46 | 44 | `KangurFeaturePage` | `KangurFeaturePageShell` | 1 | 1 | `forceBodyScrollLock -> forceBodyScrollLock` | `src/features/kangur/ui/KangurFeaturePage.tsx:215` |
| 47 | 44 | `KangurFeatureRouteShell` | `KangurFeaturePageShell` | 1 | 1 | `forceBodyScrollLock -> forceBodyScrollLock` | `src/features/kangur/ui/KangurFeatureRouteShell.tsx:104` |
| 48 | 44 | `KangurPublicApp` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `initialAppearance -> initialAppearance` | `src/features/kangur/ui/KangurPublicApp.tsx:43` |
| 49 | 44 | `AgenticLessonQuickCheck` | `KangurLessonCallout` | 1 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx:59` |
| 50 | 44 | `EnglishAdjectivesSceneGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishAdjectivesSceneGame.tsx:786` |
| 51 | 44 | `EnglishAdverbsFrequencyRoutineGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame.tsx:674` |
| 52 | 44 | `EnglishArticlesDragDropGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishArticlesDragDropGame.tsx:432` |
| 53 | 44 | `EnglishPartsOfSpeechGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx:699` |
| 54 | 44 | `EnglishPrepositionsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx:324` |
| 55 | 44 | `EnglishPrepositionsOrderGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx:391` |
| 56 | 44 | `EnglishPrepositionsSortGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx:513` |
| 57 | 44 | `EnglishPronounsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx:232` |
| 58 | 44 | `EnglishPronounsWarmupGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx:224` |
| 59 | 44 | `EnglishSentenceStructureGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx:459` |
| 60 | 44 | `EnglishSubjectVerbAgreementGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx:247` |
| 61 | 44 | `GeometryDrawingGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx:674` |
| 62 | 44 | `KangurLanguageSwitcher` | `KangurButton` | 1 | 1 | `className -> className` | `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx:352` |
| 63 | 44 | `SubtractingSvgAnimation` | `SubtractingAnimationSurface` | 1 | 1 | `ariaLabel -> ariaLabel` | `src/features/kangur/ui/components/SubtractingLesson.tsx:344` |
| 64 | 44 | `SubtractingNumberLineAnimation` | `SubtractingAnimationSurface` | 1 | 1 | `ariaLabel -> ariaLabel` | `src/features/kangur/ui/components/SubtractingLesson.tsx:411` |
| 65 | 44 | `SubtractingTenFrameAnimation` | `SubtractingAnimationSurface` | 1 | 1 | `ariaLabel -> ariaLabel` | `src/features/kangur/ui/components/SubtractingLesson.tsx:478` |
| 66 | 44 | `SubtractingDifferenceBarAnimation` | `SubtractingAnimationSurface` | 1 | 1 | `ariaLabel -> ariaLabel` | `src/features/kangur/ui/components/SubtractingLesson.tsx:592` |
| 67 | 44 | `SubtractingAbacusAnimation` | `SubtractingAnimationSurface` | 1 | 1 | `ariaLabel -> ariaLabel` | `src/features/kangur/ui/components/SubtractingLesson.tsx:680` |
| 68 | 44 | `MusicMelodyRepeatGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx:534` |
| 69 | 44 | `ParentDashboardResolvedContent` | `KangurStandardPageLayout` | 1 | 1 | `docsTooltipsEnabled -> docsTooltipsEnabled` | `src/features/kangur/ui/pages/ParentDashboard.tsx:361` |
| 70 | 44 | `ParentDashboardAuthLoadingState` | `KangurStandardPageLayout` | 1 | 1 | `docsTooltipsEnabled -> docsTooltipsEnabled` | `src/features/kangur/ui/pages/ParentDashboard.tsx:476` |
| 71 | 44 | `JsonViewer` | `InsetPanel` | 1 | 1 | `className -> className` | `src/shared/ui/JsonViewer.tsx:57` |
| 72 | 44 | `DocumentationSection` | `InsetPanel` | 1 | 1 | `className -> className` | `src/shared/ui/documentation-section.tsx:17` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. EditableCell -> Input

- Score: 68
- Root fanout: 2
- Prop mapping: field -> step
- Location: src/features/products/components/EditableCell.tsx:95

### 2. EditableCell -> Input

- Score: 68
- Root fanout: 2
- Prop mapping: field -> aria-label
- Location: src/features/products/components/EditableCell.tsx:95

### 3. KangurCmsBuilderInner -> KangurCmsBuilderRightPanel

- Score: 62
- Root fanout: 2
- Prop mapping: themePreviewMode -> themePreviewTheme
- Location: src/features/kangur/cms-builder/KangurCmsBuilderWorkspace.tsx:233

### 4. AlphabetLiteracyStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/AlphabetLiteracyStageGame.tsx:74

### 5. AlphabetLiteracyStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> variant
- Location: src/features/kangur/ui/components/AlphabetLiteracyStageGame.tsx:86

### 6. ColorHarmonyStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/ColorHarmonyStageGame.tsx:254

### 7. ColorHarmonyStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> variant
- Location: src/features/kangur/ui/components/ColorHarmonyStageGame.tsx:266

### 8. LogicalReasoningIfThenGame -> KangurInfoCard

- Score: 62
- Root fanout: 2
- Prop mapping: copy -> aria-label
- Location: src/features/kangur/ui/components/LogicalReasoningIfThenGame.tsx:505

### 9. ShapeRecognitionStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> onClick
- Location: src/features/kangur/ui/components/ShapeRecognitionStageGame.tsx:107

### 10. ShapeRecognitionStageGame -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: onFinish -> variant
- Location: src/features/kangur/ui/components/ShapeRecognitionStageGame.tsx:119

### 11. AttachSlugModal -> FormModal

- Score: 58
- Root fanout: 1
- Prop mapping: isOpen -> open
- Location: src/features/cms/components/slugs/AttachSlugModal.tsx:80

### 12. KangurSocialPipelineQueuePanel -> ListPanel

- Score: 58
- Root fanout: 1
- Prop mapping: variant -> header
- Location: src/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel.tsx:252

### 13. EventStreamPanel -> StandardDataTablePanel

- Score: 58
- Root fanout: 1
- Prop mapping: showFooterPagination -> footer
- Location: src/features/observability/pages/system-logs/SystemLogs.Table.tsx:676

### 14. ValidatorPatternSemanticHistoryPanel -> Button

- Score: 58
- Root fanout: 1
- Prop mapping: onClose -> onClick
- Location: src/features/products/components/settings/validator-settings/ValidatorPatternSemanticHistoryPanel.tsx:93

### 15. ProductListingItem -> ProductListingDetails

- Score: 54
- Root fanout: 2
- Prop mapping: listing -> listing
- Location: src/features/integrations/components/listings/product-listings-modal/ProductListingItem.tsx:18

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
