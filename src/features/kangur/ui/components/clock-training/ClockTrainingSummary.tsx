import React from 'react';
import {
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
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type {
  ClockChallengeMedal,
  ClockGameMode,
  ClockTrainingTaskPoolId,
} from '../clock-training-utils';
import {
  getClockChallengeMedalLabel,
  getClockTrainingSummaryMessage,
} from '../clock-training-utils';

export type ClockTrainingSummaryProps = {
  score: number;
  tasksCount: number;
  gameMode: ClockGameMode;
  xpEarned: number;
  xpBreakdown: KangurRewardBreakdownEntry[];
  challengeMedal: ClockChallengeMedal | null;
  challengeBestStreak: number;
  retryAddedCount: number;
  section: ClockTrainingTaskPoolId;
  completionPrimaryActionLabel: string;
  onFinish: () => void;
  onRestart: () => void;
};

export function ClockTrainingSummary({
  score,
  tasksCount,
  gameMode,
  xpEarned,
  xpBreakdown,
  challengeMedal,
  challengeBestStreak,
  retryAddedCount,
  section,
  completionPrimaryActionLabel,
  onFinish,
  onRestart,
}: ClockTrainingSummaryProps): React.JSX.Element {
  const percent = Math.round((score / tasksCount) * 100);
  const summaryEmoji = score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪';
  const summaryTitle = (
    <h3 className='text-2xl font-extrabold text-indigo-700'>
      Wynik: {score}/{tasksCount}
    </h3>
  );
  const summaryXpEarned = xpEarned;
  const summaryBreakdown = xpBreakdown;
  const challengeMedalAccent =
    challengeMedal === 'gold' ? 'amber' : challengeMedal === 'silver' ? 'slate' : 'rose';
  const primaryActionLabel = completionPrimaryActionLabel;
  const handleFinish = onFinish;
  const handleRestart = onRestart;

  return (
    <KangurPracticeGameSummary
      dataTestId='clock-training-summary-shell'
      panelClassName='gap-5'
      wrapperClassName='py-4'
    >
      <KangurPracticeGameSummaryEmoji
        ariaHidden
        dataTestId='clock-training-summary-emoji'
        emoji={summaryEmoji}
      />
      <KangurPracticeGameSummaryTitle
        dataTestId='clock-training-summary-title'
        title={summaryTitle}
        unwrapped
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={summaryXpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={summaryBreakdown}
        dataTestId='clock-training-summary-breakdown'
        itemDataTestIdPrefix='clock-training-summary-breakdown'
      />
      <p className='text-xs font-semibold text-indigo-600'>
        Tryb: {gameMode === 'challenge' ? 'Wyzwanie' : 'Nauka'}
      </p>
      {gameMode === 'challenge' && challengeMedal ? (
        <KangurStatusChip
          accent={challengeMedalAccent}
          className='px-4 py-2 text-sm font-bold'
          data-testid='clock-challenge-medal'
        >
          {getClockChallengeMedalLabel(challengeMedal)}
        </KangurStatusChip>
      ) : null}
      {gameMode === 'challenge' ? (
        <p data-testid='clock-challenge-summary' className='text-xs font-semibold text-amber-600'>
          Najlepsza seria: {challengeBestStreak}
        </p>
      ) : null}
      {gameMode === 'practice' && retryAddedCount > 0 ? (
        <p className='text-xs font-semibold text-indigo-600'>
          Powtórki adaptacyjne: {retryAddedCount}
        </p>
      ) : null}
      <KangurPracticeGameSummaryProgress
        accent='indigo'
        ariaLabel='Dokładność w treningu zegara'
        ariaValueText={`${percent}% poprawnych ustawień`}
        dataTestId='clock-training-summary-progress-bar'
        percent={percent}
      />
      <KangurPracticeGameSummaryMessage className='max-w-xs text-center'>
        {getClockTrainingSummaryMessage(section, score, tasksCount)}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={primaryActionLabel}
        onFinish={handleFinish}
        onRestart={handleRestart}
      />
    </KangurPracticeGameSummary>
  );
}
