import type React from 'react';

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
import { getKangurMiniGameScoreLabel } from '@/features/kangur/ui/constants/mini-game-i18n';
import { KangurHeadline } from '@/features/kangur/ui/design/primitives';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

import {
  resolveGeometrySymmetryFinishLabel,
  resolveGeometrySymmetrySummaryEmoji,
  resolveGeometrySymmetrySummaryMessage,
  resolveGeometrySymmetrySummaryPercent,
  type GeometrySymmetryFinishProps,
  type GeometrySymmetryTranslations,
} from './GeometrySymmetryGame.logic';

export function GeometrySymmetrySummaryView(props: {
  handleFinish: GeometrySymmetryFinishProps['onFinish'];
  handleRestart: () => void;
  score: number;
  totalRounds: number;
  translations: GeometrySymmetryTranslations;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
}): React.JSX.Element {
  const { handleFinish, handleRestart, score, totalRounds, translations, xpBreakdown, xpEarned } =
    props;
  const percent = resolveGeometrySymmetrySummaryPercent(score, totalRounds);

  return (
    <KangurPracticeGameSummary dataTestId='geometry-symmetry-summary-shell'>
      <KangurPracticeGameSummaryEmoji
        ariaHidden
        dataTestId='geometry-symmetry-summary-emoji'
        emoji={resolveGeometrySymmetrySummaryEmoji(score, totalRounds)}
      />
      <KangurPracticeGameSummaryTitle unwrapped>
        <KangurHeadline accent='emerald' as='h3' data-testid='geometry-symmetry-summary-title'>
          {getKangurMiniGameScoreLabel(translations, score, totalRounds)}
        </KangurHeadline>
      </KangurPracticeGameSummaryTitle>
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='geometry-symmetry-summary-breakdown'
        itemDataTestIdPrefix='geometry-symmetry-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress
        accent='emerald'
        ariaLabel={translations('geometrySymmetry.progressAriaLabel')}
        ariaValueText={`${percent}% ${translations('shared.correctAnswersSuffix')}`}
        dataTestId='geometry-symmetry-summary-progress-bar'
        percent={percent}
      />
      <KangurPracticeGameSummaryMessage className='max-w-xs text-center'>
        {resolveGeometrySymmetrySummaryMessage({
          score,
          totalRounds,
          translations,
        })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={resolveGeometrySymmetryFinishLabel(translations)}
        onFinish={handleFinish}
        restartLabel={translations('shared.restart')}
        onRestart={handleRestart}
      />
    </KangurPracticeGameSummary>
  );
}
