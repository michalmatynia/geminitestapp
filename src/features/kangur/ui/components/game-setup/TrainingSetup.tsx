'use client';

import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useId } from 'react';

import KangurRecommendationCard from '@/features/kangur/ui/components/summary-cards/KangurRecommendationCard';
import {
  KangurButton,
  KangurGlassPanel,
  KangurSectionHeading,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurTrainingSetupState } from '@/features/kangur/ui/hooks/useKangurTrainingSetupState';
import type { KangurTrainingSelection } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import DifficultySelector from './DifficultySelector';

type TrainingSetupProps = {
  onStart: (selection: KangurTrainingSelection) => void;
  suggestedSelection?: KangurTrainingSelection | null;
  suggestionDescription?: string;
  suggestionLabel?: string;
  suggestionTitle?: string;
};

type TrainingSetupFallbackCopy = {
  categoryHeading: string;
  countAriaLabel: (value: number) => string;
  countHeading: string;
  description: string;
  recommendationLabel: string;
  startLabel: string;
  title: string;
};

const getTrainingSetupFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): TrainingSetupFallbackCopy => {
  if (locale === 'uk') {
    return {
      categoryHeading: 'Категорії запитань',
      countAriaLabel: (value) => `${value} запитань`,
      countHeading: 'Кількість запитань',
      description: 'Оберіть рівень, категорії та кількість запитань для однієї сесії.',
      recommendationLabel: 'Рекомендуємо зараз',
      startLabel: 'Старт! 🚀',
      title: 'Налаштуй тренування',
    };
  }

  if (locale === 'de') {
    return {
      categoryHeading: 'Fragenkategorien',
      countAriaLabel: (value) => `${value} Fragen`,
      countHeading: 'Anzahl der Fragen',
      description: 'Wahle Stufe, Kategorien und Fragenzahl fur eine Sitzung aus.',
      recommendationLabel: 'Jetzt empfohlen',
      startLabel: 'Start! 🚀',
      title: 'Stelle dein Training ein',
    };
  }

  if (locale === 'en') {
    return {
      categoryHeading: 'Question categories',
      countAriaLabel: (value) => `${value} questions`,
      countHeading: 'Question count',
      description: 'Choose the level, categories, and number of questions for one session.',
      recommendationLabel: 'Recommended now',
      startLabel: 'Start! 🚀',
      title: 'Build your training',
    };
  }

  return {
    categoryHeading: 'Kategorie pytań',
    countAriaLabel: (value) => `${value} pytań`,
    countHeading: 'Liczba pytań',
    description: 'Dobierz poziom, kategorie i liczbę pytań do jednej sesji.',
    recommendationLabel: 'Polecamy teraz',
    startLabel: 'Start! 🚀',
    title: 'Dobierz trening',
  };
};

export default function TrainingSetup({
  onStart,
  suggestedSelection,
  suggestionDescription,
  suggestionLabel,
  suggestionTitle,
}: TrainingSetupProps): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const isCoarsePointer = useKangurCoarsePointer();
  const recommendationDescription = suggestionDescription;
  const fallbackCopy = getTrainingSetupFallbackCopy(locale);
  const recommendationLabel = suggestionLabel ?? fallbackCopy.recommendationLabel;
  const recommendationTitle = suggestionTitle;

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
      className={cn('flex w-full max-w-3xl flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
    >
      <KangurGlassPanel
        className={cn(
          'w-full flex flex-col shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]',
          KANGUR_PANEL_GAP_CLASSNAME
        )}
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
          description={fallbackCopy.description}
          headingAs='h3'
          headingSize='md'
          icon={<Dumbbell aria-hidden='true' className='h-6 w-6' />}
          iconAccent='indigo'
          iconSize='lg'
          layout='inline'
          title={fallbackCopy.title}
        />

        <div id={summaryId} aria-live='polite' aria-atomic='true' className='sr-only'>
          {summaryLabel}
        </div>

        {suggestionTitle ? (
          <KangurRecommendationCard
            accent='indigo'
            dataTestId='training-setup-suggestion-card'
            description={recommendationDescription}
            descriptionTestId='training-setup-suggestion-description'
            label={recommendationLabel}
            labelTestId='training-setup-suggestion-label'
            title={recommendationTitle}
            titleTestId='training-setup-suggestion-title'
          />
        ) : null}

        <DifficultySelector selected={difficulty} onSelect={setDifficulty} showHeading={false} />

        <section aria-labelledby={categoryHeadingId}>
          <div className={`mb-2 ${KANGUR_TIGHT_ROW_CLASSNAME} items-start sm:items-center sm:justify-between`}>
            <h3 id={categoryHeadingId} className='text-sm font-bold [color:var(--kangur-page-text)]'>
              {fallbackCopy.categoryHeading}
            </h3>
            <KangurButton
              className={
                isCoarsePointer
                  ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
                  : 'w-full sm:w-auto'
              }
              onClick={toggleAllCategories}
              size='sm'
              variant='ghost'
              type='button'
            >
              {toggleAllLabel}
            </KangurButton>
          </div>
          <div
            aria-labelledby={categoryHeadingId}
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} sm:flex-wrap sm:justify-start`}
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
                    isCoarsePointer ? 'touch-manipulation select-none active:scale-[0.97]' : null,
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
            {fallbackCopy.countHeading}
          </h3>
          <div
            aria-labelledby={countHeadingId}
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} sm:w-auto sm:flex-wrap sm:justify-start`}
            data-testid='training-setup-count-group'
            role='group'
          >
            {countOptions.map((option) => (
              <KangurButton
                key={option.id}
                aria-label={fallbackCopy.countAriaLabel(option.value)}
                aria-pressed={option.selected}
                onClick={option.select}
                className={cn(
                  'h-11 px-4 text-sm sm:flex-none',
                  isCoarsePointer ? 'touch-manipulation select-none active:scale-[0.97]' : null
                )}
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
          <KangurButton
            className={
              isCoarsePointer
                ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
                : 'w-full sm:w-auto'
            }
            onClick={startTraining}
            size='lg'
            type='button'
            variant='primary'
          >
            {fallbackCopy.startLabel}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </motion.div>
  );
}
