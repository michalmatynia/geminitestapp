'use client';

import type { ComponentProps } from 'react';
import { useRef } from 'react';
import { DIFFICULTY_CONFIG } from '@kangur/core';
import { useTranslations } from 'next-intl';

import { QuestionCard } from '@/features/kangur/ui/components/game';
import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/assignments/KangurPracticeAssignmentBanner';
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

type KangurGameQuestionTranslations = ReturnType<typeof useTranslations>;
type KangurGameQuestionRuntime = ReturnType<typeof useKangurGameRuntime>;
type KangurGameQuestionQuest = ReturnType<typeof getCurrentKangurDailyQuest>;
type KangurGameQuestionNextBadge = ReturnType<typeof getNextLockedBadge>;
type KangurGameQuestionGuidedProjection = ReturnType<typeof getRecommendedSessionProjection>;

type KangurGameQuestionMomentumProps = {
  activeSessionRecommendation: KangurGameQuestionRuntime['activeSessionRecommendation'];
  currentQuest: KangurGameQuestionQuest;
  gamePageTranslations: KangurGameQuestionTranslations;
  guidedProjection: KangurGameQuestionGuidedProjection | null;
  nextBadge: KangurGameQuestionNextBadge;
  perfectRunInProgress: boolean;
  roundAccuracy: number | null;
};

const resolveKangurGameQuestionRoundStatus = (
  currentQuestionIndex: number,
  score: number
): { perfectRunInProgress: boolean; roundAccuracy: number | null } => {
  const answeredQuestions = Math.max(0, currentQuestionIndex);
  const roundAccuracy =
    answeredQuestions > 0 ? Math.round((score / answeredQuestions) * 100) : null;

  return {
    perfectRunInProgress: answeredQuestions > 0 && score === answeredQuestions,
    roundAccuracy,
  };
};

const resolveKangurGameQuestionTutorContentId = ({
  activePracticeAssignment,
  difficulty,
  operation,
}: {
  activePracticeAssignment: KangurGameQuestionRuntime['activePracticeAssignment'];
  difficulty: KangurGameQuestionRuntime['difficulty'];
  operation: KangurGameQuestionRuntime['operation'];
}): string => {
  if (activePracticeAssignment?.id) {
    return `game:assignment:${activePracticeAssignment.id}`;
  }

  if (operation) {
    return `game:practice:${operation}:${difficulty}`;
  }

  return 'game';
};

const resolveKangurGameQuestionQuestAccent = (
  currentQuest: KangurGameQuestionQuest
): ComponentProps<typeof KangurStatusChip>['accent'] => {
  if (!currentQuest) {
    return 'slate';
  }

  if (currentQuest.progress.status === 'completed') {
    return 'emerald';
  }

  if (currentQuest.progress.status === 'in_progress') {
    return 'indigo';
  }

  return 'slate';
};

function useKangurGameAssignmentTutorAnchor({
  activePracticeAssignment,
  assignmentBannerRef,
  screen,
  tutorContentId,
}: {
  activePracticeAssignment: KangurGameQuestionRuntime['activePracticeAssignment'];
  assignmentBannerRef: React.RefObject<HTMLDivElement | null>;
  screen: KangurGameQuestionRuntime['screen'];
  tutorContentId: string;
}): void {
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
}

function useKangurGameQuestionTutorAnchor({
  activePracticeAssignment,
  currentQuestion,
  questionAnchorRef,
  screen,
  tutorContentId,
}: {
  activePracticeAssignment: KangurGameQuestionRuntime['activePracticeAssignment'];
  currentQuestion: KangurGameQuestionRuntime['currentQuestion'];
  questionAnchorRef: React.RefObject<HTMLDivElement | null>;
  screen: KangurGameQuestionRuntime['screen'];
  tutorContentId: string;
}): void {
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
}

