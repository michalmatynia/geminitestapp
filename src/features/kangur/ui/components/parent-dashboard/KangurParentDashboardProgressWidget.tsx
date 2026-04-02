'use client';

import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurPanelIntro,
  KangurPanelStack,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_WIDGET_TITLE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import {
  KangurParentDashboardAnalyticsSection,
  KangurParentDashboardWeeklyActivitySection,
  KangurParentDashboardOperationFocusSection,
  KangurParentDashboardMasterySummarySection,
  KangurParentDashboardDailyQuestSection,
  KangurParentDashboardOpenedTasksSection,
  KangurParentDashboardAssignmentsSection,
  KangurParentDashboardLessonProgressSection,
} from './KangurParentDashboardProgressWidget.sections';
import { ProgressWidgetProvider, useProgressWidgetContext } from './ProgressWidget.context';

export function KangurParentDashboardProgressWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeLearner, activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  if (!activeLearner?.id) {
    return null;
  }

  return (
    <ProgressWidgetProvider>
      <KangurParentDashboardProgressWidgetContent />
    </ProgressWidgetProvider>
  );
}

function KangurParentDashboardProgressWidgetContent(): React.JSX.Element {
  const { progressContent, translations } = useProgressWidgetContext();

  return (
    <KangurPanelStack>
      <KangurPanelIntro
        description={
          progressContent?.summary ??
          translations('widgets.progress.description')
        }
        title={progressContent?.title ?? translations('widgets.progress.title')}
        titleAs='h2'
        titleClassName={KANGUR_WIDGET_TITLE_CLASSNAME}
      />
      <KangurParentDashboardAnalyticsSection />
      <KangurParentDashboardWeeklyActivitySection />
      <div className='grid gap-4 xl:grid-cols-2'>
        <KangurParentDashboardOperationFocusSection />
        <KangurParentDashboardMasterySummarySection />
      </div>
      <KangurParentDashboardDailyQuestSection />
      <KangurParentDashboardOpenedTasksSection />
      <KangurParentDashboardAssignmentsSection />
      <KangurParentDashboardLessonProgressSection />
    </KangurPanelStack>
  );
}
