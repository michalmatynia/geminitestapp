'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonDocument,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  LESSON_COMPONENTS,
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
  type KangurLessonsRuntimeStateContextValue,
} from './KangurLessonsRuntimeContext.shared';

const EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT = new Map<
  KangurLessonComponentId,
  KangurAssignmentSnapshot
>();

type KangurLessonAssignmentsMode = 'active' | 'completed';
type KangurLessonTargetAssignment = KangurAssignmentSnapshot & {
  target: { type: 'lesson' };
};

type KangurFocusedLessonAction =
  | { kind: 'none' }
  | { kind: 'set-age-group'; ageGroup: KangurLessonAgeGroup }
  | { kind: 'set-subject'; subject: KangurLessonSubject }
  | { kind: 'activate-lesson'; lessonId: string; nextHref: string };

type KangurActiveLessonRuntime = Pick<
  KangurLessonsRuntimeStateContextValue,
  | 'ActiveLessonComponent'
  | 'activeLesson'
  | 'activeLessonAssignment'
  | 'activeLessonDocument'
  | 'completedActiveLessonAssignment'
  | 'hasActiveLessonDocumentContent'
  | 'lessonDocuments'
  | 'nextLesson'
  | 'prevLesson'
  | 'shouldRenderLessonDocument'
>;

type KangurActiveLessonNeighbors = Pick<
  KangurActiveLessonRuntime,
  'activeLesson' | 'nextLesson' | 'prevLesson'
>;

const isKangurLessonTargetAssignment = (
  assignment: KangurAssignmentSnapshot
): assignment is KangurLessonTargetAssignment => assignment.target.type === 'lesson';

const matchesKangurLessonAssignmentMode = (
  assignment: KangurAssignmentSnapshot,
  mode: KangurLessonAssignmentsMode
): boolean =>
  mode === 'active'
    ? assignment.progress.status !== 'completed'
    : assignment.progress.status === 'completed';

const shouldReplaceKangurLessonAssignment = ({
  candidate,
  current,
  mode,
}: {
  candidate: KangurLessonTargetAssignment;
  current: KangurLessonTargetAssignment;
  mode: KangurLessonAssignmentsMode;
}): boolean => {
  if (mode === 'active') {
    return (
      LESSON_ASSIGNMENT_PRIORITY_ORDER[candidate.priority] <
      LESSON_ASSIGNMENT_PRIORITY_ORDER[current.priority]
    );
  }

  const candidateTimestamp = getLessonAssignmentTimestamp(
    candidate.progress.completedAt,
    candidate.updatedAt
  );
  const currentTimestamp = getLessonAssignmentTimestamp(
    current.progress.completedAt,
    current.updatedAt
  );
  return candidateTimestamp > currentTimestamp;
};

export const resolveLessonAssignmentsByComponent = ({
  assignments,
  isAssignmentsReady,
  lessonComponentIds,
  mode,
}: {
  assignments: KangurAssignmentSnapshot[];
  isAssignmentsReady: boolean;
  lessonComponentIds: Set<KangurLessonComponentId>;
  mode: KangurLessonAssignmentsMode;
}): Map<KangurLessonComponentId, KangurAssignmentSnapshot> => {
  if (!isAssignmentsReady || assignments.length === 0 || lessonComponentIds.size === 0) {
    return EMPTY_LESSON_ASSIGNMENTS_BY_COMPONENT;
  }

  const nextMap = new Map<KangurLessonComponentId, KangurLessonTargetAssignment>();

  assignments
    .filter((assignment) => !assignment.archived)
    .filter((assignment) => matchesKangurLessonAssignmentMode(assignment, mode))
    .filter(isKangurLessonTargetAssignment)
    .filter((assignment) => lessonComponentIds.has(assignment.target.lessonComponentId))
    .forEach((assignment) => {
      const componentId = assignment.target.lessonComponentId;
      const existing = nextMap.get(componentId);
      if (!existing) {
        nextMap.set(componentId, assignment);
        return;
      }

      if (
        shouldReplaceKangurLessonAssignment({
          candidate: assignment,
          current: existing,
          mode,
        })
      ) {
        nextMap.set(componentId, assignment);
      }
    });

  return nextMap;
};

