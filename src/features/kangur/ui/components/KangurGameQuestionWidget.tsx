'use client';

import { useRef } from 'react';

import { QuestionCard } from '@/features/kangur/ui/components/game';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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
    operation,
    progress,
    questionTimeLimit,
    score,
    screen,
    totalQuestions,
  } = useKangurGameRuntime();
  const { subject } = useKangurSubjectFocus();
  const assignmentBannerRef = useRef<HTMLDivElement | null>(null);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const answeredQuestions = Math.max(0, currentQuestionIndex);
  const roundAccuracy =
    answeredQuestions > 0 ? Math.round((score / answeredQuestions) * 100) : null;
  const perfectRunInProgress = answeredQuestions > 0 && score === answeredQuestions;
  const currentQuest = getCurrentKangurDailyQuest(progress, { subject });
  const nextBadge = getNextLockedBadge(progress);
  const guidedProjection = activeSessionRecommendation
    ? getRecommendedSessionProjection(progress, true)
    : null;

  const tutorContentId = activePracticeAssignment?.id
    ? `game:assignment:${activePracticeAssignment.id}`
    : operation
      ? `game:practice:${operation}:${difficulty}`
      : 'game';

  useKangurTutorAnchor({
    id: 'kangur-game-assignment-banner',
    kind: 'assignment',
    ref: assignmentBannerRef,
    surface: 'game',
    enabled: screen === 'playing' && Boolean(activePracticeAssignment),
    priority: 110,
    metadata: {
      contentId: tutorContentId,
      label: activePracticeAssignment?.title ?? 'Zadanie treningowe',
      assignmentId: activePracticeAssignment?.id ?? null,
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-game-question-anchor',
    kind: 'question',
    ref: questionAnchorRef,
    surface: 'game',
    enabled: screen === 'playing' && Boolean(currentQuestion),
    priority: 120,
    metadata: {
      contentId: tutorContentId,
      label: currentQuestion?.question ?? null,
      assignmentId: activePracticeAssignment?.id ?? null,
    },
  });

  if (screen !== 'playing' || !currentQuestion) {
    return null;
  }

  return (
    <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {activePracticeAssignment ? (
        <div ref={assignmentBannerRef} className='flex w-full justify-center px-4'>
          <KangurPracticeAssignmentBanner
            assignment={activePracticeAssignment}
            basePath={basePath}
            mode='active'
          />
        </div>
      ) : null}
      <div className='flex w-full max-w-md flex-wrap items-center justify-between gap-2 px-2'>
        <span className='break-words font-semibold [color:var(--kangur-page-muted-text)]'>
          ⭐ Wynik: <span className='font-bold text-indigo-600'>{score}</span>
        </span>
        <span className='break-words font-semibold [color:var(--kangur-page-muted-text)]'>
          {DIFFICULTY_CONFIG[difficulty]?.emoji} {DIFFICULTY_CONFIG[difficulty]?.label}
        </span>
      </div>
      <div
        className='flex w-full max-w-md flex-wrap gap-2 px-2'
        data-testid='kangur-game-question-momentum'
      >
        {roundAccuracy !== null ? (
          <KangurStatusChip
            accent='indigo'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-accuracy'
            size='sm'
          >
            Skuteczność rundy: {roundAccuracy}%
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
            Następna odznaka: {nextBadge.summary}
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
