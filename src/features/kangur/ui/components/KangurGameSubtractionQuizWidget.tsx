import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameSubtractionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'rose',
    children: ({ handleHome }) => <SubtractingGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➖',
    screen: 'subtraction_quiz',
    shellTestId: 'kangur-subtraction-quiz-top-section',
  });
}