export const resolveOrderedKangurLessons = ({
  lessonAssignmentsByComponent,
  lessons,
}: {
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  lessons: KangurLesson[];
}): KangurLesson[] => {
  if (lessons.length <= 1 || lessonAssignmentsByComponent.size === 0) {
    return lessons;
  }

  return [...lessons].sort((left, right) => {
    const leftAssignment = lessonAssignmentsByComponent.get(left.componentId);
    const rightAssignment = lessonAssignmentsByComponent.get(right.componentId);

    if (leftAssignment && !rightAssignment) return -1;
    if (!leftAssignment && rightAssignment) return 1;
    if (leftAssignment && rightAssignment) {
      const priorityDelta =
        LESSON_ASSIGNMENT_PRIORITY_ORDER[leftAssignment.priority] -
        LESSON_ASSIGNMENT_PRIORITY_ORDER[rightAssignment.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
    }

    return left.sortOrder - right.sortOrder;
  });
};

const scheduleKangurAssignmentsReady = (onReady: () => void): (() => void) => {
  if (
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    const frameId = window.requestAnimationFrame(onReady);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }

  const timeoutId = window.setTimeout(onReady, 0);
  return () => {
    window.clearTimeout(timeoutId);
  };
};

export const useKangurAssignmentsReady = (canAccessParentAssignments: boolean): boolean => {
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsAssignmentsReady(canAccessParentAssignments);
      return;
    }

    if (!canAccessParentAssignments) {
      setIsAssignmentsReady(false);
      return;
    }

    const cancelScheduledReady = scheduleKangurAssignmentsReady(() => {
      setIsAssignmentsReady(true);
    });

    return () => {
      setIsAssignmentsReady(false);
      cancelScheduledReady();
    };
  }, [canAccessParentAssignments]);

  return isAssignmentsReady;
};

export const useKangurFocusToken = (basePath: string): string | null => {
  const [focusToken, setFocusToken] = useState<string | null>(null);

  useEffect((): void => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nextFocusToken =
      readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)
        ?.trim()
        .toLowerCase() ?? null;
    setFocusToken(nextFocusToken && nextFocusToken.length > 0 ? nextFocusToken : null);
  }, [basePath]);

  return focusToken;
};

export const useKangurActiveLessonExistenceGuard = ({
  activeLessonId,
  lessons,
  setActiveLessonId,
}: {
  activeLessonId: string | null;
  lessons: KangurLesson[];
  setActiveLessonId: (lessonId: string | null) => void;
}): void => {
  useEffect((): void => {
    if (!activeLessonId) return;
    const exists = lessons.some((lesson) => lesson.id === activeLessonId);
    if (!exists) {
      setActiveLessonId(null);
    }
  }, [activeLessonId, lessons, setActiveLessonId]);
};

const canResolveKangurFocusedLessonAction = ({
  activeLessonId,
  focusToken,
  lessons,
}: {
  activeLessonId: string | null;
  focusToken: string | null;
  lessons: KangurLesson[];
}): boolean =>
  !activeLessonId &&
  typeof window !== 'undefined' &&
  Boolean(focusToken) &&
  lessons.length > 0;

const resolveKangurFocusedLessonScopeAction = ({
  ageGroup,
  focusScope,
  subject,
}: {
  ageGroup: KangurLessonAgeGroup;
  focusScope: ReturnType<typeof resolveFocusedLessonScope>;
  subject: KangurLessonSubject;
}): KangurFocusedLessonAction => {
  if (focusScope?.ageGroup && focusScope.ageGroup !== ageGroup) {
    return { kind: 'set-age-group', ageGroup: focusScope.ageGroup };
  }

  if (focusScope?.subject && focusScope.subject !== subject) {
    return { kind: 'set-subject', subject: focusScope.subject };
  }

  return { kind: 'none' };
};

