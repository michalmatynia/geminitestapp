'use client';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurActivityColumn,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurMetaText,
  KangurPanelStack,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurWidgetIntro,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurParentDashboardScores } from '@/features/kangur/ui/hooks/useKangurParentDashboardScores';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
} from '@/features/kangur/ui/services/profile';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_COMPACT_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';


const RECENT_ACTIVE_ASSIGNMENTS_LIMIT = 3;
const DASHBOARD_ANALYTICS_DAILY_GOAL_GAMES = 3;
const TOP_OPERATION_LIMIT = 4;
const TOP_LESSON_INSIGHT_LIMIT = 3;

const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const formatProgressTimestamp = ({
  value,
  locale,
  fallback,
}: {
  value: string | null | undefined;
  locale: string;
  fallback: string;
}): string => {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const normalizePanelLabel = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallback.replace(/_/g, ' ').trim();
};

export function KangurParentDashboardProgressWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { activeLearner, activeTab, basePath, canAccessDashboard, progress, user } =
    useKangurParentDashboardRuntime();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const isCoarsePointer = useKangurCoarsePointer();
  const { entry: progressContent } = useKangurPageContentEntry('parent-dashboard-progress');
  const lessonsQuery = useKangurLessons({ ageGroup, enabledOnly: true });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const activeLearnerId = activeLearner?.id ?? null;
  const activeLearnerName =
    activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;
  const createdBy = user?.email?.trim() || null;
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const taskKindLabels: Record<string, string> = {
    game: translations('widgets.progress.taskKind.game'),
    lesson: translations('widgets.progress.taskKind.lesson'),
    test: translations('widgets.progress.taskKind.test'),
  };
  const formatTimestamp = (value: string | null | undefined): string =>
    formatProgressTimestamp({
      value,
      locale,
      fallback: translations('widgets.progress.timestampUnavailable'),
    });
  const activeAssignmentsTitle = translations('widgets.progress.assignments.activeTitle');
  const activeAssignmentsEmptyLabel = translations('widgets.progress.assignments.activeEmpty');
  const activeAssignmentsErrorLabel = translations('widgets.progress.assignments.loadError');
  const archiveAssignmentErrorLabel = translations('widgets.progress.assignments.archiveError');
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 sm:w-auto sm:shrink-0'
    : 'w-full sm:w-auto sm:shrink-0';
  const recentAssignmentsTitle = translations('widgets.progress.assignments.recentTitle');
  const recentAssignmentsSummary = translations('widgets.progress.assignments.recentSummary');
  const recentAssignmentsEmptyLabel = translations('widgets.progress.assignments.recentEmpty');
  const {
    isLoadingScores,
    scores,
    scoresError,
  } = useKangurParentDashboardScores({
    createdBy,
    enabled: Boolean(activeLearnerId && canAccessDashboard),
    learnerId: activeLearnerId,
    playerName: activeLearnerName,
    subject,
  });
  const {
    assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    updateAssignment,
  } = useKangurAssignments({
    enabled: Boolean(activeLearnerId),
    query: {
      includeArchived: false,
    },
  });
  const openedTasks = progress.openedTasks ?? [];
  const lessonPanelProgress = progress.lessonPanelProgress ?? {};
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
      ),
    [assignments]
  );
  const recentAssignments = useMemo(
    () =>
      activeAssignments
        .slice()
        .sort((left, right) => {
          const leftTimestamp = Date.parse(left.progress.lastActivityAt ?? left.updatedAt);
          const rightTimestamp = Date.parse(right.progress.lastActivityAt ?? right.updatedAt);
          return rightTimestamp - leftTimestamp;
        })
        .slice(0, RECENT_ACTIVE_ASSIGNMENTS_LIMIT),
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
    () =>
      lessons
        .map((lesson) => {
          const panels = lessonPanelProgress[lesson.componentId] ?? {};
          const entries = Object.entries(panels);
          if (entries.length === 0) {
            return null;
          }

          const totals = entries.reduce(
            (acc, [, entry]) => ({
              viewed: acc.viewed + Math.min(entry.viewedCount, entry.totalCount),
              total: acc.total + entry.totalCount,
            }),
            { viewed: 0, total: 0 }
          );
          const percent = totals.total > 0 ? Math.round((totals.viewed / totals.total) * 100) : 0;
          const sectionEntries = entries
            .map(([sectionId, entry]) => ({
              id: sectionId,
              label: normalizePanelLabel(entry.label, sectionId),
              viewedCount: entry.viewedCount,
              totalCount: entry.totalCount,
            }))
            .sort((left, right) => left.label.localeCompare(right.label));

          return {
            lesson,
            percent,
            viewed: totals.viewed,
            total: totals.total,
            sections: sectionEntries,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
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
    () => Math.max(1, ...snapshot.weeklyActivity.map((point) => point.games)),
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

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress, {
    ownerKey: subjectKey,
    subject,
    translate: runtimeTranslations,
  });
  const dailyQuestAction = dailyQuest?.assignment.action ?? null;
  const dailyQuestHref = dailyQuestAction ? buildAssignmentHref(basePath, dailyQuestAction) : null;
  const dailyQuestTargetPage = dailyQuestAction?.page ?? null;
  const dailyQuestAccent =
    dailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : dailyQuest?.progress.status === 'completed'
        ? 'amber'
        : dailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';
  const dailyQuestRewardAccent =
    dailyQuest?.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent;
  const dailyQuestActionLabel = dailyQuestAction?.label ?? '';
  const dailyQuestDescription = dailyQuest?.assignment.description ?? '';
  const dailyQuestProgressSummary = dailyQuest?.progress.summary ?? '';
  const dailyQuestProgressLabel = dailyQuest ? `${dailyQuest.progress.percent}%` : '';
  const dailyQuestLabel =
    dailyQuest?.assignment.questLabel ?? translations('widgets.progress.dailyQuest.questLabel');
  const dailyQuestRewardLabel = dailyQuest?.reward.label ?? '';
  const dailyQuestTitle = dailyQuest?.assignment.title ?? '';

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
  const strongestLessons = lessonMasteryInsights.strongest.slice(0, 2);
  const weakestLessons = lessonMasteryInsights.weakest.slice(0, 2);

  return (
    <KangurPanelStack>
      <KangurWidgetIntro
        description={
          progressContent?.summary ??
          translations('widgets.progress.description')
        }
        title={progressContent?.title ?? translations('widgets.progress.title')}
      />
      <KangurSummaryPanel
        accent='indigo'
        className='mt-1'
        data-testid='parent-dashboard-progress-analytics'
        description={translations('widgets.progress.analytics.description')}
        label={translations('widgets.progress.analytics.label')}
      >
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <KangurMetricCard
            accent='indigo'
            data-testid='parent-dashboard-progress-analytics-average-accuracy'
            description={translations('widgets.progress.analytics.averageAccuracyDescription', {
              best: snapshot.bestAccuracy,
            })}
            label={translations('widgets.progress.analytics.averageAccuracyLabel')}
            value={`${snapshot.averageAccuracy}%`}
          />
          <KangurMetricCard
            accent='amber'
            data-testid='parent-dashboard-progress-analytics-streak'
            description={translations('widgets.progress.analytics.streakDescription', {
              longest: snapshot.longestStreakDays,
            })}
            label={translations('widgets.progress.analytics.streakLabel')}
            value={snapshot.currentStreakDays}
          />
          <KangurMetricCard
            accent='violet'
            data-testid='parent-dashboard-progress-analytics-xp'
            description={translations('widgets.progress.analytics.xpDescription', {
              weeklyXp: snapshot.weeklyXpEarned,
              averageXp: snapshot.averageXpPerSession,
            })}
            label={translations('widgets.progress.analytics.xpLabel')}
            value={`+${snapshot.todayXpEarned}`}
          />
          <KangurMetricCard
            accent='teal'
            data-testid='parent-dashboard-progress-analytics-daily-goal'
            description={translations('widgets.progress.analytics.dailyGoalDescription', {
              percent: snapshot.dailyGoalPercent,
            })}
            label={translations('widgets.progress.analytics.dailyGoalLabel')}
            value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
          />
        </div>
      </KangurSummaryPanel>
      <KangurSummaryPanel
        accent='violet'
        className='mt-1'
        data-testid='parent-dashboard-progress-weekly-activity'
        description={translations('widgets.progress.weeklyActivity.description')}
        label={translations('widgets.progress.weeklyActivity.label')}
      >
        <div className='mt-3 flex flex-wrap gap-2'>
          {isLoadingScores ? (
            <KangurStatusChip className='bg-slate-100 text-slate-700'>
              {translations('widgets.progress.weeklyActivity.loading')}
            </KangurStatusChip>
          ) : null}
          {scoresError ? (
            <KangurStatusChip className='bg-rose-100 text-rose-700'>
              {translations('widgets.progress.weeklyActivity.error')}
            </KangurStatusChip>
          ) : null}
        </div>
        <div className='mt-3 rounded-[26px] border border-violet-200/70 bg-white/78 px-4 py-4'>
          <div className='flex h-36 items-end gap-2'>
            {snapshot.weeklyActivity.map((point) => {
              const heightPercent =
                point.games === 0
                  ? 8
                  : Math.max(16, Math.round((point.games / maxWeeklyGames) * 100));
              return (
                <div
                  key={point.dateKey}
                  className='flex min-w-0 flex-1 flex-col items-center gap-1.5'
                >
                  <div className='text-[11px] font-semibold text-violet-700'>
                    {point.games}
                  </div>
                  <KangurActivityColumn
                    accent='violet'
                    active={point.games > 0}
                    data-testid={`parent-dashboard-progress-weekly-activity-${point.dateKey}`}
                    title={translations('widgets.progress.weeklyActivity.barTitle', {
                      count: point.games,
                      accuracy: point.averageAccuracy,
                    })}
                    value={heightPercent}
                  />
                  <div className='text-[11px] [color:var(--kangur-page-muted-text)]'>
                    {point.label}
                  </div>
                  <div className='text-[10px] text-slate-400'>{point.averageAccuracy}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </KangurSummaryPanel>
      <div className='grid gap-4 xl:grid-cols-2'>
        <KangurSummaryPanel
          accent='sky'
          className='mt-1'
          data-testid='parent-dashboard-progress-operation-focus'
          description={translations('widgets.progress.operationFocus.description')}
          label={translations('widgets.progress.operationFocus.label')}
        >
          <div className='mt-3 flex flex-col kangur-panel-gap'>
            {topOperationPerformance.length > 0 ? (
              topOperationPerformance.map((item) => (
                <div key={item.operation} className='rounded-[20px] border border-sky-200/70 bg-white/82 px-4 py-3'>
                  <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                    <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {item.emoji} {item.label}
                    </div>
                    <div className='text-sm font-semibold text-sky-700'>
                      {item.averageAccuracy}%
                    </div>
                  </div>
                  <KangurProgressBar
                    accent='sky'
                    aria-label={translations('widgets.progress.operationFocus.progressAria', {
                      title: item.label,
                    })}
                    className='mt-2'
                    size='sm'
                    value={item.averageAccuracy}
                  />
                  <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs [color:var(--kangur-page-muted-text)]'>
                    <span>
                      {translations('widgets.progress.operationFocus.attempts', {
                        count: item.attempts,
                      })}
                    </span>
                    <span>
                      {translations('widgets.progress.operationFocus.averageXp', {
                        xp: item.averageXpPerSession,
                      })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                {translations('widgets.progress.operationFocus.empty')}
              </div>
            )}
          </div>
        </KangurSummaryPanel>
        <KangurSummaryPanel
          accent='amber'
          className='mt-1'
          data-testid='parent-dashboard-progress-mastery-summary'
          description={translations('widgets.progress.masterySummary.description')}
          label={translations('widgets.progress.masterySummary.label')}
        >
          <div className='mt-3 grid gap-3 sm:grid-cols-3'>
            <KangurMetricCard
              accent='amber'
              data-testid='parent-dashboard-progress-mastery-tracked'
              label={translations('widgets.progress.masterySummary.trackedLabel')}
              value={lessonMasteryInsights.trackedLessons}
            />
            <KangurMetricCard
              accent='emerald'
              data-testid='parent-dashboard-progress-mastery-mastered'
              label={translations('widgets.progress.masterySummary.masteredLabel')}
              value={lessonMasteryInsights.masteredLessons}
            />
            <KangurMetricCard
              accent='rose'
              data-testid='parent-dashboard-progress-mastery-needs-practice'
              label={translations('widgets.progress.masterySummary.needsPracticeLabel')}
              value={lessonMasteryInsights.lessonsNeedingPractice}
            />
          </div>
          {lessonMasteryInsights.trackedLessons > 0 ? (
            <div className='mt-4 grid gap-3 lg:grid-cols-2'>
              <div className='rounded-[20px] border border-rose-200/70 bg-white/82 px-4 py-3'>
                <div className='text-xs font-bold uppercase tracking-[0.18em] text-rose-700'>
                  {translations('widgets.progress.masterySummary.weakestLabel')}
                </div>
                <div className='mt-2 flex flex-col gap-2'>
                  {weakestLessons.map((lesson) => (
                    <div key={lesson.componentId}>
                      <div className='flex items-center justify-between gap-2 text-sm'>
                        <span className='min-w-0 truncate font-semibold [color:var(--kangur-page-text)]'>
                          {lesson.emoji} {lesson.title}
                        </span>
                        <span className='shrink-0 text-rose-700'>{lesson.masteryPercent}%</span>
                      </div>
                      <KangurProgressBar accent='rose' className='mt-1' size='sm' value={lesson.masteryPercent} />
                    </div>
                  ))}
                </div>
              </div>
              <div className='rounded-[20px] border border-emerald-200/70 bg-white/82 px-4 py-3'>
                <div className='text-xs font-bold uppercase tracking-[0.18em] text-emerald-700'>
                  {translations('widgets.progress.masterySummary.strongestLabel')}
                </div>
                <div className='mt-2 flex flex-col gap-2'>
                  {strongestLessons.map((lesson) => (
                    <div key={lesson.componentId}>
                      <div className='flex items-center justify-between gap-2 text-sm'>
                        <span className='min-w-0 truncate font-semibold [color:var(--kangur-page-text)]'>
                          {lesson.emoji} {lesson.title}
                        </span>
                        <span className='shrink-0 text-emerald-700'>{lesson.masteryPercent}%</span>
                      </div>
                      <KangurProgressBar accent='emerald' className='mt-1' size='sm' value={lesson.masteryPercent} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('widgets.progress.masterySummary.empty')}
            </div>
          )}
        </KangurSummaryPanel>
      </div>
      {dailyQuest ? (
        <KangurSummaryPanel
          accent='violet'
          className='mt-1'
          data-testid='parent-dashboard-daily-quest'
          description={translations('widgets.progress.dailyQuest.description')}
          label={translations('widgets.progress.dailyQuest.label')}
        >
          <div className='mt-3 flex flex-col kangur-panel-gap rounded-[28px] border border-violet-200/80 bg-white/82 px-4 py-4'>
            <KangurDailyQuestHighlightCardContent
              action={
                dailyQuestHref ? (
                  <KangurButton asChild className={compactActionClassName} size='sm' variant='surface'>
                    <Link
                      href={dailyQuestHref}
                      targetPageKey={dailyQuestTargetPage ?? undefined}
                      transitionAcknowledgeMs={110}
                      transitionSourceId='parent-dashboard:daily-quest'
                    >
                      {dailyQuestActionLabel}
                    </Link>
                  </KangurButton>
                ) : null
              }
              chipLabelStyle='compact'
              description={dailyQuestDescription}
              descriptionClassName='mt-1 text-slate-600'
              descriptionRelaxed
              descriptionSize='sm'
              footer={
                <KangurMetaText caps className='mt-2' tone='slate'>
                  {dailyQuestProgressSummary}
                </KangurMetaText>
              }
              progressAccent={dailyQuestAccent}
              progressLabel={dailyQuestProgressLabel}
              questLabel={dailyQuestLabel}
              rewardAccent={dailyQuestRewardAccent}
              rewardLabel={dailyQuestRewardLabel}
              title={dailyQuestTitle}
              titleClassName='text-slate-900'
            />
          </div>
        </KangurSummaryPanel>
      ) : null}
      <KangurSummaryPanel
        accent='indigo'
        className='mt-1'
        description={translations('widgets.progress.openedTasks.description')}
        label={translations('widgets.progress.openedTasks.label')}
      >
        {openedTasks.length > 0 ? (
          <ul
            className='mt-3 flex flex-col kangur-panel-gap'
            aria-label={translations('widgets.progress.openedTasks.listAria')}
          >
            {openedTasks.map((task) => {
              const kindLabel =
                taskKindLabels[task.kind] ?? translations('widgets.progress.taskKind.default');
              const isLocalHref = task.href.startsWith('/');
              return (
                <li
                  key={`${task.kind}-${task.href}-${task.openedAt}`}
                  className={`${KANGUR_PANEL_ROW_CLASSNAME} rounded-[24px] border border-indigo-200/70 bg-white/80 px-4 py-3 sm:items-center sm:justify-between`}
                >
                  <div className='min-w-0'>
                    <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {task.title}
                    </div>
                    <KangurMetaText tone='slate'>
                      {kindLabel} · {formatTimestamp(task.openedAt)}
                    </KangurMetaText>
                  </div>
                  {isLocalHref ? (
                    <KangurButton asChild className={compactActionClassName} size='sm' variant='surface'>
                      <Link
                        href={task.href}
                        transitionAcknowledgeMs={110}
                        transitionSourceId='parent-dashboard:opened-task'
                      >
                        {translations('widgets.progress.openedTasks.openAction')}
                      </Link>
                    </KangurButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('widgets.progress.openedTasks.empty')}
          </div>
        )}
      </KangurSummaryPanel>
      {assignmentsLoading ? (
        <KangurGlassPanel
          data-testid='parent-dashboard-active-assignments-loading'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <KangurEmptyState
            accent='slate'
            className='text-sm'
            description={translations('widgets.progress.assignments.loading')}
            padding='lg'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          />
        </KangurGlassPanel>
      ) : assignmentsError ? (
        <KangurGlassPanel
          data-testid='parent-dashboard-active-assignments-error'
          padding='lg'
          surface='rose'
          variant='soft'
        >
          <KangurSummaryPanel
            accent='rose'
            description={activeAssignmentsErrorLabel}
            padding='lg'
            tone='accent'
            role='alert'
            aria-live='assertive'
            aria-atomic='true'
          />
        </KangurGlassPanel>
      ) : (
        <>
          <KangurAssignmentsList
            items={recentAssignmentItems}
            title={recentAssignmentsTitle}
            summary={recentAssignmentsSummary}
            emptyLabel={recentAssignmentsEmptyLabel}
            compact
          />
          {archiveError ? (
            <KangurSummaryPanel
              accent='rose'
              description={archiveError}
              padding='sm'
              tone='accent'
              role='alert'
              aria-live='assertive'
              aria-atomic='true'
            />
          ) : null}
          <KangurAssignmentsList
            items={activeAssignmentItems}
            title={activeAssignmentsTitle}
            emptyLabel={activeAssignmentsEmptyLabel}
            onArchive={(assignmentId) => void handleArchiveAssignment(assignmentId)}
          />
        </>
      )}
      <KangurAssignmentManager
        basePath={basePath}
        view='metrics'
        key={`${activeLearnerId ?? 'no-learner'}:metrics`}
      />
      <KangurSummaryPanel
        accent='amber'
        className='mt-1'
        description={translations('widgets.progress.lessonProgress.description')}
        label={translations('widgets.progress.lessonProgress.label')}
      >
        {lessonPanelCards.length > 0 ? (
          <ul
            className='mt-3 flex flex-col kangur-panel-gap'
            aria-label={translations('widgets.progress.lessonProgress.listAria')}
          >
            {lessonPanelCards.map((entry) => {
              const lessonTitle = getLocalizedKangurLessonTitle(
                entry.lesson.componentId,
                locale,
                entry.lesson.title
              );

              return (
              <li key={entry.lesson.componentId}>
                <KangurInfoCard className='rounded-[26px]' padding='lg'>
                  <div className='flex flex-col kangur-panel-gap'>
                    <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                      <div>
                        <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {lessonTitle}
                        </div>
                        <KangurMetaText tone='slate'>
                          {translations('widgets.progress.lessonProgress.panelsCount', {
                            viewed: entry.viewed,
                            total: entry.total,
                          })}
                        </KangurMetaText>
                      </div>
                      <div className='text-sm font-semibold text-amber-700'>
                        {entry.percent}%
                      </div>
                    </div>
                    <KangurProgressBar
                      accent='amber'
                      size='sm'
                      value={entry.percent}
                      aria-label={translations('widgets.progress.lessonProgress.aria', {
                        title: lessonTitle,
                      })}
                    />
                    <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
                      {entry.sections.map((section) => (
                        <div
                          key={`${entry.lesson.componentId}-${section.id}`}
                          className='rounded-[18px] border border-amber-200/70 bg-white/80 px-3 py-2'
                        >
                          <div className='text-xs font-semibold [color:var(--kangur-page-text)]'>
                            {section.label}
                          </div>
                          <KangurMetaText tone='slate'>
                            {translations('widgets.progress.lessonProgress.sectionPanelsCount', {
                              viewed: section.viewedCount,
                              total: section.totalCount,
                            })}
                          </KangurMetaText>
                        </div>
                      ))}
                    </div>
                  </div>
                </KangurInfoCard>
              </li>
              );
            })}
          </ul>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('widgets.progress.lessonProgress.empty')}
          </div>
        )}
      </KangurSummaryPanel>
    </KangurPanelStack>
  );
}
