'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

export function KangurGameLogicalAnalogiesQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizStage({
    accent: 'rose',
    children: ({ handleHome }) => (
      <LogicalAnalogiesRelationGame
        finishLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '🔗',
    screen: 'logical_analogies_quiz',
    shellTestId: 'kangur-logical-analogies-quiz-top-section',
  });
}
