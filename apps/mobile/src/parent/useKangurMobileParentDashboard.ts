import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileScoreHistory, type UseKangurMobileScoreHistoryResult } from '../scores/useKangurMobileScoreHistory';
import { useParentDashboardAssignments, type UseParentDashboardAssignmentsResult } from './useParentDashboardAssignments';
import { useParentDashboardProgress, type UseParentDashboardProgressResult } from './useParentDashboardProgress';
import { useParentDashboardResults } from './useParentDashboardResults';
import { useParentDashboardLearner } from './useParentDashboardLearner';
import { type UseKangurMobileParentDashboardResult } from './parent-dashboard-types';

function resolveDashboardError(
  error: Error | null,
  copy: (text: Record<string, string>) => string,
  type: 'assignments' | 'progress' | 'results'
): string | null {
    if (!(error instanceof Error)) return null;
    const labels = {
      assignments: { de: 'Aufgaben-Ladefehler.', en: 'Assignment load error.', pl: 'Błąd ładowania zadań.' },
      progress: { de: 'Fortschritts-Ladefehler.', en: 'Progress load error.', pl: 'Błąd ładowania postępu.' },
      results: { de: 'Ergebnis-Ladefehler.', en: 'Result load error.', pl: 'Błąd ładowania wyników.' },
    };
    return copy(labels[type]);
}

function useDashboardErrors(
  assignments: UseParentDashboardAssignmentsResult,
  progress: UseParentDashboardProgressResult,
  recentResults: UseKangurMobileScoreHistoryResult,
  copy: (text: Record<string, string>) => string
): { assignmentsError: string | null; progressError: string | null; resultsError: string | null } {
    const assignmentsError = resolveDashboardError(assignments.assignmentsQuery.error, copy, 'assignments');
    const progressError = resolveDashboardError(progress.progressQuery.error, copy, 'progress');
    const resultsError = resolveDashboardError(recentResults.error instanceof Error ? recentResults.error : null, copy, 'results');
    return { assignmentsError, progressError, resultsError };
}

function useDashboardLoading(
    isAuthorized: boolean,
    assignments: UseParentDashboardAssignmentsResult,
    progress: UseParentDashboardProgressResult,
    recentResults: UseKangurMobileScoreHistoryResult
): { isLoadingAssignments: boolean; isLoadingProgress: boolean; isLoadingResults: boolean } {
    const isLoadingAssignments = Boolean(isAuthorized && assignments.assignmentsQuery.isLoading);
    const isLoadingProgress = Boolean(isAuthorized && progress.progressQuery.isLoading);
    const isLoadingResults = recentResults.isLoading;
    return { isLoadingAssignments, isLoadingProgress, isLoadingResults };
}

export const useKangurMobileParentDashboard = (): UseKangurMobileParentDashboardResult => {
  const { copy, locale } = useKangurMobileI18n();
  const { isLoadingAuth, session, supportsLearnerCredentials } = useKangurMobileAuth();

  const learnerState = useParentDashboardLearner();
  const canAccessDashboard = session.status === 'authenticated' && Boolean(session.user?.canManageLearners);

  const assignments: UseParentDashboardAssignmentsResult = useParentDashboardAssignments(canAccessDashboard, learnerState.selectedLearnerId);
  const recentResults: UseKangurMobileScoreHistoryResult = useKangurMobileScoreHistory({
      enabled: canAccessDashboard && learnerState.selectedLearnerId !== null,
      limit: 5,
      sort: '-created_date',
  });
  const progress: UseParentDashboardProgressResult = useParentDashboardProgress(canAccessDashboard, learnerState.selectedLearnerId, recentResults.scores, locale);
  const recentResultItems = useParentDashboardResults(recentResults);

  const isAuthorized = canAccessDashboard && learnerState.selectedLearnerId !== null;
  const errors = useDashboardErrors(assignments, progress, recentResults, copy);
  const loading = useDashboardLoading(isAuthorized, assignments, progress, recentResults);

  return {
      ...learnerState,
      ...errors,
      ...loading,
      assignmentItems: assignments.assignmentItems,
      assignmentMonitoring: assignments.assignmentMonitoring,
      canAccessDashboard,
      isAuthenticated: session.status === 'authenticated',
      isLoadingAuth,
      recentResultItems,
      refreshDashboard: async () => {},
      selectLearner: async () => {},
      snapshot: progress.snapshot,
      supportsLearnerCredentials,
  };
};