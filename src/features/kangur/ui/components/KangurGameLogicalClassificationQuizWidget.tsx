'use client';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameLogicalClassificationQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'logical_classification_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='teal'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Grupuj elementy i znajdź wspólne cechy.'
      icon='📦'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-logical-classification-quiz-top-section'
      title='Quiz klasyfikacji'
    >
      <LogicalClassificationGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
