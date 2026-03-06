import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  hasKangurLessonDocumentContent,
  KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
  parseKangurLessonDocumentStore,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSONS_SETTING_KEY, parseKangurLessons } from '@/features/kangur/settings';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurPanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_OPTION_CARD_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';
import Link from 'next/link';

type LessonProps = {
  onBack: () => void;
};

const LessonLoadingFallback = (): React.JSX.Element => (
  <div className='w-full max-w-2xl rounded-3xl border border-indigo-200/70 bg-white/90 p-6 text-center shadow-lg text-sm text-indigo-500'>
    Ladowanie lekcji...
  </div>
);

const ClockLesson = dynamic(() => import('@/features/kangur/ui/components/ClockLesson'), {
  ssr: false,
  loading: LessonLoadingFallback,
});
const CalendarLesson = dynamic(() => import('@/features/kangur/ui/components/CalendarLesson'), {
  ssr: false,
  loading: LessonLoadingFallback,
});
const AddingLesson = dynamic(() => import('@/features/kangur/ui/components/AddingLesson'), {
  ssr: false,
  loading: LessonLoadingFallback,
});
const SubtractingLesson = dynamic(
  () => import('@/features/kangur/ui/components/SubtractingLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const MultiplicationLesson = dynamic(
  () => import('@/features/kangur/ui/components/MultiplicationLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const DivisionLesson = dynamic(() => import('@/features/kangur/ui/components/DivisionLesson'), {
  ssr: false,
  loading: LessonLoadingFallback,
});
const GeometryBasicsLesson = dynamic(
  () => import('@/features/kangur/ui/components/GeometryBasicsLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const GeometryShapesLesson = dynamic(
  () => import('@/features/kangur/ui/components/GeometryShapesLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const GeometrySymmetryLesson = dynamic(
  () => import('@/features/kangur/ui/components/GeometrySymmetryLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const GeometryPerimeterLesson = dynamic(
  () => import('@/features/kangur/ui/components/GeometryPerimeterLesson'),
  {
    ssr: false,
    loading: LessonLoadingFallback,
  }
);
const LogicalThinkingLesson = dynamic(
  () => import('@/features/kangur/ui/components/LogicalThinkingLesson'),
  { ssr: false, loading: LessonLoadingFallback }
);
const LogicalPatternsLesson = dynamic(
  () => import('@/features/kangur/ui/components/LogicalPatternsLesson'),
  { ssr: false, loading: LessonLoadingFallback }
);
const LogicalClassificationLesson = dynamic(
  () => import('@/features/kangur/ui/components/LogicalClassificationLesson'),
  { ssr: false, loading: LessonLoadingFallback }
);
const LogicalReasoningLesson = dynamic(
  () => import('@/features/kangur/ui/components/LogicalReasoningLesson'),
  { ssr: false, loading: LessonLoadingFallback }
);
const LogicalAnalogiesLesson = dynamic(
  () => import('@/features/kangur/ui/components/LogicalAnalogiesLesson'),
  { ssr: false, loading: LessonLoadingFallback }
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
  badgeClassName: string;
} => {
  const mastery = progress.lessonMastery[lesson.componentId];
  if (!mastery) {
    return {
      statusLabel: 'Nowa',
      summaryLabel: 'Brak zapisanej praktyki',
      badgeClassName: 'bg-white/20 text-white/90',
    };
  }

  if (mastery.masteryPercent >= 85) {
    return {
      statusLabel: `Opanowane ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · najlepszy wynik ${mastery.bestScorePercent}%`,
      badgeClassName: 'bg-emerald-400/90 text-emerald-950',
    };
  }

  if (mastery.masteryPercent >= 60) {
    return {
      statusLabel: `W trakcie ${mastery.masteryPercent}%`,
      summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
      badgeClassName: 'bg-amber-300/90 text-amber-950',
    };
  }

  return {
    statusLabel: `Powtórz ${mastery.masteryPercent}%`,
    summaryLabel: `Ukończono ${mastery.completions}× · ostatni wynik ${mastery.lastScorePercent}%`,
    badgeClassName: 'bg-rose-300/90 text-rose-950',
  };
};

const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const getLessonAssignmentTimestamp = (primaryValue: string | null, fallbackValue: string): number => {
  const primaryTimestamp = primaryValue ? Date.parse(primaryValue) : Number.NaN;
  if (!Number.isNaN(primaryTimestamp)) {
    return primaryTimestamp;
  }

  const fallbackTimestamp = Date.parse(fallbackValue);
  return Number.isNaN(fallbackTimestamp) ? 0 : fallbackTimestamp;
};

export default function Lessons() {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
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
    const nextMap = new Map<
      KangurLessonComponentId,
      (typeof assignments)[number]
    >();
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

        if (LESSON_ASSIGNMENT_PRIORITY_ORDER[assignment.priority] < LESSON_ASSIGNMENT_PRIORITY_ORDER[existing.priority]) {
          nextMap.set(componentId, assignment);
        }
      });

    return nextMap;
  }, [assignments]);
  const completedLessonAssignmentsByComponent = useMemo(() => {
    const nextMap = new Map<
      KangurLessonComponentId,
      (typeof assignments)[number]
    >();

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
    const focusToken = currentUrl.searchParams.get('focus')?.trim().toLowerCase();
    if (!focusToken) {
      return;
    }

    const focusedLessonId = resolveFocusedLessonId(focusToken, lessons);
    if (!focusedLessonId) {
      return;
    }

    setActiveLessonId(focusedLessonId);
    currentUrl.searchParams.delete('focus');
    const nextHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, '', nextHref);
  }, [activeLessonId, lessons]);

  const activeIdx = orderedLessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? orderedLessons[activeIdx] : null;
  const prev = activeIdx > 0 ? orderedLessons[activeIdx - 1] : null;
  const next =
    activeIdx >= 0 && activeIdx < orderedLessons.length - 1 ? orderedLessons[activeIdx + 1] : null;
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
  const activeLessonContentRef = useRef<HTMLDivElement | null>(null);
  const handleGoBack = (): void => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(createPageUrl('Game', basePath));
  };

  return (
    <KangurPageShell tone='learn'>
      <KangurPageTopBar
        left={
          <KangurButton asChild size='sm' variant='ghost'>
            <Link href={createPageUrl('Game', basePath)}>Strona glowna</Link>
          </KangurButton>
        }
        right={
          <>
            <KangurProfileMenu
              basePath={basePath}
              isAuthenticated={Boolean(user)}
              onLogout={() => logout(false)}
              onLogin={navigateToLogin}
            />
            {user?.canManageLearners && (
              <KangurButton asChild size='sm' variant='ghost'>
                <Link href={createPageUrl('ParentDashboard', basePath)}>
                  <LayoutDashboard className='w-4 h-4' /> Rodzic
                </Link>
              </KangurButton>
            )}
          </>
        }
      />

      <KangurPageContainer className='flex flex-col items-center'>
        <AnimatePresence mode='wait'>
          {!activeLesson ? (
            <motion.div
              key='list'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='flex flex-col items-center gap-4 w-full max-w-md'
            >
              <div className='text-center mb-2'>
                <h1 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 drop-shadow'>
                  📚 Lekcje
                </h1>
                <KangurButton className='mt-4' onClick={handleGoBack} size='md' variant='secondary'>
                  Wróć do poprzedniej strony
                </KangurButton>
              </div>

              {orderedLessons.length === 0 ? (
                <KangurPanel className='w-full text-center' padding='xl' variant='soft'>
                  <div className='text-lg font-semibold text-indigo-700'>Brak aktywnych lekcji</div>
                  <div className='mt-1 text-sm text-indigo-500'>
                    Włącz lekcje w panelu admina, aby pojawiły się tutaj.
                  </div>
                </KangurPanel>
              ) : (
                orderedLessons.map((lesson, index) => {
                  const masteryPresentation = getLessonMasteryPresentation(lesson, progress);
                  const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
                  const completedLessonAssignment =
                    !lessonAssignment
                      ? completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null
                      : null;

                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={cn(
                        KANGUR_OPTION_CARD_CLASSNAME,
                        'w-full rounded-[30px] p-5 text-left',
                        'border-slate-200/85 hover:border-indigo-200 hover:bg-indigo-50/30'
                      )}
                    >
                      <span
                        className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br ${lesson.color} text-5xl shadow-sm`}
                      >
                        {lesson.emoji}
                      </span>
                      <div className='flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <div className='text-xl font-extrabold text-slate-800'>{lesson.title}</div>
                            <div className='mt-0.5 text-sm text-slate-500'>{lesson.description}</div>
                            {lesson.contentMode === 'document' &&
                            hasKangurLessonDocumentContent(lessonDocuments[lesson.id]) ? (
                                <div className='mt-2 inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700'>
                                Wlasna zawartosc
                                </div>
                              ) : null}
                            {lessonAssignment ? (
                              <div className='mt-2 inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700'>
                                Priorytet rodzica
                              </div>
                            ) : completedLessonAssignment ? (
                              <div className='mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700'>
                                Ukonczone dla rodzica
                              </div>
                            ) : null}
                          </div>
                          <div className='flex flex-col items-end gap-2'>
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${masteryPresentation.badgeClassName}`}
                            >
                              {masteryPresentation.statusLabel}
                            </span>
                            {lessonAssignment ? (
                              <span className='inline-flex whitespace-nowrap rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700'>
                                {lessonAssignment.priority === 'high'
                                  ? 'Priorytet wysoki'
                                  : lessonAssignment.priority === 'medium'
                                    ? 'Priorytet sredni'
                                    : 'Priorytet niski'}
                              </span>
                            ) : completedLessonAssignment ? (
                              <span className='inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700'>
                                Zadanie zamkniete
                              </span>
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
                            Zadanie od rodzica zostalo juz wykonane. {completedLessonAssignment.progress.summary}
                          </div>
                        ) : null}
                      </div>
                    </motion.button>
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
                <div className='w-full max-w-2xl rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-sm'>
                  <div className='font-bold uppercase tracking-[0.14em] text-[11px]'>Priorytet rodzica</div>
                  <div className='mt-1 font-semibold'>{activeLessonAssignment.title}</div>
                  <div className='mt-1 text-rose-600'>{activeLessonAssignment.description}</div>
                </div>
              ) : completedActiveLessonAssignment ? (
                <div className='w-full max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 shadow-sm'>
                  <div className='font-bold uppercase tracking-[0.14em] text-[11px]'>
                    Ukonczone zadanie od rodzica
                  </div>
                  <div className='mt-1 font-semibold'>{completedActiveLessonAssignment.title}</div>
                  <div className='mt-1 text-emerald-600'>
                    To zadanie zostalo juz wykonane. {completedActiveLessonAssignment.progress.summary}
                  </div>
                </div>
              ) : null}
              <KangurLessonNarrator
                lesson={activeLesson}
                lessonDocument={activeLessonDocument}
                lessonContentRef={activeLessonContentRef}
              />
              <div ref={activeLessonContentRef} className='w-full flex flex-col items-center gap-4'>
                {shouldRenderLessonDocument && activeLessonDocument ? (
                  <div className='w-full max-w-5xl space-y-4'>
                    <div className='rounded-[30px] border border-indigo-200/80 bg-white/92 p-5 shadow-lg'>
                      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                        <div>
                          <div className='inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700'>
                            Lesson document
                          </div>
                          <h1 className='mt-3 text-3xl font-extrabold text-slate-900'>
                            {activeLesson.title}
                          </h1>
                          <p className='mt-2 max-w-3xl text-sm text-slate-600'>
                            {activeLesson.description}
                          </p>
                        </div>
                        <button
                          type='button'
                          onClick={(): void => setActiveLessonId(null)}
                          className='inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100'
                        >
                          Wroc do listy lekcji
                        </button>
                      </div>
                    </div>
                    <KangurLessonDocumentRenderer document={activeLessonDocument} />
                  </div>
                ) : activeLesson?.contentMode === 'document' && !hasActiveLessonDocumentContent ? (
                  <div className='w-full max-w-3xl rounded-[30px] border border-amber-200 bg-white/92 p-6 text-center shadow-lg'>
                    <div className='inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700'>
                      Lesson document
                    </div>
                    <h1 className='mt-4 text-3xl font-extrabold text-slate-900'>{activeLesson.title}</h1>
                    <p className='mt-3 text-sm text-slate-600'>
                      This lesson is set to use custom document content, but no document blocks have been saved yet.
                    </p>
                    <button
                      type='button'
                      onClick={(): void => setActiveLessonId(null)}
                      className='mt-5 inline-flex items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100'
                    >
                      Wroc do listy lekcji
                    </button>
                  </div>
                ) : ActiveLessonComponent ? (
                  <ActiveLessonComponent onBack={() => setActiveLessonId(null)} />
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
                      variant='secondary'
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
                      variant='secondary'
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
  );
}
