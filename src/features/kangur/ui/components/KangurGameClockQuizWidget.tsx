'use client';

import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameClockQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'clock_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='indigo'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Ćwicz odczytywanie godzin i minut w trybie quizu.'
      icon='🕐'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-clock-quiz-top-section'
      title='Ćwiczenia z Zegarem'
    >
      <ClockTrainingGame
        completionPrimaryActionLabel='Wróć do Grajmy'
        onFinish={handleHome}
      />
    </LessonActivityStage>
  );
}
