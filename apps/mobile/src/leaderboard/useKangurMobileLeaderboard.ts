import {
  KANGUR_LEADERBOARD_OPERATION_OPTIONS,
  KANGUR_LEADERBOARD_USER_OPTIONS,
  buildKangurLeaderboardItems,
  filterKangurLeaderboardScores,
  type KangurLeaderboardItem,
  type KangurLeaderboardUserFilter,
} from '@kangur/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type UseKangurMobileLeaderboardOptions = {
  enabled?: boolean;
  limit?: number;
};

type UseKangurMobileLeaderboardResult = {
  error: string | null;
  isLoadingAuth: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  items: KangurLeaderboardItem[];
  operationFilter: string;
  operationOptions: typeof KANGUR_LEADERBOARD_OPERATION_OPTIONS;
  refresh: () => Promise<void>;
  userFilter: KangurLeaderboardUserFilter;
  userOptions: typeof KANGUR_LEADERBOARD_USER_OPTIONS;
  visibleCount: number;
  setOperationFilter: (value: string) => void;
  setUserFilter: (value: KangurLeaderboardUserFilter) => void;
};

export const useKangurMobileLeaderboard = (
  options: UseKangurMobileLeaderboardOptions = {},
): UseKangurMobileLeaderboardResult => {
  const enabled = options.enabled ?? true;
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 10;
  const { apiClient, apiBaseUrl } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [operationFilter, setOperationFilter] = useState('all');
  const [userFilter, setUserFilter] =
    useState<KangurLeaderboardUserFilter>('all');
  const isRestoringAuth =
    isLoadingAuth && session.status !== 'authenticated';

  const scoresQuery = useQuery({
    enabled,
    queryKey: ['kangur-mobile', 'leaderboard', apiBaseUrl],
    queryFn: async () =>
      apiClient.listScores(
        {
          sort: '-score',
          limit: 100,
        },
        {
          cache: 'no-store',
        },
      ),
    staleTime: 30_000,
  });

  const visibleScores = useMemo(
    () =>
      filterKangurLeaderboardScores(scoresQuery.data ?? [], {
        limit,
        operationFilter,
        userFilter,
      }),
    [limit, operationFilter, scoresQuery.data, userFilter],
  );

  const items = useMemo(
    () =>
      buildKangurLeaderboardItems({
        currentUserEmail: session.user?.email ?? null,
        currentLearnerId: session.user?.activeLearner?.id ?? null,
        scores: visibleScores,
      }),
    [session.user?.activeLearner?.id, session.user?.email, visibleScores],
  );

  return {
    error:
      scoresQuery.error instanceof Error
        ? 'Nie udało się pobrać wyników.'
        : null,
    isLoadingAuth,
    isLoading: isRestoringAuth || scoresQuery.isLoading,
    isRestoringAuth,
    items,
    operationFilter,
    operationOptions: KANGUR_LEADERBOARD_OPERATION_OPTIONS,
    refresh: async () => {
      await scoresQuery.refetch();
    },
    setOperationFilter,
    setUserFilter,
    userFilter,
    userOptions: KANGUR_LEADERBOARD_USER_OPTIONS,
    visibleCount: visibleScores.length,
  };
};
