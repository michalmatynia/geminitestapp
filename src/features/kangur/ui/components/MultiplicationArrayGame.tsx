'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { getKangurMiniGameFinishLabel } from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurGlassPanel,
  KangurMetricCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type MultiplicationArrayGameProps = {
  finishLabel?: string;
  finishLabelVariant?: 'done' | 'topics';
  onFinish: () => void;
};

type MultiplicationArrayProblem = [number, number];

const TOTAL_ROUNDS = 6;

const GROUP_SIZES: MultiplicationArrayProblem[] = [
  [2, 3],
  [3, 4],
  [2, 5],
  [4, 3],
  [3, 6],
  [5, 2],
  [4, 4],
  [3, 5],
  [2, 6],
  [4, 5],
  [3, 3],
  [5, 3],
];

const ROW_COLORS = [
  'bg-purple-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-pink-400',
] as const;

const ROW_GLOW = [
  'bg-purple-500 shadow-purple-300',
  'bg-indigo-500 shadow-indigo-300',
  'bg-violet-500 shadow-violet-300',
  'bg-fuchsia-500 shadow-fuchsia-300',
  'bg-pink-500 shadow-pink-300',
] as const;

type MultiplicationArrayGameContextValue = {
  a: number;
  b: number;
  celebrating: boolean;
  collected: Set<number>;
  isCoarsePointer: boolean;
  onTapGroup: (groupIndex: number) => void;
  translations: ReturnType<typeof useTranslations>;
};

const MultiplicationArrayGameContext =
  React.createContext<MultiplicationArrayGameContextValue | null>(null);

function useMultiplicationArrayGame(): MultiplicationArrayGameContextValue {
  const context = React.useContext(MultiplicationArrayGameContext);
  if (!context) {
    throw new Error('useMultiplicationArrayGame must be used within MultiplicationArrayGame.');
  }
  return context;
}

function pickProblem(excludePrev?: MultiplicationArrayProblem): MultiplicationArrayProblem {
  const candidates = GROUP_SIZES.filter(([a, b]) => a !== excludePrev?.[0] || b !== excludePrev[1]);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick ?? [3, 4];
}

const resolveMultiplicationArraySummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('multiplicationArray.summary.perfect');
  }

  if (percent >= 67) {
    return translations('multiplicationArray.summary.good');
  }

  return translations('multiplicationArray.summary.retry');
};

const clearMultiplicationArrayAdvanceTimeout = (
  advanceTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
): void => {
  if (advanceTimeoutRef.current) {
    clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  }
};

