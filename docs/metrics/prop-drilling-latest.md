---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-18T09:01:45.524Z

## Snapshot

- Scanned source files: 5395
- JSX files scanned: 1980
- Components detected: 3314
- Components forwarding parent props (hotspot threshold): 47
- Components forwarding parent props (any): 57
- Resolved forwarded transitions: 282
- Candidate chains (depth >= 2): 282
- Candidate chains (depth >= 3): 45
- High-priority chains (depth >= 4): 1
- Unknown spread forwarding edges: 11
- Hotspot forwarding components backlog size: 47

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 50 |
| `app` | 3 |
| `feature:cms` | 2 |
| `shared-ui` | 2 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `SocialPostEditor` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx` | 56 | 62 | no | yes |
| 2 | `SocialPostVisuals` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx` | 32 | 39 | no | yes |
| 3 | `KangurNavAction` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 12 | 13 | no | yes |
| 4 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 5 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 9 | 13 | no | yes |
| 6 | `KangurGameQuizStage` | `src/features/kangur/ui/components/KangurGameQuizStage.tsx` | 8 | 8 | no | yes |
| 7 | `KangurGameSetupStage` | `src/features/kangur/ui/components/KangurGameSetupStage.tsx` | 8 | 8 | no | yes |
| 8 | `KangurUnifiedLessonBase` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 6 | 7 | no | yes |
| 9 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 10 | `KangurDialogHeader` | `src/features/kangur/ui/components/KangurDialogHeader.tsx` | 4 | 4 | no | yes |
| 11 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | yes | yes |
| 12 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 3 | 5 | no | yes |
| 13 | `FrontendLayoutClient` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx` | 3 | 3 | no | yes |
| 14 | `SocialPostList` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx` | 3 | 3 | no | yes |
| 15 | `KangurUnifiedLessonPanel` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 3 | 3 | yes | yes |
| 16 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 3 | 3 | no | yes |
| 17 | `AgenticDrawGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 7 | no | yes |
| 18 | `AgenticSortGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 6 | no | yes |
| 19 | `KangurTrainingSetupPanel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx` | 2 | 6 | no | yes |
| 20 | `AgenticSequenceGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 5 | no | yes |
| 21 | `SocialPostPipeline` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx` | 2 | 4 | no | yes |
| 22 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 23 | `CalendarGameBody` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 2 | 3 | no | yes |
| 24 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 25 | `FrontendPublicOwnerShell` | `src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx` | 2 | 2 | no | yes |
| 26 | `Error` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 27 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 2 | 2 | no | yes |
| 28 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 2 | 2 | no | yes |
| 29 | `AgenticLessonCodeBlock` | `src/features/kangur/ui/components/AgenticLessonCodeBlock.tsx` | 2 | 2 | no | yes |
| 30 | `ClockTrainingSlide` | `src/features/kangur/ui/components/ClockLesson.tsx` | 2 | 2 | no | yes |
| 31 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 2 | 2 | no | yes |
| 32 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 2 | 2 | no | yes |
| 33 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 2 | 2 | no | yes |
| 34 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 2 | 2 | no | yes |
| 35 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 2 | 2 | no | yes |
| 36 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 2 | 2 | no | yes |
| 37 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 2 | 2 | no | yes |
| 38 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 2 | 2 | no | yes |
| 39 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 2 | 2 | no | yes |
| 40 | `KangurUnifiedLessonSubsection` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 2 | 2 | yes | yes |
| 41 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 42 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 43 | `AgenticDocsHierarchyGame` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 1 | 2 | no | no |
| 44 | `FrontendPublicOwnerShellClient` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx` | 1 | 1 | no | no |
| 45 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 46 | `AgenticApprovalGateGame` | `src/features/kangur/ui/components/AgenticApprovalGateGame.tsx` | 1 | 1 | no | no |
| 47 | `AgenticLessonQuickCheck` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx` | 1 | 1 | no | no |
| 48 | `AgenticReasoningRouterGame` | `src/features/kangur/ui/components/AgenticReasoningRouterGame.tsx` | 1 | 1 | no | no |
| 49 | `AgenticSurfaceMatchGame` | `src/features/kangur/ui/components/AgenticSurfaceMatchGame.tsx` | 1 | 1 | no | no |
| 50 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 51 | `GeometryShapesGameStage` | `src/features/kangur/ui/components/GeometryShapesLesson.tsx` | 1 | 1 | no | no |
| 52 | `KangurGrajmyWordmark` | `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx` | 1 | 1 | yes | yes |
| 53 | `KangurKangurWordmark` | `src/features/kangur/ui/components/KangurKangurWordmark.tsx` | 1 | 1 | yes | yes |
| 54 | `KangurLessonsWordmark` | `src/features/kangur/ui/components/KangurLessonsWordmark.tsx` | 1 | 1 | yes | yes |
| 55 | `KangurTreningWordmark` | `src/features/kangur/ui/components/KangurTreningWordmark.tsx` | 1 | 1 | yes | yes |
| 56 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 57 | `KangurUnifiedLesson` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> onStart` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 2 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestedSelection` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 3 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionDescription` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 4 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionLabel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 5 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionTitle` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 6 | 84 | `AgenticSortGame` | `KangurLessonVisual` | 5 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628` |
| 7 | 84 | `AgenticSortGame` | `KangurLessonCallout` | 5 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:635` |
| 8 | 84 | `AgenticSortGame` | `KangurLessonChip` | 5 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:637` |
| 9 | 84 | `AgenticSortGame` | `DraggableToken` | 5 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:656` |
| 10 | 84 | `AgenticSortGame` | `KangurLessonInset` | 5 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:697` |
| 11 | 78 | `SocialPostVisuals` | `Input` | 3 | 2 | `addonForm -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132` |
| 12 | 78 | `SocialPostVisuals` | `Textarea` | 3 | 2 | `addonForm -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163` |
| 13 | 78 | `SocialPostVisuals` | `Button` | 3 | 2 | `addonForm -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 14 | 74 | `AgenticSequenceGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:543` |
| 15 | 74 | `AgenticSequenceGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:550` |
| 16 | 74 | `AgenticSequenceGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:552` |
| 17 | 74 | `AgenticSequenceGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:583` |
| 18 | 74 | `AgenticDrawGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:810` |
| 19 | 74 | `AgenticDrawGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:826` |
| 20 | 74 | `AgenticDrawGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:828` |
| 21 | 74 | `AgenticDrawGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:835` |
| 22 | 72 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 23 | 72 | `HomeContentClient` | `LazyHomeFallbackContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 24 | 72 | `AgenticDrawGame` | `KangurLessonVisual` | 3 | 1 | `config -> caption` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:810` |
| 25 | 72 | `AgenticDrawGame` | `DrawGameSvg` | 3 | 1 | `config -> checkpoints` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:815` |
| 26 | 72 | `AgenticDrawGame` | `DrawGameSvg` | 3 | 1 | `config -> guide` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:815` |
| 27 | 72 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:71` |
| 28 | 72 | `KangurChoiceDialog` | `KangurButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:98` |
| 29 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 30 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 31 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 32 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 33 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> options` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 34 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> placeholder` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 35 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 36 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 37 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 38 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `scheduledAt -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 39 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `handleRunFullPipeline -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 40 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `activePostId -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 41 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `handleRunFullPipeline -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 42 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `activePostId -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 43 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132` |
| 44 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163` |
| 45 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `batchCaptureBaseUrl -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193` |
| 46 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `batchCaptureBaseUrl -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 47 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `setShowMediaLibrary -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:456` |
| 48 | 68 | `SocialPostVisuals` | `MediaLibraryPanel` | 2 | 2 | `setShowMediaLibrary -> onOpenChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:466` |
| 49 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 50 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 51 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 52 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `activePost -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:540` |
| 53 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> variant` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 54 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> title` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 55 | 64 | `HomeContentClient` | `LazyCmsPageShell` | 3 | 1 | `theme -> theme` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 56 | 64 | `KangurChoiceDialog` | `KangurDialog` | 3 | 1 | `onOpenChange -> onOpenChange` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:50` |
| 57 | 62 | `CalendarGameBody` | `CalendarInteractiveGame` | 2 | 1 | `section -> key` | `src/features/kangur/ui/components/CalendarLesson.tsx:455` |
| 58 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 59 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 60 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 61 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 62 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 63 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 64 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 65 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 66 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionAcknowledgeMs` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 67 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionSourceId` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 68 | 58 | `FrontendLayoutClient` | `CmsStorefrontAppearanceProvider` | 1 | 2 | `storefrontAppearanceMode -> initialMode` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx:22` |
| 69 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `linkedinConnectionId -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 70 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `handleLinkedInConnectionChange -> onValueChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 71 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handleSave -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 72 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `saveMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 73 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `patchMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 74 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handlePublish -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 75 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `publishMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 76 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onPublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:141` |
| 77 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onUnpublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:188` |
| 78 | 58 | `SocialPostList` | `Button` | 1 | 2 | `onDeletePost -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:201` |
| 79 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleCreateAddon -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 80 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `createAddonPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 152 | 4 | `FrontendLayoutClient` | `KangurStorefrontAppearanceProvider` | 1 | 2 | `kangurInitialMode -> kangurInitialMode -> kangurInitialMode -> initialMode` |
| 2 | 123 | 3 | `AgenticSortGame` | `KangurLessonCallout` | 5 | 1 | `accent -> accent -> accent` |
| 3 | 113 | 3 | `AgenticSequenceGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent -> accent` |
| 4 | 113 | 3 | `AgenticDrawGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent -> accent` |
| 5 | 99 | 3 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> activePost -> disabled` |
| 6 | 99 | 3 | `SocialPostEditor` | `Textarea` | 2 | 2 | `activePost -> activePost -> value` |
| 7 | 99 | 3 | `SocialPostEditor` | `Input` | 2 | 2 | `scheduledAt -> scheduledAt -> value` |
| 8 | 89 | 3 | `FrontendLayoutClient` | `FrontendPublicOwnerShellClient` | 1 | 2 | `publicOwner -> publicOwner -> publicOwner` |
| 9 | 89 | 3 | `FrontendLayoutClient` | `FrontendPublicOwnerShellClient` | 1 | 2 | `kangurInitialMode -> kangurInitialMode -> kangurInitialMode` |
| 10 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `addonForm -> addonForm -> value` |
| 11 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `addonForm -> addonForm -> value` |
| 12 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `addonForm -> addonForm -> disabled` |
| 13 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setAddonForm -> setAddonForm -> onChange` |
| 14 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `setAddonForm -> setAddonForm -> onChange` |
| 15 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleCreateAddon -> handleCreateAddon -> onClick` |
| 16 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `createAddonPending -> createAddonPending -> disabled` |
| 17 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `batchCaptureBaseUrl -> batchCaptureBaseUrl -> value` |
| 18 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCaptureBaseUrl -> batchCaptureBaseUrl -> disabled` |
| 19 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setBatchCaptureBaseUrl -> setBatchCaptureBaseUrl -> onChange` |
| 20 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCapturePresetIds -> batchCapturePresetIds -> disabled` |
| 21 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `selectAllCapturePresets -> selectAllCapturePresets -> onClick` |
| 22 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `clearCapturePresets -> clearCapturePresets -> onClick` |
| 23 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleBatchCapture -> handleBatchCapture -> onClick` |
| 24 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCapturePending -> batchCapturePending -> disabled` |
| 25 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleSelectAddon -> handleSelectAddon -> onClick` |
| 26 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleRemoveAddon -> handleRemoveAddon -> onClick` |
| 27 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleRemoveImage -> handleRemoveImage -> onClick` |
| 28 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `setShowMediaLibrary -> setShowMediaLibrary -> onClick` |
| 29 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `setShowMediaLibrary -> setShowMediaLibrary -> onOpenChange` |
| 30 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `showMediaLibrary -> showMediaLibrary -> open` |
| 31 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `handleAddImages -> handleAddImages -> onSelect` |
| 32 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `docReferenceInput -> docReferenceInput -> value` |
| 33 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setDocReferenceInput -> setDocReferenceInput -> onChange` |
| 34 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `generationNotes -> generationNotes -> value` |
| 35 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `setGenerationNotes -> setGenerationNotes -> onChange` |
| 36 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleGenerate -> handleGenerate -> onClick` |
| 37 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleLoadContext -> handleLoadContext -> onClick` |
| 38 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleLoadContext -> handleLoadContext -> disabled` |
| 39 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `contextLoading -> contextLoading -> disabled` |
| 40 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `hasVisualDocUpdates -> hasVisualDocUpdates -> disabled` |
| 41 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handlePreviewDocUpdates -> handlePreviewDocUpdates -> onClick` |
| 42 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `previewDocUpdatesPending -> previewDocUpdatesPending -> disabled` |
| 43 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleApplyDocUpdates -> handleApplyDocUpdates -> onClick` |
| 44 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `applyDocUpdatesPending -> applyDocUpdatesPending -> disabled` |
| 45 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setScheduledAt -> setScheduledAt -> onChange` |

## Top Chain Details (Depth >= 3)

### 1. FrontendLayoutClient -> KangurStorefrontAppearanceProvider

- Score: 152
- Depth: 4
- Root fanout: 1
- Prop path: kangurInitialMode -> kangurInitialMode -> kangurInitialMode -> initialMode
- Component path:
  - `FrontendLayoutClient` (src/app/(frontend)/_components/FrontendLayoutClient.tsx)
  - `FrontendPublicOwnerShell` (src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx)
  - `FrontendPublicOwnerShellClient` (src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx)
  - `KangurStorefrontAppearanceProvider` (src/features/kangur/ui/KangurStorefrontAppearanceProvider.tsx)
- Transition lines:
  - `FrontendLayoutClient` -> `FrontendPublicOwnerShell`: `kangurInitialMode` -> `kangurInitialMode` at src/app/(frontend)/_components/FrontendLayoutClient.tsx:24
  - `FrontendPublicOwnerShell` -> `FrontendPublicOwnerShellClient`: `kangurInitialMode` -> `kangurInitialMode` at src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx:14
  - `FrontendPublicOwnerShellClient` -> `KangurStorefrontAppearanceProvider`: `kangurInitialMode` -> `initialMode` at src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx:31

### 2. AgenticSortGame -> KangurLessonCallout

- Score: 123
- Depth: 3
- Root fanout: 5
- Prop path: accent -> accent -> accent
- Component path:
  - `AgenticSortGame` (src/features/kangur/ui/components/AgenticCodingMiniGames.tsx)
  - `KangurLessonVisual` (src/features/kangur/ui/design/lesson-primitives.tsx)
  - `KangurLessonCallout` (src/features/kangur/ui/design/lesson-primitives.tsx)
- Transition lines:
  - `AgenticSortGame` -> `KangurLessonVisual`: `accent` -> `accent` at src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628
  - `KangurLessonVisual` -> `KangurLessonCallout`: `accent` -> `accent` at src/features/kangur/ui/design/lesson-primitives.tsx:177

### 3. AgenticSequenceGame -> KangurLessonCallout

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: accent -> accent -> accent
- Component path:
  - `AgenticSequenceGame` (src/features/kangur/ui/components/AgenticCodingMiniGames.tsx)
  - `KangurLessonVisual` (src/features/kangur/ui/design/lesson-primitives.tsx)
  - `KangurLessonCallout` (src/features/kangur/ui/design/lesson-primitives.tsx)
- Transition lines:
  - `AgenticSequenceGame` -> `KangurLessonVisual`: `accent` -> `accent` at src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:543
  - `KangurLessonVisual` -> `KangurLessonCallout`: `accent` -> `accent` at src/features/kangur/ui/design/lesson-primitives.tsx:177

### 4. AgenticDrawGame -> KangurLessonCallout

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: accent -> accent -> accent
- Component path:
  - `AgenticDrawGame` (src/features/kangur/ui/components/AgenticCodingMiniGames.tsx)
  - `KangurLessonVisual` (src/features/kangur/ui/design/lesson-primitives.tsx)
  - `KangurLessonCallout` (src/features/kangur/ui/design/lesson-primitives.tsx)
- Transition lines:
  - `AgenticDrawGame` -> `KangurLessonVisual`: `accent` -> `accent` at src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:810
  - `KangurLessonVisual` -> `KangurLessonCallout`: `accent` -> `accent` at src/features/kangur/ui/design/lesson-primitives.tsx:177

### 5. SocialPostEditor -> Button

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: activePost -> activePost -> disabled
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `activePost` -> `activePost` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Button`: `activePost` -> `disabled` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499

