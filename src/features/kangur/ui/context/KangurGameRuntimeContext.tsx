'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import {
  getKangurInternalQueryParamName,
  readKangurUrlParam,
  type KangurInternalQueryParamKey,
} from '@/features/kangur/config/routing';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  mapKangurPracticeAssignmentsByOperation,
  parseKangurMixedTrainingQuickStartParams,
  selectKangurPracticeAssignmentForScreen,
  selectKangurResultPracticeAssignment,
} from '@/features/kangur/ui/services/delegated-assignments';
import {
  DIFFICULTY_CONFIG,
  generateQuestions,
  generateTrainingQuestions,
} from '@/features/kangur/ui/services/math-questions';
import {
  addXp,
  createGameSessionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';
import { internalError } from '@/shared/errors/app-error';

import {
  isKangurDifficulty,
  isKangurOperation,
  TOTAL_QUESTIONS,
} from './KangurGameRuntimeContext.shared';

import type {
  KangurGameRuntimeActionsContextValue,
  KangurGameRuntimeContextValue,
  KangurGameRuntimeStateContextValue,
} from './KangurGameRuntimeContext.shared';


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
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { isAuthenticated, isLoadingAuth, logout, navigateToLogin, user } = auth;
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const canAccessParentAssignments =
    auth.canAccessParentAssignments ?? (isAuthenticated && Boolean(user?.activeLearner?.id));
  const progress = useKangurProgressState();
  const quickStartConsumedRef = useRef(false);
  const xpToastTimeoutRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<KangurGameScreen>('home');
  const [sessionPlayerName, setSessionPlayerName] = useState('');
  const playerName = user?.full_name?.trim() || sessionPlayerName || guestPlayerName;
  const setPlayerName = setGuestPlayerName;
  const [operation, setOperation] = useState<KangurOperation | null>(null);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');
  const [questions, setQuestions] = useState<KangurQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [kangurMode, setKangurMode] = useState<KangurMode | null>(null);
  const [xpToast, setXpToast] = useState<KangurXpToastState>({
    visible: false,
    xpGained: 0,
    newBadges: [],
  });

  const { assignments: delegatedAssignments, refresh: refreshAssignments } = useKangurAssignments({
    enabled: canAccessParentAssignments,
    query: {
      includeArchived: false,
    },
  });

  useEffect(
    () => () => {
      if (xpToastTimeoutRef.current) {
        window.clearTimeout(xpToastTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const fullName = user?.full_name?.trim();
    if (!fullName || sessionPlayerName === fullName) {
      return;
    }

    setSessionPlayerName(fullName);
  }, [sessionPlayerName, user?.full_name]);

  const showXpToast = (xpGained: number, newBadges: string[]): void => {
    if (xpToastTimeoutRef.current) {
      window.clearTimeout(xpToastTimeoutRef.current);
    }

    setXpToast({ visible: true, xpGained, newBadges });
    xpToastTimeoutRef.current = window.setTimeout(() => {
      setXpToast((current) => ({ ...current, visible: false }));
      xpToastTimeoutRef.current = null;
    }, 2800);
  };

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
  }: KangurTrainingSelection): void => {
    ensureSessionPlayerName();
    const nextQuestions = generateTrainingQuestions(categories, nextDifficulty, count);
    setOperation('mixed');
    setDifficulty(nextDifficulty);
    setQuestions(nextQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeTaken(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  const handleSelectOperation = (
    nextOperation: KangurOperation,
    nextDifficulty: KangurDifficulty
  ): void => {
    ensureSessionPlayerName();
    const nextQuestions = generateQuestions(nextOperation, nextDifficulty, TOTAL_QUESTIONS);
    setOperation(nextOperation);
    setDifficulty(nextDifficulty);
    setQuestions(nextQuestions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setTimeTaken(0);
    setStartTime(Date.now());
    setScreen('playing');
  };

  useEffect(() => {
    if (
      quickStartConsumedRef.current ||
      screen !== 'home' ||
      typeof window === 'undefined' ||
      isLoadingAuth
    ) {
      return;
    }

    const url = new URL(window.location.href);
    const quickStart = readKangurUrlParam(url.searchParams, 'quickStart', basePath);
    if (!quickStart) {
      return;
    }

    const clearQuickStartParams = (): void => {
      (['quickStart', 'operation', 'categories', 'count', 'difficulty'] as const).forEach((key) => {
        url.searchParams.delete(
          getKangurInternalQueryParamName(key as KangurInternalQueryParamKey, basePath)
        );
      });
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', nextHref);
    };

    if (quickStart === 'training') {
      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }

      const trainingPreset = parseKangurMixedTrainingQuickStartParams(url.searchParams, basePath);
      clearQuickStartParams();
      if (trainingPreset) {
        handleStartTraining(trainingPreset);
        return;
      }

      setScreen('training');
      return;
    }

    if (quickStart === 'operation') {
      const requestedOperation = readKangurUrlParam(url.searchParams, 'operation', basePath);
      const requestedDifficulty = readKangurUrlParam(url.searchParams, 'difficulty', basePath);
      const nextOperation = isKangurOperation(requestedOperation) ? requestedOperation : null;
      const nextDifficulty = isKangurDifficulty(requestedDifficulty)
        ? requestedDifficulty
        : 'medium';

      quickStartConsumedRef.current = true;
      if (!user && playerName.trim().length === 0) {
        setPlayerName('Gracz');
      }
      clearQuickStartParams();
      if (nextOperation) {
        handleSelectOperation(nextOperation, nextDifficulty);
      } else {
        setScreen('operation');
      }
    }
  }, [basePath, handleSelectOperation, handleStartTraining, isLoadingAuth, playerName, screen, user]);

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
      const selectedOperation = operation ?? 'mixed';
      const greatThreshold = Math.max(1, Math.ceil(totalQuestions * 0.8));
      setTimeTaken(taken);
      setScore(nextScore);

      void kangurPlatform.score
        .create({
          player_name: nextPlayerName,
          score: nextScore,
          operation: selectedOperation,
          total_questions: totalQuestions,
          correct_answers: nextScore,
          time_taken: taken,
        })
        .finally(() => {
          if (canAccessParentAssignments) {
            void refreshAssignments();
          }
        });

      const storedProgress = loadProgress();
      const isPerfect = nextScore === totalQuestions;
      const isGreat = nextScore >= greatThreshold;
      const reward = createGameSessionReward(storedProgress, {
        operation: selectedOperation,
        difficulty,
        correctAnswers: nextScore,
        totalQuestions,
        durationSeconds: taken,
      });
      const { newBadges } = addXp(reward.xp, reward.progressUpdates);
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
        xpAwarded: reward.xp,
        playerNamePresent: nextPlayerName.length > 0,
      });
      showXpToast(reward.xp, newBadges);

      window.setTimeout(() => setScreen('result'), 1000);
      return;
    }

    window.setTimeout(() => {
      setCurrentQuestionIndex((current) => current + 1);
    }, 1000);
  };

  const handleStartGame = (): void => {
    ensureSessionPlayerName();
    setScreen('operation');
  };

  const handleStartKangur = (mode: KangurMode): void => {
    ensureSessionPlayerName();
    setKangurMode(mode);
    setScreen('kangur');
  };

  const handleRestart = (): void => {
    setScreen('operation');
  };

  const handleHome = (): void => {
    setScreen('home');
  };

  const practiceAssignmentsByOperation = useMemo(
    () => mapKangurPracticeAssignmentsByOperation(delegatedAssignments),
    [delegatedAssignments]
  );
  const activePracticeAssignment = useMemo(
    () => selectKangurPracticeAssignmentForScreen(delegatedAssignments, screen, operation),
    [delegatedAssignments, operation, screen]
  );
  const resultPracticeAssignment = useMemo(
    () =>
      screen === 'result'
        ? selectKangurResultPracticeAssignment(delegatedAssignments, operation)
        : null,
    [delegatedAssignments, operation, screen]
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
      playerName,
      operation,
      difficulty,
      currentQuestionIndex,
      currentQuestion,
      totalQuestions,
      score,
      timeTaken,
      kangurMode,
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

export const isKangurGameScreen = (value: string | null | undefined): value is KangurGameScreen =>
  value === 'home' ||
  value === 'training' ||
  value === 'kangur_setup' ||
  value === 'kangur' ||
  value === 'calendar_quiz' ||
  value === 'geometry_quiz' ||
  value === 'operation' ||
  value === 'playing' ||
  value === 'result';
