'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DropResult } from '@hello-pangea/dnd';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  evaluateNumberBalancePlacement,
  createNumberBalancePuzzle,
  type NumberBalancePuzzle,
  type NumberBalanceTile,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchState,
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchStateResponse,
  NumberBalanceMatchStateSnapshotResponse,
  NumberBalancePlayerScore,
  NumberBalanceSolveResponse,
  NumberBalanceScoreUpdate,
  NumberBalanceSolveResult,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { api } from '@/shared/lib/api-client';
import type { MatchStatus, NumberBalanceRushGameProps, RoundState, ZoneId } from './NumberBalanceRushGame.types';
import {
  clearNumberBalanceRushTimeouts,
  copyNumberBalanceMatchId,
  resolveNumberBalanceRushAverageSolve,
  resolveNumberBalanceRushMatchMeta,
  resolveNumberBalanceRushNextDragMove,
  resolveNumberBalanceRushNextSelectedMove,
  resolveNumberBalanceRushPlayerSnapshot,
  resolveNumberBalanceRushSelectedTile,
  resolveNumberBalanceRushTiming,
  resolveNumberBalanceRushTouchHint,
  scheduleNumberBalanceStatusReset,
  shouldPollNumberBalanceRushMatch,
} from './NumberBalanceRushGame.runtime';
import {
  buildPlacement,
  isTerminalMatchStatus,
} from './NumberBalanceRushGame.utils';

