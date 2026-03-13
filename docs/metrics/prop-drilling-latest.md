---
owner: 'Platform Team'
last_reviewed: '2026-03-13'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Prop Drilling Scan

Generated at: 2026-03-13T22:20:14.005Z

## Snapshot

- Scanned source files: 4712
- JSX files scanned: 1742
- Components detected: 2719
- Components forwarding parent props (hotspot threshold): 70
- Components forwarding parent props (any): 89
- Resolved forwarded transitions: 409
- Candidate chains (depth >= 2): 409
- Candidate chains (depth >= 3): 108
- High-priority chains (depth >= 4): 26
- Unknown spread forwarding edges: 18
- Hotspot forwarding components backlog size: 70

## Hot Features

| Feature Scope | Forwarding Components |
| --- | ---: |
| `feature:kangur` | 60 |
| `shared-ui` | 25 |
| `feature:integrations` | 1 |
| `feature:cms` | 1 |
| `app` | 1 |
| `feature:database` | 1 |

## Top Prop-Drilling Components

| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | `SummaryContent` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 18 | 20 | no | yes |
| 2 | `KangurPracticeGameSummary` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 18 | 18 | no | yes |
| 3 | `KangurSessionHistoryRow` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx` | 16 | 23 | no | yes |
| 4 | `KangurIconSummaryOptionCard` | `src/features/kangur/ui/components/KangurIconSummaryOptionCard.tsx` | 15 | 15 | yes | yes |
| 5 | `KangurRecommendationCard` | `src/features/kangur/ui/components/KangurRecommendationCard.tsx` | 14 | 15 | no | yes |
| 6 | `KangurLessonLibraryCard` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx` | 12 | 21 | no | yes |
| 7 | `KangurAiTutorNativeGuideEntryEditor` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx` | 11 | 15 | no | yes |
| 8 | `KangurProgressHighlightCardContent` | `src/features/kangur/ui/components/KangurProgressHighlightCardContent.tsx` | 11 | 11 | no | yes |
| 9 | `KangurTestChoiceCard` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 9 | 9 | no | yes |
| 10 | `KnowledgeGraphQueryPreviewSection` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 8 | 13 | no | yes |
| 11 | `KangurDailyQuestHighlightCardContent` | `src/features/kangur/ui/components/KangurDailyQuestHighlightCardContent.tsx` | 8 | 8 | no | yes |
| 12 | `KnowledgeGraphStatusSection` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 7 | 14 | no | yes |
| 13 | `KangurSetupChoiceCard` | `src/features/kangur/ui/components/KangurSetup.tsx` | 7 | 9 | no | yes |
| 14 | `KangurAssignmentManagerPanel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 7 | 7 | no | yes |
| 15 | `KangurBadgeTrackSection` | `src/features/kangur/ui/components/KangurBadgeTrackSection.tsx` | 6 | 6 | no | yes |
| 16 | `KangurBadgeTrackSummaryCard` | `src/features/kangur/ui/components/KangurBadgeTrackSummaryCard.tsx` | 6 | 6 | no | yes |
| 17 | `KangurAiTutorPanelChrome` | `src/features/kangur/ui/components/KangurAiTutorPanelChrome.tsx` | 5 | 5 | no | yes |
| 18 | `KangurAiTutorPanelContextCard` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx` | 4 | 7 | no | yes |
| 19 | `KangurAnswerChoiceCard` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx` | 4 | 6 | yes | yes |
| 20 | `KangurBadgeTrackPlaceholderCard` | `src/features/kangur/ui/components/KangurBadgeTrackPlaceholderCard.tsx` | 4 | 4 | no | yes |
| 21 | `KangurHeroMilestoneSummary` | `src/features/kangur/ui/components/KangurHeroMilestoneSummary.tsx` | 4 | 4 | no | yes |
| 22 | `KangurPracticeGameProgress` | `src/features/kangur/ui/components/KangurPracticeGameChrome.tsx` | 4 | 4 | no | yes |
| 23 | `AdminSectionBreadcrumbs` | `src/shared/ui/admin-section-breadcrumbs.tsx` | 4 | 4 | no | yes |
| 24 | `AllegroSubpageScaffold` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx` | 3 | 5 | no | yes |
| 25 | `KangurTestQuestionRenderer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx` | 3 | 5 | no | yes |
| 26 | `AdminAgentCreatorPageLayout` | `src/shared/ui/admin-agent-creator-page-layout.tsx` | 3 | 5 | yes | yes |
| 27 | `AdminChatbotPageLayout` | `src/shared/ui/admin-chatbot-page-layout.tsx` | 3 | 5 | yes | yes |
| 28 | `AdminIntegrationsPageLayout` | `src/shared/ui/admin-integrations-page-layout.tsx` | 3 | 5 | yes | yes |
| 29 | `CmsPageShellFrame` | `src/features/cms/components/frontend/CmsPageShell.tsx` | 3 | 3 | no | yes |
| 30 | `CreateThemeDialog` | `src/features/kangur/admin/AdminKangurAppearancePage.tsx` | 3 | 3 | no | yes |
| 31 | `KangurActivitySummaryCard` | `src/features/kangur/ui/components/KangurActivitySummaryCard.tsx` | 3 | 3 | no | yes |
| 32 | `ResultView` | `src/features/kangur/ui/components/KangurGame.tsx` | 3 | 3 | no | yes |
| 33 | `KangurLabeledValueSummary` | `src/features/kangur/ui/components/KangurLabeledValueSummary.tsx` | 3 | 3 | no | yes |
| 34 | `KangurPanelSectionHeading` | `src/features/kangur/ui/components/KangurPanelSectionHeading.tsx` | 3 | 3 | yes | yes |
| 35 | `KangurProfileMenu` | `src/features/kangur/ui/components/KangurProfileMenu.tsx` | 3 | 3 | no | yes |
| 36 | `KangurSetup` | `src/features/kangur/ui/components/KangurSetup.tsx` | 3 | 3 | no | yes |
| 37 | `TrainingSetup` | `src/features/kangur/ui/components/TrainingSetup.tsx` | 3 | 3 | no | yes |
| 38 | `KangurFeatureHeader` | `src/features/kangur/ui/design/primitives/KangurFeatureHeader.tsx` | 3 | 3 | yes | yes |
| 39 | `AdminAgentCreatorBreadcrumbs` | `src/shared/ui/admin-agent-creator-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 40 | `AdminAgentTeachingBreadcrumbs` | `src/shared/ui/admin-agent-teaching-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 41 | `AdminAiPathsBreadcrumbs` | `src/shared/ui/admin-ai-paths-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 42 | `AdminCaseResolverBreadcrumbs` | `src/shared/ui/admin-case-resolver-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 43 | `AdminChatbotBreadcrumbs` | `src/shared/ui/admin-chatbot-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 44 | `AdminCmsBreadcrumbs` | `src/shared/ui/admin-cms-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 45 | `AdminDatabaseBreadcrumbs` | `src/shared/ui/admin-database-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 46 | `AdminFilemakerBreadcrumbs` | `src/shared/ui/admin-filemaker-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 47 | `AdminIntegrationsBreadcrumbs` | `src/shared/ui/admin-integrations-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 48 | `AdminNotesBreadcrumbs` | `src/shared/ui/admin-notes-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 49 | `AdminProductsBreadcrumbs` | `src/shared/ui/admin-products-breadcrumbs.tsx` | 3 | 3 | no | yes |
| 50 | `NavigationCard` | `src/shared/ui/navigation-card.tsx` | 3 | 3 | no | yes |
| 51 | `AdminAgentTeachingPageLayout` | `src/shared/ui/admin-agent-teaching-page-layout.tsx` | 2 | 4 | yes | yes |
| 52 | `AdminCaseResolverPageLayout` | `src/shared/ui/admin-case-resolver-page-layout.tsx` | 2 | 4 | yes | yes |
| 53 | `AdminCmsPageLayout` | `src/shared/ui/admin-cms-page-layout.tsx` | 2 | 4 | yes | yes |
| 54 | `AdminDatabasePageLayout` | `src/shared/ui/admin-database-page-layout.tsx` | 2 | 4 | yes | yes |
| 55 | `AdminNotesPageLayout` | `src/shared/ui/admin-notes-page-layout.tsx` | 2 | 4 | yes | yes |
| 56 | `AdminProductsPageLayout` | `src/shared/ui/admin-products-page-layout.tsx` | 2 | 4 | yes | yes |
| 57 | `ClockTrainingGame` | `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 2 | 2 | no | yes |
| 58 | `KangurAiTutorWarmOverlayPanel` | `src/features/kangur/ui/components/KangurAiTutorChrome.tsx` | 2 | 2 | yes | yes |
| 59 | `KangurAssignmentManagerItemCard` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 2 | 2 | no | yes |
| 60 | `KangurAssignmentPriorityChip` | `src/features/kangur/ui/components/KangurAssignmentPriorityChip.tsx` | 2 | 2 | yes | yes |
| 61 | `KangurAssignmentsList` | `src/features/kangur/ui/components/KangurAssignmentsList.tsx` | 2 | 2 | no | yes |
| 62 | `KangurResultSectionCard` | `src/features/kangur/ui/components/KangurGameResultWidget.tsx` | 2 | 2 | no | yes |
| 63 | `KangurLessonNavigationWidget` | `src/features/kangur/ui/components/KangurLessonNavigationWidget.tsx` | 2 | 2 | no | yes |
| 64 | `KangurPanelIntro` | `src/features/kangur/ui/design/primitives/KangurPanelIntro.tsx` | 2 | 2 | no | yes |
| 65 | `AdminSettingsBreadcrumbs` | `src/shared/ui/admin-settings-breadcrumbs.tsx` | 2 | 2 | no | yes |
| 66 | `KangurAssignmentManager` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1 | 7 | no | yes |
| 67 | `ProgressOverview` | `src/features/kangur/ui/components/ProgressOverview.tsx` | 1 | 3 | no | yes |
| 68 | `AdminSettingsPageLayout` | `src/shared/ui/admin-settings-page-layout.tsx` | 1 | 2 | yes | yes |
| 69 | `HomeFallbackContent` | `src/app/(frontend)/home-fallback-content.tsx` | 1 | 1 | no | no |
| 70 | `ProviderBadge` | `src/features/database/components/ControlPanelColumns.tsx` | 1 | 1 | no | no |
| 71 | `RecentAnalyticsEvents` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx` | 1 | 1 | no | no |
| 72 | `KangurAiTutorNativeGuideEntryList` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryList.tsx` | 1 | 1 | no | no |
| 73 | `AddingBallGame` | `src/features/kangur/ui/components/AddingBallGame.tsx` | 1 | 1 | no | no |
| 74 | `CalendarInteractiveGame` | `src/features/kangur/ui/components/CalendarInteractiveGame.tsx` | 1 | 1 | no | no |
| 75 | `DivisionGame` | `src/features/kangur/ui/components/DivisionGame.tsx` | 1 | 1 | no | no |
| 76 | `KangurAiTutorDrawingCanvas` | `src/features/kangur/ui/components/KangurAiTutorDrawingCanvas.tsx` | 1 | 1 | no | no |
| 77 | `KangurAiTutorGuidedCallout` | `src/features/kangur/ui/components/KangurAiTutorGuidedCallout.tsx` | 1 | 1 | no | no |
| 78 | `KangurAnimatedOptionCard` | `src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx` | 1 | 1 | yes | yes |
| 79 | `KangurBadgeTrackGrid` | `src/features/kangur/ui/components/KangurBadgeTrackGrid.tsx` | 1 | 1 | no | no |
| 80 | `ExamSummary` | `src/features/kangur/ui/components/KangurExam.tsx` | 1 | 1 | no | no |
| 81 | `KangurGameSetupMomentumCard` | `src/features/kangur/ui/components/KangurGameSetupMomentumCard.tsx` | 1 | 1 | no | no |
| 82 | `SkeletonChip` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 83 | `SkeletonLine` | `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx` | 1 | 1 | no | no |
| 84 | `KangurSetupShell` | `src/features/kangur/ui/components/KangurSetup.tsx` | 1 | 1 | no | no |
| 85 | `KangurTestSuitePlayer` | `src/features/kangur/ui/components/KangurTestSuitePlayer.tsx` | 1 | 1 | no | no |
| 86 | `MultiplicationArrayGame` | `src/features/kangur/ui/components/MultiplicationArrayGame.tsx` | 1 | 1 | no | no |
| 87 | `MultiplicationGame` | `src/features/kangur/ui/components/MultiplicationGame.tsx` | 1 | 1 | no | no |
| 88 | `SubtractingGame` | `src/features/kangur/ui/components/SubtractingGame.tsx` | 1 | 1 | no | no |
| 89 | `AdminWidePageLayout` | `src/shared/ui/admin-wide-page-layout.tsx` | 0 | 0 | yes | yes |

