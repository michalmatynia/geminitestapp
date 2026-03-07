'use client';

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'calendar_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
        <h2 className='text-xl font-extrabold text-green-700'>📅 Ćwiczenia z Kalendarzem</h2>
        <CalendarTrainingGame onFinish={handleHome} />
      </KangurPanel>
    </div>
  );
}
