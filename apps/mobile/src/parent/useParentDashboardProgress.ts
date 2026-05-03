import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type KangurProgressState } from '@kangur/contracts/kangur';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { buildKangurLearnerProfileSnapshot } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';

export function useParentDashboardProgress(
  canAccessDashboard: boolean,
  selectedLearnerId: string | null,
  recentResultsScores: any[],
  locale: any,
) {
  const { apiBaseUrl, apiClient, defaultDailyGoalGames } = useKangurMobileRuntime();

  const progressQuery = useQuery({
    enabled: canAccessDashboard && selectedLearnerId !== null,
    queryKey: ['kangur-mobile', 'parent-dashboard', 'progress', apiBaseUrl, selectedLearnerId ?? 'none'],
    queryFn: async (): Promise<KangurProgressState> => apiClient.getProgress(undefined, { cache: 'no-store' }),
    staleTime: 30_000,
  });

  const snapshot = useMemo(() => {
    if (!canAccessDashboard || selectedLearnerId === null) return null;
    return buildKangurLearnerProfileSnapshot({
      dailyGoalGames: defaultDailyGoalGames,
      locale,
      progress: progressQuery.data ?? createDefaultKangurProgressState(),
      scores: recentResultsScores,
    });
  }, [canAccessDashboard, defaultDailyGoalGames, locale, progressQuery.data, recentResultsScores, selectedLearnerId]);

  return { progressQuery, snapshot };
}