## Prioritized Transition Backlog (Depth = 2)

| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |
| ---: | ---: | --- | --- | ---: | ---: | --- | --- |
| 1 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> action` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 2 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> description` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 3 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> footer` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 4 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> progressLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 5 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> questLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 6 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> rewardLabel` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 7 | 112 | `KangurAssignmentManager` | `KangurDailyQuestHighlightCardContent` | 7 | 1 | `featuredDailyQuest -> title` | `src/features/kangur/ui/components/KangurAssignmentManager.tsx:477` |
| 8 | 82 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 4 | 1 | `lesson -> description` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 9 | 82 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 4 | 1 | `lesson -> icon` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 10 | 82 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 4 | 1 | `lesson -> title` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 11 | 82 | `KangurLessonLibraryCard` | `KangurGradientIconTile` | 4 | 1 | `lesson -> gradientClass` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:130` |
| 12 | 78 | `KnowledgeGraphQueryPreviewSection` | `Textarea` | 3 | 2 | `draft -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:886` |
| 13 | 78 | `KnowledgeGraphQueryPreviewSection` | `Textarea` | 3 | 2 | `onDraftChange -> onChange` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:886` |
| 14 | 78 | `KnowledgeGraphQueryPreviewSection` | `Input` | 3 | 2 | `draft -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:997` |
| 15 | 78 | `KnowledgeGraphQueryPreviewSection` | `Input` | 3 | 2 | `onDraftChange -> onChange` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:997` |
| 16 | 78 | `KnowledgeGraphStatusSection` | `EmptyState` | 3 | 2 | `knowledgeGraphStatus -> description` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1989` |
| 17 | 78 | `KnowledgeGraphStatusSection` | `StatusBadge` | 3 | 2 | `knowledgeGraphStatus -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2017` |
| 18 | 78 | `KnowledgeGraphStatusSection` | `MetadataItem` | 3 | 2 | `knowledgeGraphStatus -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2045` |
| 19 | 78 | `KnowledgeGraphStatusSection` | `Alert` | 3 | 2 | `freshnessAlert -> variant` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2054` |
| 20 | 78 | `KnowledgeGraphStatusSection` | `StatusBadge` | 3 | 2 | `freshnessAlert -> status` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2062` |
| 21 | 78 | `KnowledgeGraphStatusSection` | `MetadataItem` | 3 | 2 | `freshnessAlert -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2092` |
| 22 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Input` | 3 | 2 | `selectedEntry -> value` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:156` |
| 23 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Input` | 3 | 2 | `updateSelectedEntry -> onChange` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:156` |
| 24 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Button` | 3 | 2 | `selectedEntry -> variant` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:250` |
| 25 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Button` | 3 | 2 | `updateSelectedEntry -> onClick` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:250` |
| 26 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Textarea` | 3 | 2 | `selectedEntry -> value` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:269` |
| 27 | 78 | `KangurAiTutorNativeGuideEntryEditor` | `Textarea` | 3 | 2 | `updateSelectedEntry -> onChange` | `src/features/kangur/admin/components/KangurAiTutorNativeGuideEntryEditor.tsx:269` |
| 28 | 72 | `KnowledgeGraphQueryPreviewSection` | `KnowledgeGraphPreviewSelect` | 3 | 1 | `draft -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:903` |
| 29 | 72 | `KnowledgeGraphQueryPreviewSection` | `KnowledgeGraphPreviewSelect` | 3 | 1 | `onDraftChange -> onChange` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:937` |
| 30 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> buttonClassName` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 31 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> whileHover` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 32 | 72 | `KangurAnswerChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `interactive -> whileTap` | `src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28` |
| 33 | 72 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 3 | 1 | `masteryPresentation -> aside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 34 | 72 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 3 | 1 | `lessonAssignment -> aside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 35 | 72 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 3 | 1 | `masteryPresentation -> footer` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 36 | 72 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 3 | 1 | `lessonAssignment -> footer` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 37 | 72 | `KangurLessonLibraryCard` | `KangurStatusChip` | 3 | 1 | `masteryPresentation -> accent` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:73` |
| 38 | 72 | `KangurLessonLibraryCard` | `KangurAssignmentPriorityChip` | 3 | 1 | `lessonAssignment -> priority` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:81` |
| 39 | 72 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 3 | 1 | `accent -> aside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 40 | 72 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 3 | 1 | `accent -> icon` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 41 | 72 | `KangurSetupChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `disabled -> whileHover` | `src/features/kangur/ui/components/KangurSetup.tsx:98` |
| 42 | 72 | `KangurSetupChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `disabled -> whileTap` | `src/features/kangur/ui/components/KangurSetup.tsx:98` |
| 43 | 72 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 3 | 1 | `showAnswer -> description` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:244` |
| 44 | 72 | `KangurTestQuestionRenderer` | `KangurPanelIntro` | 3 | 1 | `showAnswer -> title` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:244` |
| 45 | 72 | `ProgressOverview` | `KangurProgressHighlightCardContent` | 3 | 1 | `dailyQuest -> chipLabel` | `src/features/kangur/ui/components/ProgressOverview.tsx:129` |
| 46 | 72 | `ProgressOverview` | `KangurProgressHighlightCardContent` | 3 | 1 | `dailyQuest -> description` | `src/features/kangur/ui/components/ProgressOverview.tsx:129` |
| 47 | 72 | `ProgressOverview` | `KangurProgressHighlightCardContent` | 3 | 1 | `dailyQuest -> title` | `src/features/kangur/ui/components/ProgressOverview.tsx:129` |
| 48 | 68 | `AllegroSubpageScaffold` | `AdminIntegrationsPageLayout` | 2 | 2 | `title -> current` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:22` |
| 49 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> title` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:30` |
| 50 | 68 | `AllegroSubpageScaffold` | `EmptyState` | 2 | 2 | `emptyState -> description` | `src/features/integrations/pages/marketplaces/allegro/AllegroSubpageScaffold.tsx:30` |
| 51 | 68 | `KnowledgeGraphQueryPreviewSection` | `MetadataItem` | 2 | 2 | `result -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1272` |
| 52 | 68 | `KnowledgeGraphStatusSection` | `EmptyState` | 2 | 2 | `onRefresh -> action` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1989` |
| 53 | 68 | `KnowledgeGraphStatusSection` | `EmptyState` | 2 | 2 | `isRefreshing -> action` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1989` |
| 54 | 68 | `KnowledgeGraphStatusSection` | `Button` | 2 | 2 | `onRefresh -> onClick` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1994` |
| 55 | 68 | `KnowledgeGraphStatusSection` | `Button` | 2 | 2 | `isRefreshing -> disabled` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1994` |
| 56 | 68 | `KnowledgeGraphStatusSection` | `Alert` | 2 | 2 | `syncFeedback -> variant` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2082` |
| 57 | 68 | `KnowledgeGraphStatusSection` | `Alert` | 2 | 2 | `syncFeedback -> title` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2082` |
| 58 | 64 | `KangurSessionHistoryRow` | `KangurInfoCard` | 3 | 1 | `accent -> accent` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:52` |
| 59 | 64 | `KangurSetupChoiceCard` | `KangurAnimatedOptionCard` | 3 | 1 | `disabled -> disabled` | `src/features/kangur/ui/components/KangurSetup.tsx:98` |
| 60 | 64 | `KangurTestQuestionRenderer` | `KangurTestChoiceCard` | 3 | 1 | `showAnswer -> showAnswer` | `src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:311` |
| 61 | 62 | `KnowledgeGraphQueryPreviewSection` | `KnowledgeGraphPreviewValueBlock` | 2 | 1 | `result -> value` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:1280` |
| 62 | 62 | `SummaryContent` | `KnowledgeGraphQueryPreviewSection` | 2 | 1 | `knowledgeGraphPreviewDraft -> draft` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2366` |
| 63 | 62 | `SummaryContent` | `KnowledgeGraphQueryPreviewSection` | 2 | 1 | `knowledgeGraphPreviewReplayCandidates -> replayCandidates` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2366` |
| 64 | 62 | `SummaryContent` | `RecentAnalyticsEvents` | 2 | 1 | `knowledgeGraphPreviewReplayCandidates -> replayCandidates` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2409` |
| 65 | 62 | `SummaryContent` | `RecentAnalyticsEvents` | 2 | 1 | `knowledgeGraphPreviewDraft -> activeReplayEventId` | `src/features/kangur/admin/AdminKangurObservabilityPage.tsx:2409` |
| 66 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 67 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `primaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:80` |
| 68 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 69 | 62 | `KangurAiTutorPanelContextCard` | `KangurButton` | 2 | 1 | `secondaryAction -> onClick` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:91` |
| 70 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> data-testid` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 71 | 62 | `KangurAiTutorPanelContextCard` | `KangurAiTutorWarmInsetCard` | 2 | 1 | `status -> tone` | `src/features/kangur/ui/components/KangurAiTutorPanelContextSummary.tsx:107` |
| 72 | 62 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 2 | 1 | `completedLessonAssignment -> aside` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 73 | 62 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 2 | 1 | `completedLessonAssignment -> footer` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 74 | 62 | `KangurLessonLibraryCard` | `KangurIconSummaryOptionCard` | 2 | 1 | `iconTestId -> icon` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69` |
| 75 | 62 | `KangurLessonLibraryCard` | `KangurGradientIconTile` | 2 | 1 | `iconTestId -> data-testid` | `src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:130` |
| 76 | 62 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 2 | 1 | `scoreAccent -> aside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 77 | 62 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 2 | 1 | `scoreTestId -> aside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 78 | 62 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 2 | 1 | `xpTestId -> aside` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 79 | 62 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 2 | 1 | `iconAccent -> icon` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |
| 80 | 62 | `KangurSessionHistoryRow` | `KangurIconSummaryCardContent` | 2 | 1 | `iconTestId -> icon` | `src/features/kangur/ui/components/KangurSessionHistoryRow.tsx:59` |