const resetMultiplicationArrayGame = ({
  sessionStartedAtRef,
  setCelebrating,
  setCollected,
  setDone,
  setProblem,
  setRoundIndex,
  setScore,
  setXpBreakdown,
  setXpEarned,
}: {
  sessionStartedAtRef: React.MutableRefObject<number>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setCollected: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setProblem: React.Dispatch<React.SetStateAction<MultiplicationArrayProblem>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setRoundIndex(0);
  setScore(0);
  setDone(false);
  setXpEarned(0);
  setXpBreakdown([]);
  setCelebrating(false);
  setProblem(pickProblem());
  setCollected(new Set());
  sessionStartedAtRef.current = Date.now();
};

const finishMultiplicationArrayGame = ({
  newScore,
  ownerKey,
  sessionStartedAtRef,
  setCelebrating,
  setDone,
  setScore,
  setXpBreakdown,
  setXpEarned,
}: {
  newScore: number;
  ownerKey: string | null;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  const progress = loadProgress({ ownerKey });
  const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL_ROUNDS);
  addXp(reward.xp, reward.progressUpdates, { ownerKey });
  void persistKangurSessionScore({
    operation: 'multiplication',
    score: newScore,
    totalQuestions: TOTAL_ROUNDS,
    correctAnswers: newScore,
    timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
    xpEarned: reward.xp,
  });
  setXpEarned(reward.xp);
  setXpBreakdown(reward.breakdown ?? []);
  setScore(newScore);
  setCelebrating(false);
  setDone(true);
};

const advanceMultiplicationArrayGameRound = ({
  a,
  b,
  newScore,
  ownerKey,
  roundIndex,
  sessionStartedAtRef,
  setCelebrating,
  setCollected,
  setDone,
  setProblem,
  setRoundIndex,
  setScore,
  setXpBreakdown,
  setXpEarned,
}: {
  a: number;
  b: number;
  newScore: number;
  ownerKey: string | null;
  roundIndex: number;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setCollected: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setProblem: React.Dispatch<React.SetStateAction<MultiplicationArrayProblem>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (roundIndex + 1 >= TOTAL_ROUNDS) {
    finishMultiplicationArrayGame({
      newScore,
      ownerKey,
      sessionStartedAtRef,
      setCelebrating,
      setDone,
      setScore,
      setXpBreakdown,
      setXpEarned,
    });
    return;
  }

  setScore(newScore);
  setRoundIndex((current) => current + 1);
  setProblem(pickProblem([a, b]));
  setCollected(new Set());
  setCelebrating(false);
};

const resolveMultiplicationArrayButtonClassName = ({
  celebrating,
  isCoarsePointer,
  isCollected,
}: {
  celebrating: boolean;
  isCoarsePointer: boolean;
  isCollected: boolean;
}): string =>
  cn(
    'flex items-center kangur-panel-gap px-4 py-3 duration-300 touch-manipulation select-none',
    isCoarsePointer && 'min-h-[4.5rem] active:scale-[0.98]',
    isCollected ? KANGUR_ACCENT_STYLES.violet.activeText : '[color:var(--kangur-page-text)]',
    !isCollected && !celebrating ? 'cursor-pointer' : 'cursor-default'
  );

const resolveMultiplicationArrayIndexClassName = (isCollected: boolean): string =>
  cn(
    'w-5 text-center text-xs font-bold',
    isCollected ? KANGUR_ACCENT_STYLES.violet.mutedText : '[color:var(--kangur-page-muted-text)]'
  );

const resolveMultiplicationArrayDotClassName = ({
  color,
  glow,
  isCollected,
}: {
  color: string;
  glow: string;
  isCollected: boolean;
}): string => `w-6 h-6 rounded-full shadow-sm ${isCollected ? `${glow} shadow-md` : color} opacity-80`;

function MultiplicationArraySummaryView({
  finishLabel,
  onFinish,
  onRestart,
  results,
}: {
  finishLabel: string;
  onFinish: () => void;
  onRestart: () => void;
  results: {
    percent: number;
    score: number;
    xpBreakdown: KangurRewardBreakdownEntry[];
    xpEarned: number;
  };
}): React.JSX.Element {
  const { translations } = useMultiplicationArrayGame();
  const { percent, score, xpBreakdown, xpEarned } = results;

  return (
    <KangurPracticeGameSummary
      dataTestId='multiplication-array-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='multiplication-array-summary-emoji'
        emoji={percent === 100 ? '🏆' : percent >= 67 ? '🌟' : '💪'}
      />
      <KangurPracticeGameSummaryTitle
        dataTestId='multiplication-array-summary-title'
        title={translations('multiplicationArray.summary.title', { score, total: TOTAL_ROUNDS })}
      />
      <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='multiplication-array-summary-breakdown'
        itemDataTestIdPrefix='multiplication-array-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='indigo' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveMultiplicationArraySummaryMessage({ percent, translations })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        className={KANGUR_STACK_ROW_CLASSNAME}
        finishButtonClassName='w-full sm:flex-1'
        finishLabel={finishLabel}
        onFinish={onFinish}
        onRestart={onRestart}
        restartButtonClassName='w-full sm:flex-1'
        restartLabel={translations('shared.restart')}
      />
    </KangurPracticeGameSummary>
  );
}

function MultiplicationArrayCounters({
  collectedCount,
  total,
  translations,
}: {
  collectedCount: number;
  total: number;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div className='flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center'>
      <KangurMetricCard
        accent='violet'
        align='center'
        className='min-w-0 min-[420px]:min-w-[110px]'
        data-testid='multiplication-array-counter-collected'
        label={translations('multiplicationArray.inRound.collectedLabel')}
        padding='sm'
        value={
          <motion.span
            key={collectedCount}
            animate={{ scale: 1 }}
            initial={{ scale: 1.4 }}
            transition={{ duration: 0.25 }}
          >
            {collectedCount}
          </motion.span>
        }
      />
      <div className='hidden text-2xl font-bold [color:var(--kangur-page-muted-text)] min-[420px]:block'>
        /
      </div>
      <KangurMetricCard
        accent='slate'
        align='center'
        className='min-w-0 min-[420px]:min-w-[110px]'
        data-testid='multiplication-array-counter-target'
        label={translations('multiplicationArray.inRound.targetLabel')}
        padding='sm'
        value={total}
      />
    </div>
  );
}

function MultiplicationArrayGroupCard({
  color,
  glow,
  groupIndex,
}: {
  color: string;
  glow: string;
  groupIndex: number;
}): React.JSX.Element {
  const { b, celebrating, collected, isCoarsePointer, onTapGroup } = useMultiplicationArrayGame();
  const isCollected = collected.has(groupIndex);

  return (
    <KangurAnswerChoiceCard
      accent='violet'
      aria-pressed={isCollected}
      buttonClassName={resolveMultiplicationArrayButtonClassName({
        celebrating,
        isCoarsePointer,
        isCollected,
      })}
      data-testid={`multiplication-array-group-${groupIndex}`}
      emphasis={isCollected ? 'accent' : 'neutral'}
      hoverScale={1.03}
      interactive={!isCollected && !celebrating}
      onClick={() => onTapGroup(groupIndex)}
      tapScale={0.97}
      type='button'
    >
      <span className={resolveMultiplicationArrayIndexClassName(isCollected)}>{groupIndex + 1}</span>
      <div className='flex flex-wrap gap-1'>
        {Array.from({ length: b }).map((_, dotIndex) => (
          <motion.div
            key={dotIndex}
            animate={isCollected ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }}
            className={resolveMultiplicationArrayDotClassName({ color, glow, isCollected })}
            initial={false}
            transition={{ delay: isCollected ? dotIndex * 0.04 : 0, duration: 0.2 }}
          />
        ))}
      </div>
      {isCollected ? (
        <motion.span
          animate={{ scale: 1 }}
          className='ml-auto text-sm font-extrabold text-violet-600'
          initial={{ scale: 0 }}
        >
          +{b} ✓
        </motion.span>
      ) : null}
    </KangurAnswerChoiceCard>
  );
}

function MultiplicationArrayGroups(): React.JSX.Element {
  const { a, isCoarsePointer, translations } = useMultiplicationArrayGame();

  return (
    <div className='grid w-full gap-3 lg:grid-cols-2 xl:grid-cols-3'>
      {isCoarsePointer ? (
        <p
          data-testid='multiplication-array-touch-hint'
          className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)] lg:col-span-2 xl:col-span-3'
        >
          {translations('multiplicationArray.inRound.touchHint', { total: a })}
        </p>
      ) : null}
      {Array.from({ length: a }).map((_, groupIndex) => (
        <MultiplicationArrayGroupCard
          color={ROW_COLORS[groupIndex % ROW_COLORS.length] ?? ROW_COLORS[0]}
          glow={ROW_GLOW[groupIndex % ROW_GLOW.length] ?? ROW_GLOW[0]}
          groupIndex={groupIndex}
          key={groupIndex}
        />
      ))}
    </div>
  );
}

