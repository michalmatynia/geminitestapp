import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { KangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  return (
    <KangurGameQuizStage
      accent='violet'
      icon='🔷'
      screen='geometry_quiz'
      shellTestId='kangur-geometry-training-top-section'
    >
      {({ handleHome }) => <GeometryDrawingGame onFinish={handleHome} />}
    </KangurGameQuizStage>
  );
}
