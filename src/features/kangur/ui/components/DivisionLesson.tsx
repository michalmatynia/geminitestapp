import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';

type DivisionLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to znaczy dzielić? ÷',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Dzielenie to równy podział na grupy. Pytamy: ile w każdej grupie?
        </p>
        <div className='flex flex-col items-center gap-2'>
          <div className='flex gap-3 text-4xl'>🍪🍪🍪🍪🍪🍪</div>
          <p className='text-gray-500 text-sm'>6 ciastek podzielone na 2 osoby</p>
          <p className='text-blue-600 font-bold text-2xl'>6 ÷ 2 = 3</p>
          <div className='flex gap-4 text-2xl'>
            <span>🧒🍪🍪🍪</span>
            <span>🧒🍪🍪🍪</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Dzielenie to odwrotność mnożenia 🔄',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>Każde mnożenie ma swoje dzielenie!</p>
        <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 w-full max-w-xs'>
          <div className='flex flex-col gap-2 text-center'>
            <p className='text-gray-700'>
              4 × 3 = <b>12</b>
            </p>
            <div className='flex gap-3 justify-center text-blue-600 font-bold'>
              <p>12 ÷ 4 = 3</p>
              <p>12 ÷ 3 = 4</p>
            </div>
          </div>
        </div>
        <p className='text-sm text-gray-500 text-center'>
          Znając tabliczkę mnożenia, znasz też tabliczkę dzielenia!
        </p>
      </div>
    ),
  },
  {
    title: 'Reszta z dzielenia 🔢',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Nie zawsze dzielenie wychodzi równo — wtedy zostaje reszta.
        </p>
        <div className='bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center w-full max-w-xs'>
          <p className='text-3xl font-extrabold text-teal-600'>7 ÷ 2 = ?</p>
          <p className='text-gray-500 mt-2'>2 × 3 = 6 (za mało), 2 × 4 = 8 (za dużo)</p>
          <p className='text-teal-700 font-bold mt-1'>
            7 ÷ 2 = <b>3</b> reszta <b>1</b>
          </p>
        </div>
        <div className='flex gap-3 text-3xl'>🍫🍫🍫🍫🍫🍫🍫</div>
        <p className='text-sm text-gray-500'>7 czekolad → 3 dla każdego, 1 zostaje</p>
      </div>
    ),
  },
  {
    title: 'Zapamiętaj! 🧠',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full max-w-xs'>
          <ul className='text-gray-700 space-y-2 text-sm'>
            <li>
              ✅ Podziel przez 1 = ta sama liczba: <b>9÷1=9</b>
            </li>
            <li>
              ✅ Podziel przez siebie = 1: <b>5÷5=1</b>
            </li>
            <li>
              ✅ 0 podzielone przez cokolwiek = 0: <b>0÷4=0</b>
            </li>
            <li>✅ Reszta jest zawsze mniejsza od dzielnika</li>
            <li>✅ Sprawdź: wynik × dzielnik + reszta = liczba</li>
          </ul>
        </div>
        <p className='text-blue-500 font-bold text-center'>Czas na grę! 🎮</p>
      </div>
    ),
  },
];

export default function DivisionLesson({ onBack }: DivisionLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const isLast = slide === SLIDES.length - 1;

  if (gameMode) {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-blue-600'>🎮 Gra z dzieleniem!</h2>
        <DivisionGame onFinish={() => setGameMode(false)} />
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex gap-2'>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-blue-500 scale-125' : i < slide ? 'bg-blue-200' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col gap-4 min-h-[260px]'
        >
          <h2 className='text-xl font-extrabold text-gray-800'>{SLIDES[slide]?.title}</h2>
          <div className='flex-1'>{SLIDES[slide]?.content}</div>
        </motion.div>
      </AnimatePresence>
      <div className='flex gap-3 w-full'>
        <button
          onClick={slide === 0 ? onBack : () => setSlide(slide - 1)}
          className='flex items-center gap-1 px-4 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
        >
          <ChevronLeft className='w-4 h-4' />
          {slide === 0 ? 'Wróć' : 'Poprzedni'}
        </button>
        {isLast ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setGameMode(true)}
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            🎮 Zagraj!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Następny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
