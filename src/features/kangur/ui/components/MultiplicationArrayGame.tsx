'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
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
  KangurGlassPanel,
  KangurMetricCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_ROW_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  getProgressOwnerKey,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { getKangurMiniGameFinishLabel } from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type MultiplicationArrayGameProps = {
  finishLabelVariant?: 'done' | 'topics';
  onFinish: () => void;
};

const TOTAL_ROUNDS = 6;

const GROUP_SIZES: Array<[number, number]> = [
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

function pickProblem(excludePrev?: [number, number]): [number, number] {
  const candidates = GROUP_SIZES.filter(([a, b]) => a !== excludePrev?.[0] || b !== excludePrev[1]);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick ?? [3, 4];
}

const ROW_COLORS = [
  'bg-purple-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-pink-400',
];

const ROW_GLOW = [
  'bg-purple-500 shadow-purple-300',
  'bg-indigo-500 shadow-indigo-300',
  'bg-violet-500 shadow-violet-300',
  'bg-fuchsia-500 shadow-fuchsia-300',
  'bg-pink-500 shadow-pink-300',
];

export default function MultiplicationArrayGame({
  finishLabelVariant = 'done',
  onFinish,
}: MultiplicationArrayGameProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'topics' ? 'topics' : 'done'
  );
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const handleFinishGame = (): void => {
    onFinish();
  };
  const [[a, b], setProblem] = useState<[number, number]>(() => pickProblem());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = a * b;
  const collectedCount = collected.size * b;
  const allCollected = collected.size === a;

  useEffect(() => {
    if (!allCollected || done || advanceTimeoutRef.current) {
      return undefined;
    }

    setCelebrating(true);
    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      const newScore = score + 1;
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const ownerKey = getProgressOwnerKey();
        const progress = loadProgress({ ownerKey });
        const reward = createLessonPracticeReward(
          progress,
          'multiplication',
          newScore,
          TOTAL_ROUNDS
        );
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
      } else {
        setScore(newScore);
        setRoundIndex((r) => r + 1);
        const next = pickProblem([a, b]);
        setProblem(next);
        setCollected(new Set());
        setCelebrating(false);
      }
    }, 1400);

    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [allCollected, done, score, roundIndex, a, b]);

  const handleTapGroup = (groupIndex: number): void => {
    if (collected.has(groupIndex) || celebrating) return;
    setCollected((prev) => new Set([...prev, groupIndex]));
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='multiplication-array-summary-shell'>
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
          {percent === 100
            ? translations('multiplicationArray.summary.perfect')
            : percent >= 67
              ? translations('multiplicationArray.summary.good')
              : translations('multiplicationArray.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          onRestart={() => {
            setRoundIndex(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            setCelebrating(false);
            const next = pickProblem();
            setProblem(next);
            setCollected(new Set());
            sessionStartedAtRef.current = Date.now();
          }}
          restartLabel={translations('shared.restart')}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage>
      <KangurPracticeGameProgress
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-array-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <AnimatePresence mode='wait'>
        <motion.div
          key={`${roundIndex}-${a}-${b}`}
          {...roundMotionProps}
          className='w-full'
        >
          <KangurGlassPanel
            className={cn('flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
            data-testid='multiplication-array-round-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            {/* Problem header */}
            <div className='text-center'>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide mb-1'>
                {translations('multiplicationArray.inRound.header')}
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {a} × {b}{' '}
                <span className='[color:var(--kangur-page-muted-text)]'>
                  = {allCollected ? <span className='text-green-500'>{total}</span> : '?'}
                </span>
              </p>
            </div>

            {/* Running total counter */}
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

            {/* Groups grid */}
            <div className={`${KANGUR_STACK_TIGHT_CLASSNAME} w-full`}>
              {isCoarsePointer ? (
                <p
                  data-testid='multiplication-array-touch-hint'
                  className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
                >
                  {translations('multiplicationArray.inRound.touchHint', {
                    total: a,
                  })}
                </p>
              ) : null}
              {Array.from({ length: a }).map((_, groupIndex) => {
                const isCollected = collected.has(groupIndex);
                const color = ROW_COLORS[groupIndex % ROW_COLORS.length];
                const glow = ROW_GLOW[groupIndex % ROW_GLOW.length];
                const accent: KangurAccent = 'violet';
                return (
                  <KangurAnswerChoiceCard
                    accent={accent}
                    aria-pressed={isCollected}
                    buttonClassName={cn(
                      'flex items-center kangur-panel-gap px-4 py-3 duration-300 touch-manipulation select-none',
                      isCoarsePointer && 'min-h-[4.5rem] active:scale-[0.98]',
                      isCollected
                        ? KANGUR_ACCENT_STYLES.violet.activeText
                        : '[color:var(--kangur-page-text)]',
                      !isCollected && !celebrating ? 'cursor-pointer' : 'cursor-default'
                    )}
                    data-testid={`multiplication-array-group-${groupIndex}`}
                    emphasis={isCollected ? 'accent' : 'neutral'}
                    hoverScale={1.03}
                    interactive={!isCollected && !celebrating}
                    key={groupIndex}
                    onClick={() => handleTapGroup(groupIndex)}
                    tapScale={0.97}
                    type='button'
                  >
                    <span
                      className={cn(
                        'w-5 text-center text-xs font-bold',
                        isCollected
                          ? KANGUR_ACCENT_STYLES.violet.mutedText
                          : '[color:var(--kangur-page-muted-text)]'
                      )}
                    >
                      {groupIndex + 1}
                    </span>
                    <div className='flex gap-1 flex-wrap'>
                      {Array.from({ length: b }).map((_, dotIndex) => (
                        <motion.div
                          key={dotIndex}
                          initial={false}
                          animate={
                            isCollected ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0.4 }
                          }
                          transition={{ delay: isCollected ? dotIndex * 0.04 : 0, duration: 0.2 }}
                          className={`w-6 h-6 rounded-full shadow-sm ${
                            isCollected ? `${glow} shadow-md` : color
                          } opacity-80`}
                        />
                      ))}
                    </div>
                    {isCollected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className='ml-auto text-sm font-extrabold text-violet-600'
                      >
                        +{b} ✓
                      </motion.span>
                    )}
                  </KangurAnswerChoiceCard>
                );
              })}
            </div>

            {/* Celebration banner */}
            <AnimatePresence>
              {allCollected && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className='text-center'
                >
                  <p className='text-2xl font-extrabold text-green-600'>
                    🎉 {a} × {b} = {total}!
                  </p>
                  <p className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('multiplicationArray.inRound.celebrationDetail', { a, b, total })}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instruction when not all collected */}
            {!allCollected && (
              <p className='text-center text-xs [color:var(--kangur-page-muted-text)]'>
                {translations('multiplicationArray.inRound.progress', {
                  collected: collected.size,
                  total: a,
                })}
              </p>
            )}
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>
    </KangurPracticeGameStage>
  );
}
