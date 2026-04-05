'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerInteractionHistory } from '@kangur/platform';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  asRecord,
  formatDuration,
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

const kangurPlatform = getKangurPlatform();
const INTERACTIONS_PAGE_LIMIT = 20;
const INTERACTIONS_LOAD_DEFER_MS = 900;

export function useMonitoringWidgetState() {
  const translations = useTranslations('KangurParentDashboard');
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

  const formatLocalizedDuration = useCallback((seconds: number): string =>
    formatDuration({
      seconds,
      translate: (key, values) => translations(key, values),
    }), [translations]);

  const taskKindLabels: Record<string, string> = useMemo(() => ({
    game: translations('widgets.monitoring.interaction.kind.game'),
    lesson: translations('widgets.monitoring.interaction.kind.lesson'),
    test: translations('widgets.monitoring.interaction.kind.test'),
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
          setInteractionsError(translationsRef.current('widgets.monitoring.errors.load'));
        } else {
          setInteractionsLoadMoreError(
            translationsRef.current('widgets.monitoring.errors.loadMore')
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
          const sectionLabel = readString(metadata?.['label']) ?? readString(metadata?.['sectionId']);
          const lessonId = lessonKey && isLessonComponentId(lessonKey, lessonsById) ? lessonKey : null;
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

        const durationSeconds = readNumber(metadata?.['durationSeconds']);
        return {
          id: entry.id,
          kind: 'session' as const,
          label: translations('widgets.monitoring.interaction.sessionLabel'),
          description: translations('widgets.monitoring.interaction.sessionInProgress'),
          durationSeconds,
          timestamp,
          timestampMs,
        };
      }),
    [formatLocalizedDuration, interactions, lessonsById, taskKindLabels, translations]
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

  return {
    translations,
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
    lessonPanelTimeCards,
    fetchInteractions,
    formatLocalizedDuration,
  };
}
