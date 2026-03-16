'use client';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
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
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type { DropResult } from '@hello-pangea/dnd';

type DivisionGroupsGameProps = {
  finishLabelVariant?: 'lesson' | 'topics';
  onFinish: () => void;
};

type TokenItem = {
  id: string;
  emoji: string;
  style: string;
};

type Round = {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  tokens: TokenItem[];
};

type GroupZoneId = `group-${number}`;
type ZoneId = 'pool' | 'remainder' | GroupZoneId;

const TOTAL_ROUNDS = 6;
const dragPortal = typeof document === 'undefined' ? null : document.body;

const TOKEN_STYLES = [
  'bg-gradient-to-br from-sky-200 via-cyan-300 to-blue-300 shadow-[0_10px_26px_-12px_rgba(14,165,233,0.55)]',
  'bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-300 shadow-[0_10px_26px_-12px_rgba(20,184,166,0.5)]',
  'bg-gradient-to-br from-indigo-200 via-blue-300 to-sky-300 shadow-[0_10px_26px_-12px_rgba(59,130,246,0.45)]',
  'bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 shadow-[0_10px_26px_-12px_rgba(251,146,60,0.5)]',
  'bg-gradient-to-br from-violet-200 via-fuchsia-300 to-pink-300 shadow-[0_10px_26px_-12px_rgba(217,70,239,0.45)]',
];
const DEFAULT_TOKEN_STYLE = TOKEN_STYLES[0] ?? 'bg-slate-200';

const TOKEN_EMOJIS = ['🫧', '🐟', '🐠', '⭐', '🔷'];

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createTokens = (count: number, seed: number): TokenItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `division-token-${seed}-${index}`,
    emoji: TOKEN_EMOJIS[index % TOKEN_EMOJIS.length] ?? '⭐',
    style: TOKEN_STYLES[index % TOKEN_STYLES.length] ?? DEFAULT_TOKEN_STYLE,
  }));

const buildGroups = (count: number): TokenItem[][] =>
  Array.from({ length: count }, () => []);

const groupId = (index: number): GroupZoneId => `group-${index}`;

const isGroupZoneId = (value: string): value is GroupZoneId =>
  value.startsWith('group-') && Number.isFinite(Number(value.slice(6)));

const isZoneId = (value: string): value is ZoneId =>
  value === 'pool' || value === 'remainder' || isGroupZoneId(value);

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

const createRound = (roundIndex: number): Round => {
  const difficulty = roundIndex < 2 ? 'easy' : roundIndex < 4 ? 'medium' : 'hard';
  const divisorMin = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 2 : 3;
  const divisorMax = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const quotientMin = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 3;
  const quotientMax = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 5;
  const remainderAllowed = roundIndex >= 3;

  let divisor = randomBetween(divisorMin, divisorMax);
  let quotient = randomBetween(quotientMin, quotientMax);
  let remainder = remainderAllowed ? randomBetween(0, divisor - 1) : 0;
  if (remainderAllowed && roundIndex % 2 === 1) {
    remainder = Math.max(1, remainder);
  }

  let dividend = divisor * quotient + remainder;
  while (dividend > 18) {
    divisor = randomBetween(divisorMin, divisorMax);
    quotient = randomBetween(quotientMin, quotientMax);
    remainder = remainderAllowed ? randomBetween(0, divisor - 1) : 0;
    if (remainderAllowed && roundIndex % 2 === 1) {
      remainder = Math.max(1, remainder);
    }
    dividend = divisor * quotient + remainder;
  }

  return {
    dividend,
    divisor,
    quotient,
    remainder,
    tokens: createTokens(dividend, roundIndex),
  };
};

