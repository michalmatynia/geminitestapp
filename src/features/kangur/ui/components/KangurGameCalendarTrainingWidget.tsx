'use client';

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'calendar_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='emerald'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Sprawdź, jak dobrze orientujesz się w datach, dniach tygodnia i miesiącach.'
      icon='📅'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-calendar-training-top-section'
      title='Ćwiczenia z Kalendarzem'
    >
      <CalendarTrainingGame onFinish={handleHome} />
    </LessonActivityStage>
  );
}
