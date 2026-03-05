import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import MultiplicationGame from './MultiplicationGame';

const TABLE_ROWS = [2, 3, 4, 5];

const SLIDES = [
  {
    title: 'Co to znaczy mnożyć? ✖️',
    content: (
      <div className='flex flex-col items-center gap-4'>
        <p className='text-gray-700 text-center'>
          Mnożenie to skrócone dodawanie tej samej liczby kilka razy.
        </p>
        <div className='flex flex-col items-center gap-2'>
          <div className='flex gap-2 text-3xl'>🍬🍬🍬 🍬🍬🍬 🍬🍬🍬</div>
          <p className='text-gray-500 text-sm'>3 grupy po 3 cukierki</p>
          <p className='text-purple-600 font-bold text-2xl'>3 × 3 = 9</p>
          <p className='text-gray-400 text-sm'>(to samo co 3+3+3=9)</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Tabliczka mnożenia × 2 i × 3 📋',
    content: (
      <div className='flex flex-col gap-2 w-full'>
        <div className='grid grid-cols-2 gap-2'>
          {[2, 3].map((base) => (
            <div key={base} className='bg-purple-50 border border-purple-200 rounded-xl p-2'>
              <p className='text-xs font-extrabold text-purple-600 mb-1 text-center'>× {base}</p>
              {[1, 2, 3, 4, 5].map((n) => (
                <p key={n} className='text-xs text-gray-700 text-center'>
                  {n} × {base} = <b>{n * base}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Tabliczka mnożenia × 4 i × 5 📋',
    content: (
      <div className='flex flex-col gap-2 w-full'>
        <div className='grid grid-cols-2 gap-2'>
          {[4, 5].map((base) => (
            <div key={base} className='bg-indigo-50 border border-indigo-200 rounded-xl p-2'>
              <p className='text-xs font-extrabold text-indigo-600 mb-1 text-center'>× {base}</p>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <p key={n} className='text-xs text-gray-700 text-center'>
                  {n} × {base} = <b>{n * base}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Triki do zapamiętania 🧠',
    content: (
      <div className='flex flex-col items-center gap-3'>
        <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 w-full max-w-xs'>
          <ul className='text-gray-700 space-y-2 text-sm'>
            <li>
              ✖️ × 1 = ta sama liczba: <b>7×1=7</b>
            </li>
            <li>
              ✖️ × 2 = podwójnie: <b>6×2=12</b>
            </li>
            <li>
              ✖️ × 5 = kończy się na 0 lub 5: <b>7×5=35</b>
            </li>
            <li>
              ✖️ × 10 = dodaj zero: <b>8×10=80</b>
            </li>
            <li>
              ✅ Kolejność nie ma znaczenia: <b>3×4=4×3</b>
            </li>
          </ul>
        </div>
        <p className='text-purple-500 font-bold text-center'>Czas na grę! 🎮</p>
      </div>
    ),
  },
];

export default function MultiplicationLesson({ onBack }) {
  const [slide, setSlide] = useState(0);
  const [gameMode, setGameMode] = useState(false);
  const isLast = slide === SLIDES.length - 1;

  if (gameMode) {
    return (
      <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
        <h2 className='text-2xl font-extrabold text-purple-600'>🎮 Gra z tabliczką mnożenia!</h2>
        <MultiplicationGame onFinish={() => setGameMode(false)} />
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex gap-2'>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === slide ? 'bg-purple-500 scale-125' : i < slide ? 'bg-purple-200' : 'bg-gray-200'}`}
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
          <h2 className='text-xl font-extrabold text-gray-800'>{SLIDES[slide].title}</h2>
          <div className='flex-1 overflow-y-auto'>{SLIDES[slide].content}</div>
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            🎮 Zagraj!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className='flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold shadow hover:opacity-90 transition'
          >
            Następny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
