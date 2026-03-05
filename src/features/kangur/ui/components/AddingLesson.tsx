import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';

type AddingLessonProps = {
  onBack: () => void;
};

type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

const SLIDES: LessonSlide[] = [
  {
    title: 'Co to znaczy dodawać? ➕',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Dodawanie to łączenie dwóch grup razem, żeby policzyć, ile ich jest łącznie.
        </p>
        <div className='flex items-center gap-4 text-5xl'>
          <span>🍎🍎</span>
          <span className='text-2xl font-bold text-gray-400'>+</span>
          <span>🍎🍎🍎</span>
          <span className='text-2xl font-bold text-gray-400'>=</span>
          <span>🍎🍎🍎🍎🍎</span>
        </div>
        <p className='text-orange-600 font-bold text-xl'>2 + 3 = 5</p>
      </div>
    ),
  },
  {
    title: 'Dodawanie małych liczb (1–9) 🔢',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Możesz liczyć na palcach lub w myślach. Zacznij od większej liczby!
        </p>
        <div className='bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-orange-500'>4 + 3 = ?</p>
          <p className='text-gray-500 mt-2'>
            Zacznij od <b>4</b>, dolicz 3 w górę: 5, 6, <b>7</b> ✓
          </p>
        </div>
        <div className='flex gap-3 text-4xl'>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className='w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm'
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Dodawanie z przekroczeniem 10 🔟',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Gdy suma przekracza 10, możesz uzupełnić do 10 i dodać resztę.
        </p>
        <div className='bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center'>
          <p className='text-3xl font-extrabold text-blue-500'>7 + 5 = ?</p>
          <p className='text-gray-500 mt-2'>
            7 + <b>3</b> = 10, zostaje jeszcze <b>2</b>, więc 10 + 2 = <b>12</b> ✓
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Dodawanie dwucyfrowe 💡',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>Dodawaj osobno dziesiątki i jedności!</p>
        <div className='bg-green-50 border border-green-200 rounded-2xl p-4 text-center w-full max-w-xs'>
          <p className='text-3xl font-extrabold text-green-600'>24 + 13 = ?</p>
          <div className='mt-2 text-gray-600 text-left'>
            <p>
              🔹 Dziesiątki: <b>20 + 10 = 30</b>
            </p>
            <p>
              🔹 Jedności: <b>4 + 3 = 7</b>
            </p>
            <p className='mt-1 text-green-700 font-bold'>
              30 + 7 = <span className='text-2xl'>37</span> ✓
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
              ✅ Kolejność nie ma znaczenia: <b>3+5 = 5+3</b>
            </li>
            <li>
              ✅ Dodawanie 0 nic nie zmienia: <b>7+0 = 7</b>
            </li>
            <li>✅ Zacznij od większej liczby, żeby liczyć szybciej!</li>
            <li>✅ Grupuj do 10 przy przekroczeniu</li>
          </ul>
        </div>
        <p className='text-orange-500 font-bold text-center'>Teraz czas na grę! 🎮</p>
      </div>
    ),
  },
];

export default function AddingLesson({ onBack }: AddingLessonProps): React.JSX.Element {
  const [slide, setSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);

  const isLast = slide === SLIDES.length - 1;
  const activeSlide = SLIDES[slide];

  if (!activeSlide) {
    return <div className='text-sm text-gray-500'>Brak slajdu.</div>;
  }

  if (gameMode) {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-orange-500'>🎮 Gra z piłkami!</h2>
        <AddingBallGame onFinish={() => setGameMode(false)} />
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      {/* Progress dots */}
      <div className='flex gap-2'>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-orange-400 scale-125' : i < slide ? 'bg-orange-200' : 'bg-gray-200'}`}
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
          <h2 className='text-xl font-extrabold text-gray-800'>{activeSlide.title}</h2>
          <div className='flex-1'>{activeSlide.content}</div>
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            🎮 Zagraj!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Następny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
