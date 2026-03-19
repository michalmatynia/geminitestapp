import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='emerald'
      icon='📅'
      screen='calendar_quiz'
      shellTestId='kangur-calendar-training-top-section'
    >
      {({ handleHome }) => <CalendarTrainingGame onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
