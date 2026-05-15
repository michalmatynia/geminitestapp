'use client';

/* eslint-disable max-lines-per-function */

import { useCallback, useEffect, useMemo } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  evaluateNumberBalancePlacement,
  type NumberBalanceTile,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalancePlacement,
  NumberBalanceSolveResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import type { ZoneId, UseNumberBalanceRushInteractionStateProps } from './NumberBalanceRushGame.types';
import {
  resolveNumberBalanceRushAverageSolve,
  resolveNumberBalanceRushNextDragMove,
  resolveNumberBalanceRushNextSelectedMove,
  resolveNumberBalanceRushSelectedTile,
  resolveNumberBalanceRushTouchHint,
} from './NumberBalanceRushGame.runtime';
import {
  buildPlacement,
} from './NumberBalanceRushGame.utils';
import {
  applyNumberBalanceRushRoundState,
  applyNumberBalanceSolveResponse,
  resolveNumberBalanceSolveResponseEvents,
  applyAcceptedNumberBalanceSolve,
} from './NumberBalanceRushGame.logic';

type SubmitNumberBalanceSolveVariables = {
  clientTimeMs: number;
  matchId: string;
  placement: NumberBalancePlacement;
  puzzleId: string;
};

const submitNumberBalanceSolve = async ({
  clientTimeMs,
  matchId,
  placement,
  puzzleId,
}: SubmitNumberBalanceSolveVariables): Promise<NumberBalanceSolveResponse> =>
  api.post<NumberBalanceSolveResponse>(
    '/api/kangur/number-balance/solve',
    {
      type: 'solve_attempt',
      matchId,
      puzzleId,
      placement,
      clientTimeMs,
    }
  );

const useSubmitNumberBalanceSolveMutation = (): MutationResult<
  NumberBalanceSolveResponse,
  SubmitNumberBalanceSolveVariables
> =>
  useMutationV2<NumberBalanceSolveResponse, SubmitNumberBalanceSolveVariables>({
    mutationKey: ['kangur', 'number-balance', 'solve'],
    mutationFn: submitNumberBalanceSolve,
    meta: {
      source: 'kangur.ui.NumberBalanceRushGame.submitSolve',
      operation: 'create',
      resource: 'kangur.number-balance.solve',
      domain: 'kangur',
      description: 'Submits a solved number balance puzzle attempt.',
      errorPresentation: 'inline',
      tags: ['kangur', 'number-balance', 'solve'],
    },
  });

type NumberBalanceRushInteractionState = {
  avgSolve: number | null;
  canInteract: boolean;
  handleDragEnd: (result: DropResult) => void;
  isSubmitting: boolean;
  moveSelectedTileTo: (destination: ZoneId) => void;
  touchHint: string;
};

