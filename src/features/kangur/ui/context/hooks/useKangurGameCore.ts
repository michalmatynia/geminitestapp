import { useRef, useState, useEffect } from 'react';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurSessionRecommendationHint,
  KangurXpToastState,
} from '../../types';

export function useKangurGameCore() {
  const xpToastTimeoutRef = useRef<number | null>(null);
  const gameLoopTimeoutRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<KangurGameScreen>('home');
  const [sessionPlayerName, setSessionPlayerName] = useState('');
  const [operation, setOperation] = useState<KangurOperation | null>(null);
  const [difficulty, setDifficulty] = useState<KangurDifficulty>('medium');
  const [questions, setQuestions] = useState<KangurQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [kangurMode, setKangurMode] = useState<KangurMode | null>(null);
  const [activeSessionRecommendation, setActiveSessionRecommendation] = useState<
    KangurSessionRecommendationHint | null
  >(null);
  const [xpToast, setXpToast] = useState<KangurXpToastState>({
    visible: false,
    xpGained: 0,
    newBadges: [],
    breakdown: [],
    nextBadge: null,
    dailyQuest: null,
    recommendation: null,
  });

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

  const runGameLoopTimer = (fn: () => void, ms: number): void => {
    if (gameLoopTimeoutRef.current) {
      window.clearTimeout(gameLoopTimeoutRef.current);
    }
    gameLoopTimeoutRef.current = window.setTimeout(() => {
      gameLoopTimeoutRef.current = null;
      fn();
    }, ms);
  };

  const showXpToast = (
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

    setXpToast({
      visible: true,
      xpGained,
      newBadges,
      breakdown,
      nextBadge,
      dailyQuest,
      recommendation,
    });
    xpToastTimeoutRef.current = window.setTimeout(() => {
      setXpToast((current) => ({ ...current, visible: false }));
      xpToastTimeoutRef.current = null;
    }, 2800);
  };

  return {
    screen,
    setScreen,
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
  };
}
