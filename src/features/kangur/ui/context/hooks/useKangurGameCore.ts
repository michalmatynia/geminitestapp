'use client';

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

// useKangurGameCore manages all mutable game state through a single reducer.
// It exposes stable setter callbacks (dispatch wrappers) so consumers can
// update individual fields without triggering unnecessary re-renders, plus
// compound actions (startSession, completeSession, resetGame) that update
// multiple fields atomically.
//
// Two refs track pending timeouts so they can be cancelled on unmount:
//  xpToastTimeoutRef  – auto-dismisses the XP toast after 2.8 s
//  gameLoopTimeoutRef – drives the per-question countdown timer
export function useKangurGameCore() {
  // Ref for the auto-dismiss timeout of the XP reward toast.
  const xpToastTimeoutRef = useRef<number | null>(null);
  // Ref for the game-loop countdown timer (question time limit).
  const gameLoopTimeoutRef = useRef<number | null>(null);
  const [state, dispatch] = useReducer(kangurGameCoreReducer, initialKangurGameCoreState);

  // Cancel any pending timeouts when the component unmounts to prevent
  // state updates on an unmounted tree.
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

  // runGameLoopTimer schedules a single-shot callback after `ms` milliseconds.
  // Any previously scheduled timer is cancelled first so only one countdown
  // is active at a time (prevents double-advance on rapid re-renders).
  const runGameLoopTimer = useCallback((fn: () => void, ms: number): void => {
    if (gameLoopTimeoutRef.current) {
      window.clearTimeout(gameLoopTimeoutRef.current);
    }
    gameLoopTimeoutRef.current = window.setTimeout(() => {
      gameLoopTimeoutRef.current = null;
      fn();
    }, ms);
  }, []);

  // showXpToast displays the XP reward toast with earned XP, new badges,
  // a breakdown of XP sources, next-badge progress, daily quest status, and
  // an optional session recommendation. It auto-dismisses after 2.8 s.
  // Any previously visible toast is replaced immediately.
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
