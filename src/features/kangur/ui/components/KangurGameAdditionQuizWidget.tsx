'use client';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameAdditionQuizWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'amber',
    children: ({ handleHome }) => <AddingBallGame finishLabelVariant='play' onFinish={handleHome} />,
    icon: '➕',
    screen: 'addition_quiz',
    shellTestId: 'kangur-addition-quiz-top-section',
  });
}
