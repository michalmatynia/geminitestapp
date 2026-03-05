import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import type { KangurDifficulty, KangurOperation, KangurTrainingSelection } from '@/features/kangur/ui/types';

export type TrainingSetupProps = {
  onStart: (selection: KangurTrainingSelection) => void;
  onBack: () => void;
};

const ALL_CATEGORIES: Array<{ id: KangurOperation; label: string; emoji: string }> = [
  { id: 'addition', label: 'Dodawanie', emoji: '➕' },
  { id: 'subtraction', label: 'Odejmowanie', emoji: '➖' },
  { id: 'multiplication', label: 'Mnozenie', emoji: '✖️' },
  { id: 'division', label: 'Dzielenie', emoji: '➗' },
  { id: 'decimals', label: 'Ulamki', emoji: '🔢' },
  { id: 'powers', label: 'Potegi', emoji: '⚡' },
  { id: 'roots', label: 'Pierwiastki', emoji: '√' },
];

const QUESTION_COUNTS = [5, 10, 15, 20, 30];

export default function TrainingSetup({ onStart, onBack }: TrainingSetupProps): React.JSX.Element {
  const [selected, setSelected] = useState<KangurOperation[]>(
    ALL_CATEGORIES.map((category) => category.id)
  );
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');

  const toggle = (id: KangurOperation): void => {
    setSelected((previous) => {
      if (previous.includes(id)) {
        return previous.length > 1 ? previous.filter((item) => item !== id) : previous;
      }
      return [...previous, id];
    });
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

        <div>
          <div className='flex items-center justify-between mb-2'>
            <span className='font-bold text-gray-700 text-sm'>Kategorie pytan</span>
            <button
              onClick={() =>
                setSelected(
                  allSelected
                    ? [ALL_CATEGORIES[0]?.id ?? 'addition']
                    : ALL_CATEGORIES.map((category) => category.id)
                )
              }
              className='text-xs text-indigo-500 hover:underline font-semibold'
            >
              {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </button>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {ALL_CATEGORIES.map((category) => {
              const isActive = selected.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => toggle(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <span>{category.emoji}</span>
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className='font-bold text-gray-700 text-sm block mb-2'>Liczba pytan</span>
          <div className='flex gap-2 flex-wrap'>
            {QUESTION_COUNTS.map((value) => (
              <button
                key={value}
                onClick={() => setCount(value)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition ${
                  count === value
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
          >
            ← Wroc
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
