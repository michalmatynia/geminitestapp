import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameSubtractionQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='rose'
      icon='➖'
      screen='subtraction_quiz'
      shellTestId='kangur-subtraction-quiz-top-section'
    >
      {({ handleHome }) => <SubtractingGame finishLabelVariant='play' onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
