'use client';

import { useMemo } from 'react';

import KangurGameSetupMomentumCard from '@/features/kangur/ui/components/KangurGameSetupMomentumCard';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurTreningWordmark } from '@/features/kangur/ui/components/KangurTreningWordmark';
import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { getRecommendedTrainingSetup } from '@/features/kangur/ui/services/game-setup-recommendations';
import type { KangurTrainingSelection } from '@/features/kangur/ui/types';

const hasMatchingTrainingSelection = (
  selection: KangurTrainingSelection,
  suggestedSelection: KangurTrainingSelection | null
): boolean => {
  if (!suggestedSelection) {
    return false;
  }

  const selectedCategories = [...selection.categories].sort();
  const suggestedCategories = [...suggestedSelection.categories].sort();
  return (
    selection.count === suggestedSelection.count &&
    selection.difficulty === suggestedSelection.difficulty &&
    selectedCategories.length === suggestedCategories.length &&
    selectedCategories.every((category, index) => category === suggestedCategories[index])
  );
};

export function KangurGameTrainingSetupWidget(): React.JSX.Element | null {
  const { activePracticeAssignment, basePath, handleHome, handleStartTraining, progress, screen } =
    useKangurGameRuntime();
  const suggestedTraining = useMemo(() => getRecommendedTrainingSetup(progress), [progress]);

  if (screen !== 'training') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        className='max-w-md'
        description='Dobierz poziom, kategorie i liczbe pytan do jednej sesji.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-training-top-section'
        title='Trening'
        visualTitle={
          <KangurTreningWordmark className='mx-auto' data-testid='kangur-training-heading-art' />
        }
      />
      {activePracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='active'
          />
        </div>
      ) : null}
      <KangurGameSetupMomentumCard mode='training' progress={progress} />
      <TrainingSetup
        onStart={(selection) =>
          handleStartTraining(selection, {
            recommendation: hasMatchingTrainingSelection(selection, suggestedTraining.selection)
              ? {
                description: suggestedTraining.description,
                label: suggestedTraining.label,
                source: 'training_setup',
                title: suggestedTraining.title,
              }
              : null,
          })
        }
        suggestedSelection={suggestedTraining.selection}
        suggestionDescription={suggestedTraining.description}
        suggestionLabel={suggestedTraining.label}
        suggestionTitle={suggestedTraining.title}
      />
    </div>
  );
}
