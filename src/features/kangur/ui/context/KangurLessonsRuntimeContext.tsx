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

import { internalError } from '@/shared/errors/app-error';
import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import {
  hasKangurLessonDocumentContent,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { KANGUR_LESSON_DOCUMENTS_SETTING_KEY } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  getLessonAssignmentTimestamp,
  LESSON_ASSIGNMENT_PRIORITY_ORDER,
  LESSON_COMPONENTS,
  resolveFocusedLessonId,
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
  const settingsStore = useSettingsStore();
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const rawLessonDocuments = settingsStore.get(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const lessons = useMemo(
    (): KangurLesson[] => parseKangurLessons(rawLessons).filter((lesson) => lesson.enabled),
    [rawLessons]
  );
  const lessonDocuments = useMemo(
    () => parseKangurLessonDocumentStore(rawLessonDocuments),
    [rawLessonDocuments]
  );
  const lessonAssignmentsByComponent = useMemo(
    () => buildActiveKangurLessonAssignmentsByComponent(assignments),
    [assignments]
  );
  const completedLessonAssignmentsByComponent = useMemo(
    () => buildCompletedKangurLessonAssignmentsByComponent(assignments),
    [assignments]
  );
  const orderedLessons = useMemo(
    () => orderKangurLessonsByAssignmentPriority(lessons, lessonAssignmentsByComponent),
    [lessonAssignmentsByComponent, lessons]
  );

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
    if (activeLessonId || lessons.length === 0 || typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const focusToken = readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)
      ?.trim()
      .toLowerCase();
    if (!focusToken) {
      return;
    }

    const focusedLessonId = resolveFocusedKangurLessonId(focusToken, lessons);
    if (!focusedLessonId) {
      return;
    }

    setActiveLessonId(focusedLessonId);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    const nextHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, '', nextHref);
  }, [activeLessonId, basePath, lessons]);

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
