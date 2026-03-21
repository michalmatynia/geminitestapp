'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  getKangurMiniGameAccuracyText,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type {
  ClockChallengeMedal,
  ClockGameMode,
  ClockTrainingTaskPoolId,
} from './types';
import { getClockChallengeMedalLabel } from '../clock-training-utils';

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
  const translations = useTranslations('KangurMiniGames');
  const percent = Math.round((score / tasksCount) * 100);
  const summaryEmoji = score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪';
  const summaryTitle = (
    <h3 className='text-2xl font-extrabold text-indigo-700'>
      {getKangurMiniGameScoreLabel(translations, score, tasksCount)}
    </h3>
  );
  const summaryXpEarned = xpEarned;
  const summaryBreakdown = xpBreakdown;
  const challengeMedalAccent =
    challengeMedal === 'gold' ? 'amber' : challengeMedal === 'silver' ? 'slate' : 'rose';
  const primaryActionLabel = completionPrimaryActionLabel;
  const handleFinish = onFinish;
  const handleRestart = onRestart;
  const summaryMessage = (() => {
    if (section === 'hours') {
      return score === tasksCount
        ? translations('clockTraining.summary.hours.perfect')
        : translations('clockTraining.summary.hours.retry');
    }
    if (section === 'minutes') {
      return score === tasksCount
        ? translations('clockTraining.summary.minutes.perfect')
        : translations('clockTraining.summary.minutes.retry');
    }
    if (section === 'combined') {
      return score === tasksCount
        ? translations('clockTraining.summary.combined.perfect')
        : translations('clockTraining.summary.combined.retry');
    }
    return score === tasksCount
      ? translations('clockTraining.summary.default.perfect')
      : translations('clockTraining.summary.default.retry');
  })();

  return (
    <KangurPracticeGameSummary
      dataTestId='clock-training-summary-shell'
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
        {translations('clockTraining.mode.label')}:{' '}
        {gameMode === 'challenge'
          ? translations('clockTraining.mode.challenge')
          : translations('clockTraining.mode.practice')}
      </p>
      {gameMode === 'challenge' && challengeMedal ? (
        <KangurStatusChip
          accent={challengeMedalAccent}
          className='px-4 py-2 text-sm font-bold'
          data-testid='clock-challenge-medal'
        >
          {getClockChallengeMedalLabel(challengeMedal, translations)}
        </KangurStatusChip>
      ) : null}
      {gameMode === 'challenge' ? (
        <p data-testid='clock-challenge-summary' className='text-xs font-semibold text-amber-600'>
          {translations('clockTraining.bestStreak')}: {challengeBestStreak}
        </p>
      ) : null}
      {gameMode === 'practice' && retryAddedCount > 0 ? (
        <p className='text-xs font-semibold text-indigo-600'>
          {translations('clockTraining.adaptiveRetries')}: {retryAddedCount}
        </p>
      ) : null}
      <KangurPracticeGameSummaryProgress
        accent='indigo'
        ariaLabel={translations('clockTraining.progressAriaLabel')}
        ariaValueText={getKangurMiniGameAccuracyText(translations, percent)}
        dataTestId='clock-training-summary-progress-bar'
        percent={percent}
      />
      <KangurPracticeGameSummaryMessage className='max-w-xs text-center'>
        {summaryMessage}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={primaryActionLabel}
        onFinish={handleFinish}
        restartLabel={translations('shared.restart')}
        onRestart={handleRestart}
      />
    </KangurPracticeGameSummary>
  );
}
