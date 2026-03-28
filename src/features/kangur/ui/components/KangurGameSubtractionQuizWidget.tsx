import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';

export function KangurGameSubtractionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'rose',
    children: ({ handleHome }) => <SubtractingGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➖',
    screen: 'subtraction_quiz',
    shellTestId: 'kangur-subtraction-quiz-top-section',
  });
}
