'use client';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
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
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetaText,
  KangurPanelStack,
  KangurProgressBar,
  KangurSummaryPanel,
  KangurWidgetIntro,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KANGUR_COMPACT_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';


const ACTIVE_ASSIGNMENTS_TITLE = 'Aktywne zadania';
const ACTIVE_ASSIGNMENTS_EMPTY_LABEL = 'Brak aktywnych zadań dla ucznia.';
const ACTIVE_ASSIGNMENTS_ERROR_LABEL = 'Nie udało się pobrać aktywnych zadań.';
const ARCHIVE_ASSIGNMENT_ERROR_LABEL = 'Nie udało się zarchiwizować zadania.';
const RECENT_ACTIVE_ASSIGNMENTS_LIMIT = 3;
const RECENT_ACTIVE_ASSIGNMENTS_TITLE = 'Ostatnie aktywne zadania';
const RECENT_ACTIVE_ASSIGNMENTS_SUMMARY =
  'Szybki podgląd zadań, które uczeń ma aktualnie do wykonania.';
const RECENT_ACTIVE_ASSIGNMENTS_EMPTY_LABEL = 'Brak aktywnych zadań dla ucznia.';

const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const TASK_KIND_LABELS: Record<string, string> = {
  game: 'Gra',
  lesson: 'Lekcja',
  test: 'Test',
};

const formatProgressTimestamp = (value: string | null | undefined): string => {
  if (!value) {
    return 'Brak danych';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Brak danych';
  }
  return new Intl.DateTimeFormat('pl-PL', {
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
  const { activeLearner, activeTab, basePath, canAccessDashboard, progress } =
    useKangurParentDashboardRuntime();
  const { subject } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const { entry: progressContent } = useKangurPageContentEntry('parent-dashboard-progress');
  const lessonsQuery = useKangurLessons({ ageGroup, enabledOnly: true });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const activeLearnerId = activeLearner?.id ?? null;
  const [archiveError, setArchiveError] = useState<string | null>(null);
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

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'progress')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  const dailyQuest = getCurrentKangurDailyQuest(progress, { subject });
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
  const dailyQuestLabel = dailyQuest?.assignment.questLabel ?? 'Misja dnia';
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
          setArchiveError(ARCHIVE_ASSIGNMENT_ERROR_LABEL);
        },
      }
    );
  };

  return (
    <KangurPanelStack>
      <KangurWidgetIntro
        description={
          progressContent?.summary ??
          'Sprawdź rytm nauki, poziom, misje dnia i główny kierunek dalszej pracy.'
        }
        title={progressContent?.title ?? 'Postęp ucznia'}
      />
      {dailyQuest ? (
        <KangurSummaryPanel
          accent='violet'
          className='mt-1'
          data-testid='parent-dashboard-daily-quest'
          description='To aktualna misja dnia ucznia, zsynchronizowana z widokiem gry i profilu.'
          label='Misja dnia ucznia'
        >
          <div className='mt-3 flex flex-col kangur-panel-gap rounded-[28px] border border-violet-200/80 bg-white/82 px-4 py-4'>
            <KangurDailyQuestHighlightCardContent
              action={
                dailyQuestHref ? (
                  <KangurButton asChild className='w-full sm:w-auto sm:shrink-0' size='sm' variant='surface'>
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
        description='Ostatnie aktywności ucznia — każde zadanie, które otworzył.'
        label='Otwarte zadania'
      >
        {openedTasks.length > 0 ? (
          <ul className='mt-3 flex flex-col kangur-panel-gap' aria-label='Otwarte zadania ucznia'>
            {openedTasks.map((task) => {
              const kindLabel = TASK_KIND_LABELS[task.kind] ?? 'Aktywność';
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
                      {kindLabel} · {formatProgressTimestamp(task.openedAt)}
                    </KangurMetaText>
                  </div>
                  {isLocalHref ? (
                    <KangurButton asChild className='w-full sm:w-auto sm:shrink-0' size='sm' variant='surface'>
                      <Link
                        href={task.href}
                        transitionAcknowledgeMs={110}
                        transitionSourceId='parent-dashboard:opened-task'
                      >
                        Otwórz
                      </Link>
                    </KangurButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            Brak zapisanych otwarć. Dane pojawią się, gdy uczeń uruchomi zadanie.
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
            description='Ładowanie aktywnych zadań...'
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
            description={ACTIVE_ASSIGNMENTS_ERROR_LABEL}
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
            title={RECENT_ACTIVE_ASSIGNMENTS_TITLE}
            summary={RECENT_ACTIVE_ASSIGNMENTS_SUMMARY}
            emptyLabel={RECENT_ACTIVE_ASSIGNMENTS_EMPTY_LABEL}
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
            title={ACTIVE_ASSIGNMENTS_TITLE}
            emptyLabel={ACTIVE_ASSIGNMENTS_EMPTY_LABEL}
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
        description='Postęp lekcji zapisany panel po panelu.'
        label='Postęp lekcji'
      >
        {lessonPanelCards.length > 0 ? (
          <ul className='mt-3 flex flex-col kangur-panel-gap' aria-label='Postęp lekcji ucznia'>
            {lessonPanelCards.map((entry) => (
              <li key={entry.lesson.componentId}>
                <KangurInfoCard className='rounded-[26px]' padding='lg'>
                  <div className='flex flex-col kangur-panel-gap'>
                    <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                      <div>
                        <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {entry.lesson.title}
                        </div>
                        <KangurMetaText tone='slate'>
                          {entry.viewed}/{entry.total} paneli
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
                      aria-label={`Postęp lekcji ${entry.lesson.title}`}
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
                            {section.viewedCount}/{section.totalCount} paneli
                          </KangurMetaText>
                        </div>
                      ))}
                    </div>
                  </div>
                </KangurInfoCard>
              </li>
            ))}
          </ul>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            Brak danych o panelach. Dane pojawią się po wejściu ucznia w lekcje.
          </div>
        )}
      </KangurSummaryPanel>
    </KangurPanelStack>
  );
}
