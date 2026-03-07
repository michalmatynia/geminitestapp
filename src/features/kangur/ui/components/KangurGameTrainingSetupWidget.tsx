'use client';

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
    <div className='w-full flex flex-col items-center'>
      {activePracticeAssignment ? (
        <div className='mb-4 flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='active'
          />
        </div>
      ) : null}
      <TrainingSetup onStart={handleStartTraining} onBack={handleHome} />
    </div>
  );
}
