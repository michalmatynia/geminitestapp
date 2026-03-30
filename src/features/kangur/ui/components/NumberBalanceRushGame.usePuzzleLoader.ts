'use client';

import { useCallback, useEffect } from 'react';
import {
  createNumberBalancePuzzle,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { UseNumberBalanceRushPuzzleLoaderProps } from './NumberBalanceRushGame.types';
import {
  applyNumberBalanceRushRoundState,
  syncNumberBalanceLoadedPuzzle,
} from './NumberBalanceRushGame.logic';

export function useNumberBalanceRushPuzzleLoader({
  lastLoadedPuzzleIndexRef,
  lastLoadedPuzzleStartRef,
  match,
  player,
  puzzleStartedAtRef,
  serverOffsetMs,
  setLeftTiles,
  setPuzzle,
  setRightTiles,
  setTrayTiles,
}: UseNumberBalanceRushPuzzleLoaderProps): void {
  const loadPuzzle = useCallback(
    (
      nextPuzzleIndex: number,
      matchState: NumberBalanceMatchState,
      playerState: NumberBalanceMatchPlayerState
    ) => {
      const nextPuzzle = createNumberBalancePuzzle({
        tier: matchState.tier,
        puzzleIndex: nextPuzzleIndex,
        seed: matchState.seed,
        balancedProbability: matchState.balancedProbability,
      });
      setPuzzle(nextPuzzle);
      applyNumberBalanceRushRoundState({
        roundState: {
          tray: nextPuzzle.tiles,
          left: [],
          right: [],
        },
        setLeftTiles,
        setRightTiles,
        setTrayTiles,
      });
      puzzleStartedAtRef.current = playerState.puzzleStartedAtMs - serverOffsetMs;
    },
    [puzzleStartedAtRef, serverOffsetMs, setLeftTiles, setPuzzle, setRightTiles, setTrayTiles]
  );

  useEffect(() => {
    syncNumberBalanceLoadedPuzzle({
      lastLoadedPuzzleIndexRef,
      lastLoadedPuzzleStartRef,
      loadPuzzle,
      match,
      player,
    });
  }, [lastLoadedPuzzleIndexRef, lastLoadedPuzzleStartRef, loadPuzzle, match, player]);
}
