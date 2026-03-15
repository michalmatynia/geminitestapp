import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameMultiplicationQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'multiplication_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='violet'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Sprawdź tabliczkę mnożenia w szybkim quizie.'
      icon='✖️'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-multiplication-quiz-top-section'
      title='Quiz mnożenia'
    >
      <MultiplicationGame finishLabelVariant='play' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
