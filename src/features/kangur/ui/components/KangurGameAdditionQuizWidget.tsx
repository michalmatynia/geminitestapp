'use client';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameAdditionQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'addition_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='amber'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Szybki quiz z dodawania w rytmie gry z lekcji.'
      icon='➕'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-addition-quiz-top-section'
      title='Quiz dodawania'
    >
      <AddingBallGame finishLabelVariant='play' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
