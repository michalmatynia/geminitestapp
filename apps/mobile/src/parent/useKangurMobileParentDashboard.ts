import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';
import { useParentDashboardAssignments } from './useParentDashboardAssignments';
import { useParentDashboardProgress } from './useParentDashboardProgress';
import { useParentDashboardResults } from './useParentDashboardResults';
import { useParentDashboardLearner } from './useParentDashboardLearner';
import { type UseKangurMobileParentDashboardResult } from './parent-dashboard-types';

export const useKangurMobileParentDashboard = (): UseKangurMobileParentDashboardResult => {
  const { copy, locale } = useKangurMobileI18n();
  const { isLoadingAuth, session, supportsLearnerCredentials } = useKangurMobileAuth();
  
  const learnerState = useParentDashboardLearner();
  const canAccessDashboard = session.status === 'authenticated' && Boolean(session.user?.canManageLearners);
  
  const assignments = useParentDashboardAssignments(canAccessDashboard, learnerState.selectedLearnerId);
  const recentResults = useKangurMobileScoreHistory({
    enabled: canAccessDashboard && learnerState.selectedLearnerId !== null,
    limit: 5,
    sort: '-created_date',
  });
  const progress = useParentDashboardProgress(canAccessDashboard, learnerState.selectedLearnerId, recentResults.scores, locale);
  const recentResultItems = useParentDashboardResults(recentResults);

  const isAuthorized = canAccessDashboard && learnerState.selectedLearnerId !== null;

  return {
    activeLearner: learnerState.activeLearner,
    assignmentItems: assignments.assignmentItems,
    assignmentMonitoring: assignments.assignmentMonitoring,
    assignmentsError: assignments.assignmentsQuery.error instanceof Error ? copy({ de: 'Aufgaben-Ladefehler.', en: 'Assignment load error.', pl: 'Błąd ładowania zadań.' }) : null,
    canAccessDashboard,
    isAuthenticated: session.status === 'authenticated',
    isLoadingAssignments: Boolean(isAuthorized && assignments.assignmentsQuery.isLoading),
    isLoadingAuth,
    isLoadingProgress: Boolean(isAuthorized && progress.progressQuery.isLoading),
    isLoadingResults: recentResults.isLoading,
    learners: learnerState.learners,
    parentDisplayName: learnerState.parentDisplayName,
    progressError: progress.progressQuery.error instanceof Error ? copy({ de: 'Fortschritts-Ladefehler.', en: 'Progress load error.', pl: 'Błąd ładowania postępu.' }) : null,
    recentResultItems,
    refreshDashboard: async () => {},
    resultsError: recentResults.error instanceof Error ? copy({ de: 'Ergebnis-Ladefehler.', en: 'Result load error.', pl: 'Błąd ładowania wyników.' }) : null,
    selectLearner: async () => {},
    selectedLearnerId: learnerState.selectedLearnerId,
    selectionError: learnerState.selectionError,
    snapshot: progress.snapshot,
    supportsLearnerCredentials,
    switchingLearnerId: learnerState.switchingLearnerId,
  };
};