### 6. SocialPostEditor -> Textarea

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: activePost -> activePost -> value
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Textarea` (src/shared/ui/textarea.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `activePost` -> `activePost` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Textarea`: `activePost` -> `value` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:540

### 7. SocialPostEditor -> Input

- Score: 99
- Depth: 3
- Root fanout: 2
- Prop path: scheduledAt -> scheduledAt -> value
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `scheduledAt` -> `scheduledAt` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Input`: `scheduledAt` -> `value` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:478

### 8. FrontendLayoutClient -> FrontendPublicOwnerShellClient

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: publicOwner -> publicOwner -> publicOwner
- Component path:
  - `FrontendLayoutClient` (src/app/(frontend)/_components/FrontendLayoutClient.tsx)
  - `FrontendPublicOwnerShell` (src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx)
  - `FrontendPublicOwnerShellClient` (src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx)
- Transition lines:
  - `FrontendLayoutClient` -> `FrontendPublicOwnerShell`: `publicOwner` -> `publicOwner` at src/app/(frontend)/_components/FrontendLayoutClient.tsx:24
  - `FrontendPublicOwnerShell` -> `FrontendPublicOwnerShellClient`: `publicOwner` -> `publicOwner` at src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx:14

### 9. FrontendLayoutClient -> FrontendPublicOwnerShellClient

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: kangurInitialMode -> kangurInitialMode -> kangurInitialMode
- Component path:
  - `FrontendLayoutClient` (src/app/(frontend)/_components/FrontendLayoutClient.tsx)
  - `FrontendPublicOwnerShell` (src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx)
  - `FrontendPublicOwnerShellClient` (src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx)
- Transition lines:
  - `FrontendLayoutClient` -> `FrontendPublicOwnerShell`: `kangurInitialMode` -> `kangurInitialMode` at src/app/(frontend)/_components/FrontendLayoutClient.tsx:24
  - `FrontendPublicOwnerShell` -> `FrontendPublicOwnerShellClient`: `kangurInitialMode` -> `kangurInitialMode` at src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx:14

### 10. SocialPostEditor -> Input

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: addonForm -> addonForm -> value
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `addonForm` -> `addonForm` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Input`: `addonForm` -> `value` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132

