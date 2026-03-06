import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import type {
  KangurDifficulty,
  KangurOperation,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
      className='flex w-full max-w-3xl flex-col items-center gap-6'
    >
      <KangurPanel className='w-full flex flex-col gap-5' padding='xl' variant='elevated'>
        <div className='flex items-center gap-3'>
          <Dumbbell className='text-indigo-500 w-7 h-7' />
          <h2 className='text-2xl font-extrabold text-slate-800'>Tryb treningowy</h2>
        </div>

        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />

        <div>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm font-bold text-slate-700'>Kategorie pytan</span>
            <KangurButton
              onClick={() =>
                setSelected(
                  allSelected
                    ? [ALL_CATEGORIES[0]?.id ?? 'addition']
                    : ALL_CATEGORIES.map((category) => category.id)
                )
              }
              size='sm'
              variant='ghost'
            >
              {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
            </KangurButton>
          </div>
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
            {ALL_CATEGORIES.map((category) => {
              const isActive = selected.includes(category.id);
              return (
                <KangurButton
                  key={category.id}
                  onClick={() => toggle(category.id)}
                  className={cn('justify-start rounded-xl', isActive ? 'shadow-sm' : '')}
                  size='md'
                  variant={isActive ? 'surface' : 'secondary'}
                >
                  <span>{category.emoji}</span>
                  <span>{category.label}</span>
                </KangurButton>
              );
            })}
          </div>
        </div>

        <div>
          <span className='mb-2 block text-sm font-bold text-slate-700'>Liczba pytan</span>
          <div className='flex flex-wrap gap-2'>
            {QUESTION_COUNTS.map((value) => (
              <KangurButton
                key={value}
                onClick={() => setCount(value)}
                size='md'
                variant={count === value ? 'surface' : 'secondary'}
              >
                {value}
              </KangurButton>
            ))}
          </div>
        </div>

        <div className='flex gap-3'>
          <KangurButton className='flex-1' onClick={onBack} size='lg' variant='secondary'>
            ← Wroc
          </KangurButton>
          <KangurButton
            className='flex-grow-[2]'
            onClick={() => onStart({ categories: selected, count, difficulty })}
            size='lg'
            variant='primary'
          >
            Start! 🚀
          </KangurButton>
        </div>
      </KangurPanel>
    </motion.div>
  );
}
