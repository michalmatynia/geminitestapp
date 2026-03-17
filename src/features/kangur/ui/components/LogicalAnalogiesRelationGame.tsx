'use client';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
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
  LOGICAL_ANALOGIES_RELATION_ROUNDS,
  LOGICAL_ANALOGY_RELATION_TOKENS,
  type LogicalAnalogyRelationId,
  type LogicalAnalogyRelationRound,
  type LogicalAnalogyRelationToken,
} from './logical-analogies-game-data';

import type { DropResult } from '@hello-pangea/dnd';

type LogicalAnalogiesRelationGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

type RoundState = {
  pool: LogicalAnalogyRelationToken[];
  slots: Record<string, LogicalAnalogyRelationToken[]>;
};

const TOTAL_ROUNDS = Math.max(LOGICAL_ANALOGIES_RELATION_ROUNDS.length, 1);
const TOTAL_TARGETS = LOGICAL_ANALOGIES_RELATION_ROUNDS.reduce(
  (sum, round) => sum + round.targets.length,
  0
);
const FALLBACK_ROUND: LogicalAnalogyRelationRound = {
  id: 'fallback',
  title: 'Relacje',
  prompt: 'Brak danych do gry.',
  relationIds: [],
  targets: [],
};
const FIRST_ROUND = LOGICAL_ANALOGIES_RELATION_ROUNDS[0] ?? FALLBACK_ROUND;

const EMPTY_POOL_MESSAGE = 'Wszystkie relacje są już użyte.';
const RUSH_TIME_MIN = 24;
const RUSH_TIME_BASE = 8;
const RUSH_TIME_PER_TARGET = 10;
const dragPortal = typeof document === 'undefined' ? null : document.body;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const getRushTimeLimit = (targetCount: number): number =>
  Math.max(RUSH_TIME_MIN, RUSH_TIME_BASE + targetCount * RUSH_TIME_PER_TARGET);

const buildRoundState = (round: LogicalAnalogyRelationRound): RoundState => {
  const pool = shuffle(round.relationIds.map((relationId) => LOGICAL_ANALOGY_RELATION_TOKENS[relationId]));
  const slots = round.targets.reduce<Record<string, LogicalAnalogyRelationToken[]>>((acc, target) => {
    acc[target.id] = [];
    return acc;
  }, {});
  return { pool, slots };
};

const slotIdForTarget = (targetId: string): string => `slot-${targetId}`;
const isSlotId = (value: string): boolean => value.startsWith('slot-');
const getTargetIdFromSlot = (slotId: string): string => slotId.replace('slot-', '');

const removeTokenById = (
  items: LogicalAnalogyRelationToken[],
  tokenId: string
): { updated: LogicalAnalogyRelationToken[]; token?: LogicalAnalogyRelationToken } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index < 0) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

const buildTokenClassName = ({
  isSelected,
  isDragging,
  isCompact,
  isDisabled,
}: {
  isSelected: boolean;
  isDragging: boolean;
  isCompact: boolean;
  isDisabled: boolean;
}): string =>
  cn(
    'flex w-full items-center justify-center gap-2 rounded-full border bg-white/90 font-semibold shadow-[0_14px_30px_-22px_rgba(15,23,42,0.35)] transition',
    isCompact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-sm',
    isSelected && 'ring-2 ring-rose-400 ring-offset-1',
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-24px_rgba(190,24,93,0.35)]',
    isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
    !isDisabled && KANGUR_ACCENT_STYLES.rose.hoverCard
  );