### 11. SocialPostEditor -> Textarea

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: addonForm -> addonForm -> value
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Textarea` (src/shared/ui/textarea.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `addonForm` -> `addonForm` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Textarea`: `addonForm` -> `value` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163

### 12. SocialPostEditor -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: addonForm -> addonForm -> disabled
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `addonForm` -> `addonForm` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Button`: `addonForm` -> `disabled` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172

### 13. SocialPostEditor -> Input

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: setAddonForm -> setAddonForm -> onChange
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `setAddonForm` -> `setAddonForm` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Input`: `setAddonForm` -> `onChange` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132

### 14. SocialPostEditor -> Textarea

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: setAddonForm -> setAddonForm -> onChange
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Textarea` (src/shared/ui/textarea.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `setAddonForm` -> `setAddonForm` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Textarea`: `setAddonForm` -> `onChange` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163

### 15. SocialPostEditor -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: handleCreateAddon -> handleCreateAddon -> onClick
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `handleCreateAddon` -> `handleCreateAddon` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Button`: `handleCreateAddon` -> `onClick` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172

## Top Transition Details (Depth = 2)

### 1. KangurTrainingSetupPanel -> TrainingSetup

- Score: 92
- Root fanout: 5
- Prop mapping: suggestedTraining -> onStart
- Location: src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20

### 2. KangurTrainingSetupPanel -> TrainingSetup

- Score: 92
- Root fanout: 5
- Prop mapping: suggestedTraining -> suggestedSelection
- Location: src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20

### 3. KangurTrainingSetupPanel -> TrainingSetup

- Score: 92
- Root fanout: 5
- Prop mapping: suggestedTraining -> suggestionDescription
- Location: src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20

### 4. KangurTrainingSetupPanel -> TrainingSetup

- Score: 92
- Root fanout: 5
- Prop mapping: suggestedTraining -> suggestionLabel
- Location: src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20

### 5. KangurTrainingSetupPanel -> TrainingSetup

- Score: 92
- Root fanout: 5
- Prop mapping: suggestedTraining -> suggestionTitle
- Location: src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20

### 6. AgenticSortGame -> KangurLessonVisual

- Score: 84
- Root fanout: 5
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628

### 7. AgenticSortGame -> KangurLessonCallout

- Score: 84
- Root fanout: 5
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:635

### 8. AgenticSortGame -> KangurLessonChip

- Score: 84
- Root fanout: 5
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:637

### 9. AgenticSortGame -> DraggableToken

- Score: 84
- Root fanout: 5
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:656

### 10. AgenticSortGame -> KangurLessonInset

- Score: 84
- Root fanout: 5
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:697

### 11. SocialPostVisuals -> Input

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132

### 12. SocialPostVisuals -> Textarea

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163

### 13. SocialPostVisuals -> Button

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> disabled
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172

### 14. AgenticSequenceGame -> KangurLessonVisual

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:543

### 15. AgenticSequenceGame -> KangurLessonCallout

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:550

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
