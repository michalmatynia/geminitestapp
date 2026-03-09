'use client';

import OperationSelector from '@/features/kangur/ui/components/OperationSelector';
import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameOperationSelectorWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    handleHome,
    handleSelectOperation,
    practiceAssignmentsByOperation,
    screen,
    setScreen,
  } = useKangurGameRuntime();

  if (screen !== 'operation') {
    return null;
  }

  return (
    <div className='w-full flex flex-col items-center gap-4'>
      <KangurPageIntroCard
        className='max-w-md'
        description='Wybierz rodzaj gry i przejdz od razu do matematycznej zabawy.'
        headingSize='lg'
        onBack={handleHome}
        testId='kangur-game-operation-top-section'
        title='Grajmy!'
        visualTitle={<KangurGrajmyWordmark className='mx-auto' data-testid='kangur-grajmy-heading-art' />}
      />
      {activePracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
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
        variant='surface'
        data-doc-id='home_quick_practice_action'
      >
        🔷 Ćwiczenia z Figurami
      </KangurButton>
    </div>
  );
}
