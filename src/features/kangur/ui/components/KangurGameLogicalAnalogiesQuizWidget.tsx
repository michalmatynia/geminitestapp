'use client';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameLogicalAnalogiesQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'logical_analogies_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='rose'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Dopasuj relacje i znajdź właściwe analogie.'
      icon='🔗'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-logical-analogies-quiz-top-section'
      title='Quiz analogii'
    >
      <LogicalAnalogiesRelationGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
