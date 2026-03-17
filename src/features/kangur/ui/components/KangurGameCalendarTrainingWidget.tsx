import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='emerald'
      description='Sprawdź, jak dobrze orientujesz się w datach, dniach tygodnia i miesiącach.'
      icon='📅'
      screen='calendar_quiz'
      shellTestId='kangur-calendar-training-top-section'
      title='Ćwiczenia z Kalendarzem'
    >
      {({ handleHome }) => <CalendarTrainingGame onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
