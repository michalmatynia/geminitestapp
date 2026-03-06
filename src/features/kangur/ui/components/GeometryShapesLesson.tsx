import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import {
  XP_REWARDS,
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type GeometryShapesLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SHAPE_CARDS = [
  { emoji: '⚪', name: 'Koło', details: '0 boków i 0 rogów' },
  { emoji: '🔺', name: 'Trójkąt', details: '3 boki i 3 rogi' },
  { emoji: '🟦', name: 'Kwadrat', details: '4 równe boki i 4 rogi' },
  { emoji: '▭', name: 'Prostokąt', details: '4 boki i 4 rogi' },
  { emoji: '⬟', name: 'Pięciokąt', details: '5 boków i 5 rogów' },
  { emoji: '⬢', name: 'Sześciokąt', details: '6 boków i 6 rogów' },
] as const;

const SLIDES: LessonSlide[] = [
  {
    title: 'Poznaj figury',
    content: (
      <div className='grid grid-cols-2 gap-2'>
        {SHAPE_CARDS.slice(0, 4).map((shape) => (
          <div key={shape.name} className='rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-center'>
            <div className='text-3xl'>{shape.emoji}</div>
            <div className='mt-1 text-sm font-bold text-fuchsia-700'>{shape.name}</div>
            <div className='text-xs text-fuchsia-600'>{shape.details}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Ile boków i rogów?',
    content: (
      <div className='space-y-2'>
        {SHAPE_CARDS.map((shape) => (
          <div key={shape.name} className='rounded-2xl border border-fuchsia-200 bg-white px-3 py-2'>
            <div className='flex items-center gap-2'>
              <span className='text-2xl'>{shape.emoji}</span>
              <div>
                <p className='text-sm font-bold text-gray-800'>{shape.name}</p>
                <p className='text-xs text-gray-500'>{shape.details}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Czas na rysowanie!',
    content: (
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='text-6xl'>✍️</div>
        <p className='text-gray-700'>
          Za chwilę uruchomisz grę, w której narysujesz figury i od razu dostaniesz ocenę.
        </p>
        <div className='w-full rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-left text-sm text-fuchsia-700'>
          ✅ Rysuj jedną zamkniętą linią<br />
          ✅ Staraj się robić wyraźne rogi<br />
          ✅ Rysuj większe kształty
        </div>
      </div>
    ),
  },
];

export default function GeometryShapesLesson({ onBack }: GeometryShapesLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  const activeSlide = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const startGame = (): void => {
    if (!rewarded) {
      const progress = loadProgress();
      addXp(XP_REWARDS.lesson_completed, {
        lessonsCompleted: progress.lessonsCompleted + 1,
        lessonMastery: buildLessonMasteryUpdate(progress, 'geometry_shapes', 60),
      });
      setRewarded(true);
    }
    setGameMode(true);
  };

  if (gameMode) {
    return (
      <div className='flex w-full max-w-md flex-col items-center gap-4'>
        <button
          onClick={() => setGameMode(false)}
          className='self-start rounded-xl border border-fuchsia-200 px-3 py-1 text-sm font-semibold text-fuchsia-700 hover:bg-fuchsia-50'
        >
          Wróć do lekcji
        </button>
        <div className='w-full rounded-3xl bg-white p-5 shadow-xl'>
          <h2 className='mb-4 text-center text-xl font-extrabold text-fuchsia-700'>🔷 Trening figur</h2>
          <GeometryDrawingGame onFinish={onBack} />
        </div>
      </div>
    );
  }

  if (!activeSlide) return <div className='text-sm text-gray-500'>Brak slajdu.</div>;

  return (
    <div className='flex w-full max-w-sm flex-col items-center gap-4'>
      <div className='flex gap-2'>
        {SLIDES.map((_, index) => (
          <div
            key={index}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              index === slide ? 'bg-fuchsia-500 scale-125' : index < slide ? 'bg-fuchsia-300' : 'bg-gray-200'
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

        {isLast ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            className='flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-2 font-extrabold text-white shadow transition hover:opacity-90'
          >
            🎮 Start gry
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide((current) => current + 1)}
            className='flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-2 font-extrabold text-white shadow transition hover:opacity-90'
          >
            Następny
            <ChevronRight className='h-4 w-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
