---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-18T09:22:13.839Z

## Snapshot

- Scanned source files: 5394
- JSX files scanned: 1979
- Components detected: 3312
- Components forwarding parent props (hotspot threshold): 45
- Components forwarding parent props (any): 55
- Resolved forwarded transitions: 276
- Candidate chains (depth >= 2): 276
- Candidate chains (depth >= 3): 42
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 11
- Hotspot forwarding components backlog size: 45

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 50 |
| `feature:cms` | 2 |
| `shared-ui` | 2 |
| `app` | 1 |

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
| 13 | `SocialPostList` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx` | 3 | 3 | no | yes |
| 14 | `KangurUnifiedLessonPanel` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 3 | 3 | yes | yes |
| 15 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 3 | 3 | no | yes |
| 16 | `AgenticDrawGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 7 | no | yes |
| 17 | `KangurTrainingSetupPanel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx` | 2 | 6 | no | yes |
| 18 | `AgenticSequenceGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 5 | no | yes |
| 19 | `AgenticSortGame` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx` | 2 | 5 | no | yes |
| 20 | `SocialPostPipeline` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx` | 2 | 4 | no | yes |
| 21 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 22 | `CalendarGameBody` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 2 | 3 | no | yes |
| 23 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 24 | `Error` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 25 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 2 | 2 | no | yes |
| 26 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 2 | 2 | no | yes |
| 27 | `AgenticLessonCodeBlock` | `src/features/kangur/ui/components/AgenticLessonCodeBlock.tsx` | 2 | 2 | no | yes |
| 28 | `ClockTrainingSlide` | `src/features/kangur/ui/components/ClockLesson.tsx` | 2 | 2 | no | yes |
| 29 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 2 | 2 | no | yes |
| 30 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 2 | 2 | no | yes |
| 31 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 2 | 2 | no | yes |
| 32 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 2 | 2 | no | yes |
| 33 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 2 | 2 | no | yes |
| 34 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 2 | 2 | no | yes |
| 35 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 2 | 2 | no | yes |
| 36 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 2 | 2 | no | yes |
| 37 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 2 | 2 | no | yes |
| 38 | `KangurUnifiedLessonSubsection` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 2 | 2 | yes | yes |
| 39 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 40 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 41 | `AgenticDocsHierarchyGame` | `src/features/kangur/ui/components/AgenticDocsHierarchyGame.tsx` | 1 | 2 | no | no |
| 42 | `FrontendPublicOwnerShellClient` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx` | 1 | 1 | no | no |
| 43 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 44 | `AgenticApprovalGateGame` | `src/features/kangur/ui/components/AgenticApprovalGateGame.tsx` | 1 | 1 | no | no |
| 45 | `AgenticLessonQuickCheck` | `src/features/kangur/ui/components/AgenticLessonQuickCheck.tsx` | 1 | 1 | no | no |
| 46 | `AgenticReasoningRouterGame` | `src/features/kangur/ui/components/AgenticReasoningRouterGame.tsx` | 1 | 1 | no | no |
| 47 | `AgenticSurfaceMatchGame` | `src/features/kangur/ui/components/AgenticSurfaceMatchGame.tsx` | 1 | 1 | no | no |
| 48 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 49 | `GeometryShapesGameStage` | `src/features/kangur/ui/components/GeometryShapesLesson.tsx` | 1 | 1 | no | no |
| 50 | `KangurGrajmyWordmark` | `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx` | 1 | 1 | yes | yes |
| 51 | `KangurKangurWordmark` | `src/features/kangur/ui/components/KangurKangurWordmark.tsx` | 1 | 1 | yes | yes |
| 52 | `KangurLessonsWordmark` | `src/features/kangur/ui/components/KangurLessonsWordmark.tsx` | 1 | 1 | yes | yes |
| 53 | `KangurTreningWordmark` | `src/features/kangur/ui/components/KangurTreningWordmark.tsx` | 1 | 1 | yes | yes |
| 54 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 55 | `KangurUnifiedLesson` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> onStart` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 2 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestedSelection` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 3 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionDescription` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 4 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionLabel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 5 | 92 | `KangurTrainingSetupPanel` | `TrainingSetup` | 5 | 1 | `suggestedTraining -> suggestionTitle` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx:20` |
| 6 | 78 | `SocialPostVisuals` | `Input` | 3 | 2 | `addonForm -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132` |
| 7 | 78 | `SocialPostVisuals` | `Textarea` | 3 | 2 | `addonForm -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163` |
| 8 | 78 | `SocialPostVisuals` | `Button` | 3 | 2 | `addonForm -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 9 | 74 | `AgenticSequenceGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:543` |
| 10 | 74 | `AgenticSequenceGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:550` |
| 11 | 74 | `AgenticSequenceGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:552` |
| 12 | 74 | `AgenticSequenceGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:583` |
| 13 | 74 | `AgenticSortGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628` |
| 14 | 74 | `AgenticSortGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:635` |
| 15 | 74 | `AgenticSortGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:637` |
| 16 | 74 | `AgenticSortGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:695` |
| 17 | 74 | `AgenticDrawGame` | `KangurLessonVisual` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:808` |
| 18 | 74 | `AgenticDrawGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:824` |
| 19 | 74 | `AgenticDrawGame` | `KangurLessonChip` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:826` |
| 20 | 74 | `AgenticDrawGame` | `KangurLessonInset` | 4 | 1 | `accent -> accent` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:833` |
| 21 | 72 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 22 | 72 | `HomeContentClient` | `LazyHomeFallbackContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 23 | 72 | `AgenticDrawGame` | `KangurLessonVisual` | 3 | 1 | `config -> caption` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:808` |
| 24 | 72 | `AgenticDrawGame` | `DrawGameSvg` | 3 | 1 | `config -> checkpoints` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:813` |
| 25 | 72 | `AgenticDrawGame` | `DrawGameSvg` | 3 | 1 | `config -> guide` | `src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:813` |
| 26 | 72 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:71` |
| 27 | 72 | `KangurChoiceDialog` | `KangurButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:98` |
| 28 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 29 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 30 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 31 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 32 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> options` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 33 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> placeholder` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 34 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 35 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 36 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 37 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `scheduledAt -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 38 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `handleRunFullPipeline -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 39 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `activePostId -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 40 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `handleRunFullPipeline -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 41 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `activePostId -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 42 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132` |
| 43 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163` |
| 44 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `batchCaptureBaseUrl -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193` |
| 45 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `batchCaptureBaseUrl -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 46 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `setShowMediaLibrary -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:456` |
| 47 | 68 | `SocialPostVisuals` | `MediaLibraryPanel` | 2 | 2 | `setShowMediaLibrary -> onOpenChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:466` |
| 48 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 49 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 50 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 51 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `activePost -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:540` |
| 52 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> variant` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 53 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> title` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 54 | 64 | `HomeContentClient` | `LazyCmsPageShell` | 3 | 1 | `theme -> theme` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 55 | 64 | `KangurChoiceDialog` | `KangurDialog` | 3 | 1 | `onOpenChange -> onOpenChange` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:50` |
| 56 | 62 | `CalendarGameBody` | `CalendarInteractiveGame` | 2 | 1 | `section -> key` | `src/features/kangur/ui/components/CalendarLesson.tsx:455` |
| 57 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 58 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 59 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 60 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 61 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 62 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 63 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 64 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 65 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionAcknowledgeMs` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 66 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionSourceId` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 67 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `linkedinConnectionId -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 68 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `handleLinkedInConnectionChange -> onValueChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 69 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handleSave -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 70 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `saveMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 71 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `patchMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 72 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handlePublish -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 73 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `publishMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 74 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onPublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:141` |
| 75 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onUnpublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:188` |
| 76 | 58 | `SocialPostList` | `Button` | 1 | 2 | `onDeletePost -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:201` |
| 77 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleCreateAddon -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 78 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `createAddonPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 79 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `setBatchCaptureBaseUrl -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193` |
| 80 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `selectAllCapturePresets -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:199` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 113 | 3 | `AgenticSequenceGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent -> accent` |
| 2 | 113 | 3 | `AgenticSortGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent -> accent` |
| 3 | 113 | 3 | `AgenticDrawGame` | `KangurLessonCallout` | 4 | 1 | `accent -> accent -> accent` |
| 4 | 99 | 3 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> activePost -> disabled` |
| 5 | 99 | 3 | `SocialPostEditor` | `Textarea` | 2 | 2 | `activePost -> activePost -> value` |
| 6 | 99 | 3 | `SocialPostEditor` | `Input` | 2 | 2 | `scheduledAt -> scheduledAt -> value` |
| 7 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `addonForm -> addonForm -> value` |
| 8 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `addonForm -> addonForm -> value` |
| 9 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `addonForm -> addonForm -> disabled` |
| 10 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setAddonForm -> setAddonForm -> onChange` |
| 11 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `setAddonForm -> setAddonForm -> onChange` |
| 12 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleCreateAddon -> handleCreateAddon -> onClick` |
| 13 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `createAddonPending -> createAddonPending -> disabled` |
| 14 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `batchCaptureBaseUrl -> batchCaptureBaseUrl -> value` |
| 15 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCaptureBaseUrl -> batchCaptureBaseUrl -> disabled` |
| 16 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setBatchCaptureBaseUrl -> setBatchCaptureBaseUrl -> onChange` |
| 17 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCapturePresetIds -> batchCapturePresetIds -> disabled` |
| 18 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `selectAllCapturePresets -> selectAllCapturePresets -> onClick` |
| 19 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `clearCapturePresets -> clearCapturePresets -> onClick` |
| 20 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleBatchCapture -> handleBatchCapture -> onClick` |
| 21 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `batchCapturePending -> batchCapturePending -> disabled` |
| 22 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleSelectAddon -> handleSelectAddon -> onClick` |
| 23 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleRemoveAddon -> handleRemoveAddon -> onClick` |
| 24 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleRemoveImage -> handleRemoveImage -> onClick` |
| 25 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `setShowMediaLibrary -> setShowMediaLibrary -> onClick` |
| 26 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `setShowMediaLibrary -> setShowMediaLibrary -> onOpenChange` |
| 27 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `showMediaLibrary -> showMediaLibrary -> open` |
| 28 | 89 | 3 | `SocialPostEditor` | `MediaLibraryPanel` | 1 | 2 | `handleAddImages -> handleAddImages -> onSelect` |
| 29 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `docReferenceInput -> docReferenceInput -> value` |
| 30 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setDocReferenceInput -> setDocReferenceInput -> onChange` |
| 31 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `generationNotes -> generationNotes -> value` |
| 32 | 89 | 3 | `SocialPostEditor` | `Textarea` | 1 | 2 | `setGenerationNotes -> setGenerationNotes -> onChange` |
| 33 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleGenerate -> handleGenerate -> onClick` |
| 34 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleLoadContext -> handleLoadContext -> onClick` |
| 35 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleLoadContext -> handleLoadContext -> disabled` |
| 36 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `contextLoading -> contextLoading -> disabled` |
| 37 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `hasVisualDocUpdates -> hasVisualDocUpdates -> disabled` |
| 38 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handlePreviewDocUpdates -> handlePreviewDocUpdates -> onClick` |
| 39 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `previewDocUpdatesPending -> previewDocUpdatesPending -> disabled` |
| 40 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `handleApplyDocUpdates -> handleApplyDocUpdates -> onClick` |
| 41 | 89 | 3 | `SocialPostEditor` | `Button` | 1 | 2 | `applyDocUpdatesPending -> applyDocUpdatesPending -> disabled` |
| 42 | 89 | 3 | `SocialPostEditor` | `Input` | 1 | 2 | `setScheduledAt -> setScheduledAt -> onChange` |

