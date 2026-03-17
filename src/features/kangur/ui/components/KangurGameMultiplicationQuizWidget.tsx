import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

export function KangurGameMultiplicationQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      description='Sprawdź tabliczkę mnożenia w szybkim quizie.'
      icon='✖️'
      screen='multiplication_quiz'
      shellTestId='kangur-multiplication-quiz-top-section'
      title='Quiz mnożenia'
    >
      {({ handleHome }) => (
        <MultiplicationGame finishLabelVariant='play' onFinish={handleHome} />
      )}
    </KangurGameQuizStage>
  );
}
