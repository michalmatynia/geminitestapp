'use client';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_STACK_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  LOGICAL_PATTERNS_WORKSHOP_ROUNDS,
  LOGICAL_PATTERNS_WORKSHOP_TILES,
  type LogicalPatternCell,
  type LogicalPatternRound,
  type LogicalPatternTile,
} from './logical-patterns-workshop-data';

import type { DropResult } from '@hello-pangea/dnd';

type LogicalPatternsWorkshopGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

type RoundState = {
  pool: LogicalPatternTile[];
  slots: Record<string, LogicalPatternTile[]>;
};

type BlankCell = Extract<LogicalPatternCell, { type: 'blank' }>;

const TOTAL_ROUNDS = Math.max(LOGICAL_PATTERNS_WORKSHOP_ROUNDS.length, 1);
const TOTAL_TARGETS = LOGICAL_PATTERNS_WORKSHOP_ROUNDS.reduce(
  (sum, round) => sum + round.sequence.filter((cell) => cell.type === 'blank').length,
  0
);
const FALLBACK_ROUND: LogicalPatternRound = {
  id: 'fallback',
  title: 'Wzorce i ciągi',
  prompt: 'Brak danych do gry.',
  ruleHint: 'Uzupełnij brakujące elementy.',
  ruleSummary: 'Uzupełnij brakujące elementy.',
  stepHint: 'Najpierw znajdź powtarzający się fragment.',
  pool: [],
  sequence: [],
};
const FIRST_ROUND = LOGICAL_PATTERNS_WORKSHOP_ROUNDS[0] ?? FALLBACK_ROUND;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: LogicalPatternRound): RoundState => {
  const pool = shuffle(
    round.pool
      .map((tileId) => LOGICAL_PATTERNS_WORKSHOP_TILES[tileId])
      .filter((tile): tile is LogicalPatternTile => Boolean(tile))
  );
  const slots = round.sequence
    .filter((cell): cell is BlankCell => cell.type === 'blank')
    .reduce<Record<string, LogicalPatternTile[]>>((acc, blank) => {
      acc[blank.id] = [];
      return acc;
    }, {});
  return { pool, slots };
};

const slotIdForBlank = (blankId: string): string => `slot-${blankId}`;
const isSlotId = (value: string): boolean => value.startsWith('slot-');
const getBlankIdFromSlot = (slotId: string): string => slotId.replace('slot-', '');

const removeTokenById = (
  items: LogicalPatternTile[],
  tokenId: string
): { updated: LogicalPatternTile[]; token?: LogicalPatternTile } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index < 0) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

const ringClasses: Record<KangurAccent, string> = {
  indigo: 'ring-indigo-400/70',
  violet: 'ring-violet-400/70',
  emerald: 'ring-emerald-400/70',
  sky: 'ring-sky-400/70',
  amber: 'ring-amber-400/70',
  rose: 'ring-rose-400/70',
  teal: 'ring-teal-400/70',
  slate: 'ring-slate-400/70',
};

const dragPortal = typeof document === 'undefined' ? null : document.body;

const buildTileClassName = ({
  accent,
  isSelected,
  isDragging,
  isCompact,
  isDisabled,
  isMuted,
}: {
  accent: KangurAccent;
  isSelected: boolean;
  isDragging: boolean;
  isCompact: boolean;
  isDisabled: boolean;
  isMuted: boolean;
}): string =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-[18px] border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base',
    KANGUR_ACCENT_STYLES[accent].badge,
    !isDisabled && KANGUR_ACCENT_STYLES[accent].hoverCard,
    isSelected && `ring-2 ${ringClasses[accent]} ring-offset-1 ring-offset-transparent`,
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-24px_rgba(124,58,237,0.35)]',
    isDisabled ? 'cursor-default' : 'cursor-pointer',
    isMuted && 'opacity-70'
  );

const getSlotSurface = ({
  checked,
  isDraggingOver,
  isCorrect,
  hasToken,
}: {
  checked: boolean;
  isDraggingOver: boolean;
  isCorrect: boolean;
  hasToken: boolean;
}): { accent: KangurAccent; className: string } => {
  const focusRingClassName =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white';
  if (checked && hasToken) {
    return {
      accent: isCorrect ? 'emerald' : 'rose',
      className: cn(
        'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border px-2 py-2 transition',
        focusRingClassName,
        isCorrect
          ? KANGUR_ACCENT_STYLES.emerald.activeCard
          : KANGUR_ACCENT_STYLES.rose.activeCard
      ),
    };
  }

  if (isDraggingOver) {
    return {
      accent: 'violet',
      className: cn(
        'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border border-violet-300 bg-violet-100/70 px-2 py-2 transition scale-[1.02]',
        focusRingClassName
      ),
    };
  }

  return {
    accent: 'violet',
    className: cn(
      'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border border-dashed border-violet-300/70 px-2 py-2 text-xs font-semibold text-violet-600/80 transition',
      focusRingClassName,
      KANGUR_ACCENT_STYLES.violet.hoverCard
    ),
  };
};

