import type { KangurDuelLeaderboardEntry } from '@kangur/contracts/kangur-duels';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileQueryV2 } from '../query/kangurMobileQueryFactories';

const MOBILE_HOME_DUELS_LEADERBOARD_LIMIT = 4;
const MOBILE_HOME_DUELS_LEADERBOARD_LOOKBACK_DAYS = 14;
const MOBILE_HOME_DUELS_LEADERBOARD_POLL_MS = 30_000;

type UseKangurMobileHomeDuelsLeaderboardResult = {
  entries: KangurDuelLeaderboardEntry[];
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

type UseKangurMobileHomeDuelsLeaderboardOptions = {
  enabled?: boolean;
};

const toLeaderboardErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string | null => {
  if (error === null || error === undefined || error === false) {
    return null;
  }

  const fallbackMsg = copy({
    de: 'Die Duell-Rangliste konnte nicht geladen werden.',
    en: 'Could not load the duel leaderboard.',
    pl: 'Nie udało się pobrać rankingu pojedynków.',
  });

  if (!(error instanceof Error)) {
    return fallbackMsg;
  }

  const message = error.message.trim();
  if (message === '') {
    return fallbackMsg;
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return fallbackMsg;
  }

  return message;
};

export const useKangurMobileHomeDuelsLeaderboard = ({
  enabled = true,
}: UseKangurMobileHomeDuelsLeaderboardOptions = {}): UseKangurMobileHomeDuelsLeaderboardResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();

  const queryKey = ['kangur-mobile', 'home', 'duels-leaderboard', apiBaseUrl] as const;
  const leaderboardQuery = useKangurMobileQueryV2({
    enabled,
    queryKey,
    queryFn: async () => apiClient.getDuelLeaderboard(
        { limit: MOBILE_HOME_DUELS_LEADERBOARD_LIMIT, lookbackDays: MOBILE_HOME_DUELS_LEADERBOARD_LOOKBACK_DAYS },
        { cache: 'no-store' }
    ),
    refetchInterval: MOBILE_HOME_DUELS_LEADERBOARD_POLL_MS,
    staleTime: 15_000,
    meta: {
      source: 'kangur.mobile.home.duels.leaderboard',
      operation: 'list',
      resource: 'kangur.mobile.home.duels.leaderboard',
      queryKey,
      description: 'Loads Kangur mobile home duel leaderboard.',
      tags: ['kangur-mobile', 'home', 'duels', 'leaderboard'],
    },
  });

  return {
    entries: leaderboardQuery.data?.entries ?? [],
    error: toLeaderboardErrorMessage(leaderboardQuery.error, copy),
    isLoading: enabled && leaderboardQuery.isLoading,
    refresh: async () => { if (enabled) await leaderboardQuery.refetch(); },
  };
};
