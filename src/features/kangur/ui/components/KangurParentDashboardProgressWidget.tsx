'use client';

import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

export function KangurParentDashboardProgressWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard, progress } = useKangurParentDashboardRuntime();
  const { entry: progressContent } = useKangurPageContentEntry('parent-dashboard-progress');

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress);

  return (
    <div className='flex flex-col gap-5'>
      <KangurPanelIntro
        description={
          progressContent?.summary ??
          'Sprawdz rytm nauki, poziom, misje dnia i glowny kierunek dalszej pracy.'
        }
        title={progressContent?.title ?? 'Postep ucznia'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <ProgressOverview progress={progress} dailyQuest={dailyQuest} />
    </div>
  );
}
