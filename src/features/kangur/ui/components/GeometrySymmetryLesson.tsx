import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  XP_REWARDS,
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type GeometrySymmetryLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to jest symetria?',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          Figura jest <strong>symetryczna</strong>, gdy po złożeniu na pół obie strony pasują do siebie.
        </p>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-5xl'>
          🦋
          <p className='mt-2 text-sm text-emerald-700'>Motyl jest prawie symetryczny.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Oś symetrii',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          <strong>Oś symetrii</strong> to linia, po której dzielimy figurę na dwie pasujące części.
        </p>
        <div className='rounded-2xl border border-emerald-200 bg-white p-4'>
          <div className='mx-auto flex h-28 w-40 items-center justify-center gap-4'>
            <div className='h-20 w-16 rounded-l-full bg-emerald-300' />
            <div className='h-24 w-0.5 bg-emerald-600' />
            <div className='h-20 w-16 rounded-r-full bg-emerald-300' />
          </div>
          <p className='mt-2 text-sm text-gray-600'>Pionowa kreska to oś symetrii.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Które figury są symetryczne?',
    content: (
      <div className='grid grid-cols-2 gap-2 text-sm'>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center'>
          ✅ Kwadrat
        </div>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center'>
          ✅ Prostokąt
        </div>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center'>
          ✅ Koło
        </div>
        <div className='rounded-2xl border border-rose-200 bg-rose-50 p-3 text-center'>
          ❌ Dowolny zygzak
        </div>
      </div>
    ),
  },
  {
    title: 'Podsumowanie',
    content: (
      <div className='space-y-3'>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-gray-700'>
          ✅ Symetria oznacza, że dwie strony są takie same.
        </div>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-gray-700'>
          ✅ Oś symetrii to linia dzieląca figurę na dwie pasujące części.
        </div>
        <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-gray-700'>
          ✅ Wiele figur ma więcej niż jedną oś symetrii.
        </div>
      </div>
    ),
  },
];

export default function GeometrySymmetryLesson({ onBack }: GeometrySymmetryLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [rewarded, setRewarded] = useState(false);

  const activeSlide = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const goNext = (): void => {
    if (!isLast) {
      setSlide((current) => current + 1);
      return;
    }

    if (!rewarded) {
      const progress = loadProgress();
      addXp(XP_REWARDS.lesson_completed, {
        lessonsCompleted: progress.lessonsCompleted + 1,
        lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_symmetry', 100),
      });
      setRewarded(true);
    }
    onBack();
  };

  if (!activeSlide) return <div className='text-sm text-gray-500'>Brak slajdu.</div>;

  return (
    <div className='flex w-full max-w-sm flex-col items-center gap-4'>
      <div className='flex gap-2'>
        {SLIDES.map((_, index) => (
          <div
            key={index}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              index === slide
                ? 'bg-emerald-500 scale-125'
                : index < slide
                  ? 'bg-emerald-300'
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className='flex min-h-[250px] w-full flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl'
        >
          <h2 className='text-xl font-extrabold text-gray-800'>{activeSlide.title}</h2>
          <div className='flex-1'>{activeSlide.content}</div>
        </motion.div>
      </AnimatePresence>

      <div className='flex w-full gap-3'>
        <button
          onClick={slide === 0 ? onBack : () => setSlide((current) => current - 1)}
          className='flex items-center gap-1 rounded-2xl border-2 border-gray-200 px-4 py-2 font-bold text-gray-500 transition hover:bg-gray-50'
        >
          <ChevronLeft className='h-4 w-4' />
          {slide === 0 ? 'Wróć' : 'Poprzedni'}
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={goNext}
          className='flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 py-2 font-extrabold text-white shadow transition hover:opacity-90'
        >
          {isLast ? 'Zakończ lekcję' : 'Następny'}
          <ChevronRight className='h-4 w-4' />
        </motion.button>
      </div>
    </div>
  );
}
