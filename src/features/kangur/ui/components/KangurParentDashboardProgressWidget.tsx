'use client';

import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

export function KangurParentDashboardProgressWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard, progress } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress);

  return <ProgressOverview progress={progress} dailyQuest={dailyQuest} />;
}
