'use client';

import { useTranslations } from 'next-intl';

import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameClockQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return renderKangurGameQuizStage({
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
