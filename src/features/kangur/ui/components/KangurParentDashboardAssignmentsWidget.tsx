'use client';

import { useMemo } from 'react';

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

export function KangurParentDashboardAssignmentsWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, basePath, canAccessDashboard, progress } = useKangurParentDashboardRuntime();
  const dailyQuest = useMemo(() => getCurrentKangurDailyQuest(progress), [progress]);

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'assign')) {
    return null;
  }

  return <KangurAssignmentManager basePath={basePath} featuredDailyQuest={dailyQuest} />;
}
