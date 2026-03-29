'use client';

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
import type { NumberBalanceRushGameProps, Phase, ZoneId, MatchStatus } from './NumberBalanceRushGame.types';
import {
  buildPlacement,
  isTerminalMatchStatus,
  isZoneId,
  moveBetweenLists,
  removeTileById,
  reorderWithinList,
} from './NumberBalanceRushGame.utils';

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
  const lastServerTimeRef = useRef<number>(0);

  const initMatch = useCallback(async (requestedMatchId?: string) => {
    setIsLoading(true);
    setError(null);
    setIsSubmitting(false);
    setCelebrating(false);
    setSolves(0);
    setScores([]);
    setPlayerCount(0);
    solveTimesRef.current = [];
    setPuzzle(null);
    setTrayTiles([]);
    setLeftTiles([]);
    setRightTiles([]);
    setSelectedTileId(null);
    lastLoadedPuzzleIndexRef.current = null;
    lastLoadedPuzzleStartRef.current = null;
    lastServerTimeRef.current = 0;

    try {
      let response: NumberBalanceMatchStateResponse;
      if (requestedMatchId) {
        response = await api.post<NumberBalanceMatchStateResponse>(
          '/api/kangur/number-balance/join',
          { matchId: requestedMatchId }
        );
      } else {
        response = await api.post<NumberBalanceMatchStateResponse>(
          '/api/kangur/number-balance/create',
          {
            roundDurationMs: durationMs,
            tier,
            balancedProbability,
          }
        );
      }

      setMatch(response.match);
      setPlayer(response.player);
      setScore(response.player.score);
      setScores([{ playerId: response.player.playerId, score: response.player.score }]);
      setPlayerCount(1);
      setServerOffsetMs(response.serverTimeMs - Date.now());
      lastServerTimeRef.current = response.serverTimeMs;
    } catch (_err) {
      void ErrorSystem.captureException(_err);
      setMatch(null);
      setPlayer(null);
      setError(translations('numberBalance.inRound.errors.start'));
    } finally {
      setIsLoading(false);
    }
  }, [durationMs, tier, balancedProbability, translations]);

  const handleRetryMatch = useCallback(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  const handleCopyMatchId = useCallback(async () => {
    if (!match?.matchId) {
      return;
    }
    const text = match.matchId;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus('success');
    } catch (error) {
      void ErrorSystem.captureException(error);
      setCopyStatus('error');
    } finally {
      if (copyStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyStatusTimeoutRef.current);
      }
      copyStatusTimeoutRef.current = window.setTimeout(() => {
        copyStatusTimeoutRef.current = null;
        setCopyStatus('idle');
      }, 2000);
    }
  }, [match?.matchId]);

  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyStatusTimeoutRef.current);
      }
      if (celebrateTimeoutRef.current !== null) {
        window.clearTimeout(celebrateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void initMatch(matchId);
  }, [initMatch, matchId]);

  useInterval(() => {
    setClockNowMs(Date.now());
  }, 100);

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
        if (!current) {
          setScore(response.player.score);
          return response.player;
        }
        if (response.player.puzzleIndex < current.puzzleIndex) {
          return current;
        }
        if (
          response.player.puzzleIndex === current.puzzleIndex &&
          response.player.score < current.score
        ) {
          return current;
        }
        setScore(response.player.score);
        return response.player;
      });
    },
    []
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
      if (activeMatchIdRef.current !== matchId) {
        return;
      }
      if (isTerminalMatchStatus(activeMatchStatusRef.current)) {
        return;
      }
      syncMatchState(response);
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }, [syncMatchState]);

  const activeMatchId = match?.matchId ?? null;
  const activeMatchStatus: MatchStatus | null = match?.status ?? null;
  const activePlayerId = player?.playerId ?? null;
  const shouldPoll =
    Boolean(activeMatchId && activePlayerId) && !isTerminalMatchStatus(activeMatchStatus);
  const sortedScores = useMemo(() => {
    if (!scores.length) {
      return [];
    }
    return [...scores].sort((left, right) => right.score - left.score);
  }, [scores]);
  const selfScoreEntry = useMemo(
    () => (activePlayerId ? sortedScores.find((entry) => entry.playerId === activePlayerId) : null),
    [activePlayerId, sortedScores]
  );
  const leaderScore = sortedScores.length > 0 ? sortedScores[0]?.score ?? 0 : null;
  const playerRank = useMemo(() => {
    if (!selfScoreEntry) {
      return null;
    }
    const rankIndex = sortedScores.findIndex((entry) => entry.score === selfScoreEntry.score);
    return rankIndex >= 0 ? rankIndex + 1 : null;
  }, [selfScoreEntry, sortedScores]);
  const scoreGap =
    selfScoreEntry && typeof leaderScore === 'number'
      ? Math.max(0, leaderScore - selfScoreEntry.score)
      : null;
  const leaderboardEntries = useMemo(
    () =>
      sortedScores.map((entry, index) => {
        const rankIndex = sortedScores.findIndex((item) => item.score === entry.score);
        const rank = rankIndex >= 0 ? rankIndex + 1 : index + 1;
        const isSelf = entry.playerId === activePlayerId;
        return {
          ...entry,
          rank,
          isSelf,
          isLeader: leaderScore !== null && entry.score === leaderScore,
          label: isSelf
            ? translations('numberBalance.inRound.player.self')
            : translations('numberBalance.inRound.player.other', { index: index + 1 }),
        };
      }),
    [activePlayerId, leaderScore, sortedScores, translations]
  );

  useEffect(() => {
    activeMatchIdRef.current = activeMatchId;
    activeMatchStatusRef.current = activeMatchStatus;
  }, [activeMatchId, activeMatchStatus]);

  useEffect(() => {
    if (shouldPoll) {
      void pollState();
    }
  }, [pollState, shouldPoll]);

  useInterval(() => {
    void pollState();
  }, shouldPoll ? 1000 : null);

  const loadPuzzle = useCallback(
    (nextPuzzleIndex: number, matchState: NumberBalanceMatchState, playerState: NumberBalanceMatchPlayerState) => {
      const nextPuzzle = createNumberBalancePuzzle({
        tier: matchState.tier,
        puzzleIndex: nextPuzzleIndex,
        seed: matchState.seed,
        balancedProbability: matchState.balancedProbability,
      });
      setPuzzle(nextPuzzle);
      setTrayTiles(nextPuzzle.tiles);
      setLeftTiles([]);
      setRightTiles([]);
      puzzleStartedAtRef.current = playerState.puzzleStartedAtMs - serverOffsetMs;
    },
    [serverOffsetMs]
  );

  useEffect(() => {
    if (!match || !player) return;
    if (
      lastLoadedPuzzleIndexRef.current === player.puzzleIndex &&
      lastLoadedPuzzleStartRef.current === player.puzzleStartedAtMs
    ) {
      return;
    }
    lastLoadedPuzzleIndexRef.current = player.puzzleIndex;
    lastLoadedPuzzleStartRef.current = player.puzzleStartedAtMs;
    loadPuzzle(player.puzzleIndex, match, player);
  }, [loadPuzzle, match, player]);

  const serverNowMs = clockNowMs + serverOffsetMs;
  const matchStartMs = match?.startTimeMs ?? serverNowMs;
  const matchDurationMs = match?.roundDurationMs ?? durationMs;
  const countdownLeftMs = match ? Math.max(0, matchStartMs - serverNowMs) : 0;
  const timeLeftMs =
    match && match.status !== 'waiting'
      ? Math.max(0, matchStartMs + matchDurationMs - serverNowMs)
      : matchDurationMs;

  const phase: Phase = useMemo(() => {
    if (!match || isLoading) return 'loading';
    if (match.status === 'waiting') return 'waiting';
    if (match.status === 'completed') return 'finished';
    if (serverNowMs < matchStartMs) return 'countdown';
    if (timeLeftMs <= 0) return 'finished';
    return 'running';
  }, [isLoading, match, matchStartMs, serverNowMs, timeLeftMs]);

  const opponentEntry = player
    ? scores.find((entry) => entry.playerId !== player.playerId)
    : undefined;
  const opponentScore = opponentEntry?.score ?? null;
  const hasOpponent = playerCount > 1 || opponentEntry !== undefined;
  const opponentLabel = opponentEntry
    ? translations('numberBalance.inRound.opponent.ready', { score: opponentScore ?? 0 })
    : hasOpponent
      ? translations('numberBalance.inRound.opponent.searching')
      : translations('numberBalance.inRound.opponent.empty');

  const handleSolved = async (nextLeft: NumberBalanceTile[], nextRight: NumberBalanceTile[]): Promise<void> => {
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

      setServerOffsetMs(response.serverTimeMs - Date.now());
      setPlayer(response.player);
      setScore(response.player.score);
      lastServerTimeRef.current = response.serverTimeMs;

      const scoreUpdate = response.events.find(
        (event): event is NumberBalanceScoreUpdate => event.type === 'score_update'
      );
      if (scoreUpdate) {
        setScores(scoreUpdate.scores);
        setPlayerCount(scoreUpdate.scores.length);
      }

      const solveResult = response.events.find(
        (event): event is NumberBalanceSolveResult =>
          event.type === 'solve_result' && event.puzzleId === puzzle.id
      );

      if (solveResult?.accepted) {
        const solveTimeMs =
          solveResult.solveTimeMs ?? Math.max(0, Date.now() - puzzleStartedAtRef.current);
        solveTimesRef.current.push(solveTimeMs);
        setSolves((prev) => prev + 1);
        setCelebrating(true);
        if (celebrateTimeoutRef.current !== null) {
          window.clearTimeout(celebrateTimeoutRef.current);
        }
        celebrateTimeoutRef.current = window.setTimeout(() => {
          celebrateTimeoutRef.current = null;
          setCelebrating(false);
        }, 300);
      }
    } catch (_err) {
      void ErrorSystem.captureException(_err);
      setError(translations('numberBalance.inRound.errors.save'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canInteract = phase === 'running' && !celebrating && !isSubmitting;
  const selectedTile = selectedTileId
    ? [...trayTiles, ...leftTiles, ...rightTiles].find((tile) => tile.id === selectedTileId) ?? null
    : null;
  const touchHint = selectedTile
    ? translations('numberBalance.inRound.touch.selected', { value: selectedTile.value })
    : translations('numberBalance.inRound.touch.idle');

  useEffect(() => {
    if (!canInteract) {
      setSelectedTileId(null);
    }
  }, [canInteract]);

  useEffect(() => {
    setSelectedTileId(null);
  }, [puzzle?.id]);

  const moveSelectedTileTo = (destination: ZoneId): void => {
    if (!canInteract || !puzzle || !selectedTileId) return;

    let nextTray = trayTiles;
    let nextLeft = leftTiles;
    let nextRight = rightTiles;

    let movedTile: NumberBalanceTile | undefined;
    const trayResult = removeTileById(nextTray, selectedTileId);
    nextTray = trayResult.updated;
    movedTile = trayResult.tile;

    if (!movedTile) {
      const leftResult = removeTileById(nextLeft, selectedTileId);
      nextLeft = leftResult.updated;
      movedTile = leftResult.tile;
    }

    if (!movedTile) {
      const rightResult = removeTileById(nextRight, selectedTileId);
      nextRight = rightResult.updated;
      movedTile = rightResult.tile;
    }

    if (!movedTile) return;

    if (destination === 'left' && nextLeft.length >= puzzle.slots.left) return;
    if (destination === 'right' && nextRight.length >= puzzle.slots.right) return;

    if (destination === 'tray') {
      nextTray = [...nextTray, movedTile];
    } else if (destination === 'left') {
      nextLeft = [...nextLeft, movedTile];
    } else {
      nextRight = [...nextRight, movedTile];
    }

    setTrayTiles(nextTray);
    setLeftTiles(nextLeft);
    setRightTiles(nextRight);
    setSelectedTileId(null);
    void handleSolved(nextLeft, nextRight);
  };

  const handleDragEnd = (result: DropResult): void => {
    if (!canInteract || !puzzle) return;
    if (!result.destination) return;
    const sourceId = result.source.droppableId;
    const destinationId = result.destination.droppableId;
    if (!isZoneId(sourceId) || !isZoneId(destinationId)) return;
    if (sourceId === destinationId && result.source.index === result.destination.index) return;

    let nextTray = trayTiles;
    let nextLeft = leftTiles;
    let nextRight = rightTiles;

    const getList = (id: ZoneId): NumberBalanceTile[] => {
      if (id === 'tray') return nextTray;
      if (id === 'left') return nextLeft;
      return nextRight;
    };

    const setList = (id: ZoneId, list: NumberBalanceTile[]): void => {
      if (id === 'tray') nextTray = list;
      else if (id === 'left') nextLeft = list;
      else nextRight = list;
    };

    if (sourceId === destinationId) {
      const updated = reorderWithinList(getList(sourceId), result.source.index, result.destination.index);
      setList(sourceId, updated);
    } else {
      if (destinationId === 'left' && leftTiles.length >= (puzzle?.slots.left ?? 0)) return;
      if (destinationId === 'right' && rightTiles.length >= (puzzle?.slots.right ?? 0)) return;
      const moved = moveBetweenLists(
        getList(sourceId),
        getList(destinationId),
        result.source.index,
        result.destination.index
      );
      setList(sourceId, moved.source);
      setList(destinationId, moved.destination);
    }

    setTrayTiles(nextTray);
    setLeftTiles(nextLeft);
    setRightTiles(nextRight);
    setSelectedTileId(null);
    void handleSolved(nextLeft, nextRight);
  };

  const avgSolve =
    solveTimesRef.current.length > 0
      ? Math.round(
          solveTimesRef.current.reduce((sum, value) => sum + value, 0) /
            solveTimesRef.current.length
        )
      : null;

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
