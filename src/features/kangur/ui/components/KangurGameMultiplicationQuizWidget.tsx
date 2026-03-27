import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import MultiplicationGame from '@/features/kangur/ui/components/MultiplicationGame';

export function KangurGameMultiplicationQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'violet',
    children: ({ handleHome }) => (
      <MultiplicationGame finishLabelVariant='play' onFinish={handleHome} />
    ),
    icon: '✖️',
    screen: 'multiplication_quiz',
    shellTestId: 'kangur-multiplication-quiz-top-section',
  });
}
