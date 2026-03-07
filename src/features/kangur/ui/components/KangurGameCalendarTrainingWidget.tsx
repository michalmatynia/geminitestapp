'use client';

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurFeatureHeader, KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'calendar_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
        <KangurFeatureHeader
          accent='emerald'
          badgeSize='md'
          data-testid='kangur-calendar-training-header'
          headingSize='sm'
          icon='📅'
          title='Ćwiczenia z Kalendarzem'
        />
        <CalendarTrainingGame onFinish={handleHome} />
      </KangurPanel>
    </div>
  );
}
