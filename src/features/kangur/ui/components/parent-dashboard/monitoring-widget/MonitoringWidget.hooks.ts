'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerInteractionHistory } from '@kangur/platform';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  asRecord,
  formatDuration,
  formatProgressTimestamp,
  type InteractionFilter,
  type InteractionView,
  isLessonComponentId,
  normalizePanelLabel,
  parsePanelIndex,
  parseTimestamp,
  parseTimestampStrict,
  readNumber,
  readString,
} from '../KangurParentDashboardAssignmentsMonitoringWidget.utils';
import { ActivityTypes } from '@/shared/constants/observability';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

const kangurPlatform = getKangurPlatform();
const INTERACTIONS_PAGE_LIMIT = 20;
const INTERACTIONS_LOAD_DEFER_MS = 900;

function interpolateTemplate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

const matchesInteractionKindFilter = (
  interactionFilter: InteractionFilter,
  view: InteractionView
): boolean => interactionFilter === 'all' || view.kind === interactionFilter;

const matchesInteractionDateFrom = (
  interactionDateFrom: string,
  viewDate: string | null
): boolean => !interactionDateFrom || Boolean(viewDate && viewDate >= interactionDateFrom);

const matchesInteractionDateTo = (
  interactionDateTo: string,
  viewDate: string | null
): boolean => !interactionDateTo || Boolean(viewDate && viewDate <= interactionDateTo);

const shouldIncludeInteractionView = ({
  interactionDateFrom,
  interactionDateTo,
  interactionFilter,
  view,
}: {
  interactionDateFrom: string;
  interactionDateTo: string;
  interactionFilter: InteractionFilter;
  view: InteractionView;
}): boolean => {
  const viewDate = view.timestamp?.slice(0, 10) ?? null;
  return (
    matchesInteractionKindFilter(interactionFilter, view) &&
    matchesInteractionDateFrom(interactionDateFrom, viewDate) &&
    matchesInteractionDateTo(interactionDateTo, viewDate)
  );
};

