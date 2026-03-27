'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';

export function KangurGameLogicalClassificationQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizStage({
    accent: 'teal',
    children: ({ handleHome }) => (
      <LogicalClassificationGame
        finishLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '📦',
    screen: 'logical_classification_quiz',
    shellTestId: 'kangur-logical-classification-quiz-top-section',
  });
}
