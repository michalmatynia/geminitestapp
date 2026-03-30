import { renderKangurGameQuizShell } from './KangurGameQuizShell';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

export function KangurGameDivisionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'emerald',
    children: ({ handleHome }) => <DivisionGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➗',
    screen: 'division_quiz',
    shellTestId: 'kangur-division-quiz-top-section',
  });
}
