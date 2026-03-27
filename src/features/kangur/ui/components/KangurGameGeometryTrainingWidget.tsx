import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { renderKangurGameQuizStage } from '@/features/kangur/ui/components/KangurGameQuizStage';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  return renderKangurGameQuizStage({
    accent: 'violet',
    children: ({ handleHome }) => <GeometryDrawingGame onFinish={handleHome} />,
    icon: '🔷',
    screen: 'geometry_quiz',
    shellTestId: 'kangur-geometry-training-top-section',
  });
}
