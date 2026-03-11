'use client';

'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
import { useOptionalKangurRouteTransition } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
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
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { ComponentType } from 'react';

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
  badgeAccent: KangurAccent;
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
  const lessonAssignmentsByComponent = useMemo(() => {
    const nextMap = new Map<KangurLessonComponentId, (typeof assignments)[number]>();
    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status !== 'completed')
      .filter(
        (assignment): assignment is (typeof assignments)[number] & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
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
  }, [assignments]);
  const completedLessonAssignmentsByComponent = useMemo(() => {
    const nextMap = new Map<KangurLessonComponentId, (typeof assignments)[number]>();

    assignments
      .filter((assignment) => !assignment.archived)
      .filter((assignment) => assignment.progress.status === 'completed')
      .filter(
        (assignment): assignment is (typeof assignments)[number] & { target: { type: 'lesson' } } =>
          assignment.target.type === 'lesson'
      )
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
  }, [assignments]);
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

    const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
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
  const handleOpenSecretLesson = useCallback((): void => {
    if (!isSecretLessonUnlocked || !secretHostLesson) {
      return;
    }

    setActiveLessonId(secretHostLesson.id);
    setIsSecretLessonActive(true);
  }, [isSecretLessonUnlocked, secretHostLesson]);
  const isSecretLessonHostActive =
    isSecretLessonActive && Boolean(secretHostLesson && activeLesson?.id === secretHostLesson.id);
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
  useEffect(() => {
    if (!isSecretLessonUnlocked) {
      setIsSecretLessonActive(false);
    }
  }, [isSecretLessonUnlocked]);
  useEffect(() => {
    if (!activeLesson) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      activeLessonHeaderRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeLesson?.id]);
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
                  testId='lessons-list-intro-card'
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
                        <ActiveLessonComponent />
                      ) : null}

                    <KangurLessonNavigationWidget
                      nextLesson={next}
                      onSelectLesson={handleSelectLesson}
                      prevLesson={prev}
                    />
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
