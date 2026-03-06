import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, UserRound } from 'lucide-react';
import type { ComponentType } from 'react';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  AddingLesson,
  CalendarLesson,
  ClockLesson,
  DivisionLesson,
  GeometryBasicsLesson,
  GeometryPerimeterLesson,
  GeometryShapesLesson,
  GeometrySymmetryLesson,
  MultiplicationLesson,
  SubtractingLesson,
} from '@/features/kangur/ui/components/lessons';
import {
  KANGUR_LESSONS_SETTING_KEY,
  parseKangurLessons,
} from '@/features/kangur/settings';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import type { KangurLesson, KangurLessonComponentId } from '@/shared/contracts/kangur';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import Link from 'next/link';

type LessonProps = {
  onBack: () => void;
};

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

export default function Lessons() {
  const { basePath } = useKangurRouting();
  const settingsStore = useSettingsStore();

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
                lessons.map((lesson, index) => (
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
                    <div>
                      <div className='font-extrabold text-xl'>{lesson.title}</div>
                      <div className='text-white/80 text-sm mt-0.5'>{lesson.description}</div>
                    </div>
                  </motion.button>
                ))
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
