'use client';

import { useTranslations } from 'next-intl';

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro, KangurPanelStack } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WIDGET_TITLE_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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
      <KangurPanelIntro
        description={
          assignmentsContent?.summary ??
          translations('widgets.assignments.description')
        }
        title={assignmentsContent?.title ?? translations('widgets.assignments.title')}
        titleAs='h2'
        titleClassName={KANGUR_WIDGET_TITLE_CLASSNAME}
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
