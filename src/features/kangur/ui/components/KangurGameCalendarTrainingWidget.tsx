'use client';

import CalendarTrainingGame from '@/features/kangur/ui/components/CalendarTrainingGame';
import { KangurFeatureHeader, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameCalendarTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'calendar_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurGlassPanel
        className='w-full flex flex-col items-center gap-4'
        data-testid='kangur-calendar-training-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurFeatureHeader
          accent='emerald'
          badgeSize='md'
          data-testid='kangur-calendar-training-header'
          headingSize='sm'
          icon='📅'
          title='Ćwiczenia z Kalendarzem'
        />
        <CalendarTrainingGame onFinish={handleHome} />
      </KangurGlassPanel>
    </div>
  );
}