function DraggableToken({
  token,
  index,
  isDragDisabled,
  isSelected,
  onClick,
  onSelect,
}: {
  token: TokenItem;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  onClick: () => void;
  onSelect: () => void;
}): React.ReactElement | React.ReactPortal {
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(draggableProvided, snapshot) => {
        const content = (
          <div
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-base transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white sm:h-12 sm:w-12 sm:text-lg lg:h-14 lg:w-14',
              token.style,
              isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white',
              snapshot.isDragging ? 'scale-110' : null,
              isDragDisabled ? 'cursor-default opacity-80' : 'cursor-grab active:cursor-grabbing'
            )}
            onClick={() => {
              if (!isDragDisabled) {
                onClick();
              }
            }}
            role='button'
            aria-label='Przenieś element'
            aria-pressed={isSelected}
            aria-disabled={isDragDisabled}
            tabIndex={isDragDisabled ? -1 : 0}
            onKeyDown={(event) => {
              if (isDragDisabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }}
          >
            <span aria-hidden='true'>{token.emoji}</span>
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

export default function DivisionGroupsGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: DivisionGroupsGameProps): React.JSX.Element {
  const finishLabel = finishLabelVariant === 'topics' ? 'Wróć do tematów' : 'Wróć do lekcji';
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [round, setRound] = useState<Round>(() => createRound(0));
  const [pool, setPool] = useState<TokenItem[]>(() => round.tokens);
  const [groups, setGroups] = useState<TokenItem[][]>(() => buildGroups(round.divisor));
  const [remainder, setRemainder] = useState<TokenItem[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const sessionStartedAtRef = useRef(Date.now());
  const isLocked = status === 'correct';

  const resetRound = (nextRound: Round): void => {
    setRound(nextRound);
    setPool(nextRound.tokens);
    setGroups(buildGroups(nextRound.divisor));
    setRemainder([]);
    setStatus('idle');
    setSelectedTokenId(null);
  };

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleCorrectRound = (): void => {
    const nextScore = score + 1;
    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, 'division', nextScore, TOTAL_ROUNDS);
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'division',
          score: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
        setScore(nextScore);
        setDone(true);
        return;
      }

      const nextIndex = roundIndex + 1;
      setScore(nextScore);
      setRoundIndex(nextIndex);
      resetRound(createRound(nextIndex));
    });
  };

  const handleDragEnd = (result: DropResult): void => {
    if (isLocked) return;
    if (!result.destination) return;
    setSelectedTokenId(null);

    const sourceId = result.source.droppableId;
    const destinationId = result.destination.droppableId;
    const destinationIndex = result.destination.index;

    if (!isZoneId(sourceId) || !isZoneId(destinationId)) {
      return;
    }
    if (
      sourceId === destinationId &&
      result.source.index === destinationIndex
    ) {
      return;
    }

    setStatus('idle');

    if (sourceId === destinationId) {
      if (sourceId === 'pool') {
        setPool(reorderWithinList(pool, result.source.index, destinationIndex));
        return;
      }
      if (sourceId === 'remainder') {
        setRemainder(reorderWithinList(remainder, result.source.index, destinationIndex));
        return;
      }
      if (isGroupZoneId(sourceId)) {
        const groupIndex = Number(sourceId.slice(6));
        if (!Number.isFinite(groupIndex) || groupIndex >= groups.length) {
          return;
        }
        setGroups((current) => {
          const next = [...current];
          next[groupIndex] = reorderWithinList(
            current[groupIndex] ?? [],
            result.source.index,
            destinationIndex
          );
          return next;
        });
      }
      return;
    }

    if (isGroupZoneId(sourceId) && isGroupZoneId(destinationId)) {
      const sourceIndex = Number(sourceId.slice(6));
      const destIndex = Number(destinationId.slice(6));
      if (
        !Number.isFinite(sourceIndex) ||
        !Number.isFinite(destIndex) ||
        sourceIndex >= groups.length ||
        destIndex >= groups.length
      ) {
        return;
      }
      const moved = moveBetweenLists(
        groups[sourceIndex] ?? [],
        groups[destIndex] ?? [],
        result.source.index,
        destinationIndex
      );
      setGroups((current) => {
        const next = [...current];
        next[sourceIndex] = moved.source;
        next[destIndex] = moved.destination;
        return next;
      });
      return;
    }

    if (isGroupZoneId(sourceId)) {
      const sourceIndex = Number(sourceId.slice(6));
      if (!Number.isFinite(sourceIndex) || sourceIndex >= groups.length) {
        return;
      }
      const destinationList = destinationId === 'pool' ? pool : remainder;
      const moved = moveBetweenLists(
        groups[sourceIndex] ?? [],
        destinationList,
        result.source.index,
        destinationIndex
      );
      setGroups((current) => {
        const next = [...current];
        next[sourceIndex] = moved.source;
        return next;
      });
      if (destinationId === 'pool') {
        setPool(moved.destination);
      } else {
        setRemainder(moved.destination);
      }
      return;
    }

    if (isGroupZoneId(destinationId)) {
      const destIndex = Number(destinationId.slice(6));
      if (!Number.isFinite(destIndex) || destIndex >= groups.length) {
        return;
      }
      const sourceList = sourceId === 'pool' ? pool : remainder;
      const moved = moveBetweenLists(
        sourceList,
        groups[destIndex] ?? [],
        result.source.index,
        destinationIndex
      );
      if (sourceId === 'pool') {
        setPool(moved.source);
      } else {
        setRemainder(moved.source);
      }
      setGroups((current) => {
        const next = [...current];
        next[destIndex] = moved.destination;
        return next;
      });
      return;
    }

    if (sourceId === 'pool') {
      const moved = moveBetweenLists(pool, remainder, result.source.index, destinationIndex);
      setPool(moved.source);
      setRemainder(moved.destination);
    } else {
      const moved = moveBetweenLists(remainder, pool, result.source.index, destinationIndex);
      setRemainder(moved.source);
      setPool(moved.destination);
    }
  };

  const moveFromPool = (token: TokenItem): void => {
    if (isLocked) return;
    setStatus('idle');
    setSelectedTokenId(null);

    const targetIndex = groups.findIndex((group) => group.length < round.quotient);
    setPool((current) => current.filter((item) => item.id !== token.id));
    if (targetIndex === -1) {
      setRemainder((current) => [...current, token]);
      return;
    }
    setGroups((current) => {
      const next = [...current];
      next[targetIndex] = [...(next[targetIndex] ?? []), token];
      return next;
    });
  };

  const moveFromGroup = (token: TokenItem, groupIndex: number): void => {
    if (isLocked) return;
    setStatus('idle');
    setSelectedTokenId(null);
    setGroups((current) => {
      const next = [...current];
      next[groupIndex] = (next[groupIndex] ?? []).filter((item) => item.id !== token.id);
      return next;
    });
    setPool((current) => [...current, token]);
  };

  const moveFromRemainder = (token: TokenItem): void => {
    if (isLocked) return;
    setStatus('idle');
    setSelectedTokenId(null);
    setRemainder((current) => current.filter((item) => item.id !== token.id));
    setPool((current) => [...current, token]);
  };

  const selectedToken = selectedTokenId
    ? pool.find((item) => item.id === selectedTokenId) ??
      remainder.find((item) => item.id === selectedTokenId) ??
      groups.flat().find((item) => item.id === selectedTokenId) ??
      null
    : null;

  const moveSelectedToken = (destination: ZoneId): void => {
    if (isLocked || !selectedTokenId) return;
    setStatus('idle');

    let token: TokenItem | null = null;
    let nextPool = pool;
    let nextRemainder = remainder;
    const nextGroups = groups.map((group) => {
      const index = group.findIndex((item) => item.id === selectedTokenId);
      if (index === -1) return group;
      token = group[index] ?? null;
      const updated = [...group];
      updated.splice(index, 1);
      return updated;
    });

    if (!token) {
      const poolIndex = pool.findIndex((item) => item.id === selectedTokenId);
      if (poolIndex !== -1) {
        token = pool[poolIndex] ?? null;
        nextPool = pool.filter((item) => item.id !== selectedTokenId);
      }
    }

    if (!token) {
      const remainderIndex = remainder.findIndex((item) => item.id === selectedTokenId);
      if (remainderIndex !== -1) {
        token = remainder[remainderIndex] ?? null;
        nextRemainder = remainder.filter((item) => item.id !== selectedTokenId);
      }
    }

    if (!token) {
      setSelectedTokenId(null);
      return;
    }
    const resolvedToken = token;

    if (destination === 'pool') {
      setPool([...nextPool, resolvedToken]);
      setRemainder(nextRemainder);
      setGroups(nextGroups);
    } else if (destination === 'remainder') {
      setPool(nextPool);
      setRemainder([...nextRemainder, resolvedToken]);
      setGroups(nextGroups);
    } else {
      const groupIndex = Number(destination.slice(6));
      if (!Number.isFinite(groupIndex) || groupIndex >= nextGroups.length) {
        return;
      }
      setPool(nextPool);
      setRemainder(nextRemainder);
      setGroups(
        nextGroups.map((group, index) =>
          index === groupIndex ? [...group, resolvedToken] : group
        )
      );
    }

    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (isLocked) return;
    const groupsCorrect = groups.every((group) => group.length === round.quotient);
    const remainderCorrect = remainder.length === round.remainder;
    const allAssigned = pool.length === 0;

    if (groupsCorrect && remainderCorrect && allAssigned) {
      setStatus('correct');
      handleCorrectRound();
    } else {
      setStatus('wrong');
    }
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='division-groups-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='division-groups-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='teal'
          title={
            <KangurHeadline data-testid='division-groups-summary-title'>
              Wynik: {score}/{TOTAL_ROUNDS}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='division-groups-summary-breakdown'
          itemDataTestIdPrefix='division-groups-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='teal' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Idealnie! Dzielenie masz opanowane.'
            : percent >= 60
              ? 'Świetna robota!'
              : 'Ćwicz dalej!'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          onRestart={() => {
            setRoundIndex(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            resetRound(createRound(0));
            sessionStartedAtRef.current = Date.now();
          }}
        />
      </KangurPracticeGameSummary>
    );
  }

  const wrongHint = pool.length > 0
    ? 'Rozdziel wszystkie elementy.'
    : remainder.length !== round.remainder
      ? 'Sprawdź, ile zostaje w reszcie.'
      : 'Upewnij się, że każda grupa ma tyle samo.';

  const feedbackMessage =
    status === 'correct'
      ? 'Brawo! Podział jest równy.'
      : status === 'wrong'
        ? wrongHint
        : 'Przeciągnij lub kliknij elementy, aby podzielić je na grupy.';

  return (
    <KangurPracticeGameStage className='w-full max-w-none'>
      <KangurPracticeGameProgress
        accent='teal'
        currentRound={roundIndex}
        dataTestId='division-groups-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className='w-full'
        data-testid='division-groups-round-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <div className='relative overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#ecfeff_0%,#dbeafe_50%,#f0fdf4_100%)] p-5 sm:p-6 lg:p-8'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.16),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(45,212,191,0.16),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.12),transparent_40%)]' />
          <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
            <div className='flex flex-col items-center kangur-panel-gap text-center'>
              <KangurEquationDisplay accent='teal' size='lg'>
                {round.dividend} ÷ {round.divisor} ={' '}
                <span className='[color:var(--kangur-page-muted-text)]'>?</span>
              </KangurEquationDisplay>
              <p className='text-xs font-semibold uppercase tracking-wide text-teal-600'>
                Podziel {round.dividend} elementów na {round.divisor} równe grupy
              </p>
              <div className='flex flex-wrap justify-center gap-2'>
                <KangurInfoCard
                  accent='sky'
                  className='rounded-[18px] px-3 py-2 text-xs font-semibold'
                  padding='sm'
                  tone='accent'
                >
                  Grupy: {round.divisor}
                </KangurInfoCard>
                <KangurInfoCard
                  accent='emerald'
                  className='rounded-[18px] px-3 py-2 text-xs font-semibold'
                  padding='sm'
                  tone='accent'
                >
                  W puli: {pool.length}
                </KangurInfoCard>
                <KangurInfoCard
                  accent='amber'
                  className='rounded-[18px] px-3 py-2 text-xs font-semibold'
                  padding='sm'
                  tone='accent'
                >
                  Reszta: {remainder.length}
                </KangurInfoCard>
              </div>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={roundIndex}
                  {...roundMotionProps}
                  className={cn('grid', KANGUR_PANEL_GAP_CLASSNAME)}
                >
                  <KangurInfoCard
                    accent='sky'
                    className='relative overflow-hidden rounded-[26px]'
                    padding='md'
                    tone='accent'
                  >
                    <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700'>
                      Pula startowa
                    </p>
                    <Droppable droppableId='pool' direction='horizontal'>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'mt-3 flex min-h-[96px] flex-wrap items-center justify-center kangur-panel-gap rounded-[20px] border-2 border-dashed px-3 py-4 transition sm:min-h-[112px]',
                            snapshot.isDraggingOver
                              ? 'border-amber-300 bg-amber-50/70'
                              : 'border-white/60 bg-white/70'
                          )}
                        >
                          {pool.map((token, index) => (
                            <DraggableToken
                              key={token.id}
                              token={token}
                              index={index}
                              isDragDisabled={isLocked}
                              isSelected={selectedTokenId === token.id}
                              onClick={() => moveFromPool(token)}
                              onSelect={() =>
                                setSelectedTokenId((current) =>
                                  current === token.id ? null : token.id
                                )
                              }
                            />
                          ))}
                          {provided.placeholder}
                          {pool.length === 0 ? (
                            <p className='text-xs font-semibold text-slate-400'>
                              Wszystko podzielone
                            </p>
                          ) : null}
                        </div>
                      )}
                    </Droppable>
                  </KangurInfoCard>

                  <div className={cn('grid kangur-panel-gap sm:grid-cols-2', round.divisor > 2 ? 'lg:grid-cols-3' : null)}>
                    {groups.map((group, groupIndex) => (
                      <KangurInfoCard
                        key={groupIndex}
                        accent='teal'
                        className='relative overflow-hidden rounded-[26px]'
                        padding='md'
                        tone='accent'
                      >
                        <div className='flex items-center justify-between'>
                          <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700'>
                            Grupa {groupIndex + 1}
                          </p>
                          <span className='text-xs font-semibold text-teal-600'>
                            {group.length}
                          </span>
                        </div>
                        <Droppable droppableId={groupId(groupIndex)} direction='horizontal'>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'mt-3 flex min-h-[88px] flex-wrap items-center justify-center kangur-panel-gap rounded-[20px] border-2 border-dashed px-3 py-4 transition sm:min-h-[104px]',
                                snapshot.isDraggingOver
                                  ? 'border-teal-300 bg-teal-50/80'
                                  : 'border-white/60 bg-white/70'
                              )}
                            >
                              {group.map((token, index) => (
                                <DraggableToken
                                  key={token.id}
                                  token={token}
                                  index={index}
                                  isDragDisabled={isLocked}
                                  isSelected={selectedTokenId === token.id}
                                  onClick={() => moveFromGroup(token, groupIndex)}
                                  onSelect={() =>
                                    setSelectedTokenId((current) =>
                                      current === token.id ? null : token.id
                                    )
                                  }
                                />
                              ))}
                              {provided.placeholder}
                              {group.length === 0 ? (
                                <p className='text-xs font-semibold text-slate-400'>
                                  Pusta grupa
                                </p>
                              ) : null}
                            </div>
                          )}
                        </Droppable>
                      </KangurInfoCard>
                    ))}
                  </div>

                  <KangurInfoCard
                    accent='amber'
                    className='relative overflow-hidden rounded-[26px]'
                    padding='md'
                    tone='accent'
                  >
                    <div className='flex items-center justify-between'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700'>
                        Reszta (jeśli zostaje)
                      </p>
                      <span className='text-xs font-semibold text-amber-600'>
                        {remainder.length}
                      </span>
                    </div>
                    <Droppable droppableId='remainder' direction='horizontal'>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'mt-3 flex min-h-[80px] flex-wrap items-center justify-center kangur-panel-gap rounded-[20px] border-2 border-dashed px-3 py-4 transition sm:min-h-[96px]',
                            snapshot.isDraggingOver
                              ? 'border-amber-300 bg-amber-50/80'
                              : 'border-white/60 bg-white/70'
                          )}
                        >
                          {remainder.map((token, index) => (
                            <DraggableToken
                              key={token.id}
                              token={token}
                              index={index}
                              isDragDisabled={isLocked}
                              isSelected={selectedTokenId === token.id}
                              onClick={() => moveFromRemainder(token)}
                              onSelect={() =>
                                setSelectedTokenId((current) =>
                                  current === token.id ? null : token.id
                                )
                              }
                            />
                          ))}
                          {provided.placeholder}
                          {remainder.length === 0 ? (
                            <p className='text-xs font-semibold text-slate-400'>
                              Tutaj odkładaj resztę
                            </p>
                          ) : null}
                        </div>
                      )}
                    </Droppable>
                  </KangurInfoCard>
                  <KangurInfoCard
                    accent='slate'
                    className='rounded-[22px]'
                    padding='sm'
                    tone='neutral'
                  >
                    <div className='flex flex-col gap-2'>
                      <p
                        className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                        role='status'
                        aria-live='polite'
                        aria-atomic='true'
                      >
                        {selectedToken
                          ? `Wybrany element: ${selectedToken.emoji}`
                          : 'Wybierz element, aby przenieść go klawiaturą.'}
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        <KangurButton
                          size='sm'
                          type='button'
                          variant='surface'
                          onClick={() => moveSelectedToken('pool')}
                          disabled={!selectedToken || isLocked}
                        >
                          Do puli
                        </KangurButton>
                        {groups.map((_, index) => (
                          <KangurButton
                            key={`division-group-move-${index}`}
                            size='sm'
                            type='button'
                            variant='surface'
                            onClick={() => moveSelectedToken(groupId(index))}
                            disabled={!selectedToken || isLocked}
                          >
                            Do grupy {index + 1}
                          </KangurButton>
                        ))}
                        <KangurButton
                          size='sm'
                          type='button'
                          variant='surface'
                          onClick={() => moveSelectedToken('remainder')}
                          disabled={!selectedToken || isLocked}
                        >
                          Do reszty
                        </KangurButton>
                      </div>
                    </div>
                  </KangurInfoCard>
                  <div className='flex flex-col items-center kangur-panel-gap sm:flex-row sm:justify-between'>
                    <KangurButton
                      className='w-full sm:w-auto sm:min-w-[180px]'
                      onClick={handleCheck}
                      size='md'
                      type='button'
                      variant='surface'
                      disabled={isLocked}
                    >
                      Sprawdź
                    </KangurButton>
                    <p
                      className={cn(
                        'text-sm font-semibold sm:text-base sm:text-left sm:max-w-md',
                        status === 'correct'
                          ? 'text-emerald-600'
                          : status === 'wrong'
                            ? 'text-rose-500'
                            : 'text-slate-500'
                      )}
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'
                    >
                      {feedbackMessage}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </DragDropContext>
          </div>
        </div>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
