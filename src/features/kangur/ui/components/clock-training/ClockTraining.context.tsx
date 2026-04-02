'use client';

import React, { createContext, useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurRewardBreakdownEntry,
  KangurIntlTranslate,
} from '@/features/kangur/ui/types';
import {
  CHALLENGE_TIME_LIMIT_SECONDS,
  buildClockCorrectFeedback,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  createClockTaskSet,
  resolveClockChallengeMedal,
  resolveClockPracticeTaskSet,
  scheduleRetryTask,
} from './clock-training-utils';
import { getClockTrainingSectionContent } from './clock-training-data';
import type {
  ClockChallengeMedal,
  ClockFeedback,
  ClockGameMode,
  ClockTask,
  ClockTrainingProps,
  ClockTrainingSectionContent,
  ClockTrainingTaskPoolId,
} from '../clock-training/types';
import { translateClockTrainingWithFallback } from './clock-training-i18n';
import { internalError } from '@/features/kangur/shared/errors/app-error';

export type ClockTrainingContextValue = {
  props: ClockTrainingProps;
  state: {
    gameMode: ClockGameMode;
    tasks: ClockTask[];
    current: number;
    score: number;
    feedback: ClockFeedback | null;
    done: boolean;
    xpEarned: number;
    xpBreakdown: KangurRewardBreakdownEntry[];
    submitNextStep: 'next-stage' | 'next-task' | 'summary' | null;
    retryAddedCount: number;
    challengeTimeLeft: number;
    challengeStreak: number;
    challengeBestStreak: number;
    challengeMedal: ClockChallengeMedal | null;
    isCoarsePointer: boolean;
    trainingSectionContent: ClockTrainingSectionContent;
    translations: KangurIntlTranslate;
    showStandalonePracticeSummary: boolean;
    resolvedCompletionPrimaryActionLabel: string;
    task: ClockTask | undefined;
    section: ClockTrainingTaskPoolId;
  };
  actions: {
    handleSubmit: (hours: number, minutes: number) => void;
    resetSession: (mode?: ClockGameMode) => void;
    onFinish: () => void;
  };
};

const ClockTrainingContext = createContext<ClockTrainingContextValue | null>(null);

const CHALLENGE_STRONG_THRESHOLD = 80;
const PRACTICE_STRONG_THRESHOLD = 60;

const resolveClockTrainingTaskSet = ({
  gameMode,
  practiceTasks,
  section,
}: {
  gameMode: ClockGameMode;
  practiceTasks?: ClockTask[];
  section: ClockTrainingTaskPoolId;
}): ClockTask[] =>
  gameMode === 'challenge'
    ? createClockTaskSet(section)
    : resolveClockPracticeTaskSet(section, practiceTasks);

