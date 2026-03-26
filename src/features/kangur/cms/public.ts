export {
  buildKangurEmbeddedBasePath,
  getKangurInternalQueryParamKeys,
  getKangurPageSlug,
  KANGUR_EMBED_QUERY_PARAM,
  KANGUR_MAIN_PAGE_KEY,
  KANGUR_PAGE_TO_SLUG,
  readKangurUrlParam,
} from '../config/routing';
export { KANGUR_WIDGET_OPTIONS, getKangurWidgetLabel } from '@/shared/contracts/kangur-cms';
export { KangurFeaturePage } from '../ui/KangurFeaturePage';
export { default as Game } from '../ui/pages/Game';
export { default as LearnerProfile } from '../ui/pages/LearnerProfile';
export { default as Lessons } from '../ui/pages/Lessons';
export { default as ParentDashboard } from '../ui/pages/ParentDashboard';
export { KangurAssignmentSpotlight } from '../ui/components/KangurAssignmentSpotlight';
export * from '../ui/components/KangurActiveLessonPanelWidget';
export * from '../ui/components/KangurGameCalendarTrainingWidget';
export * from '../ui/components/KangurGameGeometryTrainingWidget';
export * from '../ui/components/KangurGameHomeActionsWidget';
export * from '../ui/components/KangurGameKangurSessionWidget';
export * from '../ui/components/KangurGameKangurSetupWidget';
export * from '../ui/components/KangurGameNavigationWidget';
export * from '../ui/components/KangurGameOperationSelectorWidget';
export * from '../ui/components/KangurGameQuestionWidget';
export * from '../ui/components/KangurGameResultWidget';
export * from '../ui/components/KangurGameTrainingSetupWidget';
export * from '../ui/components/KangurGameXpToastWidget';
export * from '../ui/components/KangurLearnerProfileAssignmentsWidget';
export * from '../ui/components/KangurLearnerProfileHeroWidget';
export * from '../ui/components/KangurLearnerProfileLevelProgressWidget';
export * from '../ui/components/KangurLearnerProfileMasteryWidget';
export * from '../ui/components/KangurLearnerProfileOverviewWidget';
export * from '../ui/components/KangurLearnerProfilePerformanceWidget';
export * from '../ui/components/KangurLearnerProfileRecommendationsWidget';
export * from '../ui/components/KangurLearnerProfileResultsWidget';
export * from '../ui/components/KangurLearnerProfileSessionsWidget';
export * from '../ui/components/KangurLessonNavigationWidget';
export * from '../ui/components/KangurLessonsCatalogWidget';
export * from '../ui/components/KangurParentDashboardAssignmentsMonitoringWidget';
export * from '../ui/components/KangurParentDashboardAssignmentsWidget';
export * from '../ui/components/KangurParentDashboardHeroWidget';
export * from '../ui/components/KangurParentDashboardLearnerManagementWidget';
export * from '../ui/components/KangurParentDashboardProgressWidget';
export * from '../ui/components/KangurParentDashboardTabsWidget';
export * from '../ui/components/KangurPriorityAssignments';
export { default as Leaderboard } from '../ui/components/Leaderboard';
export { default as PlayerProgressCard } from '../ui/components/PlayerProgressCard';
export { useKangurProgressState } from '../ui/hooks/useKangurProgressState';
export {
  isKangurGameScreen,
  useOptionalKangurGameRuntime,
} from '../ui/context/KangurGameRuntimeContext';
export { useOptionalKangurLearnerProfileRuntime } from '../ui/context/KangurLearnerProfileRuntimeContext';
export { useOptionalKangurLessonsRuntime } from '../ui/context/KangurLessonsRuntimeContext';
export { useOptionalKangurParentDashboardRuntime } from '../ui/context/KangurParentDashboardRuntimeContext';
export { useOptionalKangurRouting } from '../ui/context/KangurRoutingContext';
