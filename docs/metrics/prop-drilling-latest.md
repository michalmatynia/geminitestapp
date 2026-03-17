---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-17T14:09:05.570Z

## Snapshot

- Scanned source files: 5277
- JSX files scanned: 1896
- Components detected: 3109
- Components forwarding parent props (hotspot threshold): 25
- Components forwarding parent props (any): 28
- Resolved forwarded transitions: 100
- Candidate chains (depth >= 2): 100
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 4
- Hotspot forwarding components backlog size: 25

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 21 |
| `app` | 3 |
| `feature:cms` | 2 |
| `shared-ui` | 2 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurNavAction` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 14 | 14 | no | yes |
| 2 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 3 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 9 | 13 | no | yes |
| 4 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 5 | `KangurDialogHeader` | `src/features/kangur/ui/components/KangurDialogHeader.tsx` | 4 | 4 | no | yes |
| 6 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | yes | yes |
| 7 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 3 | 5 | no | yes |
| 8 | `FrontendLayoutClient` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx` | 3 | 3 | no | yes |
| 9 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 3 | 3 | no | yes |
| 10 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 11 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 12 | `Error` | `src/app/(frontend)/kangur/error.tsx` | 2 | 2 | no | yes |
| 13 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 2 | 2 | no | yes |
| 14 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 2 | 2 | no | yes |
| 15 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 2 | 2 | no | yes |
| 16 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 2 | 2 | no | yes |
| 17 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 2 | 2 | no | yes |
| 18 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 2 | 2 | no | yes |
| 19 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 2 | 2 | no | yes |
| 20 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 2 | 2 | no | yes |
| 21 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 2 | 2 | no | yes |
| 22 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 23 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 24 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 2 | 2 | no | yes |
| 25 | `FrontendPublicOwnerShellClient` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx` | 1 | 1 | no | no |
| 26 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 27 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 28 | `FrontendPublicOwnerShell` | `src/app/(frontend)/_components/FrontendPublicOwnerShell.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 72 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 2 | 72 | `HomeContentClient` | `LazyHomeFallbackContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 3 | 72 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:71` |
| 4 | 72 | `KangurChoiceDialog` | `KangurButton` | 3 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:98` |
| 5 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> variant` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197` |
| 6 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> title` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197` |
| 7 | 64 | `HomeContentClient` | `LazyCmsPageShell` | 3 | 1 | `theme -> theme` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 8 | 64 | `KangurChoiceDialog` | `KangurDialog` | 3 | 1 | `onOpenChange -> onOpenChange` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:50` |
| 9 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 10 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 11 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 12 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 13 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 14 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 15 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 16 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 17 | 58 | `FrontendLayoutClient` | `CmsStorefrontAppearanceProvider` | 1 | 2 | `storefrontAppearanceMode -> initialMode` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx:22` |
| 18 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `onCopyTemplateText -> onClick` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:167` |
| 19 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `onProbeNarrator -> onClick` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:175` |
| 20 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `isProbingNarrator -> disabled` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:175` |
| 21 | 54 | `HomeContentClient` | `LazyCmsPageShell` | 2 | 1 | `colorSchemes -> colorSchemes` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 22 | 54 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 2 | 1 | `colorSchemes -> colorSchemes` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 23 | 54 | `HomeFallbackContent` | `HomeFallbackHeader` | 2 | 1 | `appearanceTone -> appearanceTone` | `src/features/cms/components/frontend/home/home-fallback-content.tsx:131` |
| 24 | 54 | `HomeFallbackContent` | `HomeFallbackHero` | 2 | 1 | `appearanceTone -> appearanceTone` | `src/features/cms/components/frontend/home/home-fallback-content.tsx:134` |
| 25 | 54 | `PasswordInput` | `Input` | 2 | 1 | `disabled -> disabled` | `src/shared/ui/password-input.tsx:33` |
| 26 | 54 | `PasswordInput` | `Button` | 2 | 1 | `disabled -> disabled` | `src/shared/ui/password-input.tsx:40` |
| 27 | 52 | `FrontendPublicOwnerShellClient` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `kangurInitialMode -> initialMode` | `src/features/kangur/ui/FrontendPublicOwnerShellClient.tsx:31` |
| 28 | 52 | `ExamNavigation` | `KangurButton` | 1 | 1 | `onPrev -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 29 | 52 | `ExamNavigation` | `KangurButton` | 1 | 1 | `onNext -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 30 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressTestId -> data-testid` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 31 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressAriaLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 32 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 33 | 52 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 1 | 1 | `closeAriaLabel -> aria-label` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:71` |
| 34 | 52 | `KangurDialogHeader` | `KangurDialogCloseButton` | 1 | 1 | `closeAriaLabel -> aria-label` | `src/features/kangur/ui/components/KangurDialogHeader.tsx:28` |
| 35 | 52 | `KangurDialogHeader` | `KangurDialogCloseButton` | 1 | 1 | `closeLabel -> label` | `src/features/kangur/ui/components/KangurDialogHeader.tsx:28` |
| 36 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `active -> aria-current` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 37 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `ariaLabel -> aria-label` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 38 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `docId -> data-doc-id` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 39 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `transitionActive -> data-nav-state` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 40 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 41 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `elementRef -> ref` | `src/features/kangur/ui/components/KangurNavAction.tsx:78` |
| 42 | 52 | `KangurLessonVisual` | `KangurLessonCallout` | 1 | 1 | `center -> className` | `src/features/kangur/ui/design/lesson-primitives.tsx:177` |
| 43 | 52 | `LoginForm` | `KangurButton` | 1 | 1 | `isLoading -> disabled` | `src/features/kangur/ui/login-page/login-forms.tsx:119` |
| 44 | 52 | `SignupForm` | `KangurButton` | 1 | 1 | `isLoading -> disabled` | `src/features/kangur/ui/login-page/signup-forms.tsx:116` |
| 45 | 52 | `SignupForm` | `KangurButton` | 1 | 1 | `isCaptchaRequired -> disabled` | `src/features/kangur/ui/login-page/signup-forms.tsx:116` |
| 46 | 52 | `FocusModeTogglePortal` | `Button` | 1 | 1 | `onToggleFocusMode -> onClick` | `src/shared/ui/FocusModeTogglePortal.tsx:40` |
| 47 | 50 | `Error` | `KangurErrorFallback` | 1 | 2 | `error -> error` | `src/app/(frontend)/kangur/error.tsx:14` |
| 48 | 50 | `Error` | `KangurErrorFallback` | 1 | 2 | `reset -> reset` | `src/app/(frontend)/kangur/error.tsx:14` |
| 49 | 50 | `KangurNarratorSettingsPanel` | `FormSection` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:70` |
| 50 | 44 | `FrontendLayoutClient` | `FrontendPublicOwnerShell` | 1 | 1 | `publicOwner -> publicOwner` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx:24` |
| 51 | 44 | `FrontendLayoutClient` | `FrontendPublicOwnerShell` | 1 | 1 | `kangurInitialMode -> kangurInitialMode` | `src/app/(frontend)/_components/FrontendLayoutClient.tsx:24` |
| 52 | 44 | `HomeContentClient` | `LazyCmsPageShell` | 1 | 1 | `menu -> menu` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 53 | 44 | `HomeContentClient` | `LazyCmsPageShell` | 1 | 1 | `showMenu -> showMenu` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 54 | 44 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 1 | 1 | `hasCmsContent -> hasCmsContent` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 55 | 44 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 1 | 1 | `defaultSlug -> defaultSlug` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 56 | 44 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 1 | 1 | `rendererComponents -> rendererComponents` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 57 | 44 | `HomeContentClient` | `LazyHomeFallbackContent` | 1 | 1 | `showFallbackHeader -> showFallbackHeader` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 58 | 44 | `HomeContentClient` | `LazyHomeFallbackContent` | 1 | 1 | `products -> products` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 59 | 44 | `HomeContentClient` | `LazyHomeFallbackContent` | 1 | 1 | `appearanceTone -> appearanceTone` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 60 | 44 | `HomeFallbackContent` | `HomeFallbackProducts` | 1 | 1 | `products -> products` | `src/features/cms/components/frontend/home/home-fallback-content.tsx:150` |
| 61 | 44 | `KangurPublicApp` | `KangurStorefrontAppearanceProvider` | 1 | 1 | `initialMode -> initialMode` | `src/features/kangur/ui/KangurPublicApp.tsx:34` |
| 62 | 44 | `KangurPublicAppEntry` | `LazyKangurPublicApp` | 1 | 1 | `basePath -> basePath` | `src/features/kangur/ui/KangurPublicAppEntry.tsx:27` |
| 63 | 44 | `KangurPublicAppEntry` | `LazyKangurPublicApp` | 1 | 1 | `initialMode -> initialMode` | `src/features/kangur/ui/KangurPublicAppEntry.tsx:27` |
| 64 | 44 | `EnglishPartsOfSpeechGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx:542` |
| 65 | 44 | `EnglishPartsOfSpeechGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx:542` |
| 66 | 44 | `EnglishPrepositionsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx:283` |
| 67 | 44 | `EnglishPrepositionsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx:283` |
| 68 | 44 | `EnglishPrepositionsOrderGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx:350` |
| 69 | 44 | `EnglishPrepositionsOrderGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx:350` |
| 70 | 44 | `EnglishPrepositionsSortGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx:414` |
| 71 | 44 | `EnglishPrepositionsSortGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx:414` |
| 72 | 44 | `EnglishPronounsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx:219` |
| 73 | 44 | `EnglishPronounsGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx:219` |
| 74 | 44 | `EnglishPronounsWarmupGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx:211` |
| 75 | 44 | `EnglishPronounsWarmupGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx:211` |
| 76 | 44 | `EnglishSentenceStructureGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx:410` |
| 77 | 44 | `EnglishSentenceStructureGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx:410` |
| 78 | 44 | `EnglishSubjectVerbAgreementGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `finishLabel -> finishLabel` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx:242` |
| 79 | 44 | `EnglishSubjectVerbAgreementGame` | `KangurPracticeGameSummaryActions` | 1 | 1 | `onFinish -> onFinish` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx:242` |
| 80 | 44 | `KangurChoiceDialog` | `KangurDialog` | 1 | 1 | `open -> open` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:50` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. HomeContentClient -> LazyHomeCmsDefaultContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:71

