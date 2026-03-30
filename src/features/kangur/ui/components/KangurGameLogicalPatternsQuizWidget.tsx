'use client';

import { useTranslations } from 'next-intl';

import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';

export function KangurGameLogicalPatternsQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizShell({
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
