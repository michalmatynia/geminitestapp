import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'emerald',
    children: ({ handleHome }) => <CalendarTrainingGame onFinish={handleHome} />,
    icon: '📅',
    screen: 'calendar_quiz',
    shellTestId: 'kangur-calendar-training-top-section',
  });
}
