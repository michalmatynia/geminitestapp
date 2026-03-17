import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

export function KangurGameDivisionQuizWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='emerald'
      description='Sprawdź dzielenie w szybkim quizie.'
      icon='➗'
      screen='division_quiz'
      shellTestId='kangur-division-quiz-top-section'
      title='Quiz dzielenia'
    >
      {({ handleHome }) => <DivisionGame finishLabelVariant='play' onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