## Top Chain Details (Depth >= 3)

### 1. AgenticSequenceGame -> KangurLessonCallout

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

### 2. AgenticSortGame -> KangurLessonCallout

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: accent -> accent -> accent
- Component path:
  - `AgenticSortGame` (src/features/kangur/ui/components/AgenticCodingMiniGames.tsx)
  - `KangurLessonVisual` (src/features/kangur/ui/design/lesson-primitives.tsx)
  - `KangurLessonCallout` (src/features/kangur/ui/design/lesson-primitives.tsx)
- Transition lines:
  - `AgenticSortGame` -> `KangurLessonVisual`: `accent` -> `accent` at src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628
  - `KangurLessonVisual` -> `KangurLessonCallout`: `accent` -> `accent` at src/features/kangur/ui/design/lesson-primitives.tsx:177

### 3. AgenticDrawGame -> KangurLessonCallout

- Score: 113
- Depth: 3
- Root fanout: 4
- Prop path: accent -> accent -> accent
- Component path:
  - `AgenticDrawGame` (src/features/kangur/ui/components/AgenticCodingMiniGames.tsx)
  - `KangurLessonVisual` (src/features/kangur/ui/design/lesson-primitives.tsx)
  - `KangurLessonCallout` (src/features/kangur/ui/design/lesson-primitives.tsx)
