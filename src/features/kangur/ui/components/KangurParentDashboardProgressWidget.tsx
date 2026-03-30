'use client';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/KangurDailyQuestHighlightCardContent';
import KangurAssignmentsList from '@/features/kangur/ui/components/assignments/KangurAssignmentsList';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurActivityColumn,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurPanelStack,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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
  KANGUR_WIDGET_TITLE_CLASSNAME,
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

type ProgressTranslations = (
  key: string,
  values?: Record<string, string | number>
) => string;

type ParentDashboardRuntimeState = ReturnType<typeof useKangurParentDashboardRuntime>;
type ParentDashboardLesson = NonNullable<ParentDashboardRuntimeState['lessons']>[number];
type ParentDashboardLessonPanelCard = {
  lesson: ParentDashboardLesson;
  percent: number;
  sections: {
    id: string;
    label: string;
    totalCount: number;
    viewedCount: number;
  }[];
  total: number;
  viewed: number;
};
type ParentDashboardProgressSnapshot = ReturnType<typeof buildKangurLearnerProfileSnapshot>;
type ParentDashboardLessonMasteryInsights = ReturnType<typeof buildLessonMasteryInsights>;
type ParentDashboardDailyQuest = ReturnType<typeof getCurrentKangurDailyQuest>;

const resolveCompactActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 sm:w-auto sm:shrink-0'
    : 'w-full sm:w-auto sm:shrink-0';

const buildProgressTaskKindLabels = (
  translations: ProgressTranslations
): Record<string, string> => ({
  game: translations('widgets.progress.taskKind.game'),
  lesson: translations('widgets.progress.taskKind.lesson'),
  test: translations('widgets.progress.taskKind.test'),
});

const buildLessonPanelCards = ({
  lessonPanelProgress,
  lessons,
}: {
  lessonPanelProgress: NonNullable<ParentDashboardRuntimeState['progress']['lessonPanelProgress']>;
  lessons: ParentDashboardRuntimeState['lessons'];
}): ParentDashboardLessonPanelCard[] =>
  (lessons ?? [])
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

      return {
        lesson,
        percent,
        viewed: totals.viewed,
        total: totals.total,
        sections: entries
          .map(([sectionId, entry]) => ({
            id: sectionId,
            label: normalizePanelLabel(entry.label, sectionId),
            viewedCount: entry.viewedCount,
            totalCount: entry.totalCount,
          }))
          .sort((left, right) => left.label.localeCompare(right.label)),
      };
    })
    .filter((entry): entry is ParentDashboardLessonPanelCard => Boolean(entry));

const resolveDailyQuestAccent = (
  dailyQuest: ParentDashboardDailyQuest
): 'amber' | 'emerald' | 'indigo' | 'slate' => {
  if (dailyQuest?.reward.status === 'claimed') {
    return 'emerald';
  }
  if (dailyQuest?.progress.status === 'completed') {
    return 'amber';
  }
  if (dailyQuest?.progress.status === 'in_progress') {
    return 'indigo';
  }
  return 'slate';
};

const resolveDailyQuestAction = (dailyQuest: ParentDashboardDailyQuest) =>
  dailyQuest?.assignment.action ?? null;

const resolveDailyQuestActionLabel = (
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>
): string => dailyQuestAction?.label ?? '';

const resolveDailyQuestDescription = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.assignment.description ?? '';

const resolveDailyQuestLabel = ({
  dailyQuest,
  translations,
}: {
  dailyQuest: ParentDashboardDailyQuest;
  translations: ProgressTranslations;
}): string =>
  dailyQuest?.assignment.questLabel ??
  translations('widgets.progress.dailyQuest.questLabel');

const resolveDailyQuestProgressLabel = (
  dailyQuest: ParentDashboardDailyQuest
): string => (dailyQuest ? `${dailyQuest.progress.percent}%` : '');

const resolveDailyQuestProgressSummary = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.progress.summary ?? '';

