'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

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
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

import type { Round, RoundMode } from './adding-ball-game/types';
import { MODES, TOTAL_ROUNDS, generateRound } from './adding-ball-game/utils';
import { CompleteEquation } from './adding-ball-game/AddingBallGame.CompleteEquation';
import { GroupSum } from './adding-ball-game/AddingBallGame.GroupSum';
import { PickAnswer } from './adding-ball-game/AddingBallGame.PickAnswer';

type AddingBallGameProps = {
  finishLabelVariant?: 'lesson' | 'topics' | 'play';
  onFinish: () => void;
};

export default function AddingBallGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: AddingBallGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'topics' ? 'topics' : finishLabelVariant === 'play' ? 'play' : 'lesson'
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const prefersReducedMotion = useReducedMotion();
  const resolveMotionOpacity = (value: unknown, fallback: number): number => {
    if (!value || typeof value !== 'object') return fallback;
    const opacity = (value as { opacity?: unknown }).opacity;
    return typeof opacity === 'number' ? opacity : fallback;
  };
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [round, setRound] = useState<Round>(() => generateRound(MODES[0] ?? 'complete_equation'));
  const sessionStartedAtRef = useRef(Date.now());
  // Avoid translate transforms here; they offset drag previews in DnD.
  const baseRoundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const roundMotionProps = {
    ...baseRoundMotionProps,
    initial: { opacity: resolveMotionOpacity(baseRoundMotionProps.initial, 1) },
    animate: { opacity: resolveMotionOpacity(baseRoundMotionProps.animate, 1) },
    exit: { opacity: resolveMotionOpacity(baseRoundMotionProps.exit, 1) },
  };
  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleResult = (correct: boolean): void => {
    const nextScore = correct ? score + 1 : score;
    if (roundIdx + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, 'adding', nextScore, TOTAL_ROUNDS);
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'addition',
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

    const nextMode = MODES[(roundIdx + 1) % MODES.length] ?? 'complete_equation';
    setRound(generateRound(nextMode));
    setScore(nextScore);
    setRoundIdx(roundIdx + 1);
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='adding-ball-summary-shell' wrapperClassName='w-full max-w-none'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='adding-ball-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          dataTestId='adding-ball-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='adding-ball-summary-breakdown'
          itemDataTestIdPrefix='adding-ball-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='amber' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('adding.summary.perfect')
            : percent >= 60
              ? translations('adding.summary.good')
              : translations('adding.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          restartLabel={translations('shared.restart')}
          onRestart={() => {
            setRoundIdx(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            setRound(generateRound(MODES[0] ?? 'complete_equation'));
            sessionStartedAtRef.current = Date.now();
          }}
        />
      </KangurPracticeGameSummary>
    );
  }

  const modeLabelByMode: Record<RoundMode, string> = {
    complete_equation: translations('adding.rounds.completeEquation.label'),
    group_sum: translations('adding.rounds.groupSum.label'),
    pick_answer: translations('adding.rounds.pickAnswer.label'),
  };
  const modeLabel = modeLabelByMode[round.mode];
  const touchHintByMode: Record<RoundMode, string> = {
    complete_equation: translations('adding.rounds.completeEquation.touchHint'),
    group_sum: translations('adding.rounds.groupSum.touchHint'),
    pick_answer: translations('adding.rounds.pickAnswer.touchHint'),
  };
  const touchHint = touchHintByMode[round.mode];

  return (
    <KangurPracticeGameStage className='w-full max-w-none'>
      <KangurPracticeGameProgress
        accent='amber'
        currentRound={roundIdx}
        dataTestId='adding-ball-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />

      <KangurGlassPanel
        className='w-full'
        data-testid='adding-ball-round-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <p className='text-xs font-bold text-orange-500 uppercase tracking-wide mb-3'>
          {modeLabel}
        </p>
        {isCoarsePointer ? (
          <p
            className='mb-4 rounded-2xl border border-orange-200/70 bg-orange-50/80 px-3 py-2 text-sm font-semibold text-orange-700'
            data-testid='adding-ball-touch-hint'
          >
            {touchHint}
          </p>
        ) : null}
        <AnimatePresence mode='wait'>
          <motion.div
            key={roundIdx}
            {...roundMotionProps}
          >
            {round.mode === 'complete_equation' && (
              <CompleteEquation round={round} onResult={handleResult} />
            )}
            {round.mode === 'group_sum' && <GroupSum round={round} onResult={handleResult} />}
            {round.mode === 'pick_answer' && <PickAnswer round={round} onResult={handleResult} />}
          </motion.div>
        </AnimatePresence>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
