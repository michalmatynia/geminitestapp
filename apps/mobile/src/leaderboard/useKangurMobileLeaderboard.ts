import {
  KANGUR_LEADERBOARD_OPERATION_OPTIONS,
  KANGUR_LEADERBOARD_USER_OPTIONS,
  buildKangurLeaderboardItems,
  filterKangurLeaderboardScores,
  getKangurLeaderboardOperationOptions,
  getKangurLeaderboardUserOptions,
  type KangurLeaderboardItem,
  type KangurLeaderboardUserFilter,
} from '@kangur/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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

const LEADERBOARD_MEDALS = ['🥇', '🥈', '🥉'] as const;

export const useKangurMobileLeaderboard = (
  options: UseKangurMobileLeaderboardOptions = {},
): UseKangurMobileLeaderboardResult => {
  const { copy, locale } = useKangurMobileI18n();
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

  const operationOptions = useMemo(
    () => getKangurLeaderboardOperationOptions(locale),
    [locale],
  );

  const userOptions = useMemo(
    () => getKangurLeaderboardUserOptions(locale),
    [locale],
  );

  const items = useMemo(
    () =>
      buildKangurLeaderboardItems({
        currentLearnerId: session.user?.activeLearner?.id,
        currentUserEmail: session.user?.email,
        locale,
        scores: visibleScores,
      }).map((item, index) => ({
        ...item,
        isMedal: index < LEADERBOARD_MEDALS.length,
        rankLabel: LEADERBOARD_MEDALS[index] ?? `${index + 1}.`,
      })),
    [locale, session.user?.activeLearner?.id, session.user?.email, visibleScores],
  );

  return {
    error:
      scoresQuery.error instanceof Error
        ? copy({
            de: 'Die Ergebnisse konnten nicht geladen werden.',
            en: 'Could not load the results.',
            pl: 'Nie udało się pobrać wyników.',
          })
        : null,
    isLoadingAuth,
    isLoading: isRestoringAuth || scoresQuery.isLoading,
    isRestoringAuth,
    items,
    operationFilter,
    operationOptions,
    refresh: async () => {
      await scoresQuery.refetch();
    },
    setOperationFilter,
    setUserFilter,
    userFilter,
    userOptions,
    visibleCount: visibleScores.length,
  };
};
