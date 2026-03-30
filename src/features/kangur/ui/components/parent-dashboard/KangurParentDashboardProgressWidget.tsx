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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_WIDGET_TITLE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import {
  DASHBOARD_ANALYTICS_DAILY_GOAL_GAMES,
  TOP_LESSON_INSIGHT_LIMIT,
  TOP_OPERATION_LIMIT,
} from './KangurParentDashboardProgressWidget.constants';
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

function useKangurParentDashboardProgressArchiveAction({
  archiveAssignmentErrorLabel,
  updateAssignment,
}: {
  archiveAssignmentErrorLabel: string;
  updateAssignment: NonNullable<ParentDashboardRuntimeState['updateAssignment']>;
}): {
  archiveError: string | null;
  handleArchiveAssignment: (assignmentId: string) => Promise<void>;
} {
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleArchiveAssignment = async (assignmentId: string): Promise<void> => {
    setArchiveError(null);
    await withKangurClientError(
      {
        source: 'kangur-parent-dashboard',
        action: 'archive-assignment',
        description: 'Archive a learner assignment from the parent dashboard.',
        context: {
          assignmentId,
        },
      },
      async () => {
        await updateAssignment(assignmentId, { archived: true });
      },
      {
        fallback: undefined,
        onError: () => {
          setArchiveError(archiveAssignmentErrorLabel);
        },
      }
    );
  };

  return {
    archiveError,
    handleArchiveAssignment,
  };
}

function useKangurParentDashboardProgressWidgetState() {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const {
    assignments = [],
    assignmentsError,
    basePath,
    isLoadingAssignments = false,
    isLoadingScores = false,
    lessons = [],
    progress,
    scores = [],
    scoresError,
    updateAssignment,
  } = useKangurParentDashboardRuntime();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const isCoarsePointer = useKangurCoarsePointer();
  const { entry: progressContent } = useKangurPageContentEntry('parent-dashboard-progress');
  const taskKindLabels = buildProgressTaskKindLabels(translations);
  const activeAssignmentsEmptyLabel = translations('widgets.progress.assignments.activeEmpty');
  const activeAssignmentsErrorLabel = translations('widgets.progress.assignments.loadError');
  const assignmentsLoadingLabel = translations('widgets.progress.assignments.loading');
  const archiveAssignmentErrorLabel = translations('widgets.progress.assignments.archiveError');
  const compactActionClassName = resolveCompactActionClassName(isCoarsePointer);
  const recentAssignmentsTitle = translations('widgets.progress.assignments.recentTitle');
  const recentAssignmentsSummary = translations('widgets.progress.assignments.recentSummary');
  const recentAssignmentsEmptyLabel = translations('widgets.progress.assignments.recentEmpty');
  const openedTasks = progress.openedTasks ?? [];
  const lessonPanelProgress = progress.lessonPanelProgress ?? {};
  const activeAssignments = useMemo(() => buildActiveAssignments(assignments), [assignments]);
  const recentAssignments = useMemo(
    () => buildRecentAssignments(activeAssignments),
    [activeAssignments]
  );
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const recentAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, recentAssignments),
    [basePath, recentAssignments]
  );
  const lessonPanelCards = useMemo(
    () => buildLessonPanelCards({ lessonPanelProgress, lessons }),
    [lessonPanelProgress, lessons]
  );
  const snapshot = useMemo(
    () =>
      buildKangurLearnerProfileSnapshot({
        progress,
        scores,
        dailyGoalGames: DASHBOARD_ANALYTICS_DAILY_GOAL_GAMES,
        locale,
      }),
    [locale, progress, scores]
  );
  const maxWeeklyGames = useMemo(
    () => resolveMaxWeeklyGames(snapshot.weeklyActivity),
    [snapshot.weeklyActivity]
  );
  const topOperationPerformance = useMemo(
    () => snapshot.operationPerformance.slice(0, TOP_OPERATION_LIMIT),
    [snapshot.operationPerformance]
  );
  const lessonMasteryInsights = useMemo(
    () => buildLessonMasteryInsights(progress, TOP_LESSON_INSIGHT_LIMIT, locale),
    [locale, progress]
  );
  const dailyQuest = getCurrentKangurDailyQuest(progress, {
    ownerKey: subjectKey,
    subject,
    translate: runtimeTranslations,
  });
  const dailyQuestPresentation = resolveDailyQuestPresentation({
    basePath,
    dailyQuest,
    translations,
  });
  const formatTimestamp = createProgressTimestampFormatter({
    fallback: translations('widgets.progress.timestampUnavailable'),
    locale,
  });
  const { archiveError, handleArchiveAssignment } =
    useKangurParentDashboardProgressArchiveAction({
      archiveAssignmentErrorLabel,
      updateAssignment: updateAssignment!,
    });

  return {
    activeAssignmentItems,
    activeAssignmentsEmptyLabel,
    activeAssignmentsErrorLabel,
    archiveError,
    assignments,
    assignmentsError,
    assignmentsLoadingLabel,
    basePath,
    compactActionClassName,
    dailyQuest,
    dailyQuestPresentation,
    formatTimestamp,
    handleArchiveAssignment,
    isLoadingAssignments,
    isLoadingScores,
    lessonMasteryInsights,
    lessonPanelCards,
    lessons,
    locale,
    maxWeeklyGames,
    openedTasks,
    progressContent,
    recentAssignmentItems,
    recentAssignmentsEmptyLabel,
    recentAssignmentsSummary,
    recentAssignmentsTitle,
    scoresError,
    snapshot,
    strongestLessons: lessonMasteryInsights.strongest.slice(0, 2),
    taskKindLabels,
    topOperationPerformance,
    translations,
    updateAssignment,
    weakestLessons: lessonMasteryInsights.weakest.slice(0, 2),
  };
}

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

  return <KangurParentDashboardProgressWidgetContent />;
}