- Transition lines:
  - `AgenticDrawGame` -> `KangurLessonVisual`: `accent` -> `accent` at src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:808
  - `KangurLessonVisual` -> `KangurLessonCallout`: `accent` -> `accent` at src/features/kangur/ui/design/lesson-primitives.tsx:177

### 4. SocialPostEditor -> Button

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

### 5. SocialPostEditor -> Textarea

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

### 6. SocialPostEditor -> Input

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

### 7. SocialPostEditor -> Input

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

### 8. SocialPostEditor -> Textarea

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

### 9. SocialPostEditor -> Button

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

### 10. SocialPostEditor -> Input

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

### 11. SocialPostEditor -> Textarea

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

### 12. SocialPostEditor -> Button

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

### 13. SocialPostEditor -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: createAddonPending -> createAddonPending -> disabled
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `createAddonPending` -> `createAddonPending` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Button`: `createAddonPending` -> `disabled` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172

### 14. SocialPostEditor -> Input

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: batchCaptureBaseUrl -> batchCaptureBaseUrl -> value
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Input` (src/shared/ui/input.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `batchCaptureBaseUrl` -> `batchCaptureBaseUrl` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Input`: `batchCaptureBaseUrl` -> `value` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193

### 15. SocialPostEditor -> Button

- Score: 89
- Depth: 3
- Root fanout: 1
- Prop path: batchCaptureBaseUrl -> batchCaptureBaseUrl -> disabled
- Component path:
  - `SocialPostEditor` (src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx)
  - `SocialPostVisuals` (src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx)
  - `Button` (src/shared/ui/button.tsx)
- Transition lines:
  - `SocialPostEditor` -> `SocialPostVisuals`: `batchCaptureBaseUrl` -> `batchCaptureBaseUrl` at src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:231
  - `SocialPostVisuals` -> `Button`: `batchCaptureBaseUrl` -> `disabled` at src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254

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

### 6. SocialPostVisuals -> Input

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132

### 7. SocialPostVisuals -> Textarea

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163

### 8. SocialPostVisuals -> Button

- Score: 78
- Root fanout: 3
- Prop mapping: addonForm -> disabled
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172

### 9. AgenticSequenceGame -> KangurLessonVisual

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:543

### 10. AgenticSequenceGame -> KangurLessonCallout

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:550

### 11. AgenticSequenceGame -> KangurLessonChip

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:552

### 12. AgenticSequenceGame -> KangurLessonInset

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:583

### 13. AgenticSortGame -> KangurLessonVisual

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:628

### 14. AgenticSortGame -> KangurLessonCallout

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:635

### 15. AgenticSortGame -> KangurLessonChip

- Score: 74
- Root fanout: 4
- Prop mapping: accent -> accent
- Location: src/features/kangur/ui/components/AgenticCodingMiniGames.tsx:637

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
