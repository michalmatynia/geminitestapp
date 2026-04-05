'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  NumberBalanceMatchStateSnapshotResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { api } from '@/shared/lib/api-client';
import type { UseNumberBalanceRushPollingRuntimeProps } from './NumberBalanceRushGame.types';
import {
  resolveNumberBalanceRushPlayerSnapshot,
} from './NumberBalanceRushGame.runtime';
import {
  isTerminalMatchStatus,
} from './NumberBalanceRushGame.utils';

export function useNumberBalanceRushPollingRuntime({
  activeMatchId,
  activeMatchIdRef,
  activeMatchStatus,
  activeMatchStatusRef,
  setMatch,
  setPlayer,
  setPlayerCount,
  setScore,
  setScores,
  setServerOffsetMs,
  shouldPoll,
}: UseNumberBalanceRushPollingRuntimeProps) {
  const lastServerTimeRef = useRef<number>(0);

  const syncMatchState = useCallback(
    (response: NumberBalanceMatchStateSnapshotResponse) => {
      if (response.serverTimeMs <= lastServerTimeRef.current) {
        return;
      }
      lastServerTimeRef.current = response.serverTimeMs;
      setServerOffsetMs(response.serverTimeMs - Date.now());
      setMatch(response.match);
      setScores(response.scores);
      setPlayerCount(response.playerCount);
      setPlayer((current) => {
        const nextSnapshot = resolveNumberBalanceRushPlayerSnapshot({
          currentPlayer: current,
          nextPlayer: response.player,
        });
        setScore(nextSnapshot.score);
        return nextSnapshot.player;
      });
    },
    [setMatch, setPlayer, setPlayerCount, setScore, setScores, setServerOffsetMs]
  );

  const pollState = useCallback(async (): Promise<void> => {
    const matchId = activeMatchIdRef.current;
    if (!matchId || isTerminalMatchStatus(activeMatchStatusRef.current)) {
      return;
    }

    try {
      const response = await api.post<NumberBalanceMatchStateSnapshotResponse>(
        '/api/kangur/number-balance/state',
        { matchId }
      );
      if (activeMatchIdRef.current !== matchId || isTerminalMatchStatus(activeMatchStatusRef.current)) {
        return;
      }
      syncMatchState(response);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }, [activeMatchIdRef, activeMatchStatusRef, syncMatchState]);

  useEffect(() => {
    activeMatchIdRef.current = activeMatchId;
    activeMatchStatusRef.current = activeMatchStatus;
  }, [activeMatchId, activeMatchIdRef, activeMatchStatus, activeMatchStatusRef]);

  useEffect(() => {
    if (shouldPoll) {
      void pollState();
    }
  }, [pollState, shouldPoll]);

  useInterval(() => {
    void pollState();
  }, shouldPoll ? 1000 : null);
}
