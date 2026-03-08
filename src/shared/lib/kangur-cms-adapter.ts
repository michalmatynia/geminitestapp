export {
  buildKangurEmbeddedBasePath,
  getKangurInternalQueryParamKeys,
  getKangurPageSlug,
  KANGUR_EMBED_QUERY_PARAM,
  KANGUR_MAIN_PAGE_KEY,
  KANGUR_PAGE_TO_SLUG,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
export {
  getKangurWidgetLabel,
  KANGUR_WIDGET_OPTIONS,
} from '@/features/kangur/cms-builder/project';
export { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';
export { isKangurGameScreen } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
export { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
export { default as Game } from '@/features/kangur/ui/pages/Game';
export { default as LearnerProfile } from '@/features/kangur/ui/pages/LearnerProfile';
export { default as Lessons } from '@/features/kangur/ui/pages/Lessons';
export { default as ParentDashboard } from '@/features/kangur/ui/pages/ParentDashboard';
export { default as KangurAssignmentSpotlight } from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
export * from '@/features/kangur/ui/components/KangurActiveLessonPanelWidget';
export * from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
export * from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';
export * from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
export * from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
export * from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';
export * from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
export * from '@/features/kangur/ui/components/KangurGameNavigationWidget';
export * from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
export * from '@/features/kangur/ui/components/KangurGameQuestionWidget';
export * from '@/features/kangur/ui/components/KangurGameResultWidget';
export * from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';
export * from '@/features/kangur/ui/components/KangurGameXpToastWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
export * from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
export * from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
export * from '@/features/kangur/ui/components/KangurLessonsCatalogWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
export * from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
export * from '@/features/kangur/ui/components/KangurPriorityAssignments';
export { default as Leaderboard } from '@/features/kangur/ui/components/Leaderboard';
export { default as PlayerProgressCard } from '@/features/kangur/ui/components/PlayerProgressCard';
export {
  useOptionalKangurGameRuntime,
  useOptionalKangurLearnerProfileRuntime,
  useOptionalKangurLessonsRuntime,
  useOptionalKangurParentDashboardRuntime,
  useOptionalKangurRouting,
} from '@/features/kangur/ui/context';
