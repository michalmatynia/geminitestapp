'use client';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameLogicalPatternsQuizWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'logical_patterns_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='violet'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Uzupełniaj ciągi i sprawdzaj reguły wzorców.'
      icon='🔢'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-logical-patterns-quiz-top-section'
      title='Quiz wzorców'
    >
      <LogicalPatternsWorkshopGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
    </LessonActivityStage>
  );
}