export function useNumberBalanceRushInteractionState({
  celebrateTimeoutRef,
  celebrating,
  isSubmitting,
  leftTiles,
  match,
  phase,
  player,
  puzzle,
  puzzleStartedAtRef,
  rightTiles,
  selectedTileId,
  serverNowMs,
  setCelebrating,
  setError,
  setIsSubmitting,
  setPlayer,
  setPlayerCount,
  setScore,
  setScores,
  setSelectedTileId,
  setServerOffsetMs,
  setSolves,
  setLeftTiles,
  setRightTiles,
  setTrayTiles,
  solveTimesRef,
  trayTiles,
  translations,
}: UseNumberBalanceRushInteractionStateProps): NumberBalanceRushInteractionState {
  const { mutateAsync: submitSolveAsync } = useSubmitNumberBalanceSolveMutation();
  const canInteract = phase === 'running' && !celebrating && !isSubmitting;
  const selectedTile = useMemo(
    () =>
      resolveNumberBalanceRushSelectedTile({
        leftTiles,
        rightTiles,
        selectedTileId,
        trayTiles,
      }),
    [leftTiles, rightTiles, selectedTileId, trayTiles]
  );
  const touchHint = useMemo(
    () =>
      resolveNumberBalanceRushTouchHint({
        selectedTile,
        translations,
      }),
    [selectedTile, translations]
  );

  useEffect(() => {
    if (!canInteract) {
      setSelectedTileId(null);
    }
  }, [canInteract, setSelectedTileId]);

  useEffect(() => {
    setSelectedTileId(null);
  }, [puzzle?.id, setSelectedTileId]);

  const handleSolved = useCallback(async (nextLeft: NumberBalanceTile[], nextRight: NumberBalanceTile[]): Promise<void> => {
    if (!match || !player || !puzzle) return;
    if (phase !== 'running' || isSubmitting) return;

    const placement = buildPlacement(puzzle, nextLeft, nextRight);
    const evaluation = evaluateNumberBalancePlacement(puzzle, placement);
    if (!evaluation.isSolved) return;

    setIsSubmitting(true);

    try {
      const response = await submitSolveAsync({
        matchId: match.matchId,
        puzzleId: puzzle.id,
        placement,
        clientTimeMs: Math.round(serverNowMs),
      });

      applyNumberBalanceSolveResponse({
        response,
        setPlayer,
        setPlayerCount,
        setScore,
        setScores,
        setServerOffsetMs,
      });

      const { solveResult } = resolveNumberBalanceSolveResponseEvents({
        puzzleId: puzzle.id,
        response,
      });
      applyAcceptedNumberBalanceSolve({
        celebrateTimeoutRef,
        puzzleStartedAtRef,
        setCelebrating,
        setSolves,
        solveResult,
        solveTimesRef,
      });
    } catch (_err) {
      void ErrorSystem.captureException(_err);
      setError(translations('numberBalance.inRound.errors.save'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    celebrateTimeoutRef,
    isSubmitting,
    match,
    phase,
    player,
    puzzle,
    puzzleStartedAtRef,
    serverNowMs,
    setCelebrating,
    setError,
    setIsSubmitting,
    setPlayer,
    setPlayerCount,
    setScore,
    setScores,
    setServerOffsetMs,
    setSolves,
    submitSolveAsync,
    solveTimesRef,
    translations,
  ]);

  const moveSelectedTileTo = useCallback((destination: ZoneId): void => {
    if (!puzzle) return;
    const nextRoundState = resolveNumberBalanceRushNextSelectedMove({
      canInteract,
      destination,
      leftTiles,
      puzzleSlots: puzzle.slots,
      rightTiles,
      selectedTileId,
      trayTiles,
    });
    if (!nextRoundState) return;

    applyNumberBalanceRushRoundState({
      roundState: nextRoundState,
      setLeftTiles,
      setRightTiles,
      setTrayTiles,
    });
    setSelectedTileId(null);
    void handleSolved(nextRoundState.left, nextRoundState.right);
  }, [
    canInteract,
    handleSolved,
    leftTiles,
    puzzle,
    rightTiles,
    setLeftTiles,
    setRightTiles,
    selectedTileId,
    setSelectedTileId,
    setTrayTiles,
    trayTiles,
  ]);

  const handleDragEnd = useCallback((result: DropResult): void => {
    if (!canInteract || !puzzle) return;
    const nextRoundState = resolveNumberBalanceRushNextDragMove({
      leftTiles,
      puzzleSlots: puzzle.slots,
      result,
      rightTiles,
      trayTiles,
    });
    if (!nextRoundState) return;

    applyNumberBalanceRushRoundState({
      roundState: nextRoundState,
      setLeftTiles,
      setRightTiles,
      setTrayTiles,
    });
    setSelectedTileId(null);
    void handleSolved(nextRoundState.left, nextRoundState.right);
  }, [
    canInteract,
    handleSolved,
    leftTiles,
    puzzle,
    rightTiles,
    setLeftTiles,
    setRightTiles,
    setSelectedTileId,
    setTrayTiles,
    trayTiles,
  ]);

  return {
    avgSolve: resolveNumberBalanceRushAverageSolve(solveTimesRef.current),
    canInteract,
    handleDragEnd,
    isSubmitting,
    moveSelectedTileTo,
    touchHint,
  };
}
