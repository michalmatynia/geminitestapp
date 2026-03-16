import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro, KangurSummaryPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';

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
    progress,
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

  if (!activeLearner?.id) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress);

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        description={
          scoresContent?.summary ??
          'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.'
        }
        title={scoresContent?.title ?? 'Wyniki ucznia'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <KangurSummaryPanel
        accent='indigo'
        data-testid='parent-dashboard-track-summary'
        description='Najważniejsze ścieżki odznak, które aktualnie buduje uczeń.'
        label='Ścieżki postępu ucznia'
      >
        <div className='mt-3'>
          <KangurBadgeTrackHighlights
            dataTestIdPrefix='parent-dashboard-track'
            limit={3}
            progress={progress}
          />
        </div>
      </KangurSummaryPanel>
      <ProgressOverview progress={progress} dailyQuest={dailyQuest} />
      <ScoreHistory
        learnerId={activeLearner?.id ?? null}
        playerName={scoreViewerName}
        createdBy={scoreViewerEmail}
        basePath={basePath}
      />
    </div>
  );
}
