'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

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

type MiniGameTranslations = ReturnType<typeof useTranslations>;

const resolveAddingBallFinishLabelVariant = (
  finishLabelVariant: AddingBallGameProps['finishLabelVariant']
): 'lesson' | 'topics' | 'play' =>
  finishLabelVariant === 'topics' ? 'topics' : finishLabelVariant === 'play' ? 'play' : 'lesson';

const resolveMotionOpacity = (value: unknown, fallback: number): number => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const opacity = (value as { opacity?: unknown }).opacity;
  return typeof opacity === 'number' ? opacity : fallback;
};

const resolveAddingBallSummaryEmoji = (percent: number): string => {
  if (percent === 100) {
    return '🏆';
  }
  if (percent >= 60) {
    return '🌟';
  }
  return '💪';
};

const resolveAddingBallSummaryMessage = (
  translations: MiniGameTranslations,
  percent: number
): string => {
  if (percent === 100) {
    return translations('adding.summary.perfect');
  }
  if (percent >= 60) {
    return translations('adding.summary.good');
  }
  return translations('adding.summary.retry');
};

const resolveAddingBallNextMode = (roundIdx: number): RoundMode =>
  MODES[(roundIdx + 1) % MODES.length] ?? 'complete_equation';

const resolveAddingBallModeLabel = (
  mode: RoundMode,
  translations: MiniGameTranslations
): string =>
  ({
    complete_equation: translations('adding.rounds.completeEquation.label'),
    group_sum: translations('adding.rounds.groupSum.label'),
    pick_answer: translations('adding.rounds.pickAnswer.label'),
  })[mode];

const resolveAddingBallTouchHint = (
  mode: RoundMode,
  translations: MiniGameTranslations
): string =>
  ({
    complete_equation: translations('adding.rounds.completeEquation.touchHint'),
    group_sum: translations('adding.rounds.groupSum.touchHint'),
    pick_answer: translations('adding.rounds.pickAnswer.touchHint'),
  })[mode];

function AddingBallRoundContent(props: {
  round: Round;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const { round, onResult } = props;

  if (round.mode === 'complete_equation') {
    return <CompleteEquation round={round} onResult={onResult} />;
  }
  if (round.mode === 'group_sum') {
    return <GroupSum round={round} onResult={onResult} />;
  }
  return <PickAnswer round={round} onResult={onResult} />;
}

function AddingBallSummaryView(props: {
  percent: number;
  score: number;
  xpEarned: number;
  xpBreakdown: KangurRewardBreakdownEntry[];
  finishLabel: string;
  translations: MiniGameTranslations;
  onFinish: () => void;
  onRestart: () => void;
}): React.JSX.Element {
  const { percent, score, xpEarned, xpBreakdown, finishLabel, translations, onFinish, onRestart } =
    props;

  return (
    <KangurPracticeGameSummary dataTestId='adding-ball-summary-shell' wrapperClassName='w-full max-w-none'>
      <KangurPracticeGameSummaryEmoji
        dataTestId='adding-ball-summary-emoji'
        emoji={resolveAddingBallSummaryEmoji(percent)}
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
        {resolveAddingBallSummaryMessage(translations, percent)}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={finishLabel}
        onFinish={onFinish}
        restartLabel={translations('shared.restart')}
        onRestart={onRestart}
      />
    </KangurPracticeGameSummary>
  );
}

export default function AddingBallGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: AddingBallGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    resolveAddingBallFinishLabelVariant(finishLabelVariant)
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const prefersReducedMotion = useReducedMotion();
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
  const handleRestartGame = (): void => {
    setRoundIdx(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setRound(generateRound(MODES[0] ?? 'complete_equation'));
    sessionStartedAtRef.current = Date.now();
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

    const nextMode = resolveAddingBallNextMode(roundIdx);
    setRound(generateRound(nextMode));
    setScore(nextScore);
    setRoundIdx(roundIdx + 1);
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <AddingBallSummaryView
        percent={percent}
        score={score}
        xpEarned={xpEarned}
        xpBreakdown={xpBreakdown}
        finishLabel={finishLabel}
        translations={translations}
        onFinish={handleFinishGame}
        onRestart={handleRestartGame}
      />
    );
  }

  const modeLabel = resolveAddingBallModeLabel(round.mode, translations);
  const touchHint = resolveAddingBallTouchHint(round.mode, translations);

  return (
    <KangurPracticeGameShell className='w-full max-w-none'>
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
            <AddingBallRoundContent round={round} onResult={handleResult} />
          </motion.div>
        </AnimatePresence>
      </KangurGlassPanel>
    </KangurPracticeGameShell>
  );
}
