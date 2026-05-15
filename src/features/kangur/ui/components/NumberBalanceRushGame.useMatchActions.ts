'use client';

/* eslint-disable max-lines-per-function */

import { useCallback } from 'react';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  NumberBalanceMatchStateResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import type { UseNumberBalanceRushMatchActionsProps } from './NumberBalanceRushGame.types';
import {
  copyNumberBalanceMatchId,
  scheduleNumberBalanceStatusReset,
} from './NumberBalanceRushGame.runtime';
import {
  resetNumberBalanceRushMatchRuntimeState,
  applyNumberBalanceRushMatchStartResponse,
} from './NumberBalanceRushGame.logic';

type StartNumberBalanceMatchVariables =
  | {
      action: 'join';
      matchId: string;
    }
  | {
      action: 'create';
      balancedProbability: number | undefined;
      roundDurationMs: number;
      tier: UseNumberBalanceRushMatchActionsProps['tier'];
    };

const startNumberBalanceMatch = async (
  variables: StartNumberBalanceMatchVariables
): Promise<NumberBalanceMatchStateResponse> => {
  if (variables.action === 'join') {
    return api.post<NumberBalanceMatchStateResponse>(
      '/api/kangur/number-balance/join',
      { matchId: variables.matchId }
    );
  }

  return api.post<NumberBalanceMatchStateResponse>(
    '/api/kangur/number-balance/create',
    {
      roundDurationMs: variables.roundDurationMs,
      tier: variables.tier,
      balancedProbability: variables.balancedProbability,
    }
  );
};

const useStartNumberBalanceMatchMutation = (): MutationResult<
  NumberBalanceMatchStateResponse,
  StartNumberBalanceMatchVariables
> =>
  createMutationV2<NumberBalanceMatchStateResponse, StartNumberBalanceMatchVariables>({
    mutationKey: ['kangur', 'number-balance', 'match', 'start'],
    mutationFn: startNumberBalanceMatch,
    meta: {
      source: 'kangur.ui.NumberBalanceRushGame.startMatch',
      operation: 'create',
      resource: 'kangur.number-balance.match',
      domain: 'kangur',
      description: 'Creates or joins a Kangur number balance multiplayer match.',
      errorPresentation: 'inline',
      tags: ['kangur', 'number-balance', 'match'],
    },
  });

type NumberBalanceRushMatchActions = {
  handleCopyMatchId: () => Promise<void>;
  handleRetryMatch: () => void;
  initMatch: (requestedMatchId?: string) => Promise<void>;
};

export function useNumberBalanceRushMatchActions({
  balancedProbability,
  copyStatusTimeoutRef,
  durationMs,
  match,
  matchId,
  setCopyStatus,
  setCelebrating,
  setError,
  setIsLoading,
  setIsSubmitting,
  setMatch,
  setPlayer,
  setPlayerCount,
  setPuzzle,
  setScore,
  setScores,
  setSelectedTileId,
  setSolves,
  setLeftTiles,
  setRightTiles,
  setTrayTiles,
  tier,
  translations,
  lastLoadedPuzzleIndexRef,
  lastLoadedPuzzleStartRef,
  solveTimesRef,
  setServerOffsetMs,
}: UseNumberBalanceRushMatchActionsProps): NumberBalanceRushMatchActions {
  const { mutateAsync: startMatchAsync } = useStartNumberBalanceMatchMutation();

  const initMatch = useCallback(async (requestedMatchId?: string) => {
    setIsLoading(true);
    resetNumberBalanceRushMatchRuntimeState({
      lastLoadedPuzzleIndexRef,
      lastLoadedPuzzleStartRef,
      setCelebrating,
      setError,
      setIsSubmitting,
      setPlayerCount,
      setPuzzle,
      setScores,
      setSelectedTileId,
      setSolves,
      setLeftTiles,
      setRightTiles,
      setTrayTiles,
      solveTimesRef,
    });

    try {
      const response =
        typeof requestedMatchId === 'string' && requestedMatchId.length > 0
          ? await startMatchAsync({ action: 'join', matchId: requestedMatchId })
          : await startMatchAsync({
              action: 'create',
              roundDurationMs: durationMs,
              tier,
              balancedProbability,
            });

      applyNumberBalanceRushMatchStartResponse({
        response,
        setMatch,
        setPlayer,
        setPlayerCount,
        setScore,
        setScores,
        setServerOffsetMs,
      });
    } catch (_err) {
      void ErrorSystem.captureException(_err);
      setMatch(null);
      setPlayer(null);
      setError(translations('numberBalance.inRound.errors.start'));
    } finally {
      setIsLoading(false);
    }
  }, [
    balancedProbability,
    durationMs,
    lastLoadedPuzzleIndexRef,
    lastLoadedPuzzleStartRef,
    setCelebrating,
    setError,
    setIsLoading,
    setIsSubmitting,
    setLeftTiles,
    setMatch,
    setPlayer,
    setPlayerCount,
    setPuzzle,
    setRightTiles,
    setScore,
    setScores,
    setSelectedTileId,
    setServerOffsetMs,
    setSolves,
    setTrayTiles,
    solveTimesRef,
    startMatchAsync,
    tier,
    translations,
  ]);

  const handleRetryMatch = useCallback(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  const handleCopyMatchId = useCallback(async () => {
    const currentMatchId = match?.matchId;
    if (typeof currentMatchId !== 'string' || currentMatchId.length === 0) {
      return;
    }
    try {
      setCopyStatus(await copyNumberBalanceMatchId(currentMatchId));
    } catch (error) {
      void ErrorSystem.captureException(error);
      setCopyStatus('error');
    } finally {
      scheduleNumberBalanceStatusReset({
        delayMs: 2000,
        onReset: () => setCopyStatus('idle'),
        timeoutRef: copyStatusTimeoutRef,
      });
    }
  }, [copyStatusTimeoutRef, match?.matchId, setCopyStatus]);

  return {
    handleCopyMatchId,
    handleRetryMatch,
    initMatch,
  };
}
