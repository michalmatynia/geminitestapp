'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  appendKangurUrlParams,
  getKangurHomeHref,
  getKangurInternalQueryParamName,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  hasKangurLessonDocumentContent,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurLesson, KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import type { ComponentType } from 'react';

type LessonProps = {
  onBack?: () => void;
  onReady?: () => void;
};

const LESSONS_CARD_EASE = [0.22, 1, 0.36, 1] as const;
const LESSONS_CARD_TRANSITION = {
  duration: 0.26,
  ease: LESSONS_CARD_EASE,
} as const;
const LESSONS_CARD_STAGGER_DELAY = 0.06;
const LESSONS_ROUTE_ACKNOWLEDGE_MS = 110;
const ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES = 18;
const LESSON_NAV_ANCHOR_ID = 'kangur-lesson-navigation';

const LessonLoadingFallback = (): React.JSX.Element => (
  <LessonLoadingFallbackCard />
);

const LessonLoadingFallbackCard = (): React.JSX.Element => {
  const prefersReducedMotion = useReducedMotion();
  const loadingMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);

  return (
    <motion.div
      {...loadingMotionProps}
      className='w-full max-w-5xl'
      data-testid='lessons-loading-fallback'
    >
      <KangurGlassPanel
        className='flex min-h-[280px] w-full flex-col items-center justify-center kangur-panel-gap text-center'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurStatusChip accent='indigo' className='uppercase tracking-[0.18em]' size='sm'>
          Lekcja
        </KangurStatusChip>
        <div className='break-words text-base font-semibold text-slate-700'>
          Ładowanie lekcji...
        </div>
        <p className='max-w-lg break-words text-sm text-slate-500'>
          Przygotowujemy materiał, aby przejście do aktywnej sekcji było płynniejsze.
        </p>
      </KangurGlassPanel>
    </motion.div>
  );
};

const loadLessonComponent = (loader: () => Promise<unknown>): ComponentType<LessonProps> =>
  dynamic<LessonProps>(
    async () => {
      const module = (await loader()) as { default: ComponentType<LessonProps> };
      const ResolvedLesson = module.default;

      return function KangurLoadedLesson(props: LessonProps): React.JSX.Element {
        useEffect(() => {
          props.onReady?.();
        }, [props.onReady]);

        return <ResolvedLesson {...props} />;
      };
    },
    {
      ssr: false,
      loading: LessonLoadingFallback,
    }
  );

