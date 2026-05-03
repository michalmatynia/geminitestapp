'use client';

import dynamic from 'next/dynamic';
import { type useTranslations } from 'next-intl';
import { useMemo, type RefObject } from 'react';

import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import {
  getKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurGameScreen } from '@/features/kangur/ui/types';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import {
  useGameSessionScreenRefs,
  type GameSessionScreenRefs,
} from './Game.screen-refs';

const GameDeferredAiTutorSessionSync = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredAiTutorSessionSync'),
  { ssr: false }
);

const GameDeferredLearnerActivityPing = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredLearnerActivityPing'),
  { ssr: false }
);

const GameDeferredTutorAnchors = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredTutorAnchors'),
  { ssr: false }
);

const GameDeferredRoutedScreen = dynamic(
  () => import('@/features/kangur/ui/pages/GameDeferredRoutedScreen'),
  { ssr: false }
);

type GameTranslations = ReturnType<typeof useTranslations>;
type GameAssignmentLike =
  | {
      id?: string | null;
      progress: {
        summary?: string | null;
      };
      title?: string | null;
    }
  | null
  | undefined;
type GameQuestionLike =
  | {
      question?: string | null;
    }
  | null
  | undefined;

const getGameScreenLabel = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.label`);

const getGameScreenDescription = (
  translations: GameTranslations,
  screenKey: KangurGameScreen
): string => translations(`screens.${screenKey}.description`);

const GAME_TUTOR_ACTIVITY_STATIC_CONTENT_IDS: Partial<Record<KangurGameScreen, string>> = {
  operation: 'game:operation-selector',
  training: 'game:training-setup',
};

const resolveGamePracticeContentId = ({
  difficulty,
  operation,
  screen,
}: {
  difficulty?: string | null;
  operation?: string | null;
  screen: KangurGameScreen;
}): string | null =>
  (screen === 'playing' || screen === 'result') && operation
    ? `game:practice:${operation}:${difficulty}`
    : null;

const resolveGameKangurContentId = ({
  kangurMode,
  screen,
}: {
  kangurMode?: string | null;
  screen: KangurGameScreen;
}): string | null =>
  screen === 'kangur' || screen === 'kangur_setup'
    ? `game:kangur:${kangurMode ?? 'setup'}`
    : null;

const resolveGameTutorActivityContentId = ({
  activeGameAssignmentId,
  difficulty,
  kangurMode,
  operation,
  screen,
}: {
  activeGameAssignmentId?: string | null;
  difficulty?: string | null;
  kangurMode?: string | null;
  operation?: string | null;
  screen: KangurGameScreen;
}): string => {
  if (activeGameAssignmentId) {
    return `game:assignment:${activeGameAssignmentId}`;
  }

  const practiceContentId = resolveGamePracticeContentId({
    difficulty,
    operation,
    screen,
  });
  if (practiceContentId) {
    return practiceContentId;
  }

  if (isKangurLaunchableGameScreen(screen)) {
    return getKangurLaunchableGameContentId(screen);
  }

  const kangurContentId = resolveGameKangurContentId({
    kangurMode,
    screen,
  });
  if (kangurContentId) {
    return kangurContentId;
  }

  return GAME_TUTOR_ACTIVITY_STATIC_CONTENT_IDS[screen] ?? `game:${screen}`;
};

const resolveGameQuestionText = (question: GameQuestionLike): string | null =>
  question?.question?.trim() || null;

const resolveGameAssignmentSummary = (assignment: GameAssignmentLike): string | null =>
  assignment
    ? [assignment.title, assignment.progress.summary].filter(Boolean).join(' - ')
    : null;

const resolveGameQuestionProgressLabel = ({
  currentQuestionIndex,
  score,
  screen,
  totalQuestions,
  translations,
}: {
  currentQuestionIndex: number;
  score: number;
  screen: KangurGameScreen;
  totalQuestions: number;
  translations: GameTranslations;
}): string | null => {
  if (screen === 'playing') {
    return translations('questionProgress', {
      current: currentQuestionIndex + 1,
      total: totalQuestions,
    });
  }

  if (screen === 'result') {
    return translations('resultProgress', {
      score,
      total: totalQuestions,
    });
  }

  return null;
};

const resolveGameTutorFocusKind = ({
  assignment,
  screen,
}: {
  assignment: GameAssignmentLike;
  screen: KangurGameScreen;
}): 'assignment' | 'question' | 'review' | undefined => {
  if (screen === 'playing') {
    return 'question';
  }

  if (screen === 'result') {
    return 'review';
  }

  return assignment ? 'assignment' : undefined;
};

const resolveGameTutorFocusLabel = ({
  assignment,
  currentScreenLabel,
  questionText,
  screen,
}: {
  assignment: GameAssignmentLike;
  currentScreenLabel: string;
  questionText: string | null;
  screen: KangurGameScreen;
}): string | undefined => {
  if (screen === 'playing') {
    return questionText ?? undefined;
  }

  return assignment?.title?.trim() || currentScreenLabel;
};

const resolveGameTutorQuestionId = ({
  currentQuestionIndex,
  screen,
}: {
  currentQuestionIndex: number;
  screen: KangurGameScreen;
}): string | undefined =>
  screen === 'playing' ? `game-question-${currentQuestionIndex + 1}` : undefined;

const resolveGameTutorAnswerRevealed = (
  screen: KangurGameScreen
): true | undefined => (screen === 'result' ? true : undefined);

const createGameTutorSessionContext = ({
  activeGameAssignment,
  currentQuestion,
  currentQuestionIndex,
  currentScreenLabel,
  screen,
  score,
  totalQuestions,
  translations,
  tutorActivityContentId,
}: {
  activeGameAssignment: GameAssignmentLike;
  currentQuestion: GameQuestionLike;
  currentQuestionIndex: number;
  currentScreenLabel: string;
  screen: KangurGameScreen;
  score: number;
  totalQuestions: number;
  translations: GameTranslations;
  tutorActivityContentId: string;
}): KangurAiTutorConversationContext => {
  const questionText = resolveGameQuestionText(currentQuestion);

  return {
    surface: 'game',
    contentId: tutorActivityContentId,
    title: currentScreenLabel,
    description: getGameScreenDescription(translations, screen),
    assignmentSummary: resolveGameAssignmentSummary(activeGameAssignment) ?? undefined,
    assignmentId: activeGameAssignment?.id ?? undefined,
    currentQuestion: questionText ?? undefined,
    questionProgressLabel: resolveGameQuestionProgressLabel({
      currentQuestionIndex,
      score,
      screen,
      totalQuestions,
      translations,
    }) ?? undefined,
    questionId: resolveGameTutorQuestionId({
      currentQuestionIndex,
      screen,
    }),
    answerRevealed: resolveGameTutorAnswerRevealed(screen),
    focusKind: resolveGameTutorFocusKind({
      assignment: activeGameAssignment,
      screen,
    }),
    focusLabel: resolveGameTutorFocusLabel({
      assignment: activeGameAssignment,
      currentScreenLabel,
      questionText,
      screen,
    }),
  };
};

const resolveGameLearnerActivityTitle = ({
  activeGameAssignment,
  currentScreenLabel,
  translations,
}: {
  activeGameAssignment: GameAssignmentLike;
  currentScreenLabel: string;
  translations: GameTranslations;
}): string => {
  const assignmentTitle = activeGameAssignment?.title?.trim();
  return translations('activityTitle', { title: assignmentTitle || currentScreenLabel });
};

export default function GameDeferredRoutedContent(props: {
  launchableGameInstanceId?: string | null;
  screen: Exclude<KangurGameScreen, 'home'>;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  translations: GameTranslations;
}): React.JSX.Element {
  const { launchableGameInstanceId, screen, screenHeadingRef, translations } = props;
  const runtime = useKangurGameRuntime();
  const sessionRefs = useGameSessionScreenRefs();
  const currentScreenLabel = getGameScreenLabel(translations, screen);
  const activeGameAssignment = runtime.activePracticeAssignment ?? runtime.resultPracticeAssignment;
  const tutorActivityContentId = useMemo(
    () =>
      resolveGameTutorActivityContentId({
        activeGameAssignmentId: activeGameAssignment?.id,
        difficulty: runtime.difficulty,
        kangurMode: runtime.kangurMode,
        operation: runtime.operation,
        screen,
      }),
    [
      activeGameAssignment?.id,
      runtime.difficulty,
      runtime.kangurMode,
      runtime.operation,
      screen,
    ]
  );
  const tutorSessionContext = useMemo(
    () =>
      createGameTutorSessionContext({
        activeGameAssignment,
        currentQuestion: runtime.currentQuestion,
        currentQuestionIndex: runtime.currentQuestionIndex,
        currentScreenLabel,
        screen,
        score: runtime.score,
        totalQuestions: runtime.totalQuestions,
        translations,
        tutorActivityContentId,
      }),
    [
      activeGameAssignment,
      currentScreenLabel,
      runtime.currentQuestion,
      runtime.currentQuestionIndex,
      runtime.score,
      runtime.totalQuestions,
      screen,
      translations,
      tutorActivityContentId,
    ]
  );
  const learnerActivityTitle = useMemo(
    () =>
      resolveGameLearnerActivityTitle({
        activeGameAssignment,
        currentScreenLabel,
        translations,
      }),
    [activeGameAssignment, currentScreenLabel, translations]
  );
  const learnerActivityEnabled = runtime.user?.actorType === 'learner';

  return (
    <>
      {isKangurLaunchableGameScreen(screen) ? null : (
        <GameDeferredTutorAnchors
          activeGameAssignmentId={activeGameAssignment?.id}
          canAccessParentAssignments={runtime.canAccessParentAssignments}
          enabled
          refs={sessionRefs}
          screen={screen}
          translations={translations}
          tutorActivityContentId={tutorActivityContentId}
        />
      )}
      <GameDeferredAiTutorSessionSync
        learnerId={runtime.user?.activeLearner?.id ?? null}
        sessionContext={tutorSessionContext}
      />
      {learnerActivityEnabled ? (
        <GameDeferredLearnerActivityPing
          activity={{
            kind: 'game',
            title: learnerActivityTitle,
          }}
          enabled
        />
      ) : null}
      <GameDeferredRoutedScreen
        launchableGameInstanceId={launchableGameInstanceId}
        screen={screen}
        screenHeadingRef={screenHeadingRef}
        sessionRefs={sessionRefs}
        translations={translations}
      />
    </>
  );
}
