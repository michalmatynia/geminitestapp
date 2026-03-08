'use client';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import TrainingSetup from '@/features/kangur/ui/components/TrainingSetup';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameTrainingSetupWidget(): React.JSX.Element | null {
  const { activePracticeAssignment, basePath, handleHome, handleStartTraining, screen } =
    useKangurGameRuntime();

  if (screen !== 'training') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        accent='sky'
        className='max-w-md'
        description='Dobierz poziom, kategorie i liczbe pytan do jednej sesji.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-training-top-section'
        title='Trening mieszany'
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
      <TrainingSetup onStart={handleStartTraining} />
    </div>
  );
}