### 2. HomeContentClient -> LazyHomeFallbackContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:79

### 3. KangurChoiceDialog -> KangurPanelCloseButton

- Score: 72
- Root fanout: 3
- Prop mapping: onOpenChange -> onClick
- Location: src/features/kangur/ui/components/KangurChoiceDialog.tsx:71

### 4. KangurChoiceDialog -> KangurButton

- Score: 72
- Root fanout: 3
- Prop mapping: onOpenChange -> onClick
- Location: src/features/kangur/ui/components/KangurChoiceDialog.tsx:98

### 5. KangurNarratorSettingsPanel -> Alert

- Score: 68
- Root fanout: 2
- Prop mapping: narratorProbe -> variant
- Location: src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197

### 6. KangurNarratorSettingsPanel -> Alert

- Score: 68
- Root fanout: 2
- Prop mapping: narratorProbe -> title
- Location: src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197

### 7. HomeContentClient -> LazyCmsPageShell

- Score: 64
- Root fanout: 3
- Prop mapping: theme -> theme
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:64

### 8. KangurChoiceDialog -> KangurDialog

- Score: 64
- Root fanout: 3
- Prop mapping: onOpenChange -> onOpenChange
- Location: src/features/kangur/ui/components/KangurChoiceDialog.tsx:50

### 9. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: prevDisabled -> onClick
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:36

### 10. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: prevDisabled -> disabled
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:36

### 11. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: prevLabel -> aria-label
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:36

### 12. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: prevLabel -> title
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:36

### 13. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: nextDisabled -> onClick
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:49

### 14. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: nextDisabled -> disabled
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:49

### 15. ExamNavigation -> KangurButton

- Score: 62
- Root fanout: 2
- Prop mapping: nextLabel -> aria-label
- Location: src/features/kangur/ui/components/ExamNavigation.tsx:49

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
