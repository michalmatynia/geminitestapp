'use client';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurFeatureHeader, KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'geometry_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
        <KangurFeatureHeader
          accent='violet'
          badgeSize='md'
          data-testid='kangur-geometry-training-header'
          headingSize='sm'
          icon='🔷'
          title='Ćwiczenia z Figur'
        />
        <GeometryDrawingGame onFinish={handleHome} />
      </KangurPanel>
    </div>
  );
}
