import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/KangurGameQuizShell';

export function KangurGameGeometryTrainingWidget(): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'violet',
    children: ({ handleHome }) => <GeometryDrawingGame onFinish={handleHome} />,
    icon: '🔷',
    screen: 'geometry_quiz',
    shellTestId: 'kangur-geometry-training-top-section',
  });
}
