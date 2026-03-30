'use client';

import { useTranslations } from 'next-intl';

import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';

export function KangurGameClockQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizShell({
    accent: 'indigo',
    children: ({ handleHome }) => (
      <ClockTrainingGame
        completionPrimaryActionLabel={translations('returnToGameHome')}
        onFinish={handleHome}
      />
    ),
    icon: '🕐',
    screen: 'clock_quiz',
    shellTestId: 'kangur-clock-quiz-top-section',
  });
}
