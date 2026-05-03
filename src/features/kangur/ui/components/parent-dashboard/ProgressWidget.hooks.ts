'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import {
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
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
  DASHBOARD_ANALYTICS_DAILY_GOAL_GAMES,
  TOP_LESSON_INSIGHT_LIMIT,
  TOP_OPERATION_LIMIT,
} from './KangurParentDashboardProgressWidget.constants';
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
}) {
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

export function useKangurParentDashboardProgressWidgetState() {
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
      updateAssignment,
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
