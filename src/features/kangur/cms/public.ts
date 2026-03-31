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
export { KangurAssignmentSpotlight } from '../ui/components/assignments/KangurAssignmentSpotlight';
export * from '../ui/components/assignments/KangurLearnerAssignmentsPanel';
export * from '../ui/components/assignments/KangurPriorityAssignments';
export * from '../ui/components/lesson-runtime/KangurActiveLessonPanelWidget';
export * from '../ui/components/game-quiz/KangurGameCalendarTrainingWidget';
export * from '../ui/components/game-quiz/KangurGameGeometryTrainingWidget';
export * from '../ui/components/game-home/KangurGameHomeActionsWidget';
export * from '../ui/components/game-runtime/KangurGameKangurSessionWidget';
export * from '../ui/components/game-setup/KangurGameKangurSetupWidget';
export * from '../ui/components/game-runtime/KangurGameNavigationWidget';
export * from '../ui/components/game-setup/KangurGameOperationSelectorWidget';
export * from '../ui/components/game-runtime/KangurGameQuestionWidget';
export * from '../ui/components/game-runtime/KangurGameResultWidget';
export * from '../ui/components/game-setup/KangurGameTrainingSetupWidget';
export * from '../ui/components/game-runtime/KangurGameXpToastWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileAssignmentsWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileHeroWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileLevelProgressWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileMasteryWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileOverviewWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfilePerformanceWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileRecommendationsWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileResultsWidget';
export * from '../ui/components/learner-profile/KangurLearnerProfileSessionsWidget';
export * from '../ui/components/lesson-runtime/KangurLessonNavigationWidget';
export * from '../ui/components/lesson-library/KangurLessonsCatalogWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardAssignmentsMonitoringWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardAssignmentsWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardHeroWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardLearnerManagementWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardProgressWidget';
export * from '../ui/components/parent-dashboard/KangurParentDashboardTabsWidget';
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
