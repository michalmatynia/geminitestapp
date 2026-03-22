'use client';

import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerInteractionHistory } from '@kangur/platform';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurMetaText,
  KangurPanelStack,
  KangurSummaryPanel,
  KangurTextField,
  KangurWidgetIntro,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_COMPACT_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { ActivityTypes } from '@/shared/constants/observability';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { withKangurClientError } from '@/features/kangur/observability/client';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';


const kangurPlatform = getKangurPlatform();
const INTERACTIONS_PAGE_LIMIT = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

type InteractionFilter = 'all' | 'opened_task' | 'lesson_panel' | 'session';

const formatDuration = ({
  seconds,
  translate,
}: {
  seconds: number;
  translate: (key: string, values?: Record<string, string | number>) => string;
}): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return translate('widgets.monitoring.duration.seconds', {
      seconds: remainingSeconds,
    });
  }
  return translate('widgets.monitoring.duration.minutesSeconds', {
    minutes,
    seconds: `${remainingSeconds}`.padStart(2, '0'),
  });
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

const parsePanelIndex = (panelId: string): number => {
  const match = panelId.match(/\d+/u);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const parseTimestamp = (value: string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseTimestampStrict = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDateFilterValue = (value: string): number | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const isLessonComponentId = (
  value: string,
  lessonsMap: Map<KangurLessonComponentId, unknown>
): value is KangurLessonComponentId => lessonsMap.has(value as KangurLessonComponentId);

export function KangurParentDashboardAssignmentsMonitoringWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    activeLearner,
    activeTab,
    canAccessDashboard,
    progress,
  } = useKangurParentDashboardRuntime();
  const { entry: monitoringContent } = useKangurPageContentEntry('parent-dashboard-monitoring');
  const { ageGroup } = useKangurAgeGroupFocus();
  const lessonsQuery = useKangurLessons({ ageGroup, enabledOnly: true });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
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
  const interactionViews = useMemo(
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
  const filtersActive =
    interactionFilter !== 'all' || Boolean(interactionDateFrom) || Boolean(interactionDateTo);

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
  }, [activeLearnerId, canAccessDashboard]);

  if (!canAccessDashboard) {
    return null;
  }

  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'monitoring')) {
    return null;
  }

  if (!activeLearnerId) {
    return null;
  }

  return (
    <KangurPanelStack>
      <KangurWidgetIntro
        description={
          monitoringContent?.summary ??
          translations('widgets.monitoring.description')
        }
        title={monitoringContent?.title ?? translations('widgets.monitoring.title')}
      />
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
        {isLoadingInteractions ? (
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
