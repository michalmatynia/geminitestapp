import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import DifficultySelector from './DifficultySelector';

const ALL_CATEGORIES = [
  { id: 'addition', label: 'Dodawanie', emoji: '➕' },
  { id: 'subtraction', label: 'Odejmowanie', emoji: '➖' },
  { id: 'multiplication', label: 'Mnożenie', emoji: '✖️' },
  { id: 'division', label: 'Dzielenie', emoji: '➗' },
  { id: 'decimals', label: 'Ułamki', emoji: '🔢' },
  { id: 'powers', label: 'Potęgi', emoji: '⚡' },
  { id: 'roots', label: 'Pierwiastki', emoji: '√' },
];

const QUESTION_COUNTS = [5, 10, 15, 20, 30];

export default function TrainingSetup({ onStart, onBack }) {
  const [selected, setSelected] = useState(ALL_CATEGORIES.map((c) => c.id));
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  const allSelected = selected.length === ALL_CATEGORIES.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className='flex flex-col items-center gap-6 w-full max-w-lg'
    >
      <div className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col gap-5'>
        <div className='flex items-center gap-3'>
          <Dumbbell className='text-indigo-500 w-7 h-7' />
          <h2 className='text-2xl font-extrabold text-gray-800'>Tryb treningowy</h2>
        </div>

        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />

        {/* Category selection */}
        <div>
          <div className='flex items-center justify-between mb-2'>
            <span className='font-bold text-gray-700 text-sm'>Kategorie pytań</span>
            <button
              onClick={() =>
                setSelected(allSelected ? [ALL_CATEGORIES[0].id] : ALL_CATEGORIES.map((c) => c.id))
              }
              className='text-xs text-indigo-500 hover:underline font-semibold'
            >
              {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </button>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {ALL_CATEGORIES.map((cat) => {
              const active = selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggle(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question count */}
        <div>
          <span className='font-bold text-gray-700 text-sm block mb-2'>Liczba pytań</span>
          <div className='flex gap-2 flex-wrap'>
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition ${
                  count === n
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
          >
            ← Wróć
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onStart({ categories: selected, count, difficulty })}
            className='flex-2 flex-grow-[2] bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-lg py-3 rounded-2xl shadow-lg transition'
          >
            Start! 🚀
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
