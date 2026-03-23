'use client';

import { Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScorePointsLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  createNumberBalancePuzzle,
  evaluateNumberBalancePlacement,
  type NumberBalancePlacement,
  type NumberBalancePuzzle,
  type NumberBalanceTile,
  type NumberBalanceTier,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchState,
  NumberBalanceMatchStatus,
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchStateResponse,
  NumberBalanceMatchStateSnapshotResponse,
  NumberBalancePlayerScore,
  NumberBalanceScoreUpdate,
  NumberBalanceSolveResult,
  NumberBalanceSolveResponse,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import { api } from '@/shared/lib/api-client';
import { cn } from '@/features/kangur/shared/utils';

type NumberBalanceRushGameProps = {
  durationMs?: number;
  tier?: NumberBalanceTier;
  matchId?: string;
  balancedProbability?: number;
  onFinish?: () => void;
};

type ZoneId = 'tray' | 'left' | 'right';

type Phase = 'loading' | 'waiting' | 'countdown' | 'running' | 'finished';
type MatchStatus = NumberBalanceMatchStatus | 'completed';

const isTerminalMatchStatus = (status: MatchStatus | null): boolean =>
  status !== null && status !== 'waiting' && status !== 'in_progress';

const TILE_STYLES = [
  'bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 text-amber-900',
  'bg-gradient-to-br from-sky-200 via-cyan-200 to-emerald-200 text-sky-900',
  'bg-gradient-to-br from-violet-200 via-fuchsia-200 to-pink-200 text-violet-900',
  'bg-gradient-to-br from-lime-200 via-emerald-200 to-teal-200 text-emerald-900',
  'bg-gradient-to-br from-yellow-200 via-amber-200 to-orange-200 text-amber-900',
  'bg-gradient-to-br from-indigo-200 via-blue-200 to-sky-200 text-indigo-900',
] as const;

const dragPortal = typeof document === 'undefined' ? null : document.body;

const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const next = [...list];
  const [moved] = next.splice(startIndex, 1);
  if (moved === undefined) {
    return list;
  }
  next.splice(endIndex, 0, moved);
  return next;
};

const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (moved === undefined) {
    return { source, destination };
  }
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
};

const removeTileById = <T extends { id: string }>(
  items: T[],
  tileId: string
): { updated: T[]; tile?: T } => {
  const index = items.findIndex((item) => item.id === tileId);
  if (index === -1) {
    return { updated: items };
  }
  const updated = [...items];
  const [tile] = updated.splice(index, 1);
  return { updated, tile };
};

const isZoneId = (value: string): value is ZoneId =>
  value === 'tray' || value === 'left' || value === 'right';

const buildPlacement = (
  puzzle: NumberBalancePuzzle,
  left: NumberBalanceTile[],
  right: NumberBalanceTile[]
): NumberBalancePlacement => {
  const placement: NumberBalancePlacement = {};
  puzzle.tiles.forEach((tile) => {
    placement[tile.id] = 'tray';
  });
  left.forEach((tile) => {
    placement[tile.id] = 'left';
  });
  right.forEach((tile) => {
    placement[tile.id] = 'right';
  });
  return placement;
};

function NumberTile({
  tile,
  index,
  isDragDisabled,
  isSelected,
  isCoarsePointer,
  onClick,
}: {
  tile: NumberBalanceTile;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  return (
    <Draggable
      draggableId={tile.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'flex items-center justify-center rounded-2xl border border-white/70 font-extrabold shadow-[0_12px_28px_-20px_rgba(15,23,42,0.45)] transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'h-20 w-20 text-2xl active:scale-[0.98] active:shadow-sm'
                : 'h-16 w-16 text-xl',
              TILE_STYLES[index % TILE_STYLES.length],
              snapshot.isDragging ? 'scale-105 shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)]' : '',
              isSelected ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white' : ''
            )}
            aria-label={translations('numberBalance.inRound.tileAria', {
              value: tile.value,
            })}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick();
            }}
          >
            {tile.value}
          </button>
        );

        if (snapshot.isDragging && dragPortal) {
          return createPortal(content, dragPortal);
        }
        return content;
      }}
    </Draggable>
  );
}

