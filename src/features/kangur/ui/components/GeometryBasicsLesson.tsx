import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { XP_REWARDS, addXp, loadProgress } from '@/features/kangur/ui/services/progress';

type GeometryBasicsLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Punkt i odcinek',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          <strong>Punkt</strong> to jedno miejsce na kartce. <strong>Odcinek</strong> łączy dwa punkty.
        </p>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-4'>
          <div className='mx-auto flex max-w-xs items-center justify-between'>
            <span className='text-xl'>● A</span>
            <span className='h-1 flex-1 rounded bg-cyan-500 mx-2' />
            <span className='text-xl'>B ●</span>
          </div>
          <p className='mt-2 text-sm text-cyan-700'>Odcinek AB</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Bok i wierzchołek',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          W figurach wielokątnych mamy <strong>boki</strong> i <strong>wierzchołki</strong> (rogi).
        </p>
        <div className='rounded-2xl border border-cyan-200 bg-white p-4'>
          <div className='mx-auto h-28 w-28 rotate-45 rounded-sm border-[6px] border-cyan-500' />
          <p className='mt-2 text-sm text-gray-600'>Kwadrat ma 4 boki i 4 wierzchołki.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Co to jest kąt?',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='text-gray-700'>
          <strong>Kąt</strong> powstaje tam, gdzie spotykają się dwa odcinki.
        </p>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-4'>
          <div className='relative mx-auto h-28 w-28'>
            <div className='absolute left-1/2 top-1/2 h-1 w-20 -translate-y-1/2 rounded bg-cyan-600' />
            <div className='absolute left-1/2 top-1/2 h-20 w-1 -translate-x-1/2 rounded bg-cyan-600' />
            <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-700'>∟</div>
          </div>
          <p className='mt-2 text-sm text-cyan-700'>To kąt prosty (90°).</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Mini podsumowanie',
    content: (
      <div className='flex flex-col gap-3'>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-left text-sm text-gray-700'>
          ✅ Punkt: pojedyncze miejsce
        </div>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-left text-sm text-gray-700'>
          ✅ Odcinek: łączy dwa punkty
        </div>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-left text-sm text-gray-700'>
          ✅ Bok i wierzchołek: części figury
        </div>
        <div className='rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-left text-sm text-gray-700'>
          ✅ Kąt: miejsce spotkania dwóch odcinków
        </div>
      </div>
    ),
  },
];

export default function GeometryBasicsLesson({ onBack }: GeometryBasicsLessonProps): React.JSX.Element {
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
              index === slide ? 'bg-cyan-500 scale-125' : index < slide ? 'bg-cyan-300' : 'bg-gray-200'
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
          className='flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 py-2 font-extrabold text-white shadow transition hover:opacity-90'
        >
          {isLast ? 'Zakończ lekcję' : 'Następny'}
          <ChevronRight className='h-4 w-4' />
        </motion.button>
      </div>
    </div>
  );
}
