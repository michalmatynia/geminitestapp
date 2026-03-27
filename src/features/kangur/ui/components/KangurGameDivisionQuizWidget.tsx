import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';
import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

export function KangurGameDivisionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'emerald',
    children: ({ handleHome }) => <DivisionGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➗',
    screen: 'division_quiz',
    shellTestId: 'kangur-division-quiz-top-section',
  });
}