export function useMonitoringWidgetState() {
  const translations = useTranslations('KangurParentDashboard');
  const locale = useLocale();
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    activeLearner,
    lessons = [],
    progress,
  } = useKangurParentDashboardRuntime();
  const activeLearnerId = activeLearner?.id ?? null;
  const lessonPanelProgress = progress.lessonPanelProgress ?? {};
  const translationsRef = useRef(translations);

  translationsRef.current = translations;

  const [interactionHistory, setInteractionHistory] = useState<KangurLearnerInteractionHistory | null>(null);
  const [isInteractionQueryReady, setIsInteractionQueryReady] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [interactionsError, setInteractionsError] = useState<string | null>(null);
  const [isLoadingMoreInteractions, setIsLoadingMoreInteractions] = useState(false);
  const [interactionsLoadMoreError, setInteractionsLoadMoreError] = useState<string | null>(null);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>('all');
  const [interactionDateFrom, setInteractionDateFrom] = useState('');
  const [interactionDateTo, setInteractionDateTo] = useState('');

  const translate = useMemo(() => {
    return (key: string, fallback: string, values?: Record<string, string | number>) => {
      const translated = translations(key as never, values as never);
      if (translated === key || translated.endsWith(`.${key}`)) {
        return interpolateTemplate(fallback, values);
      }

      return translated;
    };
  }, [translations]);

  const formatLocalizedDuration = useCallback((seconds: number): string =>
    formatDuration({
      seconds,
      translate: (key, values) => translations(key, values),
    }), [translations]);

  const formatTimestamp = useCallback((value: string | null | undefined): string =>
    formatProgressTimestamp({
      value,
      locale,
      fallback: translations('widgets.monitoring.timestampUnavailable' as never),
    }), [locale, translations]);

  const taskKindLabels: Record<string, string> = useMemo(() => ({
    game: translations('widgets.monitoring.interaction.kind.game' as never),
    lesson: translations('widgets.monitoring.interaction.kind.lesson' as never),
    test: translations('widgets.monitoring.interaction.kind.test' as never),
  }), [translations]);

  const lessonsById = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.componentId, lesson] as const)),
    [lessons]
  );

  const fetchInteractions = useCallback(
    async (learnerId: string, options: { offset: number; reset?: boolean }): Promise<void> => {
      const { offset, reset } = options;
      if (reset) {
        setIsLoadingInteractions(true);
        setInteractionsError(null);
      } else {
        setIsLoadingMoreInteractions(true);
        setInteractionsLoadMoreError(null);
      }

      try {
        const result = await kangurPlatform.learnerInteractions.list(learnerId, {
          limit: INTERACTIONS_PAGE_LIMIT,
          offset,
        });

        if (reset) {
          setInteractionHistory(result);
        } else {
          setInteractionHistory((prev) =>
            prev ? { ...result, items: [...prev.items, ...result.items] } : result
          );
        }
      } catch (err) {
        void ErrorSystem.captureException(err);
        if (reset) {
          setInteractionsError(translationsRef.current('widgets.monitoring.errors.load' as never));
        } else {
          setInteractionsLoadMoreError(
            translationsRef.current('widgets.monitoring.errors.loadMore' as never)
          );
        }
      } finally {
        if (reset) setIsLoadingInteractions(false);
        else setIsLoadingMoreInteractions(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeLearnerId) {
      setInteractionHistory(null);
      setIsInteractionQueryReady(false);
      return;
    }
    const timeoutId = setTimeout(() => setIsInteractionQueryReady(true), INTERACTIONS_LOAD_DEFER_MS);
    return () => clearTimeout(timeoutId);
  }, [activeLearnerId]);

  useEffect(() => {
    if (activeLearnerId && isInteractionQueryReady) {
      void fetchInteractions(activeLearnerId, { offset: 0, reset: true });
    }
  }, [activeLearnerId, isInteractionQueryReady]);

  const interactions = interactionHistory?.items ?? [];
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
            translations('widgets.monitoring.interaction.openedTaskTitle' as never);
          const kindRaw = readString(metadata?.['kind']);
          const kindLabel = kindRaw
            ? taskKindLabels[kindRaw] ?? translations('widgets.monitoring.interaction.kind.default' as never)
            : translations('widgets.monitoring.interaction.kind.default' as never);
          return {
            id: entry.id,
            kind: 'opened_task' as const,
            label: (translations as any)('widgets.monitoring.interaction.openedTaskLabel' as never, {
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
          const sectionLabel = readString(metadata?.['label']) ?? readString(metadata?.['sectionId']);
          const lessonId = lessonKey && isLessonComponentId(lessonKey, lessonsById) ? lessonKey : null;
          const lessonTitle = lessonId
            ? lessonsById.get(lessonId)?.title ?? translations('widgets.monitoring.interaction.lessonFallback' as never)
            : translations('widgets.monitoring.interaction.lessonFallback' as never);
          const detail = sectionLabel ? `${lessonTitle} · ${sectionLabel}` : lessonTitle;
          const totalSeconds = readNumber(metadata?.['totalSeconds']);
          const timeLabel = totalSeconds ? ` · ${formatLocalizedDuration(totalSeconds)}` : '';
          return {
            id: entry.id,
            kind: 'lesson_panel' as const,
            label: translations('widgets.monitoring.interaction.lessonPanelLabel' as never),
            description: `${detail}${timeLabel}`,
            durationSeconds: totalSeconds,
            timestamp,
            timestampMs,
          };
        }

        const durationSeconds = readNumber(metadata?.['durationSeconds']);
        return {
          id: entry.id,
          kind: 'session' as const,
          label: translations('widgets.monitoring.interaction.sessionLabel' as never),
          description: translations('widgets.monitoring.interaction.sessionInProgress' as never),
          durationSeconds,
          timestamp,
          timestampMs,
        };
      }),
    [formatLocalizedDuration, interactions, lessonsById, taskKindLabels, translations]
  );

  const filteredInteractionViews = useMemo(
    () =>
      interactionViews.filter((view) =>
        shouldIncludeInteractionView({
          interactionDateFrom,
          interactionDateTo,
          interactionFilter,
          view,
        })
      ),
    [interactionDateFrom, interactionDateTo, interactionFilter, interactionViews]
  );

  const interactionCounts = useMemo(
    () =>
      filteredInteractionViews.reduce(
        (acc, view) => {
          acc.total += 1;
          if (view.kind === 'session') {
            acc.sessions += 1;
            if (typeof view.durationSeconds === 'number' && view.durationSeconds > 0) {
              acc.totalSessionSeconds += view.durationSeconds;
            }
          } else if (view.kind === 'opened_task') {
            acc.openedTasks += 1;
          } else if (view.kind === 'lesson_panel') {
            acc.lessonPanels += 1;
          }
          return acc;
        },
        {
          lessonPanels: 0,
          openedTasks: 0,
          sessions: 0,
          total: 0,
          totalSessionSeconds: 0,
        }
      ),
    [filteredInteractionViews]
  );

  const averageSessionDurationLabel = useMemo(
    () =>
      interactionCounts.sessions > 0
        ? formatLocalizedDuration(
            Math.round(interactionCounts.totalSessionSeconds / interactionCounts.sessions)
          )
        : null,
    [formatLocalizedDuration, interactionCounts.sessions, interactionCounts.totalSessionSeconds]
  );

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
                      ? (translations as any)('widgets.monitoring.lessonPanelTime.panelNumber' as never, {
                          number: panelIndex,
                        })
                      : translations('widgets.monitoring.lessonPanelTime.panelDefault' as never));
                  return {
                    id: panelId,
                    index: panelIndex,
                    title,
                    seconds: panel.seconds,
                  };
                })
                .filter((panel) => panel.seconds > 0)
                .sort((left, right) => left.index - right.index);

              if (panelEntries.length === 0) return null;

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

          if (sectionEntries.length === 0) return null;

          const totalSeconds = sectionEntries.reduce((sum, section) => sum + section.totalSeconds, 0);
          const sessionUpdatedAt = sectionEntries.reduce<string | null>((latest, section) => {
            const latestTimestamp = parseTimestamp(latest);
            const sectionTimestamp = parseTimestamp(section.sessionUpdatedAt);
            return sectionTimestamp >= latestTimestamp ? section.sessionUpdatedAt : latest;
          }, null);

          return { lesson, sections: sectionEntries, totalSeconds, sessionUpdatedAt };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [lessonPanelProgress, lessons, translations]
  );

  const topLessonPanelCard = useMemo(
    () =>
      lessonPanelTimeCards
        .slice()
        .sort((left, right) => right.totalSeconds - left.totalSeconds)[0] ?? null,
    [lessonPanelTimeCards]
  );

  const hasActiveFilters =
    interactionFilter !== 'all' || interactionDateFrom.length > 0 || interactionDateTo.length > 0;

  const shouldShowLoadingState = !isInteractionQueryReady || isLoadingInteractions;

  const hasMoreInteractions = Boolean(
    interactionHistory && interactionHistory.items.length < interactionHistory.total
  );

  const nextInteractionOffset = interactionHistory?.items.length ?? null;

  const segmentedFilterClassName = isCoarsePointer
    ? 'min-h-11 min-w-0 flex-1 px-4 text-xs touch-manipulation select-none active:scale-[0.97] sm:flex-none'
    : 'min-w-0 flex-1 px-3 text-xs sm:flex-none';

  return {
    translations,
    translate,
    activeLearnerId,
    interactionFilter,
    setInteractionFilter,
    interactionDateFrom,
    setInteractionDateFrom,
    interactionDateTo,
    setInteractionDateTo,
    interactionHistory,
    isInteractionQueryReady,
    isLoadingInteractions,
    interactionsError,
    isLoadingMoreInteractions,
    interactionsLoadMoreError,
    interactionViews,
    filteredInteractionViews,
    interactionCounts,
    averageSessionDurationLabel,
    lessonPanelTimeCards,
    topLessonPanelCard,
    hasActiveFilters,
    shouldShowLoadingState,
    hasMoreInteractions,
    nextInteractionOffset,
    segmentedFilterClassName,
    fetchInteractions,
    formatLocalizedDuration,
    formatTimestamp,
  };
}
