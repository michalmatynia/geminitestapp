import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';

type SubtractingLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to znaczy odejmować? ➖',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Odejmowanie to zabieranie części z grupy. Pytamy: ile zostało?
        </p>
        <div className='flex items-center gap-4 text-5xl'>
          <span>🍎🍎🍎🍎🍎</span>
          <span className='text-2xl font-bold text-gray-400'>−</span>
          <span>🍎🍎</span>
          <span className='text-2xl font-bold text-gray-400'>=</span>
          <span>🍎🍎🍎</span>
        </div>
        <p className='text-red-500 font-bold text-xl'>5 − 2 = 3</p>
      </div>
    ),
  },
  {
    title: 'Odejmowanie jednocyfrowe 🔢',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Cofaj się na osi liczbowej lub licz, ile brakuje do wyniku.
        </p>
        <div className='bg-red-50 border border-red-200 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-red-500'>9 − 4 = ?</p>
          <p className='text-gray-500 mt-2'>
            Zacznij od <b>9</b>, cofnij się 4: 8, 7, 6, <b>5</b> ✓
          </p>
        </div>
        <div className='flex gap-1 flex-wrap justify-center'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className='w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm'
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Odejmowanie z przekroczeniem 10 🔟',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Rozdziel odjemnik na dwie części: najpierw zejdź do 10, potem odejmij resztę.
        </p>
        <div className='bg-pink-50 border border-pink-200 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-pink-500'>13 − 5 = ?</p>
          <p className='text-gray-500 mt-2'>
            13 − <b>3</b> = 10, 10 − <b>2</b> = <b>8</b> ✓
          </p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-600 w-full max-w-xs'>
          <p>🔹 Rozłóż 5 = 3 + 2</p>
          <p>🔹 Odejmij 3: 13 − 3 = 10</p>
          <p>
            🔹 Odejmij 2: 10 − 2 = <b>8</b>
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Odejmowanie dwucyfrowe 💡',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>Odejmuj osobno dziesiątki i jedności!</p>
        <div className='bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center w-full max-w-xs'>
          <p className='text-3xl font-extrabold text-orange-500'>47 − 23 = ?</p>
          <div className='mt-2 text-gray-600 text-left'>
            <p>
              🔹 Dziesiątki: <b>40 − 20 = 20</b>
            </p>
            <p>
              🔹 Jedności: <b>7 − 3 = 4</b>
            </p>
            <p className='mt-1 text-orange-700 font-bold'>
              20 + 4 = <span className='text-2xl'>24</span> ✓
            </p>
          </div>
        </div>
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
              ✅ Odejmowanie NIE jest przemienne: <b>7−3 ≠ 3−7</b>
            </li>
            <li>
              ✅ Odejmowanie 0 nic nie zmienia: <b>8−0 = 8</b>
            </li>
            <li>✅ Cofaj się na osi lub rozkładaj na składniki</li>
            <li>
              ✅ Sprawdź wynik dodawaniem: <b>5+3=8 → 8−3=5</b>
            </li>
          </ul>
        </div>
        <p className='text-red-500 font-bold text-center'>Czas na grę! 🎮</p>
      </div>
    ),
  },
];

export default function SubtractingLesson({ onBack }: SubtractingLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const isLast = slide === SLIDES.length - 1;

  if (gameMode) {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-red-500'>🎮 Gra z odejmowaniem!</h2>
        <SubtractingGame onFinish={() => setGameMode(false)} />
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex gap-2'>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-red-400 scale-125' : i < slide ? 'bg-red-200' : 'bg-gray-200'}`}
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            🎮 Zagraj!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Następny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
