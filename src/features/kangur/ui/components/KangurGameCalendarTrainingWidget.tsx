import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'emerald',
    children: ({ handleHome }) => <CalendarTrainingGame onFinish={handleHome} />,
    icon: '📅',
    screen: 'calendar_quiz',
    shellTestId: 'kangur-calendar-training-top-section',
  });
}