const ClockLesson = loadLessonComponent(
  () => import('@/features/kangur/ui/components/ClockLesson')
);
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
  () =>
    import('@/features/kangur/ui/components/lessons').then((module) => ({
      default: module.LogicalThinkingLesson,
    }))
);
const LogicalPatternsLesson = loadLessonComponent(
  () =>
    import('@/features/kangur/ui/components/lessons').then((module) => ({
      default: module.LogicalPatternsLesson,
    }))
);
const LogicalClassificationLesson = loadLessonComponent(
  () =>
    import('@/features/kangur/ui/components/lessons').then((module) => ({
      default: module.LogicalClassificationLesson,
    }))
);
const LogicalReasoningLesson = loadLessonComponent(
  () =>
    import('@/features/kangur/ui/components/lessons').then((module) => ({
      default: module.LogicalReasoningLesson,
    }))
);
const LogicalAnalogiesLesson = loadLessonComponent(
  () =>
    import('@/features/kangur/ui/components/lessons').then((module) => ({
      default: module.LogicalAnalogiesLesson,
    }))
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

const FOCUS_TO_COMPONENT: Record<string, KangurLessonComponentId> = {
  adding: 'adding',
  addition: 'adding',
  subtracting: 'subtracting',
  subtraction: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  geometry: 'geometry_shapes',
  geometry_basics: 'geometry_basics',
  geometry_shapes: 'geometry_shapes',
  geometry_symmetry: 'geometry_symmetry',
  geometry_perimeter: 'geometry_perimeter',
  logical_thinking: 'logical_thinking',
  thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
  analogies: 'logical_analogies',
  logic: 'logical_thinking',
};

const resolveFocusedLessonId = (focusToken: string, lessons: KangurLesson[]): string | null => {
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

const getLessonMasteryPresentation = (
  lesson: KangurLesson,
  progress: ReturnType<typeof useKangurProgressState>
): {
  statusLabel: string;
  summaryLabel: string;
  badgeAccent: 'slate' | 'emerald' | 'amber' | 'rose';
} => {
  const mastery = progress.lessonMastery[lesson.componentId];
  if (!mastery) {
    return {
      statusLabel: 'Nowa',
      summaryLabel: 'Brak zapisanej praktyki',
      badgeAccent: 'slate',
    };
  }

  if (mastery.masteryPercent >= 85) {
    return {
      statusLabel: `Opanowane ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · najlepszy wynik ${mastery.bestScorePercent}%`,
      badgeAccent: 'emerald',
    };
  }

  if (mastery.masteryPercent >= 60) {
    return {
      statusLabel: `W trakcie ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
      badgeAccent: 'amber',
    };
  }

  return {
    statusLabel: `Powtórz ${mastery.masteryPercent}%`,
    summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
    badgeAccent: 'rose',
  };
};

const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const getLessonAssignmentTimestamp = (
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

export default function Lessons() {
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('lessons');
  const prefersReducedMotion = useReducedMotion();
  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const { entry: lessonListEmptyStateContent } =
    useKangurPageContentEntry('lessons-list-empty-state');
  const { entry: activeLessonHeaderContent } = useKangurPageContentEntry('lessons-active-header');
  const { entry: activeLessonAssignmentContent } =
    useKangurPageContentEntry('lessons-active-assignment');
  const { entry: activeLessonDocumentContent } =
    useKangurPageContentEntry('lessons-active-document');
  const { entry: activeLessonSecretPanelContent } =
    useKangurPageContentEntry('lessons-active-secret-panel');
  const { entry: activeLessonEmptyDocumentContent } =
    useKangurPageContentEntry('lessons-active-empty-document');
  const { entry: activeLessonNavigationContent } =
    useKangurPageContentEntry('lessons-active-navigation');
  const settingsStore = useSettingsStore();
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [isActiveLessonComponentReady, setIsActiveLessonComponentReady] = useState(false);
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: isDeferredContentReady && canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsDeferredContentReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const rawLessonDocuments = settingsStore.get(KANGUR_LESSON_DOCUMENTS_SETTING_KEY);
  const lessons = useMemo(
    (): KangurLesson[] =>
      isDeferredContentReady
        ? parseKangurLessons(rawLessons).filter((lesson) => lesson.enabled)
        : [],
    [isDeferredContentReady, rawLessons]
  );
  const lessonDocuments = useMemo(
    () => parseKangurLessonDocumentStore(isDeferredContentReady ? rawLessonDocuments : undefined),
    [isDeferredContentReady, rawLessonDocuments]
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
  const [isSecretLessonActive, setIsSecretLessonActive] = useState(false);
  const handleSelectLesson = useCallback((lessonId: string | null): void => {
    setIsSecretLessonActive(false);
    setActiveLessonId(lessonId);
  }, []);

  useEffect((): void => {
    if (!activeLessonId) return;
    const exists = lessons.some((lesson) => lesson.id === activeLessonId);
    if (!exists) {
      setIsSecretLessonActive(false);
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
  }, [activeLessonId, lessons]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] : null;
  const completedLessonComponentIds = useMemo(
    () =>
      new Set(
        orderedLessons
          .filter((lesson) => (progress.lessonMastery[lesson.componentId]?.completions ?? 0) > 0)
          .map((lesson) => lesson.componentId)
      ),
    [orderedLessons, progress.lessonMastery]
  );
  const isSecretLessonUnlocked =
    orderedLessons.length > 0 &&
    orderedLessons.every((lesson) => completedLessonComponentIds.has(lesson.componentId));
  const secretHostLesson = orderedLessons.at(-1) ?? null;
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1] : null;
  const ActiveLessonComponent = activeLesson ? LESSON_COMPONENTS[activeLesson.componentId] : null;
  const activeLessonDocument = activeLesson ? (lessonDocuments[activeLesson.id] ?? null) : null;
  const hasActiveLessonDocumentContent = hasKangurLessonDocumentContent(activeLessonDocument);
  const shouldRenderLessonDocument =
    activeLesson?.contentMode === 'document' && hasActiveLessonDocumentContent;
  const activeLessonAssignment = activeLesson
    ? (lessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
    : null;
  const completedActiveLessonAssignment =
    activeLesson && !activeLessonAssignment
      ? (completedLessonAssignmentsByComponent.get(activeLesson.componentId) ?? null)
      : null;
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);
  const activeLessonHeaderRef = useRef<HTMLDivElement | null>(null);
  const activeLessonAssignmentRef = useRef<HTMLDivElement | null>(null);
  const lessonListIntroRef = useRef<HTMLDivElement | null>(null);
  const lessonLibraryRef = useRef<HTMLDivElement | null>(null);
  const lessonListEmptyStateRef = useRef<HTMLDivElement | null>(null);
  const activeLessonSecretPanelRef = useRef<HTMLDivElement | null>(null);
  const activeLessonEmptyDocumentRef = useRef<HTMLDivElement | null>(null);
  const activeLessonNavigationRef = useRef<HTMLDivElement | null>(null);
  const handleOpenSecretLesson = useCallback((): void => {
    if (!isSecretLessonUnlocked || !secretHostLesson) {
      return;
    }

    setActiveLessonId(secretHostLesson.id);
    setIsSecretLessonActive(true);
  }, [isSecretLessonUnlocked, secretHostLesson]);
  const isSecretLessonHostActive =
    isSecretLessonActive && Boolean(secretHostLesson && activeLesson?.id === secretHostLesson.id);
  const activeLessonHasNavigation = Boolean(prev || next);
  const isActiveLessonSurfaceReady =
    !activeLesson ||
    isSecretLessonHostActive ||
    shouldRenderLessonDocument ||
    (activeLesson.contentMode === 'document' && !hasActiveLessonDocumentContent) ||
    !ActiveLessonComponent ||
    isActiveLessonComponentReady;
  const expectsFocusedLesson =
    routeTransitionState?.transitionPhase === 'waiting_for_ready' &&
    routeTransitionState.activeTransitionSkeletonVariant === 'lessons-focus';
  const isLessonsPageReady =
    isDeferredContentReady &&
    (expectsFocusedLesson
      ? Boolean(activeLesson) && isActiveLessonSurfaceReady
      : isActiveLessonSurfaceReady);
  const learnerActivityTitle = useMemo(() => {
    if (activeLesson?.title) {
      return `Lekcja: ${activeLesson.title}`;
    }
    return 'Lekcje';
  }, [activeLesson?.title]);
  const learnerActivityHref = useMemo(() => {
    const baseHref = createPageUrl('Lessons', basePath);
    if (!activeLesson) {
      return baseHref;
    }
    return appendKangurUrlParams(
      baseHref,
      { focus: activeLesson.componentId },
      basePath
    );
  }, [activeLesson, basePath]);
  useKangurLearnerActivityPing({
    activity: {
      kind: 'lesson',
      title: learnerActivityTitle,
      href: learnerActivityHref,
    },
    enabled: user?.actorType === 'learner',
  });

  useKangurRoutePageReady({
    pageKey: 'Lessons',
    ready: isLessonsPageReady,
  });

  const handleGoBack = (): void => {
    routeNavigator.back({
      acknowledgeMs: LESSONS_ROUTE_ACKNOWLEDGE_MS,
      fallbackHref: getKangurHomeHref(basePath),
      fallbackPageKey: 'Game',
      sourceId: 'lessons:list-back',
    });
  };

  const learnerId = user?.activeLearner?.id ?? null;
  useEffect(() => {
    if (!isSecretLessonUnlocked) {
      setIsSecretLessonActive(false);
    }
  }, [isSecretLessonUnlocked]);
  useEffect(() => {
    setIsActiveLessonComponentReady(false);
  }, [activeLesson?.id]);
  useLayoutEffect(() => {
    if (!activeLesson) {
      return;
    }

    let frameId: number | null = null;
    let remainingFrames = ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES;

    const resolveTopOffset = (): number => {
      const styles = window.getComputedStyle(document.documentElement);
      let topBarHeight =
        Number.parseFloat(styles.getPropertyValue('--kangur-top-bar-height')) || 0;
      if (!topBarHeight) {
        const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
        if (topBar instanceof HTMLElement) {
          topBarHeight = topBar.getBoundingClientRect().height;
        }
      }
      return topBarHeight;
    };

    const scrollToTarget = (): boolean => {
      const navigation = activeLessonNavigationRef.current;
      const header = activeLessonHeaderRef.current;
      const target = navigation ?? header;
      if (!target) {
        return false;
      }

      const desiredOffset = resolveTopOffset();
      const delta = target.getBoundingClientRect().top - desiredOffset;
      const nextTop = Math.max(0, window.scrollY + delta);

      if (Math.abs(delta) <= 4) {
        window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });
        return true;
      }

      window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });

      return Math.abs(delta) <= 8;
    };

    const scrollNavigationIntoView = (): void => {
      const didScroll = scrollToTarget();
      if (didScroll) {
        frameId = null;
        return;
      }

      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        frameId = null;
        return;
      }

      frameId = window.requestAnimationFrame(scrollNavigationIntoView);
    };

    if (!scrollToTarget()) {
      frameId = window.requestAnimationFrame(scrollNavigationIntoView);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeLesson?.id]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const targetHash = `#${LESSON_NAV_ANCHOR_ID}`;
    if (activeLesson) {
      if (url.hash === targetHash) {
        return;
      }
      url.hash = LESSON_NAV_ANCHOR_ID;
      window.history.replaceState(window.history.state, '', url.toString());
      return;
    }

    if (url.hash === targetHash) {
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [activeLesson?.id]);
  useKangurTutorAnchor({
    id: 'kangur-lessons-list-intro',
    kind: 'hero',
    ref: lessonListIntroRef,
    surface: 'lesson',
    enabled: !activeLesson,
    priority: 120,
    metadata: {
      contentId: 'lesson:list',
      label: 'Wprowadzenie do lekcji',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-lessons-library',
    kind: 'library',
    ref: lessonLibraryRef,
    surface: 'lesson',
    enabled: !activeLesson && isDeferredContentReady && orderedLessons.length > 0,
    priority: 110,
    metadata: {
      contentId: 'lesson:list',
      label: 'Biblioteka lekcji',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-lessons-list-empty-state',
    kind: 'empty_state',
    ref: lessonListEmptyStateRef,
    surface: 'lesson',
    enabled: !activeLesson && isDeferredContentReady && orderedLessons.length === 0,
    priority: 115,
    metadata: {
      contentId: 'lesson:list',
      label: 'Brak aktywnych lekcji',
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-header:${activeLesson.id}` : 'kangur-lesson-header',
    kind: 'lesson_header',
    ref: activeLessonHeaderRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson),
    priority: 30,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLesson?.title ?? null,
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-assignment:${activeLesson.id}` : 'kangur-lesson-assignment',
    kind: 'assignment',
    ref: activeLessonAssignmentRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson && (activeLessonAssignment || completedActiveLessonAssignment)),
    priority: 80,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonAssignment?.title ?? completedActiveLessonAssignment?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id ?? null,
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-document:${activeLesson.id}` : 'kangur-lesson-document',
    kind: 'document',
    ref: activeLessonContentRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson),
    priority: 10,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLesson?.title ?? null,
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-screen-secret:${activeLesson.id}` : 'kangur-lesson-screen-secret',
    kind: 'screen',
    ref: activeLessonSecretPanelRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson && isSecretLessonHostActive),
    priority: 70,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLesson ? `Ukryty finisz - ${activeLesson.title}` : 'Ukryty finisz',
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-empty-document:${activeLesson.id}` : 'kangur-lesson-empty-document',
    kind: 'empty_state',
    ref: activeLessonEmptyDocumentRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson?.contentMode === 'document' && !hasActiveLessonDocumentContent),
    priority: 60,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLesson?.title ?? 'Brak zawartości lekcji',
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-navigation:${activeLesson.id}` : 'kangur-lesson-navigation',
    kind: 'navigation',
    ref: activeLessonNavigationRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson && activeLessonHasNavigation),
    priority: 20,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label:
        activeLessonNavigationContent?.title ??
        activeLesson?.title ??
        'Nawigacja lekcji',
    },
  });
  const lessonTutorContext = useMemo(
    () => ({
      surface: 'lesson' as const,
      contentId: activeLesson?.id ?? 'lesson:list',
      title: activeLesson?.title ?? 'Lekcje',
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id,
    }),
    [activeLesson?.id, activeLesson?.title, activeLessonAssignment?.id, completedActiveLessonAssignment?.id]
  );
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Lessons' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );
  const lessonPageMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const resolveMotionOpacity = useCallback((value: unknown, fallback: number): number => {
    if (!value || typeof value !== 'object') return fallback;
    const opacity = (value as { opacity?: unknown }).opacity;
    return typeof opacity === 'number' ? opacity : fallback;
  }, []);
  const lessonActiveMotionProps = useMemo(() => {
    if (activeLesson?.componentId !== 'adding') return lessonPageMotionProps;
    return {
      ...lessonPageMotionProps,
      initial: { opacity: resolveMotionOpacity(lessonPageMotionProps.initial, 1) },
      animate: { opacity: resolveMotionOpacity(lessonPageMotionProps.animate, 1) },
      exit: { opacity: resolveMotionOpacity(lessonPageMotionProps.exit, 1) },
    };
  }, [activeLesson?.componentId, lessonPageMotionProps, resolveMotionOpacity]);
  const lessonContentReadyMotionProps = lessonPageMotionProps;
  const lessonCardMotionProps = useMemo(
    () => ({
      initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      whileHover: prefersReducedMotion ? undefined : { scale: 1.02 },
      whileTap: prefersReducedMotion ? undefined : { scale: 0.98 },
    }),
    [prefersReducedMotion]
  );
  const lessonListIntroDescription = isDeferredContentReady
    ? (lessonListIntroContent?.summary ??
      'Wybierz temat i przejdź od razu do praktyki lub powtórki.')
    : 'Lekcje zaraz będą gotowe.';

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={lessonTutorContext} />
      <KangurStandardPageLayout
        tone='learn'
        id='kangur-lessons-page'
        skipLinkTargetId='kangur-lessons-main'
        docsRootId='kangur-lessons-page'
        docsTooltipsEnabled={docsTooltipsEnabled}
        navigation={<KangurTopNavigationController navigation={navigation} />}
        containerProps={{
          as: 'section',
          'data-kangur-route-main': true,
          id: 'kangur-lessons-main',
          className: 'flex flex-col items-center',
        }}
      >
          <AnimatePresence mode='wait'>
            {!activeLesson ? (
              <motion.div
                key='list-shell'
                {...lessonPageMotionProps}
                className={`flex w-full max-w-lg flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
                data-testid={isDeferredContentReady ? 'lessons-list-transition' : 'lessons-shell-transition'}
              >
                <div ref={lessonListIntroRef} id='kangur-lessons-intro' className='w-full'>
                  <KangurPageIntroCard
                    description={lessonListIntroDescription}
                    headingAs='h1'
                    headingTestId='kangur-lessons-list-heading'
                    onBack={handleGoBack}
                    testId='lessons-list-intro-card'
                    title={lessonListIntroContent?.title ?? 'Lekcje'}
                    visualTitle={
                      <KangurLessonsWordmark
                        className='mx-auto'
                        data-testid='kangur-lessons-heading-art'
                        idPrefix='kangur-lessons-page-heading'
                      />
                    }
                  />
                </div>
                {isDeferredContentReady ? (
                  <motion.div
                    ref={orderedLessons.length === 0 ? undefined : lessonLibraryRef}
                    key='list-content'
                    {...lessonContentReadyMotionProps}
                    className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
                    id={orderedLessons.length === 0 ? undefined : 'kangur-lessons-library'}
                    role='list'
                    aria-label='Lista lekcji'
                  >
                    {orderedLessons.length === 0 ? (
                      <div ref={lessonListEmptyStateRef} id='kangur-lessons-empty'>
                        <KangurEmptyState
                          accent='indigo'
                          className='w-full'
                          description={
                            lessonListEmptyStateContent?.summary ??
                            'Włącz lekcje w panelu admina, aby pojawiły się tutaj.'
                          }
                          padding='xl'
                          title={lessonListEmptyStateContent?.title ?? 'Brak aktywnych lekcji'}
                        />
                      </div>
                    ) : (
                      orderedLessons.map((lesson, index) => {
                        const masteryPresentation = getLessonMasteryPresentation(lesson, progress);
                        const lessonAssignment =
                          lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
                        const completedLessonAssignment = !lessonAssignment
                          ? (completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null)
                          : null;

                        return (
                          <motion.div
                            key={lesson.id}
                            {...lessonCardMotionProps}
                            transition={{
                              ...(prefersReducedMotion ? { duration: 0 } : LESSONS_CARD_TRANSITION),
                              delay: prefersReducedMotion ? 0 : index * LESSONS_CARD_STAGGER_DELAY,
                            }}
                            data-testid={`lesson-library-motion-${lesson.id}`}
                            role='listitem'
                          >
                              <KangurLessonLibraryCard
                                ariaCurrent={
                                activeLessonId === lesson.id ? 'page' : undefined
                              }
                              buttonClassName='kangur-lessons-panel flex flex-col items-start kangur-panel-gap rounded-[28px] p-4 max-sm:pr-4 max-sm:pb-4 sm:rounded-[30px] sm:p-5'
                              completedLessonAssignment={completedLessonAssignment}
                              dataDocId='lessons_library_entry'
                              emphasis='neutral'
                              hasDocumentContent={hasKangurLessonDocumentContent(lessonDocuments[lesson.id])}
                              iconTestId={`lesson-library-icon-${lesson.id}`}
                              lesson={lesson}
                              lessonAssignment={lessonAssignment}
                              masteryPresentation={masteryPresentation}
                              onSelect={() => handleSelectLesson(lesson.id)}
                            />
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key={activeLesson.id}
                {...lessonActiveMotionProps}
                className={`w-full flex flex-col items-center ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
                data-testid='lessons-active-transition'
                >
                <KangurLessonNavigationProvider
                  onBack={() => handleSelectLesson(null)}
                  secretLessonPill={{
                    isUnlocked: isSecretLessonUnlocked,
                    onOpen: handleOpenSecretLesson,
                  }}
                >
                  <div
                    ref={activeLessonHeaderRef}
                    id='kangur-lesson-header'
                    className='w-full max-w-5xl'
                  >
                    <KangurActiveLessonHeader
                      lesson={activeLesson}
                      lessonDocument={activeLessonDocument}
                      lessonContentRef={activeLessonContentRef}
                      activeLessonAssignment={activeLessonAssignment}
                      completedActiveLessonAssignment={completedActiveLessonAssignment}
                      assignmentSectionSummary={
                        activeLessonAssignmentContent?.summary ??
                        'To miejsce pokazuje, czy ta lekcja ma aktywny priorytet od rodzica albo została już zaliczona.'
                      }
                      assignmentSectionTitle={
                        activeLessonAssignmentContent?.title ?? 'Zadanie od rodzica'
                      }
                      assignmentRef={activeLessonAssignmentRef}
                      descriptionOverride={
                        activeLessonHeaderContent?.summary ??
                        'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.'
                      }
                      headerTestId='active-lesson-header'
                      headerActionsTestId='active-lesson-header-icon-actions'
                      iconTestId={`active-lesson-icon-${activeLesson.id}`}
                      priorityChipTestId='active-lesson-parent-priority-chip'
                      completedChipTestId='active-lesson-parent-completed-chip'
                      onBack={(): void => handleSelectLesson(null)}
                      titleOverride={activeLessonHeaderContent?.title ?? 'Aktywna lekcja'}
                    />
                  </div>
                  <div
                    ref={activeLessonNavigationRef}
                    id={LESSON_NAV_ANCHOR_ID}
                    className='w-full max-w-5xl kangur-lesson-nav-offset'
                  >
                    <KangurLessonNavigationWidget
                      align='start'
                      nextLesson={next}
                      onSelectLesson={handleSelectLesson}
                      prevLesson={prev}
                    />
                  </div>
                  <div
                    ref={activeLessonContentRef}
                    id='kangur-lesson-content'
                    className={`w-full flex flex-col items-center ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
                  >
                    {isSecretLessonHostActive ? (
                      <div
                        ref={activeLessonSecretPanelRef}
                        id='kangur-lesson-secret'
                        className='w-full flex justify-center'
                      >
                        <KangurGlassPanel
                          className='flex w-full max-w-3xl flex-col items-center kangur-panel-gap text-center'
                          data-testid='lessons-secret-panel'
                          padding='xl'
                          surface='solid'
                        >
                          <KangurStatusChip
                            accent='amber'
                            className='border-amber-300/90 bg-amber-200/90 text-amber-950'
                            data-testid='lessons-secret-pill-chip'
                            size='sm'
                          >
                            Sekret odblokowany
                          </KangurStatusChip>
                          <div className='text-6xl' aria-hidden='true'>
                            🏆
                          </div>
                          <div className='space-y-2'>
                            <h2 className='text-2xl font-black text-slate-800'>
                              {activeLessonSecretPanelContent?.title ?? 'Ukryty finisz'}
                            </h2>
                            <p
                              className='break-words text-sm font-semibold uppercase tracking-[0.18em] text-amber-700'
                              data-testid='lessons-secret-host-label'
                            >
                              {activeLesson.title}
                            </p>
                            <p className='max-w-xl break-words text-sm leading-relaxed text-slate-600'>
                              {activeLessonSecretPanelContent?.summary ??
                                'Złota pigułka odblokowała finał na samym końcu ostatniej lekcji w kolejce. Trafiłeś od razu do ukrytego zakończenia.'}
                            </p>
                          </div>
                        </KangurGlassPanel>
                      </div>
                    ) : shouldRenderLessonDocument && activeLessonDocument ? (
                      <div className='w-full max-w-5xl space-y-4'>
                        <KangurSummaryPanel
                          accent='sky'
                          className='w-full'
                          data-testid='lessons-document-summary'
                          description={
                            activeLessonDocumentContent?.summary ??
                            'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.'
                          }
                          label='Lesson document'
                          labelAccent='sky'
                          padding='lg'
                          title={activeLessonDocumentContent?.title ?? 'Materiał lekcji'}
                          tone='accent'
                        />
                      <KangurLessonDocumentRenderer document={activeLessonDocument} />
                    </div>
                  ) : activeLesson?.contentMode === 'document' &&
                      !hasActiveLessonDocumentContent ? (
                        <div
                          ref={activeLessonEmptyDocumentRef}
                          id='kangur-lesson-empty-document'
                          className='w-full flex justify-center'
                        >
                          <KangurSummaryPanel
                            accent='amber'
                            align='center'
                            className='w-full max-w-3xl'
                            data-testid='lessons-empty-document-summary'
                            description={
                              activeLessonEmptyDocumentContent?.summary ??
                              'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.'
                            }
                            label='Lesson document'
                            labelAccent='amber'
                            padding='xl'
                            title={
                              activeLessonEmptyDocumentContent?.title ??
                              'Brak zapisanej treści lekcji'
                            }
                            tone='accent'
                          />
                        </div>
                      ) : ActiveLessonComponent ? (
                        <ActiveLessonComponent
                          onReady={() => {
                            setIsActiveLessonComponentReady(true);
                          }}
                        />
                      ) : null}

                  </div>
                </KangurLessonNavigationProvider>
              </motion.div>
            )}
          </AnimatePresence>
      </KangurStandardPageLayout>
    </>
  );
}
