'use client';

import { useRef } from 'react';
import { DIFFICULTY_CONFIG } from '@kangur/core';
import { useTranslations } from 'next-intl';

import { QuestionCard } from '@/features/kangur/ui/components/game';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getNextLockedBadge,
  getRecommendedSessionProjection,
} from '@/features/kangur/ui/services/progress';
import { translateKangurProgressWithFallback } from '@/features/kangur/ui/services/progress-i18n';

export function KangurGameQuestionWidget(): React.JSX.Element | null {
  const gamePageTranslations = useTranslations('KangurGamePage');
  const operationSelectorTranslations = useTranslations('KangurOperationSelector');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
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
  const { subject, subjectKey } = useKangurSubjectFocus();
  const assignmentBannerRef = useRef<HTMLDivElement | null>(null);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const answeredQuestions = Math.max(0, currentQuestionIndex);
  const roundAccuracy =
    answeredQuestions > 0 ? Math.round((score / answeredQuestions) * 100) : null;
  const perfectRunInProgress = answeredQuestions > 0 && score === answeredQuestions;
  const currentQuest = getCurrentKangurDailyQuest(progress, {
    ownerKey: subjectKey,
    subject,
    translate: runtimeTranslations,
  });
  const progressLocalizer = { translate: runtimeTranslations };
  const nextBadge = getNextLockedBadge(progress, progressLocalizer);
  const guidedProjection = activeSessionRecommendation
    ? getRecommendedSessionProjection(progress, true, progressLocalizer)
    : null;
  const scoreLabel = translateKangurProgressWithFallback(
    gamePageTranslations,
    'questionWidget.scoreLabel',
    'Wynik',
  );
  const difficultyLabel = translateKangurProgressWithFallback(
    operationSelectorTranslations,
    `difficulty.${difficulty}`,
    DIFFICULTY_CONFIG[difficulty]?.label ?? difficulty,
  );

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
          ⭐ {scoreLabel}:{' '}
          <span className='font-bold text-indigo-600'>{score}</span>
        </span>
        <span className='break-words font-semibold [color:var(--kangur-page-muted-text)]'>
          {DIFFICULTY_CONFIG[difficulty]?.emoji} {difficultyLabel}
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
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.roundAccuracy',
              'Skuteczność rundy: {percent}%',
              { percent: roundAccuracy },
            )}
          </KangurStatusChip>
        ) : null}
        {perfectRunInProgress ? (
          <KangurStatusChip
            accent='emerald'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-perfect-run'
            size='sm'
          >
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.perfectRun',
              'Perfekt w toku',
            )}
          </KangurStatusChip>
        ) : null}
        {activeSessionRecommendation ? (
          <KangurStatusChip
            accent='violet'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-recommendation'
            size='sm'
          >
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.recommendation',
              'Polecony kierunek: {title}',
              { title: activeSessionRecommendation.title },
            )}
          </KangurStatusChip>
        ) : null}
        {activeSessionRecommendation && guidedProjection ? (
          <KangurStatusChip
            accent='sky'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-guided'
            size='sm'
          >
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.guidedProjection',
              'Po tej rundzie: {summary}',
              { summary: guidedProjection.projected.summary },
            )}
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
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.dailyQuest',
              'Misja dnia: {summary}',
              { summary: currentQuest.progress.summary },
            )}
          </KangurStatusChip>
        ) : null}
        {nextBadge ? (
          <KangurStatusChip
            accent='amber'
            className='text-[11px] uppercase tracking-[0.14em]'
            data-testid='kangur-game-question-next-badge'
            size='sm'
          >
            {translateKangurProgressWithFallback(
              gamePageTranslations,
              'questionWidget.nextBadge',
              'Następna odznaka: {summary}',
              { summary: nextBadge.summary },
            )}
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
