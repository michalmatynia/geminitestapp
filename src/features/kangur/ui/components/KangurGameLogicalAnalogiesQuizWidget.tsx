'use client';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalAnalogiesRelationGame from '@/features/kangur/ui/components/LogicalAnalogiesRelationGame';

export function KangurGameLogicalAnalogiesQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='rose'
      description='Dopasuj relacje i znajdź właściwe analogie.'
      icon='🔗'
      screen='logical_analogies_quiz'
      shellTestId='kangur-logical-analogies-quiz-top-section'
      title='Quiz analogii'
    >
      {({ handleHome }) => (
        <LogicalAnalogiesRelationGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
