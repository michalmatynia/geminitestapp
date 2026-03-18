---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-18T04:10:25.586Z

## Snapshot

- Scanned source files: 5326
- JSX files scanned: 1912
- Components detected: 3174
- Components forwarding parent props (hotspot threshold): 43
- Components forwarding parent props (any): 47
- Resolved forwarded transitions: 255
- Candidate chains (depth >= 2): 255
- Candidate chains (depth >= 3): 42
- High-priority chains (depth >= 4): 1
- Unknown spread forwarding edges: 11
- Hotspot forwarding components backlog size: 43

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 40 |
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
| 17 | `KangurTrainingSetupPanel` | `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx` | 2 | 6 | no | yes |
| 18 | `SocialPostPipeline` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx` | 2 | 4 | no | yes |
| 19 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 20 | `CalendarGameBody` | `src/features/kangur/ui/components/CalendarLesson.tsx` | 2 | 3 | no | yes |
| 21 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 22 | `FrontendPublicOwnerShell` | `src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx` | 2 | 2 | no | yes |
| 23 | `Error` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 24 | `ParentVerificationCard` | `src/features/kangur/ui/KangurLoginPage.tsx` | 2 | 2 | no | yes |
| 25 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 2 | 2 | no | yes |
| 26 | `ClockTrainingSlide` | `src/features/kangur/ui/components/ClockLesson.tsx` | 2 | 2 | no | yes |
| 27 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 2 | 2 | no | yes |
| 28 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 2 | 2 | no | yes |
| 29 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 2 | 2 | no | yes |
| 30 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 2 | 2 | no | yes |
| 31 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 2 | 2 | no | yes |
| 32 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 2 | 2 | no | yes |
| 33 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 2 | 2 | no | yes |
| 34 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 2 | 2 | no | yes |
| 35 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 2 | 2 | no | yes |
| 36 | `KangurUnifiedLessonSubsection` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 2 | 2 | yes | yes |
| 37 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 38 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 39 | `FrontendPublicOwnerShellClient` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx` | 1 | 1 | no | no |
| 40 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 41 | `GeometryDrawingGame` | `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1 | 1 | no | no |
| 42 | `KangurGrajmyWordmark` | `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx` | 1 | 1 | yes | yes |
| 43 | `KangurKangurWordmark` | `src/features/kangur/ui/components/KangurKangurWordmark.tsx` | 1 | 1 | yes | yes |
| 44 | `KangurLessonsWordmark` | `src/features/kangur/ui/components/KangurLessonsWordmark.tsx` | 1 | 1 | yes | yes |
| 45 | `KangurTreningWordmark` | `src/features/kangur/ui/components/KangurTreningWordmark.tsx` | 1 | 1 | yes | yes |
| 46 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 47 | `KangurUnifiedLesson` | `src/features/kangur/ui/components/KangurUnifiedLesson.tsx` | 0 | 0 | yes | yes |

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
| 9 | 72 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 10 | 72 | `HomeContentClient` | `LazyHomeFallbackContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 11 | 72 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:71` |
| 12 | 72 | `KangurChoiceDialog` | `KangurButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:98` |
| 13 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 14 | 68 | `SocialPostEditor` | `Input` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183` |
| 15 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `editorState -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 16 | 68 | `SocialPostEditor` | `Textarea` | 2 | 2 | `setEditorState -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190` |
| 17 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> options` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 18 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> placeholder` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 19 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedinIntegration -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 20 | 68 | `SocialPostEditor` | `SelectSimple` | 2 | 2 | `linkedInOptions -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 21 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 22 | 68 | `SocialPostEditor` | `Button` | 2 | 2 | `scheduledAt -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 23 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `handleRunFullPipeline -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 24 | 68 | `SocialPostPipeline` | `FormSection` | 2 | 2 | `activePostId -> actions` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:19` |
| 25 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `handleRunFullPipeline -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 26 | 68 | `SocialPostPipeline` | `Button` | 2 | 2 | `activePostId -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Pipeline.tsx:25` |
| 27 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:132` |
| 28 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `setAddonForm -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:163` |
| 29 | 68 | `SocialPostVisuals` | `Input` | 2 | 2 | `batchCaptureBaseUrl -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193` |
| 30 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `batchCaptureBaseUrl -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 31 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `setShowMediaLibrary -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:456` |
| 32 | 68 | `SocialPostVisuals` | `MediaLibraryPanel` | 2 | 2 | `setShowMediaLibrary -> onOpenChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:466` |
| 33 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 34 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `activePost -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 35 | 68 | `SocialPostVisuals` | `Button` | 2 | 2 | `handleLoadContext -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:499` |
| 36 | 68 | `SocialPostVisuals` | `Textarea` | 2 | 2 | `activePost -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:540` |
| 37 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> variant` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 38 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> title` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:206` |
| 39 | 64 | `HomeContentClient` | `LazyCmsPageShell` | 3 | 1 | `theme -> theme` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 40 | 64 | `KangurChoiceDialog` | `KangurDialog` | 3 | 1 | `onOpenChange -> onOpenChange` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:50` |
| 41 | 62 | `CalendarGameBody` | `CalendarInteractiveGame` | 2 | 1 | `section -> key` | `src/features/kangur/ui/components/CalendarLesson.tsx:455` |
| 42 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 43 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 44 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 45 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 46 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 47 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 48 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 49 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 50 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionAcknowledgeMs` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 51 | 62 | `KangurNavAction` | `KangurTransitionLink` | 2 | 1 | `transition -> transitionSourceId` | `src/features/kangur/ui/components/KangurNavAction.tsx:66` |
| 52 | 58 | `FrontendLayoutClient` | `CmsStorefrontAppearanceProvider` | 1 | 2 | `storefrontAppearanceMode -> initialMode` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx:22` |
| 53 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `linkedinConnectionId -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 54 | 58 | `SocialPostEditor` | `SelectSimple` | 1 | 2 | `handleLinkedInConnectionChange -> onValueChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:280` |
| 55 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handleSave -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 56 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `saveMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:320` |
| 57 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `patchMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:330` |
| 58 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `handlePublish -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 59 | 58 | `SocialPostEditor` | `Button` | 1 | 2 | `publishMutationPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:341` |
| 60 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onPublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:141` |
| 61 | 58 | `SocialPostList` | `DropdownMenuItem` | 1 | 2 | `onUnpublishPost -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:188` |
| 62 | 58 | `SocialPostList` | `Button` | 1 | 2 | `onDeletePost -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.List.tsx:201` |
| 63 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleCreateAddon -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 64 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `createAddonPending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:172` |
| 65 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `setBatchCaptureBaseUrl -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:193` |
| 66 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `selectAllCapturePresets -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:199` |
| 67 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `clearCapturePresets -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:207` |
| 68 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleBatchCapture -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 69 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `batchCapturePending -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 70 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `batchCapturePresetIds -> disabled` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:254` |
| 71 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleRemoveAddon -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:390` |
| 72 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleSelectAddon -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:390` |
| 73 | 58 | `SocialPostVisuals` | `Button` | 1 | 2 | `handleRemoveImage -> onClick` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:440` |
| 74 | 58 | `SocialPostVisuals` | `MediaLibraryPanel` | 1 | 2 | `showMediaLibrary -> open` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:466` |
| 75 | 58 | `SocialPostVisuals` | `MediaLibraryPanel` | 1 | 2 | `handleAddImages -> onSelect` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:466` |
| 76 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `scheduledAt -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:478` |
| 77 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `setScheduledAt -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:478` |
| 78 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `docReferenceInput -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:487` |
| 79 | 58 | `SocialPostVisuals` | `Input` | 1 | 2 | `setDocReferenceInput -> onChange` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:487` |
| 80 | 58 | `SocialPostVisuals` | `Textarea` | 1 | 2 | `generationNotes -> value` | `src/features/kangur/admin/admin-kangur-social/SocialPost.Visuals.tsx:492` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 152 | 4 | `FrontendLayoutClient` | `KangurStorefrontAppearanceProvider` | 1 | 2 | `kangurInitialMode -> kangurInitialMode -> kangurInitialMode -> initialMode` |
| 2 | 99 | 3 | `SocialPostEditor` | `Button` | 2 | 2 | `activePost -> activePost -> disabled` |
| 3 | 99 | 3 | `SocialPostEditor` | `Textarea` | 2 | 2 | `activePost -> activePost -> value` |
| 4 | 99 | 3 | `SocialPostEditor` | `Input` | 2 | 2 | `scheduledAt -> scheduledAt -> value` |
| 5 | 89 | 3 | `FrontendLayoutClient` | `FrontendPublicOwnerShellClient` | 1 | 2 | `publicOwner -> publicOwner -> publicOwner` |
| 6 | 89 | 3 | `FrontendLayoutClient` | `FrontendPublicOwnerShellClient` | 1 | 2 | `kangurInitialMode -> kangurInitialMode -> kangurInitialMode` |
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

