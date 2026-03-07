'use client';

import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

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

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'scores')) {
    return null;
  }

  return (
    <ScoreHistory
      learnerId={activeLearner?.id ?? null}
      playerName={scoreViewerName}
      createdBy={scoreViewerEmail}
      basePath={basePath}
    />
  );
}
