import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { type KangurProgressState, type KangurScore } from '@kangur/contracts/kangur';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { buildKangurLearnerProfileSnapshot } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { UseParentDashboardProgressResult } from './parent-dashboard-types';

export function useParentDashboardProgress(
  canAccessDashboard: boolean,
  selectedLearnerId: string | null,
  recentResultsScores: KangurScore[],
  locale: 'de' | 'en' | 'pl',
): UseParentDashboardProgressResult {
  const { apiBaseUrl, apiClient, defaultDailyGoalGames } = useKangurMobileRuntime();

  const progressQuery: UseQueryResult<KangurProgressState, Error> = useQuery<KangurProgressState, Error>({
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
