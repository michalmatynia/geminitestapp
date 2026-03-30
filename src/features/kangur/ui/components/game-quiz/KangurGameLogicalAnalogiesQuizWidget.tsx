'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizShell } from './KangurGameQuizShell';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

export function KangurGameLogicalAnalogiesQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizShell({
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
