import type { KangurDuelLeaderboardEntry } from '@kangur/contracts/kangur-duels';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { toDuelsSummaryErrorMessage } from './useKangurMobileLearnerDuelsSummary.errors';
import { useSummaryIdentity } from './useDuelsSummaryIdentity';
import { useDuelsSummaryRematch } from './useDuelsSummaryRematch';
import type { UseKangurMobileLearnerDuelsSummaryResult } from './duels-summary-types';
import type { DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

function resolveLearnerRank(
  activeLearnerId: string | null, 
  entries: KangurDuelLeaderboardEntry[]
): { rank: number | null; entry: KangurDuelLeaderboardEntry | null } {
  const index = activeLearnerId !== null ? entries.findIndex((e) => e.learnerId === activeLearnerId) : -1;
  return { rank: index >= 0 ? index + 1 : null, entry: index >= 0 ? (entries[index] ?? null) : null };
}

function resolveOpponents(data: { entries: KangurDuelLeaderboardEntry[] } | undefined, opponentsLimit: number): KangurDuelLeaderboardEntry[] {
  const rawEntries = data?.entries ?? [];
  return [...rawEntries]
    .sort((l, r) => Date.parse(r.lastPlayedAt) - Date.parse(l.lastPlayedAt))
    .slice(0, opponentsLimit);
}

export const useKangurMobileLearnerDuelsSummary = ({
  leaderboardLimit,
  leaderboardLookbackDays,
  opponentsLimit,
}: {
  leaderboardLimit: number;
  leaderboardLookbackDays: number;
  opponentsLimit: number;
}): UseKangurMobileLearnerDuelsSummaryResult => {
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
  const apiClient = rawApiClient as unknown as DuelApiClient;
  const { isLoadingAuth, session: authSession } = useKangurMobileAuth();
  
  const { learnerIdentity, activeLearnerId } = useSummaryIdentity(authSession);
  const isAuthenticated = authSession.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;

  const queryKeyBase = useMemo(
    () => ({
      leaderboard: ['kangur-mobile', 'duels-summary', 'leaderboard', apiBaseUrl, learnerIdentity, leaderboardLimit, leaderboardLookbackDays] as const,
      opponents: ['kangur-mobile', 'duels-summary', 'opponents', apiBaseUrl, learnerIdentity, opponentsLimit] as const,
    }),
    [apiBaseUrl, learnerIdentity, leaderboardLimit, leaderboardLookbackDays, opponentsLimit],
  );

  const leaderboardQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: queryKeyBase.leaderboard,
    queryFn: async () => apiClient.getDuelLeaderboard({ limit: leaderboardLimit, lookbackDays: leaderboardLookbackDays }, { cache: 'no-store' }),
    staleTime: 30_000,
  });

  const opponentsQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: queryKeyBase.opponents,
    queryFn: async () => apiClient.listDuelOpponents({ limit: opponentsLimit }, { cache: 'no-store' }),
    staleTime: 30_000,
  });

  const { rank: currentRank, entry: currentEntry } = resolveLearnerRank(activeLearnerId, leaderboardQuery.data?.entries ?? []);

  const opponents = useMemo(() => resolveOpponents(opponentsQuery.data, opponentsLimit), [opponentsLimit, opponentsQuery.data]);

  const { actionError, isActionPending, pendingOpponentLearnerId, createRematch } = useDuelsSummaryRematch(apiClient, queryKeyBase);

  return {
    actionError,
    createRematch,
    currentEntry,
    currentRank,
    error: toDuelsSummaryErrorMessage(opponentsQuery.error, copy) ?? toDuelsSummaryErrorMessage(leaderboardQuery.error, copy),
    isActionPending,
    isAuthenticated,
    isLoading: isRestoringAuth || leaderboardQuery.isLoading || opponentsQuery.isLoading,
    isRestoringAuth,
    opponents,
    pendingOpponentLearnerId,
    refresh: async (): Promise<void> => {
      await Promise.all([leaderboardQuery.refetch(), opponentsQuery.refetch()]);
    },
  };
};