const resolveTileByValue = (
  tiles: Record<string, LogicalPatternTile>
): Map<string, LogicalPatternTile> => {
  const byValue = new Map<string, LogicalPatternTile>();
  Object.values(tiles).forEach((tile) => {
    if (!byValue.has(tile.value)) {
      byValue.set(tile.value, tile);
    }
  });
  return byValue;
};

export default function LogicalPatternsWorkshopGame({
  finishLabel = 'Wróć do tematów',
  onFinish,
}: LogicalPatternsWorkshopGameProps): React.JSX.Element {
  const summaryFinishLabel = finishLabel;
  const handleFinish = onFinish;
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(FIRST_ROUND)
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = LOGICAL_PATTERNS_WORKSHOP_ROUNDS[roundIndex] ?? FIRST_ROUND;
  const blanks = useMemo(
    () => round.sequence.filter((cell): cell is BlankCell => cell.type === 'blank'),
    [round.sequence]
  );
  const tileByValue = useMemo(
    () => resolveTileByValue(LOGICAL_PATTERNS_WORKSHOP_TILES),
    []
  );

  const isRoundComplete = blanks.every((blank) => roundState.slots[blank.id]?.length);

  const resetRound = (): void => {
    setRoundState(buildRoundState(round));
    setSelectedTokenId(null);
    setChecked(false);
    setShowHint(false);
    setUsedHint(false);
    setStartedAt(null);
    setCompletedAt(null);
    setRoundCorrect(0);
  };

  const handleCheck = (): void => {
    if (checked || !isRoundComplete) return;
    setSelectedTokenId(null);
    const correctCount = blanks.reduce((acc, blank) => {
      const assigned = roundState.slots[blank.id]?.[0];
      return acc + (assigned?.value === blank.correctValue ? 1 : 0);
    }, 0);
    const resolvedStart = startedAt ?? Date.now();
    const resolvedEnd = Date.now();
    setRoundCorrect(correctCount);
    setStartedAt(resolvedStart);
    setCompletedAt(resolvedEnd);
    setChecked(true);
  };

  const goToNextRound = (): void => {
    const completionTimeMs =
      startedAt && completedAt ? Math.max(0, completedAt - startedAt) : null;
    const roundMax = blanks.length;
    const roundScore = Math.max(
      0,
      roundCorrect - (usedHint ? 1 : 0) - (completionTimeMs && completionTimeMs > 45000 ? 1 : 0)
    );
    const nextScore = score + Math.min(roundScore, roundMax);
    setScore(nextScore);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      if (TOTAL_TARGETS > 0) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(
          progress,
          'logical_patterns',
          nextScore,
          TOTAL_TARGETS
        );
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'logical',
          score: nextScore,
          totalQuestions: TOTAL_TARGETS,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
      }
      setDone(true);
      return;
    }
    const nextIndex = roundIndex + 1;
    const nextRound = LOGICAL_PATTERNS_WORKSHOP_ROUNDS[nextIndex] ?? FIRST_ROUND;
    setRoundIndex(nextIndex);
    setRoundState(buildRoundState(nextRound));
    setSelectedTokenId(null);
    setChecked(false);
    setShowHint(false);
    setUsedHint(false);
    setStartedAt(null);
    setCompletedAt(null);
    setRoundCorrect(0);
  };

  const restart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState(FIRST_ROUND));
    setSelectedTokenId(null);
    setChecked(false);
    setShowHint(false);
    setUsedHint(false);
    setStartedAt(null);
    setCompletedAt(null);
    setRoundCorrect(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  const handleAssignToken = (blankId: string): void => {
    if (checked || !selectedTokenId) return;
    setStartedAt((current) => current ?? Date.now());
    setRoundState((prev) => {
      const { updated: nextPool, token } = removeTokenById(prev.pool, selectedTokenId);
      if (!token) return prev;
      const existing = prev.slots[blankId]?.[0] ?? null;
      const updatedPool = existing ? [...nextPool, existing] : nextPool;
      return {
        pool: updatedPool,
        slots: {
          ...prev.slots,
          [blankId]: [token],
        },
      };
    });
    setSelectedTokenId(null);
  };

  const handleSlotClick = (blankId: string): void => {
    if (checked) return;
    if (selectedTokenId) {
      handleAssignToken(blankId);
      return;
    }
    setRoundState((prev) => {
      const existing = prev.slots[blankId]?.[0] ?? null;
      if (!existing) return prev;
      return {
        pool: [...prev.pool, existing],
        slots: {
          ...prev.slots,
          [blankId]: [],
        },
      };
    });
  };

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    setStartedAt((current) => current ?? Date.now());
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;
    if (sourceId === destinationId && source.index === destination.index) return;
    if (sourceId !== 'pool' && !isSlotId(sourceId)) return;
    if (destinationId !== 'pool' && !isSlotId(destinationId)) return;

    setRoundState((prev) => {
      const sourceList =
        sourceId === 'pool'
          ? [...prev.pool]
          : [...(prev.slots[getBlankIdFromSlot(sourceId)] ?? [])];
      const [moved] = sourceList.splice(source.index, 1);
      if (!moved) return prev;

      const nextSlots = { ...prev.slots };
      let nextPool = prev.pool;

      if (sourceId === 'pool') {
        nextPool = sourceList;
      } else {
        nextSlots[getBlankIdFromSlot(sourceId)] = sourceList;
      }

      if (destinationId === 'pool') {
        const updatedPool = [...nextPool];
        updatedPool.splice(destination.index, 0, moved);
        return {
          pool: updatedPool,
          slots: nextSlots,
        };
      }

      const blankId = getBlankIdFromSlot(destinationId);
      const existing = nextSlots[blankId]?.[0] ?? null;
      if (existing) {
        nextPool = [...nextPool, existing];
      }

      nextSlots[blankId] = [moved];
      return {
        pool: nextPool,
        slots: nextSlots,
      };
    });
    setSelectedTokenId(null);
  };

  if (done) {
    const percent = TOTAL_TARGETS ? Math.round((score / TOTAL_TARGETS) * 100) : 0;
    return (
      <KangurPracticeGameSummary dataTestId='logical-patterns-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='logical-patterns-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='violet'
          title={`Wynik: ${score}/${TOTAL_TARGETS}`}
        />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='logical-patterns-summary-breakdown'
          itemDataTestIdPrefix='logical-patterns-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='violet'
          dataTestId='logical-patterns-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Perfekcyjnie! Rozpoznajesz wzorce w mgnieniu oka.'
            : percent >= 70
              ? 'Świetnie! Wzorce i ciągi idą Ci coraz lepiej.'
              : 'Dobra próba! Spróbuj jeszcze raz i sprawdź reguły.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={summaryFinishLabel}
          onFinish={handleFinish}
          onRestart={restart}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  const elapsedMs =
    checked && startedAt && completedAt ? Math.max(0, completedAt - startedAt) : null;

  return (
    <DragDropContext
      onDragEnd={onDragEnd}
      onDragStart={() => setSelectedTokenId(null)}
    >
      <KangurPracticeGameStage className='mx-auto max-w-3xl'>
        <KangurPracticeGameProgress
          accent='violet'
          currentRound={roundIndex}
          dataTestId='logical-patterns-progress-bar'
          totalRounds={TOTAL_ROUNDS}
        />

        <KangurInfoCard accent='violet' className='w-full' padding='sm' tone='accent'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <p className='text-sm font-bold'>Warsztat wzorców</p>
              <p className='text-xs [color:var(--kangur-page-muted-text)]'>{round.prompt}</p>
            </div>
            <KangurStatusChip accent='violet' size='sm'>
              Runda {roundIndex + 1}/{TOTAL_ROUNDS}
            </KangurStatusChip>
          </div>
          <p className='mt-2 text-[11px] [color:var(--kangur-page-muted-text)]'>
            Przeciągnij kafelki do pustych pól albo kliknij kafelek i potem kliknij puste pole.
          </p>
          <div className={`mt-2 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}>
            <KangurButton
              size='sm'
              type='button'
              variant='surface'
              onClick={() => {
                setShowHint((current) => !current);
                setUsedHint(true);
              }}
              disabled={checked}
            >
              {showHint ? 'Ukryj podpowiedź' : 'Pokaż podpowiedź'}
            </KangurButton>
            {showHint && !checked ? (
              <span className='text-[11px] font-semibold text-violet-700'>{round.ruleHint}</span>
            ) : null}
          </div>
        </KangurInfoCard>

        <div className='flex w-full flex-col kangur-panel-gap'>
          <div className='flex items-center justify-between'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-violet-700'>
              Sekwencja
            </p>
            <KangurStatusChip accent='slate' size='sm'>
              {blanks.length} brakujące
            </KangurStatusChip>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            {round.sequence.map((cell, index) => {
              if (cell.type === 'fixed') {
                const tile = LOGICAL_PATTERNS_WORKSHOP_TILES[cell.tileId];
                if (!tile) return null;
                return (
                  <div
                    key={`fixed-${cell.tileId}-${index}`}
                    className={buildTileClassName({
                      accent: tile.accent ?? 'violet',
                      isSelected: false,
                      isDragging: false,
                      isCompact: false,
                      isDisabled: true,
                      isMuted: false,
                    })}
                  >
                    <span className={tile.kind === 'number' ? 'text-lg font-bold' : 'text-xl'}>
                      {tile.label}
                    </span>
                  </div>
                );
              }

              const assigned = roundState.slots[cell.id]?.[0] ?? null;
              const isCorrect = assigned?.value === cell.correctValue;
              const correctTile =
                checked && !isCorrect ? tileByValue.get(cell.correctValue) : null;
              return (
                <div key={cell.id} className='flex flex-col items-center gap-1'>
                  <Droppable droppableId={slotIdForBlank(cell.id)}>
                    {(provided, snapshot) => {
                      const slotSurface = getSlotSurface({
                        checked,
                        isDraggingOver: snapshot.isDraggingOver,
                        isCorrect,
                        hasToken: Boolean(assigned),
                      });
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={slotSurface.className}
                          onClick={() => handleSlotClick(cell.id)}
                          role='button'
                          tabIndex={checked ? -1 : 0}
                          aria-disabled={checked}
                          aria-label={
                            assigned
                              ? `Pole sekwencji: ${assigned.label}`
                              : 'Puste pole sekwencji'
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleSlotClick(cell.id);
                            }
                          }}
                        >
                            {assigned ? (
                              <Draggable
                                draggableId={assigned.id}
                                index={0}
                                key={assigned.id}
                                isDragDisabled={checked}
                                disableInteractiveElementBlocking
                              >
                              {(tokenProvided, tokenSnapshot) => {
                                const content = (
                                  <button
                                    type='button'
                                    ref={tokenProvided.innerRef}
                                    {...tokenProvided.draggableProps}
                                    {...tokenProvided.dragHandleProps}
                                    className={buildTileClassName({
                                      accent: assigned.accent ?? 'violet',
                                      isSelected: false,
                                      isDragging: tokenSnapshot.isDragging,
                                      isCompact: true,
                                      isDisabled: checked,
                                      isMuted: checked,
                                    })}
                                    aria-label={
                                      assigned.kind === 'number'
                                        ? `Usuń liczbę ${assigned.label} z sekwencji`
                                        : `Usuń symbol ${assigned.label} z sekwencji`
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (checked) return;
                                      setRoundState((prev) => ({
                                        pool: [...prev.pool, assigned],
                                        slots: {
                                          ...prev.slots,
                                          [cell.id]: [],
                                        },
                                      }));
                                    }}
                                  >
                                    <span
                                      className={
                                        assigned.kind === 'number'
                                          ? 'text-sm font-bold'
                                          : 'text-base'
                                      }
                                    >
                                      {assigned.label}
                                    </span>
                                  </button>
                                );

                                if (tokenSnapshot.isDragging && dragPortal) {
                                  return createPortal(content, dragPortal);
                                }

                                return content;
                              }}
                            </Draggable>
                          ) : (
                            <span>Upuść</span>
                          )}
                          {provided.placeholder}
                        </div>
                      );
                    }}
                  </Droppable>
                  {correctTile ? (
                    <span className='text-[11px] font-semibold text-rose-600'>
                      Poprawnie: {correctTile.label}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {checked ? (
            <KangurInfoCard accent='violet' padding='sm' tone='accent' className='w-full'>
              <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
                <KangurStatusChip accent='violet' size='sm' labelStyle='caps'>
                  Reguła
                </KangurStatusChip>
                <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
                  {round.ruleSummary}
                </p>
              </div>
              <p className='mt-1 text-[11px] [color:var(--kangur-page-muted-text)]'>
                {round.stepHint}
              </p>
              <div className={`mt-2 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}>
                {usedHint ? (
                  <KangurStatusChip accent='rose' size='sm'>
                    Podpowiedź użyta
                  </KangurStatusChip>
                ) : (
                  <KangurStatusChip accent='emerald' size='sm'>
                    Bez podpowiedzi
                  </KangurStatusChip>
                )}
                {elapsedMs !== null ? (
                  elapsedMs > 45000 ? (
                    <KangurStatusChip accent='amber' size='sm'>
                      Wolne tempo
                    </KangurStatusChip>
                  ) : (
                    <KangurStatusChip accent='sky' size='sm'>
                      Szybkie tempo
                    </KangurStatusChip>
                  )
                ) : null}
              </div>
              <div className='mt-2 flex flex-wrap items-center justify-center gap-2'>
                {round.sequence.map((cell, index) => {
                  const tile =
                    cell.type === 'fixed'
                      ? LOGICAL_PATTERNS_WORKSHOP_TILES[cell.tileId]
                      : tileByValue.get(cell.correctValue);
                  if (!tile) return null;
                  return (
                    <div
                      key={`solution-${cell.type}-${index}`}
                      className={buildTileClassName({
                        accent: tile.accent ?? 'violet',
                        isSelected: false,
                        isDragging: false,
                        isCompact: true,
                        isDisabled: true,
                        isMuted: false,
                      })}
                    >
                      <span
                        className={tile.kind === 'number' ? 'text-sm font-bold' : 'text-base'}
                      >
                        {tile.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </KangurInfoCard>
          ) : null}
        </div>

        <div className='flex w-full flex-col kangur-panel-gap'>
          <div className='flex items-center justify-between'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-violet-700'>
              Kafelki
            </p>
            <KangurStatusChip accent='slate' size='sm'>
              {roundState.pool.length} w puli
            </KangurStatusChip>
          </div>
          <Droppable droppableId='pool' direction='horizontal'>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'flex min-h-[72px] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed px-3 py-3 text-center text-xs',
                  roundState.pool.length === 0
                    ? 'text-violet-600'
                    : '[color:var(--kangur-page-muted-text)]'
                )}
              >
                {roundState.pool.length === 0 ? <span>Wszystkie kafelki użyte!</span> : null}
                {roundState.pool.map((token, index) => (
                  <Draggable
                    key={token.id}
                    draggableId={token.id}
                    index={index}
                    isDragDisabled={checked}
                    disableInteractiveElementBlocking
                  >
                    {(draggableProvided, snapshot) => {
                      const content = (
                        <button
                          type='button'
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          {...draggableProvided.dragHandleProps}
                          className={buildTileClassName({
                            accent: token.accent ?? 'violet',
                            isSelected: selectedTokenId === token.id,
                            isDragging: snapshot.isDragging,
                            isCompact: false,
                            isDisabled: checked,
                            isMuted: checked,
                          })}
                          aria-label={
                            token.kind === 'number'
                              ? `Kafelek: liczba ${token.label}`
                              : `Kafelek: symbol ${token.label}`
                          }
                          aria-pressed={selectedTokenId === token.id}
                          onClick={(event) => {
                            event.preventDefault();
                            if (snapshot.isDragging || checked) return;
                            setSelectedTokenId((current) =>
                              current === token.id ? null : token.id
                            );
                          }}
                        >
                          <span
                            className={token.kind === 'number' ? 'text-lg font-bold' : 'text-xl'}
                          >
                            {token.label}
                          </span>
                        </button>
                      );

                      if (snapshot.isDragging && dragPortal) {
                        return createPortal(content, dragPortal);
                      }

                      return content;
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <KangurButton
              size='sm'
              type='button'
              variant='surface'
              onClick={resetRound}
              disabled={checked}
            >
              Wyczyść rundę
            </KangurButton>
            {checked ? (
              <KangurStatusChip accent={roundCorrect === blanks.length ? 'emerald' : 'rose'}>
                {roundCorrect}/{blanks.length} trafień
              </KangurStatusChip>
            ) : null}
          </div>
          {!checked ? (
            <KangurButton
              size='sm'
              type='button'
              variant='primary'
              onClick={handleCheck}
              disabled={!isRoundComplete}
            >
              Sprawdź
            </KangurButton>
          ) : (
            <KangurButton size='sm' type='button' variant='primary' onClick={goToNextRound}>
              {roundIndex + 1 >= TOTAL_ROUNDS ? 'Zobacz wynik' : 'Dalej'}
            </KangurButton>
          )}
        </div>
      </KangurPracticeGameStage>
    </DragDropContext>
  );
}