export default function LogicalAnalogiesRelationGame({
  finishLabel = 'Wróć do tematów',
  onFinish,
}: LogicalAnalogiesRelationGameProps): React.JSX.Element {
  const summaryFinishLabel = finishLabel;
  const handleFinish = onFinish;
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(FIRST_ROUND)
  );
  const [selectedTokenId, setSelectedTokenId] = useState<LogicalAnalogyRelationId | null>(null);
  const [hoveredRelationId, setHoveredRelationId] = useState<LogicalAnalogyRelationId | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [isRushMode, setIsRushMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());
  const idPrefix = useId();
  const instructionsId = `${idPrefix}-instructions`;
  const hintId = `${idPrefix}-hint`;
  const timerId = `${idPrefix}-timer`;

  const round = LOGICAL_ANALOGIES_RELATION_ROUNDS[roundIndex] ?? FIRST_ROUND;

  const roundTargets = round.targets;
  const relationTokens = useMemo(
    () =>
      round.relationIds
        .map((relationId) => LOGICAL_ANALOGY_RELATION_TOKENS[relationId])
        .filter(Boolean),
    [round.relationIds]
  );
  const isRoundComplete = roundTargets.every((target) => roundState.slots[target.id]?.length);
  const activeRelationId = hoveredRelationId ?? selectedTokenId;
  const activeRelationHint = activeRelationId
    ? LOGICAL_ANALOGY_RELATION_TOKENS[activeRelationId]
    : null;

  const resetRound = (): void => {
    setRoundState(buildRoundState(round));
    setSelectedTokenId(null);
    setHoveredRelationId(null);
    setChecked(false);
    setRoundCorrect(0);
    setTimeExpired(false);
    if (isRushMode) {
      const nextLimit = getRushTimeLimit(roundTargets.length);
      setTimeLimit(nextLimit);
      setTimeLeft(nextLimit);
    }
  };

  const finalizeRound = useCallback(
    (force: boolean): void => {
      if (checked) return;
      if (!force && !isRoundComplete) return;
      const correctCount = roundTargets.reduce((acc, target) => {
        const assigned = roundState.slots[target.id]?.[0] ?? null;
        return acc + (assigned?.id === target.relationId ? 1 : 0);
      }, 0);
      setRoundCorrect(correctCount);
      setScore((prev) => prev + correctCount);
      setChecked(true);
      setSelectedTokenId(null);
    },
    [checked, isRoundComplete, roundTargets, roundState.slots]
  );

  const handleCheck = (): void => {
    finalizeRound(false);
  };

  useEffect(() => {
    if (!isRushMode) {
      setTimeLimit(null);
      setTimeLeft(null);
      setTimeExpired(false);
      return;
    }
    const nextLimit = getRushTimeLimit(roundTargets.length);
    setTimeLimit(nextLimit);
    setTimeLeft(nextLimit);
    setTimeExpired(false);
  }, [isRushMode, roundIndex, roundTargets.length]);

  useEffect(() => {
    if (!isRushMode || timeLeft === null || checked || done) return;
    if (timeLeft <= 0) {
      setTimeExpired(true);
      finalizeRound(true);
      return;
    }
    const timerId = window.setTimeout(() => {
      setTimeLeft((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [isRushMode, timeLeft, checked, done, finalizeRound]);

  const goToNextRound = (): void => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      if (TOTAL_TARGETS > 0) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(
          progress,
          'logical_analogies',
          score,
          TOTAL_TARGETS
        );
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'logical',
          score,
          totalQuestions: TOTAL_TARGETS,
          correctAnswers: score,
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
    const nextRound = LOGICAL_ANALOGIES_RELATION_ROUNDS[nextIndex] ?? FIRST_ROUND;
    setRoundIndex(nextIndex);
    setRoundState(buildRoundState(nextRound));
    setSelectedTokenId(null);
    setHoveredRelationId(null);
    setChecked(false);
    setRoundCorrect(0);
    setTimeExpired(false);
  };

  const restart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState(FIRST_ROUND));
    setSelectedTokenId(null);
    setHoveredRelationId(null);
    setChecked(false);
    setRoundCorrect(0);
    setScore(0);
    setDone(false);
    setTimeExpired(false);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  const handleModeToggle = (next: boolean): void => {
    if (next === isRushMode) return;
    setIsRushMode(next);
    restart();
  };

  const handleAssignToken = (targetId: string): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const { updated: nextPool, token } = removeTokenById(prev.pool, selectedTokenId);
      if (!token) return prev;
      const existing = prev.slots[targetId]?.[0] ?? null;
      const updatedPool = existing ? [...nextPool, existing] : nextPool;
      return {
        pool: updatedPool,
        slots: {
          ...prev.slots,
          [targetId]: [token],
        },
      };
    });
    setSelectedTokenId(null);
    setHoveredRelationId(null);
  };

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;

    if (sourceId === destinationId && source.index === destination.index) return;
    if (sourceId !== 'pool' && !isSlotId(sourceId)) return;
    if (destinationId !== 'pool' && !isSlotId(destinationId)) return;

    setRoundState((prev) => {
      const sourceList =
        sourceId === 'pool'
          ? [...prev.pool]
          : [...(prev.slots[getTargetIdFromSlot(sourceId)] ?? [])];
      const [moved] = sourceList.splice(source.index, 1);
      if (!moved) return prev;

      const nextSlots = { ...prev.slots };
      let nextPool = prev.pool;

      if (sourceId === 'pool') {
        nextPool = sourceList;
      } else {
        nextSlots[getTargetIdFromSlot(sourceId)] = sourceList;
      }

      if (destinationId === 'pool') {
        const updatedPool = [...nextPool];
        updatedPool.splice(destination.index, 0, moved);
        return {
          pool: updatedPool,
          slots: nextSlots,
        };
      }

      const targetId = getTargetIdFromSlot(destinationId);
      const existing = nextSlots[targetId]?.[0] ?? null;
      if (existing) {
        nextPool = [...nextPool, existing];
      }

      nextSlots[targetId] = [moved];
      return {
        pool: nextPool,
        slots: nextSlots,
      };
    });
    setSelectedTokenId(null);
    setHoveredRelationId(null);
  };

  if (done) {
    const percent = TOTAL_TARGETS ? Math.round((score / TOTAL_TARGETS) * 100) : 0;
    return (
      <KangurPracticeGameSummary dataTestId='logical-analogies-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='logical-analogies-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='logical-analogies-summary-title'
          title={`Wynik: ${score}/${TOTAL_TARGETS}`}
        />
        <KangurPracticeGameSummaryXP accent='rose' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='logical-analogies-summary-breakdown'
          itemDataTestIdPrefix='logical-analogies-summary-breakdown'
        />
        {isRushMode ? (
          <KangurStatusChip accent='amber' className='mx-auto'>
            Bridge Rush ⏱
          </KangurStatusChip>
        ) : null}
        <KangurPracticeGameSummaryProgress
          accent='rose'
          dataTestId='logical-analogies-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Idealnie! Rozpoznajesz relacje w każdym kontekście.'
            : percent >= 70
              ? 'Świetnie! Masz oko do relacji.'
              : 'Dobra próba! Spróbuj jeszcze raz i zobacz różnice.'}
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

  return (
    <DragDropContext
      onDragEnd={onDragEnd}
      onDragStart={() => {
        setSelectedTokenId(null);
        setHoveredRelationId(null);
      }}
    >
      <KangurPracticeGameStage className='mx-auto max-w-2xl'>
        <KangurPracticeGameProgress
          accent='rose'
          currentRound={roundIndex}
          dataTestId='logical-analogies-progress-bar'
          totalRounds={TOTAL_ROUNDS}
        />

        <div className='flex w-full flex-col gap-1'>
          <div className='flex w-full flex-wrap items-center justify-between gap-2'>
            <div className={KANGUR_WRAP_ROW_CLASSNAME}>
              <KangurButton
                size='sm'
                type='button'
                variant={isRushMode ? 'surface' : 'primary'}
                onClick={() => handleModeToggle(false)}
                aria-pressed={!isRushMode}
              >
                Tryb spokojny
              </KangurButton>
              <KangurButton
                size='sm'
                type='button'
                variant={isRushMode ? 'primary' : 'surface'}
                onClick={() => handleModeToggle(true)}
                aria-pressed={isRushMode}
              >
                Bridge Rush
              </KangurButton>
            </div>
            {isRushMode ? (
              <div
                aria-atomic='true'
                aria-live={timeLeft !== null && timeLeft <= 10 ? 'polite' : 'off'}
                id={timerId}
              >
                <KangurStatusChip
                  accent={timeLeft !== null && timeLeft <= 10 ? 'rose' : 'amber'}
                  size='sm'
                >
                  ⏱ {timeLeft ?? timeLimit ?? 0}s
                </KangurStatusChip>
              </div>
            ) : null}
          </div>
          <p className='text-[11px] [color:var(--kangur-page-muted-text)]'>
            {isRushMode
              ? 'Tryb Bridge Rush: zdąż przed końcem czasu. Zmiana trybu restartuje grę.'
              : 'Zmiana trybu restartuje grę.'}
          </p>
        </div>

        <KangurInfoCard accent='rose' className='w-full' padding='sm' tone='accent'>
          <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} justify-between`}>
            <div>
              <p className='text-sm font-bold'>Most relacji</p>
              <p className='text-xs [color:var(--kangur-page-muted-text)]'>{round.prompt}</p>
            </div>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurStatusChip accent='rose' size='sm'>
                Runda {roundIndex + 1}/{TOTAL_ROUNDS}
              </KangurStatusChip>
              {timeExpired ? (
                <div aria-live='polite' role='status'>
                  <KangurStatusChip accent='rose' size='sm'>
                    Czas minął
                  </KangurStatusChip>
                </div>
              ) : null}
            </div>
          </div>
          <p
            className='mt-2 text-[11px] [color:var(--kangur-page-muted-text)]'
            id={instructionsId}
          >
            Przeciągnij relację na kartę pary albo kliknij relację i potem kliknij parę. Ikony
            relacji podpowiadają typy zależności.
          </p>
          <div className='mt-3 flex flex-col gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600'>
              Ikony relacji
            </p>
            <div className={KANGUR_WRAP_ROW_CLASSNAME}>
              {relationTokens.map((token) => {
                const isActive = activeRelationId === token.id;
                return (
                  <button
                    key={token.id}
                    type='button'
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 text-base transition',
                      isActive
                        ? 'ring-2 ring-rose-400/80 shadow-[0_0_18px_rgba(251,113,133,0.35)]'
                        : 'border-rose-200/70',
                      KANGUR_ACCENT_STYLES.rose.hoverCard
                    )}
                    aria-pressed={activeRelationId === token.id}
                    aria-label={token.label}
                    aria-describedby={`${hintId} ${instructionsId}`}
                    onClick={() =>
                      setHoveredRelationId((current) => (current === token.id ? null : token.id))
                    }
                    onMouseEnter={() => setHoveredRelationId(token.id)}
                    onMouseLeave={() => setHoveredRelationId(null)}
                    onFocus={() => setHoveredRelationId(token.id)}
                    onBlur={() => setHoveredRelationId(null)}
                  >
                    <span aria-hidden>{token.emoji}</span>
                  </button>
                );
              })}
            </div>
            <p
              className='text-[11px] text-rose-600/80'
              id={hintId}
              role='status'
              aria-live='polite'
            >
              {activeRelationHint
                ? `Podpowiedź: ${activeRelationHint.hint}`
                : 'Najedź lub dotknij ikonę, aby zobaczyć podpowiedź.'}
            </p>
          </div>
        </KangurInfoCard>

        <div className='grid w-full kangur-panel-gap lg:grid-cols-[1fr,1.35fr]'>
          <div className='flex flex-col kangur-panel-gap'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-rose-700'>
                Relacje
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
                  aria-describedby={`${instructionsId} ${hintId}`}
                  aria-label='Pula relacji do przeciągania'
                  role='list'
                  className={cn(
                    'flex min-h-[72px] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed px-3 py-3 text-center text-xs',
                    roundState.pool.length === 0
                      ? 'text-rose-600/70'
                      : '[color:var(--kangur-page-muted-text)]'
                  )}
                >
                  {roundState.pool.length === 0 ? (
                    <span>{EMPTY_POOL_MESSAGE}</span>
                  ) : null}
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
                            className={buildTokenClassName({
                              isSelected: selectedTokenId === token.id,
                              isDragging: snapshot.isDragging,
                              isCompact: false,
                              isDisabled: checked,
                            })}
                            disabled={checked}
                            aria-pressed={selectedTokenId === token.id}
                            aria-label={`Relacja: ${token.label}`}
                            aria-describedby={`${instructionsId} ${hintId}`}
                            role='listitem'
                            onMouseEnter={() => setHoveredRelationId(token.id)}
                            onMouseLeave={() => setHoveredRelationId(null)}
                            onFocus={() => setHoveredRelationId(token.id)}
                            onBlur={() => setHoveredRelationId(null)}
                            onClick={(event) => {
                              event.preventDefault();
                              if (snapshot.isDragging) return;
                              setSelectedTokenId((current) =>
                                current === token.id ? null : token.id
                              );
                            }}
                          >
                            <span className='text-lg'>{token.emoji}</span>
                            <span>{token.label}</span>
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
                <KangurStatusChip accent={roundCorrect === roundTargets.length ? 'emerald' : 'rose'}>
                  {roundCorrect}/{roundTargets.length} trafień
                </KangurStatusChip>
              ) : null}
            </div>
          </div>

          <div className='flex flex-col kangur-panel-gap'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-rose-700'>
                Pary do dopasowania
              </p>
              <span className='text-xs [color:var(--kangur-page-muted-text)]'>
                {round.title}
              </span>
            </div>
            <div className='grid kangur-panel-gap'>
              {roundTargets.map((target) => {
                const assigned = roundState.slots[target.id]?.[0] ?? null;
                const isCorrect = assigned?.id === target.relationId;
                const relationLabel = LOGICAL_ANALOGY_RELATION_TOKENS[target.relationId]?.label;
                const targetLabelId = `${idPrefix}-${target.id}-label`;
                const slotHintId = `${idPrefix}-${target.id}-slot-hint`;
                return (
                  <Droppable key={target.id} droppableId={slotIdForTarget(target.id)}>
                    {(provided, snapshot) => {
                      const showFeedback = checked && assigned;
                      const accent = showFeedback
                        ? isCorrect
                          ? 'emerald'
                          : 'rose'
                        : snapshot.isDraggingOver
                          ? 'amber'
                          : 'slate';
                      const emphasis = showFeedback || snapshot.isDraggingOver ? 'accent' : 'neutral';
                      return (
                        <KangurAnswerChoiceCard
                          accent={accent}
                          emphasis={emphasis}
                          buttonClassName={cn(
                            'flex w-full flex-col gap-2 text-left min-h-[110px]',
                            showFeedback && isCorrect && KANGUR_ACCENT_STYLES.emerald.activeText,
                            showFeedback && !isCorrect && KANGUR_ACCENT_STYLES.rose.activeText
                          )}
                          interactive={!checked}
                          disabled={checked}
                          aria-disabled={checked}
                          aria-labelledby={targetLabelId}
                          aria-describedby={`${slotHintId} ${instructionsId}`}
                          onClick={() => handleAssignToken(target.id)}
                          type='button'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <p className='text-sm font-bold' id={targetLabelId}>
                              {target.pair}
                            </p>
                            <span className='text-[11px] uppercase tracking-[0.18em] text-rose-600/80'>
                              relacja
                            </span>
                          </div>
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            aria-describedby={slotHintId}
                            className={cn(
                              'min-h-[44px] rounded-full border border-dashed px-3 py-2 text-xs',
                              snapshot.isDraggingOver && 'border-amber-400 bg-amber-50'
                            )}
                          >
                            <span className='sr-only' id={slotHintId}>
                              Użyj tego miejsca, aby dopasować relację do pary.
                            </span>
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
                                    <div
                                      ref={tokenProvided.innerRef}
                                      {...tokenProvided.draggableProps}
                                      {...tokenProvided.dragHandleProps}
                                      className={buildTokenClassName({
                                        isSelected: false,
                                        isDragging: tokenSnapshot.isDragging,
                                        isCompact: true,
                                        isDisabled: checked,
                                      })}
                                      onMouseEnter={() => setHoveredRelationId(assigned.id)}
                                      onMouseLeave={() => setHoveredRelationId(null)}
                                    >
                                      <span>{assigned.emoji}</span>
                                      <span>{assigned.label}</span>
                                    </div>
                                  );

                                  if (tokenSnapshot.isDragging && dragPortal) {
                                    return createPortal(content, dragPortal);
                                  }

                                  return content;
                                }}
                              </Draggable>
                            ) : (
                              <div className='flex h-full items-center justify-center text-[11px] font-semibold text-rose-600/70'>
                                Upuść relację
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                          {checked && !isCorrect ? (
                            <p className='text-[11px] text-rose-600'>
                              Poprawnie: {relationLabel}
                            </p>
                          ) : null}
                        </KangurAnswerChoiceCard>
                      );
                    }}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>

        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <p className='text-xs [color:var(--kangur-page-muted-text)]'>
            Każda relacja pasuje tylko do jednej pary.
          </p>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
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
        </div>
      </KangurPracticeGameStage>
    </DragDropContext>
  );
}