## Ranked Chain Backlog (Depth >= 3)

| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |
| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |
| 1 | 205 | 5 | `KangurTestQuestionRenderer` | `KangurOptionCardButton` | 3 | 1 | `showAnswer -> showAnswer -> interactive -> buttonClassName -> className` |
| 2 | 201 | 5 | `AllegroSubpageScaffold` | `Breadcrumbs` | 2 | 2 | `title -> current -> current -> current -> items` |
| 3 | 166 | 4 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 3 | 1 | `showAnswer -> showAnswer -> interactive -> buttonClassName` |
| 4 | 166 | 4 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 3 | 1 | `showAnswer -> showAnswer -> interactive -> whileHover` |
| 5 | 166 | 4 | `KangurTestQuestionRenderer` | `KangurAnimatedOptionCard` | 3 | 1 | `showAnswer -> showAnswer -> interactive -> whileTap` |
| 6 | 162 | 4 | `AllegroSubpageScaffold` | `AdminSectionBreadcrumbs` | 2 | 2 | `title -> current -> current -> current` |
| 7 | 156 | 4 | `AdminAgentCreatorPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 8 | 156 | 4 | `AdminAgentCreatorPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 9 | 156 | 4 | `AdminAgentTeachingPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 10 | 156 | 4 | `AdminAgentTeachingPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 11 | 156 | 4 | `AdminCaseResolverPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 12 | 156 | 4 | `AdminCaseResolverPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 13 | 156 | 4 | `AdminChatbotPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 14 | 156 | 4 | `AdminChatbotPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 15 | 156 | 4 | `AdminCmsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 16 | 156 | 4 | `AdminCmsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 17 | 156 | 4 | `AdminDatabasePageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 18 | 156 | 4 | `AdminDatabasePageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 19 | 156 | 4 | `AdminIntegrationsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 20 | 156 | 4 | `AdminNotesPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 21 | 156 | 4 | `AdminNotesPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 22 | 156 | 4 | `AdminProductsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 23 | 156 | 4 | `AdminProductsPageLayout` | `Breadcrumbs` | 2 | 1 | `parent -> parent -> parent -> items` |
| 24 | 156 | 4 | `AdminSettingsPageLayout` | `Breadcrumbs` | 2 | 1 | `current -> current -> current -> items` |
| 25 | 146 | 4 | `KangurTestChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `buttonClassName -> buttonClassName -> buttonClassName -> className` |
| 26 | 146 | 4 | `KangurTestChoiceCard` | `KangurOptionCardButton` | 1 | 1 | `choiceGrid -> buttonClassName -> buttonClassName -> className` |
| 27 | 113 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 4 | 1 | `lesson -> title -> title` |
| 28 | 113 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 4 | 1 | `lesson -> icon -> icon` |
| 29 | 113 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 4 | 1 | `lesson -> description -> description` |
| 30 | 103 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 3 | 1 | `masteryPresentation -> footer -> footer` |
| 31 | 103 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 3 | 1 | `masteryPresentation -> aside -> aside` |
| 32 | 103 | 3 | `KangurLessonLibraryCard` | `KangurStatusChip` | 3 | 1 | `lessonAssignment -> priority -> accent` |
| 33 | 103 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 3 | 1 | `lessonAssignment -> footer -> footer` |
| 34 | 103 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 3 | 1 | `lessonAssignment -> aside -> aside` |
| 35 | 103 | 3 | `KangurTestQuestionRenderer` | `KangurAnswerChoiceCard` | 3 | 1 | `showAnswer -> showAnswer -> interactive` |
| 36 | 99 | 3 | `AllegroSubpageScaffold` | `PageLayout` | 2 | 2 | `title -> current -> eyebrow` |
| 37 | 99 | 3 | `AllegroSubpageScaffold` | `AdminIntegrationsBreadcrumbs` | 2 | 2 | `title -> current -> current` |
| 38 | 99 | 3 | `SummaryContent` | `Textarea` | 2 | 2 | `knowledgeGraphPreviewDraft -> draft -> value` |
| 39 | 99 | 3 | `SummaryContent` | `Input` | 2 | 2 | `knowledgeGraphPreviewDraft -> draft -> value` |
| 40 | 93 | 3 | `SummaryContent` | `KnowledgeGraphPreviewSelect` | 2 | 1 | `knowledgeGraphPreviewDraft -> draft -> value` |
| 41 | 93 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 2 | 1 | `completedLessonAssignment -> footer -> footer` |
| 42 | 93 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 2 | 1 | `completedLessonAssignment -> aside -> aside` |
| 43 | 93 | 3 | `KangurLessonLibraryCard` | `KangurIconSummaryCardContent` | 2 | 1 | `iconTestId -> icon -> icon` |
| 44 | 93 | 3 | `AdminAgentCreatorPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 45 | 93 | 3 | `AdminAgentCreatorPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 46 | 93 | 3 | `AdminAgentTeachingPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 47 | 93 | 3 | `AdminAgentTeachingPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 48 | 93 | 3 | `AdminCaseResolverPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 49 | 93 | 3 | `AdminCaseResolverPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 50 | 93 | 3 | `AdminChatbotPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 51 | 93 | 3 | `AdminChatbotPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 52 | 93 | 3 | `AdminCmsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 53 | 93 | 3 | `AdminCmsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 54 | 93 | 3 | `AdminDatabasePageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 55 | 93 | 3 | `AdminDatabasePageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 56 | 93 | 3 | `AdminIntegrationsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 57 | 93 | 3 | `AdminNotesPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 58 | 93 | 3 | `AdminNotesPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 59 | 93 | 3 | `AdminProductsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 60 | 93 | 3 | `AdminProductsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `parent -> parent -> parent` |
| 61 | 93 | 3 | `AdminSettingsPageLayout` | `AdminSectionBreadcrumbs` | 2 | 1 | `current -> current -> current` |
| 62 | 89 | 3 | `SummaryContent` | `EmptyState` | 1 | 2 | `knowledgeGraphStatus -> knowledgeGraphStatus -> description` |
| 63 | 89 | 3 | `SummaryContent` | `StatusBadge` | 1 | 2 | `knowledgeGraphStatus -> knowledgeGraphStatus -> status` |
| 64 | 89 | 3 | `SummaryContent` | `MetadataItem` | 1 | 2 | `knowledgeGraphStatus -> knowledgeGraphStatus -> value` |
| 65 | 89 | 3 | `SummaryContent` | `EmptyState` | 1 | 2 | `knowledgeGraphStatusIsRefreshing -> isRefreshing -> action` |
| 66 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `knowledgeGraphStatusIsRefreshing -> isRefreshing -> disabled` |
| 67 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `knowledgeGraphIsSyncing -> isSyncing -> disabled` |
| 68 | 89 | 3 | `SummaryContent` | `Alert` | 1 | 2 | `knowledgeGraphSyncFeedback -> syncFeedback -> variant` |
| 69 | 89 | 3 | `SummaryContent` | `Alert` | 1 | 2 | `knowledgeGraphSyncFeedback -> syncFeedback -> title` |
| 70 | 89 | 3 | `SummaryContent` | `EmptyState` | 1 | 2 | `refreshKnowledgeGraphStatus -> onRefresh -> action` |
| 71 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `refreshKnowledgeGraphStatus -> onRefresh -> onClick` |
| 72 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `syncKnowledgeGraph -> onSync -> onClick` |
| 73 | 89 | 3 | `SummaryContent` | `MetadataItem` | 1 | 2 | `knowledgeGraphPreviewResult -> result -> value` |
| 74 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `knowledgeGraphPreviewIsRunning -> isRunning -> disabled` |
| 75 | 89 | 3 | `SummaryContent` | `Textarea` | 1 | 2 | `updateKnowledgeGraphPreviewDraft -> onDraftChange -> onChange` |
| 76 | 89 | 3 | `SummaryContent` | `Input` | 1 | 2 | `updateKnowledgeGraphPreviewDraft -> onDraftChange -> onChange` |
| 77 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `clearKnowledgeGraphPreviewContext -> onClearContext -> onClick` |
| 78 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `runKnowledgeGraphPreview -> onRun -> onClick` |
| 79 | 89 | 3 | `SummaryContent` | `Button` | 1 | 2 | `replayAnalyticsEventInKnowledgeGraphPreview -> onReplayEvent -> onClick` |
| 80 | 83 | 3 | `SummaryContent` | `KnowledgeGraphPreviewValueBlock` | 1 | 1 | `knowledgeGraphPreviewResult -> result -> value` |

