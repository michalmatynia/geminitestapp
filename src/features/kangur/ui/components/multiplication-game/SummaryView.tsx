import React from 'react';
import {
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryActions,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { KANGUR_STACK_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { type KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { useMultiplicationArrayGame } from './context';
import { resolveMultiplicationArraySummaryMessage } from './ui-utils';
import { TOTAL_ROUNDS } from './constants';

export function MultiplicationArraySummaryView({
  results,
}: {
  results: {
    percent: number;
    score: number;
    xpBreakdown: KangurRewardBreakdownEntry[];
    xpEarned: number;
  };
}): React.JSX.Element {
  const { finishLabel, onFinish, onRestart, translations } = useMultiplicationArrayGame();
  const { percent, score, xpBreakdown, xpEarned } = results;

  let emoji = '💪';
  if (percent === 100) {
    emoji = '🏆';
  } else if (percent >= 67) {
    emoji = '🌟';
  }

  return (
    <KangurPracticeGameSummary
      dataTestId='multiplication-array-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='multiplication-array-summary-emoji'
        emoji={emoji}
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
