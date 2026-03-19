'use client';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameAdditionQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='amber'
      icon='➕'
      screen='addition_quiz'
      shellTestId='kangur-addition-quiz-top-section'
    >
      {({ handleHome }) => <AddingBallGame finishLabelVariant='play' onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
