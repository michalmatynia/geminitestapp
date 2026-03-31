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
import { KANGUR_CLOCK_THEME_COLORS } from '../clock-theme';
import { getClockChallengeMedalLabel } from './clock-training-utils';

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

const resolveClockTrainingSummaryEmoji = (score: number): string =>
  score >= 4 ? '🏆' : score >= 2 ? '😊' : '💪';

const resolveClockTrainingSummaryMedalAccent = (
  challengeMedal: ClockChallengeMedal | null
): 'amber' | 'slate' | 'rose' =>
  challengeMedal === 'gold' ? 'amber' : challengeMedal === 'silver' ? 'slate' : 'rose';

const resolveClockTrainingSummaryModeLabel = ({
  gameMode,
  translations,
}: {
  gameMode: ClockGameMode;
  translations: ReturnType<typeof useTranslations>;
}): string =>
  gameMode === 'challenge'
    ? translations('clockTraining.mode.challenge')
    : translations('clockTraining.mode.practice');

const resolveClockTrainingSummaryMessage = ({
  score,
  section,
  tasksCount,
  translations,
}: {
  score: number;
  section: ClockTrainingTaskPoolId;
  tasksCount: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  const suffix = score === tasksCount ? 'perfect' : 'retry';

  if (section === 'hours') {
    return translations(`clockTraining.summary.hours.${suffix}`);
  }

  if (section === 'minutes') {
    return translations(`clockTraining.summary.minutes.${suffix}`);
  }

  if (section === 'combined') {
    return translations(`clockTraining.summary.combined.${suffix}`);
  }

  return translations(`clockTraining.summary.default.${suffix}`);
};

function ClockTrainingSummaryMode({
  gameMode,
  translations,
}: {
  gameMode: ClockGameMode;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <p
      className='text-xs font-semibold'
      style={{ color: KANGUR_CLOCK_THEME_COLORS.accentIndigoText }}
    >
      {translations('clockTraining.mode.label')}:{' '}
      {resolveClockTrainingSummaryModeLabel({ gameMode, translations })}
    </p>
  );
}

function ClockTrainingSummaryChallengeMeta({
  challengeBestStreak,
  challengeMedal,
  gameMode,
  translations,
}: {
  challengeBestStreak: number;
  challengeMedal: ClockChallengeMedal | null;
  gameMode: ClockGameMode;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element | null {
  if (gameMode !== 'challenge') {
    return null;
  }

  return (
    <>
      {challengeMedal ? (
        <KangurStatusChip
          accent={resolveClockTrainingSummaryMedalAccent(challengeMedal)}
          className='px-4 py-2 text-sm font-bold'
          data-testid='clock-challenge-medal'
        >
          {getClockChallengeMedalLabel(challengeMedal, translations)}
        </KangurStatusChip>
      ) : null}
      <p
        data-testid='clock-challenge-summary'
        className='text-xs font-semibold'
        style={{ color: KANGUR_CLOCK_THEME_COLORS.accentAmberText }}
      >
        {translations('clockTraining.bestStreak')}: {challengeBestStreak}
      </p>
    </>
  );
}

function ClockTrainingSummaryPracticeMeta({
  gameMode,
  retryAddedCount,
  translations,
}: {
  gameMode: ClockGameMode;
  retryAddedCount: number;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element | null {
  if (gameMode !== 'practice' || retryAddedCount <= 0) {
    return null;
  }

  return (
    <p
      className='text-xs font-semibold'
      style={{ color: KANGUR_CLOCK_THEME_COLORS.accentIndigoText }}
    >
      {translations('clockTraining.adaptiveRetries')}: {retryAddedCount}
    </p>
  );
}

export function ClockTrainingSummary(props: ClockTrainingSummaryProps): React.JSX.Element {
  const {
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
  } = props;
  const translations = useTranslations('KangurMiniGames');
  const percent = Math.round((score / tasksCount) * 100);
  const summaryEmoji = resolveClockTrainingSummaryEmoji(score);
  const summaryTitle = (
    <h3
      className='text-2xl font-extrabold'
      style={{ color: KANGUR_CLOCK_THEME_COLORS.lessonMinuteHand }}
    >
      {getKangurMiniGameScoreLabel(translations, score, tasksCount)}
    </h3>
  );
  const summaryMessage = resolveClockTrainingSummaryMessage({
    score,
    section,
    tasksCount,
    translations,
  });

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
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='clock-training-summary-breakdown'
        itemDataTestIdPrefix='clock-training-summary-breakdown'
      />
      <ClockTrainingSummaryMode gameMode={gameMode} translations={translations} />
      <ClockTrainingSummaryChallengeMeta
        challengeBestStreak={challengeBestStreak}
        challengeMedal={challengeMedal}
        gameMode={gameMode}
        translations={translations}
      />
      <ClockTrainingSummaryPracticeMeta
        gameMode={gameMode}
        retryAddedCount={retryAddedCount}
        translations={translations}
      />
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
        finishLabel={completionPrimaryActionLabel}
        onFinish={onFinish}
        restartLabel={translations('shared.restart')}
        onRestart={onRestart}
      />
    </KangurPracticeGameSummary>
  );
}
