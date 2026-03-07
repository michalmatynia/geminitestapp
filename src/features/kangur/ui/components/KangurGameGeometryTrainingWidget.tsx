'use client';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurFeatureHeader, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'geometry_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurGlassPanel
        className='w-full flex flex-col items-center gap-4'
        data-testid='kangur-geometry-training-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurFeatureHeader
          accent='violet'
          badgeSize='md'
          data-testid='kangur-geometry-training-header'
          headingSize='sm'
          icon='🔷'
          title='Ćwiczenia z Figur'
        />
        <GeometryDrawingGame onFinish={handleHome} />
      </KangurGlassPanel>
    </div>
  );
}