## Top Chain Details (Depth >= 3)

### 1. KangurTestQuestionRenderer -> KangurOptionCardButton

- Score: 205
- Depth: 5
- Root fanout: 3
- Prop path: showAnswer -> showAnswer -> interactive -> buttonClassName -> className
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurTestChoiceCard` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurAnimatedOptionCard` (src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx)
  - `KangurOptionCardButton` (src/features/kangur/ui/design/primitives/KangurOptionCardButton.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurTestChoiceCard`: `showAnswer` -> `showAnswer` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:311
  - `KangurTestChoiceCard` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:92
  - `KangurAnswerChoiceCard` -> `KangurAnimatedOptionCard`: `interactive` -> `buttonClassName` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28
  - `KangurAnimatedOptionCard` -> `KangurOptionCardButton`: `buttonClassName` -> `className` at src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx:41

### 2. AllegroSubpageScaffold -> Breadcrumbs

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

### 3. KangurTestQuestionRenderer -> KangurAnimatedOptionCard

- Score: 166
- Depth: 4
- Root fanout: 3
- Prop path: showAnswer -> showAnswer -> interactive -> buttonClassName
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurTestChoiceCard` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurAnimatedOptionCard` (src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurTestChoiceCard`: `showAnswer` -> `showAnswer` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:311
  - `KangurTestChoiceCard` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:92
  - `KangurAnswerChoiceCard` -> `KangurAnimatedOptionCard`: `interactive` -> `buttonClassName` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28

### 4. KangurTestQuestionRenderer -> KangurAnimatedOptionCard

- Score: 166
- Depth: 4
- Root fanout: 3
- Prop path: showAnswer -> showAnswer -> interactive -> whileHover
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurTestChoiceCard` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurAnimatedOptionCard` (src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurTestChoiceCard`: `showAnswer` -> `showAnswer` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:311
  - `KangurTestChoiceCard` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:92
  - `KangurAnswerChoiceCard` -> `KangurAnimatedOptionCard`: `interactive` -> `whileHover` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28

### 5. KangurTestQuestionRenderer -> KangurAnimatedOptionCard

- Score: 166
- Depth: 4
- Root fanout: 3
- Prop path: showAnswer -> showAnswer -> interactive -> whileTap
- Component path:
  - `KangurTestQuestionRenderer` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurTestChoiceCard` (src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx)
  - `KangurAnswerChoiceCard` (src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx)
  - `KangurAnimatedOptionCard` (src/features/kangur/ui/components/KangurAnimatedOptionCard.tsx)
- Transition lines:
  - `KangurTestQuestionRenderer` -> `KangurTestChoiceCard`: `showAnswer` -> `showAnswer` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:311
  - `KangurTestChoiceCard` -> `KangurAnswerChoiceCard`: `showAnswer` -> `interactive` at src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx:92
  - `KangurAnswerChoiceCard` -> `KangurAnimatedOptionCard`: `interactive` -> `whileTap` at src/features/kangur/ui/components/KangurAnswerChoiceCard.tsx:28

### 6. AllegroSubpageScaffold -> AdminSectionBreadcrumbs

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

### 7. AdminAgentCreatorPageLayout -> Breadcrumbs

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

### 8. AdminAgentCreatorPageLayout -> Breadcrumbs

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

### 9. AdminAgentTeachingPageLayout -> Breadcrumbs

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

### 10. AdminAgentTeachingPageLayout -> Breadcrumbs

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

### 11. AdminCaseResolverPageLayout -> Breadcrumbs

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

### 12. AdminCaseResolverPageLayout -> Breadcrumbs

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

### 13. AdminChatbotPageLayout -> Breadcrumbs

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

### 14. AdminChatbotPageLayout -> Breadcrumbs

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

### 15. AdminCmsPageLayout -> Breadcrumbs

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

## Top Transition Details (Depth = 2)

### 1. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> action
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 2. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> description
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 3. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> footer
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 4. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> progressLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 5. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> questLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 6. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> rewardLabel
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 7. KangurAssignmentManager -> KangurDailyQuestHighlightCardContent

- Score: 112
- Root fanout: 7
- Prop mapping: featuredDailyQuest -> title
- Location: src/features/kangur/ui/components/KangurAssignmentManager.tsx:477

### 8. KangurLessonLibraryCard -> KangurIconSummaryOptionCard

- Score: 82
- Root fanout: 4
- Prop mapping: lesson -> description
- Location: src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69

### 9. KangurLessonLibraryCard -> KangurIconSummaryOptionCard

- Score: 82
- Root fanout: 4
- Prop mapping: lesson -> icon
- Location: src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69

### 10. KangurLessonLibraryCard -> KangurIconSummaryOptionCard

- Score: 82
- Root fanout: 4
- Prop mapping: lesson -> title
- Location: src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:69

### 11. KangurLessonLibraryCard -> KangurGradientIconTile

- Score: 82
- Root fanout: 4
- Prop mapping: lesson -> gradientClass
- Location: src/features/kangur/ui/components/KangurLessonLibraryCard.tsx:130

### 12. KnowledgeGraphQueryPreviewSection -> Textarea

- Score: 78
- Root fanout: 3
- Prop mapping: draft -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:886

### 13. KnowledgeGraphQueryPreviewSection -> Textarea

- Score: 78
- Root fanout: 3
- Prop mapping: onDraftChange -> onChange
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:886

### 14. KnowledgeGraphQueryPreviewSection -> Input

- Score: 78
- Root fanout: 3
- Prop mapping: draft -> value
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:997

### 15. KnowledgeGraphQueryPreviewSection -> Input

- Score: 78
- Root fanout: 3
- Prop mapping: onDraftChange -> onChange
- Location: src/features/kangur/admin/AdminKangurObservabilityPage.tsx:997

## Execution Notes

- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.
- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.
- Prefer introducing feature-level providers first, then split hot read/write contexts.
- Re-run scan after each refactor wave and track depth/fanout reductions.
