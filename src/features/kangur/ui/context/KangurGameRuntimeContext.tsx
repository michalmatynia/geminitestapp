'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type JSX,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import {
  DIFFICULTY_CONFIG,
  generateQuestions,
  generateTrainingQuestions,
} from '@kangur/core';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  filterKangurAssignmentsBySubject,
  mapKangurPracticeAssignmentsByOperation,
  selectKangurPracticeAssignmentForScreen,
  selectKangurResultPracticeAssignment,
} from '@/features/kangur/ui/services/delegated-assignments';
import type {
  KangurDifficulty,
  KangurMode,
  KangurOperation,
  KangurSessionStartOptions,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { resolveKangurScoreSubject } from '@/shared/contracts/kangur';

import {
  buildKangurCompletedGameOutcome,
  useKangurGameQuickStart,
} from './KangurGameRuntimeContext.helpers';
import { TOTAL_QUESTIONS } from './KangurGameRuntimeContext.shared';

import type {
  KangurGameRuntimeActionsContextValue,
  KangurGameRuntimeContextValue,
  KangurGameRuntimeStateContextValue,
} from './KangurGameRuntimeContext.shared';
import { useKangurGameCore } from './hooks/useKangurGameCore';

const kangurPlatform = getKangurPlatform();

const KangurGameRuntimeStateContext = createContext<KangurGameRuntimeStateContextValue | null>(
  null
);
const KangurGameRuntimeActionsContext =
  createContext<KangurGameRuntimeActionsContextValue | null>(null);

export function KangurGameRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const progressTranslations = useTranslations('KangurProgressRuntime');
  const resultTranslations = useTranslations('KangurGameResult');
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { isAuthenticated, isLoadingAuth, logout, navigateToLogin, user } = auth;
  const canEarnRewards = !(user?.actorType === 'parent' && !user?.activeLearner?.id);
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? (isAuthenticated && Boolean(user?.activeLearner?.id));
  const progress = useKangurProgressState();

  const {
    screen,
    setScreen,
    launchableGameInstanceId,
    setLaunchableGameInstanceId,
    sessionPlayerName,
    setSessionPlayerName,
    operation,
    setOperation,
    difficulty,
    setDifficulty,
    questions,
    setQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    score,
    setScore,
    startTime,
    setStartTime,
    timeTaken,
    setTimeTaken,
    kangurMode,
    setKangurMode,
    activeSessionRecommendation,
    setActiveSessionRecommendation,
    xpToast,
    setXpToast,
    showXpToast,
    runGameLoopTimer,
  } = useKangurGameCore();

  const playerName = user?.full_name?.trim() || sessionPlayerName || guestPlayerName;
  const setPlayerName = setGuestPlayerName;

  const { assignments: delegatedAssignments, refresh: refreshAssignments } = useKangurAssignments({
    enabled: canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });

  const subjectAssignments = useMemo(
    () => filterKangurAssignmentsBySubject(delegatedAssignments, subject),
    [delegatedAssignments, subject]
  );

  useEffect(() => {
    if (canEarnRewards) {
      return;
    }
    setXpToast({
      visible: false,
      xpGained: 0,
      newBadges: [],
      breakdown: [],
      nextBadge: null,
      dailyQuest: null,
      recommendation: null,
    });
  }, [canEarnRewards, setXpToast]);

  useEffect(() => {
    const fullName = user?.full_name?.trim();
    if (!fullName || sessionPlayerName === fullName) {
      return;
    }
    setSessionPlayerName(fullName);
  }, [sessionPlayerName, user?.full_name, setSessionPlayerName]);

  const ensureSessionPlayerName = (): string => {
    const nextPlayerName = guestPlayerName.trim() || user?.full_name?.trim() || 'Gracz';
    if (sessionPlayerName !== nextPlayerName) {
      setSessionPlayerName(nextPlayerName);
    }
    return nextPlayerName;
  };

  const handleStartTraining = ({
    categories,
    count,
    difficulty: nextDifficulty,
  }: KangurTrainingSelection,
  options?: KangurSessionStartOptions): void => {
    ensureSessionPlayerName();
    setLaunchableGameInstanceId(null);
    const nextQuestions = generateTrainingQuestions(categories, nextDifficulty, count);
    setOperation('mixed');
    setDifficulty(nextDifficulty);
    setQuestions(nextQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeTaken(0);
    setStartTime(Date.now());
    setActiveSessionRecommendation(options?.recommendation ?? null);
    setScreen('playing');
  };

  const handleSelectOperation = (
    nextOperation: KangurOperation,
    nextDifficulty: KangurDifficulty,
    options?: KangurSessionStartOptions
  ): void => {
    ensureSessionPlayerName();
    setLaunchableGameInstanceId(null);
    const nextQuestions = generateQuestions(nextOperation, nextDifficulty, TOTAL_QUESTIONS);
    setOperation(nextOperation);
    setDifficulty(nextDifficulty);
    setQuestions(nextQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeTaken(0);
    setStartTime(Date.now());
    setActiveSessionRecommendation(options?.recommendation ?? null);
    setScreen('playing');
  };

  useKangurGameQuickStart({
    basePath,
    isLoadingAuth,
    playerName,
    screen,
    user,
    setPlayerName,
    setScreen,
    setLaunchableGameInstanceId,
    handleSelectOperation,
    handleStartTraining,
  });

  const totalQuestions = questions.length > 0 ? questions.length : TOTAL_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const questionTimeLimit = DIFFICULTY_CONFIG[difficulty]?.timeLimit ?? 15;

  const handleAnswer = (correct: boolean): void => {
    const nextScore = correct ? score + 1 : score;
    if (correct) {
      setScore(nextScore);
    }

    if (currentQuestionIndex + 1 >= totalQuestions) {
      const nextPlayerName = ensureSessionPlayerName();
      const taken = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);
      setTimeTaken(taken);
      setScore(nextScore);
      const {
        awardedXp,
        awardedBadges,
        awardedBreakdown,
        dailyQuestToastHint,
        nextBadgeToastHint,
        recommendationToastHint,
        selectedOperation,
        isPerfect,
        isGreat,
      } = buildKangurCompletedGameOutcome({
        activeSessionRecommendation,
        difficulty,
        nextScore,
        operation,
        ownerKey: subjectKey,
        subject,
        taken,
        totalQuestions,
        allowRewards: canEarnRewards,
        progressTranslate: progressTranslations,
        resultTranslate: resultTranslations,
      });

      if (canEarnRewards) {
          void kangurPlatform.score
          .create({
            player_name: nextPlayerName,
            score: nextScore,
            operation: selectedOperation,
            subject: resolveKangurScoreSubject({ operation: selectedOperation, subject }),
            total_questions: totalQuestions,
            correct_answers: nextScore,
            time_taken: taken,
            xp_earned: awardedXp,
          })
          .finally(() => {
            if (canAccessParentAssignments) {
              void refreshAssignments();
            }
          });
      }

      trackKangurClientEvent('kangur_game_completed', {
        operation: selectedOperation,
        difficulty,
        screen,
        kangurMode: kangurMode ?? 'practice',
        totalQuestions,
        correctAnswers: nextScore,
        accuracyPercent: Math.round((nextScore / totalQuestions) * 100),
        isPerfect,
        isGreat,
        xpAwarded: awardedXp,
        playerNamePresent: nextPlayerName.length > 0,
      });
      if (canEarnRewards) {
        showXpToast(
          awardedXp,
          awardedBadges,
          awardedBreakdown,
          nextBadgeToastHint,
          dailyQuestToastHint,
          recommendationToastHint
        );
      }

      runGameLoopTimer(() => setScreen('result'), 1000);
      return;
    }

    runGameLoopTimer(() => {
      setCurrentQuestionIndex((current) => current + 1);
    }, 1000);
  };

  const handleStartGame = (): void => {
    ensureSessionPlayerName();
    setActiveSessionRecommendation(null);
    setLaunchableGameInstanceId(null);
    setScreen('operation');
  };

  const handleStartKangur = (mode: KangurMode, options?: KangurSessionStartOptions): void => {
    ensureSessionPlayerName();
    setKangurMode(mode);
    setActiveSessionRecommendation(options?.recommendation ?? null);
    setLaunchableGameInstanceId(null);
    setScreen('kangur');
  };

  const handleRestart = (): void => {
    setActiveSessionRecommendation(null);
    setLaunchableGameInstanceId(null);
    setScreen('operation');
  };

  const handleHome = (): void => {
    setActiveSessionRecommendation(null);
    setLaunchableGameInstanceId(null);
    setScreen('home');
  };

  const practiceAssignmentsByOperation = useMemo(
    () => mapKangurPracticeAssignmentsByOperation(subjectAssignments),
    [subjectAssignments]
  );
  const activePracticeAssignment = useMemo(
    () => selectKangurPracticeAssignmentForScreen(subjectAssignments, screen, operation),
    [operation, screen, subjectAssignments]
  );
  const resultPracticeAssignment = useMemo(
    () =>
      screen === 'result' && operation
        ? selectKangurResultPracticeAssignment(subjectAssignments, operation)
        : null,
    [operation, screen, subjectAssignments]
  );
  const canStartFromHome = true;

  const stateValue = useMemo<KangurGameRuntimeStateContextValue>(
    () => ({
      basePath,
      user,
      isAuthenticated,
      canAccessParentAssignments,
      isLoadingAuth,
      progress,
      screen,
      launchableGameInstanceId,
      playerName,
      operation,
      difficulty,
      currentQuestionIndex,
      currentQuestion,
      totalQuestions,
      score,
      timeTaken,
      kangurMode,
      activeSessionRecommendation,
      xpToast,
      canStartFromHome,
      questionTimeLimit,
      practiceAssignmentsByOperation,
      activePracticeAssignment,
      resultPracticeAssignment,
    }),
    [
      activePracticeAssignment,
      basePath,
      canAccessParentAssignments,
      canStartFromHome,
      currentQuestion,
      currentQuestionIndex,
      difficulty,
      isAuthenticated,
      isLoadingAuth,
      kangurMode,
      launchableGameInstanceId,
      activeSessionRecommendation,
      operation,
      playerName,
      practiceAssignmentsByOperation,
      progress,
      questionTimeLimit,
      resultPracticeAssignment,
      score,
      screen,
      timeTaken,
      totalQuestions,
      user,
      xpToast,
    ]
  );
  const actionsValue = useMemo<KangurGameRuntimeActionsContextValue>(
    () => ({
      navigateToLogin,
      logout,
      setPlayerName,
      setScreen,
      handleStartGame,
      handleStartTraining,
      handleSelectOperation,
      handleAnswer,
      handleStartKangur,
      handleRestart,
      handleHome,
    }),
    [
      handleAnswer,
      handleHome,
      handleRestart,
      handleSelectOperation,
      handleStartGame,
      handleStartKangur,
      handleStartTraining,
      logout,
      navigateToLogin,
      setPlayerName,
      setScreen,
    ]
  );

  return (
    <KangurGameRuntimeActionsContext.Provider value={actionsValue}>
      <KangurGameRuntimeStateContext.Provider value={stateValue}>
        {children}
      </KangurGameRuntimeStateContext.Provider>
    </KangurGameRuntimeActionsContext.Provider>
  );
}

export function KangurGameRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingStateContext = useContext(KangurGameRuntimeStateContext);
  const existingActionsContext = useContext(KangurGameRuntimeActionsContext);
  if (!enabled || existingStateContext || existingActionsContext) {
    return <>{children}</>;
  }

  return <KangurGameRuntimeProvider>{children}</KangurGameRuntimeProvider>;
}

