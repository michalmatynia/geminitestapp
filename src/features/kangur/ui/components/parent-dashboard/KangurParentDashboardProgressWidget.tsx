'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
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
import type { ParentDashboardRuntimeState } from './KangurParentDashboardProgressWidget.types';
import {
  buildActiveAssignments,
  buildLessonPanelCards,
  buildProgressTaskKindLabels,
  buildRecentAssignments,
  createProgressTimestampFormatter,
  resolveCompactActionClassName,
  resolveDailyQuestPresentation,
  resolveMaxWeeklyGames,
} from './KangurParentDashboardProgressWidget.utils';

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
