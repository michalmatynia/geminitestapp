'use client';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
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
}: {
  tile: NumberBalanceTile;
  index: number;
  isDragDisabled: boolean;
}): React.JSX.Element {
  return (
    <Draggable draggableId={tile.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => {
        const content = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 text-xl font-extrabold shadow-[0_12px_28px_-20px_rgba(15,23,42,0.45)] transition',
              TILE_STYLES[index % TILE_STYLES.length],
              snapshot.isDragging ? 'scale-105 shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)]' : ''
            )}
            aria-label={`Liczba ${tile.value}`}
          >
            {tile.value}
          </div>
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
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<NumberBalancePlayerScore[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [solves, setSolves] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const solveTimesRef = useRef<number[]>([]);
  const lastLoadedPuzzleIndexRef = useRef<number | null>(null);
  const lastLoadedPuzzleStartRef = useRef<number | null>(null);
  const puzzleStartedAtRef = useRef<number>(Date.now());
  const lastServerTimeRef = useRef<number>(0);
  const activeMatchIdRef = useRef<string | null>(null);
  const activeMatchStatusRef = useRef<MatchStatus | null>(null);

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
        setMatch(null);
        setPlayer(null);
        setError('Nie udało się uruchomić meczu. Spróbuj ponownie.');
      } finally {
        setIsLoading(false);
      }
    },
    [durationMs, tier, balancedProbability]
  );

  const handleRetryMatch = useCallback(() => {
    void initMatch(requestedMatchId);
  }, [initMatch, requestedMatchId]);

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
    } catch {
      // Silent retry; background polling shouldn't interrupt gameplay.
    }
  }, [syncMatchState]);

  const activeMatchId = match?.matchId ?? null;
  const activeMatchStatus: MatchStatus | null = match?.status ?? null;
  const activePlayerId = player?.playerId ?? null;
  const shouldPoll =
    Boolean(activeMatchId && activePlayerId) && !isTerminalMatchStatus(activeMatchStatus);

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
    ? `Rywal: ${opponentScore ?? 0}`
    : hasOpponent
      ? 'Rywal: …'
      : 'Rywal: —';

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
        window.setTimeout(() => setCelebrating(false), 300);
      }
    } catch (_err) {
      setError('Nie udało się zapisać ruchu. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canInteract = phase === 'running' && !celebrating && !isSubmitting;

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
    void handleSolved(nextLeft, nextRight);
  };

  if (phase === 'waiting' && match && player) {
    return (
      <KangurPracticeGameStage className='w-full max-w-xl gap-4'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>
            Czekamy na drugiego gracza…
          </div>
          <div className='mt-2 text-xs font-semibold text-amber-900/80'>
            Kod meczu: {match.matchId}
          </div>
          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='amber'>
              Ty: {score}
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
      <KangurPracticeGameStage className='w-full max-w-xl gap-4'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>Ładowanie meczu…</div>
          {error ? (
            <div className='mt-3 text-xs font-semibold text-rose-600'>
              {error}
              <div className='mt-2'>
                <KangurButton
                  size='sm'
                  variant='primary'
                  onClick={handleRetryMatch}
                >
                  Spróbuj ponownie
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
        ? 'Wygrana!'
        : score === safeOpponentScore
          ? 'Remis!'
          : 'Przegrana!'
      : null;

    return (
      <KangurPracticeGameSummary dataTestId='number-balance-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='number-balance-summary-emoji'
          emoji={summaryEmoji}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='number-balance-summary-title'
          title={`Wynik: ${score} pkt`}
        />
        <KangurPracticeGameSummaryMessage>
          Rozwiązane: {solves} • Średni czas: {avgSolveLabel}
          {hasOpponent ? ` • Rywal: ${safeOpponentScore} pkt` : ''}
          {outcomeLabel ? ` • ${outcomeLabel}` : ''}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel='Zakończ'
          onFinish={() => {
            onFinish?.();
          }}
          onRestart={handleRetryMatch}
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <KangurPracticeGameStage className='w-full max-w-2xl gap-6'>
        <div className='flex w-full flex-wrap items-center justify-between gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <KangurStatusChip className='px-4 py-2 text-sm font-bold' accent='amber'>
              Ty: {score}
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

        {error ? (
          <div className='text-xs font-semibold text-rose-600'>{error}</div>
        ) : null}

        <KangurGlassPanel
          className={cn(
            'w-full rounded-[32px] p-6 transition',
            celebrating ? 'ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]' : ''
          )}
          surface='playField'
        >
          <div className='flex w-full flex-col gap-6'>
            <div className='flex items-end justify-center gap-6'>
              <div className='flex w-full max-w-xs flex-col items-center gap-3'>
                <div className='text-sm font-semibold text-amber-900'>
                  Cel: {puzzle.targets.left}
                </div>
                <Droppable droppableId='left'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition',
                        snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200'
                      )}
                    >
                      {leftTiles.map((tile, index) => (
                        <NumberTile
                          key={tile.id}
                          tile={tile}
                          index={index}
                          isDragDisabled={!canInteract}
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
                  Suma: {evaluation.leftSum}
                </div>
              </div>

              <div className='hidden h-1 w-12 rounded-full bg-amber-200/80 md:block' aria-hidden='true' />

              <div className='flex w-full max-w-xs flex-col items-center gap-3'>
                <div className='text-sm font-semibold text-amber-900'>
                  Cel: {puzzle.targets.right}
                </div>
                <Droppable droppableId='right'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition',
                        snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200'
                      )}
                    >
                      {rightTiles.map((tile, index) => (
                        <NumberTile
                          key={tile.id}
                          tile={tile}
                          index={index}
                          isDragDisabled={!canInteract}
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
                  Suma: {evaluation.rightSum}
                </div>
              </div>
            </div>

            <div className='flex flex-col gap-3'>
              <div className='text-xs font-semibold text-amber-900/80'>
                Przeciągnij liczby do obu stron, aby zgadzały się z celami.
              </div>
              <Droppable droppableId='tray' direction='horizontal'>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex min-h-[88px] flex-wrap items-center justify-center gap-3 rounded-[28px] border-2 border-dashed p-3 transition',
                      snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/70' : 'border-amber-200'
                    )}
                  >
                    {trayTiles.map((tile, index) => (
                      <NumberTile
                        key={tile.id}
                        tile={tile}
                        index={index}
                        isDragDisabled={!canInteract}
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
            Start za {Math.max(1, Math.ceil(countdownLeftMs / 1000))}…
          </div>
        ) : null}
      </KangurPracticeGameStage>
    </DragDropContext>
  );
}
