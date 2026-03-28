import type {
  KangurDuelLeaderboardEntry,
  KangurDuelOpponentEntry,
} from '@kangur/contracts/kangur-duels';
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

const toDuelsSummaryErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string | null => {
  if (!error) {
    return null;
  }

  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um Duellstatistiken zu laden.',
        en: 'Sign in to load duel stats.',
        pl: 'Zaloguj się, aby pobrać statystyki pojedynków.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Duellstatistiken konnten nicht geladen werden.',
      en: 'Could not load duel stats.',
      pl: 'Nie udało się pobrać statystyk pojedynków.',
    });
  }

  return message;
};

const toDuelsSummaryActionErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde dich an, um ein privates Rückspiel zu senden.',
        en: 'Sign in to send a private rematch.',
        pl: 'Zaloguj się, aby wysłać prywatny rewanż.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Das private Rückspiel konnte nicht erstellt werden.',
      en: 'Could not create the private rematch.',
      pl: 'Nie udało się utworzyć prywatnego rewanżu.',
    });
  }

  return message;
};

export const useKangurMobileLearnerDuelsSummary = ({
  leaderboardLimit,
  leaderboardLookbackDays,
  opponentsLimit,
}: UseKangurMobileLearnerDuelsSummaryOptions): UseKangurMobileLearnerDuelsSummaryResult => {
  const queryClient = useQueryClient();
  const { copy } = useKangurMobileI18n();
  const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingOpponentLearnerId, setPendingOpponentLearnerId] = useState<string | null>(null);
  const learnerIdentity =
    session.user?.activeLearner?.id ??
    session.user?.email ??
    session.user?.id ??
    'guest';
  const activeLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
  const isAuthenticated = session.status === 'authenticated';
  const isRestoringAuth = isLoadingAuth && !isAuthenticated;
  const leaderboardQueryKey = [
    'kangur-mobile',
    'duels-summary',
    'leaderboard',
    apiBaseUrl,
    learnerIdentity,
    leaderboardLimit,
    leaderboardLookbackDays,
  ] as const;
  const opponentsQueryKey = [
    'kangur-mobile',
    'duels-summary',
    'opponents',
    apiBaseUrl,
    learnerIdentity,
    opponentsLimit,
  ] as const;

  const leaderboardQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: leaderboardQueryKey,
    queryFn: async () =>
      apiClient.getDuelLeaderboard(
        {
          limit: leaderboardLimit,
          lookbackDays: leaderboardLookbackDays,
        },
        { cache: 'no-store' },
      ),
    staleTime: 30_000,
  });

  const opponentsQuery = useQuery({
    enabled: isAuthenticated,
    queryKey: opponentsQueryKey,
    queryFn: async () =>
      apiClient.listDuelOpponents(
        { limit: opponentsLimit },
        { cache: 'no-store' },
      ),
    staleTime: 30_000,
  });

  const leaderboardEntries = leaderboardQuery.data?.entries ?? [];
  const currentRank = activeLearnerId
    ? leaderboardEntries.findIndex((entry) => entry.learnerId === activeLearnerId)
    : -1;
  const currentEntry = currentRank >= 0 ? leaderboardEntries[currentRank] ?? null : null;
  const opponents = useMemo(
    () =>
      [...(opponentsQuery.data?.entries ?? [])]
        .sort((left, right) => Date.parse(right.lastPlayedAt) - Date.parse(left.lastPlayedAt))
        .slice(0, opponentsLimit),
    [opponentsLimit, opponentsQuery.data?.entries],
  );

  return {
    actionError,
    createRematch: async (opponentLearnerId) => {
      setActionError(null);
      setIsActionPending(true);
      setPendingOpponentLearnerId(opponentLearnerId);

      try {
        const response = await apiClient.createDuel(
          {
            difficulty: MOBILE_DUEL_DEFAULT_DIFFICULTY,
            mode: 'challenge',
            operation: MOBILE_DUEL_DEFAULT_OPERATION,
            opponentLearnerId,
            questionCount: MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
            timePerQuestionSec: MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
            visibility: 'private',
          },
          { cache: 'no-store' },
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: leaderboardQueryKey }),
          queryClient.invalidateQueries({ queryKey: opponentsQueryKey }),
        ]);

        return response.session.id;
      } catch (error) {
        setActionError(toDuelsSummaryActionErrorMessage(error, copy));
        return null;
      } finally {
        setIsActionPending(false);
        setPendingOpponentLearnerId(null);
      }
    },
    currentEntry,
    currentRank: currentRank >= 0 ? currentRank + 1 : null,
    error:
      toDuelsSummaryErrorMessage(opponentsQuery.error, copy) ??
      toDuelsSummaryErrorMessage(leaderboardQuery.error, copy),
    isActionPending,
    isAuthenticated,
    isLoading: isRestoringAuth || leaderboardQuery.isLoading || opponentsQuery.isLoading,
    isRestoringAuth,
    opponents,
    pendingOpponentLearnerId,
    refresh: async () => {
      await Promise.all([leaderboardQuery.refetch(), opponentsQuery.refetch()]);
    },
  };
};
