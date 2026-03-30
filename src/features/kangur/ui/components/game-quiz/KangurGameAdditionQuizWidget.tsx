import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import { renderKangurGameQuizShell } from './KangurGameQuizShell';

export function KangurGameAdditionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'amber',
    children: ({ handleHome }) => <AddingBallGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➕',
    screen: 'addition_quiz',
    shellTestId: 'kangur-addition-quiz-top-section',
  });
}
