'use client';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalPatternsWorkshopGame from '@/features/kangur/ui/components/LogicalPatternsWorkshopGame';

export function KangurGameLogicalPatternsQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      description='Uzupełniaj ciągi i sprawdzaj reguły wzorców.'
      icon='🔢'
      screen='logical_patterns_quiz'
      shellTestId='kangur-logical-patterns-quiz-top-section'
      title='Quiz wzorców'
    >
      {({ handleHome }) => (
        <LogicalPatternsWorkshopGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
