'use client';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocument,
  KangurLessonDocumentStore,
} from '@/features/kangur/shared/contracts/kangur';

import type { ComponentType, RefObject } from 'react';

import {
  LESSON_COMPONENTS,
  type LessonProps,
} from '@/features/kangur/lessons/lesson-ui-registry';
import {
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
  resolveFocusedLessonSubject,
  type KangurFocusedLessonScope,
} from '@/features/kangur/lessons/lesson-focus-utils';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';

export { LESSON_COMPONENTS };
export {
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
  resolveFocusedLessonSubject,
};
export type { KangurFocusedLessonScope };

export const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

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

export type LessonMasteryPresentation = {
  statusLabel: string;
  summaryLabel: string;
  badgeAccent: 'slate' | 'emerald' | 'amber' | 'rose';
};

export const getLessonMasteryPresentation = (
  lesson: KangurLesson,
  progress: KangurProgressState,
  translate: (key: string, values?: Record<string, string | number>) => string
): LessonMasteryPresentation => {
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

export type KangurLessonsRuntimeStateContextValue = {
  orderedLessons: KangurLesson[];
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessonSections: KangurLessonSection[];
  lessonDocuments: KangurLessonDocumentStore;
  progress: KangurProgressState;
  activeLessonId: string | null;
  activeLesson: KangurLesson | null;
  prevLesson: KangurLesson | null;
  nextLesson: KangurLesson | null;
  activeLessonDocument: KangurLessonDocument | null;
  ActiveLessonComponent: ComponentType<LessonProps> | null;
  shouldRenderLessonDocument: boolean;
  hasActiveLessonDocumentContent: boolean;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  completedLessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  activeLessonAssignment: KangurAssignmentSnapshot | null;
  completedActiveLessonAssignment: KangurAssignmentSnapshot | null;
  activeLessonContentRef: RefObject<HTMLDivElement | null>;
};

export type KangurLessonsRuntimeActionsContextValue = {
  selectLesson: (lessonId: string) => void;
  clearActiveLesson: () => void;
};

export type KangurLessonsRuntimeContextValue = KangurLessonsRuntimeStateContextValue &
  KangurLessonsRuntimeActionsContextValue;
