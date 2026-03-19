import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

export function KangurGameMultiplicationQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      icon='✖️'
      screen='multiplication_quiz'
      shellTestId='kangur-multiplication-quiz-top-section'
    >
      {({ handleHome }) => (
        <MultiplicationGame finishLabelVariant='play' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
