import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  MOBILE_DUEL_DEFAULT_DIFFICULTY,
  MOBILE_DUEL_DEFAULT_OPERATION,
  MOBILE_DUEL_DEFAULT_QUESTION_COUNT,
  MOBILE_DUEL_DEFAULT_TIME_PER_QUESTION_SEC,
} from './mobileDuelDefaults';
import { toDuelsSummaryActionErrorMessage } from './useKangurMobileLearnerDuelsSummary.errors';
import type { DuelApiClient } from './useKangurMobileDuelsLobbyQueries';

export interface UseDuelsSummaryRematchResult {
  actionError: string | null;
  isActionPending: boolean;
  pendingOpponentLearnerId: string | null;
  createRematch: (opponentLearnerId: string) => Promise<string | null>;
}

export function useDuelsSummaryRematch(
  apiClient: DuelApiClient,
  queryKeyBase: { leaderboard: readonly unknown[]; opponents: readonly unknown[] },
): UseDuelsSummaryRematchResult {
  const queryClient = useQueryClient();
  const { copy } = useKangurMobileI18n();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [pendingOpponentLearnerId, setPendingOpponentLearnerId] = useState<string | null>(null);

  const createRematch = useCallback(
    async (opponentLearnerId: string): Promise<string | null> => {
      setActionError(null);
      setIsActionPending(true);
      setPendingOpponentLearnerId(opponentLearnerId);
      try {
        const resp = await apiClient.createDuel(
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
          queryClient.invalidateQueries({ queryKey: queryKeyBase.leaderboard }),
          queryClient.invalidateQueries({ queryKey: queryKeyBase.opponents }),
        ]);

        return resp.session?.id ?? null;
      } catch (err: unknown) {
        setActionError(toDuelsSummaryActionErrorMessage(err, copy));
        return null;
      } finally {
        setIsActionPending(false);
        setPendingOpponentLearnerId(null);
      }
    },
    [apiClient, queryClient, queryKeyBase, copy],
  );

  return { actionError, isActionPending, pendingOpponentLearnerId, createRematch };
}
