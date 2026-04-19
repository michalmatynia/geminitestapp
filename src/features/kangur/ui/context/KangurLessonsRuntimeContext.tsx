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
import { useKangurAuthSessionState } from '@/features/kangur/ui/context/KangurAuthContext';
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

// Shared empty map returned when no lesson template has been loaded yet.
// Using a stable reference avoids unnecessary re-renders in consumers that
// depend on the map reference.
const EMPTY_LESSON_TEMPLATE_MAP = new Map<KangurLessonComponentId, KangurLessonTemplate>();

// Split into two contexts so lesson UI components that only read state don't
// re-render when action callbacks are recreated.
const KangurLessonsRuntimeStateContext =
  createContext<KangurLessonsRuntimeStateContextValue | null>(null);
const KangurLessonsRuntimeActionsContext =
  createContext<KangurLessonsRuntimeActionsContextValue | null>(null);

// Resolves whether the current user can access parent-delegated assignments.
// Falls back to checking for an active learner ID when the platform flag is
// not yet available.
const resolveKangurLessonsCanAccessParentAssignments = ({
  canAccessParentAssignments,
  user,
}: {
  canAccessParentAssignments: boolean;
  user: import('@kangur/platform').KangurUser | null;
}): boolean => canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);

// KangurLessonsRuntimeProvider is the central state container for the StudiQ
// lessons experience. It owns:
//
//  - Lesson catalog fetching filtered by subject + age group
//  - Lesson ordering (assignments-first, then catalog order)
//  - Active lesson selection, document fetching, and template loading
//  - Assignment resolution per lesson component (active + completed)
//  - Focus-token-driven lesson auto-selection (deep-link / embed intent)
//  - Existence guard: clears activeLessonId if the lesson is removed from
//    the catalog (e.g. after a subject switch)
export function KangurLessonsRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const { canAccessParentAssignments, user } = useKangurAuthSessionState();
  const hasParentAssignmentAccess = resolveKangurLessonsCanAccessParentAssignments({
    canAccessParentAssignments,
    user,
  });
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const focusToken = useKangurFocusToken(basePath);
  const isAssignmentsReady = useKangurAssignmentsReady(hasParentAssignmentAccess);
  const progress = useKangurProgressState();
  // Assignments are only fetched once the assignments-ready gate has opened
  // (i.e. auth has resolved and the user has parent assignment access).
  const { assignments } = useKangurAssignments({
    enabled: isAssignmentsReady && hasParentAssignmentAccess,
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
  // Build a set of component IDs present in the current catalog so assignment
  // resolution can quickly filter out assignments for lessons that are no
  // longer visible (e.g. after a subject or age-group switch).
  const lessonComponentIds = useMemo(
    () => new Set(lessons.map((lesson) => lesson.componentId)),
    [lessons]
  );
  // Active assignments keyed by lesson component ID — used to surface
  // assignment badges and reorder assigned lessons to the top of the catalog.
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
  // Lesson template for the active lesson. Loaded on-demand when a lesson is
  // selected; provides the component-level metadata (slides, activity config)
  // needed to render the lesson content.
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
  // Lesson document for the active lesson. Contains the rich-text/block
  // content authored in the CMS builder and rendered by
  // KangurLessonDocumentRenderer.
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

// KangurLessonsRuntimeBoundary conditionally mounts the provider. If a
// provider is already present in the tree the boundary passes children through
// unchanged to avoid double-mounting lesson state.
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

// useOptionalKangurLessonTemplate looks up a lesson template by component ID
// from the runtime state map without throwing if the context is absent. Used
// by lesson components that may render outside the lessons runtime tree.
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
