import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

import type { DropResult } from '@hello-pangea/dnd';

type SubtractingGardenGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

type TokenItem = {
  id: string;
  emoji: string;
  style: string;
};

type Round = {
  a: number;
  b: number;
  tokens: TokenItem[];
};

type ZoneId = 'basket' | 'sky';

const TOTAL_ROUNDS = 6;
const dragPortal = typeof document === 'undefined' ? null : document.body;

const TOKEN_STYLES = [
  'bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 shadow-[0_10px_26px_-12px_rgba(251,146,60,0.7)]',
  'bg-gradient-to-br from-sky-200 via-cyan-300 to-emerald-300 shadow-[0_10px_26px_-12px_rgba(14,165,233,0.55)]',
  'bg-gradient-to-br from-violet-200 via-purple-300 to-indigo-300 shadow-[0_10px_26px_-12px_rgba(124,58,237,0.55)]',
  'bg-gradient-to-br from-rose-200 via-pink-300 to-fuchsia-300 shadow-[0_10px_26px_-12px_rgba(244,63,94,0.5)]',
  'bg-gradient-to-br from-emerald-200 via-teal-300 to-sky-300 shadow-[0_10px_26px_-12px_rgba(16,185,129,0.5)]',
];
const DEFAULT_TOKEN_STYLE = TOKEN_STYLES[0] ?? 'bg-slate-200';

const TOKEN_EMOJIS = ['✨', '⭐', '🌟', '💫', '🟡'];

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createTokens = (count: number, seed: number): TokenItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `token-${seed}-${index}`,
    emoji: TOKEN_EMOJIS[index % TOKEN_EMOJIS.length] ?? '⭐',
    style: TOKEN_STYLES[index % TOKEN_STYLES.length] ?? DEFAULT_TOKEN_STYLE,
  }));

const createRound = (roundIndex: number): Round => {
  const difficulty = roundIndex < 2 ? 'easy' : roundIndex < 4 ? 'medium' : 'hard';
  const minA = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
  const maxA = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 13 : 16;
  const a = randomBetween(minA, maxA);
  const maxB = Math.min(
    a - 1,
    difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8
  );
  const b = randomBetween(1, Math.max(2, maxB));
  return {
    a,
    b,
    tokens: createTokens(a, roundIndex),
  };
};

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

const isZoneId = (id: string): id is ZoneId => id === 'basket' || id === 'sky';

