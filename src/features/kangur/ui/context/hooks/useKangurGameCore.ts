import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurSessionRecommendationHint,
  KangurXpToastState,
} from '../../types';
import {
  initialKangurGameCoreState,
  kangurGameCoreReducer,
  type KangurGameCoreCompleteSessionPayload,
  type KangurGameCoreResetPayload,
  type KangurGameCoreStartSessionPayload,
} from './useKangurGameCore.reducer';

type Setter<T> = Dispatch<SetStateAction<T>>;

export function useKangurGameCore() {
  const xpToastTimeoutRef = useRef<number | null>(null);
  const gameLoopTimeoutRef = useRef<number | null>(null);
  const [state, dispatch] = useReducer(kangurGameCoreReducer, initialKangurGameCoreState);

  useEffect(
    () => () => {
      if (xpToastTimeoutRef.current) {
        window.clearTimeout(xpToastTimeoutRef.current);
      }
      if (gameLoopTimeoutRef.current) {
        window.clearTimeout(gameLoopTimeoutRef.current);
      }
    },
    []
  );

  const setScreen = useCallback<Setter<KangurGameScreen>>((value) => {
    dispatch({ type: 'SET_SCREEN', value });
  }, []);

  const setLaunchableGameInstanceId = useCallback<Setter<KangurGameInstanceId | null>>(
    (value) => {
      dispatch({ type: 'SET_LAUNCHABLE_GAME_INSTANCE_ID', value });
    },
    []
  );

  const setSessionPlayerName = useCallback<Setter<string>>((value) => {
    dispatch({ type: 'SET_SESSION_PLAYER_NAME', value });
  }, []);

  const setOperation = useCallback<Setter<KangurOperation | null>>((value) => {
    dispatch({ type: 'SET_OPERATION', value });
  }, []);

  const setDifficulty = useCallback<Setter<KangurDifficulty>>((value) => {
    dispatch({ type: 'SET_DIFFICULTY', value });
  }, []);

  const setQuestions = useCallback<Setter<KangurQuestion[]>>((value) => {
    dispatch({ type: 'SET_QUESTIONS', value });
  }, []);

  const setCurrentQuestionIndex = useCallback<Setter<number>>((value) => {
    dispatch({ type: 'SET_CURRENT_QUESTION_INDEX', value });
  }, []);

  const setScore = useCallback<Setter<number>>((value) => {
    dispatch({ type: 'SET_SCORE', value });
  }, []);

  const setStartTime = useCallback<Setter<number | null>>((value) => {
    dispatch({ type: 'SET_START_TIME', value });
  }, []);

  const setTimeTaken = useCallback<Setter<number>>((value) => {
    dispatch({ type: 'SET_TIME_TAKEN', value });
  }, []);

  const setKangurMode = useCallback<Setter<KangurMode | null>>((value) => {
    dispatch({ type: 'SET_KANGUR_MODE', value });
  }, []);

  const setActiveSessionRecommendation = useCallback<
    Setter<KangurSessionRecommendationHint | null>
  >((value) => {
    dispatch({ type: 'SET_ACTIVE_SESSION_RECOMMENDATION', value });
  }, []);

  const setXpToast = useCallback<Setter<KangurXpToastState>>((value) => {
    dispatch({ type: 'SET_XP_TOAST', value });
  }, []);

  const startSession = useCallback((payload: KangurGameCoreStartSessionPayload): void => {
    dispatch({ type: 'START_SESSION', payload });
  }, []);

  const advanceQuestion = useCallback((): void => {
    dispatch({ type: 'ADVANCE_QUESTION' });
  }, []);

  const completeSession = useCallback((payload: KangurGameCoreCompleteSessionPayload): void => {
    dispatch({ type: 'COMPLETE_SESSION', payload });
  }, []);

  const resetGame = useCallback((payload: KangurGameCoreResetPayload): void => {
    dispatch({ type: 'RESET_GAME', payload });
  }, []);

  const runGameLoopTimer = useCallback((fn: () => void, ms: number): void => {
    if (gameLoopTimeoutRef.current) {
      window.clearTimeout(gameLoopTimeoutRef.current);
    }
    gameLoopTimeoutRef.current = window.setTimeout(() => {
      gameLoopTimeoutRef.current = null;
      fn();
    }, ms);
  }, []);

  const showXpToast = useCallback((
    xpGained: number,
    newBadges: string[],
    breakdown: KangurXpToastState['breakdown'] = [],
    nextBadge: KangurXpToastState['nextBadge'] = null,
    dailyQuest: KangurXpToastState['dailyQuest'] = null,
    recommendation: KangurXpToastState['recommendation'] = null
  ): void => {
    if (xpToastTimeoutRef.current) {
      window.clearTimeout(xpToastTimeoutRef.current);
    }

    dispatch({
      type: 'SET_XP_TOAST',
      value: {
        visible: true,
        xpGained,
        newBadges,
        breakdown,
        nextBadge,
        dailyQuest,
        recommendation,
      },
    });
    xpToastTimeoutRef.current = window.setTimeout(() => {
      dispatch({ type: 'DISMISS_XP_TOAST' });
      xpToastTimeoutRef.current = null;
    }, 2800);
  }, []);

  return {
    screen: state.screen,
    setScreen,
    launchableGameInstanceId: state.launchableGameInstanceId,
    setLaunchableGameInstanceId,
    sessionPlayerName: state.sessionPlayerName,
    setSessionPlayerName,
    operation: state.operation,
    setOperation,
    difficulty: state.difficulty,
    setDifficulty,
    questions: state.questions,
    setQuestions,
    currentQuestionIndex: state.currentQuestionIndex,
    setCurrentQuestionIndex,
    score: state.score,
    setScore,
    startTime: state.startTime,
    setStartTime,
    timeTaken: state.timeTaken,
    setTimeTaken,
    kangurMode: state.kangurMode,
    setKangurMode,
    activeSessionRecommendation: state.activeSessionRecommendation,
    setActiveSessionRecommendation,
    xpToast: state.xpToast,
    setXpToast,
    startSession,
    advanceQuestion,
    completeSession,
    resetGame,
    showXpToast,
    runGameLoopTimer,
  };
}
