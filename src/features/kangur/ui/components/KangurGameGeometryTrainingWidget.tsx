'use client';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen } = useKangurGameRuntime();

  if (screen !== 'geometry_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPanel className='w-full flex flex-col items-center gap-4' padding='xl' variant='elevated'>
        <h2 className='text-xl font-extrabold text-fuchsia-700'>🔷 Ćwiczenia z Figur</h2>
        <GeometryDrawingGame onFinish={handleHome} />
      </KangurPanel>
    </div>
  );
}
