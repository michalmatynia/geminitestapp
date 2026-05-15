'use client';

/* eslint-disable max-lines-per-function */

import { useCallback, useEffect, useRef } from 'react';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import type {
  NumberBalanceMatchStateSnapshotResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import type { UseNumberBalanceRushPollingRuntimeProps } from './NumberBalanceRushGame.types';
import {
  resolveNumberBalanceRushPlayerSnapshot,
} from './NumberBalanceRushGame.runtime';
import {
  isTerminalMatchStatus,
} from './NumberBalanceRushGame.utils';

type LoadNumberBalanceMatchStateVariables = {
  matchId: string;
};

const loadNumberBalanceMatchState = async ({
  matchId,
}: LoadNumberBalanceMatchStateVariables): Promise<NumberBalanceMatchStateSnapshotResponse> =>
  api.post<NumberBalanceMatchStateSnapshotResponse>(
    '/api/kangur/number-balance/state',
    { matchId }
  );

const useLoadNumberBalanceMatchStateMutation = (): MutationResult<
  NumberBalanceMatchStateSnapshotResponse,
  LoadNumberBalanceMatchStateVariables
> =>
  useMutationV2<
    NumberBalanceMatchStateSnapshotResponse,
    LoadNumberBalanceMatchStateVariables
  >({
    mutationKey: ['kangur', 'number-balance', 'match', 'state'],
    mutationFn: loadNumberBalanceMatchState,
    meta: {
      source: 'kangur.ui.NumberBalanceRushGame.pollState',
      operation: 'action',
      resource: 'kangur.number-balance.match',
      domain: 'kangur',
      description: 'Polls the latest number balance match state.',
      errorPresentation: 'silent',
      tags: ['kangur', 'number-balance', 'match'],
    },
  });

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
}: UseNumberBalanceRushPollingRuntimeProps): void {
  const { mutateAsync: loadMatchStateAsync } = useLoadNumberBalanceMatchStateMutation();
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
    if (
      typeof matchId !== 'string' ||
      matchId.length === 0 ||
      isTerminalMatchStatus(activeMatchStatusRef.current)
    ) {
      return;
    }

    try {
      const response = await loadMatchStateAsync({ matchId });
      if (activeMatchIdRef.current !== matchId || isTerminalMatchStatus(activeMatchStatusRef.current)) {
        return;
      }
      syncMatchState(response);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }, [activeMatchIdRef, activeMatchStatusRef, loadMatchStateAsync, syncMatchState]);

  useEffect(() => {
    const matchIdRef = activeMatchIdRef;
    const matchStatusRef = activeMatchStatusRef;
    matchIdRef.current = activeMatchId;
    matchStatusRef.current = activeMatchStatus;
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
