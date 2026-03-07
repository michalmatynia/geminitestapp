'use client';

import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    handleSelectOperation,
    playerName,
    practiceAssignmentsByOperation,
    screen,
    setScreen,
  } = useKangurGameRuntime();

  if (screen !== 'operation') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center'>
      <p className='mb-4 text-lg text-gray-500'>
        Cześć, <span className='font-bold text-indigo-500'>{playerName}</span>! 👋
      </p>
      {activePracticeAssignment ? (
        <div className='mb-4 flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='queue'
          />
        </div>
      ) : null}
      <OperationSelector
        onSelect={handleSelectOperation}
        priorityAssignmentsByOperation={practiceAssignmentsByOperation}
      />
      <KangurButton
        className='mt-4 w-full max-w-sm'
        onClick={() => setScreen('calendar_quiz')}
        size='lg'
        variant='surface'
        data-doc-id='home_quick_practice_action'
      >
        📅 Ćwiczenia z Kalendarzem
      </KangurButton>
      <KangurButton
        className='mt-3 w-full max-w-sm'
        onClick={() => setScreen('geometry_quiz')}
        size='lg'
        variant='secondary'
        data-doc-id='home_quick_practice_action'
      >
        🔷 Ćwiczenia z Figurami
      </KangurButton>
    </div>
  );
}
