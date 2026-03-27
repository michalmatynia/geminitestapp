'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';

export function KangurGameLogicalPatternsQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizStage({
    accent: 'violet',
    children: ({ handleHome }) => (
      <LogicalPatternsWorkshopGame
        finishLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '🔢',
    screen: 'logical_patterns_quiz',
    shellTestId: 'kangur-logical-patterns-quiz-top-section',
  });
}
