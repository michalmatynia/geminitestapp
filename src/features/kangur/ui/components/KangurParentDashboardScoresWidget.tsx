import { useTranslations } from 'next-intl';

import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import ProgressOverview from '@/features/kangur/ui/components/ProgressOverview';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurPanelStack,
  KangurSummaryPanel,
  KangurWidgetIntro,
} from '@/features/kangur/ui/design/primitives';
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
  const translations = useTranslations('KangurParentDashboard');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { subject, subjectKey } = useKangurSubjectFocus();
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

  const dailyQuest = getCurrentKangurDailyQuest(progress, {
    ownerKey: subjectKey,
    subject,
    translate: runtimeTranslations,
  });

  return (
    <KangurPanelStack>
      <KangurWidgetIntro
        description={
          scoresContent?.summary ??
          translations('widgets.scores.description')
        }
        title={scoresContent?.title ?? translations('widgets.scores.title')}
      />
      <KangurSummaryPanel
        accent='indigo'
        data-testid='parent-dashboard-track-summary'
        description={translations('widgets.scores.trackSummary.description')}
        label={translations('widgets.scores.trackSummary.label')}
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
    </KangurPanelStack>
  );
}
