import type { KangurDuelLeaderboardEntry } from '@kangur/contracts/kangur-duels';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileHomeDuelsLeaderboard } from '../home/useKangurMobileHomeDuelsLeaderboard';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from '../duels/mobileDuelDefaults';

type UseKangurMobileLeaderboardDuelsResult = {
  actionError: string | null;
  challengeLearner: (opponentLearnerId: string) => Promise<string | null>;
  currentEntry: KangurDuelLeaderboardEntry | null;
  currentRank: number | null;
  entries: KangurDuelLeaderboardEntry[];
  error: string | null;
  isActionPending: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingLearnerId: string | null;
  refresh: () => Promise<void>;
};

function useLeaderboardDuelsActionErrorMessage(copy: ReturnType<typeof useKangurMobileI18n>['copy']): (error: unknown) => string {
  return useCallback((error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      if ((error as { status?: number }).status === 401) {
        return copy({ de: 'Melde dich an.', en: 'Sign in.', pl: 'Zaloguj się.' });
      }
    }
    if (!(error instanceof Error)) return copy({ de: 'Fehler.', en: 'Error.', pl: 'Błąd.' });
    const message = error.message.trim();
    if (message === '' || message.toLowerCase().includes('failed to fetch')) {
       return copy({ de: 'Fehler.', en: 'Error.', pl: 'Błąd.' });
    }
    return message;
  }, [copy]);
}

function useLeaderboardRank(activeLearnerId: string | null, entries: KangurDuelLeaderboardEntry[]): number {
  return useMemo(() => {
    if (activeLearnerId === null) return -1;
    return entries.findIndex((entry) => entry.learnerId === activeLearnerId);
  }, [activeLearnerId, entries]);
}

type ChallengeActionState = {
  actionError: string | null;
  isActionPending: boolean;
  pendingLearnerId: string | null;
  challengeLearner: (opponentLearnerId: string) => Promise<string | null>;
};

function performDuelChallenge(apiClient: any, queryClient: any, opponentLearnerId: string, apiBaseUrl: string) {
  return apiClient.createDuel({
    difficulty: MOBILE_DUEL_DEFAULT_DIFFICULTY, mode: 'challenge', operation: MOBILE_DUEL_DEFAULT_OPERATION,
    opponentLearnerId, questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT, timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
    visibility: 'private',
  }, { cache: 'no-store' }).then(async (response: any) => {
    await queryClient.invalidateQueries({ queryKey: ['kangur-mobile', 'home', 'duels-leaderboard', apiBaseUrl] });
    return response.session.id;
  });
}

function useLeaderboardChallengeAction(toErrorMessage: (error: unknown) => string): ChallengeActionState {
  const queryClient = useQueryClient();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingLearnerId, setPendingLearnerId] = useState<string | null>(null);

  const challengeLearner = useCallback(async (opponentLearnerId: string) => {
    setActionError(null);
    setIsActionPending(true);
    setPendingLearnerId(opponentLearnerId);
    try {
      return await performDuelChallenge(apiClient, queryClient, opponentLearnerId, apiBaseUrl);
    } catch (error) {
      setActionError(toErrorMessage(error));
      return null;
    } finally {
      setIsActionPending(false);
      setPendingLearnerId(null);
    }
  }, [apiClient, toErrorMessage, queryClient, apiBaseUrl]);

  return { actionError, isActionPending, pendingLearnerId, challengeLearner };
}

export const useKangurMobileLeaderboardDuels =
  (): UseKangurMobileLeaderboardDuelsResult => {
    const { copy } = useKangurMobileI18n();
    const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard();
    const { session } = useKangurMobileAuth();
    const activeLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
    const isAuthenticated = session.status === 'authenticated';
    const toErrorMessage = useLeaderboardDuelsActionErrorMessage(copy);

    const currentIdx = useLeaderboardRank(activeLearnerId, duelLeaderboard.entries);
    const challengeAction = useLeaderboardChallengeAction(toErrorMessage);

    return {
      ...challengeAction,
      currentEntry: currentIdx >= 0 ? duelLeaderboard.entries[currentIdx] ?? null : null,
      currentRank: currentIdx >= 0 ? currentIdx + 1 : null,
      entries: duelLeaderboard.entries, error: duelLeaderboard.error,
      isAuthenticated, isLoading: duelLeaderboard.isLoading,
      refresh: duelLeaderboard.refresh,
    };
  };
