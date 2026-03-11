import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useId } from 'react';

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurSectionHeading,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';
import type { KangurTrainingSelection } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type TrainingSetupProps = {
  onStart: (selection: KangurTrainingSelection) => void;
  suggestedSelection?: KangurTrainingSelection | null;
  suggestionDescription?: string;
  suggestionLabel?: string;
  suggestionTitle?: string;
};

export default function TrainingSetup({
  onStart,
  suggestedSelection,
  suggestionDescription,
  suggestionLabel,
  suggestionTitle,
}: TrainingSetupProps): React.JSX.Element {
  const {
    categoryOptions,
    countOptions,
    difficulty,
    setDifficulty,
    startTraining,
    summaryLabel,
    toggleAllCategories,
    toggleAllLabel,
  } = useKangurTrainingSetupState({
    onStart,
    suggestedSelection,
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
      <KangurGlassPanel
        className='w-full flex flex-col gap-5 shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
        data-testid='training-setup-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurSectionHeading
          accent='indigo'
          align='left'
          className='w-full'
          data-testid='training-setup-heading'
          description='Dobierz poziom, kategorie i liczbe pytan do jednej sesji.'
          headingAs='h3'
          headingSize='md'
          icon={<Dumbbell className='h-6 w-6' />}
          iconAccent='indigo'
          iconSize='lg'
          layout='inline'
          title='Dobierz trening'
        />

        <div id={summaryId} aria-live='polite' aria-atomic='true' className='sr-only'>
          {summaryLabel}
        </div>

        {suggestionTitle ? (
          <KangurInfoCard
            accent='indigo'
            className='w-full rounded-[24px]'
            data-testid='training-setup-suggestion-card'
            padding='md'
            tone='accent'
          >
            <div className='flex flex-col gap-2 text-left'>
              <KangurStatusChip
                accent='indigo'
                className='w-fit text-[11px] uppercase tracking-[0.16em]'
                data-testid='training-setup-suggestion-label'
                size='sm'
              >
                {suggestionLabel ?? 'Polecamy teraz'}
              </KangurStatusChip>
              <p
                className='text-sm font-extrabold [color:var(--kangur-page-text)]'
                data-testid='training-setup-suggestion-title'
              >
                {suggestionTitle}
              </p>
              {suggestionDescription ? (
                <p
                  className='text-xs [color:var(--kangur-page-muted-text)]'
                  data-testid='training-setup-suggestion-description'
                >
                  {suggestionDescription}
                </p>
              ) : null}
            </div>
          </KangurInfoCard>
        ) : null}

        <DifficultySelector selected={difficulty} onSelect={setDifficulty} showHeading={false} />

        <section aria-labelledby={categoryHeadingId}>
          <div className='mb-2 flex items-center justify-between'>
            <h3 id={categoryHeadingId} className='text-sm font-bold [color:var(--kangur-page-text)]'>
              Kategorie pytan
            </h3>
            <KangurButton onClick={toggleAllCategories} size='sm' variant='ghost' type='button'>
              {toggleAllLabel}
            </KangurButton>
          </div>
          <div
            aria-labelledby={categoryHeadingId}
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap justify-start`}
            data-testid='training-setup-category-group'
            role='group'
          >
            {categoryOptions.map((category) => {
              return (
                <KangurButton
                  key={category.id}
                  aria-label={category.label}
                  aria-pressed={category.selected}
                  onClick={category.select}
                  className={cn(
                    'h-11 justify-start px-4 text-sm sm:flex-none',
                    category.selected ? 'shadow-sm' : ''
                  )}
                  size='md'
                  type='button'
                  variant={category.selected ? 'segmentActive' : 'segment'}
                >
                  <span>{category.emoji}</span>
                  <span>{category.label}</span>
                </KangurButton>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={countHeadingId}>
          <h3
            id={countHeadingId}
            className='mb-2 block text-sm font-bold [color:var(--kangur-page-text)]'
          >
            Liczba pytan
          </h3>
          <div
            aria-labelledby={countHeadingId}
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} flex-wrap justify-start sm:w-auto`}
            data-testid='training-setup-count-group'
            role='group'
          >
            {countOptions.map((option) => (
              <KangurButton
                key={option.id}
                aria-label={`${option.value} pytan`}
                aria-pressed={option.selected}
                onClick={option.select}
                className='h-11 px-4 text-sm sm:flex-none'
                size='md'
                type='button'
                variant={option.selected ? 'segmentActive' : 'segment'}
              >
                {option.value}
              </KangurButton>
            ))}
          </div>
        </section>

        <div className='flex justify-end'>
          <KangurButton className='w-full sm:w-auto' onClick={startTraining} size='lg' type='button' variant='primary'>
            Start! 🚀
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </motion.div>
  );
}