function MultiplicationArrayRoundView({
  roundIndex,
  roundMotionProps,
}: {
  roundIndex: number;
  roundMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
}): React.JSX.Element {
  const { a, b, collected, translations } = useMultiplicationArrayGame();
  const total = a * b;
  const collectedCount = collected.size * b;
  const allCollected = collected.size === a;

  return (
    <KangurPracticeGameShell
      className='w-full max-w-4xl'
      data-testid='multiplication-array-game-shell'
    >
      <KangurPracticeGameProgress
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-array-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <AnimatePresence mode='wait'>
        <motion.div key={`${roundIndex}-${a}-${b}`} {...roundMotionProps} className='w-full'>
          <KangurGlassPanel
            className={cn('flex w-full flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
            data-testid='multiplication-array-round-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <div className='text-center'>
              <p className='mb-1 text-xs font-bold uppercase tracking-wide text-purple-400'>
                {translations('multiplicationArray.inRound.header')}
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {a} × {b}{' '}
                <span className='[color:var(--kangur-page-muted-text)]'>
                  = {allCollected ? <span className='text-green-500'>{total}</span> : '?'}
                </span>
              </p>
            </div>

            <MultiplicationArrayCounters
              collectedCount={collectedCount}
              total={total}
              translations={translations}
            />

            <MultiplicationArrayGroups />

            <AnimatePresence>
              {allCollected ? (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className='text-center'
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                >
                  <p className='text-2xl font-extrabold text-green-600'>
                    🎉 {a} × {b} = {total}!
                  </p>
                  <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('multiplicationArray.inRound.celebrationDetail', {
                      a,
                      b,
                      total,
                    })}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!allCollected ? (
              <p className='text-center text-xs [color:var(--kangur-page-muted-text)]'>
                {translations('multiplicationArray.inRound.progress', {
                  collected: collected.size,
                  total: a,
                })}
              </p>
            ) : null}
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>
    </KangurPracticeGameShell>
  );
}

export default function MultiplicationArrayGame({
  finishLabel,
  finishLabelVariant = 'done',
  onFinish,
}: MultiplicationArrayGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel =
    finishLabel ??
    getKangurMiniGameFinishLabel(
      translations,
      finishLabelVariant === 'topics' ? 'topics' : 'done'
    );
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const [[a, b], setProblem] = useState<MultiplicationArrayProblem>(() => pickProblem());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allCollected = collected.size === a;

  useEffect(() => {
    if (!allCollected || done || advanceTimeoutRef.current) {
      return undefined;
    }

    setCelebrating(true);
    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      const newScore = score + 1;
      advanceMultiplicationArrayGameRound({
        a,
        b,
        newScore,
        ownerKey,
        roundIndex,
        sessionStartedAtRef,
        setCelebrating,
        setCollected,
        setDone,
        setProblem,
        setRoundIndex,
        setScore,
        setXpBreakdown,
        setXpEarned,
      });
    }, 1400);

    return () => {
      clearMultiplicationArrayAdvanceTimeout(advanceTimeoutRef);
    };
  }, [a, allCollected, b, done, ownerKey, roundIndex, score]);

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleRestart = (): void => {
    clearMultiplicationArrayAdvanceTimeout(advanceTimeoutRef);
    resetMultiplicationArrayGame({
      sessionStartedAtRef,
      setCelebrating,
      setCollected,
      setDone,
      setProblem,
      setRoundIndex,
      setScore,
      setXpBreakdown,
      setXpEarned,
    });
  };

  const handleTapGroup = (groupIndex: number): void => {
    if (collected.has(groupIndex) || celebrating) {
      return;
    }

    setCollected((previous) => new Set([...previous, groupIndex]));
  };

  const contextValue = {
    a,
    b,
    celebrating,
    collected,
    isCoarsePointer,
    onTapGroup: handleTapGroup,
    translations,
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <MultiplicationArrayGameContext.Provider value={contextValue}>
        <MultiplicationArraySummaryView
          finishLabel={resolvedFinishLabel}
          onFinish={handleFinishGame}
          onRestart={handleRestart}
          results={{
            percent,
            score,
            xpBreakdown,
            xpEarned,
          }}
        />
      </MultiplicationArrayGameContext.Provider>
    );
  }

  return (
    <MultiplicationArrayGameContext.Provider value={contextValue}>
      <MultiplicationArrayRoundView
        roundIndex={roundIndex}
        roundMotionProps={roundMotionProps}
      />
    </MultiplicationArrayGameContext.Provider>
  );
}
