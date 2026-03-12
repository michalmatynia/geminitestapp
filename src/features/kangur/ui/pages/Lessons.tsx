'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getKangurHomeHref,
  getKangurInternalQueryParamName,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  hasKangurLessonDocumentContent,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurGradientIconTile,
  KangurOptionCardButton,
  KangurPageContainer,
  KangurPageShell,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

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
        className='flex min-h-[280px] w-full flex-col items-center justify-center gap-3 text-center'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurStatusChip accent='indigo' className='uppercase tracking-[0.18em]' size='sm'>
          Lekcja
        </KangurStatusChip>
        <div className='text-base font-semibold text-slate-700'>Ladowanie lekcji...</div>
        <p className='max-w-lg text-sm text-slate-500'>
          Przygotowujemy material, aby przejscie do aktywnej sekcji bylo plynniejsze.
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

export default function Lessons() {
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, navigateToLogin, logout } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('lessons');
  const prefersReducedMotion = useReducedMotion();
  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const { entry: lessonListEmptyStateContent } =
    useKangurPageContentEntry('lessons-list-empty-state');
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

  const learnerId = user?.activeLearner?.id ?? user?.id ?? null;
  useEffect(() => {
    if (!isSecretLessonUnlocked) {
      setIsSecretLessonActive(false);
    }
  }, [isSecretLessonUnlocked]);
  useEffect(() => {
    setIsActiveLessonComponentReady(false);
  }, [activeLesson?.id]);
  useEffect(() => {
    if (!activeLesson) {
      return;
    }

    let frameId: number | null = null;
    let remainingFrames = ACTIVE_LESSON_HEADER_SCROLL_MAX_FRAMES;

    const scrollHeaderIntoView = (): void => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

      const header = activeLessonHeaderRef.current;
      if (header) {
        header.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });

        if (window.scrollY <= 8 || Math.abs(header.getBoundingClientRect().top) <= 8) {
          frameId = null;
          return;
        }
      }

      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        frameId = null;
        return;
      }

      frameId = window.requestAnimationFrame(scrollHeaderIntoView);
    };

    frameId = window.requestAnimationFrame(scrollHeaderIntoView);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
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
    enabled: Boolean(activeLesson && activeLessonAssignment),
    priority: 80,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLessonAssignment?.title ?? null,
      assignmentId: activeLessonAssignment?.id ?? null,
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
      label: activeLesson?.title ?? 'Brak zawartosci lekcji',
    },
  });
  useKangurTutorAnchor({
    id: activeLesson ? `kangur-lesson-navigation:${activeLesson.id}` : 'kangur-lesson-navigation',
    kind: 'navigation',
    ref: activeLessonNavigationRef,
    surface: 'lesson',
    enabled: Boolean(activeLesson),
    priority: 20,
    metadata: {
      contentId: activeLesson?.id ?? null,
      label: activeLesson?.title ?? 'Nawigacja lekcji',
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
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, navigateToLogin, setGuestPlayerName, user]
  );
  const lessonPageMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
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
      'Wybierz temat i przejdz od razu do praktyki lub powtorki.')
    : 'Lekcje zaraz beda gotowe.';

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={lessonTutorContext} />
      <KangurPageShell tone='learn' id='kangur-lessons-page' skipLinkTargetId='kangur-lessons-main'>
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-lessons-page' />
        <KangurTopNavigationController navigation={navigation} />

        <KangurPageContainer id='kangur-lessons-main' className='flex flex-col items-center'>
          <AnimatePresence mode='wait'>
            {!activeLesson ? (
              <motion.div
                key='list-shell'
                {...lessonPageMotionProps}
                className='flex w-full max-w-lg flex-col items-center gap-4'
                data-testid={isDeferredContentReady ? 'lessons-list-transition' : 'lessons-shell-transition'}
              >
                <div ref={lessonListIntroRef} className='w-full'>
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
                    className='flex w-full flex-col gap-4'
                  >
                    {orderedLessons.length === 0 ? (
                      <div ref={lessonListEmptyStateRef}>
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
                          >
                            <KangurOptionCardButton
                              accent='indigo'
                              className='flex w-full flex-col items-start gap-4 rounded-[28px] p-4 text-left sm:rounded-[30px] sm:p-5'
                              data-doc-id='lessons_library_entry'
                              emphasis='neutral'
                              onClick={() => handleSelectLesson(lesson.id)}
                              type='button'
                            >
                              <KangurGradientIconTile
                                data-testid={`lesson-library-icon-${lesson.id}`}
                                gradientClass={lesson.color}
                                size='lg'
                              >
                                {lesson.emoji}
                              </KangurGradientIconTile>
                              <div className='min-w-0 flex-1'>
                                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                  <div className='min-w-0'>
                                    <div className='text-lg font-extrabold text-slate-800 sm:text-xl'>
                                      {lesson.title}
                                    </div>
                                    <div className='mt-0.5 text-sm text-slate-500'>
                                      {lesson.description}
                                    </div>
                                    {lesson.contentMode === 'document' &&
                                    hasKangurLessonDocumentContent(lessonDocuments[lesson.id]) ? (
                                        <KangurStatusChip
                                          accent='sky'
                                          className='mt-2 uppercase tracking-[0.14em]'
                                          size='sm'
                                        >
                                        Wlasna zawartosc
                                        </KangurStatusChip>
                                      ) : null}
                                    {lessonAssignment ? (
                                      <KangurStatusChip
                                        accent='rose'
                                        className='mt-2 uppercase tracking-[0.14em]'
                                        size='sm'
                                      >
                                        Priorytet rodzica
                                      </KangurStatusChip>
                                    ) : completedLessonAssignment ? (
                                      <KangurStatusChip
                                        accent='emerald'
                                        className='mt-2 uppercase tracking-[0.14em]'
                                        size='sm'
                                      >
                                        Ukonczone dla rodzica
                                      </KangurStatusChip>
                                    ) : null}
                                  </div>
                                  <div className='flex flex-wrap items-center gap-2 sm:flex-col sm:items-end'>
                                    <KangurStatusChip
                                      accent={masteryPresentation.badgeAccent}
                                      className='uppercase tracking-[0.14em]'
                                      size='sm'
                                    >
                                      {masteryPresentation.statusLabel}
                                    </KangurStatusChip>
                                    {lessonAssignment ? (
                                      <KangurStatusChip
                                        accent='rose'
                                        className='uppercase tracking-[0.14em]'
                                        size='sm'
                                      >
                                        {lessonAssignment.priority === 'high'
                                          ? 'Priorytet wysoki'
                                          : lessonAssignment.priority === 'medium'
                                            ? 'Priorytet sredni'
                                            : 'Priorytet niski'}
                                      </KangurStatusChip>
                                    ) : completedLessonAssignment ? (
                                      <KangurStatusChip
                                        accent='emerald'
                                        className='uppercase tracking-[0.14em]'
                                        size='sm'
                                      >
                                        Zadanie zamkniete
                                      </KangurStatusChip>
                                    ) : null}
                                  </div>
                                </div>
                                <div className='mt-3 text-xs font-medium text-slate-500'>
                                  {masteryPresentation.summaryLabel}
                                </div>
                                {lessonAssignment ? (
                                  <div className='mt-2 text-xs font-semibold text-rose-600'>
                                    {lessonAssignment.description}
                                  </div>
                                ) : completedLessonAssignment ? (
                                  <div className='mt-2 text-xs font-semibold text-emerald-600'>
                                    Zadanie od rodzica zostalo juz wykonane.{' '}
                                    {completedLessonAssignment.progress.summary}
                                  </div>
                                ) : null}
                              </div>
                            </KangurOptionCardButton>
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
                {...lessonPageMotionProps}
                className='w-full flex flex-col items-center gap-4'
                data-testid='lessons-active-transition'
              >
                <KangurLessonNavigationProvider
                  onBack={() => handleSelectLesson(null)}
                  secretLessonPill={{
                    isUnlocked: isSecretLessonUnlocked,
                    onOpen: handleOpenSecretLesson,
                  }}
                >
                  <div ref={activeLessonHeaderRef} className='w-full max-w-5xl'>
                    <KangurActiveLessonHeader
                      lesson={activeLesson}
                      lessonDocument={activeLessonDocument}
                      lessonContentRef={activeLessonContentRef}
                      activeLessonAssignment={activeLessonAssignment}
                      completedActiveLessonAssignment={completedActiveLessonAssignment}
                      assignmentRef={activeLessonAssignmentRef}
                      headerTestId='active-lesson-header'
                      headerActionsTestId='active-lesson-header-icon-actions'
                      iconTestId={`active-lesson-icon-${activeLesson.id}`}
                      priorityChipTestId='active-lesson-parent-priority-chip'
                      completedChipTestId='active-lesson-parent-completed-chip'
                      onBack={(): void => handleSelectLesson(null)}
                    />
                  </div>
                  <div
                    ref={activeLessonContentRef}
                    className='w-full flex flex-col items-center gap-4'
                  >
                    {isSecretLessonHostActive ? (
                      <div ref={activeLessonSecretPanelRef} className='w-full flex justify-center'>
                        <KangurGlassPanel
                          className='flex w-full max-w-3xl flex-col items-center gap-4 text-center'
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
                            <h2 className='text-2xl font-black text-slate-800'>Ukryty finisz</h2>
                            <p
                              className='text-sm font-semibold uppercase tracking-[0.18em] text-amber-700'
                              data-testid='lessons-secret-host-label'
                            >
                              {activeLesson.title}
                            </p>
                            <p className='max-w-xl text-sm leading-relaxed text-slate-600'>
                              Złota pigułka odblokowała finał na samym końcu ostatniej lekcji w
                              kolejce. Trafiłeś od razu do ukrytego zakończenia.
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
                          description={activeLesson.description}
                          label='Lesson document'
                          labelAccent='sky'
                          padding='lg'
                          title={activeLesson.title}
                          tone='accent'
                        />
                        <KangurLessonDocumentRenderer document={activeLessonDocument} />
                      </div>
                    ) : activeLesson?.contentMode === 'document' &&
                      !hasActiveLessonDocumentContent ? (
                        <div ref={activeLessonEmptyDocumentRef} className='w-full flex justify-center'>
                          <KangurSummaryPanel
                            accent='amber'
                            align='center'
                            className='w-full max-w-3xl'
                            data-testid='lessons-empty-document-summary'
                            description='This lesson is set to use custom document content, but no document blocks have been saved yet.'
                            label='Lesson document'
                            labelAccent='amber'
                            padding='xl'
                            title={activeLesson.title}
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

                    <div ref={activeLessonNavigationRef} className='w-full'>
                      <KangurLessonNavigationWidget
                        nextLesson={next}
                        onSelectLesson={handleSelectLesson}
                        prevLesson={prev}
                      />
                    </div>
                  </div>
                </KangurLessonNavigationProvider>
              </motion.div>
            )}
          </AnimatePresence>
        </KangurPageContainer>
      </KangurPageShell>
    </>
  );
}
