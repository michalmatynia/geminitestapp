'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from 'react';

import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurLessonDocuments, useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { useKangurLessonTemplates } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';

import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  LESSON_COMPONENTS,
  resolveFocusedLessonId,
  resolveFocusedLessonSubject,
} from './KangurLessonsRuntimeContext.shared';

import type {
  KangurLessonsRuntimeActionsContextValue,
  KangurLessonsRuntimeContextValue,
  KangurLessonsRuntimeStateContextValue,
} from './KangurLessonsRuntimeContext.shared';

const KangurLessonsRuntimeStateContext =
  createContext<KangurLessonsRuntimeStateContextValue | null>(null);
const KangurLessonsRuntimeActionsContext =
  createContext<KangurLessonsRuntimeActionsContextValue | null>(null);

export function KangurLessonsRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user } = auth;
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup } = useKangurAgeGroupFocus();
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });
  const { data: lessonTemplates = [] } = useKangurLessonTemplates();
  const lessonTemplateMap = useMemo(
    () => new Map(lessonTemplates.map((t) => [t.componentId, t])),
    [lessonTemplates],
  );
  const lessonsQuery = useKangurLessons({ subject, ageGroup, enabledOnly: true });
  const lessonDocumentsQuery = useKangurLessonDocuments();
  const lessons = useMemo((): KangurLesson[] => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const lessonComponentIds = useMemo(
    () => new Set(lessons.map((lesson) => lesson.componentId)),
    [lessons]
  );
  const lessonDocuments = useMemo(
    () => lessonDocumentsQuery.data ?? {},
    [lessonDocumentsQuery.data]
  );
  const lessonAssignmentsByComponent = useMemo(() => {
    const nextMap = new Map<KangurLessonComponentId, KangurAssignmentSnapshot>();

    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status !== 'completed')
      .filter(
        (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
      .filter((assignment) => lessonComponentIds.has(assignment.target.lessonComponentId))
      .forEach((assignment) => {
        const componentId = assignment.target.lessonComponentId;
        const existing = nextMap.get(componentId);
        if (!existing) {
          nextMap.set(componentId, assignment);
          return;
        }

        if (
          LESSON_ASSIGNMENT_PRIORITY_ORDER[assignment.priority] <
          LESSON_ASSIGNMENT_PRIORITY_ORDER[existing.priority]
        ) {
          nextMap.set(componentId, assignment);
        }
      });

    return nextMap;
  }, [assignments, lessonComponentIds]);
  const completedLessonAssignmentsByComponent = useMemo(() => {
    const nextMap = new Map<KangurLessonComponentId, KangurAssignmentSnapshot>();

    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status === 'completed')
      .filter(
        (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
      .filter((assignment) => lessonComponentIds.has(assignment.target.lessonComponentId))
      .forEach((assignment) => {
        const componentId = assignment.target.lessonComponentId;
        const existing = nextMap.get(componentId);
        if (!existing) {
          nextMap.set(componentId, assignment);
          return;
        }

        const assignmentTimestamp = getLessonAssignmentTimestamp(
          assignment.progress.completedAt,
          assignment.updatedAt
        );
        const existingTimestamp = getLessonAssignmentTimestamp(
          existing.progress.completedAt,
          existing.updatedAt
        );

        if (assignmentTimestamp > existingTimestamp) {
          nextMap.set(componentId, assignment);
        }
      });

    return nextMap;
  }, [assignments, lessonComponentIds]);
  const orderedLessons = useMemo(() => {
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
  }, [lessonAssignmentsByComponent, lessons]);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);
  const selectLesson = useCallback((lessonId: string): void => {
    setActiveLessonId(lessonId);
  }, []);
  const clearActiveLesson = useCallback((): void => {
    setActiveLessonId(null);
  }, []);

  useEffect((): void => {
    if (!activeLessonId) return;
    const exists = lessons.some((lesson) => lesson.id === activeLessonId);
    if (!exists) {
      setActiveLessonId(null);
    }
  }, [activeLessonId, lessons]);

  useEffect((): void => {
    if (activeLessonId || typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const focusToken = readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)
      ?.trim()
      .toLowerCase();
    if (!focusToken) {
      return;
    }

    const focusSubject = resolveFocusedLessonSubject(focusToken, lessonTemplateMap);
    if (focusSubject && focusSubject !== subject) {
      setSubject(focusSubject);
      return;
    }

    if (lessons.length === 0) {
      return;
    }

    const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
    if (!focusedLessonId) {
      return;
    }

    setActiveLessonId(focusedLessonId);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    const nextHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, '', nextHref);
  }, [activeLessonId, basePath, lessons, lessonTemplateMap, setSubject, subject]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] ?? null : null;
  const prevLesson = activeIdx > 0 ? orderedLessons[activeIdx - 1] ?? null : null;
  const nextLesson =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1
      ? orderedLessons[activeIdx + 1] ?? null
      : null;
  const ActiveLessonComponent = activeLesson ? LESSON_COMPONENTS[activeLesson.componentId] : null;
  const activeLessonDocument = activeLesson ? lessonDocuments[activeLesson.id] ?? null : null;
  const hasActiveLessonDocumentContent = hasKangurLessonDocumentContent(activeLessonDocument);
  const shouldRenderLessonDocument =
    activeLesson?.contentMode === 'document' && hasActiveLessonDocumentContent;
  const activeLessonAssignment = activeLesson
    ? lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
    : null;
  const completedActiveLessonAssignment =
    activeLesson && !activeLessonAssignment
      ? completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
      : null;

  const stateValue = useMemo<KangurLessonsRuntimeStateContextValue>(
    () => ({
      orderedLessons,
      lessonDocuments,
      progress,
      activeLessonId,
      activeLesson,
      prevLesson,
      nextLesson,
      activeLessonDocument,
      ActiveLessonComponent,
      shouldRenderLessonDocument,
      hasActiveLessonDocumentContent,
      lessonAssignmentsByComponent,
      completedLessonAssignmentsByComponent,
      activeLessonAssignment,
      completedActiveLessonAssignment,
      activeLessonContentRef,
    }),
    [
      ActiveLessonComponent,
      activeLesson,
      activeLessonAssignment,
      activeLessonDocument,
      activeLessonId,
      completedActiveLessonAssignment,
      completedLessonAssignmentsByComponent,
      hasActiveLessonDocumentContent,
      lessonAssignmentsByComponent,
      lessonDocuments,
      nextLesson,
      orderedLessons,
      prevLesson,
      progress,
      shouldRenderLessonDocument,
    ]
  );
  const actionsValue = useMemo<KangurLessonsRuntimeActionsContextValue>(
    () => ({
      selectLesson,
      clearActiveLesson,
    }),
    [clearActiveLesson, selectLesson]
  );

  return (
    <KangurLessonsRuntimeActionsContext.Provider value={actionsValue}>
      <KangurLessonsRuntimeStateContext.Provider value={stateValue}>
        {children}
      </KangurLessonsRuntimeStateContext.Provider>
    </KangurLessonsRuntimeActionsContext.Provider>
  );
}

