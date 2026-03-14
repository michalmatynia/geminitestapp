---
owner: 'Platform Team'
last_reviewed: '2026-03-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-14T08:14:49.249Z

## Snapshot

- Scanned source files: 4726
- JSX files scanned: 1754
- Components detected: 2755
- Components forwarding parent props (hotspot threshold): 77
- Components forwarding parent props (any): 99
- Resolved forwarded transitions: 278
- Candidate chains (depth >= 2): 278
- Candidate chains (depth >= 3): 68
- High-priority chains (depth >= 4): 21
- Unknown spread forwarding edges: 19
- Hotspot forwarding components backlog size: 77

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 69 |
| `shared-ui` | 25 |
| `feature:integrations` | 1 |
| `feature:cms` | 1 |
| `feature:products` | 1 |
| `app` | 1 |
| `feature:database` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `KangurBadgeTrackSection` | `src/features/kangur/ui/components/KangurBadgeTrackSection.tsx` | 7 | 7 | no | yes |
| 2 | `KangurPracticeGameSummaryProgress` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 6 | 6 | no | yes |
| 3 | `KangurAiTutorPanelChrome` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx` | 5 | 5 | no | yes |
| 4 | `KangurProgressHighlightHeader` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 5 | 5 | no | yes |
| 5 | `KangurRecommendationCardHeader` | `src/features/kangur/ui/components/KangurRecommendationCard.tsx` | 5 | 5 | no | yes |
| 6 | `KangurAiTutorPanelContextCard` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx` | 4 | 7 | no | yes |
| 7 | `KangurAnswerChoiceCard` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx` | 4 | 6 | yes | yes |
| 8 | `KangurBadgeTrackPlaceholderCard` | `src/features/kangur/ui/components/KangurBadgeTrackPlaceholderCard.tsx` | 4 | 4 | no | yes |
| 9 | `KangurBadgeTrackCardBar` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 4 | 4 | no | yes |
| 10 | `KangurDailyQuestHighlightChips` | `src/features/kangur/ui/components/KangurDailyQuestHighlightCardContent.tsx` | 4 | 4 | no | yes |
| 11 | `KangurDailyQuestHighlightBody` | `src/features/kangur/ui/components/KangurDailyQuestHighlightCardContent.tsx` | 4 | 4 | no | yes |
| 12 | `KangurHeroMilestoneSummary` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx` | 4 | 4 | no | yes |
| 13 | `KangurPracticeGameProgress` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 4 | 4 | no | yes |
| 14 | `KangurPracticeGameSummaryActions` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 4 | 4 | no | yes |
| 15 | `KangurProgressHighlightBar` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 4 | 4 | no | yes |
| 16 | `AdminSectionBreadcrumbs` | `src/shared/ui/admin-section-breadcrumbs.tsx` | 4 | 4 | no | yes |
| 17 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 7 | no | yes |
| 18 | `AllegroSubpageScaffold` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx` | 3 | 5 | no | yes |
| 19 | `AdminAgentCreatorPageLayout` | `src/shared/ui/admin-agent-creator-page-layout.tsx` | 3 | 5 | yes | yes |
| 20 | `AdminChatbotPageLayout` | `src/shared/ui/admin-chatbot-page-layout.tsx` | 3 | 5 | yes | yes |
| 21 | `AdminIntegrationsPageLayout` | `src/shared/ui/admin-integrations-page-layout.tsx` | 3 | 5 | yes | yes |
| 22 | `CmsPageShellFrame` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no | yes |
| 23 | `CreateThemeDialog` | `src/features/kangur/admin/AdminKangurAppearancePage.tsx` | 3 | 3 | no | yes |
| 24 | `KangurActivitySummaryCard` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx` | 3 | 3 | no | yes |
| 25 | `KangurBadgeTrackCardHeader` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 3 | 3 | no | yes |
| 26 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 3 | 3 | no | yes |
| 27 | `KangurLabeledValueSummary` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx` | 3 | 3 | no | yes |
| 28 | `KangurPanelSectionHeading` | `src/features/kangur/ui/components/KangurPanelSectionHeading.tsx` | 3 | 3 | yes | yes |
| 29 | `KangurPracticeGameSummaryBreakdown` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 3 | 3 | no | yes |
| 30 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 3 | 3 | no | yes |
| 31 | `KangurSessionHistoryAside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx` | 3 | 3 | no | yes |
| 32 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 3 | 3 | no | yes |
| 33 | `TrainingSetup` | `src/features/kangur/ui/components/TrainingSetup.tsx` | 3 | 3 | no | yes |
| 34 | `KangurFeatureHeader` | `src/features/kangur/ui/design/primitives/KangurFeatureHeader.tsx` | 3 | 3 | yes | yes |
| 35 | `AdminAgentCreatorBreadcrumbs` | `src/shared/ui/admin-agent-creator-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 36 | `AdminAgentTeachingBreadcrumbs` | `src/shared/ui/admin-agent-teaching-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 37 | `AdminAiPathsBreadcrumbs` | `src/shared/ui/admin-ai-paths-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 38 | `AdminCaseResolverBreadcrumbs` | `src/shared/ui/admin-case-resolver-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 39 | `AdminChatbotBreadcrumbs` | `src/shared/ui/admin-chatbot-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 40 | `AdminCmsBreadcrumbs` | `src/shared/ui/admin-cms-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 41 | `AdminDatabaseBreadcrumbs` | `src/shared/ui/admin-database-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 42 | `AdminFilemakerBreadcrumbs` | `src/shared/ui/admin-filemaker-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 43 | `AdminIntegrationsBreadcrumbs` | `src/shared/ui/admin-integrations-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 44 | `AdminNotesBreadcrumbs` | `src/shared/ui/admin-notes-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 45 | `AdminProductsBreadcrumbs` | `src/shared/ui/admin-products-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 46 | `NavigationCard` | `src/shared/ui/navigation-card.tsx` | 3 | 3 | no | yes |
| 47 | `AdminAgentTeachingPageLayout` | `src/shared/ui/admin-agent-teaching-page-layout.tsx` | 2 | 4 | yes | yes |
| 48 | `AdminCaseResolverPageLayout` | `src/shared/ui/admin-case-resolver-page-layout.tsx` | 2 | 4 | yes | yes |
| 49 | `AdminCmsPageLayout` | `src/shared/ui/admin-cms-page-layout.tsx` | 2 | 4 | yes | yes |
| 50 | `AdminDatabasePageLayout` | `src/shared/ui/admin-database-page-layout.tsx` | 2 | 4 | yes | yes |
| 51 | `AdminNotesPageLayout` | `src/shared/ui/admin-notes-page-layout.tsx` | 2 | 4 | yes | yes |
| 52 | `AdminProductsPageLayout` | `src/shared/ui/admin-products-page-layout.tsx` | 2 | 4 | yes | yes |
| 53 | `KangurAdminStatusCard` | `src/features/kangur/admin/components/KangurAdminStatusCard.tsx` | 2 | 2 | no | yes |
| 54 | `ClockTrainingGame` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 2 | 2 | no | yes |
| 55 | `KangurAiTutorWarmOverlayPanel` | `src/features/kangur/ui/components/KangurAiTutorChrome.tsx` | 2 | 2 | yes | yes |
| 56 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 2 | 2 | no | yes |
| 57 | `KangurAssignmentPriorityChip` | `src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx` | 2 | 2 | yes | yes |
| 58 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 59 | `KangurBadgeTrackSectionHeader` | `src/features/kangur/ui/components/KangurBadgeTrackSection.tsx` | 2 | 2 | no | yes |
| 60 | `KangurBadgeTrackSummaryCard` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 2 | 2 | no | yes |
| 61 | `KangurResultSectionCard` | `src/features/kangur/ui/components/KangurGameResultWidget.tsx` | 2 | 2 | no | yes |
| 62 | `KangurIconSummaryOptionCard` | `src/features/kangur/ui/components/KangurIconSummaryOptionCard.tsx` | 2 | 2 | yes | yes |
| 63 | `KangurLessonLibraryCardAside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx` | 2 | 2 | no | yes |
| 64 | `KangurLessonLibraryCardIcon` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx` | 2 | 2 | no | yes |
| 65 | `KangurLessonNavigationWidget` | `src/features/kangur/ui/components/KangurLessonNavigationWidget.tsx` | 2 | 2 | no | yes |
| 66 | `KangurPracticeGameSummaryEmoji` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 2 | 2 | no | yes |
| 67 | `KangurProgressHighlightChip` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 2 | 2 | no | yes |
| 68 | `KangurSessionHistoryIcon` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx` | 2 | 2 | no | yes |
| 69 | `KangurPanelIntro` | `src/features/kangur/ui/design/primitives/KangurPanelIntro.tsx` | 2 | 2 | no | yes |
| 70 | `AdminSettingsBreadcrumbs` | `src/shared/ui/admin-settings-breadcrumbs.tsx` | 2 | 2 | no | yes |
| 71 | `KangurAssignmentManager` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1 | 7 | no | yes |
| 72 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 3 | no | yes |
| 73 | `ProductCard` | `src/features/products/components/ProductCard.tsx` | 1 | 3 | no | yes |
| 74 | `AdminSettingsPageLayout` | `src/shared/ui/admin-settings-page-layout.tsx` | 1 | 2 | yes | yes |
| 75 | `HomeFallbackContent` | `src/app/(frontend)/home-fallback-content.tsx` | 1 | 1 | no | no |
| 76 | `ProviderBadge` | `src/features/database/components/ControlPanelColumns.tsx` | 1 | 1 | no | no |
| 77 | `KangurAiTutorNativeGuideEntryEditor` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx` | 1 | 1 | no | no |
| 78 | `KangurAiTutorNativeGuideEntryEditorContent` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx` | 1 | 1 | no | no |
| 79 | `KangurAiTutorNativeGuideEntryList` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryList.tsx` | 1 | 1 | no | no |
| 80 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 81 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 82 | `DivisionGame` | `src/features/kangur/ui/components/DivisionGame.tsx` | 1 | 1 | no | no |
| 83 | `KangurAiTutorDrawingCanvas` | `src/features/kangur/ui/components/KangurAiTutorDrawingCanvas.tsx` | 1 | 1 | no | no |
| 84 | `KangurAiTutorGuidedCallout` | `src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx` | 1 | 1 | no | no |
| 85 | `KangurAnimatedOptionCard` | `src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx` | 1 | 1 | yes | yes |
| 86 | `KangurBadgeTrackGrid` | `src/features/kangur/ui/components/KangurBadgeTrackGrid.tsx` | 1 | 1 | no | no |
| 87 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 1 | no | no |
| 88 | `KangurGameSetupMomentumCard` | `src/features/kangur/ui/components/KangurGameSetupMomentumCard.tsx` | 1 | 1 | no | no |
| 89 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 90 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 91 | `KangurPracticeGameSummaryXP` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 1 | 1 | no | no |
| 92 | `KangurSetupShell` | `src/features/kangur/ui/components/KangurSetup.tsx` | 1 | 1 | no | no |
| 93 | `KangurSetupChoiceCard` | `src/features/kangur/ui/components/KangurSetup.tsx` | 1 | 1 | yes | yes |
| 94 | `KangurTestChoiceCardBadge` | `src/features/kangur/ui/components/KangurTestChoiceCard.tsx` | 1 | 1 | no | no |
| 95 | `KangurTestSuitePlayer` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 1 | 1 | no | no |
| 96 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 97 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 98 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 99 | `AdminWidePageLayout` | `src/shared/ui/admin-wide-page-layout.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> action` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 2 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> description` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 3 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> footer` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 4 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> progressLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 5 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> questLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 6 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> rewardLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 7 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> title` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:441` |
| 8 | 92 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 5 | 1 | `showAnswer -> description` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156` |
| 9 | 92 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 5 | 1 | `showAnswer -> title` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156` |
| 10 | 92 | `KangurTestQuestionRenderer` | `KangurAnswerChoiceCard` | 5 | 1 | `showAnswer -> interactive` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:232` |
| 11 | 84 | `KangurTestQuestionRenderer` | `KangurTestChoiceCard` | 5 | 1 | `showAnswer -> showAnswer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:223` |
| 12 | 84 | `KangurTestQuestionRenderer` | `KangurTestChoiceCardFeedback` | 5 | 1 | `showAnswer -> showAnswer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:247` |
| 13 | 78 | `ProductCard` | `ResourceCard` | 3 | 2 | `className -> media` | `src/features/products/components/ProductCard.tsx:35` |
| 14 | 78 | `ProductCard` | `ResourceCard` | 3 | 2 | `className -> footer` | `src/features/products/components/ProductCard.tsx:35` |
| 15 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> buttonClassName` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 16 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> whileHover` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 17 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> whileTap` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 18 | 72 | `ProgressOverview` | `KangurProgressHighlightHeader` | 3 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/ProgressOverview.tsx:136` |
| 19 | 72 | `ProgressOverview` | `KangurProgressHighlightHeader` | 3 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/ProgressOverview.tsx:136` |
| 20 | 72 | `ProgressOverview` | `KangurProgressHighlightChip` | 3 | 1 | `dailyQuest -> label` | `src/features/kangur/ui/components/ProgressOverview.tsx:142` |
| 21 | 70 | `ProductCard` | `ResourceCard` | 3 | 2 | `className -> className` | `src/features/products/components/ProductCard.tsx:35` |
| 22 | 68 | `AllegroSubpageScaffold` | `AdminIntegrationsPageLayout` | 2 | 2 | `title -> current` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22` |
| 23 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> title` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:30` |
| 24 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> description` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:30` |
| 25 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 26 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 27 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 28 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 29 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 30 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> tone` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 31 | 62 | `AdminAgentCreatorPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-agent-creator-page-layout.tsx:23` |
| 32 | 62 | `AdminAgentCreatorPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-agent-creator-page-layout.tsx:23` |
| 33 | 62 | `AdminAgentTeachingPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-agent-teaching-page-layout.tsx:22` |
| 34 | 62 | `AdminAgentTeachingPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-agent-teaching-page-layout.tsx:22` |
| 35 | 62 | `AdminCaseResolverPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-case-resolver-page-layout.tsx:22` |
| 36 | 62 | `AdminCaseResolverPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-case-resolver-page-layout.tsx:22` |
| 37 | 62 | `AdminChatbotPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-chatbot-page-layout.tsx:23` |
| 38 | 62 | `AdminChatbotPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-chatbot-page-layout.tsx:23` |
| 39 | 62 | `AdminCmsPageLayout` | `AdminWidePageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-cms-page-layout.tsx:22` |
| 40 | 62 | `AdminCmsPageLayout` | `AdminWidePageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-cms-page-layout.tsx:22` |
| 41 | 62 | `AdminDatabasePageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-database-page-layout.tsx:22` |
| 42 | 62 | `AdminDatabasePageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-database-page-layout.tsx:22` |
| 43 | 62 | `AdminIntegrationsPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-integrations-page-layout.tsx:23` |
| 44 | 62 | `AdminIntegrationsPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-integrations-page-layout.tsx:23` |
| 45 | 62 | `AdminNotesPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-notes-page-layout.tsx:22` |
| 46 | 62 | `AdminNotesPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-notes-page-layout.tsx:22` |
| 47 | 62 | `AdminProductsPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-products-page-layout.tsx:22` |
| 48 | 62 | `AdminProductsPageLayout` | `PageLayout` | 2 | 1 | `parent -> eyebrow` | `src/shared/ui/admin-products-page-layout.tsx:22` |
| 49 | 62 | `AdminSettingsPageLayout` | `PageLayout` | 2 | 1 | `current -> eyebrow` | `src/shared/ui/admin-settings-page-layout.tsx:14` |
| 50 | 60 | `AllegroSubpageScaffold` | `AdminIntegrationsPageLayout` | 2 | 2 | `title -> title` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22` |
| 51 | 58 | `HomeFallbackContent` | `CmsStorefrontAppearanceButtons` | 1 | 2 | `appearanceTone -> tone` | `src/app/(frontend)/home-fallback-content.tsx:282` |
| 52 | 58 | `ProviderBadge` | `StatusBadge` | 1 | 2 | `count -> status` | `src/features/database/components/ControlPanelColumns.tsx:22` |
| 53 | 58 | `KangurAdminStatusCard` | `Card` | 1 | 2 | `sticky -> className` | `src/features/kangur/admin/components/KangurAdminStatusCard.tsx:31` |
| 54 | 54 | `AdminAgentCreatorPageLayout` | `AdminAgentCreatorBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-agent-creator-page-layout.tsx:24` |
| 55 | 54 | `AdminAgentCreatorPageLayout` | `AdminAgentCreatorBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-agent-creator-page-layout.tsx:24` |
| 56 | 54 | `AdminAgentTeachingPageLayout` | `AdminAgentTeachingBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-agent-teaching-page-layout.tsx:24` |
| 57 | 54 | `AdminAgentTeachingPageLayout` | `AdminAgentTeachingBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-agent-teaching-page-layout.tsx:24` |
| 58 | 54 | `AdminCaseResolverPageLayout` | `AdminCaseResolverBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-case-resolver-page-layout.tsx:24` |
| 59 | 54 | `AdminCaseResolverPageLayout` | `AdminCaseResolverBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-case-resolver-page-layout.tsx:24` |
| 60 | 54 | `AdminChatbotPageLayout` | `AdminChatbotBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-chatbot-page-layout.tsx:24` |
| 61 | 54 | `AdminChatbotPageLayout` | `AdminChatbotBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-chatbot-page-layout.tsx:24` |
| 62 | 54 | `AdminCmsPageLayout` | `AdminCmsBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-cms-page-layout.tsx:23` |
| 63 | 54 | `AdminCmsPageLayout` | `AdminCmsBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-cms-page-layout.tsx:23` |
| 64 | 54 | `AdminDatabasePageLayout` | `AdminDatabaseBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-database-page-layout.tsx:23` |
| 65 | 54 | `AdminDatabasePageLayout` | `AdminDatabaseBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-database-page-layout.tsx:23` |
| 66 | 54 | `AdminIntegrationsPageLayout` | `AdminIntegrationsBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-integrations-page-layout.tsx:24` |
| 67 | 54 | `AdminIntegrationsPageLayout` | `AdminIntegrationsBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-integrations-page-layout.tsx:24` |
| 68 | 54 | `AdminNotesPageLayout` | `AdminNotesBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-notes-page-layout.tsx:23` |
| 69 | 54 | `AdminNotesPageLayout` | `AdminNotesBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-notes-page-layout.tsx:23` |
| 70 | 54 | `AdminProductsPageLayout` | `AdminProductsBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-products-page-layout.tsx:23` |
| 71 | 54 | `AdminProductsPageLayout` | `AdminProductsBreadcrumbs` | 2 | 1 | `parent -> parent` | `src/shared/ui/admin-products-page-layout.tsx:23` |
| 72 | 54 | `AdminSettingsPageLayout` | `AdminSettingsBreadcrumbs` | 2 | 1 | `current -> current` | `src/shared/ui/admin-settings-page-layout.tsx:14` |
| 73 | 52 | `CalendarInteractiveGame` | `KangurPracticeGameSummary` | 1 | 1 | `section -> message` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx:417` |
| 74 | 52 | `ClockTrainingGame` | `KangurPracticeGameSummary` | 1 | 1 | `completionPrimaryActionLabel -> finishLabel` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:1323` |
| 75 | 52 | `ClockTrainingGame` | `KangurPracticeGameSummary` | 1 | 1 | `section -> message` | `src/features/kangur/ui/components/ClockTrainingGame.tsx:1323` |
| 76 | 52 | `KangurActivitySummaryCard` | `KangurInfoCard` | 1 | 1 | `dataTestId -> data-testid` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:31` |
| 77 | 52 | `KangurActivitySummaryCard` | `KangurSectionEyebrow` | 1 | 1 | `eyebrowClassName -> className` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:38` |
| 78 | 52 | `KangurActivitySummaryCard` | `KangurCardDescription` | 1 | 1 | `descriptionClassName -> className` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx:43` |
| 79 | 52 | `KangurAiTutorWarmOverlayPanel` | `KangurGlassPanel` | 1 | 1 | `tone -> className` | `src/features/kangur/ui/components/KangurAiTutorChrome.tsx:145` |
| 80 | 52 | `KangurAiTutorDrawingCanvas` | `KangurButton` | 1 | 1 | `onCancel -> onClick` | `src/features/kangur/ui/components/KangurAiTutorDrawingCanvas.tsx:306` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 201 | 5 | `AllegroSubpageScaffold` | `Breadcrumbs` | 2 | 2 | `title -> current -> current -> current -> items` |
| 2 | 186 | 4 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 5 | 1 | `showAnswer -> interactive -> buttonClassName -> className` |
| 3 | 162 | 4 | `AllegroSubpageScaffold` | `AdminSectionBreadcrumbs` | 2 | 2 | `title -> current -> current -> current` |
| 4 | 156 | 4 | `AdminAgentCreatorPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 5 | 156 | 4 | `AdminAgentCreatorPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 6 | 156 | 4 | `AdminAgentTeachingPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 7 | 156 | 4 | `AdminAgentTeachingPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 8 | 156 | 4 | `AdminCaseResolverPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 9 | 156 | 4 | `AdminCaseResolverPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 10 | 156 | 4 | `AdminChatbotPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 11 | 156 | 4 | `AdminChatbotPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 12 | 156 | 4 | `AdminCmsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 13 | 156 | 4 | `AdminCmsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 14 | 156 | 4 | `AdminDatabasePageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 15 | 156 | 4 | `AdminDatabasePageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 16 | 156 | 4 | `AdminIntegrationsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 17 | 156 | 4 | `AdminNotesPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 18 | 156 | 4 | `AdminNotesPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 19 | 156 | 4 | `AdminProductsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 20 | 156 | 4 | `AdminProductsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 21 | 156 | 4 | `AdminSettingsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 22 | 123 | 3 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 5 | 1 | `showAnswer -> interactive -> buttonClassName` |
| 23 | 123 | 3 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 5 | 1 | `showAnswer -> interactive -> whileHover` |
| 24 | 123 | 3 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 5 | 1 | `showAnswer -> interactive -> whileTap` |
| 25 | 99 | 3 | `AllegroSubpageScaffold` | `PageLayout` | 2 | 2 | `title -> current -> eyebrow` |
| 26 | 99 | 3 | `AllegroSubpageScaffold` | `AdminIntegrationsBreadcrumbs` | 2 | 2 | `title -> current -> current` |
| 27 | 93 | 3 | `AdminAgentCreatorPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 28 | 93 | 3 | `AdminAgentCreatorPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 29 | 93 | 3 | `AdminAgentTeachingPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 30 | 93 | 3 | `AdminAgentTeachingPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 31 | 93 | 3 | `AdminCaseResolverPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 32 | 93 | 3 | `AdminCaseResolverPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 33 | 93 | 3 | `AdminChatbotPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 34 | 93 | 3 | `AdminChatbotPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 35 | 93 | 3 | `AdminCmsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 36 | 93 | 3 | `AdminCmsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 37 | 93 | 3 | `AdminDatabasePageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 38 | 93 | 3 | `AdminDatabasePageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 39 | 93 | 3 | `AdminIntegrationsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 40 | 93 | 3 | `AdminNotesPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 41 | 93 | 3 | `AdminNotesPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 42 | 93 | 3 | `AdminProductsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 43 | 93 | 3 | `AdminProductsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 44 | 93 | 3 | `AdminSettingsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 45 | 89 | 3 | `KangurAiTutorNativeGuideEntryEditor` | `Card` | 1 | 2 | `className -> className -> className` |
| 46 | 83 | 3 | `KangurAnswerChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `buttonClassName -> buttonClassName -> className` |
| 47 | 83 | 3 | `KangurBadgeTrackSection` | `KangurSectionEyebrow` | 1 | 1 | `headingClassName -> className -> className` |
| 48 | 83 | 3 | `KangurBadgeTrackSection` | `KangurSectionEyebrow` | 1 | 1 | `headingAs -> headingAs -> as` |
| 49 | 83 | 3 | `KangurBadgeTrackSection` | `KangurCardDescription` | 1 | 1 | `emptyTestId -> emptyTestId -> data-testid` |
| 50 | 83 | 3 | `KangurLessonLibraryCardAside` | `KangurStatusChip` | 1 | 1 | `lessonAssignment -> priority -> accent` |
| 51 | 83 | 3 | `KangurSetupChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `buttonClassName -> buttonClassName -> className` |
| 52 | 83 | 3 | `KangurTestSuitePlayer` | `KangurTestChoiceCard` | 1 | 1 | `suite -> contentId -> contentId` |
| 53 | 83 | 3 | `AdminAgentCreatorBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 54 | 83 | 3 | `AdminAgentTeachingBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 55 | 83 | 3 | `AdminAiPathsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `parent -> parent -> items` |
| 56 | 83 | 3 | `AdminAiPathsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `current -> current -> items` |
| 57 | 83 | 3 | `AdminAiPathsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 58 | 83 | 3 | `AdminCaseResolverBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 59 | 83 | 3 | `AdminChatbotBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 60 | 83 | 3 | `AdminCmsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 61 | 83 | 3 | `AdminDatabaseBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 62 | 83 | 3 | `AdminFilemakerBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `parent -> parent -> items` |
| 63 | 83 | 3 | `AdminFilemakerBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `current -> current -> items` |
| 64 | 83 | 3 | `AdminFilemakerBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 65 | 83 | 3 | `AdminIntegrationsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 66 | 83 | 3 | `AdminNotesBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 67 | 83 | 3 | `AdminProductsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |
| 68 | 83 | 3 | `AdminSettingsBreadcrumbs` | `Breadcrumbs` | 1 | 1 | `className -> className -> className` |

