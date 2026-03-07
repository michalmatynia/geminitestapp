'use client';

import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import ResultScreen from '@/features/kangur/ui/components/ResultScreen';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';

export function KangurGameResultWidget(): React.JSX.Element | null {
  const {
    basePath,
    handleHome,
    handleRestart,
    operation,
    playerName,
    resultPracticeAssignment,
    score,
    screen,
    timeTaken,
    totalQuestions,
  } = useKangurGameRuntime();

  if (screen !== 'result') {
    return null;
  }

  return (
    <div className='flex w-full flex-col items-center gap-6'>
      {resultPracticeAssignment ? (
        <div className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={resultPracticeAssignment}
            basePath={basePath}
            mode={resultPracticeAssignment.progress.status === 'completed' ? 'completed' : 'active'}
          />
        </div>
      ) : null}
      <ResultScreen
        score={score}
        total={totalQuestions}
        playerName={playerName}
        operation={operation}
        timeTaken={timeTaken}
        onRestart={handleRestart}
        onHome={handleHome}
      />
    </div>
  );
}
