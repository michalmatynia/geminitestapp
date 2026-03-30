'use client';

import type React from 'react';
import type { NumberBalancePuzzle, NumberBalanceTile } from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
  NumberBalanceMatchStateResponse,
  NumberBalancePlayerScore,
  NumberBalanceSolveResponse,
  NumberBalanceScoreUpdate,
  NumberBalanceSolveResult,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { RoundState } from './NumberBalanceRushGame.types';
import { scheduleNumberBalanceStatusReset } from './NumberBalanceRushGame.runtime';

export const applyNumberBalanceRushRoundState = ({
  roundState,
  setLeftTiles,
  setRightTiles,
  setTrayTiles,
}: {
  roundState: RoundState;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
}): void => {
  setTrayTiles(roundState.tray);
  setLeftTiles(roundState.left);
  setRightTiles(roundState.right);
};

export const resetNumberBalanceRushMatchRuntimeState = ({
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
}: {
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setPuzzle: React.Dispatch<React.SetStateAction<NumberBalancePuzzle | null>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setSelectedTileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  solveTimesRef: React.MutableRefObject<number[]>;
}): void => {
  setError(null);
  setIsSubmitting(false);
  setCelebrating(false);
  setSolves(0);
  setScores([]);
  setPlayerCount(0);
  solveTimesRef.current = [];
  setPuzzle(null);
  applyNumberBalanceRushRoundState({
    roundState: {
      tray: [],
      left: [],
      right: [],
    },
    setLeftTiles,
    setRightTiles,
    setTrayTiles,
  });
  setSelectedTileId(null);
  lastLoadedPuzzleIndexRef.current = null;
  lastLoadedPuzzleStartRef.current = null;
};

export const applyNumberBalanceRushMatchStartResponse = ({
  response,
  setMatch,
  setPlayer,
  setPlayerCount,
  setScore,
  setScores,
  setServerOffsetMs,
}: {
  response: NumberBalanceMatchStateResponse;
  setMatch: React.Dispatch<React.SetStateAction<NumberBalanceMatchState | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setMatch(response.match);
  setPlayer(response.player);
  setScore(response.player.score);
  setScores([{ playerId: response.player.playerId, score: response.player.score }]);
  setPlayerCount(1);
  setServerOffsetMs(response.serverTimeMs - Date.now());
};

export const syncNumberBalanceLoadedPuzzle = ({
  lastLoadedPuzzleIndexRef,
  lastLoadedPuzzleStartRef,
  loadPuzzle,
  match,
  player,
}: {
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  loadPuzzle: (
    nextPuzzleIndex: number,
    matchState: NumberBalanceMatchState,
    playerState: NumberBalanceMatchPlayerState
  ) => void;
  match: NumberBalanceMatchState | null;
  player: NumberBalanceMatchPlayerState | null;
}): void => {
  if (!match || !player) {
    return;
  }

  if (
    lastLoadedPuzzleIndexRef.current === player.puzzleIndex &&
    lastLoadedPuzzleStartRef.current === player.puzzleStartedAtMs
  ) {
    return;
  }

  lastLoadedPuzzleIndexRef.current = player.puzzleIndex;
  lastLoadedPuzzleStartRef.current = player.puzzleStartedAtMs;
  loadPuzzle(player.puzzleIndex, match, player);
};

export const resolveNumberBalanceSolveResponseEvents = ({
  puzzleId,
  response,
}: {
  puzzleId: string;
  response: NumberBalanceSolveResponse;
}): {
  scoreUpdate?: NumberBalanceScoreUpdate;
  solveResult?: NumberBalanceSolveResult;
} => ({
  scoreUpdate: response.events.find(
    (event): event is NumberBalanceScoreUpdate => event.type === 'score_update'
  ),
  solveResult: response.events.find(
    (event): event is NumberBalanceSolveResult =>
      event.type === 'solve_result' && event.puzzleId === puzzleId
  ),
});

export const applyNumberBalanceSolveResponse = ({
  response,
  setPlayer,
  setPlayerCount,
  setScore,
  setScores,
  setServerOffsetMs,
}: {
  response: NumberBalanceSolveResponse;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setServerOffsetMs(response.serverTimeMs - Date.now());
  setPlayer(response.player);
  setScore(response.player.score);

  const scoreUpdate = response.events.find(
    (event): event is NumberBalanceScoreUpdate => event.type === 'score_update'
  );
  if (scoreUpdate) {
    setScores(scoreUpdate.scores);
    setPlayerCount(scoreUpdate.scores.length);
  }
};

export const applyAcceptedNumberBalanceSolve = ({
  celebrateTimeoutRef,
  puzzleStartedAtRef,
  setCelebrating,
  setSolves,
  solveResult,
  solveTimesRef,
}: {
  celebrateTimeoutRef: React.MutableRefObject<number | null>;
  puzzleStartedAtRef: React.MutableRefObject<number>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  solveResult: NumberBalanceSolveResult | undefined;
  solveTimesRef: React.MutableRefObject<number[]>;
}): void => {
  if (!solveResult?.accepted) {
    return;
  }

  const solveTimeMs =
    solveResult.solveTimeMs ?? Math.max(0, Date.now() - puzzleStartedAtRef.current);
  solveTimesRef.current.push(solveTimeMs);
  setSolves((previous) => previous + 1);
  setCelebrating(true);
  scheduleNumberBalanceStatusReset({
    delayMs: 300,
    onReset: () => setCelebrating(false),
    timeoutRef: celebrateTimeoutRef,
  });
};
