'use client';

import { useTranslations } from 'next-intl';

import ClockTrainingGame from '@/features/kangur/ui/components/clock-training/ClockTrainingGame';
import { renderKangurGameQuizShell } from './KangurGameQuizShell';

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
