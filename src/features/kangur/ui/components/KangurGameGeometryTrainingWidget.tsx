'use client';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'geometry_quiz') {
    return null;
  }

  return (
    <div className='w-full max-w-lg flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        accent='violet'
        className='max-w-md'
        description='Przejdz przez szybkie zadania z rozpoznawania i rysowania figur.'
        onBack={() => setScreen('operation')}
        testId='kangur-geometry-training-top-section'
        title='Ćwiczenia z Figurami'
      />
      <GeometryDrawingGame onFinish={handleHome} />
    </div>
  );
}
