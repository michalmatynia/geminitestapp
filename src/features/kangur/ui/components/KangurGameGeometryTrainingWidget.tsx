import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      description='Przejdź przez szybkie zadania z rozpoznawania i rysowania figur.'
      icon='🔷'
      screen='geometry_quiz'
      shellTestId='kangur-geometry-training-top-section'
      title='Ćwiczenia z Figurami'
    >
      {({ handleHome }) => <GeometryDrawingGame onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
