import { useEffect, useMemo, useState } from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerInteractionHistory } from '@/features/kangur/services/ports';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
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
  KangurPanelIntro,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { ActivityTypes } from '@/shared/constants/observability';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { KangurLessonComponentId } from '@/shared/contracts/kangur';


const kangurPlatform = getKangurPlatform();
const INTERACTIONS_PAGE_LIMIT = 20;
const INTERACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'opened_task', label: 'Zadania' },
  { value: 'lesson_panel', label: 'Panele lekcji' },
  { value: 'session', label: 'Sesje' },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

type InteractionFilter = (typeof INTERACTION_FILTER_OPTIONS)[number]['value'];

const formatDuration = (seconds: number): string => {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(normalized / 60);
  const remainingSeconds = normalized % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${`${remainingSeconds}`.padStart(2, '0')}s`;
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

const TASK_KIND_LABELS: Record<string, string> = {
  game: 'Gra',
  lesson: 'Lekcja',
  test: 'Test',
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
  const {
    activeLearner,
    activeTab,
    canAccessDashboard,
    progress,
  } = useKangurParentDashboardRuntime();
  const { entry: monitoringContent } = useKangurPageContentEntry('parent-dashboard-monitoring');
  const settingsStore = useSettingsStore();
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo(
    () => parseKangurLessons(rawLessons).filter((lesson) => lesson.enabled),
    [rawLessons]
  );
  const activeLearnerId = activeLearner?.id ?? null;
  const lessonPanelProgress = progress.lessonPanelProgress ?? {};
  const [interactionHistory, setInteractionHistory] =
    useState<KangurLearnerInteractionHistory | null>(null);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [interactionsError, setInteractionsError] = useState<string | null>(null);
  const [isLoadingMoreInteractions, setIsLoadingMoreInteractions] = useState(false);
  const [interactionsLoadMoreError, setInteractionsLoadMoreError] = useState<string | null>(null);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');
  const [interactionDateFrom, setInteractionDateFrom] = useState('');
  const [interactionDateTo, setInteractionDateTo] = useState('');
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
                      ? `Panel ${panelIndex}`
                      : 'Panel');
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
            'Otwarte zadanie';
          const kindRaw = readString(metadata?.['kind']);
          const kindLabel = kindRaw ? TASK_KIND_LABELS[kindRaw] ?? 'Zadanie' : 'Zadanie';
          return {
            id: entry.id,
            kind: 'opened_task' as const,
            label: `Otwarte ${kindLabel.toLowerCase()}`,
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
          const lessonTitle = lessonId ? lessonsById.get(lessonId)?.title ?? 'Lekcja' : 'Lekcja';
          const detail = sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
          const totalSeconds = readNumber(metadata?.['totalSeconds']);
          const timeLabel = totalSeconds ? ` · ${formatDuration(totalSeconds)}` : '';
          return {
            id: entry.id,
            kind: 'lesson_panel' as const,
            label: 'Aktywność w panelach',
            description: `${detail}${timeLabel}`,
            timestamp,
            timestampMs,
          };
        }

        if (entry.type === ActivityTypes.KANGUR.LEARNER_SESSION) {
          const durationSeconds = readNumber(metadata?.['durationSeconds']);
          const durationLabel = durationSeconds ? formatDuration(durationSeconds) : null;
          const endedAt = readString(metadata?.['endedAt']);
          const description = endedAt
            ? durationLabel
              ? `Czas trwania: ${durationLabel}`
              : 'Sesja zakończona.'
            : durationLabel
              ? `Sesja w toku · ${durationLabel}`
              : 'Sesja w toku.';

          return {
            id: entry.id,
            kind: 'session' as const,
            label: 'Sesja logowania',
            description,
            timestamp,
            timestampMs,
          };
        }

        return {
          id: entry.id,
          kind: 'other' as const,
          label: 'Aktywność ucznia',
          description: entry.description ?? 'Aktywność ucznia.',
          timestamp,
          timestampMs,
        };
      }),
    [interactions, lessonsById]
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
    try {
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
    } catch (error) {
      logClientError(error);
      setInteractionsLoadMoreError('Nie udało się wczytać starszych interakcji.');
    } finally {
      setIsLoadingMoreInteractions(false);
    }
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
      .catch(() => {
        if (!isActive) {
          return;
        }
        setInteractionsError('Nie udało się wczytać historii interakcji.');
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
    <div className='flex flex-col gap-5'>
      <KangurPanelIntro
        description={
          monitoringContent?.summary ??
          'Monitoruj postęp przypisanych zadań, w tym sugestii StudiQ, aby utrzymać stały rytm nauki.'
        }
        title={monitoringContent?.title ?? 'Monitorowanie zadań'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <KangurSummaryPanel
        accent='sky'
        className='mt-1'
        description='Czas spędzony w panelach lekcji podczas ostatniej sesji (liczony tylko przy aktywnej karcie).'
        label='Czas w panelach lekcji'
      >
        {lessonPanelTimeCards.length > 0 ? (
          <div className='mt-3 flex flex-col gap-3'>
            {lessonPanelTimeCards.map((entry) => (
              <KangurInfoCard
                key={entry.lesson.componentId}
                className='rounded-[26px]'
                padding='lg'
              >
                <div className='flex flex-col gap-3'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {entry.lesson.title}
                      </div>
                      <KangurMetaText className='break-words' tone='slate'>
                        Ostatnia sesja: {formatProgressTimestamp(entry.sessionUpdatedAt)}
                      </KangurMetaText>
                    </div>
                    <div className='text-sm font-semibold text-sky-700'>
                      {formatDuration(entry.totalSeconds)}
                    </div>
                  </div>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {entry.sections.map((section) => (
                      <div
                        key={`${entry.lesson.componentId}-${section.id}`}
                        className='rounded-[18px] border border-sky-200/70 bg-white/80 px-3 py-2'
                      >
                        <div className='break-words text-xs font-semibold [color:var(--kangur-page-text)]'>
                          {section.label}
                        </div>
                        <KangurMetaText tone='slate'>
                          {formatDuration(section.totalSeconds)} łącznie
                        </KangurMetaText>
                        <div className='mt-2 flex flex-col gap-1 text-xs'>
                          {section.panels.map((panel) => (
                            <div
                              key={`${entry.lesson.componentId}-${section.id}-${panel.id}`}
                              className='flex items-center justify-between gap-2'
                            >
                              <span className='min-w-0 truncate [color:var(--kangur-page-text)]'>
                                {panel.title}
                              </span>
                              <span className='shrink-0 text-slate-500'>
                                {formatDuration(panel.seconds)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </KangurInfoCard>
            ))}
          </div>
        ) : (
          <div className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>
            Brak danych o czasie paneli. Dane pojawią się po przejściu ucznia przez lekcje.
          </div>
        )}
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='indigo'
        className='mt-1'
        description='Ostatnie interakcje ucznia: otwarte zadania, aktywność w panelach oraz sesje logowania.'
        label='Historia interakcji'
      >
        <div className='mt-3 rounded-[18px] border border-indigo-100/80 bg-white/70 p-4'>
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <KangurMetaText tone='slate'>Filtry</KangurMetaText>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap justify-start`}
                role='tablist'
                aria-label='Filtrowanie interakcji'
              >
                {INTERACTION_FILTER_OPTIONS.map((option) => (
                  <KangurButton
                    key={option.value}
                    type='button'
                    onClick={() => setInteractionFilter(option.value)}
                    aria-pressed={interactionFilter === option.value}
                    aria-selected={interactionFilter === option.value}
                    role='tab'
                    className='min-w-0 px-3 text-xs'
                    size='sm'
                    variant={interactionFilter === option.value ? 'segmentActive' : 'segment'}
                  >
                    {option.label}
                  </KangurButton>
                ))}
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              <div className='flex flex-col gap-2'>
                <KangurMetaText tone='slate'>Data od</KangurMetaText>
                <KangurTextField
                  type='date'
                  value={interactionDateFrom}
                  onChange={(event) => setInteractionDateFrom(event.target.value)}
                  aria-label='Data od'
                  size='sm'
                />
              </div>
              <div className='flex flex-col gap-2'>
                <KangurMetaText tone='slate'>Data do</KangurMetaText>
                <KangurTextField
                  type='date'
                  value={interactionDateTo}
                  onChange={(event) => setInteractionDateTo(event.target.value)}
                  aria-label='Data do'
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
                  >
                    Wyczyść filtry
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
            description='Ładujemy ostatnie interakcje ucznia.'
            title='Ładowanie...'
          />
        ) : interactionsError ? (
          <KangurEmptyState
            accent='rose'
            align='center'
            data-testid='parent-monitoring-interactions-error'
            description='Spróbuj ponownie za chwilę.'
            title={interactionsError}
          />
        ) : filteredInteractions.length === 0 ? (
          <KangurEmptyState
            accent='slate'
            align='center'
            data-testid='parent-monitoring-interactions-empty'
            description={
              filtersActive
                ? 'Zmień filtry, aby zobaczyć więcej aktywności.'
                : 'Brak interakcji do pokazania.'
            }
            title={filtersActive ? 'Brak wyników.' : 'Brak aktywności.'}
          />
        ) : (
          <div className='mt-3 flex flex-col gap-3'>
            {filteredInteractions.map((entry) => (
              <div
                key={entry.id}
                className='rounded-[18px] border border-indigo-200/70 bg-white/80 px-4 py-3'
                data-testid={`parent-monitoring-interaction-${entry.id}`}
              >
                <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='break-words text-sm font-semibold [color:var(--kangur-page-text)]'>
                    {entry.label}
                  </div>
                  <KangurMetaText className='break-words' tone='slate'>
                    {formatProgressTimestamp(entry.timestamp)}
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
                  className='w-full sm:w-auto'
                  disabled={isLoadingMoreInteractions}
                  onClick={() => void handleLoadMoreInteractions()}
                  size='sm'
                  variant='surface'
                  data-doc-id='parent_monitoring_interactions_load_more'
                >
                  {isLoadingMoreInteractions ? 'Ładowanie...' : 'Pokaż starsze'}
                </KangurButton>
              </div>
            ) : null}
            {interactionsLoadMoreError ? (
              <div className='text-xs text-rose-600'>{interactionsLoadMoreError}</div>
            ) : null}
          </div>
        )}
      </KangurSummaryPanel>
    </div>
  );
}
