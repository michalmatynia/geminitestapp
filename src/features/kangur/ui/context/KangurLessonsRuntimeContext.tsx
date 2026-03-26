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
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import {
  useKangurLessonDocument,
} from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { useKangurLessonTemplates } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';
import { useKangurLessonsCatalog } from '@/features/kangur/ui/hooks/useKangurLessonsCatalog';

import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  LESSON_COMPONENTS,
  resolveFocusedLessonId,
  resolveFocusedLessonScope,
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
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const [focusToken, setFocusToken] = useState<string | null>(null);
  const [isAssignmentsReady, setIsAssignmentsReady] = useState(false);
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: isAssignmentsReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });
  const { data: lessonTemplates = [] } = useKangurLessonTemplates({
    enabled: focusToken !== null,
  });
  const lessonTemplateMap = useMemo(
    () => new Map(lessonTemplates.map((t) => [t.componentId, t])),
    [lessonTemplates],
  );
  const lessonsCatalogQuery = useKangurLessonsCatalog({ subject, ageGroup, enabledOnly: true });
  const lessons = useMemo(
    (): KangurLesson[] => lessonsCatalogQuery.data?.lessons ?? [],
    [lessonsCatalogQuery.data?.lessons],
  );
  const lessonSections = useMemo(
    () => lessonsCatalogQuery.data?.sections ?? [],
    [lessonsCatalogQuery.data?.sections],
  );
  const lessonComponentIds = useMemo(
    () => new Set(lessons.map((lesson) => lesson.componentId)),
    [lessons]
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
  const activeLessonDocumentQuery = useKangurLessonDocument(activeLessonId, {
    enabled: activeLessonId !== null,
  });
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsAssignmentsReady(canAccessParentAssignments);
      return;
    }

    if (!canAccessParentAssignments) {
      setIsAssignmentsReady(false);
      return;
    }

    let timeoutId: number | null = null;
    const frameId =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            setIsAssignmentsReady(true);
          })
        : window.setTimeout(() => {
            timeoutId = null;
            setIsAssignmentsReady(true);
          }, 0);

    return () => {
      setIsAssignmentsReady(false);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        return;
      }

      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId);
      } else {
        window.clearTimeout(frameId);
      }
    };
  }, [canAccessParentAssignments]);

  useEffect((): void => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const nextFocusToken =
      readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)?.trim().toLowerCase() ?? null;
    setFocusToken(nextFocusToken && nextFocusToken.length > 0 ? nextFocusToken : null);
  }, [basePath]);

  useEffect((): void => {
    if (activeLessonId || typeof window === 'undefined') {
      return;
    }

    if (!focusToken) {
      return;
    }

    const currentUrl = new URL(window.location.href);

    const focusScope = resolveFocusedLessonScope(focusToken, lessonTemplateMap);
    if (focusScope?.ageGroup && focusScope.ageGroup !== ageGroup) {
      setAgeGroup(focusScope.ageGroup);
      return;
    }

    if (focusScope?.subject && focusScope.subject !== subject) {
      setSubject(focusScope.subject);
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
  }, [
    activeLessonId,
    ageGroup,
    basePath,
    focusToken,
    lessons,
    lessonTemplateMap,
    setAgeGroup,
    setSubject,
    subject,
  ]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] ?? null : null;
  const prevLesson = activeIdx > 0 ? orderedLessons[activeIdx - 1] ?? null : null;
  const nextLesson =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1
      ? orderedLessons[activeIdx + 1] ?? null
      : null;
  const ActiveLessonComponent = activeLesson ? LESSON_COMPONENTS[activeLesson.componentId] : null;
  const activeLessonDocument = activeLessonDocumentQuery.data ?? null;
  const lessonDocuments = useMemo(
    () =>
      activeLessonId && activeLessonDocument
        ? { [activeLessonId]: activeLessonDocument }
        : {},
    [activeLessonDocument, activeLessonId]
  );
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
      lessonSections,
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
      lessonSections,
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
