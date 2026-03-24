import {
  type KangurParentDashboardPanelDisplayMode,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurParentDashboardScoresWidget({
  displayMode: _displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { canAccessDashboard } = useKangurParentDashboardRuntime();
  const { entry: scoresContent } = useKangurPageContentEntry('parent-dashboard-scores');

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        description={
          scoresContent?.summary ?? 'This widget moved to the Learner Profile screen.'
        }
        eyebrow={scoresContent?.title ?? 'Learner results moved'}
      />
    </section>
  );
}
