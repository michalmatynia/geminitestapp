import { FOCUS_TO_COMPONENT } from '@/features/kangur/lessons/lesson-ui-registry';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';

export const resolveFocusedLessonId = (focusToken: string, lessons: KangurLesson[]): string | null => {
  const mappedComponent = FOCUS_TO_COMPONENT[focusToken];
  if (mappedComponent) {
    const byComponent = lessons.find((lesson) => lesson.componentId === mappedComponent);
    if (byComponent) return byComponent.id;
  }

  const byId = lessons.find((lesson) => lesson.id.toLowerCase() === focusToken);
  if (byId) return byId.id;

  const byTitle = lessons.find((lesson) => lesson.title.toLowerCase().includes(focusToken));
  return byTitle?.id ?? null;
};

export const getLessonMasteryPresentation = (
  lesson: KangurLesson,
  progress: ReturnType<typeof useKangurProgressState>,
  translate: (key: string, values?: Record<string, string | number>) => string
): {
  statusLabel: string;
  summaryLabel: string;
  badgeAccent: 'slate' | 'emerald' | 'amber' | 'rose';
} => {
  const mastery = progress.lessonMastery[lesson.componentId];
  if (!mastery) {
    return {
      statusLabel: translate('new'),
      summaryLabel: translate('noSavedPractice'),
      badgeAccent: 'slate',
    };
  }

  if (mastery.masteryPercent >= 85) {
    return {
      statusLabel: translate('mastered', { percent: mastery.masteryPercent }),
      summaryLabel: translate('completedBest', {
        completions: mastery.completions,
        percent: mastery.bestScorePercent,
      }),
      badgeAccent: 'emerald',
    };
  }

  if (mastery.masteryPercent >= 60) {
    return {
      statusLabel: translate('inProgress', { percent: mastery.masteryPercent }),
      summaryLabel: translate('completedLast', {
        completions: mastery.completions,
        percent: mastery.lastScorePercent,
      }),
      badgeAccent: 'amber',
    };
  }

  return {
    statusLabel: translate('revisit', { percent: mastery.masteryPercent }),
    summaryLabel: translate('completedLast', {
      completions: mastery.completions,
      percent: mastery.lastScorePercent,
    }),
    badgeAccent: 'rose',
  };
};

export const getLessonAssignmentTimestamp = (
  primaryValue: string | null,
  fallbackValue: string
): number => {
  const primaryTimestamp = primaryValue ? Date.parse(primaryValue) : Number.NaN;
  if (!Number.isNaN(primaryTimestamp)) {
    return primaryTimestamp;
  }

  const fallbackTimestamp = Date.parse(fallbackValue);
  return Number.isNaN(fallbackTimestamp) ? 0 : fallbackTimestamp;
};

export const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;