export function ClockTrainingProvider({ children, ...props }: ClockTrainingProps & { children: React.ReactNode }) {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  
  const enableAdaptiveRetry = props.enableAdaptiveRetry ?? true;
  const initialMode = props.initialMode ?? 'practice';
  const section = props.section ?? 'mixed';
  
  const [gameMode, setGameMode] = useState<ClockGameMode>(initialMode);
  const [tasks, setTasks] = useState<ClockTask[]>(() =>
    resolveClockTrainingTaskSet({
      gameMode: 'practice',
      practiceTasks: props.practiceTasks,
      section,
    })
  );
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<ClockFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [submitNextStep, setSubmitNextStep] = useState<'next-stage' | 'next-task' | 'summary' | null>(
    null
  );
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({});
  const [retryAddedCount, setRetryAddedCount] = useState(0);
  const [challengeTimeLeft, setChallengeTimeLeft] = useState(CHALLENGE_TIME_LIMIT_SECONDS);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengeBestStreak, setChallengeBestStreak] = useState(0);
  const [challengeMedal, setChallengeMedal] = useState<ClockChallengeMedal | null>(null);
  
  const sessionStartedAtRef = useRef(Date.now());
  const advanceTimeoutRef = useRef<number | null>(null);
  const trainingSectionContent = useMemo(() => getClockTrainingSectionContent(section, translations), [section, translations]);

  const task = tasks[current];

  const clearAdvanceTimeout = useCallback((): void => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const resetSession = useCallback(
    (mode: ClockGameMode = gameMode): void => {
      clearAdvanceTimeout();
      props.onModeChange?.(mode);
      setGameMode(mode);
      setTasks(resolveClockTrainingTaskSet({ gameMode: mode, practiceTasks: props.practiceTasks, section }));
      setCurrent(0);
      setScore(0);
      setFeedback(null);
      setDone(false);
      setXpEarned(0);
      setXpBreakdown([]);
      setSubmitNextStep(null);
      setRetryCounts({});
      setRetryAddedCount(0);
      setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
      setChallengeStreak(0);
      setChallengeBestStreak(0);
      setChallengeMedal(null);
      sessionStartedAtRef.current = Date.now();
    },
    [clearAdvanceTimeout, gameMode, props.onModeChange, props.practiceTasks, section]
  );

  const handleDone = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress({ ownerKey });
      const reward = createTrainingReward(progress, {
        activityKey: `training:clock:${section}`,
        lessonKey: 'clock',
        correctAnswers: finalScore,
        totalQuestions: tasks.length,
        strongThresholdPercent: gameMode === 'challenge' ? CHALLENGE_STRONG_THRESHOLD : PRACTICE_STRONG_THRESHOLD,
        perfectCounterKey: 'clockPerfect',
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'clock',
        score: finalScore,
        totalQuestions: tasks.length,
        correctAnswers: finalScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });

      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      if (gameMode === 'challenge') {
        const medal = resolveClockChallengeMedal(finalScore, tasks.length);
        setChallengeMedal(medal);
        props.onChallengeSuccess?.({
          correctCount: finalScore,
          medal,
          totalCount: tasks.length,
        });
      } else {
        props.onPracticeCompleted?.({
          correctCount: finalScore,
          totalCount: tasks.length,
        });
      }
    },
    [gameMode, props.onChallengeSuccess, props.onPracticeCompleted, ownerKey, section, tasks.length]
  );

  const resolveAttempt = useCallback(
    ({
      correct,
      actualHours,
      actualMinutes,
      expectedTask,
      feedbackOverride,
    }: {
      correct: boolean;
      actualHours: number;
      actualMinutes: number;
      expectedTask: ClockTask;
      feedbackOverride?: ClockFeedback;
    }): void => {
      const scoreAfterAttempt = correct ? score + 1 : score;
      let nextTaskCount = tasks.length;

      if (correct) {
        setScore((prev) => prev + 1);
        if (gameMode === 'challenge') {
          const nextStreak = challengeStreak + 1;
          setChallengeStreak(nextStreak);
          setChallengeBestStreak((value) => Math.max(value, nextStreak));
        } else if (!props.onPracticeCompleted) {
          props.onPracticeSuccess?.();
        }

        setFeedback(
          feedbackOverride ??
            buildClockCorrectFeedback(
              section,
              expectedTask,
              {
                gameMode,
                streak: challengeStreak + 1,
              },
              translations
            )
        );
      } else {
        if (gameMode === 'challenge') {
          setChallengeStreak(0);
        }

        const selectedBaseFeedback =
          feedbackOverride ??
          buildClockWrongFeedback(
            actualHours,
            actualMinutes,
            expectedTask.hours,
            expectedTask.minutes,
            section,
            translations
          );

        if (gameMode === 'practice' && enableAdaptiveRetry) {
          const retryPlan = scheduleRetryTask(tasks, retryCounts, expectedTask);
          if (retryPlan.added) {
            setTasks(retryPlan.tasks);
            setRetryCounts(retryPlan.retryCounts);
            setRetryAddedCount((value) => value + 1);
            setFeedback({
              ...selectedBaseFeedback,
              details: `${selectedBaseFeedback.details} ${translateClockTrainingWithFallback(
                translations,
                'adaptiveRetryAdded',
                'Dodaliśmy krótką powtórkę tego zadania.'
              )}`,
            });
            nextTaskCount = retryPlan.tasks.length;
          } else {
            setFeedback(selectedBaseFeedback);
            nextTaskCount = retryPlan.tasks.length;
          }
        } else {
          setFeedback(selectedBaseFeedback);
        }
      }

      const isLastTask = current + 1 >= nextTaskCount;
      const nextStep = isLastTask 
        ? (gameMode === 'challenge' || !props.onPracticeCompleted ? 'summary' : 'next-stage')
        : 'next-task';
        
      setSubmitNextStep(nextStep);

      const delayMs = correct ? 1200 : gameMode === 'challenge' ? 1400 : 2100;
      
      advanceTimeoutRef.current = window.setTimeout(() => {
        if (isLastTask) {
          if (gameMode === 'challenge') {
            setFeedback(null);
          }
          setSubmitNextStep(null);
          handleDone(scoreAfterAttempt);
          return;
        }

        setFeedback(null);
        setSubmitNextStep(null);
        setCurrent((prev) => prev + 1);
        if (gameMode === 'challenge') {
          setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
        }
      }, delayMs);
    },
    [
      challengeStreak,
      clearAdvanceTimeout,
      current,
      enableAdaptiveRetry,
      gameMode,
      handleDone,
      props.onPracticeCompleted,
      props.onPracticeSuccess,
      retryCounts,
      score,
      translations,
      tasks,
      section,
    ]
  );

  const handleSubmit = useCallback((hours: number, minutes: number): void => {
    if (!task) return;
    const correct = hours === task.hours && minutes === task.minutes;
    resolveAttempt({
      correct,
      actualHours: hours,
      actualMinutes: minutes,
      expectedTask: task,
    });
  }, [resolveAttempt, task]);

  useEffect(() => {
    if (gameMode !== 'challenge' || done || feedback || !task) {
      return;
    }
    if (challengeTimeLeft <= 0) {
      resolveAttempt({
        correct: false,
        actualHours: task.hours,
        actualMinutes: task.minutes,
        expectedTask: task,
        feedbackOverride: {
          ...buildClockTimeoutFeedback(section, task, translations),
        },
      });
      return;
    }

    const timerId = window.setTimeout(() => {
      setChallengeTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [challengeTimeLeft, done, feedback, gameMode, resolveAttempt, task, section, translations]);

  useEffect(() => () => clearAdvanceTimeout(), [clearAdvanceTimeout]);

  const showStandalonePracticeSummary = done && gameMode === 'practice' && !props.onPracticeCompleted;
  const resolvedCompletionPrimaryActionLabel = props.completionPrimaryActionLabel ?? translateClockTrainingWithFallback(
    translations,
    'actions.finish',
    'Zakończ ćwiczenie ✅'
  );

  const contextValue = useMemo(() => ({
    props,
    state: {
      gameMode,
      tasks,
      current,
      score,
      feedback,
      done,
      xpEarned,
      xpBreakdown,
      submitNextStep,
      retryAddedCount,
      challengeTimeLeft,
      challengeStreak,
      challengeBestStreak,
      challengeMedal,
      isCoarsePointer,
      trainingSectionContent,
      translations,
      showStandalonePracticeSummary,
      resolvedCompletionPrimaryActionLabel,
      task,
      section,
    },
    actions: {
      handleSubmit,
      resetSession,
      onFinish: props.onCompletionPrimaryAction ?? props.onFinish,
    },
  }), [
    props,
    gameMode,
    tasks,
    current,
    score,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    submitNextStep,
    retryAddedCount,
    challengeTimeLeft,
    challengeStreak,
    challengeBestStreak,
    challengeMedal,
    isCoarsePointer,
    trainingSectionContent,
    translations,
    showStandalonePracticeSummary,
    resolvedCompletionPrimaryActionLabel,
    task,
    handleSubmit,
    resetSession,
  ]);

  return (
    <ClockTrainingContext.Provider value={contextValue}>
      {children}
    </ClockTrainingContext.Provider>
  );
}

export function useClockTrainingContext(): ClockTrainingContextValue {
  const context = useContext(ClockTrainingContext);
  if (!context) {
    throw internalError('useClockTrainingContext must be used within a ClockTrainingProvider');
  }
  return context;
}
