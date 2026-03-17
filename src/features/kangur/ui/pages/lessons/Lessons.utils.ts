import { FOCUS_TO_COMPONENT } from '@/features/kangur/lessons/lesson-ui-registry';
import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
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
  progress: ReturnType<typeof useKangurProgressState>
): {
  statusLabel: string;
  summaryLabel: string;
  badgeAccent: 'slate' | 'emerald' | 'amber' | 'rose';
} => {
  const mastery = progress.lessonMastery[lesson.componentId];
  if (!mastery) {
    return {
      statusLabel: 'Nowa',
      summaryLabel: 'Brak zapisanej praktyki',
      badgeAccent: 'slate',
    };
  }

  if (mastery.masteryPercent >= 85) {
    return {
      statusLabel: `Opanowane ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · najlepszy wynik ${mastery.bestScorePercent}%`,
      badgeAccent: 'emerald',
    };
  }

  if (mastery.masteryPercent >= 60) {
    return {
      statusLabel: `W trakcie ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
      badgeAccent: 'amber',
    };
  }

  return {
    statusLabel: `Powtórz ${mastery.masteryPercent}%`,
    summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
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
