'use client';

import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerInteractionHistory } from '@kangur/platform';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurActivityColumn,
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurMetricCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurPanelStack,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  asRecord,
  formatDuration,
  formatProgressTimestamp,
  type InteractionFilter,
  type InteractionView,
  isLessonComponentId,
  normalizePanelLabel,
  parseDateFilterValue,
  parsePanelIndex,
  parseTimestamp,
  parseTimestampStrict,
  readNumber,
  readString,
} from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsMonitoringWidget.utils';
import {
  KANGUR_COMPACT_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WIDGET_TITLE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { ActivityTypes } from '@/shared/constants/observability';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { withKangurClientError } from '@/features/kangur/observability/client';


const kangurPlatform = getKangurPlatform();
const INTERACTIONS_PAGE_LIMIT = 20;
const INTERACTIONS_LOAD_DEFER_MS = 900;

const DAY_MS = 24 * 60 * 60 * 1000;

export function KangurParentDashboardAssignmentsMonitoringWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeLearner, activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();
  const activeLearnerId = activeLearner?.id ?? null;

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'monitoring')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  return <KangurParentDashboardAssignmentsMonitoringWidgetContent />;
}

function KangurParentDashboardAssignmentsMonitoringWidgetContent(): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    activeLearner,
    canAccessDashboard,
    lessons = [],
    progress,
  } = useKangurParentDashboardRuntime();
  const { entry: monitoringContent } = useKangurPageContentEntry('parent-dashboard-monitoring');
  const activeLearnerId = activeLearner?.id ?? null;
  const lessonPanelProgress = progress.lessonPanelProgress ?? {};
  const interactionFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: translations('widgets.monitoring.filters.all') },
        { value: 'opened_task', label: translations('widgets.monitoring.filters.openedTask') },
        { value: 'lesson_panel', label: translations('widgets.monitoring.filters.lessonPanel') },
        { value: 'session', label: translations('widgets.monitoring.filters.session') },
      ] satisfies ReadonlyArray<LabeledOptionDto<InteractionFilter>>,
    [translations]
  );
  const taskKindLabels: Record<string, string> = {
    game: translations('widgets.monitoring.interaction.kind.game'),
    lesson: translations('widgets.monitoring.interaction.kind.lesson'),
    test: translations('widgets.monitoring.interaction.kind.test'),
  };
  const formatTimestamp = (value: string | null | undefined): string =>
    formatProgressTimestamp({
      value,
      locale,
      fallback: translations('widgets.monitoring.timestampUnavailable'),
    });
  const formatLocalizedDuration = (seconds: number): string =>
    formatDuration({
      seconds,
      translate: (key, values) => translations(key, values),
    });
  const [interactionHistory, setInteractionHistory] =
    useState<KangurLearnerInteractionHistory | null>(null);
  const [isInteractionQueryReady, setIsInteractionQueryReady] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [interactionsError, setInteractionsError] = useState<string | null>(null);
  const [isLoadingMoreInteractions, setIsLoadingMoreInteractions] = useState(false);
  const [interactionsLoadMoreError, setInteractionsLoadMoreError] = useState<string | null>(null);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');
  const [interactionDateFrom, setInteractionDateFrom] = useState('');
  const [interactionDateTo, setInteractionDateTo] = useState('');
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';
  const segmentedFilterClassName = isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';
  const lessonPanelTimeCards = useMemo(
    () =>
      lessons
        .map((lesson) => {
          const panels = lessonPanelProgress[lesson.componentId] ?? {};
          const sectionEntries = Object.entries(panels)
            .map(([sectionId, entry]) => {
              const panelTimes = entry.panelTimes ?? {};
              const panelEntries = Object.entries(panelTimes)
                .map(([panelId, panel]) => {
                  const panelIndex = parsePanelIndex(panelId);
                  const title =
                    panel.title?.trim() ||
                    (panelIndex !== Number.MAX_SAFE_INTEGER
                      ? translations('widgets.monitoring.lessonPanelTime.panelNumber', {
                          number: panelIndex,
                        })
                      : translations('widgets.monitoring.lessonPanelTime.panelDefault'));
                  return {
                    id: panelId,
                    index: panelIndex,
                    title,
                    seconds: panel.seconds,
                  };
                })
                .filter((panel) => panel.seconds > 0)
                .sort((left, right) => left.index - right.index);

              if (panelEntries.length === 0) {
                return null;
              }

              const totalSeconds = panelEntries.reduce((sum, panel) => sum + panel.seconds, 0);
              return {
                id: sectionId,
                label: normalizePanelLabel(entry.label, sectionId),
                panels: panelEntries,
                totalSeconds,
                sessionUpdatedAt: entry.sessionUpdatedAt ?? entry.lastViewedAt ?? null,
              };
            })
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
            .sort((left, right) => left.label.localeCompare(right.label));

          if (sectionEntries.length === 0) {
            return null;
          }

          const totalSeconds = sectionEntries.reduce((sum, section) => sum + section.totalSeconds, 0);
          const sessionUpdatedAt = sectionEntries.reduce<string | null>((latest, section) => {
            const latestTimestamp = parseTimestamp(latest);
            const sectionTimestamp = parseTimestamp(section.sessionUpdatedAt);
            return sectionTimestamp >= latestTimestamp ? section.sessionUpdatedAt : latest;
          }, null);

          return {
            lesson,
            sections: sectionEntries,
            totalSeconds,
            sessionUpdatedAt,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [lessonPanelProgress, lessons]
  );
  const lessonsById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.componentId, lesson] as const)),
    [lessons]
  );
  const interactions = interactionHistory?.items ?? [];
  const hasMoreInteractions = interactionHistory
    ? interactionHistory.offset + interactions.length < interactionHistory.total
    : false;
  const nextInteractionOffset = interactionHistory
    ? interactionHistory.offset + interactions.length
    : 0;
  const interactionViews = useMemo<InteractionView[]>(
    () =>
      interactions.map((entry) => {
        const metadata = asRecord(entry.metadata);
        const timestamp =
          readString(metadata?.['endedAt']) ??
          readString(metadata?.['openedAt']) ??
          readString(metadata?.['sessionUpdatedAt']) ??
          readString(metadata?.['startedAt']) ??
          readString(entry.createdAt) ??
          readString(entry.updatedAt) ??
          null;

        const timestampMs = parseTimestampStrict(timestamp);

        if (entry.type === ActivityTypes.KANGUR.OPENED_TASK) {
          const title =
            readString(metadata?.['title']) ??
            readString(entry.description) ??
            translations('widgets.monitoring.interaction.openedTaskTitle');
          const kindRaw = readString(metadata?.['kind']);
          const kindLabel = kindRaw
            ? taskKindLabels[kindRaw] ?? translations('widgets.monitoring.interaction.kind.default')
            : translations('widgets.monitoring.interaction.kind.default');
          return {
            id: entry.id,
            kind: 'opened_task' as const,
            label: translations('widgets.monitoring.interaction.openedTaskLabel', {
              kind: kindLabel.toLowerCase(),
            }),
            description: title,
            durationSeconds: null,
            timestamp,
            timestampMs,
          };
        }

        if (entry.type === ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY) {
          const lessonKey = readString(metadata?.['lessonKey']);
          const sectionLabel =
            readString(metadata?.['label']) ?? readString(metadata?.['sectionId']);
          const lessonId =
            lessonKey && isLessonComponentId(lessonKey, lessonsById) ? lessonKey : null;
          const lessonTitle = lessonId
            ? lessonsById.get(lessonId)?.title ?? translations('widgets.monitoring.interaction.lessonFallback')
            : translations('widgets.monitoring.interaction.lessonFallback');
          const detail = sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
          const totalSeconds = readNumber(metadata?.['totalSeconds']);
          const timeLabel = totalSeconds ? ` · ${formatLocalizedDuration(totalSeconds)}` : '';
          return {
            id: entry.id,
            kind: 'lesson_panel' as const,
            label: translations('widgets.monitoring.interaction.lessonPanelLabel'),
            description: `${detail}${timeLabel}`,
            durationSeconds: totalSeconds,
            timestamp,
            timestampMs,
          };
        }

        if (entry.type === ActivityTypes.KANGUR.LEARNER_SESSION) {
          const durationSeconds = readNumber(metadata?.['durationSeconds']);
          const durationLabel = durationSeconds ? formatLocalizedDuration(durationSeconds) : null;
          const endedAt = readString(metadata?.['endedAt']);
          const description = endedAt
            ? durationLabel
              ? translations('widgets.monitoring.interaction.sessionDuration', {
                  duration: durationLabel,
                })
              : translations('widgets.monitoring.interaction.sessionEnded')
            : durationLabel
              ? translations('widgets.monitoring.interaction.sessionInProgressWithDuration', {
                  duration: durationLabel,
                })
              : translations('widgets.monitoring.interaction.sessionInProgress');

          return {
            id: entry.id,
            kind: 'session' as const,
            label: translations('widgets.monitoring.interaction.sessionLabel'),
            description,
            durationSeconds,
            timestamp,
            timestampMs,
          };
        }

        return {
          id: entry.id,
          kind: 'other' as const,
          label: translations('widgets.monitoring.interaction.learnerActivityLabel'),
          description:
            entry.description ??
            translations('widgets.monitoring.interaction.learnerActivityDescription'),
          durationSeconds: null,
          timestamp,
          timestampMs,
        };
      }),
    [formatLocalizedDuration, interactions, lessonsById, taskKindLabels, translations]
  );
  const { rangeStartMs, rangeEndMs } = useMemo(() => {
    const startMs = parseDateFilterValue(interactionDateFrom);
    const rawEndMs = parseDateFilterValue(interactionDateTo);
    const endMs = rawEndMs !== null ? rawEndMs + DAY_MS - 1 : null;
    if (startMs !== null && endMs !== null && startMs > endMs) {
      return { rangeStartMs: endMs, rangeEndMs: startMs };
    }
    return { rangeStartMs: startMs, rangeEndMs: endMs };
  }, [interactionDateFrom, interactionDateTo]);
  const filteredInteractions = useMemo(() => {
    const typeFilter = interactionFilter;
    const startMs = rangeStartMs;
    const endMs = rangeEndMs;
    const hasDateFilter = startMs !== null || endMs !== null;
    return interactionViews.filter((entry) => {
      if (typeFilter !== 'all' && entry.kind !== typeFilter) {
        return false;
      }
      if (!hasDateFilter) {
        return true;
      }
      if (entry.timestampMs === null) {
        return false;
      }
      if (startMs !== null && entry.timestampMs < startMs) {
        return false;
      }
      if (endMs !== null && entry.timestampMs > endMs) {
        return false;
      }
      return true;
    });
  }, [interactionFilter, interactionViews, rangeEndMs, rangeStartMs]);
  const interactionSummary = useMemo(() => {
    const openedTaskCount = filteredInteractions.filter((entry) => entry.kind === 'opened_task').length;
    const lessonPanelCount = filteredInteractions.filter((entry) => entry.kind === 'lesson_panel').length;
    const sessions = filteredInteractions.filter((entry) => entry.kind === 'session');
    const sessionCount = sessions.length;
    const totalSessionDuration = sessions.reduce(
      (sum, entry) => sum + (entry.durationSeconds ?? 0),
      0
    );
    const averageSessionDuration =
      sessionCount > 0 ? Math.round(totalSessionDuration / sessionCount) : 0;
    const latestTimestampEntry =
      filteredInteractions
        .filter((entry) => entry.timestampMs !== null)
        .sort((left, right) => (right.timestampMs ?? 0) - (left.timestampMs ?? 0))[0] ?? null;

    return {
      averageSessionDuration,
      lessonPanelCount,
      latestTimestamp: latestTimestampEntry?.timestamp ?? null,
      openedTaskCount,
      sessionCount,
      totalInteractions: filteredInteractions.length,
    };
  }, [filteredInteractions]);
  const interactionMix = useMemo(
    () => [
      {
        accent: 'indigo' as const,
        count: interactionSummary.totalInteractions,
        key: 'all',
        label: translations('widgets.monitoring.overview.totalInteractionsLabel'),
      },
      {
        accent: 'amber' as const,
        count: interactionSummary.openedTaskCount,
        key: 'opened_task',
        label: translations('widgets.monitoring.overview.openedTasksLabel'),
      },
      {
        accent: 'sky' as const,
        count: interactionSummary.lessonPanelCount,
        key: 'lesson_panel',
        label: translations('widgets.monitoring.overview.lessonPanelsLabel'),
      },
      {
        accent: 'emerald' as const,
        count: interactionSummary.sessionCount,
        key: 'session',
        label: translations('widgets.monitoring.overview.sessionsLabel'),
      },
    ],
    [interactionSummary, translations]
  );
  const maxInteractionMixCount = useMemo(
    () => Math.max(1, ...interactionMix.map((entry) => entry.count)),
    [interactionMix]
  );
  const lessonTimeLeaders = useMemo(
    () => lessonPanelTimeCards.slice().sort((left, right) => right.totalSeconds - left.totalSeconds).slice(0, 4),
    [lessonPanelTimeCards]
  );
  const maxLessonTimeSeconds = useMemo(
    () => Math.max(1, ...lessonTimeLeaders.map((entry) => entry.totalSeconds)),
    [lessonTimeLeaders]
  );
  const filtersActive =
    interactionFilter !== 'all' || Boolean(interactionDateFrom) || Boolean(interactionDateTo);
  const showInteractionsLoading =
    (Boolean(activeLearnerId) && canAccessDashboard && !isInteractionQueryReady) ||
    isLoadingInteractions;

  const handleLoadMoreInteractions = async (): Promise<void> => {
    if (!activeLearnerId || !interactionHistory || isLoadingMoreInteractions) {
      return;
    }

    setIsLoadingMoreInteractions(true);
    setInteractionsLoadMoreError(null);
    await withKangurClientError(
      {
        source: 'kangur-parent-dashboard',
        action: 'load-more-interactions',
        description: 'Load more learner interactions in parent dashboard.',
        context: {
          learnerId: activeLearnerId,
          offset: nextInteractionOffset,
        },
      },
      async () => {
        const history = await kangurPlatform.learnerInteractions.list(activeLearnerId, {
          limit: INTERACTIONS_PAGE_LIMIT,
          offset: nextInteractionOffset,
        });
        setInteractionHistory((current) => {
          if (!current) {
            return history;
          }
          const existingIds = new Set(current.items.map((entry) => entry.id));
          const mergedItems = [
            ...current.items,
            ...history.items.filter((entry) => !existingIds.has(entry.id)),
          ];
          const total = Math.max(current.total, history.total);
          return {
            ...history,
            items: mergedItems,
            total,
            offset: current.offset,
            limit: current.limit,
          };
        });
      },
      {
        fallback: undefined,
        onError: () => {
          setInteractionsLoadMoreError(translations('widgets.monitoring.history.loadMoreError'));
        },
      }
    );
    setIsLoadingMoreInteractions(false);
  };

  useEffect(() => {
    if (!activeLearnerId || !canAccessDashboard) {
      setIsInteractionQueryReady(false);
      setInteractionHistory(null);
      setInteractionsError(null);
      setInteractionsLoadMoreError(null);
      setIsLoadingMoreInteractions(false);
      setIsLoadingInteractions(false);
      return;
    }

    setIsInteractionQueryReady(false);
    setInteractionHistory(null);
    setInteractionsError(null);
    setInteractionsLoadMoreError(null);
    setIsLoadingMoreInteractions(false);
    setIsLoadingInteractions(true);

    const timeoutId = setTimeout(() => {
      setIsInteractionQueryReady(true);
    }, INTERACTIONS_LOAD_DEFER_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeLearnerId, canAccessDashboard]);

  useEffect(() => {
    if (!activeLearnerId || !canAccessDashboard || !isInteractionQueryReady) {
      return;
    }

    if (!activeLearnerId || !canAccessDashboard) {
      setInteractionHistory(null);
      return;
    }

    let isActive = true;
    setIsLoadingInteractions(true);
    setIsLoadingMoreInteractions(false);
    setInteractionsError(null);
    setInteractionsLoadMoreError(null);
    setInteractionHistory(null);

    kangurPlatform.learnerInteractions
      .list(activeLearnerId, { limit: INTERACTIONS_PAGE_LIMIT, offset: 0 })
      .then((history) => {
        if (!isActive) {
          return;
        }
        setInteractionHistory(history);
      })
      .catch((error) => {
        void ErrorSystem.captureException(error);
        if (!isActive) {
          return;
        }
        setInteractionsError(translations('widgets.monitoring.history.loadError'));
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingInteractions(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeLearnerId, canAccessDashboard, isInteractionQueryReady]);

  return (
    <KangurPanelStack>
      <KangurPanelIntro
        description={
          monitoringContent?.summary ??
          translations('widgets.monitoring.description')
        }
        title={monitoringContent?.title ?? translations('widgets.monitoring.title')}
        titleAs='h2'
        titleClassName={KANGUR_WIDGET_TITLE_CLASSNAME}
      />
      <KangurSummaryPanel
        accent='indigo'
        className='mt-1'
        data-testid='parent-monitoring-overview'
        description={translations('widgets.monitoring.overview.description')}
        label={translations('widgets.monitoring.overview.label')}
      >
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <KangurMetricCard
            accent='indigo'
            data-testid='parent-monitoring-overview-total'
            label={translations('widgets.monitoring.overview.totalInteractionsLabel')}
            value={interactionSummary.totalInteractions}
          />
          <KangurMetricCard
            accent='emerald'
            data-testid='parent-monitoring-overview-sessions'
            label={translations('widgets.monitoring.overview.sessionsLabel')}
            value={interactionSummary.sessionCount}
          />
          <KangurMetricCard
            accent='amber'
            data-testid='parent-monitoring-overview-opened-tasks'
            label={translations('widgets.monitoring.overview.openedTasksLabel')}
            value={interactionSummary.openedTaskCount}
          />
          <KangurMetricCard
            accent='sky'
            data-testid='parent-monitoring-overview-lesson-panels'
            label={translations('widgets.monitoring.overview.lessonPanelsLabel')}
            value={interactionSummary.lessonPanelCount}
          />
        </div>
        <div className='mt-3 flex flex-wrap gap-2'>
          <KangurStatusChip className='bg-white/85 text-slate-700'>
            {translations('widgets.monitoring.overview.averageSessionDuration', {
              duration: formatLocalizedDuration(interactionSummary.averageSessionDuration),
            })}
          </KangurStatusChip>
          <KangurStatusChip className='bg-white/85 text-slate-700'>
            {translations('widgets.monitoring.overview.latestActivity', {
              timestamp: formatTimestamp(interactionSummary.latestTimestamp),
            })}
          </KangurStatusChip>
        </div>
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='violet'
        className='mt-1'
        data-testid='parent-monitoring-activity-mix'
        description={translations('widgets.monitoring.activityMix.description')}
        label={translations('widgets.monitoring.activityMix.label')}
      >
        <div className='mt-3 rounded-[26px] border border-violet-200/70 bg-white/78 px-4 py-4'>
          <div className='flex h-36 items-end gap-3'>
            {interactionMix.map((entry) => {
              const heightPercent =
                entry.count === 0
                  ? 8
                  : Math.max(16, Math.round((entry.count / maxInteractionMixCount) * 100));
              return (
                <div key={entry.key} className='flex min-w-0 flex-1 flex-col items-center gap-1.5'>
                  <div className='text-[11px] font-semibold text-violet-700'>{entry.count}</div>
                  <KangurActivityColumn
                    accent={entry.accent}
                    active={entry.count > 0}
                    data-testid={`parent-monitoring-activity-mix-${entry.key}`}
                    title={translations('widgets.monitoring.activityMix.barTitle', {
                      count: entry.count,
                      label: entry.label,
                    })}
                    value={heightPercent}
                  />
                  <div className='text-center text-[11px] leading-tight [color:var(--kangur-page-muted-text)]'>
                    {entry.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='sky'
        className='mt-1'
        data-testid='parent-monitoring-lesson-focus'
        description={translations('widgets.monitoring.lessonFocus.description')}
        label={translations('widgets.monitoring.lessonFocus.label')}
      >
        {lessonTimeLeaders.length > 0 ? (
          <div className='mt-3 flex flex-col kangur-panel-gap'>
            {lessonTimeLeaders.map((entry) => {
              const lessonTitle = getLocalizedKangurLessonTitle(
                entry.lesson.componentId,
                locale,
                entry.lesson.title
              );
              const percent = Math.max(6, Math.round((entry.totalSeconds / maxLessonTimeSeconds) * 100));
              return (
                <div
                  key={`lesson-focus-${entry.lesson.componentId}`}
                  className='rounded-[20px] border border-sky-200/70 bg-white/82 px-4 py-3'
                >
                  <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                    <div className='min-w-0 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {lessonTitle}
                    </div>
                    <div className='shrink-0 text-sm font-semibold text-sky-700'>
                      {formatLocalizedDuration(entry.totalSeconds)}
                    </div>
                  </div>
                  <KangurProgressBar
                    accent='sky'
                    aria-label={translations('widgets.monitoring.lessonFocus.progressAria', {
                      title: lessonTitle,
                    })}
                    className='mt-2'
                    size='sm'
                    value={percent}
                  />
                  <div className='mt-2 text-xs [color:var(--kangur-page-muted-text)]'>
                    {translations('widgets.monitoring.lessonFocus.sectionCount', {
                      count: entry.sections.length,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('widgets.monitoring.lessonFocus.empty')}
          </div>
        )}
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='sky'
        className='mt-1'
        description={translations('widgets.monitoring.lessonPanelTime.description')}
        label={translations('widgets.monitoring.lessonPanelTime.label')}
      >
        {lessonPanelTimeCards.length > 0 ? (
          <div className='mt-3 flex flex-col kangur-panel-gap'>
            {lessonPanelTimeCards.map((entry) => {
              const lessonTitle = getLocalizedKangurLessonTitle(
                entry.lesson.componentId,
                locale,
                entry.lesson.title
              );

              return (
              <KangurInfoCard
                key={entry.lesson.componentId}
                className='rounded-[26px]'
                padding='lg'
              >
                <div className='flex flex-col kangur-panel-gap'>
                  <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                    <div>
                      <div className='break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {lessonTitle}
                      </div>
                      <KangurMetaText className='break-words' tone='slate'>
                        {translations('widgets.monitoring.lessonPanelTime.lastSession', {
                          timestamp: formatTimestamp(entry.sessionUpdatedAt),
                        })}
                      </KangurMetaText>
                    </div>
                    <div className='text-sm font-semibold text-sky-700'>
                      {formatLocalizedDuration(entry.totalSeconds)}
                    </div>
                  </div>
                  <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
                    {entry.sections.map((section) => (
                      <div
                        key={`${entry.lesson.componentId}-${section.id}`}
                        className='rounded-[18px] border border-sky-200/70 bg-white/80 px-3 py-2'
                      >
                        <div className='break-words text-xs font-semibold [color:var(--kangur-page-text)]'>
                          {section.label}
                        </div>
                        <KangurMetaText tone='slate'>
                          {translations('widgets.monitoring.lessonPanelTime.total', {
                            duration: formatLocalizedDuration(section.totalSeconds),
                          })}
                        </KangurMetaText>
                        <div className={`mt-2 ${KANGUR_STACK_COMPACT_CLASSNAME} text-xs`}>
                          {section.panels.map((panel) => (
                            <div
                              key={`${entry.lesson.componentId}-${section.id}-${panel.id}`}
                              className='flex items-center justify-between gap-2'
                            >
                              <span className='min-w-0 truncate [color:var(--kangur-page-text)]'>
                                {panel.title}
                              </span>
                              <span className='shrink-0 text-slate-500'>
                                {formatLocalizedDuration(panel.seconds)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </KangurInfoCard>
              );
            })}
          </div>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            {translations('widgets.monitoring.lessonPanelTime.empty')}
          </div>
        )}
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='indigo'
        className='mt-1'
        description={translations('widgets.monitoring.history.description')}
        label={translations('widgets.monitoring.history.label')}
      >
        <div className='mt-3 rounded-[18px] border border-indigo-100/80 bg-white/70 p-4'>
          <div className='flex flex-col kangur-panel-gap'>
            <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
              <KangurMetaText tone='slate'>
                {translations('widgets.monitoring.filters.label')}
              </KangurMetaText>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:w-auto sm:flex-wrap sm:justify-start`}
                role='tablist'
                aria-label={translations('widgets.monitoring.filters.ariaLabel')}
              >
                {interactionFilterOptions.map((option) => (
                  <KangurButton
                    key={option.value}
                    type='button'
                    onClick={() => setInteractionFilter(option.value)}
                    aria-pressed={interactionFilter === option.value}
                    aria-selected={interactionFilter === option.value}
                    role='tab'
                    className={segmentedFilterClassName}
                    size='sm'
                    variant={interactionFilter === option.value ? 'segmentActive' : 'segment'}
                  >
                    {option.label}
                  </KangurButton>
                ))}
              </div>
            </div>
            <div className='grid kangur-panel-gap sm:grid-cols-3'>
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                <KangurMetaText tone='slate'>
                  {translations('widgets.monitoring.filters.dateFromLabel')}
                </KangurMetaText>
                <KangurTextField
                  type='date'
                  value={interactionDateFrom}
                  onChange={(event) => setInteractionDateFrom(event.target.value)}
                  aria-label={translations('widgets.monitoring.filters.dateFromLabel')}
                  size='sm'
                />
              </div>
              <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                <KangurMetaText tone='slate'>
                  {translations('widgets.monitoring.filters.dateToLabel')}
                </KangurMetaText>
                <KangurTextField
                  type='date'
                  value={interactionDateTo}
                  onChange={(event) => setInteractionDateTo(event.target.value)}
                  aria-label={translations('widgets.monitoring.filters.dateToLabel')}
                  size='sm'
                />
              </div>
              <div className='flex items-end justify-start sm:justify-end'>
                {filtersActive ? (
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='ghost'
                    onClick={() => {
                      setInteractionFilter('all');
                      setInteractionDateFrom('');
                      setInteractionDateTo('');
                    }}
                    className={compactActionClassName}
                  >
                    {translations('widgets.monitoring.filters.clear')}
                  </KangurButton>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {showInteractionsLoading ? (
          <KangurEmptyState
            accent='slate'
            align='center'
            data-testid='parent-monitoring-interactions-loading'
            description={translations('widgets.monitoring.history.loadingDescription')}
            title={translations('widgets.monitoring.history.loadingTitle')}
          />
        ) : interactionsError ? (
          <KangurEmptyState
            accent='rose'
            align='center'
            data-testid='parent-monitoring-interactions-error'
            description={translations('widgets.monitoring.history.errorDescription')}
            title={interactionsError}
          />
        ) : filteredInteractions.length === 0 ? (
          <KangurEmptyState
            accent='slate'
            align='center'
            data-testid='parent-monitoring-interactions-empty'
            description={
              filtersActive
                ? translations('widgets.monitoring.history.filteredEmptyDescription')
                : translations('widgets.monitoring.history.emptyDescription')
            }
            title={
              filtersActive
                ? translations('widgets.monitoring.history.filteredEmptyTitle')
                : translations('widgets.monitoring.history.emptyTitle')
            }
          />
        ) : (
          <div className='mt-3 flex flex-col kangur-panel-gap'>
            {filteredInteractions.map((entry) => (
              <div
                key={entry.id}
                className='rounded-[18px] border border-indigo-200/70 bg-white/80 px-4 py-3'
                data-testid={`parent-monitoring-interaction-${entry.id}`}
              >
                <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
                  <div className='break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                    {entry.label}
                  </div>
                  <KangurMetaText className='break-words' tone='slate'>
                    {formatTimestamp(entry.timestamp)}
                  </KangurMetaText>
                </div>
                <div className='mt-1 break-words text-sm [color:var(--kangur-page-text)]'>
                  {entry.description}
                </div>
              </div>
            ))}
            {hasMoreInteractions ? (
              <div className='flex justify-center'>
                <KangurButton
                  className={compactActionClassName}
                  disabled={isLoadingMoreInteractions}
                  onClick={() => void handleLoadMoreInteractions()}
                  size='sm'
                  variant='surface'
                  data-doc-id='parent_monitoring_interactions_load_more'
                >
                  {isLoadingMoreInteractions
                    ? translations('widgets.monitoring.history.loadingMore')
                    : translations('widgets.monitoring.history.loadMore')}
                </KangurButton>
              </div>
            ) : null}
            {interactionsLoadMoreError ? (
              <div className='text-xs text-rose-600'>{interactionsLoadMoreError}</div>
            ) : null}
          </div>
        )}
      </KangurSummaryPanel>
    </KangurPanelStack>
  );
}
