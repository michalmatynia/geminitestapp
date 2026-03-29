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
import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { useKangurLessonTemplates } from '@/features/kangur/ui/hooks/useKangurLessonTemplates';
import { useKangurLessonsCatalog } from '@/features/kangur/ui/hooks/useKangurLessonsCatalog';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';

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

const KangurLessonsRuntimeStateContext =
  createContext<KangurLessonsRuntimeStateContextValue | null>(null);
const KangurLessonsRuntimeActionsContext =
  createContext<KangurLessonsRuntimeActionsContextValue | null>(null);

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

const resolveLessonAssignmentsByComponent = ({
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

const resolveOrderedKangurLessons = ({
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

const scheduleKangurAssignmentsReady = (
  onReady: () => void
): (() => void) => {
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

const useKangurAssignmentsReady = (canAccessParentAssignments: boolean): boolean => {
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

const useKangurFocusToken = (basePath: string): string | null => {
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

const useKangurActiveLessonExistenceGuard = ({
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
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  subject: KangurLessonSubject;
}): KangurFocusedLessonAction => {
  if (!canResolveKangurFocusedLessonAction({ activeLessonId, focusToken, lessons })) {
    return { kind: 'none' };
  }

  const focusScope = resolveFocusedLessonScope(focusToken, lessonTemplateMap);
  const focusScopeAction = resolveKangurFocusedLessonScopeAction({
    ageGroup,
    focusScope,
    subject,
  });
  if (focusScopeAction.kind !== 'none') {
    return focusScopeAction;
  }

  const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
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

const useKangurFocusedLessonSelection = ({
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
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  basePath: string;
  focusToken: string | null;
  lessonTemplateMap: Map<KangurLessonComponentId, KangurLessonTemplate>;
  lessons: KangurLesson[];
  setActiveLessonId: (lessonId: string | null) => void;
  setAgeGroup: ReturnType<typeof useKangurAgeGroupFocus>['setAgeGroup'];
  setSubject: ReturnType<typeof useKangurSubjectFocus>['setSubject'];
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

const resolveKangurActiveLessonRuntime = ({
  activeLessonDocument,
  activeLessonId,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
  orderedLessons,
}: {
  activeLessonDocument: ReturnType<typeof useKangurLessonDocument>['data'] | null;
  activeLessonId: string | null;
  completedLessonAssignmentsByComponent: Map<
    KangurLessonComponentId,
    KangurAssignmentSnapshot
  >;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  orderedLessons: KangurLesson[];
}): KangurActiveLessonRuntime => {
  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] ?? null : null;
  const prevLesson = activeIdx > 0 ? orderedLessons[activeIdx - 1] ?? null : null;
  const nextLesson =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1
      ? orderedLessons[activeIdx + 1] ?? null
      : null;
  const ActiveLessonComponent = activeLesson
    ? LESSON_COMPONENTS[activeLesson.componentId]
    : null;
  const lessonDocuments =
    activeLessonId && activeLessonDocument ? { [activeLessonId]: activeLessonDocument } : {};
  const hasActiveLessonDocumentContent =
    hasKangurLessonDocumentContent(activeLessonDocument);
  const shouldRenderLessonDocument =
    activeLesson?.contentMode === 'document' && hasActiveLessonDocumentContent;
  const activeLessonAssignment = activeLesson
    ? lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
    : null;
  const completedActiveLessonAssignment =
    activeLesson && !activeLessonAssignment
      ? completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null
      : null;

  return {
    ActiveLessonComponent,
    activeLesson,
    activeLessonAssignment,
    activeLessonDocument,
    completedActiveLessonAssignment,
    hasActiveLessonDocumentContent,
    lessonDocuments,
    nextLesson,
    prevLesson,
    shouldRenderLessonDocument,
  };
};

const useKangurActiveLessonRuntime = ({
  activeLessonDocument,
  activeLessonId,
  completedLessonAssignmentsByComponent,
  lessonAssignmentsByComponent,
  orderedLessons,
}: {
  activeLessonDocument: ReturnType<typeof useKangurLessonDocument>['data'] | null;
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
  const focusToken = useKangurFocusToken(basePath);
  const isAssignmentsReady = useKangurAssignmentsReady(canAccessParentAssignments);
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: isAssignmentsReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });
  const { data: lessonTemplates = [] } = useKangurLessonTemplates();
  const lessonTemplateMap = useMemo(
    () => new Map(lessonTemplates.map((t) => [t.componentId, t] as const)),
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
  const activeLessonRuntime = useKangurActiveLessonRuntime({
    activeLessonDocument: activeLessonDocumentQuery.data ?? null,
    activeLessonId,
    completedLessonAssignmentsByComponent,
    lessonAssignmentsByComponent,
    orderedLessons,
  });

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
