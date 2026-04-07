'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type JSX,
} from 'react';

import {
  useKangurLessonDocument,
} from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type {
  KangurLesson,
  KangurLessonComponentId,
} from '@/features/kangur/shared/contracts/kangur';
import { internalError } from '@/shared/errors/app-error';
import { useKangurLessonTemplate } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';
import { useKangurLessonsCatalog } from '@/features/kangur/ui/hooks/useKangurLessonsCatalog';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

import {
  resolveLessonAssignmentsByComponent,
  resolveOrderedKangurLessons,
  resolveKangurActiveLessonRuntime,
} from './KangurLessonsRuntimeContext.utils';

import {
  useKangurAssignmentsReady,
  useKangurFocusToken,
  useKangurActiveLessonExistenceGuard,
  useKangurFocusedLessonSelection,
} from './KangurLessonsRuntimeContext.hooks';

import type {
  KangurLessonsRuntimeActionsContextValue,
  KangurLessonsRuntimeContextValue,
  KangurLessonsRuntimeStateContextValue,
} from './KangurLessonsRuntimeContext.shared';

const EMPTY_LESSON_TEMPLATE_MAP = new Map<KangurLessonComponentId, KangurLessonTemplate>();

const KangurLessonsRuntimeStateContext =
  createContext<KangurLessonsRuntimeStateContextValue | null>(null);
const KangurLessonsRuntimeActionsContext =
  createContext<KangurLessonsRuntimeActionsContextValue | null>(null);

const resolveKangurLessonsCanAccessParentAssignments = (
  auth: ReturnType<typeof useKangurAuth>,
  user: ReturnType<typeof useKangurAuth>['user']
): boolean => auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);

export function KangurLessonsRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user } = auth;
  const canAccessParentAssignments = resolveKangurLessonsCanAccessParentAssignments(
    auth,
    user
  );
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const focusToken = useKangurFocusToken(basePath);
  const isAssignmentsReady = useKangurAssignmentsReady(canAccessParentAssignments);
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: isAssignmentsReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });
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
  const lessonAssignmentsByComponent = useMemo(
    () =>
      resolveLessonAssignmentsByComponent({
        assignments,
        isAssignmentsReady,
        lessonComponentIds,
        mode: 'active',
      }),
    [assignments, isAssignmentsReady, lessonComponentIds]
  );
  const completedLessonAssignmentsByComponent = useMemo(
    () =>
      resolveLessonAssignmentsByComponent({
        assignments,
        isAssignmentsReady,
        lessonComponentIds,
        mode: 'completed',
      }),
    [assignments, isAssignmentsReady, lessonComponentIds]
  );
  const orderedLessons = useMemo(
    () =>
      resolveOrderedKangurLessons({
        lessonAssignmentsByComponent,
        lessons,
      }),
    [lessonAssignmentsByComponent, lessons]
  );

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const activeLessonComponentId = useMemo(
    () => orderedLessons.find((lesson) => lesson.id === activeLessonId)?.componentId ?? null,
    [activeLessonId, orderedLessons]
  );
  const activeLessonTemplateQuery = useKangurLessonTemplate(activeLessonComponentId, {
    enabled: activeLessonComponentId !== null,
  });
  const lessonTemplateMap = useMemo(() => {
    const activeLessonTemplate = activeLessonTemplateQuery.data ?? null;
    if (!activeLessonTemplate) {
      return EMPTY_LESSON_TEMPLATE_MAP;
    }

    return new Map([[activeLessonTemplate.componentId, activeLessonTemplate] as const]);
  }, [activeLessonTemplateQuery.data]);
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

  useKangurActiveLessonExistenceGuard({
    activeLessonId,
    lessons,
    setActiveLessonId,
  });
  useKangurFocusedLessonSelection({
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
  });
  const activeLessonRuntime = useMemo(
    () =>
      resolveKangurActiveLessonRuntime({
        activeLessonDocument: activeLessonDocumentQuery.data ?? null,
        activeLessonId,
        completedLessonAssignmentsByComponent,
        lessonAssignmentsByComponent,
        orderedLessons,
      }),
    [
      activeLessonDocumentQuery.data,
      activeLessonId,
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      orderedLessons,
    ]
  );

  const stateValue = useMemo<KangurLessonsRuntimeStateContextValue>(
    () => ({
      orderedLessons,
      lessonTemplateMap,
      lessonSections,
      lessonDocuments: activeLessonRuntime.lessonDocuments,
      progress,
      activeLessonId,
      activeLesson: activeLessonRuntime.activeLesson,
      prevLesson: activeLessonRuntime.prevLesson,
      nextLesson: activeLessonRuntime.nextLesson,
      activeLessonDocument: activeLessonRuntime.activeLessonDocument,
      ActiveLessonComponent: activeLessonRuntime.ActiveLessonComponent,
      shouldRenderLessonDocument: activeLessonRuntime.shouldRenderLessonDocument,
      hasActiveLessonDocumentContent: activeLessonRuntime.hasActiveLessonDocumentContent,
      lessonAssignmentsByComponent,
      completedLessonAssignmentsByComponent,
      activeLessonAssignment: activeLessonRuntime.activeLessonAssignment,
      completedActiveLessonAssignment:
        activeLessonRuntime.completedActiveLessonAssignment,
      activeLessonContentRef,
    }),
    [
      activeLessonId,
      activeLessonRuntime,
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      lessonSections,
      lessonTemplateMap,
      orderedLessons,
      progress,
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

export const useOptionalKangurLessonTemplate = (
  componentId: KangurLessonComponentId | null | undefined,
): KangurLessonTemplate | null => {
  const state = useContext(KangurLessonsRuntimeStateContext);

  return useMemo(() => {
    if (!componentId || !state) {
      return null;
    }

    return state.lessonTemplateMap.get(componentId) ?? null;
  }, [componentId, state]);
};
