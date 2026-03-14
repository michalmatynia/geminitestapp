import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurParentDashboardScoresWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const {
    activeLearner,
    activeTab,
    basePath,
    canAccessDashboard,
    scoreViewerEmail,
    scoreViewerName,
  } = useKangurParentDashboardRuntime();
  const { entry: scoresContent } = useKangurPageContentEntry('parent-dashboard-scores');

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'scores')) {
    return null;
  }

  return (
    <div className='flex flex-col gap-5'>
      <KangurPanelIntro
        description={
          scoresContent?.summary ??
          'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.'
        }
        title={scoresContent?.title ?? 'Wyniki ucznia'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <ScoreHistory
        learnerId={activeLearner?.id ?? null}
        playerName={scoreViewerName}
        createdBy={scoreViewerEmail}
        basePath={basePath}
      />
    </div>
  );
}