const applyNumberBalanceRushRoundState = ({
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

const resetNumberBalanceRushMatchRuntimeState = ({
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

const applyNumberBalanceRushMatchStartResponse = ({
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

const syncNumberBalanceLoadedPuzzle = ({
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

const resolveNumberBalanceSolveResponseEvents = ({
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

const applyNumberBalanceSolveResponse = ({
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

const applyAcceptedNumberBalanceSolve = ({
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

function useNumberBalanceRushInteractionState({
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
}: {
  celebrateTimeoutRef: React.MutableRefObject<number | null>;
  celebrating: boolean;
  isSubmitting: boolean;
  leftTiles: NumberBalanceTile[];
  match: NumberBalanceMatchState | null;
  phase: string;
  player: NumberBalanceMatchPlayerState | null;
  puzzle: NumberBalancePuzzle | null;
  puzzleStartedAtRef: React.MutableRefObject<number>;
  rightTiles: NumberBalanceTile[];
  selectedTileId: string | null;
  serverNowMs: number;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setSelectedTileId: React.Dispatch<React.SetStateAction<string | null>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  solveTimesRef: React.MutableRefObject<number[]>;
  trayTiles: NumberBalanceTile[];
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}) {
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
      const response = await api.post<NumberBalanceSolveResponse>(
        '/api/kangur/number-balance/solve',
        {
          type: 'solve_attempt',
          matchId: match.matchId,
          puzzleId: puzzle.id,
          placement,
          clientTimeMs: Math.round(serverNowMs),
        }
      );

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

function useNumberBalanceRushMatchActions({
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
}: {
  balancedProbability: number | undefined;
  copyStatusTimeoutRef: React.MutableRefObject<number | null>;
  durationMs: number;
  match: NumberBalanceMatchState | null;
  matchId: string | undefined;
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  setCopyStatus: React.Dispatch<React.SetStateAction<'idle' | 'success' | 'error'>>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setMatch: React.Dispatch<React.SetStateAction<NumberBalanceMatchState | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setPuzzle: React.Dispatch<React.SetStateAction<NumberBalancePuzzle | null>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setSelectedTileId: React.Dispatch<React.SetStateAction<string | null>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  solveTimesRef: React.MutableRefObject<number[]>;
  tier: NumberBalanceRushGameProps['tier'];
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}) {
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

function useNumberBalanceRushPuzzleLoader({
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
}: {
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  match: NumberBalanceMatchState | null;
  player: NumberBalanceMatchPlayerState | null;
  puzzleStartedAtRef: React.MutableRefObject<number>;
  serverOffsetMs: number;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setPuzzle: React.Dispatch<React.SetStateAction<NumberBalancePuzzle | null>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
}): void {
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

function useNumberBalanceRushPollingRuntime({
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
}: {
  activeMatchId: string | null;
  activeMatchIdRef: React.MutableRefObject<string | null>;
  activeMatchStatus: MatchStatus | null;
  activeMatchStatusRef: React.MutableRefObject<MatchStatus | null>;
  setMatch: React.Dispatch<React.SetStateAction<NumberBalanceMatchState | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  shouldPoll: boolean;
}) {
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

function useNumberBalanceRushLifecycleEffects({
  celebrateTimeoutRef,
  copyStatusTimeoutRef,
  initMatch,
  matchId,
  setClockNowMs,
}: {
  celebrateTimeoutRef: React.MutableRefObject<number | null>;
  copyStatusTimeoutRef: React.MutableRefObject<number | null>;
  initMatch: (requestedMatchId?: string) => Promise<void>;
  matchId: string | undefined;
  setClockNowMs: React.Dispatch<React.SetStateAction<number>>;
}) {
  useEffect(() => {
    return () => {
      clearNumberBalanceRushTimeouts({
        celebrateTimeoutId: celebrateTimeoutRef.current,
        copyStatusTimeoutId: copyStatusTimeoutRef.current,
      });
    };
  }, [celebrateTimeoutRef, copyStatusTimeoutRef]);

  useEffect(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  useInterval(() => {
    setClockNowMs(Date.now());
  }, 100);
}

function useNumberBalanceRushDerivedState({
  clockNowMs,
  durationMs,
  isLoading,
  match,
  player,
  playerCount,
  scores,
  serverOffsetMs,
  translations,
}: {
  clockNowMs: number;
  durationMs: number;
  isLoading: boolean;
  match: NumberBalanceMatchState | null;
  player: NumberBalanceMatchPlayerState | null;
  playerCount: number;
  scores: NumberBalancePlayerScore[];
  serverOffsetMs: number;
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}) {
  const activeMatchId = match?.matchId ?? null;
  const activeMatchStatus: MatchStatus | null = match?.status ?? null;
  const activePlayerId = player?.playerId ?? null;
  const shouldPoll = shouldPollNumberBalanceRushMatch({
    activeMatchId,
    activeMatchStatus,
    activePlayerId,
  });
  const matchMeta = useMemo(
    () =>
      resolveNumberBalanceRushMatchMeta({
        activePlayerId,
        playerCount,
        scores,
        translations,
      }),
    [activePlayerId, playerCount, scores, translations]
  );
  const timing = useMemo(
    () =>
      resolveNumberBalanceRushTiming({
        clockNowMs,
        durationMs,
        isLoading,
        match,
        serverOffsetMs,
      }),
    [clockNowMs, durationMs, isLoading, match, serverOffsetMs]
  );

  return {
    activeMatchId,
    activeMatchStatus,
    activePlayerId,
    shouldPoll,
    ...matchMeta,
    ...timing,
  };
}

export function useNumberBalanceRushGameState(props: NumberBalanceRushGameProps) {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    durationMs = 15_000,
    tier = 'tier1',
    matchId,
    balancedProbability,
  } = props;

  const [match, setMatch] = useState<NumberBalanceMatchState | null>(null);
  const [player, setPlayer] = useState<NumberBalanceMatchPlayerState | null>(null);
  const [puzzle, setPuzzle] = useState<NumberBalancePuzzle | null>(null);
  const [trayTiles, setTrayTiles] = useState<NumberBalanceTile[]>([]);
  const [leftTiles, setLeftTiles] = useState<NumberBalanceTile[]>([]);
  const [rightTiles, setRightTiles] = useState<NumberBalanceTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<NumberBalancePlayerScore[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [solves, setSolves] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const solveTimesRef = useRef<number[]>([]);
  const lastLoadedPuzzleIndexRef = useRef<number | null>(null);
  const lastLoadedPuzzleStartRef = useRef<number | null>(null);
  const puzzleStartedAtRef = useRef<number>(Date.now());
  const activeMatchIdRef = useRef<string | null>(null);
  const activeMatchStatusRef = useRef<MatchStatus | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const celebrateTimeoutRef = useRef<number | null>(null);

  const {
    handleCopyMatchId,
    handleRetryMatch,
    initMatch,
  } = useNumberBalanceRushMatchActions({
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
    lastLoadedPuzzleIndexRef,
    lastLoadedPuzzleStartRef,
    solveTimesRef,
    tier,
    translations,
  });
  useNumberBalanceRushLifecycleEffects({
    celebrateTimeoutRef,
    copyStatusTimeoutRef,
    initMatch,
    matchId,
    setClockNowMs,
  });

  const {
    activeMatchId,
    activeMatchStatus,
    countdownLeftMs,
    hasOpponent,
    leaderboardEntries,
    opponentLabel,
    opponentScore,
    phase,
    playerRank,
    scoreGap,
    serverNowMs,
    shouldPoll,
    timeLeftMs,
  } = useNumberBalanceRushDerivedState({
    clockNowMs,
    durationMs,
    isLoading,
    match,
    player,
    playerCount,
    scores,
    serverOffsetMs,
    translations,
  });
  useNumberBalanceRushPollingRuntime({
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
  });

  useNumberBalanceRushPuzzleLoader({
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
  });

  const {
    avgSolve,
    canInteract,
    handleDragEnd,
    moveSelectedTileTo,
    touchHint,
  } = useNumberBalanceRushInteractionState({
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
  });

  return {
    translations,
    isCoarsePointer,
    match,
    player,
    puzzle,
    trayTiles,
    leftTiles,
    rightTiles,
    selectedTileId,
    setSelectedTileId,
    score,
    scores,
    playerCount,
    solves,
    celebrating,
    isSubmitting,
    isLoading,
    error,
    copyStatus,
    clockNowMs,
    timeLeftMs,
    countdownLeftMs,
    phase,
    opponentLabel,
    opponentScore,
    hasOpponent,
    playerRank,
    scoreGap,
    leaderboardEntries,
    avgSolve,
    initMatch,
    handleRetryMatch,
    handleCopyMatchId,
    handleDragEnd,
    moveSelectedTileTo,
    touchHint,
    canInteract,
  };
}
