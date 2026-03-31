'use client';

import { useCallback } from 'react';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  NumberBalanceMatchStateResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { api } from '@/shared/lib/api-client';
import type { UseNumberBalanceRushMatchActionsProps } from './NumberBalanceRushGame.types';
import {
  copyNumberBalanceMatchId,
  scheduleNumberBalanceStatusReset,
} from './NumberBalanceRushGame.runtime';
import {
  resetNumberBalanceRushMatchRuntimeState,
  applyNumberBalanceRushMatchStartResponse,
} from './NumberBalanceRushGame.logic';

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
}: UseNumberBalanceRushMatchActionsProps) {
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
      const response = requestedMatchId
        ? await api.post<NumberBalanceMatchStateResponse>(
            '/api/kangur/number-balance/join',
            { matchId: requestedMatchId }
          )
        : await api.post<NumberBalanceMatchStateResponse>(
            '/api/kangur/number-balance/create',
            {
              roundDurationMs: durationMs,
              tier,
              balancedProbability,
            }
          );

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
    tier,
    translations,
  ]);

  const handleRetryMatch = useCallback(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  const handleCopyMatchId = useCallback(async () => {
    if (!match?.matchId) {
      return;
    }
    try {
      setCopyStatus(await copyNumberBalanceMatchId(match.matchId));
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
