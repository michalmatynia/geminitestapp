'use client';

import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import LogicalClassificationGame from '@/features/kangur/ui/components/LogicalClassificationGame';

export function KangurGameLogicalClassificationQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='teal'
      description='Grupuj elementy i znajdź wspólne cechy.'
      icon='📦'
      screen='logical_classification_quiz'
      shellTestId='kangur-logical-classification-quiz-top-section'
      title='Quiz klasyfikacji'
    >
      {({ handleHome }) => (
        <LogicalClassificationGame finishLabel='Wróć do Grajmy' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