function DraggableToken({
  token,
  index,
  isDragDisabled,
  onClick,
}: {
  token: TokenItem;
  index: number;
  isDragDisabled: boolean;
  onClick: () => void;
}): React.ReactElement | React.ReactPortal {
  return (
    <Draggable draggableId={token.id} index={index} isDragDisabled={isDragDisabled}>
      {(draggableProvided, snapshot) => {
        const content = (
          <div
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full text-lg transition-transform duration-150 sm:h-12 sm:w-12 sm:text-xl lg:h-14 lg:w-14',
              token.style,
              snapshot.isDragging ? 'scale-110' : null,
              isDragDisabled ? 'cursor-default opacity-80' : 'cursor-grab active:cursor-grabbing'
            )}
            onClick={() => {
              if (!isDragDisabled) {
                onClick();
              }
            }}
            role='button'
            aria-label='Przenieś obiekt'
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

export default function SubtractingGardenGame({
  finishLabel = 'Wróć do lekcji',
  onFinish,
}: SubtractingGardenGameProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [round, setRound] = useState<Round>(() => createRound(0));
  const [basket, setBasket] = useState<TokenItem[]>(() => round.tokens);
  const [sky, setSky] = useState<TokenItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const sessionStartedAtRef = useRef(Date.now());
  const isLocked = status === 'correct';
  const remaining = basket.length;
  const removed = sky.length;
  const missing = round.b - removed;

  const resetRound = (nextRound: Round): void => {
    setRound(nextRound);
    setBasket(nextRound.tokens);
    setSky([]);
    setStatus('idle');
  };

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleDragEnd = (result: DropResult): void => {
    if (isLocked) return;
    if (!result.destination) return;
    if (!isZoneId(result.source.droppableId) || !isZoneId(result.destination.droppableId)) {
      return;
    }
    if (
      result.source.droppableId === result.destination.droppableId &&
      result.source.index === result.destination.index
    ) {
      return;
    }

    setStatus('idle');

    if (result.source.droppableId === result.destination.droppableId) {
      if (result.source.droppableId === 'basket') {
        setBasket(reorderWithinList(basket, result.source.index, result.destination.index));
      } else {
        setSky(reorderWithinList(sky, result.source.index, result.destination.index));
      }
      return;
    }

    if (result.source.droppableId === 'basket') {
      const moved = moveBetweenLists(basket, sky, result.source.index, result.destination.index);
      setBasket(moved.source);
      setSky(moved.destination);
    } else {
      const moved = moveBetweenLists(sky, basket, result.source.index, result.destination.index);
      setSky(moved.source);
      setBasket(moved.destination);
    }
  };

  const moveToken = (token: TokenItem, from: ZoneId): void => {
    if (isLocked) return;
    setStatus('idle');
    if (from === 'basket') {
      setBasket((current) => current.filter((item) => item.id !== token.id));
      setSky((current) => [...current, token]);
    } else {
      setSky((current) => current.filter((item) => item.id !== token.id));
      setBasket((current) => [...current, token]);
    }
  };

  const handleCorrectRound = (): void => {
    const nextScore = score + 1;
    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, 'subtracting', nextScore, TOTAL_ROUNDS);
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'subtraction',
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

  const handleCheck = (): void => {
    if (isLocked) return;
    if (removed === round.b) {
      setStatus('correct');
      handleCorrectRound();
    } else {
      setStatus('wrong');
    }
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary
        accent='rose'
        breakdown={xpBreakdown}
        breakdownDataTestId='subtracting-garden-summary-breakdown'
        breakdownItemDataTestIdPrefix='subtracting-garden-summary-breakdown'
        dataTestId='subtracting-garden-summary-shell'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        emojiDataTestId='subtracting-garden-summary-emoji'
        finishLabel={finishLabel}
        message={
          percent === 100
            ? 'Idealnie! Odejmowanie masz w jednym palcu.'
            : percent >= 60
              ? 'Swietna robota!'
              : 'Cwicz dalej!'
        }
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
        percent={percent}
        progressAccent='rose'
        title={
          <KangurHeadline data-testid='subtracting-garden-summary-title'>
            Wynik: {score}/{TOTAL_ROUNDS}
          </KangurHeadline>
        }
        xpAccent='indigo'
        xpEarned={xpEarned}
      />
    );
  }

  const feedbackMessage =
    status === 'correct'
      ? `Brawo! Zostało ${round.a - round.b}.`
      : status === 'wrong'
        ? missing > 0
          ? `Za mało. Zabierz jeszcze ${missing}.`
          : `Za dużo. Oddaj ${Math.abs(missing)}.`
        : 'Przeciągnij lub kliknij obiekty, aby odejmować.';

  return (
    <KangurPracticeGameStage className='w-full max-w-none gap-6'>
      <KangurPracticeGameProgress
        accent='rose'
        currentRound={roundIndex}
        dataTestId='subtracting-garden-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className='w-full'
        data-testid='subtracting-garden-round-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <div className='relative overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#fff7ed_0%,#ffe4e6_50%,#eff6ff_100%)] p-5 sm:p-6 lg:p-8'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.16),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(248,113,113,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.12),transparent_40%)]' />
          <div className='relative z-10 flex flex-col gap-5 lg:gap-6'>
            <div className='flex flex-col items-center gap-2 text-center'>
              <KangurEquationDisplay accent='rose' size='lg'>
                {round.a} − {round.b} ={' '}
                <span className='[color:var(--kangur-page-muted-text)]'>?</span>
              </KangurEquationDisplay>
              <p className='text-xs font-semibold uppercase tracking-wide text-rose-500'>
                Zabierz {round.b} swiecacych punktów
              </p>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <AnimatePresence mode='wait'>
                <motion.div key={roundIndex} {...roundMotionProps} className='grid gap-5 lg:gap-6'>
                  <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)_minmax(0,1fr)] lg:items-stretch'>
                    <KangurInfoCard
                      accent='sky'
                      className='relative overflow-hidden rounded-[26px]'
                      padding='md'
                      tone='accent'
                    >
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700'>
                        Koszyk startowy
                      </p>
                      <Droppable droppableId='basket' direction='horizontal'>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'mt-3 flex min-h-[96px] flex-wrap items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-3 py-4 transition sm:min-h-[112px] lg:min-h-[140px]',
                              snapshot.isDraggingOver
                                ? 'border-amber-300 bg-amber-50/70'
                                : 'border-white/60 bg-white/70'
                            )}
                          >
                            {basket.map((token, index) => (
                              <DraggableToken
                                key={token.id}
                                token={token}
                                index={index}
                                isDragDisabled={isLocked}
                                onClick={() => moveToken(token, 'basket')}
                              />
                            ))}
                            {provided.placeholder}
                            {basket.length === 0 ? (
                              <p className='text-xs font-semibold text-slate-400'>
                                Pusty koszyk
                              </p>
                            ) : null}
                          </div>
                        )}
                      </Droppable>
                    </KangurInfoCard>
                    <div className='flex flex-col items-center gap-3 text-center'>
                      <KangurInfoCard
                        accent='violet'
                        className='rounded-[20px] px-4 py-3 text-sm font-semibold'
                        padding='sm'
                        tone='accent'
                      >
                        Cel: zabierz {round.b}
                      </KangurInfoCard>
                      <KangurInfoCard
                        accent='amber'
                        className='rounded-[20px] px-4 py-3 text-sm font-semibold'
                        padding='sm'
                        tone='accent'
                      >
                        Zabrane: {removed}/{round.b}
                      </KangurInfoCard>
                      <KangurInfoCard
                        accent='emerald'
                        className='rounded-[20px] px-4 py-3 text-sm font-semibold'
                        padding='sm'
                        tone='accent'
                      >
                        Zostało: {remaining}
                      </KangurInfoCard>
                    </div>
                    <KangurInfoCard
                      accent='rose'
                      className='relative overflow-hidden rounded-[26px]'
                      padding='md'
                      tone='accent'
                    >
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700'>
                        Chmura zabiera
                      </p>
                      <Droppable droppableId='sky' direction='horizontal'>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              'mt-3 flex min-h-[96px] flex-wrap items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-3 py-4 transition sm:min-h-[112px] lg:min-h-[140px]',
                              snapshot.isDraggingOver
                                ? 'border-rose-300 bg-rose-50/80'
                                : 'border-white/60 bg-white/70'
                            )}
                          >
                            {sky.map((token, index) => (
                              <DraggableToken
                                key={token.id}
                                token={token}
                                index={index}
                                isDragDisabled={isLocked}
                                onClick={() => moveToken(token, 'sky')}
                              />
                            ))}
                            {provided.placeholder}
                            {sky.length === 0 ? (
                              <p className='text-xs font-semibold text-slate-400'>
                                Upusc tutaj
                              </p>
                            ) : null}
                          </div>
                        )}
                      </Droppable>
                    </KangurInfoCard>
                  </div>
                  <div className='flex flex-col items-center gap-3 sm:flex-row sm:justify-between'>
                    <KangurButton
                      className='min-w-[160px] sm:min-w-[180px]'
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
