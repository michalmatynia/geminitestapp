import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

export function KangurGameDivisionQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='emerald'
      icon='➗'
      screen='division_quiz'
      shellTestId='kangur-division-quiz-top-section'
    >
      {({ handleHome }) => <DivisionGame finishLabelVariant='play' onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
