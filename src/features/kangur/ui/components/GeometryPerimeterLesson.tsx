import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  XP_REWARDS,
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type GeometryPerimeterLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to jest obwód?',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          <strong>Obwód</strong> to długość całej krawędzi figury. Dodajemy wszystkie boki.
        </p>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-4'>
          <div className='mx-auto h-20 w-32 rounded border-4 border-amber-500' />
          <p className='mt-2 text-sm text-amber-700'>Idziemy dookoła figury i sumujemy.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Przykład: kwadrat',
    content: (
      <div className='space-y-3'>
        <div className='rounded-2xl border border-amber-200 bg-white p-4 text-center'>
          <p className='text-gray-700'>Każdy bok ma 3 cm</p>
          <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 3 + 3 + 3 + 3 = 12 cm</p>
        </div>
        <p className='text-center text-sm text-gray-500'>Dla kwadratu: 4 × bok</p>
      </div>
    ),
  },
  {
    title: 'Przykład: prostokąt',
    content: (
      <div className='space-y-3'>
        <div className='rounded-2xl border border-amber-200 bg-white p-4 text-center'>
          <p className='text-gray-700'>Boki: 6 cm, 4 cm, 6 cm, 4 cm</p>
          <p className='mt-2 text-xl font-bold text-amber-700'>Obwód = 6 + 4 + 6 + 4 = 20 cm</p>
        </div>
        <p className='text-center text-sm text-gray-500'>
          Dla prostokąta: 2 × (długość + szerokość)
        </p>
      </div>
    ),
  },
  {
    title: 'Podsumowanie',
    content: (
      <div className='space-y-3'>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700'>
          ✅ Obwód to suma wszystkich boków.
        </div>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700'>
          ✅ Jednostka obwodu to np. cm lub m.
        </div>
        <div className='rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-gray-700'>
          ✅ Zawsze sprawdź, czy dodałeś każdy bok tylko raz.
        </div>
      </div>
    ),
  },
];

export default function GeometryPerimeterLesson({
  onBack,
}: GeometryPerimeterLessonProps): React.JSX.Element {
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
        lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_perimeter', 100),
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
                ? 'bg-amber-500 scale-125'
                : index < slide
                  ? 'bg-amber-300'
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
          className='flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-2 font-extrabold text-white shadow transition hover:opacity-90'
        >
          {isLast ? 'Zakończ lekcję' : 'Następny'}
          <ChevronRight className='h-4 w-4' />
        </motion.button>
      </div>
    </div>
  );
}
