import React from 'react';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import KangurAssignmentManager from '@/features/kangur/ui/components/assignment-manager/KangurAssignmentManager';
import KangurDailyQuestHighlightCardContent from '@/features/kangur/ui/components/summary-cards/KangurDailyQuestHighlightCardContent';
import KangurAssignmentsList from '@/features/kangur/ui/components/assignments/KangurAssignmentsList';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurActivityColumn,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurMetaText,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';
import {
  KANGUR_COMPACT_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  ParentDashboardDailyQuest,
  ParentDashboardLessonMasteryInsights,
  ParentDashboardLessonPanelCard,
  ParentDashboardProgressSnapshot,
  ParentDashboardRuntimeState,
  ProgressTranslations,
} from './KangurParentDashboardProgressWidget.types';
import type { resolveDailyQuestPresentation } from './KangurParentDashboardProgressWidget.utils';

export function KangurParentDashboardAnalyticsSection({
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

export function KangurParentDashboardWeeklyActivitySection({
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
          {snapshot.weeklyActivity.map((point: ParentDashboardProgressSnapshot['weeklyActivity'][number]) => {
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

export function KangurParentDashboardOperationFocusSection({
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

export function KangurParentDashboardMasteryLessonsColumn({
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
        {lessons.map((lesson: ParentDashboardLessonMasteryInsights['strongest'][number]) => (
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

export function KangurParentDashboardMasterySummarySection({
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

export function KangurParentDashboardDailyQuestSection({
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

export function KangurParentDashboardOpenedTasksSection({
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

export function KangurParentDashboardAssignmentsSection({
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

export function KangurParentDashboardLessonProgressSection({
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