### 2. SocialPostEditor -> Button

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

### 3. SocialPostEditor -> Textarea

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

### 4. SocialPostEditor -> Input

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

### 5. FrontendLayoutClient -> FrontendPublicOwnerShellClient

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

### 6. FrontendLayoutClient -> FrontendPublicOwnerShellClient

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

### 9. HomeContentClient -> LazyHomeCmsDefaultContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:71

### 10. HomeContentClient -> LazyHomeFallbackContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:79

### 11. KangurChoiceDialog -> KangurPanelCloseButton

- Score: 72
- Root fanout: 3
- Prop mapping: onOpenChange -> onClick
- Location: src/features/kangur/ui/components/KangurChoiceDialog.tsx:71

### 12. KangurChoiceDialog -> KangurButton

- Score: 72
- Root fanout: 3
- Prop mapping: onOpenChange -> onClick
- Location: src/features/kangur/ui/components/KangurChoiceDialog.tsx:98

### 13. SocialPostEditor -> Input

- Score: 68
- Root fanout: 2
- Prop mapping: editorState -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183

### 14. SocialPostEditor -> Input

- Score: 68
- Root fanout: 2
- Prop mapping: setEditorState -> onChange
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:183

### 15. SocialPostEditor -> Textarea

- Score: 68
- Root fanout: 2
- Prop mapping: editorState -> value
- Location: src/features/kangur/admin/admin-kangur-social/SocialPost.Editor.tsx:190

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