export function KangurLessonsRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingStateContext = useContext(KangurLessonsRuntimeStateContext);
  const existingActionsContext = useContext(KangurLessonsRuntimeActionsContext);
  if (!enabled || existingStateContext || existingActionsContext) {
    return <>{children}</>;
  }

  return <KangurLessonsRuntimeProvider>{children}</KangurLessonsRuntimeProvider>;
}

export const useKangurLessonsRuntimeState = (): KangurLessonsRuntimeStateContextValue => {
  const context = useContext(KangurLessonsRuntimeStateContext);
  if (!context) {
    throw internalError(
      'useKangurLessonsRuntimeState must be used within a KangurLessonsRuntimeProvider'
    );
  }
  return context;
};

export const useKangurLessonsRuntimeActions = (): KangurLessonsRuntimeActionsContextValue => {
  const context = useContext(KangurLessonsRuntimeActionsContext);
  if (!context) {
    throw internalError(
      'useKangurLessonsRuntimeActions must be used within a KangurLessonsRuntimeProvider'
    );
  }
  return context;
};

export const useKangurLessonsRuntime = (): KangurLessonsRuntimeContextValue => {
  const state = useKangurLessonsRuntimeState();
  const actions = useKangurLessonsRuntimeActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

export const useOptionalKangurLessonsRuntime = (): KangurLessonsRuntimeContextValue | null => {
  const state = useContext(KangurLessonsRuntimeStateContext);
  const actions = useContext(KangurLessonsRuntimeActionsContext);

  return useMemo(() => {
    if (!state || !actions) {
      return null;
    }

    return { ...state, ...actions };
  }, [actions, state]);
};
