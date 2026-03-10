'use client';

import { useRef } from 'react';

import { QuestionCard } from '@/features/kangur/ui/components/game';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { DIFFICULTY_CONFIG } from '@/features/kangur/ui/services/math-questions';
import {
  getNextLockedBadge,
  getRecommendedSessionProjection,
} from '@/features/kangur/ui/services/progress';

export function KangurGameQuestionWidget(): React.JSX.Element | null {
  const {
    activePracticeAssignment,
    activeSessionRecommendation,
    basePath,
    currentQuestion,
    currentQuestionIndex,
    difficulty,
    handleAnswer,
    progress,
    questionTimeLimit,
    score,
    screen,
    totalQuestions,
  } = useKangurGameRuntime();
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const answeredQuestions = Math.max(0, currentQuestionIndex);
  const roundAccuracy =
    answeredQuestions > 0 ? Math.round((score / answeredQuestions) * 100) : null;
  const perfectRunInProgress = answeredQuestions > 0 && score === answeredQuestions;
  const currentQuest = getCurrentKangurDailyQuest(progress);
  const nextBadge = getNextLockedBadge(progress);
  const guidedProjection = activeSessionRecommendation
    ? getRecommendedSessionProjection(progress, 1)
    : null;

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
        className='mb-4 flex w-full max-w-md flex-wrap gap-2 px-2'
        data-testid='kangur-game-question-momentum'
      >
        {roundAccuracy !== null ? (
          <KangurStatusChip
            accent='indigo'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-accuracy'
            size='sm'
          >
            Skutecznosc rundy: {roundAccuracy}%
          </KangurStatusChip>
        ) : null}
        {perfectRunInProgress ? (
          <KangurStatusChip
            accent='emerald'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-perfect-run'
            size='sm'
          >
            Perfekt w toku
          </KangurStatusChip>
        ) : null}
        {activeSessionRecommendation ? (
          <KangurStatusChip
            accent='violet'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-recommendation'
            size='sm'
          >
            Polecony kierunek: {activeSessionRecommendation.title}
          </KangurStatusChip>
        ) : null}
        {activeSessionRecommendation && guidedProjection ? (
          <KangurStatusChip
            accent='sky'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-guided'
            size='sm'
          >
            Po tej rundzie: {guidedProjection.projected.summary}
          </KangurStatusChip>
        ) : null}
        {currentQuest ? (
          <KangurStatusChip
            accent={
              currentQuest.progress.status === 'completed'
                ? 'emerald'
                : currentQuest.progress.status === 'in_progress'
                  ? 'indigo'
                  : 'slate'
            }
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-quest'
            size='sm'
          >
            Misja dnia: {currentQuest.progress.summary}
          </KangurStatusChip>
        ) : null}
        {nextBadge ? (
          <KangurStatusChip
            accent='amber'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-next-badge'
            size='sm'
          >
            Nastepna odznaka: {nextBadge.summary}
          </KangurStatusChip>
        ) : null}
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
