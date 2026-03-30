'use client';

import {
  createContext,
  useContext,
  useMemo,
  type JSX,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { DIFFICULTY_CONFIG } from '@kangur/core';

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
import { internalError } from '@/features/kangur/shared/errors/app-error';

import { useKangurGameQuickStart } from './KangurGameRuntimeContext.helpers';
import { TOTAL_QUESTIONS } from './KangurGameRuntimeContext.shared';

import type {
  KangurGameRuntimeActionsContextValue,
  KangurGameRuntimeContextValue,
  KangurGameRuntimeStateContextValue,
} from './KangurGameRuntimeContext.shared';
import { useKangurGameCore } from './hooks/useKangurGameCore';
import { useKangurGameRuntimeActions as useKangurGameRuntimeActionHandlers } from './hooks/useKangurGameRuntimeActions';

const KangurGameRuntimeStateContext = createContext<KangurGameRuntimeStateContextValue | null>(
  null
);
const KangurGameRuntimeActionsContext =
  createContext<KangurGameRuntimeActionsContextValue | null>(null);

const resolveCanAccessParentAssignments = ({
  canAccessParentAssignments,
  isAuthenticated,
  user,
}: ReturnType<typeof useKangurAuth>): boolean =>
  canAccessParentAssignments ?? (isAuthenticated && Boolean(user?.activeLearner?.id));

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
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const canAccessParentAssignments = resolveCanAccessParentAssignments(auth);
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
    advanceQuestion,
    score,
    setScore,
    startTime,
    setStartTime,
    timeTaken,
    setTimeTaken,
    completeSession,
    kangurMode,
    setKangurMode,
    activeSessionRecommendation,
    setActiveSessionRecommendation,
    xpToast,
    setXpToast,
    startSession,
    resetGame,
    showXpToast,
    runGameLoopTimer,
  } = useKangurGameCore();

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
  const totalQuestions = questions.length > 0 ? questions.length : TOTAL_QUESTIONS;
  const {
    playerName,
    setPlayerName,
    handleAnswer,
    handleHome,
    handleRestart,
    handleSelectOperation,
    handleStartGame,
    handleStartKangur,
    handleStartTraining,
  } = useKangurGameRuntimeActionHandlers({
    activeSessionRecommendation,
    advanceQuestion,
    canAccessParentAssignments,
    completeSession,
    currentQuestionIndex,
    difficulty,
    guestPlayerName,
    kangurMode,
    operation,
    progressTranslate: progressTranslations,
    refreshAssignments,
    resetGame,
    resultTranslate: resultTranslations,
    runGameLoopTimer,
    screen,
    score,
    sessionPlayerName,
    setActiveSessionRecommendation,
    setCurrentQuestionIndex,
    setDifficulty,
    setGuestPlayerName,
    setKangurMode,
    setLaunchableGameInstanceId,
    setOperation,
    setQuestions,
    setScore,
    setScreen,
    setSessionPlayerName,
    setStartTime,
    setTimeTaken,
    setXpToast,
    showXpToast,
    startSession,
    startTime,
    subject,
    subjectKey,
    totalQuestions,
    user,
  });

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

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const questionTimeLimit = DIFFICULTY_CONFIG[difficulty]?.timeLimit ?? 15;

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