export const useKangurGameRuntime = (): KangurGameRuntimeContextValue => {
  const state = useKangurGameRuntimeState();
  const actions = useKangurGameRuntimeActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

export const useKangurGameRuntimeState = (): KangurGameRuntimeStateContextValue => {
  const context = useContext(KangurGameRuntimeStateContext);
  if (!context) {
    throw internalError('useKangurGameRuntimeState must be used within a KangurGameRuntimeProvider');
  }
  return context;
};

export const useKangurGameRuntimeActions = (): KangurGameRuntimeActionsContextValue => {
  const context = useContext(KangurGameRuntimeActionsContext);
  if (!context) {
    throw internalError(
      'useKangurGameRuntimeActions must be used within a KangurGameRuntimeProvider'
    );
  }
  return context;
};

export const useOptionalKangurGameRuntime = (): KangurGameRuntimeContextValue | null => {
  const state = useContext(KangurGameRuntimeStateContext);
  const actions = useContext(KangurGameRuntimeActionsContext);
  return useMemo(() => {
    if (!state && !actions) return null;
    return { ...(state ?? {}), ...(actions ?? {}) } as KangurGameRuntimeContextValue;
  }, [state, actions]);
};

export { isKangurGameScreen } from './KangurGameRuntimeContext.shared';