const resolveDailyQuestRewardAccent = ({
  dailyQuest,
  dailyQuestAccent,
}: {
  dailyQuest: ParentDashboardDailyQuest;
  dailyQuestAccent: ReturnType<typeof resolveDailyQuestAccent>;
}): 'amber' | 'emerald' | 'indigo' | 'slate' =>
  dailyQuest?.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent;

const resolveDailyQuestRewardLabel = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.reward.label ?? '';

const resolveDailyQuestTargetPage = (
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>
) => dailyQuestAction?.page ?? null;

const resolveDailyQuestTitle = (
  dailyQuest: ParentDashboardDailyQuest
): string => dailyQuest?.assignment.title ?? '';

const resolveDailyQuestHref = ({
  basePath,
  dailyQuestAction,
}: {
  basePath: string;
  dailyQuestAction: ReturnType<typeof resolveDailyQuestAction>;
}): string | null => (dailyQuestAction ? buildAssignmentHref(basePath, dailyQuestAction) : null);

const buildActiveAssignments = (
  assignments: NonNullable<ParentDashboardRuntimeState['assignments']>
) =>
  assignments.filter(
    (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
  );

const buildRecentAssignments = (
  activeAssignments: ReturnType<typeof buildActiveAssignments>
) =>
  activeAssignments
    .slice()
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.progress.lastActivityAt ?? left.updatedAt);
      const rightTimestamp = Date.parse(right.progress.lastActivityAt ?? right.updatedAt);
      return rightTimestamp - leftTimestamp;
    })
    .slice(0, RECENT_ACTIVE_ASSIGNMENTS_LIMIT);

const resolveMaxWeeklyGames = (
  weeklyActivity: ParentDashboardProgressSnapshot['weeklyActivity']
): number => Math.max(1, ...weeklyActivity.map((point) => point.games));

const createProgressTimestampFormatter = ({
  fallback,
  locale,
}: {
  fallback: string;
  locale: string;
}) => (value: string | null | undefined): string =>
  formatProgressTimestamp({
    value,
    locale,
    fallback,
  });

const resolveDailyQuestPresentation = ({
  basePath,
  dailyQuest,
  translations,
}: {
  basePath: string;
  dailyQuest: ParentDashboardDailyQuest;
  translations: ProgressTranslations;
}) => {
  const dailyQuestAction = resolveDailyQuestAction(dailyQuest);
  const dailyQuestAccent = resolveDailyQuestAccent(dailyQuest);

  return {
    accent: dailyQuestAccent,
    actionLabel: resolveDailyQuestActionLabel(dailyQuestAction),
    description: resolveDailyQuestDescription(dailyQuest),
    href: resolveDailyQuestHref({ basePath, dailyQuestAction }),
    label: resolveDailyQuestLabel({ dailyQuest, translations }),
    progressLabel: resolveDailyQuestProgressLabel(dailyQuest),
    progressSummary: resolveDailyQuestProgressSummary(dailyQuest),
    rewardAccent: resolveDailyQuestRewardAccent({ dailyQuest, dailyQuestAccent }),
    rewardLabel: resolveDailyQuestRewardLabel(dailyQuest),
    targetPage: resolveDailyQuestTargetPage(dailyQuestAction),
    title: resolveDailyQuestTitle(dailyQuest),
  };
};

function KangurParentDashboardAnalyticsSection({
  snapshot,
  translations,
}: {
  snapshot: ParentDashboardProgressSnapshot;
  translations: ProgressTranslations;
}): React.JSX.Element {
  return (
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
  );
}

function KangurParentDashboardWeeklyActivitySection({
  isLoadingScores,
  maxWeeklyGames,
  scoresError,
  snapshot,
  translations,
}: {
  isLoadingScores: boolean;
  maxWeeklyGames: number;
  scoresError: ParentDashboardRuntimeState['scoresError'];
  snapshot: ParentDashboardProgressSnapshot;
  translations: ProgressTranslations;
}): React.JSX.Element {
  return (
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
              <div key={point.dateKey} className='flex min-w-0 flex-1 flex-col items-center gap-1.5'>
                <div className='text-[11px] font-semibold text-violet-700'>{point.games}</div>
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
  );
}

