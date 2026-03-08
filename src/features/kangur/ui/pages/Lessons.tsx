'use client';

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import {
  getKangurInternalQueryParamName,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  hasKangurLessonDocumentContent,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
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
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type LessonProps = {
  onBack?: () => void;
};

const LessonLoadingFallback = (): React.JSX.Element => (
  <KangurGlassPanel
    className='w-full max-w-2xl text-center text-sm text-indigo-500'
    data-testid='lessons-loading-fallback'
    padding='lg'
    surface='solid'
    variant='soft'
  >
    Ladowanie lekcji...
  </KangurGlassPanel>
);

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
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('lessons');
  const settingsStore = useSettingsStore();
  const progress = useKangurProgressState();
  const { assignments } = useKangurAssignments({
    enabled: Boolean(user),
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

    router.push(createPageUrl('Game', basePath));
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

  return (
    <>
      <KangurAiTutorSessionSync learnerId={learnerId} sessionContext={lessonTutorContext} />
      <KangurPageShell tone='learn' id='kangur-lessons-page' skipLinkTargetId='kangur-lessons-main'>
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='kangur-lessons-page' />
        <KangurPrimaryNavigation
          basePath={basePath}
          canManageLearners={Boolean(user?.canManageLearners)}
          contentClassName='justify-center'
          currentPage='Lessons'
          isAuthenticated={Boolean(user)}
          onLogin={navigateToLogin}
          onLogout={() => logout(false)}
        />

        <KangurPageContainer id='kangur-lessons-main' className='flex flex-col items-center'>
          <AnimatePresence mode='wait'>
            {!activeLesson ? (
              <motion.div
                key='list'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className='flex flex-col items-center gap-4 w-full max-w-md'
              >
                <KangurGlassPanel
                  className='w-full text-center'
                  padding='lg'
                  surface='mistStrong'
                  variant='soft'
                >
                  <h1 className='flex justify-center' data-testid='kangur-lessons-list-heading'>
                    <span className='sr-only'>Lekcje</span>
                    <KangurLessonsWordmark
                      className='mx-auto'
                      data-testid='kangur-lessons-heading-art'
                    />
                  </h1>
                  <p className='mt-3 text-sm text-slate-500'>
                    Wybierz temat i przejdz od razu do praktyki lub powtorki.
                  </p>
                  <KangurButton
                    className='mt-4'
                    data-doc-id='lessons_back_button'
                    onClick={handleGoBack}
                    size='sm'
                    variant='surface'
                  >
                    Wróć do poprzedniej strony
                  </KangurButton>
                </KangurGlassPanel>

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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
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
            ) : (
              <motion.div
                key={activeLesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className='w-full flex flex-col items-center gap-4'
              >
                {activeLessonAssignment ? (
                  <div ref={activeLessonAssignmentRef} className='w-full max-w-2xl'>
                    <KangurSummaryPanel
                      accent='rose'
                      className='w-full'
                      description={activeLessonAssignment.description}
                      label='Priorytet rodzica'
                      labelAccent='rose'
                      padding='md'
                      title={activeLessonAssignment.title}
                      tone='accent'
                    />
                  </div>
                ) : completedActiveLessonAssignment ? (
                  <KangurSummaryPanel
                    accent='emerald'
                    className='w-full max-w-2xl'
                    description={`To zadanie zostalo juz wykonane. ${completedActiveLessonAssignment.progress.summary}`}
                    label='Ukonczone zadanie od rodzica'
                    labelAccent='emerald'
                    padding='md'
                    title={completedActiveLessonAssignment.title}
                    tone='accent'
                  />
                ) : null}
                <div ref={activeLessonHeaderRef} className='w-full max-w-5xl'>
                  <KangurLessonNarrator
                    lesson={activeLesson}
                    lessonDocument={activeLessonDocument}
                    lessonContentRef={activeLessonContentRef}
                    readLabel='Read lesson'
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
                      >
                        <div className='mt-4 flex justify-start md:justify-end'>
                          <KangurButton
                            type='button'
                            onClick={(): void => setActiveLessonId(null)}
                            size='sm'
                            variant='surface'
                            data-doc-id='lessons_back_button'
                          >
                            Wroc do listy lekcji
                          </KangurButton>
                        </div>
                      </KangurSummaryPanel>
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
                    >
                      <KangurButton
                        type='button'
                        onClick={(): void => setActiveLessonId(null)}
                        className='mt-5'
                        size='sm'
                        variant='surface'
                        data-doc-id='lessons_back_button'
                      >
                        Wroc do listy lekcji
                      </KangurButton>
                    </KangurSummaryPanel>
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
