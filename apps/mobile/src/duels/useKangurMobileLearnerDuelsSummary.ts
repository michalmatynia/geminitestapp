import type { KangurDuelLeaderboardEntry, KangurDuelOpponentEntry } from '@kangur/contracts/kangur-duels';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from './mobileDuelDefaults';

type UseKangurMobileLearnerDuelsSummaryOptions = {
  leaderboardLimit: number;
  leaderboardLookbackDays: number;
  opponentsLimit: number;
};

export type UseKangurMobileLearnerDuelsSummaryResult = {
  actionError: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  opponents: KangurDuelOpponentEntry[];
  pendingOpponentLearnerId: string | null;
  refresh: () => Promise<void>;
};

import { toDuelsSummaryErrorMessage, toDuelsSummaryActionErrorMessage } from './useKangurMobileLearnerDuelsSummary.errors';

function resolveLearnerRank(
  activeLearnerId: string | null, 
  entries: KangurDuelLeaderboardEntry[]
): { rank: number | null; entry: KangurDuelLeaderboardEntry | null } {
  const index = activeLearnerId !== null ? entries.findIndex((e) => e.learnerId === activeLearnerId) : -1;
  return { rank: index >= 0 ? index + 1 : null, entry: index >= 0 ? (entries[index] ?? null) : null };
}

import type { QueryClient } from '@tanstack/react-query';
import type { KangurMobileLocalizedValue } from '../i18n/kangurMobileI18n';
import type { DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

type DuelCopy = (value: KangurMobileLocalizedValue<string>) => string;

interface RematchOptions {
  apiClient: DuelApiClient;
  queryClient: QueryClient;
  queryKeyBase: { leaderboard: readonly unknown[]; opponents: readonly unknown[] };
  opponentLearnerId: string;
  copy: DuelCopy;
  setActionError: (err: string | null) => void;
  setIsActionPending: (pending: boolean) => void;
  setPendingOpponentLearnerId: (id: string | null) => void;
}

async function performRematch(options: RematchOptions): Promise<string | null> {
  const { apiClient, queryClient, queryKeyBase, opponentLearnerId, copy, setActionError, setIsActionPending, setPendingOpponentLearnerId } = options;
  setActionError(null);
  setIsActionPending(true);
  setPendingOpponentLearnerId(opponentLearnerId);
  try {
    const resp = await apiClient.createDuel({
      difficulty: MOBILE_DUEL_DEFAULT_DIFFICULTY,
      mode: 'challenge',
      operation: MOBILE_DUEL_DEFAULT_OPERATION,
      opponentLearnerId,
      questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
      timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
      visibility: 'private',
    }, { cache: 'no-store' });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeyBase.leaderboard }),
      queryClient.invalidateQueries({ queryKey: queryKeyBase.opponents }),
    ]);
    return (resp as { session?: { id: string } })?.session?.id ?? null;
  } catch (err: unknown) {
    setActionError(toDuelsSummaryActionErrorMessage(err, copy));
    return null;
  } finally {
    setIsActionPending(false);
    setPendingOpponentLearnerId(null);
  }
}

export const useKangurMobileLearnerDuelsSummary = ({
  leaderboardLimit,
  leaderboardLookbackDays,
  opponentsLimit,
}: UseKangurMobileLearnerDuelsSummaryOptions): UseKangurMobileLearnerDuelsSummaryResult => {
  const queryClient = useQueryClient();
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient: rawApiClient } = useKangurMobileRuntime();
  const apiClient = rawApiClient as unknown as DuelApiClient;
  const { isLoadingAuth, session: authSession } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingOpponentLearnerId, setPendingOpponentLearnerId] = useState<string | null>(null);
  
  const learnerIdentity = useMemo(() => authSession.user?.activeLearner?.id ?? authSession.user?.email ?? authSession.user?.id ?? 'guest', [authSession.user]);
  const activeLearnerId = authSession.user?.activeLearner?.id ?? authSession.user?.id ?? null;
  const isAuthenticated = authSession.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && isAuthenticated === false;

  const queryKeyBase = useMemo(() => ({
    leaderboard: ['kangur-mobile', 'duels-summary', 'leaderboard', apiBaseUrl, learnerIdentity, leaderboardLimit, leaderboardLookbackDays] as const,
    opponents: ['kangur-mobile', 'duels-summary', 'opponents', apiBaseUrl, learnerIdentity, opponentsLimit] as const,
  }), [apiBaseUrl, learnerIdentity, leaderboardLimit, leaderboardLookbackDays, opponentsLimit]);

  const leaderboardQuery = useQuery({ enabled: isAuthenticated, queryKey: queryKeyBase.leaderboard, queryFn: async () => apiClient.getDuelLeaderboard({ limit: leaderboardLimit, lookbackDays: leaderboardLookbackDays }, { cache: 'no-store' }), staleTime: 30_000 });
  const opponentsQuery = useQuery({ enabled: isAuthenticated, queryKey: queryKeyBase.opponents, queryFn: async () => apiClient.listDuelOpponents({ limit: opponentsLimit }, { cache: 'no-store' }), staleTime: 30_000 });

  const { rank: currentRank, entry: currentEntry } = resolveLearnerRank(activeLearnerId ?? null, leaderboardQuery.data?.entries ?? []);
  const opponents = useMemo(() => [...(opponentsQuery.data?.entries ?? [])].sort((l, r) => Date.parse(r.lastPlayedAt) - Date.parse(l.lastPlayedAt)).slice(0, opponentsLimit), [opponentsLimit, opponentsQuery.data?.entries]);

  const createRematch = async (opponentLearnerId: string): Promise<string | null> => {
    return performRematch({ apiClient, queryClient, queryKeyBase, opponentLearnerId, copy, setActionError, setIsActionPending, setPendingOpponentLearnerId });
  };

  return {
    actionError, createRematch, currentEntry, currentRank,
    error: toDuelsSummaryErrorMessage(opponentsQuery.error, copy) ?? toDuelsSummaryErrorMessage(leaderboardQuery.error, copy),
    isActionPending, isAuthenticated, isLoading: isRestoringAuth || leaderboardQuery.isLoading || opponentsQuery.isLoading,
    isRestoringAuth, opponents, pendingOpponentLearnerId,
    refresh: async (): Promise<void> => { await Promise.all([leaderboardQuery.refetch(), opponentsQuery.refetch()]); },
  };
};