function KangurParentDashboardOperationFocusSection({
  topOperationPerformance,
  translations,
}: {
  topOperationPerformance: ParentDashboardProgressSnapshot['operationPerformance'];
  translations: ProgressTranslations;
}): React.JSX.Element {
  return (
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
            <div
              key={item.operation}
              className='rounded-[20px] border border-sky-200/70 bg-white/82 px-4 py-3'
            >
              <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {item.emoji} {item.label}
                </div>
                <div className='text-sm font-semibold text-sky-700'>{item.averageAccuracy}%</div>
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
  );
}

function KangurParentDashboardMasteryLessonsColumn({
  accent,
  lessons,
  title,
}: {
  accent: 'emerald' | 'rose';
  lessons: ParentDashboardLessonMasteryInsights['strongest'];
  title: string;
}): React.JSX.Element {
  const borderClassName =
    accent === 'rose'
      ? 'border-rose-200/70 bg-white/82 text-rose-700'
      : 'border-emerald-200/70 bg-white/82 text-emerald-700';
  const progressAccent = accent;

  return (
    <div className={`rounded-[20px] px-4 py-3 ${borderClassName}`}>
      <div className='text-xs font-bold uppercase tracking-[0.18em]'>{title}</div>
      <div className='mt-2 flex flex-col gap-2'>
        {lessons.map((lesson) => (
          <div key={lesson.componentId}>
            <div className='flex items-center justify-between gap-2 text-sm'>
              <span className='min-w-0 truncate font-semibold [color:var(--kangur-page-text)]'>
                {lesson.emoji} {lesson.title}
              </span>
              <span className='shrink-0'>{lesson.masteryPercent}%</span>
            </div>
            <KangurProgressBar
              accent={progressAccent}
              className='mt-1'
              size='sm'
              value={lesson.masteryPercent}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function KangurParentDashboardMasterySummarySection({
  lessonMasteryInsights,
  strongestLessons,
  translations,
  weakestLessons,
}: {
  lessonMasteryInsights: ParentDashboardLessonMasteryInsights;
  strongestLessons: ParentDashboardLessonMasteryInsights['strongest'];
  translations: ProgressTranslations;
  weakestLessons: ParentDashboardLessonMasteryInsights['weakest'];
}): React.JSX.Element {
  return (
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
          <KangurParentDashboardMasteryLessonsColumn
            accent='rose'
            lessons={weakestLessons}
            title={translations('widgets.progress.masterySummary.weakestLabel')}
          />
          <KangurParentDashboardMasteryLessonsColumn
            accent='emerald'
            lessons={strongestLessons}
            title={translations('widgets.progress.masterySummary.strongestLabel')}
          />
        </div>
      ) : (
        <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
          {translations('widgets.progress.masterySummary.empty')}
        </div>
      )}
    </KangurSummaryPanel>
  );
}

function KangurParentDashboardDailyQuestSection({
  compactActionClassName,
  dailyQuest,
  dailyQuestPresentation,
  translations,
}: {
  compactActionClassName: string;
  dailyQuest: ParentDashboardDailyQuest;
  dailyQuestPresentation: ReturnType<typeof resolveDailyQuestPresentation>;
  translations: ProgressTranslations;
}): React.JSX.Element | null {
  if (!dailyQuest) {
    return null;
  }

  return (
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
            dailyQuestPresentation.href ? (
              <KangurButton asChild className={compactActionClassName} size='sm' variant='surface'>
                <Link
                  href={dailyQuestPresentation.href}
                  targetPageKey={dailyQuestPresentation.targetPage ?? undefined}
                  transitionSourceId='parent-dashboard:daily-quest'
                >
                  {dailyQuestPresentation.actionLabel}
                </Link>
              </KangurButton>
            ) : null
          }
          chipLabelStyle='compact'
          description={dailyQuestPresentation.description}
          descriptionClassName='mt-1 text-slate-600'
          descriptionRelaxed
          descriptionSize='sm'
          footer={
            <KangurMetaText caps className='mt-2' tone='slate'>
              {dailyQuestPresentation.progressSummary}
            </KangurMetaText>
          }
          progressAccent={dailyQuestPresentation.accent}
          progressLabel={dailyQuestPresentation.progressLabel}
          questLabel={dailyQuestPresentation.label}
          rewardAccent={dailyQuestPresentation.rewardAccent}
          rewardLabel={dailyQuestPresentation.rewardLabel}
          title={dailyQuestPresentation.title}
          titleClassName='text-slate-900'
        />
      </div>
    </KangurSummaryPanel>
  );
}

function KangurParentDashboardOpenedTasksSection({
  compactActionClassName,
  formatTimestamp,
  openedTasks,
  taskKindLabels,
  translations,
}: {
  compactActionClassName: string;
  formatTimestamp: (value: string | null | undefined) => string;
  openedTasks: NonNullable<ParentDashboardRuntimeState['progress']['openedTasks']>;
  taskKindLabels: Record<string, string>;
  translations: ProgressTranslations;
}): React.JSX.Element {
  return (
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
                    <Link href={task.href} transitionSourceId='parent-dashboard:opened-task'>
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
  );
}

function KangurParentDashboardAssignmentsSection({
  activeAssignmentItems,
  activeAssignmentsEmptyLabel,
  activeAssignmentsErrorLabel,
  assignmentsLoadingLabel,
  archiveError,
  assignments,
  assignmentsError,
  basePath,
  handleArchiveAssignment,
  isLoadingAssignments,
  lessons,
  preloadedUpdateAssignment,
  recentAssignmentItems,
  recentAssignmentsEmptyLabel,
  recentAssignmentsSummary,
  recentAssignmentsTitle,
  translations,
}: {
  activeAssignmentItems: ReturnType<typeof buildKangurAssignmentListItems>;
  activeAssignmentsEmptyLabel: string;
  activeAssignmentsErrorLabel: string;
  assignmentsLoadingLabel: string;
  archiveError: string | null;
  assignments: ParentDashboardRuntimeState['assignments'];
  assignmentsError: ParentDashboardRuntimeState['assignmentsError'];
  basePath: string;
  handleArchiveAssignment: (assignmentId: string) => Promise<void>;
  isLoadingAssignments: boolean;
  lessons: ParentDashboardRuntimeState['lessons'];
  preloadedUpdateAssignment: NonNullable<ParentDashboardRuntimeState['updateAssignment']>;
  recentAssignmentItems: ReturnType<typeof buildKangurAssignmentListItems>;
  recentAssignmentsEmptyLabel: string;
  recentAssignmentsSummary: string;
  recentAssignmentsTitle: string;
  translations: ProgressTranslations;
}): React.JSX.Element {
  if (isLoadingAssignments) {
    return (
      <KangurGlassPanel
        data-testid='parent-dashboard-active-assignments-loading'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description={assignmentsLoadingLabel}
          padding='lg'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        />
      </KangurGlassPanel>
    );
  }

  if (assignmentsError) {
    return (
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
    );
  }

  return (
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
        title={translations('widgets.progress.assignments.activeTitle')}
        emptyLabel={activeAssignmentsEmptyLabel}
        onArchive={(assignmentId) => void handleArchiveAssignment(assignmentId)}
      />
      <KangurAssignmentManager
        basePath={basePath}
        preloadedAssignments={assignments}
        preloadedAssignmentsError={assignmentsError}
        preloadedLessons={lessons}
        preloadedLoading={isLoadingAssignments}
        preloadedUpdateAssignment={preloadedUpdateAssignment}
        view='metrics'
        key={`${basePath}:metrics`}
      />
    </>
  );
}

function KangurParentDashboardLessonProgressSection({
  lessonPanelCards,
  locale,
  translations,
}: {
  lessonPanelCards: ParentDashboardLessonPanelCard[];
  locale: string;
  translations: ProgressTranslations;
}): React.JSX.Element {
  return (
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
                      <div className='text-sm font-semibold text-amber-700'>{entry.percent}%</div>
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
  );
}

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
        preloadedUpdateAssignment={updateAssignment}
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
