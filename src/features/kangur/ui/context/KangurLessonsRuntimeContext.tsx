'use client';

import {
  buildActiveKangurLessonAssignmentsByComponent,
  buildCompletedKangurLessonAssignmentsByComponent,
  getKangurLessonMasteryPresentation,
  orderKangurLessonsByAssignmentPriority,
  resolveFocusedKangurLessonId,
} from '@kangur/core';
import dynamic from 'next/dynamic';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type JSX,
  type ReactNode,
  type RefObject,
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

type LessonProps = {
  onBack?: () => void;
};

const LessonLoadingFallback = (): JSX.Element => (
  <div className='w-full rounded-3xl border border-indigo-200/70 bg-white/90 p-6 text-center text-sm text-indigo-500 shadow-lg'>
    Ladowanie lekcji...
  </div>
);

const loadLessonComponent = (
  loader: () => Promise<unknown>
): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      return module.default;
    },
    {
      ssr: false,
      loading: LessonLoadingFallback,
    }
  );

const ClockLesson = loadLessonComponent(() => import('@/features/kangur/ui/components/ClockLesson'));
const CalendarLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/CalendarLesson')
);
const AddingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/AddingLesson')
);
const SubtractingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/SubtractingLesson')
);
const MultiplicationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/MultiplicationLesson')
);
const DivisionLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/DivisionLesson')
);
const GeometryBasicsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryBasicsLesson')
);
const GeometryShapesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryShapesLesson')
);
const GeometrySymmetryLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometrySymmetryLesson')
);
const GeometryPerimeterLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/GeometryPerimeterLesson')
);
const LogicalThinkingLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalThinkingLesson')
);
const LogicalPatternsLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalPatternsLesson')
);
const LogicalClassificationLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalClassificationLesson')
);
const LogicalReasoningLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalReasoningLesson')
);
const LogicalAnalogiesLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/LogicalAnalogiesLesson')
);

const LESSON_COMPONENTS: Record<KangurLessonComponentId, ComponentType<LessonProps>> = {
  clock: ClockLesson,
  calendar: CalendarLesson,
  adding: AddingLesson,
  subtracting: SubtractingLesson,
  multiplication: MultiplicationLesson,
  division: DivisionLesson,
  geometry_basics: GeometryBasicsLesson,
  geometry_shapes: GeometryShapesLesson,
  geometry_symmetry: GeometrySymmetryLesson,
  geometry_perimeter: GeometryPerimeterLesson,
  logical_thinking: LogicalThinkingLesson,
  logical_patterns: LogicalPatternsLesson,
  logical_classification: LogicalClassificationLesson,
  logical_reasoning: LogicalReasoningLesson,
  logical_analogies: LogicalAnalogiesLesson,
};

export const getLessonMasteryPresentation = getKangurLessonMasteryPresentation;

type KangurLessonsRuntimeContextValue = {
  orderedLessons: KangurLesson[];
  lessonDocuments: ReturnType<typeof parseKangurLessonDocumentStore>;
  progress: ReturnType<typeof useKangurProgressState>;
  activeLessonId: string | null;
  activeLesson: KangurLesson | null;
  prevLesson: KangurLesson | null;
  nextLesson: KangurLesson | null;
  activeLessonDocument: ReturnType<typeof parseKangurLessonDocumentStore>[string] | null;
  ActiveLessonComponent: ComponentType<LessonProps> | null;
  shouldRenderLessonDocument: boolean;
  hasActiveLessonDocumentContent: boolean;
  lessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  completedLessonAssignmentsByComponent: Map<KangurLessonComponentId, KangurAssignmentSnapshot>;
  activeLessonAssignment: KangurAssignmentSnapshot | null;
  completedActiveLessonAssignment: KangurAssignmentSnapshot | null;
  activeLessonContentRef: RefObject<HTMLDivElement | null>;
  selectLesson: (lessonId: string) => void;
  clearActiveLesson: () => void;
};

const KangurLessonsRuntimeContext = createContext<KangurLessonsRuntimeContextValue | null>(null);

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

  const value = useMemo<KangurLessonsRuntimeContextValue>(
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
      selectLesson: (lessonId: string): void => {
        setActiveLessonId(lessonId);
      },
      clearActiveLesson: (): void => {
        setActiveLessonId(null);
      },
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

  return (
    <KangurLessonsRuntimeContext.Provider value={value}>
      {children}
    </KangurLessonsRuntimeContext.Provider>
  );
}

export function KangurLessonsRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  if (!enabled) {
    return <>{children}</>;
  }

  return <KangurLessonsRuntimeProvider>{children}</KangurLessonsRuntimeProvider>;
}

export const useKangurLessonsRuntime = (): KangurLessonsRuntimeContextValue => {
  const context = useContext(KangurLessonsRuntimeContext);
  if (!context) {
    throw internalError(
      'useKangurLessonsRuntime must be used within a KangurLessonsRuntimeProvider'
    );
  }
  return context;
};

export const useOptionalKangurLessonsRuntime = (): KangurLessonsRuntimeContextValue | null =>
  useContext(KangurLessonsRuntimeContext);
