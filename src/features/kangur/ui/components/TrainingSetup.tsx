import { useId } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import type { KangurTrainingSelection } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

export type TrainingSetupProps = {
  onStart: (selection: KangurTrainingSelection) => void;
  onBack: () => void;
};

export default function TrainingSetup({ onStart, onBack }: TrainingSetupProps): React.JSX.Element {
  const {
    categoryOptions,
    countOptions,
    difficulty,
    goBack,
    setDifficulty,
    startTraining,
    summaryLabel,
    toggleAllCategories,
    toggleAllLabel,
  } = useKangurTrainingSetupState({
    onBack,
    onStart,
  });
  const categoryHeadingId = useId();
  const countHeadingId = useId();
  const summaryId = useId();

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

        <div id={summaryId} aria-live='polite' aria-atomic='true' className='sr-only'>
          {summaryLabel}
        </div>

        <DifficultySelector selected={difficulty} onSelect={setDifficulty} />

        <section aria-labelledby={categoryHeadingId}>
          <div className='mb-2 flex items-center justify-between'>
            <h3 id={categoryHeadingId} className='text-sm font-bold text-slate-700'>
              Kategorie pytan
            </h3>
            <KangurButton onClick={toggleAllCategories} size='sm' variant='ghost' type='button'>
              {toggleAllLabel}
            </KangurButton>
          </div>
          <div aria-labelledby={categoryHeadingId} className='grid grid-cols-2 gap-2 sm:grid-cols-3' role='group'>
            {categoryOptions.map((category) => {
              return (
                <KangurButton
                  key={category.id}
                  aria-label={category.label}
                  aria-pressed={category.selected}
                  onClick={category.select}
                  className={cn('justify-start rounded-xl', category.selected ? 'shadow-sm' : '')}
                  size='md'
                  type='button'
                  variant={category.selected ? 'surface' : 'secondary'}
                >
                  <span>{category.emoji}</span>
                  <span>{category.label}</span>
                </KangurButton>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={countHeadingId}>
          <h3 id={countHeadingId} className='mb-2 block text-sm font-bold text-slate-700'>
            Liczba pytan
          </h3>
          <div aria-labelledby={countHeadingId} className='flex flex-wrap gap-2' role='group'>
            {countOptions.map((option) => (
              <KangurButton
                key={option.id}
                aria-label={`${option.value} pytan`}
                aria-pressed={option.selected}
                onClick={option.select}
                size='md'
                type='button'
                variant={option.selected ? 'surface' : 'secondary'}
              >
                {option.value}
              </KangurButton>
            ))}
          </div>
        </section>

        <div className='flex gap-3'>
          <KangurButton className='flex-1' onClick={goBack} size='lg' type='button' variant='secondary'>
            ← Wroc
          </KangurButton>
          <KangurButton className='flex-grow-[2]' onClick={startTraining} size='lg' type='button' variant='primary'>
            Start! 🚀
          </KangurButton>
        </div>
      </KangurPanel>
    </motion.div>
  );
}
