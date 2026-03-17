'use client';

import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameClockQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='indigo'
      description='Ćwicz odczytywanie godzin i minut w trybie quizu.'
      icon='🕐'
      screen='clock_quiz'
      shellTestId='kangur-clock-quiz-top-section'
      title='Ćwiczenia z Zegarem'
    >
      {({ handleHome }) => (
        <ClockTrainingGame completionPrimaryActionLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
