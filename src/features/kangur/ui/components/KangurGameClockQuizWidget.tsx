'use client';

import { useTranslations } from 'next-intl';

import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameClockQuizWidget(): React.JSX.Element | null {
  const translations = useTranslations('KangurGameWidgets');

  return (
    <KangurGameQuizStage
      accent='indigo'
      icon='🕐'
      screen='clock_quiz'
      shellTestId='kangur-clock-quiz-top-section'
    >
      {({ handleHome }) => (
        <ClockTrainingGame
          completionPrimaryActionLabel={translations('returnToGameHome')}
          onFinish={handleHome}
        />
      )}
    </KangurGameQuizStage>
  );
}
