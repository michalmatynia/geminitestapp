import type { KangurDuelLeaderboardEntry } from '@kangur/contracts-duels';
import { useQuery } from '@tanstack/react-query';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

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
  if (!error) {
    return null;
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die Duell-Rangliste konnte nicht geladen werden.',
      en: 'Could not load the duel leaderboard.',
      pl: 'Nie udało się pobrać rankingu pojedynków.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die Duell-Rangliste konnte nicht geladen werden.',
      en: 'Could not load the duel leaderboard.',
      pl: 'Nie udało się pobrać rankingu pojedynków.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Duell-Rangliste konnte nicht geladen werden.',
      en: 'Could not load the duel leaderboard.',
      pl: 'Nie udało się pobrać rankingu pojedynków.',
    });
  }

  return message;
};

export const useKangurMobileHomeDuelsLeaderboard = ({
  enabled = true,
}: UseKangurMobileHomeDuelsLeaderboardOptions = {}): UseKangurMobileHomeDuelsLeaderboardResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();

  const leaderboardQuery = useQuery({
    enabled,
    queryKey: [
      'kangur-mobile',
      'home',
      'duels-leaderboard',
      apiBaseUrl,
    ] as const,
    queryFn: async () =>
      apiClient.getDuelLeaderboard(
        {
          limit: MOBILE_HOME_DUELS_LEADERBOARD_LIMIT,
          lookbackDays: MOBILE_HOME_DUELS_LEADERBOARD_LOOKBACK_DAYS,
        },
        { cache: 'no-store' },
      ),
    refetchInterval: MOBILE_HOME_DUELS_LEADERBOARD_POLL_MS,
    staleTime: 15_000,
  });

  return {
    entries: leaderboardQuery.data?.entries ?? [],
    error: toLeaderboardErrorMessage(leaderboardQuery.error, copy),
    isLoading: enabled && leaderboardQuery.isLoading,
    refresh: async () => {
      if (!enabled) {
        return;
      }

      await leaderboardQuery.refetch();
    },
  };
};
