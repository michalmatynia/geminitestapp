'use client';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  const { handleHome, screen, setScreen } = useKangurGameRuntime();

  if (screen !== 'geometry_quiz') {
    return null;
  }

  return (
    <LessonActivityStage
      accent='violet'
      backButtonLabel='Wróć do poprzedniej strony'
      description='Przejdz przez szybkie zadania z rozpoznawania i rysowania figur.'
      icon='🔷'
      onBack={() => setScreen('operation')}
      shellClassName='items-center'
      shellTestId='kangur-geometry-training-top-section'
      title='Ćwiczenia z Figurami'
    >
      <GeometryDrawingGame onFinish={handleHome} />
    </LessonActivityStage>
  );
}