function KangurGameQuestionAssignmentBanner({
  activePracticeAssignment,
  assignmentBannerRef,
  basePath,
}: {
  activePracticeAssignment: KangurGameQuestionRuntime['activePracticeAssignment'];
  assignmentBannerRef: React.RefObject<HTMLDivElement | null>;
  basePath: string;
}): React.JSX.Element | null {
  if (!activePracticeAssignment) {
    return null;
  }

  return (
    <div ref={assignmentBannerRef} className='flex w-full justify-center px-4'>
      <KangurPracticeAssignmentBanner
        assignment={activePracticeAssignment}
        basePath={basePath}
        mode='active'
      />
    </div>
  );
}

function KangurGameQuestionStatsRow({
  difficulty,
  difficultyLabel,
  score,
  scoreLabel,
}: {
  difficulty: KangurGameQuestionRuntime['difficulty'];
  difficultyLabel: string;
  score: number;
  scoreLabel: string;
}): React.JSX.Element {
  return (
    <div className='flex w-full max-w-md flex-wrap items-center justify-between gap-2 px-2'>
      <span className='break-words font-semibold [color:var(--kangur-page-muted-text)]'>
        ⭐ {scoreLabel}:{' '}
        <span className='font-bold text-indigo-600'>{score}</span>
      </span>
      <span className='break-words font-semibold [color:var(--kangur-page-muted-text)]'>
        {DIFFICULTY_CONFIG[difficulty]?.emoji} {difficultyLabel}
      </span>
    </div>
  );
}

function KangurGameQuestionMomentumChips({
  activeSessionRecommendation,
  currentQuest,
  gamePageTranslations,
  guidedProjection,
  nextBadge,
  perfectRunInProgress,
  roundAccuracy,
}: KangurGameQuestionMomentumProps): React.JSX.Element {
  return (
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
            { percent: roundAccuracy }
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
            'Perfekt w toku'
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
            { title: activeSessionRecommendation.title }
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
            { summary: guidedProjection.projected.summary }
          )}
        </KangurStatusChip>
      ) : null}
      {currentQuest ? (
        <KangurStatusChip
          accent={resolveKangurGameQuestionQuestAccent(currentQuest)}
          className='text-[11px] uppercase tracking-[0.14em]'
          data-testid='kangur-game-question-quest'
          size='sm'
        >
          {translateKangurProgressWithFallback(
            gamePageTranslations,
            'questionWidget.dailyQuest',
            'Misja dnia: {summary}',
            { summary: currentQuest.progress.summary }
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
            { summary: nextBadge.summary }
          )}
        </KangurStatusChip>
      ) : null}
    </div>
  );
}

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
  const { perfectRunInProgress, roundAccuracy } = resolveKangurGameQuestionRoundStatus(
    currentQuestionIndex,
    score
  );
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
    DIFFICULTY_CONFIG[difficulty]?.label ?? difficulty
  );
  const tutorContentId = resolveKangurGameQuestionTutorContentId({
    activePracticeAssignment,
    difficulty,
    operation,
  });

  useKangurGameAssignmentTutorAnchor({
    activePracticeAssignment,
    assignmentBannerRef,
    screen,
    tutorContentId,
  });
  useKangurGameQuestionTutorAnchor({
    activePracticeAssignment,
    currentQuestion,
    questionAnchorRef,
    screen,
    tutorContentId,
  });

  if (screen !== 'playing' || !currentQuestion) {
    return null;
  }

  return (
    <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurGameQuestionAssignmentBanner
        activePracticeAssignment={activePracticeAssignment}
        assignmentBannerRef={assignmentBannerRef}
        basePath={basePath}
      />
      <KangurGameQuestionStatsRow
        difficulty={difficulty}
        difficultyLabel={difficultyLabel}
        score={score}
        scoreLabel={scoreLabel}
      />
      <KangurGameQuestionMomentumChips
        activeSessionRecommendation={activeSessionRecommendation}
        currentQuest={currentQuest}
        gamePageTranslations={gamePageTranslations}
        guidedProjection={guidedProjection}
        nextBadge={nextBadge}
        perfectRunInProgress={perfectRunInProgress}
        roundAccuracy={roundAccuracy}
      />
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
