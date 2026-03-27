'use client';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type {
  KangurLessonAgeGroup,
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonDocument,
  KangurLessonDocumentStore,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';

import type { ComponentType, RefObject } from 'react';

import {
  FOCUS_TO_COMPONENT,
  LESSON_COMPONENTS,
  type LessonProps,
} from '@/features/kangur/lessons/lesson-ui-registry';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/lessons/lesson-catalog';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';

export { LESSON_COMPONENTS };

export const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

export const resolveFocusedLessonId = (
  focusToken: string,
  lessons: KangurLesson[]
): string | null => {
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

export const resolveFocusedLessonComponentId = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurLessonComponentId | null => {
  const normalizedToken = focusToken.trim().toLowerCase();
  if (!normalizedToken) {
    return null;
  }

  const mappedComponent = FOCUS_TO_COMPONENT[normalizedToken];
  if (mappedComponent) {
    return mappedComponent;
  }

  if (templateMap) {
    return templateMap.has(normalizedToken)
      ? (normalizedToken as KangurLessonComponentId)
      : null;
  }

  return normalizedToken in KANGUR_LESSON_LIBRARY
    ? (normalizedToken as KangurLessonComponentId)
    : null;
};

export const resolveFocusedLessonSubject = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurLessonSubject | null => {
  return resolveFocusedLessonScope(focusToken, templateMap)?.subject ?? null;
};

export type KangurFocusedLessonScope = {
  componentId: KangurLessonComponentId;
  subject: KangurLessonSubject;
  ageGroup: KangurLessonAgeGroup | null;
};

export const resolveFocusedLessonScope = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurFocusedLessonScope | null => {
  const componentId = resolveFocusedLessonComponentId(focusToken, templateMap);
  if (!componentId) {
    return null;
  }

  if (templateMap) {
    const template = templateMap.get(componentId);
    if (!template) {
      return null;
    }

    return {
      componentId,
      subject: template.subject,
      ageGroup: template.ageGroup ?? null,
    };
  }

  const template = KANGUR_LESSON_LIBRARY[componentId];
  if (!template) {
    return null;
  }

  return {
    componentId,
    subject: template.subject,
    ageGroup: template.ageGroup ?? null,
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
