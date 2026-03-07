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
import type { KangurAssignmentSnapshot, KangurUser } from '@/features/kangur/services/ports';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  DIFFICULTY_CONFIG,
  generateQuestions,
  generateTrainingQuestions,
} from '@/features/kangur/ui/services/math-questions';
import { XP_REWARDS, addXp, loadProgress } from '@/features/kangur/ui/services/progress';
import {
  mapKangurPracticeAssignmentsByOperation,
  parseKangurMixedTrainingQuickStartParams,
  selectKangurPracticeAssignmentForScreen,
  selectKangurResultPracticeAssignment,
} from '@/features/kangur/ui/services/delegated-assignments';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurProgressState,
  KangurQuestion,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';

type KangurPracticeAssignment = KangurAssignmentSnapshot & { target: { type: 'practice' } };

type KangurGameRuntimeContextValue = {
  basePath: string;
  user: KangurUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  progress: KangurProgressState;
  screen: KangurGameScreen;
  playerName: string;
  operation: KangurOperation | null;
  difficulty: KangurDifficulty;
  currentQuestionIndex: number;
  currentQuestion: KangurQuestion | null;
  totalQuestions: number;
  score: number;
  timeTaken: number;
  kangurMode: KangurMode | null;
  xpToast: KangurXpToastState;
  canStartFromHome: boolean;
  questionTimeLimit: number;
  practiceAssignmentsByOperation: Partial<Record<KangurOperation, KangurPracticeAssignment>>;
  activePracticeAssignment: KangurPracticeAssignment | null;
  resultPracticeAssignment: KangurPracticeAssignment | null;
  navigateToLogin: () => void;
  logout: (shouldRedirect?: boolean) => void;
  setPlayerName: (value: string) => void;
  setScreen: (screen: KangurGameScreen) => void;
  handleStartGame: () => void;
  handleStartTraining: (selection: KangurTrainingSelection) => void;
  handleSelectOperation: (operation: KangurOperation, difficulty: KangurDifficulty) => void;
  handleAnswer: (correct: boolean) => void;
  handleStartKangur: (mode: KangurMode) => void;
  handleRestart: () => void;
  handleHome: () => void;
};

const kangurPlatform = getKangurPlatform();
const TOTAL_QUESTIONS = 10;
const KANGUR_OPERATIONS: KangurOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
];
const KANGUR_DIFFICULTIES: KangurDifficulty[] = ['easy', 'medium', 'hard'];

const isKangurOperation = (value: string | null): value is KangurOperation =>
  Boolean(value && KANGUR_OPERATIONS.includes(value as KangurOperation));

const isKangurDifficulty = (value: string | null): value is KangurDifficulty =>
  Boolean(value && KANGUR_DIFFICULTIES.includes(value as KangurDifficulty));

const KangurGameRuntimeContext = createContext<KangurGameRuntimeContextValue | null>(null);

export function KangurGameRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const { isAuthenticated, isLoadingAuth, logout, navigateToLogin, user } = useKangurAuth();
  const progress = useKangurProgressState();
  const quickStartConsumedRef = useRef(false);
  const xpToastTimeoutRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<KangurGameScreen>('home');
  const [playerName, setPlayerName] = useState('');
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
    enabled: Boolean(user),
    query: {
      includeArchived: false,
    },
  });

  useEffect(() => {
    const fullName = user?.full_name?.trim();
    if (!fullName) {
      return;
    }
    setPlayerName(fullName);
  }, [user?.full_name]);

  useEffect(
    () => () => {
      if (xpToastTimeoutRef.current) {
        window.clearTimeout(xpToastTimeoutRef.current);
      }
    },
    []
  );

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

  const handleStartTraining = ({
    categories,
    count,
    difficulty: nextDifficulty,
  }: KangurTrainingSelection): void => {
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
      const taken = Math.round((Date.now() - (startTime ?? Date.now())) / 1000);
      const selectedOperation = operation ?? 'mixed';
      const greatThreshold = Math.max(1, Math.ceil(totalQuestions * 0.8));
      setTimeTaken(taken);
      setScore(nextScore);

      void kangurPlatform.score
        .create({
          player_name: playerName,
          score: nextScore,
          operation: selectedOperation,
          total_questions: totalQuestions,
          correct_answers: nextScore,
          time_taken: taken,
        })
        .finally(() => {
          if (user) {
            void refreshAssignments();
          }
        });

      const storedProgress = loadProgress();
      const isPerfect = nextScore === totalQuestions;
      const isGreat = nextScore >= greatThreshold;
      const xp = isPerfect
        ? XP_REWARDS.perfect_game
        : isGreat
          ? XP_REWARDS.great_game
          : XP_REWARDS.good_game;
      const operationsPlayed = [...new Set([...(storedProgress.operationsPlayed || []), selectedOperation])];
      const { newBadges } = addXp(xp, {
        gamesPlayed: storedProgress.gamesPlayed + 1,
        perfectGames: isPerfect ? storedProgress.perfectGames + 1 : storedProgress.perfectGames,
        operationsPlayed,
      });
      trackKangurClientEvent('kangur_game_completed', {
        operation: selectedOperation,
        difficulty,
        screen,
        kangurMode: kangurMode ?? 'practice',
        totalQuestions,
        correctAnswers: nextScore,
        accuracyPercent: Math.round((nextScore / totalQuestions) * 100),
        isPerfect,
        xpAwarded: xp,
        playerNamePresent: playerName.trim().length > 0,
      });
      showXpToast(xp, newBadges);

      window.setTimeout(() => setScreen('result'), 1000);
      return;
    }

    window.setTimeout(() => {
      setCurrentQuestionIndex((current) => current + 1);
    }, 1000);
  };

  const handleStartGame = (): void => {
    setScreen('operation');
  };

  const handleStartKangur = (mode: KangurMode): void => {
    setKangurMode(mode);
    setScreen('kangur');
  };

  const handleRestart = (): void => {
    setScreen('operation');
  };

  const handleHome = (): void => {
    setScreen('home');
    if (!user) {
      setPlayerName('');
    }
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
  const canStartFromHome = Boolean(user || playerName.trim().length > 0);

  const value: KangurGameRuntimeContextValue = {
    basePath,
    user,
    isAuthenticated,
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
  };

  return (
    <KangurGameRuntimeContext.Provider value={value}>
      {children}
    </KangurGameRuntimeContext.Provider>
  );
}

export function KangurGameRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingContext = useContext(KangurGameRuntimeContext);
  if (!enabled || existingContext) {
    return <>{children}</>;
  }

  return <KangurGameRuntimeProvider>{children}</KangurGameRuntimeProvider>;
}

export const useKangurGameRuntime = (): KangurGameRuntimeContextValue => {
  const context = useContext(KangurGameRuntimeContext);
  if (!context) {
    throw new Error('useKangurGameRuntime must be used within a KangurGameRuntimeProvider');
  }

  return context;
};

export const useOptionalKangurGameRuntime = (): KangurGameRuntimeContextValue | null =>
  useContext(KangurGameRuntimeContext);

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