const resolveKangurFocusedLessonAction = ({
  activeLessonId,
  ageGroup,
  basePath,
  focusToken,
  lessonTemplateMap,
  lessons,
  subject,
}: {
  activeLessonId: string | null;
  ageGroup: KangurLessonAgeGroup;
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  subject: KangurLessonSubject;
}): KangurFocusedLessonAction => {
  if (!canResolveKangurFocusedLessonAction({ activeLessonId, focusToken, lessons })) {
    return { kind: 'none' };
  }

  const focusScope = resolveFocusedLessonScope(focusToken ?? '', lessonTemplateMap);
  const focusScopeAction = resolveKangurFocusedLessonScopeAction({
    ageGroup,
    focusScope,
    subject,
  });
  if (focusScopeAction.kind !== 'none') {
    return focusScopeAction;
  }

  const focusedLessonId = resolveFocusedLessonId(focusToken ?? '', lessons);
  if (!focusedLessonId) {
    return { kind: 'none' };
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));

  return {
    kind: 'activate-lesson',
    lessonId: focusedLessonId,
    nextHref: `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  };
};

export const useKangurFocusedLessonSelection = ({
  activeLessonId,
  ageGroup,
  basePath,
  focusToken,
  lessonTemplateMap,
  lessons,
  setActiveLessonId,
  setAgeGroup,
  setSubject,
  subject,
}: {
  activeLessonId: string | null;
  ageGroup: KangurLessonAgeGroup;
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  setActiveLessonId: (lessonId: string | null) => void;
  setAgeGroup: (ageGroup: KangurLessonAgeGroup) => void;
  setSubject: (subject: KangurLessonSubject) => void;
  subject: KangurLessonSubject;
}): void => {
  useEffect((): void => {
    const action = resolveKangurFocusedLessonAction({
      activeLessonId,
      ageGroup,
      basePath,
      focusToken,
      lessonTemplateMap,
      lessons,
      subject,
    });

    if (action.kind === 'set-age-group') {
      setAgeGroup(action.ageGroup);
      return;
    }

    if (action.kind === 'set-subject') {
      setSubject(action.subject);
      return;
    }

    if (action.kind === 'activate-lesson') {
      setActiveLessonId(action.lessonId);
      window.history.replaceState({}, '', action.nextHref);
    }
  }, [
    activeLessonId,
    ageGroup,
    basePath,
    focusToken,
    lessonTemplateMap,
    lessons,
    setActiveLessonId,
    setAgeGroup,
    setSubject,
    subject,
  ]);
};

export const resolveKangurLessonsCanAccessParentAssignments = (
  canAccessParentAssignments: boolean | undefined,
  user: { activeLearner?: { id?: string | null } | null } | null | undefined
): boolean => canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);

const resolveKangurActiveLessonNeighbors = ({
  activeLessonId,
  orderedLessons,
}: {
  activeLessonId: string | null;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonNeighbors => {
  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] ?? null : null;

  return {
    activeLesson,
    prevLesson: activeIdx > 0 ? orderedLessons[activeIdx - 1] ?? null : null,
    nextLesson:
      activeIdx >= 0 && activeIdx < orderedLessons.length - 1
        ? orderedLessons[activeIdx + 1] ?? null
        : null,
  };
};

const resolveKangurActiveLessonDocuments = ({
  activeLessonDocument,
  activeLessonId,
}: {
  activeLessonDocument: KangurLessonDocument | null;
  activeLessonId: string | null;
}): KangurActiveLessonRuntime['lessonDocuments'] =>
  activeLessonId && activeLessonDocument ? { [activeLessonId]: activeLessonDocument } : {};

const resolveKangurCompletedActiveLessonAssignment = ({
  activeLesson,
  activeLessonAssignment,
  completedLessonAssignmentsByComponent,
}: {
  activeLesson: KangurLesson | null;
  activeLessonAssignment: KangurAssignmentSnapshot | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
}): KangurAssignmentSnapshot | null => {
  if (!activeLesson || activeLessonAssignment) {
    return null;
  }

  return completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null;
};

const resolveKangurActiveLessonRuntime = ({
  activeLessonDocument,
  activeLessonId,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
  orderedLessons,
}: {
  activeLessonDocument: KangurLessonDocument | null;
  activeLessonId: string | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonRuntime => {
  const { activeLesson, nextLesson, prevLesson } = resolveKangurActiveLessonNeighbors({
    activeLessonId,
    orderedLessons,
  });
  const ActiveLessonComponent = activeLesson
    ? LESSON_COMPONENTS[activeLesson.componentId]
    : null;
  const lessonDocuments = resolveKangurActiveLessonDocuments({
    activeLessonDocument,
    activeLessonId,
  });
  const hasActiveLessonDocumentContent =
    hasKangurLessonDocumentContent(activeLessonDocument);
  const shouldRenderLessonDocument =
    activeLesson?.contentMode === 'document' && hasActiveLessonDocumentContent;
  const activeLessonAssignment = activeLesson
    ? lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
    : null;
  const completedActiveLessonAssignment = resolveKangurCompletedActiveLessonAssignment({
    activeLesson,
    activeLessonAssignment,
    completedLessonAssignmentsByComponent,
  });

  return {
    ActiveLessonComponent,
    activeLesson,
    activeLessonAssignment,
    activeLessonDocument: activeLessonDocument ?? null,
    completedActiveLessonAssignment,
    hasActiveLessonDocumentContent,
    lessonDocuments,
    nextLesson,
    prevLesson,
    shouldRenderLessonDocument,
  };
};

export const useKangurActiveLessonRuntime = ({
  activeLessonDocument,
  activeLessonId,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
  orderedLessons,
}: {
  activeLessonDocument: KangurLessonDocument | null;
  activeLessonId: string | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonRuntime =>
  useMemo(
    () =>
      resolveKangurActiveLessonRuntime({
        activeLessonDocument,
        activeLessonId,
        completedLessonAssignmentsByComponent,
        lessonAssignmentsByComponent,
        orderedLessons,
      }),
    [
      activeLessonDocument,
      activeLessonId,
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      orderedLessons,
    ]
  );
