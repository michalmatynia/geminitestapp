import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameSubtractionQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'subtraction_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='rose'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Szybkie pytania z odejmowania w trybie quizu.'
      icon='➖'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-subtraction-quiz-top-section'
      title='Quiz odejmowania'
    >
      <SubtractingGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
