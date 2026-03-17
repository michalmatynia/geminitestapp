import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameSubtractionQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='rose'
      description='Szybkie pytania z odejmowania w trybie quizu.'
      icon='➖'
      screen='subtraction_quiz'
      shellTestId='kangur-subtraction-quiz-top-section'
      title='Quiz odejmowania'
    >
      {({ handleHome }) => <SubtractingGame finishLabelVariant='play' onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
