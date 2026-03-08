'use client';

import { useRef } from 'react';

import { QuestionCard } from '@/features/kangur/ui/components/game';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';

export function KangurGameQuestionWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    basePath,
    currentQuestion,
    currentQuestionIndex,
    difficulty,
    handleAnswer,
    questionTimeLimit,
    score,
    screen,
    totalQuestions,
  } = useKangurGameRuntime();
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);

  useKangurTutorAnchor({
    id: 'kangur-game-question-anchor',
    kind: 'question',
    ref: questionAnchorRef,
    surface: 'game',
    enabled: screen === 'playing' && Boolean(currentQuestion),
    priority: 120,
    metadata: {
      contentId: 'game',
      label: currentQuestion?.question ?? null,
      assignmentId: activePracticeAssignment?.id ?? null,
    },
  });

  if (screen !== 'playing' || !currentQuestion) {
    return null;
  }

  return (
    <div className='flex w-full flex-col items-center'>
      {activePracticeAssignment ? (
        <div className='mb-4 flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='active'
          />
        </div>
      ) : null}
      <div className='mb-4 flex w-full max-w-md items-center justify-between px-2'>
        <span className='font-semibold text-slate-500'>
          ⭐ Wynik: <span className='font-bold text-indigo-600'>{score}</span>
        </span>
        <span className='font-semibold text-slate-500'>
          {DIFFICULTY_CONFIG[difficulty]?.emoji} {DIFFICULTY_CONFIG[difficulty]?.label}
        </span>
      </div>
      <div
        ref={questionAnchorRef}
        className='flex w-full justify-center'
        data-testid='kangur-game-question-anchor'
      >
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswer}
          questionNumber={currentQuestionIndex + 1}
          total={totalQuestions}
          timeLimit={questionTimeLimit}
        />
      </div>
    </div>
  );
}
