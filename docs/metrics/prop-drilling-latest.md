---
owner: 'Platform Team'
last_reviewed: '2026-03-17'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-17T11:42:57.999Z

## Snapshot

- Scanned source files: 5214
- JSX files scanned: 1893
- Components detected: 3085
- Components forwarding parent props (hotspot threshold): 25
- Components forwarding parent props (any): 28
- Resolved forwarded transitions: 127
- Candidate chains (depth >= 2): 127
- Candidate chains (depth >= 3): 0
- High-priority chains (depth >= 4): 0
- Unknown spread forwarding edges: 3
- Hotspot forwarding components backlog size: 25

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 21 |
| `shared-ui` | 3 |
| `feature:cms` | 2 |
| `shared` | 2 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurNavAction` | `src/features/kangur/ui/components/KangurNavAction.tsx` | 14 | 14 | no | yes |
| 2 | `KangurParentVerificationSettingsPanel` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx` | 11 | 18 | no | yes |
| 3 | `KangurAiTutorSettingsPanel` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx` | 11 | 11 | no | yes |
| 4 | `HomeContentClient` | `src/features/cms/components/frontend/home/HomeContentClient.tsx` | 10 | 13 | no | yes |
| 5 | `ExamNavigation` | `src/features/kangur/ui/components/ExamNavigation.tsx` | 9 | 13 | no | yes |
| 6 | `KangurNarratorSettingsPanel` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx` | 5 | 6 | no | yes |
| 7 | `KangurChoiceDialog` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx` | 4 | 5 | no | yes |
| 8 | `KangurLessonVisual` | `src/features/kangur/ui/design/lesson-primitives.tsx` | 4 | 4 | yes | yes |
| 9 | `DocsTooltipEnhancer` | `src/shared/ui/DocsTooltipEnhancer.tsx` | 4 | 4 | no | yes |
| 10 | `KangurStandardPageLayout` | `src/features/kangur/ui/components/KangurStandardPageLayout.tsx` | 3 | 3 | no | yes |
| 11 | `FrontendLayoutClient` | `src/shared/components/FrontendLayoutClient.tsx` | 3 | 3 | no | yes |
| 12 | `HomeFallbackContent` | `src/features/cms/components/frontend/home/home-fallback-content.tsx` | 2 | 3 | no | yes |
| 13 | `PasswordInput` | `src/shared/ui/password-input.tsx` | 2 | 3 | yes | yes |
| 14 | `KangurPublicAppEntry` | `src/features/kangur/ui/KangurPublicAppEntry.tsx` | 2 | 2 | no | yes |
| 15 | `EnglishPartsOfSpeechGame` | `src/features/kangur/ui/components/EnglishPartsOfSpeechGame.tsx` | 2 | 2 | no | yes |
| 16 | `EnglishPrepositionsGame` | `src/features/kangur/ui/components/EnglishPrepositionsGame.tsx` | 2 | 2 | no | yes |
| 17 | `EnglishPrepositionsOrderGame` | `src/features/kangur/ui/components/EnglishPrepositionsOrderGame.tsx` | 2 | 2 | no | yes |
| 18 | `EnglishPrepositionsSortGame` | `src/features/kangur/ui/components/EnglishPrepositionsSortGame.tsx` | 2 | 2 | no | yes |
| 19 | `EnglishPronounsGame` | `src/features/kangur/ui/components/EnglishPronounsGame.tsx` | 2 | 2 | no | yes |
| 20 | `EnglishPronounsWarmupGame` | `src/features/kangur/ui/components/EnglishPronounsWarmupGame.tsx` | 2 | 2 | no | yes |
| 21 | `EnglishSentenceStructureGame` | `src/features/kangur/ui/components/EnglishSentenceStructureGame.tsx` | 2 | 2 | no | yes |
| 22 | `EnglishSubjectVerbAgreementGame` | `src/features/kangur/ui/components/EnglishSubjectVerbAgreementGame.tsx` | 2 | 2 | no | yes |
| 23 | `KangurWidgetIntro` | `src/features/kangur/ui/design/primitives/KangurWidgetIntro.tsx` | 2 | 2 | yes | yes |
| 24 | `SignupForm` | `src/features/kangur/ui/login-page/signup-forms.tsx` | 2 | 2 | no | yes |
| 25 | `FocusModeTogglePortal` | `src/shared/ui/FocusModeTogglePortal.tsx` | 2 | 2 | no | yes |
| 26 | `KangurPublicApp` | `src/features/kangur/ui/KangurPublicApp.tsx` | 1 | 1 | no | no |
| 27 | `LoginForm` | `src/features/kangur/ui/login-page/login-forms.tsx` | 1 | 1 | no | no |
| 28 | `FrontendPublicOwnerShell` | `src/shared/components/FrontendPublicOwnerShell.tsx` | 1 | 1 | no | no |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireEmailVerification -> label` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78` |
| 2 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireEmailVerification -> description` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78` |
| 3 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireEmailVerification -> checked` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78` |
| 4 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireCaptcha -> label` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96` |
| 5 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireCaptcha -> description` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96` |
| 6 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `requireCaptcha -> checked` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96` |
| 7 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `notificationsEnabled -> label` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114` |
| 8 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `notificationsEnabled -> description` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114` |
| 9 | 78 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 3 | 2 | `notificationsEnabled -> checked` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114` |
| 10 | 72 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 11 | 72 | `HomeContentClient` | `LazyHomeFallbackContent` | 3 | 1 | `theme -> themeSettings` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:79` |
| 12 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> variant` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197` |
| 13 | 68 | `KangurNarratorSettingsPanel` | `Alert` | 2 | 2 | `narratorProbe -> title` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197` |
| 14 | 68 | `KangurParentVerificationSettingsPanel` | `Input` | 2 | 2 | `setNotificationsDisabledUntilInput -> onChange` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:132` |
| 15 | 68 | `KangurParentVerificationSettingsPanel` | `Button` | 2 | 2 | `setNotificationsDisabledUntilInput -> onClick` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:142` |
| 16 | 64 | `HomeContentClient` | `LazyCmsPageShell` | 3 | 1 | `theme -> theme` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 17 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 18 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 19 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 20 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `prevLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 21 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 22 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextDisabled -> disabled` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 23 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 24 | 62 | `ExamNavigation` | `KangurButton` | 2 | 1 | `nextLabel -> title` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 25 | 62 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 2 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:75` |
| 26 | 62 | `KangurChoiceDialog` | `KangurButton` | 2 | 1 | `onOpenChange -> onClick` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:102` |
| 27 | 58 | `KangurAiTutorSettingsPanel` | `Input` | 1 | 2 | `dailyMessageLimitInput -> value` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:171` |
| 28 | 58 | `KangurAiTutorSettingsPanel` | `Input` | 1 | 2 | `setDailyMessageLimitInput -> onChange` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:171` |
| 29 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `guestIntroMode -> value` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:189` |
| 30 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `setGuestIntroMode -> onValueChange` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:189` |
| 31 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `homeOnboardingMode -> value` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:206` |
| 32 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `setHomeOnboardingMode -> onValueChange` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:206` |
| 33 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `agentPersonaId -> value` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:229` |
| 34 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `setAgentPersonaId -> onValueChange` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:229` |
| 35 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `motionPresetId -> value` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:276` |
| 36 | 58 | `KangurAiTutorSettingsPanel` | `SelectSimple` | 1 | 2 | `setMotionPresetId -> onValueChange` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:276` |
| 37 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `onCopyTemplateText -> onClick` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:167` |
| 38 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `onProbeNarrator -> onClick` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:175` |
| 39 | 58 | `KangurNarratorSettingsPanel` | `Button` | 1 | 2 | `isProbingNarrator -> disabled` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:175` |
| 40 | 58 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 1 | 2 | `setRequireEmailVerification -> onCheckedChange` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78` |
| 41 | 58 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 1 | 2 | `setRequireCaptcha -> onCheckedChange` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96` |
| 42 | 58 | `KangurParentVerificationSettingsPanel` | `ToggleRow` | 1 | 2 | `setNotificationsEnabled -> onCheckedChange` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114` |
| 43 | 58 | `KangurParentVerificationSettingsPanel` | `Input` | 1 | 2 | `notificationsDisabledUntilInput -> value` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:132` |
| 44 | 58 | `KangurParentVerificationSettingsPanel` | `Input` | 1 | 2 | `resendCooldownInput -> value` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:162` |
| 45 | 58 | `KangurParentVerificationSettingsPanel` | `Input` | 1 | 2 | `setResendCooldownInput -> onChange` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:162` |
| 46 | 58 | `FrontendPublicOwnerShell` | `KangurStorefrontAppearanceProvider` | 1 | 2 | `kangurInitialMode -> initialMode` | `src/shared/components/FrontendPublicOwnerShell.tsx:31` |
| 47 | 54 | `HomeContentClient` | `LazyCmsPageShell` | 2 | 1 | `colorSchemes -> colorSchemes` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 48 | 54 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 2 | 1 | `colorSchemes -> colorSchemes` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |
| 49 | 54 | `HomeFallbackContent` | `HomeFallbackHeader` | 2 | 1 | `appearanceTone -> appearanceTone` | `src/features/cms/components/frontend/home/home-fallback-content.tsx:131` |
| 50 | 54 | `HomeFallbackContent` | `HomeFallbackHero` | 2 | 1 | `appearanceTone -> appearanceTone` | `src/features/cms/components/frontend/home/home-fallback-content.tsx:134` |
| 51 | 54 | `PasswordInput` | `Input` | 2 | 1 | `disabled -> disabled` | `src/shared/ui/password-input.tsx:33` |
| 52 | 54 | `PasswordInput` | `Button` | 2 | 1 | `disabled -> disabled` | `src/shared/ui/password-input.tsx:40` |
| 53 | 52 | `ExamNavigation` | `KangurButton` | 1 | 1 | `onPrev -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:36` |
| 54 | 52 | `ExamNavigation` | `KangurButton` | 1 | 1 | `onNext -> onClick` | `src/features/kangur/ui/components/ExamNavigation.tsx:49` |
| 55 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressTestId -> data-testid` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 56 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressAriaLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 57 | 52 | `ExamNavigation` | `KangurStatusChip` | 1 | 1 | `progressLabel -> aria-label` | `src/features/kangur/ui/components/ExamNavigation.tsx:65` |
| 58 | 52 | `KangurChoiceDialog` | `KangurPanelCloseButton` | 1 | 1 | `closeAriaLabel -> aria-label` | `src/features/kangur/ui/components/KangurChoiceDialog.tsx:75` |
| 59 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `active -> aria-current` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 60 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `ariaLabel -> aria-label` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 61 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `docId -> data-doc-id` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 62 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `transitionActive -> data-nav-state` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 63 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `testId -> data-testid` | `src/features/kangur/ui/components/KangurNavAction.tsx:52` |
| 64 | 52 | `KangurNavAction` | `KangurButton` | 1 | 1 | `elementRef -> ref` | `src/features/kangur/ui/components/KangurNavAction.tsx:78` |
| 65 | 52 | `KangurLessonVisual` | `KangurLessonCallout` | 1 | 1 | `center -> className` | `src/features/kangur/ui/design/lesson-primitives.tsx:177` |
| 66 | 52 | `LoginForm` | `KangurButton` | 1 | 1 | `isLoading -> disabled` | `src/features/kangur/ui/login-page/login-forms.tsx:119` |
| 67 | 52 | `SignupForm` | `KangurButton` | 1 | 1 | `isLoading -> disabled` | `src/features/kangur/ui/login-page/signup-forms.tsx:116` |
| 68 | 52 | `SignupForm` | `KangurButton` | 1 | 1 | `isCaptchaRequired -> disabled` | `src/features/kangur/ui/login-page/signup-forms.tsx:116` |
| 69 | 52 | `FrontendLayoutClient` | `LazyCmsStorefrontAppearanceProvider` | 1 | 1 | `storefrontAppearanceMode -> initialMode` | `src/shared/components/FrontendLayoutClient.tsx:41` |
| 70 | 52 | `FocusModeTogglePortal` | `Button` | 1 | 1 | `onToggleFocusMode -> onClick` | `src/shared/ui/FocusModeTogglePortal.tsx:40` |
| 71 | 50 | `KangurAiTutorSettingsPanel` | `FormSection` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurAiTutorSettingsPanel.tsx:137` |
| 72 | 50 | `KangurNarratorSettingsPanel` | `FormSection` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:70` |
| 73 | 50 | `KangurParentVerificationSettingsPanel` | `FormSection` | 1 | 2 | `className -> className` | `src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:66` |
| 74 | 50 | `DocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `enabled -> enabled` | `src/shared/ui/DocsTooltipEnhancer.tsx:22` |
| 75 | 50 | `DocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `moduleId -> moduleId` | `src/shared/ui/DocsTooltipEnhancer.tsx:22` |
| 76 | 50 | `DocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `rootId -> rootId` | `src/shared/ui/DocsTooltipEnhancer.tsx:22` |
| 77 | 50 | `DocsTooltipEnhancer` | `DocumentationTooltipEnhancer` | 1 | 2 | `fallbackDocId -> fallbackDocId` | `src/shared/ui/DocsTooltipEnhancer.tsx:22` |
| 78 | 44 | `HomeContentClient` | `LazyCmsPageShell` | 1 | 1 | `menu -> menu` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 79 | 44 | `HomeContentClient` | `LazyCmsPageShell` | 1 | 1 | `showMenu -> showMenu` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:64` |
| 80 | 44 | `HomeContentClient` | `LazyHomeCmsDefaultContent` | 1 | 1 | `hasCmsContent -> hasCmsContent` | `src/features/cms/components/frontend/home/HomeContentClient.tsx:71` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |

## Top Chain Details (Depth >= 3)

- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.

## Top Transition Details (Depth = 2)

### 1. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireEmailVerification -> label
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78

### 2. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireEmailVerification -> description
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78

### 3. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireEmailVerification -> checked
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:78

### 4. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireCaptcha -> label
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96

### 5. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireCaptcha -> description
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96

### 6. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: requireCaptcha -> checked
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:96

### 7. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: notificationsEnabled -> label
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114

### 8. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: notificationsEnabled -> description
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114

### 9. KangurParentVerificationSettingsPanel -> ToggleRow

- Score: 78
- Root fanout: 3
- Prop mapping: notificationsEnabled -> checked
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:114

### 10. HomeContentClient -> LazyHomeCmsDefaultContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:71

### 11. HomeContentClient -> LazyHomeFallbackContent

- Score: 72
- Root fanout: 3
- Prop mapping: theme -> themeSettings
- Location: src/features/cms/components/frontend/home/HomeContentClient.tsx:79

### 12. KangurNarratorSettingsPanel -> Alert

- Score: 68
- Root fanout: 2
- Prop mapping: narratorProbe -> variant
- Location: src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197

### 13. KangurNarratorSettingsPanel -> Alert

- Score: 68
- Root fanout: 2
- Prop mapping: narratorProbe -> title
- Location: src/features/kangur/admin/components/KangurNarratorSettingsPanel.tsx:197

### 14. KangurParentVerificationSettingsPanel -> Input

- Score: 68
- Root fanout: 2
- Prop mapping: setNotificationsDisabledUntilInput -> onChange
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:132

### 15. KangurParentVerificationSettingsPanel -> Button

- Score: 68
- Root fanout: 2
- Prop mapping: setNotificationsDisabledUntilInput -> onClick
- Location: src/features/kangur/admin/components/KangurParentVerificationSettingsPanel.tsx:142

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
