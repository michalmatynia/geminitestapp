import { useMemo } from 'react';
import { type UseQueryResult } from '@tanstack/react-query';
import { type KangurProgressState, type KangurScore } from '@kangur/contracts/kangur';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { buildKangurLearnerProfileSnapshot } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import type { UseParentDashboardProgressResult } from './parent-dashboard-types';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

export function useParentDashboardProgress(
  canAccessDashboard: boolean,
  selectedLearnerId: string | null,
  recentResultsScores: KangurScore[],
  locale: 'de' | 'en' | 'pl',
): UseParentDashboardProgressResult {
  const { apiBaseUrl, apiClient, defaultDailyGoalGames } = useKangurMobileRuntime();

  const queryKey = ['kangur-mobile', 'parent-dashboard', 'progress', apiBaseUrl, selectedLearnerId ?? 'none'] as const;
  const progressQuery: UseQueryResult<KangurProgressState, Error> = useKangurMobileQueryV2<KangurProgressState>({
    enabled: canAccessDashboard && selectedLearnerId !== null,
    queryKey,
    queryFn: async (): Promise<KangurProgressState> => apiClient.getProgress(undefined, { cache: 'no-store' }),
    staleTime: 30_000,
    meta: {
      source: 'kangur.mobile.parent.progress',
      operation: 'detail',
      resource: 'kangur.mobile.parent.progress',
      queryKey,
      description: 'Loads Kangur mobile parent dashboard progress.',
      tags: ['kangur-mobile', 'parent-dashboard', 'progress'],
    },
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
