import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, UserRound } from 'lucide-react';
import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  KANGUR_LESSONS_SETTING_KEY,
  parseKangurLessons,
} from '@/features/kangur/settings';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
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
const SubtractingLesson = dynamic(() => import('@/features/kangur/ui/components/SubtractingLesson'), {
  ssr: false,
  loading: LessonLoadingFallback,
});
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
};

const resolveFocusedLessonId = (
  focusToken: string,
  lessons: KangurLesson[]
): string | null => {
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

export default function Lessons() {
  const { basePath } = useKangurRouting();
  const settingsStore = useSettingsStore();
  const progress = useKangurProgressState();

  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo(
    (): KangurLesson[] => parseKangurLessons(rawLessons).filter((lesson) => lesson.enabled),
    [rawLessons]
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

  const activeIdx = lessons.findIndex((lesson) => lesson.id === activeLessonId);
  const activeLesson = activeIdx >= 0 ? lessons[activeIdx] : null;
  const prev = activeIdx > 0 ? lessons[activeIdx - 1] : null;
  const next = activeIdx >= 0 && activeIdx < lessons.length - 1 ? lessons[activeIdx + 1] : null;
  const ActiveLessonComponent = activeLesson ? LESSON_COMPONENTS[activeLesson.componentId] : null;

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center'>
      {/* Top nav bar */}
      <div className='w-full bg-white/70 backdrop-blur border-b border-indigo-100 px-4 py-2 flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <Link
            href={createPageUrl('Game', basePath)}
            className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
          >
            <ArrowLeft className='w-4 h-4' /> Strona główna
          </Link>
          <div className='flex items-center gap-3'>
            <Link
              href={createPageUrl('LearnerProfile', basePath)}
              className='inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-semibold transition'
            >
              <UserRound className='w-4 h-4' /> Profil
            </Link>
            <Link
              href={createPageUrl('ParentDashboard', basePath)}
              className='inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-semibold transition'
            >
              <LayoutDashboard className='w-4 h-4' /> Rodzic
            </Link>
          </div>
        </div>
        {/* Lesson tabs - scrollable row */}
        <div
          className='flex items-center gap-1 overflow-x-auto pb-1'
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => setActiveLessonId(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeLessonId === null
                ? 'bg-indigo-500 text-white shadow'
                : 'text-gray-500 hover:bg-indigo-50'
            }`}
          >
            Wszystkie
          </button>
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setActiveLessonId(lesson.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeLessonId === lesson.id
                  ? `${lesson.activeBg} text-white shadow`
                  : 'text-gray-500 hover:bg-indigo-50'
              }`}
            >
              <span>{lesson.emoji}</span>
              <span>{lesson.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className='flex flex-col items-center py-8 px-4 w-full'>
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
                <p className='text-gray-500 mt-1'>Ucz się krok po kroku!</p>
              </div>

              {lessons.length === 0 ? (
                <div className='w-full rounded-3xl border border-indigo-200/70 bg-white/80 p-6 text-center shadow-lg'>
                  <div className='text-lg font-semibold text-indigo-700'>Brak aktywnych lekcji</div>
                  <div className='mt-1 text-sm text-indigo-500'>
                    Włącz lekcje w panelu admina, aby pojawiły się tutaj.
                  </div>
                </div>
              ) : (
                lessons.map((lesson, index) => {
                  const masteryPresentation = getLessonMasteryPresentation(lesson, progress);

                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={`w-full bg-gradient-to-r ${lesson.color} text-white rounded-3xl p-5 flex items-center gap-4 shadow-lg text-left`}
                    >
                      <span className='text-5xl'>{lesson.emoji}</span>
                      <div className='flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <div className='font-extrabold text-xl'>{lesson.title}</div>
                            <div className='text-white/80 text-sm mt-0.5'>{lesson.description}</div>
                          </div>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${masteryPresentation.badgeClassName}`}
                          >
                            {masteryPresentation.statusLabel}
                          </span>
                        </div>
                        <div className='mt-3 text-xs font-medium text-white/80'>
                          {masteryPresentation.summaryLabel}
                        </div>
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
              {ActiveLessonComponent ? (
                <ActiveLessonComponent onBack={() => setActiveLessonId(null)} />
              ) : null}

              {/* Prev / Next lesson navigation */}
              {(prev || next) && (
                <div className='flex gap-3 w-full max-w-lg mt-2'>
                  {prev ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveLessonId(prev.id)}
                      className='flex-1 flex items-center gap-2 bg-white/80 backdrop-blur border border-gray-200 rounded-2xl px-4 py-3 text-gray-600 font-semibold text-sm shadow hover:bg-white transition'
                    >
                      <ChevronLeft className='w-4 h-4 flex-shrink-0' />
                      <span>
                        {prev.emoji} {prev.title}
                      </span>
                    </motion.button>
                  ) : (
                    <div className='flex-1' />
                  )}
                  {next ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveLessonId(next.id)}
                      className='flex-1 flex items-center justify-end gap-2 bg-white/80 backdrop-blur border border-gray-200 rounded-2xl px-4 py-3 text-gray-600 font-semibold text-sm shadow hover:bg-white transition'
                    >
                      <span>
                        {next.emoji} {next.title}
                      </span>
                      <ChevronRight className='w-4 h-4 flex-shrink-0' />
                    </motion.button>
                  ) : (
                    <div className='flex-1' />
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
