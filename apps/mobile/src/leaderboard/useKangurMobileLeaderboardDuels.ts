import type { KangurDuelLeaderboardEntry } from '@kangur/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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

const toLeaderboardDuelsActionErrorMessage = (
  error: unknown,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number }).status;

    if (status === 401) {
      return copy({
        de: 'Melde die Schulersitzung an, um ein privates Duell zu senden.',
        en: 'Sign in the learner session to send a private duel.',
        pl: 'Zaloguj sesję ucznia, aby wysłać prywatny pojedynek.',
      });
    }
  }

  if (!(error instanceof Error)) {
    return copy({
      de: 'Das private Duell konnte nicht erstellt werden.',
      en: 'Could not create the private duel.',
      pl: 'Nie udało się utworzyć prywatnego pojedynku.',
    });
  }

  const message = error.message.trim();
  if (!message) {
    return copy({
      de: 'Das private Duell konnte nicht erstellt werden.',
      en: 'Could not create the private duel.',
      pl: 'Nie udało się utworzyć prywatnego pojedynku.',
    });
  }

  const normalized = message.toLowerCase();
  if (normalized === 'failed to fetch' || normalized.includes('networkerror')) {
    return copy({
      de: 'Die Verbindung zur Kangur-API konnte nicht hergestellt werden.',
      en: 'Could not connect to the Kangur API.',
      pl: 'Nie udało się połączyć z API Kangura.',
    });
  }

  return message;
};

export const useKangurMobileLeaderboardDuels =
  (): UseKangurMobileLeaderboardDuelsResult => {
    const queryClient = useQueryClient();
    const { copy } = useKangurMobileI18n();
    const { apiBaseUrl, apiClient } = useKangurMobileRuntime();
    const duelLeaderboard = useKangurMobileHomeDuelsLeaderboard();
    const { session } = useKangurMobileAuth();
    const [actionError, setActionError] = useState<string | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);
    const [pendingLearnerId, setPendingLearnerId] = useState<string | null>(null);
    const activeLearnerId = session.user?.activeLearner?.id ?? session.user?.id ?? null;
    const isAuthenticated = session.status === 'authenticated';
    const leaderboardQueryKey = [
      'kangur-mobile',
      'home',
      'duels-leaderboard',
      apiBaseUrl,
    ] as const;

    const currentRank = useMemo(() => {
      if (!activeLearnerId) {
        return -1;
      }

      return duelLeaderboard.entries.findIndex((entry) => entry.learnerId === activeLearnerId);
    }, [activeLearnerId, duelLeaderboard.entries]);

    return {
      actionError,
      challengeLearner: async (opponentLearnerId) => {
        setActionError(null);
        setIsActionPending(true);
        setPendingLearnerId(opponentLearnerId);

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

          await queryClient.invalidateQueries({ queryKey: leaderboardQueryKey });
          return response.session.id;
        } catch (error) {
          setActionError(toLeaderboardDuelsActionErrorMessage(error, copy));
          return null;
        } finally {
          setIsActionPending(false);
          setPendingLearnerId(null);
        }
      },
      currentEntry: currentRank >= 0 ? duelLeaderboard.entries[currentRank] ?? null : null,
      currentRank: currentRank >= 0 ? currentRank + 1 : null,
      entries: duelLeaderboard.entries,
      error: duelLeaderboard.error,
      isActionPending,
      isAuthenticated,
      isLoading: duelLeaderboard.isLoading,
      pendingLearnerId,
      refresh: duelLeaderboard.refresh,
    };
  };
