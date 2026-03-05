import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import {
  AddingLesson,
  CalendarLesson,
  ClockLesson,
  DivisionLesson,
  MultiplicationLesson,
  SubtractingLesson,
} from '@/features/kangur/ui/components/lessons';
import Link from 'next/link';

type LessonId = 'clock' | 'calendar' | 'adding' | 'subtracting' | 'multiplication' | 'division';

type LessonCard = {
  id: LessonId;
  title: string;
  description: string;
  emoji: string;
  color: string;
  activeBg: string;
};

const LESSONS: LessonCard[] = [
  {
    id: 'clock',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny z zegara analogowego',
    emoji: '🕐',
    color: 'from-indigo-400 to-purple-500',
    activeBg: 'bg-indigo-500',
  },
  {
    id: 'calendar',
    title: 'Nauka kalendarza',
    description: 'Dni, miesiące, daty i pory roku',
    emoji: '📅',
    color: 'from-green-400 to-teal-500',
    activeBg: 'bg-green-500',
  },
  {
    id: 'adding',
    title: 'Dodawanie',
    description: 'Jednocyfrowe, dwucyfrowe i gra z piłkami!',
    emoji: '➕',
    color: 'from-orange-400 to-yellow-400',
    activeBg: 'bg-orange-400',
  },
  {
    id: 'subtracting',
    title: 'Odejmowanie',
    description: 'Jednocyfrowe, dwucyfrowe i reszta',
    emoji: '➖',
    color: 'from-red-400 to-pink-400',
    activeBg: 'bg-red-400',
  },
  {
    id: 'multiplication',
    title: 'Mnożenie',
    description: 'Tabliczka mnożenia i algorytmy',
    emoji: '✖️',
    color: 'from-purple-500 to-indigo-500',
    activeBg: 'bg-purple-500',
  },
  {
    id: 'division',
    title: 'Dzielenie',
    description: 'Proste dzielenie i reszta z dzielenia',
    emoji: '➗',
    color: 'from-blue-500 to-teal-400',
    activeBg: 'bg-blue-500',
  },
];

export default function Lessons() {
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const activeIdx = LESSONS.findIndex((l) => l.id === activeLesson);

  const prev = activeIdx > 0 ? LESSONS[activeIdx - 1] : null;
  const next = activeIdx < LESSONS.length - 1 ? LESSONS[activeIdx + 1] : null;

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center'>
      {/* Top nav bar */}
      <div className='w-full bg-white/70 backdrop-blur border-b border-indigo-100 px-4 py-2 flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <Link
            href={createPageUrl('Game')}
            className='inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition'
          >
            <ArrowLeft className='w-4 h-4' /> Strona główna
          </Link>
        </div>
        {/* Lesson tabs – scrollable row */}
        <div
          className='flex items-center gap-1 overflow-x-auto pb-1'
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            onClick={() => setActiveLesson(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeLesson === null
                ? 'bg-indigo-500 text-white shadow'
                : 'text-gray-500 hover:bg-indigo-50'
            }`}
          >
            Wszystkie
          </button>
          {LESSONS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLesson(l.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeLesson === l.id
                  ? `${l.activeBg} text-white shadow`
                  : 'text-gray-500 hover:bg-indigo-50'
              }`}
            >
              <span>{l.emoji}</span>
              <span>{l.title}</span>
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
              {LESSONS.map((lesson, i) => (
                <motion.button
                  key={lesson.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveLesson(lesson.id)}
                  className={`w-full bg-gradient-to-r ${lesson.color} text-white rounded-3xl p-5 flex items-center gap-4 shadow-lg text-left`}
                >
                  <span className='text-5xl'>{lesson.emoji}</span>
                  <div>
                    <div className='font-extrabold text-xl'>{lesson.title}</div>
                    <div className='text-white/80 text-sm mt-0.5'>{lesson.description}</div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeLesson}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='w-full flex flex-col items-center gap-4'
            >
              {activeLesson === 'clock' && <ClockLesson onBack={() => setActiveLesson(null)} />}
              {activeLesson === 'calendar' && (
                <CalendarLesson onBack={() => setActiveLesson(null)} />
              )}
              {activeLesson === 'adding' && <AddingLesson onBack={() => setActiveLesson(null)} />}
              {activeLesson === 'subtracting' && (
                <SubtractingLesson onBack={() => setActiveLesson(null)} />
              )}
              {activeLesson === 'multiplication' && (
                <MultiplicationLesson onBack={() => setActiveLesson(null)} />
              )}
              {activeLesson === 'division' && (
                <DivisionLesson onBack={() => setActiveLesson(null)} />
              )}

              {/* Prev / Next lesson navigation */}
              {(prev || next) && (
                <div className='flex gap-3 w-full max-w-lg mt-2'>
                  {prev ? (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveLesson(prev.id)}
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
                      onClick={() => setActiveLesson(next.id)}
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
