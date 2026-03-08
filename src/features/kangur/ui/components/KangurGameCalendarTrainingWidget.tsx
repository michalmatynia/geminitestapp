'use client';

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'calendar_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        accent='emerald'
        className='max-w-md'
        description='Sprawdz, jak dobrze orientujesz sie w datach, dniach tygodnia i miesiacach.'
        headingSize='lg'
        onBack={() => setScreen('operation')}
        testId='kangur-calendar-training-top-section'
        title='Ćwiczenia z Kalendarzem'
      />
      <CalendarTrainingGame onFinish={handleHome} />
    </div>
  );
}