function KangurParentDashboardProgressWidgetContent(): React.JSX.Element {
  const {
    activeAssignmentItems,
    activeAssignmentsEmptyLabel,
    activeAssignmentsErrorLabel,
    archiveError,
    assignments,
    assignmentsError,
    assignmentsLoadingLabel,
    basePath,
    compactActionClassName,
    dailyQuest,
    dailyQuestPresentation,
    formatTimestamp,
    handleArchiveAssignment,
    isLoadingAssignments,
    isLoadingScores,
    lessonMasteryInsights,
    lessonPanelCards,
    lessons,
    locale,
    maxWeeklyGames,
    openedTasks,
    progressContent,
    recentAssignmentItems,
    recentAssignmentsEmptyLabel,
    recentAssignmentsSummary,
    recentAssignmentsTitle,
    scoresError,
    snapshot,
    strongestLessons,
    taskKindLabels,
    topOperationPerformance,
    translations,
    updateAssignment,
    weakestLessons,
  } = useKangurParentDashboardProgressWidgetState();

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
      <KangurParentDashboardAnalyticsSection
        snapshot={snapshot}
        translations={translations}
      />
      <KangurParentDashboardWeeklyActivitySection
        isLoadingScores={isLoadingScores}
        maxWeeklyGames={maxWeeklyGames}
        scoresError={scoresError}
        snapshot={snapshot}
        translations={translations}
      />
      <div className='grid gap-4 xl:grid-cols-2'>
        <KangurParentDashboardOperationFocusSection
          topOperationPerformance={topOperationPerformance}
          translations={translations}
        />
        <KangurParentDashboardMasterySummarySection
          lessonMasteryInsights={lessonMasteryInsights}
          strongestLessons={strongestLessons}
          translations={translations}
          weakestLessons={weakestLessons}
        />
      </div>
      <KangurParentDashboardDailyQuestSection
        compactActionClassName={compactActionClassName}
        dailyQuest={dailyQuest}
        dailyQuestPresentation={dailyQuestPresentation}
        translations={translations}
      />
      <KangurParentDashboardOpenedTasksSection
        compactActionClassName={compactActionClassName}
        formatTimestamp={formatTimestamp}
        openedTasks={openedTasks}
        taskKindLabels={taskKindLabels}
        translations={translations}
      />
      <KangurParentDashboardAssignmentsSection
        activeAssignmentItems={activeAssignmentItems}
        activeAssignmentsEmptyLabel={activeAssignmentsEmptyLabel}
        activeAssignmentsErrorLabel={activeAssignmentsErrorLabel}
        assignmentsLoadingLabel={assignmentsLoadingLabel}
        archiveError={archiveError}
        assignments={assignments}
        assignmentsError={assignmentsError}
        basePath={basePath}
        handleArchiveAssignment={handleArchiveAssignment}
        isLoadingAssignments={isLoadingAssignments}
        lessons={lessons}
        preloadedUpdateAssignment={updateAssignment!}
        recentAssignmentItems={recentAssignmentItems}
        recentAssignmentsEmptyLabel={recentAssignmentsEmptyLabel}
        recentAssignmentsSummary={recentAssignmentsSummary}
        recentAssignmentsTitle={recentAssignmentsTitle}
        translations={translations}
      />
      <KangurParentDashboardLessonProgressSection
        lessonPanelCards={lessonPanelCards}
        locale={locale}
        translations={translations}
      />
    </KangurPanelStack>
  );
}
