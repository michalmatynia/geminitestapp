'use client';

'use client';

import {
  buildActiveKangurLessonAssignmentsByComponent,
  buildCompletedKangurLessonAssignmentsByComponent,
  getKangurLessonMasteryPresentation,
  orderKangurLessonsByAssignmentPriority,
  resolveFocusedKangurLessonId,
} from '@kangur/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

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
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { KangurActiveLessonHeader } from '@/features/kangur/ui/components/KangurActiveLessonHeader';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { KangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KangurButton,
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
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type LessonProps = {
  onBack?: () => void;
};

const LESSONS_CARD_EASE = [0.22, 1, 0.36, 1] as const;
const LESSONS_CARD_TRANSITION = {
  duration: 0.26,
  ease: LESSONS_CARD_EASE,
} as const;
const LESSONS_CARD_STAGGER_DELAY = 0.06;

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
      return module.default;
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

export default function Lessons() {
  const router = useRouter();
  const { basePath } = useKangurRouting();
  const routeTransition = useOptionalKangurRouteTransition();
  const auth = useKangurAuth();
  const { user, navigateToLogin, logout } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? Boolean(user?.activeLearner?.id);
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('lessons');
  const prefersReducedMotion = useReducedMotion();
  const settingsStore = useSettingsStore();
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
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
  }, [activeLessonId, lessons]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] : null;
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
  const handleGoBack = (): void => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    const homeHref = getKangurHomeHref(basePath);
    routeTransition?.startRouteTransition({
      href: homeHref,
      pageKey: 'Game',
    });
    router.push(homeHref);
  };

  const learnerId = user?.activeLearner?.id ?? user?.id ?? null;
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
  const lessonTutorContext = useMemo(
    () => ({
      surface: 'lesson' as const,
      contentId: activeLesson?.id,
      assignmentId: activeLessonAssignment?.id ?? completedActiveLessonAssignment?.id,
    }),
    [activeLesson?.id, activeLessonAssignment?.id, completedActiveLessonAssignment?.id]
  );
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      contentClassName: 'justify-center',
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
  const lessonContentReadyMotionProps = useMemo(
    () => ({
      initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0.92, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0.98, y: -4 },
      transition: prefersReducedMotion
        ? { duration: 0 }
        : {
            duration: 0.32,
            ease: LESSONS_CARD_EASE,
          },
    }),
    [prefersReducedMotion]
  );
  const lessonCardMotionProps = useMemo(
    () => ({
      initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      whileHover: prefersReducedMotion ? undefined : { scale: 1.02 },
      whileTap: prefersReducedMotion ? undefined : { scale: 0.98 },
    }),
    [prefersReducedMotion]
  );

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={lessonTutorContext} />
      <KangurPageShell tone='learn' id='kangur-lessons-page' skipLinkTargetId='kangur-lessons-main'>
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-lessons-page' />
        <KangurTopNavigationController navigation={navigation} />

        <KangurPageContainer id='kangur-lessons-main' className='flex flex-col items-center'>
          <AnimatePresence initial={false} mode='wait'>
            {!activeLesson ? (
              <div
                key='list-shell'
                className='flex w-full max-w-md flex-col items-center gap-4'
                data-testid={isDeferredContentReady ? 'lessons-list-transition' : 'lessons-shell-transition'}
              >
                <KangurPageIntroCard
                  description={
                    isDeferredContentReady
                      ? 'Wybierz temat i przejdz od razu do praktyki lub powtorki.'
                      : 'Lekcje zaraz beda gotowe.'
                  }
                  headingAs='h1'
                  headingTestId='kangur-lessons-list-heading'
                  onBack={handleGoBack}
                  title='Lekcje'
                  visualTitle={
                    <KangurLessonsWordmark
                      className='mx-auto'
                      data-testid='kangur-lessons-heading-art'
                    />
                  }
                />
                {isDeferredContentReady ? (
                  <motion.div
                    key='list-content'
                    {...lessonContentReadyMotionProps}
                    className='flex w-full flex-col gap-4'
                  >
                    {orderedLessons.length === 0 ? (
                      <KangurEmptyState
                        accent='indigo'
                        className='w-full'
                        description='Włącz lekcje w panelu admina, aby pojawiły się tutaj.'
                        padding='xl'
                        title='Brak aktywnych lekcji'
                      />
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
                              className='flex w-full items-start gap-4 rounded-[30px] p-5 text-left'
                              data-doc-id='lessons_library_entry'
                              emphasis='neutral'
                              onClick={() => setActiveLessonId(lesson.id)}
                              type='button'
                            >
                              <KangurGradientIconTile
                                data-testid={`lesson-library-icon-${lesson.id}`}
                                gradientClass={lesson.color}
                                size='lg'
                              >
                                {lesson.emoji}
                              </KangurGradientIconTile>
                              <div className='flex-1'>
                                <div className='flex items-start justify-between gap-3'>
                                  <div>
                                    <div className='text-xl font-extrabold text-slate-800'>
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
                                  <div className='flex flex-col items-end gap-2'>
                                    <KangurStatusChip
                                      accent={masteryPresentation.badgeAccent}
                                      className='whitespace-nowrap uppercase tracking-[0.14em]'
                                      size='sm'
                                    >
                                      {masteryPresentation.statusLabel}
                                    </KangurStatusChip>
                                    {lessonAssignment ? (
                                      <KangurStatusChip
                                        accent='rose'
                                        className='whitespace-nowrap uppercase tracking-[0.14em]'
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
                                        className='whitespace-nowrap uppercase tracking-[0.14em]'
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
              </div>
            ) : (
              <motion.div
                key={activeLesson.id}
                {...lessonPageMotionProps}
                className='w-full flex flex-col items-center gap-4'
                data-testid='lessons-active-transition'
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
                    onBack={(): void => setActiveLessonId(null)}
                  />
                </div>
                <div
                  ref={activeLessonContentRef}
                  className='w-full flex flex-col items-center gap-4'
                >
                  {shouldRenderLessonDocument && activeLessonDocument ? (
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
                    ) : ActiveLessonComponent ? (
                      <KangurLessonNavigationProvider onBack={() => setActiveLessonId(null)}>
                        <ActiveLessonComponent />
                      </KangurLessonNavigationProvider>
                    ) : null}
                </div>

                {/* Prev / Next lesson navigation */}
                {(prev || next) && (
                  <div className='flex gap-3 w-full max-w-lg mt-2'>
                    {prev ? (
                      <KangurButton
                        onClick={() => setActiveLessonId(prev.id)}
                        className='flex-1 justify-start'
                        size='lg'
                        variant='surface'
                        data-doc-id='lessons_prev_next'
                      >
                        <ChevronLeft className='w-4 h-4 flex-shrink-0' />
                        <span>
                          {prev.emoji} {prev.title}
                        </span>
                      </KangurButton>
                    ) : (
                      <div className='flex-1' />
                    )}
                    {next ? (
                      <KangurButton
                        onClick={() => setActiveLessonId(next.id)}
                        className='flex-1 justify-end'
                        size='lg'
                        variant='surface'
                        data-doc-id='lessons_prev_next'
                      >
                        <span>
                          {next.emoji} {next.title}
                        </span>
                        <ChevronRight className='w-4 h-4 flex-shrink-0' />
                      </KangurButton>
                    ) : (
                      <div className='flex-1' />
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </KangurPageContainer>
      </KangurPageShell>
    </>
  );
}
