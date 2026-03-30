'use client';

import { useTranslations } from 'next-intl';

import KangurAssignmentManager from '@/features/kangur/ui/components/assignment-manager/KangurAssignmentManager';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurPanelIntro, KangurPanelStack } from '@/features/kangur/ui/design/primitives';
import { KANGUR_WIDGET_TITLE_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

type KangurParentDashboardAssignmentsRuntime = ReturnType<typeof useKangurParentDashboardRuntime>;

const shouldRenderKangurParentDashboardAssignmentsWidget = ({
  activeLearnerId,
  activeTab,
  canAccessDashboard,
  displayMode,
}: {
  activeLearnerId: string | null;
  activeTab: KangurParentDashboardAssignmentsRuntime['activeTab'];
  canAccessDashboard: boolean;
  displayMode: KangurParentDashboardPanelDisplayMode;
}): boolean => {
  if (!canAccessDashboard) {
    return false;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'assign')) {
    return false;
  }

  return Boolean(activeLearnerId);
};

const resolveKangurParentDashboardAssignmentsIntro = ({
  assignmentsContent,
  translations,
}: {
  assignmentsContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
  translations: ReturnType<typeof useTranslations>;
}): { description: string; title: string } => ({
  description:
    assignmentsContent?.summary ?? translations('widgets.assignments.description'),
  title: assignmentsContent?.title ?? translations('widgets.assignments.title'),
});

const resolveKangurParentDashboardActiveLearnerId = (
  activeLearner: KangurParentDashboardAssignmentsRuntime['activeLearner']
): string | null => activeLearner?.id ?? null;

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
  const activeLearnerId = resolveKangurParentDashboardActiveLearnerId(activeLearner);
  const intro = resolveKangurParentDashboardAssignmentsIntro({
    assignmentsContent,
    translations,
  });

  if (
    !shouldRenderKangurParentDashboardAssignmentsWidget({
      activeLearnerId,
      activeTab,
      canAccessDashboard,
      displayMode,
    })
  ) {
    return null;
  }

  return (
    <KangurPanelStack>
      <KangurPanelIntro
        description={intro.description}
        title={intro.title}
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
        key={activeLearnerId}
      />
    </KangurPanelStack>
  );
}