export default function NumberBalanceRushGame(
  props: NumberBalanceRushGameProps
): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    durationMs = 15_000,
    tier = 'tier1',
    matchId,
    balancedProbability,
    onFinish,
  } = props;
  const requestedMatchId = matchId;
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
  const lastServerTimeRef = useRef<number>(0);
  const activeMatchIdRef = useRef<string | null>(null);
  const activeMatchStatusRef = useRef<MatchStatus | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const celebrateTimeoutRef = useRef<number | null>(null);

  const initMatch = useCallback(
    async (requestedMatchId?: string) => {
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
    },
    [balancedProbability, durationMs, tier, translations]
  );

  const handleRetryMatch = useCallback(() => {
    void initMatch(requestedMatchId);
  }, [initMatch, requestedMatchId]);

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
      // Silent retry; background polling shouldn't interrupt gameplay.
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

  if (phase === 'waiting' && match && player) {
    return (
      <KangurPracticeGameStage className='w-full max-w-xl'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>
            {translations('numberBalance.inRound.waiting.title')}
          </div>
          <div className='mt-2 text-xs font-semibold text-amber-900/80'>
            {translations('numberBalance.inRound.waiting.matchCode', { matchId: match.matchId })}
          </div>
          <div className='mt-3 flex flex-wrap justify-center gap-2'>
            <KangurButton
              size='sm'
              variant='ghost'
              onClick={() => {
                void handleCopyMatchId();
              }}
            >
              {copyStatus === 'success'
                ? translations('numberBalance.inRound.waiting.copy.success')
                : copyStatus === 'error'
                  ? translations('numberBalance.inRound.waiting.copy.error')
                  : translations('numberBalance.inRound.waiting.copy.idle')}
            </KangurButton>
          </div>
          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='amber'>
              {translations('numberBalance.inRound.selfLabel', { score })}
            </KangurStatusChip>
            <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='sky'>
              {opponentLabel}
            </KangurStatusChip>
          </div>
        </KangurGlassPanel>
      </KangurPracticeGameStage>
    );
  }

  if (phase === 'loading' || !match || !player || !puzzle) {
    return (
      <KangurPracticeGameStage className='w-full max-w-xl'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>
            {translations('numberBalance.inRound.loading')}
          </div>
          {error ? (
            <div className='mt-3 text-xs font-semibold text-rose-600'>
              {error}
              <div className='mt-2'>
                <KangurButton
                  size='sm'
                  variant='primary'
                  onClick={handleRetryMatch}
                >
                  {translations('shared.restart')}
                </KangurButton>
              </div>
            </div>
          ) : null}
        </KangurGlassPanel>
      </KangurPracticeGameStage>
    );
  }

  if (phase === 'finished') {
    const avgSolve =
      solveTimesRef.current.length > 0
        ? Math.round(
            solveTimesRef.current.reduce((sum, value) => sum + value, 0) /
              solveTimesRef.current.length
          )
        : null;
    const summaryEmoji = score >= 12 ? '🏆' : score >= 6 ? '🌟' : '💪';
    const avgSolveLabel = avgSolve ? `${(avgSolve / 1000).toFixed(1)} s` : '—';
    const safeOpponentScore = opponentScore ?? 0;
    const outcomeLabel = hasOpponent
      ? score > safeOpponentScore
        ? translations('numberBalance.summary.outcome.win')
        : score === safeOpponentScore
          ? translations('numberBalance.summary.outcome.draw')
          : translations('numberBalance.summary.outcome.loss')
      : null;

    return (
      <KangurPracticeGameSummary dataTestId='number-balance-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='number-balance-summary-emoji'
          emoji={summaryEmoji}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='number-balance-summary-title'
          title={getKangurMiniGameScorePointsLabel(translations, score)}
        />
        <KangurPracticeGameSummaryMessage>
          {translations('numberBalance.summary.solvedLabel')}: {solves} •{' '}
          {translations('numberBalance.summary.averageTimeLabel')}: {avgSolveLabel}
          {hasOpponent
            ? ` • ${translations('numberBalance.summary.opponentLabel')}: ${safeOpponentScore} ${translations('shared.pointsShort')}`
            : ''}
          {playerRank
            ? ` • ${translations('numberBalance.summary.placeLabel')}: ${playerRank}/${Math.max(playerCount, leaderboardEntries.length)}`
            : ''}
          {outcomeLabel ? ` • ${outcomeLabel}` : ''}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={getKangurMiniGameFinishLabel(translations, 'end')}
          onFinish={() => {
            onFinish?.();
          }}
          onRestart={handleRetryMatch}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const placement = buildPlacement(puzzle, leftTiles, rightTiles);
  const evaluation = evaluateNumberBalancePlacement(puzzle, placement);
  const timePercent = Math.max(0, Math.min(1, timeLeftMs / matchDurationMs));
  const timerLabel =
    phase === 'countdown'
      ? Math.max(0, Math.ceil(countdownLeftMs / 1000))
      : Math.max(0, Math.ceil(timeLeftMs / 1000));

  return (
    <KangurDragDropContext onDragEnd={handleDragEnd}>
      <KangurPracticeGameStage className='w-full max-w-2xl'>
        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip className='px-4 py-2 text-sm font-bold' accent='amber'>
              {translations('numberBalance.inRound.selfLabel', { score })}
            </KangurStatusChip>
            <KangurStatusChip className='px-4 py-2 text-sm font-bold' accent='sky'>
              {opponentLabel}
            </KangurStatusChip>
          </div>
          <KangurGlassPanel
            className='relative flex h-14 w-14 items-center justify-center rounded-full'
            surface='mistSoft'
          >
            <div
              aria-hidden='true'
              className='absolute inset-1 rounded-full'
              style={{
                background: `conic-gradient(#f59e0b ${timePercent * 360}deg, rgba(251,191,36,0.2) 0deg)`,
              }}
            />
            <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-amber-900'>
              {timerLabel}
            </div>
          </KangurGlassPanel>
        </div>

        {leaderboardEntries.length > 0 ? (
          <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} text-xs font-semibold text-amber-900/80`}>
            {playerRank ? (
              <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='slate'>
                {translations('numberBalance.inRound.rank', {
                  rank: playerRank,
                  total: Math.max(playerCount, leaderboardEntries.length),
                })}
              </KangurStatusChip>
            ) : null}
            {scoreGap !== null ? (
              <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='slate'>
                {scoreGap === 0
                  ? translations('numberBalance.inRound.leader')
                  : translations('numberBalance.inRound.gap', { scoreGap })}
              </KangurStatusChip>
            ) : null}
          </div>
        ) : null}

        {leaderboardEntries.length > 1 ? (
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {leaderboardEntries.map((entry) => (
              <div
                key={entry.playerId}
                className={cn(
                  'flex items-center justify-between rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-2 text-xs font-semibold text-amber-900/90',
                  entry.isSelf ? 'ring-2 ring-amber-200' : ''
                )}
              >
                <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                  <span className='text-amber-900/70'>{entry.rank}.</span>
                  <span>{entry.label}</span>
                  {entry.isLeader ? (
                    <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800'>
                      {translations('numberBalance.inRound.leaderBadge')}
                    </span>
                  ) : null}
                </div>
                <span>
                  {entry.score} {translations('shared.pointsShort')}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className='text-xs font-semibold text-rose-600'>{error}</div>
        ) : null}
        {isCoarsePointer ? (
          <div
            className='rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm'
            data-testid='number-balance-touch-hint'
            aria-live='polite'
          >
            {touchHint}
          </div>
        ) : null}

        <KangurGlassPanel
          className={cn(
            'w-full rounded-[32px] p-6 transition',
            celebrating ? 'ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' : ''
          )}
          surface='playField'
        >
          <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full`}>
            <div className='flex flex-col items-center justify-center gap-6 md:flex-row md:items-end'>
              <div className='flex w-full max-w-xs flex-col items-center kangur-panel-gap'>
                <div className='text-sm font-semibold text-amber-900'>
                  {translations('numberBalance.inRound.targetLabel', {
                    target: puzzle.targets.left,
                  })}
                </div>
                <Droppable droppableId='left'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition touch-manipulation',
                        snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200',
                        isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white'
                      )}
                      data-testid='number-balance-left-zone'
                      onClick={() => moveSelectedTileTo('left')}
                      role='button'
                      tabIndex={canInteract ? 0 : -1}
                      aria-disabled={!canInteract}
                      aria-label={translations('numberBalance.inRound.aria.leftSide')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          moveSelectedTileTo('left');
                        }
                      }}
                    >
                      {leftTiles.map((tile, index) => (
                        <NumberTile
                          key={tile.id}
                          tile={tile}
                          index={index}
                          isDragDisabled={!canInteract}
                          isSelected={selectedTileId === tile.id}
                          isCoarsePointer={isCoarsePointer}
                          onClick={() => {
                            if (!canInteract) return;
                            setSelectedTileId((current) => (current === tile.id ? null : tile.id));
                          }}
                        />
                      ))}
                      {Array.from({
                        length: Math.max(0, puzzle.slots.left - leftTiles.length),
                      }).map((_, index) => (
                        <div
                          key={`left-slot-${index}`}
                          className='h-14 w-14 rounded-2xl border border-dashed border-amber-200/70'
                          aria-hidden='true'
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className='text-xs font-semibold text-amber-900/80'>
                  {translations('numberBalance.inRound.sumLabel', {
                    sum: evaluation.leftSum,
                  })}
                </div>
              </div>

              <div className='hidden h-1 w-12 rounded-full bg-amber-200/80 md:block' aria-hidden='true' />

              <div className='flex w-full max-w-xs flex-col items-center kangur-panel-gap'>
                <div className='text-sm font-semibold text-amber-900'>
                  {translations('numberBalance.inRound.targetLabel', {
                    target: puzzle.targets.right,
                  })}
                </div>
                <Droppable droppableId='right'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition touch-manipulation',
                        snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200',
                        isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white'
                      )}
                      data-testid='number-balance-right-zone'
                      onClick={() => moveSelectedTileTo('right')}
                      role='button'
                      tabIndex={canInteract ? 0 : -1}
                      aria-disabled={!canInteract}
                      aria-label={translations('numberBalance.inRound.aria.rightSide')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          moveSelectedTileTo('right');
                        }
                      }}
                    >
                      {rightTiles.map((tile, index) => (
                        <NumberTile
                          key={tile.id}
                          tile={tile}
                          index={index}
                          isDragDisabled={!canInteract}
                          isSelected={selectedTileId === tile.id}
                          isCoarsePointer={isCoarsePointer}
                          onClick={() => {
                            if (!canInteract) return;
                            setSelectedTileId((current) => (current === tile.id ? null : tile.id));
                          }}
                        />
                      ))}
                      {Array.from({
                        length: Math.max(0, puzzle.slots.right - rightTiles.length),
                      }).map((_, index) => (
                        <div
                          key={`right-slot-${index}`}
                          className='h-14 w-14 rounded-2xl border border-dashed border-amber-200/70'
                          aria-hidden='true'
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className='text-xs font-semibold text-amber-900/80'>
                  {translations('numberBalance.inRound.sumLabel', {
                    sum: evaluation.rightSum,
                  })}
                </div>
              </div>
            </div>

            <div className='flex flex-col kangur-panel-gap'>
              <div className='text-xs font-semibold text-amber-900/80'>
                {translations('numberBalance.inRound.instruction')}
              </div>
              <Droppable droppableId='tray' direction='horizontal'>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex min-h-[88px] flex-wrap items-center justify-center kangur-panel-gap rounded-[28px] border-2 border-dashed p-3 transition touch-manipulation',
                      snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/70' : 'border-amber-200',
                      isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white'
                    )}
                    data-testid='number-balance-tray-zone'
                    onClick={() => moveSelectedTileTo('tray')}
                    role='button'
                    tabIndex={canInteract ? 0 : -1}
                    aria-disabled={!canInteract}
                    aria-label={translations('numberBalance.inRound.aria.tray')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        moveSelectedTileTo('tray');
                      }
                    }}
                  >
                    {trayTiles.map((tile, index) => (
                      <NumberTile
                        key={tile.id}
                        tile={tile}
                        index={index}
                        isDragDisabled={!canInteract}
                        isSelected={selectedTileId === tile.id}
                        isCoarsePointer={isCoarsePointer}
                        onClick={() => {
                          if (!canInteract) return;
                          setSelectedTileId((current) => (current === tile.id ? null : tile.id));
                        }}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </KangurGlassPanel>

        {phase === 'countdown' ? (
          <div className='text-xs font-semibold text-amber-900/80'>
            {translations('numberBalance.inRound.countdown', {
              seconds: Math.max(1, Math.ceil(countdownLeftMs / 1000)),
            })}
          </div>
        ) : null}
      </KangurPracticeGameStage>
    </KangurDragDropContext>
  );
}
