'use client';

import { useTranslations } from 'next-intl';

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelStack, KangurWidgetIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
export function KangurParentDashboardAssignmentsWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const translations = useTranslations('KangurParentDashboard');
  const {
    activeLearner,
    activeTab,
    assignments = [],
    assignmentsError,
    basePath,
    canAccessDashboard,
    createAssignment,
    isLoadingAssignments = false,
    lessons = [],
    reassignAssignment,
    updateAssignment,
  } = useKangurParentDashboardRuntime();
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
    <KangurPanelStack>
      <KangurWidgetIntro
        description={
          assignmentsContent?.summary ??
          translations('widgets.assignments.description')
        }
        title={assignmentsContent?.title ?? translations('widgets.assignments.title')}
      />
      <KangurAssignmentManager
        basePath={basePath}
        preloadedAssignments={assignments}
        preloadedAssignmentsError={assignmentsError}
        preloadedCreateAssignment={createAssignment}
        preloadedLessons={lessons}
        preloadedLoading={isLoadingAssignments}
        preloadedReassignAssignment={reassignAssignment}
        preloadedUpdateAssignment={updateAssignment}
        view='catalogWithLists'
        key={activeLearnerId ?? 'no-learner'}
      />
    </KangurPanelStack>
  );
}