## Top Chain Details (Depth >= 3)

### 1. AllegroSubpageScaffold -> Breadcrumbs

- Score: 201
- Depth: 5
- Root fanout: 2
- Prop path: title -> current -> current -> current -> items
- Component path:
  - `AllegroSubpageScaffold` (src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx)
  - `AdminIntegrationsPageLayout` (src/shared/ui/admin-integrations-page-layout.tsx)
  - `AdminIntegrationsBreadcrumbs` (src/shared/ui/admin-integrations-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AllegroSubpageScaffold` -> `AdminIntegrationsPageLayout`: `title` -> `current` at src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22
  - `AdminIntegrationsPageLayout` -> `AdminIntegrationsBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-integrations-page-layout.tsx:24
  - `AdminIntegrationsBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-integrations-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 2. KangurTestQuestionRenderer -> KangurOptionCardButton

- Score: 186
- Depth: 4
- Root fanout: 5
- Prop path: showAnswer -> interactive -> buttonClassName -> className
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurAnimatedOptionCard` (src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx)
  - `KangurOptionCardButton` (src/features/kangur/ui/design/primitives/KangurOptionCardButton.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:232
  - `KangurAnswerChoiceCard` -> `KangurAnimatedOptionCard`: `interactive` -> `buttonClassName` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28
  - `KangurAnimatedOptionCard` -> `KangurOptionCardButton`: `buttonClassName` -> `className` at src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx:41

### 3. AllegroSubpageScaffold -> AdminSectionBreadcrumbs

- Score: 162
- Depth: 4
- Root fanout: 2
- Prop path: title -> current -> current -> current
- Component path:
  - `AllegroSubpageScaffold` (src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx)
  - `AdminIntegrationsPageLayout` (src/shared/ui/admin-integrations-page-layout.tsx)
  - `AdminIntegrationsBreadcrumbs` (src/shared/ui/admin-integrations-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
- Transition lines:
  - `AllegroSubpageScaffold` -> `AdminIntegrationsPageLayout`: `title` -> `current` at src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22
  - `AdminIntegrationsPageLayout` -> `AdminIntegrationsBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-integrations-page-layout.tsx:24
  - `AdminIntegrationsBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-integrations-breadcrumbs.tsx:22

### 4. AdminAgentCreatorPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminAgentCreatorPageLayout` (src/shared/ui/admin-agent-creator-page-layout.tsx)
  - `AdminAgentCreatorBreadcrumbs` (src/shared/ui/admin-agent-creator-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminAgentCreatorPageLayout` -> `AdminAgentCreatorBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-agent-creator-page-layout.tsx:24
  - `AdminAgentCreatorBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-agent-creator-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 5. AdminAgentCreatorPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminAgentCreatorPageLayout` (src/shared/ui/admin-agent-creator-page-layout.tsx)
  - `AdminAgentCreatorBreadcrumbs` (src/shared/ui/admin-agent-creator-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminAgentCreatorPageLayout` -> `AdminAgentCreatorBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-agent-creator-page-layout.tsx:24
  - `AdminAgentCreatorBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-agent-creator-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 6. AdminAgentTeachingPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminAgentTeachingPageLayout` (src/shared/ui/admin-agent-teaching-page-layout.tsx)
  - `AdminAgentTeachingBreadcrumbs` (src/shared/ui/admin-agent-teaching-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminAgentTeachingPageLayout` -> `AdminAgentTeachingBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-agent-teaching-page-layout.tsx:24
  - `AdminAgentTeachingBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-agent-teaching-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 7. AdminAgentTeachingPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminAgentTeachingPageLayout` (src/shared/ui/admin-agent-teaching-page-layout.tsx)
  - `AdminAgentTeachingBreadcrumbs` (src/shared/ui/admin-agent-teaching-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminAgentTeachingPageLayout` -> `AdminAgentTeachingBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-agent-teaching-page-layout.tsx:24
  - `AdminAgentTeachingBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-agent-teaching-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 8. AdminCaseResolverPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminCaseResolverPageLayout` (src/shared/ui/admin-case-resolver-page-layout.tsx)
  - `AdminCaseResolverBreadcrumbs` (src/shared/ui/admin-case-resolver-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminCaseResolverPageLayout` -> `AdminCaseResolverBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-case-resolver-page-layout.tsx:24
  - `AdminCaseResolverBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-case-resolver-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 9. AdminCaseResolverPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminCaseResolverPageLayout` (src/shared/ui/admin-case-resolver-page-layout.tsx)
  - `AdminCaseResolverBreadcrumbs` (src/shared/ui/admin-case-resolver-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminCaseResolverPageLayout` -> `AdminCaseResolverBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-case-resolver-page-layout.tsx:24
  - `AdminCaseResolverBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-case-resolver-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 10. AdminChatbotPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminChatbotPageLayout` (src/shared/ui/admin-chatbot-page-layout.tsx)
  - `AdminChatbotBreadcrumbs` (src/shared/ui/admin-chatbot-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminChatbotPageLayout` -> `AdminChatbotBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-chatbot-page-layout.tsx:24
  - `AdminChatbotBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-chatbot-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 11. AdminChatbotPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminChatbotPageLayout` (src/shared/ui/admin-chatbot-page-layout.tsx)
  - `AdminChatbotBreadcrumbs` (src/shared/ui/admin-chatbot-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminChatbotPageLayout` -> `AdminChatbotBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-chatbot-page-layout.tsx:24
  - `AdminChatbotBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-chatbot-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 12. AdminCmsPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminCmsPageLayout` (src/shared/ui/admin-cms-page-layout.tsx)
  - `AdminCmsBreadcrumbs` (src/shared/ui/admin-cms-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminCmsPageLayout` -> `AdminCmsBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-cms-page-layout.tsx:23
  - `AdminCmsBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-cms-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 13. AdminCmsPageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminCmsPageLayout` (src/shared/ui/admin-cms-page-layout.tsx)
  - `AdminCmsBreadcrumbs` (src/shared/ui/admin-cms-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminCmsPageLayout` -> `AdminCmsBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-cms-page-layout.tsx:23
  - `AdminCmsBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-cms-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 14. AdminDatabasePageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: current -> current -> current -> items
- Component path:
  - `AdminDatabasePageLayout` (src/shared/ui/admin-database-page-layout.tsx)
  - `AdminDatabaseBreadcrumbs` (src/shared/ui/admin-database-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminDatabasePageLayout` -> `AdminDatabaseBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-database-page-layout.tsx:23
  - `AdminDatabaseBreadcrumbs` -> `AdminSectionBreadcrumbs`: `current` -> `current` at src/shared/ui/admin-database-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `current` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

### 15. AdminDatabasePageLayout -> Breadcrumbs

- Score: 156
- Depth: 4
- Root fanout: 2
- Prop path: parent -> parent -> parent -> items
- Component path:
  - `AdminDatabasePageLayout` (src/shared/ui/admin-database-page-layout.tsx)
  - `AdminDatabaseBreadcrumbs` (src/shared/ui/admin-database-breadcrumbs.tsx)
  - `AdminSectionBreadcrumbs` (src/shared/ui/admin-section-breadcrumbs.tsx)
  - `Breadcrumbs` (src/shared/ui/Breadcrumbs.tsx)
- Transition lines:
  - `AdminDatabasePageLayout` -> `AdminDatabaseBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-database-page-layout.tsx:23
  - `AdminDatabaseBreadcrumbs` -> `AdminSectionBreadcrumbs`: `parent` -> `parent` at src/shared/ui/admin-database-breadcrumbs.tsx:22
  - `AdminSectionBreadcrumbs` -> `Breadcrumbs`: `parent` -> `items` at src/shared/ui/admin-section-breadcrumbs.tsx:24

## Top Transition Details (Depth = 2)

### 1. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> action
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 2. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> description
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 3. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> footer
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 4. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> progressLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 5. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> questLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 6. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> rewardLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 7. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> title
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:441

### 8. KangurTestQuestionRenderer -> KangurPanelIntro

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> description
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156

### 9. KangurTestQuestionRenderer -> KangurPanelIntro

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> title
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:156

### 10. KangurTestQuestionRenderer -> KangurAnswerChoiceCard

- Score: 92
- Root fanout: 5
- Prop mapping: showAnswer -> interactive
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:232

### 11. KangurTestQuestionRenderer -> KangurTestChoiceCard

- Score: 84
- Root fanout: 5
- Prop mapping: showAnswer -> showAnswer
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:223

### 12. KangurTestQuestionRenderer -> KangurTestChoiceCardFeedback

- Score: 84
- Root fanout: 5
- Prop mapping: showAnswer -> showAnswer
- Location: src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:247

### 13. ProductCard -> ResourceCard

- Score: 78
- Root fanout: 3
- Prop mapping: className -> media
- Location: src/features/products/components/ProductCard.tsx:35

### 14. ProductCard -> ResourceCard

- Score: 78
- Root fanout: 3
- Prop mapping: className -> footer
- Location: src/features/products/components/ProductCard.tsx:35

### 15. KangurAnswerChoiceCard -> KangurAnimatedOptionCard

- Score: 72
- Root fanout: 3
- Prop mapping: interactive -> buttonClassName
- Location: src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
