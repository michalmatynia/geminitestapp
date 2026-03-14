import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameDivisionQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'division_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='teal'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Sprawdź dzielenie w szybkim quizie.'
      icon='➗'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-division-quiz-top-section'
      title='Quiz dzielenia'
    >
      <DivisionGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
