import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type { LessonsTutorSessionContext } from './Lessons.types';

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

export const resolveLessonsIsRouteTransitionIdle = (
  transitionPhase: string | null | undefined
): boolean =>
  transitionPhase == null || transitionPhase === 'idle';

export const resolveLessonsActiveLessonAssignments = ({
  activeLesson,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
}: {
  activeLesson: KangurLesson | null;
  completedLessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
}): {
  activeLessonAssignment: KangurAssignmentSnapshot | null;
  completedActiveLessonAssignment: KangurAssignmentSnapshot | null;
} => {
  if (!activeLesson) {
    return {
      activeLessonAssignment: null,
      completedActiveLessonAssignment: null,
    };
  }

  const activeLessonAssignment = lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;

  return {
    activeLessonAssignment,
    completedActiveLessonAssignment: activeLessonAssignment
      ? null
      : (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null),
  };
};

export const resolveLessonsTutorContext = ({
  activeLesson,
  activeLessonAssignment,
  completedActiveLessonAssignment,
  pageTitle,
}: {
  activeLesson: KangurLesson | null;
  activeLessonAssignment: { id?: string | null } | null;
  completedActiveLessonAssignment: { id?: string | null } | null;
  pageTitle: string;
}): LessonsTutorSessionContext => ({
  surface: 'lesson',
  contentId: activeLesson?.id ?? 'lesson:list',
  title: activeLesson?.title ?? pageTitle,
  assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? undefined,
});
