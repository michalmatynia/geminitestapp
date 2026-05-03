import { useState } from 'react';
import { type KangurDuelDifficulty, type KangurDuelOperation } from '@kangur/contracts/kangur-duels';
import { type KangurMobileDuelSeriesBestOf } from './useKangurMobileDuelsLobby';

export interface UseDuelsLobbyActions {
  createPrivateChallenge: (opponentLearnerId: string, overrides?: { difficulty?: KangurDuelDifficulty; operation?: KangurDuelOperation; seriesBestOf?: KangurMobileDuelSeriesBestOf }) => Promise<string | null>;
  createPublicChallenge: (overrides?: { difficulty?: KangurDuelDifficulty; operation?: KangurDuelOperation; seriesBestOf?: KangurMobileDuelSeriesBestOf }) => Promise<string | null>;
  createQuickMatch: (overrides?: { difficulty?: KangurDuelDifficulty; operation?: KangurDuelOperation; seriesBestOf?: KangurMobileDuelSeriesBestOf }) => Promise<string | null>;
  joinDuel: (sessionId: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  actionError: string | null;
  isActionPending: boolean;
}

export interface ApiClient {
  createDuel: (data: Record<string, unknown>, options: { cache: string }) => Promise<{ session: { id: string } }>;
  joinDuel: (data: { sessionId: string }, options: { cache: string }) => Promise<{ session: { id: string } }>;
}

export interface LobbyActionsParams {
  apiClient: ApiClient;
  refresh: () => Promise<void>;
  operation: KangurDuelOperation;
  difficulty: KangurDuelDifficulty;
  seriesBestOf: KangurMobileDuelSeriesBestOf;
}

export function useKangurMobileDuelsLobbyActions(params: LobbyActionsParams): UseDuelsLobbyActions {
  const { apiClient, refresh, operation, difficulty, seriesBestOf } = params;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  const runSessionAction = async (action: () => Promise<{ session: { id: string } }>): Promise<string | null> => {
    setIsActionPending(true);
    setActionError(null);
    try {
      const response = await action();
      await refresh();
      return response.session.id;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setIsActionPending(false);
    }
  };

  const createDuelAction = (data: Record<string, unknown>): Promise<string | null> => runSessionAction(
    () => apiClient.createDuel(data, { cache: 'no-store' })
  );

  const resolveSeriesInput = (value: KangurMobileDuelSeriesBestOf): { seriesBestOf?: KangurMobileDuelSeriesBestOf } => (value > 1 ? { seriesBestOf: value } : {});

  return {
    createPrivateChallenge: (opponentLearnerId, overrides) => createDuelAction({
      mode: 'challenge', visibility: 'private', opponentLearnerId,
      operation: overrides?.operation ?? operation, difficulty: overrides?.difficulty ?? difficulty,
      questionCount: 10, ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf), timePerQuestionSec: 15,
    }),
    createPublicChallenge: (overrides) => createDuelAction({
      mode: 'challenge', visibility: 'public',
      operation: overrides?.operation ?? operation, difficulty: overrides?.difficulty ?? difficulty,
      questionCount: 10, ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf), timePerQuestionSec: 15,
    }),
    createQuickMatch: (overrides) => createDuelAction({
      mode: 'quick_match', visibility: 'public',
      operation: overrides?.operation ?? operation, difficulty: overrides?.difficulty ?? difficulty,
      questionCount: 10, ...resolveSeriesInput(overrides?.seriesBestOf ?? seriesBestOf), timePerQuestionSec: 15,
    }),
    joinDuel: (sessionId) => runSessionAction(() => apiClient.joinDuel({ sessionId }, { cache: 'no-store' })),
    refresh,
    actionError,
    isActionPending,
  };
}
