import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

export function KangurParentDashboardAssignmentsWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeLearner, activeTab, basePath, canAccessDashboard } =
    useKangurParentDashboardRuntime();
  const { entry: assignmentsContent } = useKangurPageContentEntry('parent-dashboard-assignments');
  const activeLearnerId = activeLearner?.id ?? null;

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'assign')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  return (
    <div className='flex flex-col gap-5'>
      <KangurPanelIntro
        description={
          assignmentsContent?.summary ??
          'Nadaj priorytet pracy i sprawdź, co jest aktywne albo wymaga przypomnienia.'
        }
        title={assignmentsContent?.title ?? 'Zadania ucznia'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <KangurAssignmentManager basePath={basePath} />
    </div>
  );
}
