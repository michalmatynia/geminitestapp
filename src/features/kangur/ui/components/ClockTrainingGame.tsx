// @ts-nocheck
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  KangurButton,
  KangurInfoCard,
  KangurInlineFallback,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type {
  ClockChallengeMedal,
  ClockChallengeResult,
  ClockGameMode,
  ClockTask,
  ClockTrainingTaskPoolId,
} from './clock-training-utils';
import {
  CHALLENGE_TIME_LIMIT_SECONDS,
  buildClockCorrectFeedback,
  buildClockTaskPrompt,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  createClockTaskSet,
  resolveClockChallengeMedal,
  resolveClockPracticeTaskSet,
  scheduleRetryTask,
  taskToKey,
  pad,
} from './clock-training-utils';
import { getClockTrainingSectionContent } from './clock-training-data';

import { DraggableClock } from './clock-training/DraggableClock';
import { ClockTrainingSummary } from './clock-training/ClockTrainingSummary';

type ClockTrainingGameProps = {
  completionPrimaryActionLabel?: string;
  enableAdaptiveRetry?: boolean;
  hideModeSwitch?: boolean;
  initialMode?: ClockGameMode;
  onCompletionPrimaryAction?: () => void;
  onFinish: () => void;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
  onPracticeSuccess?: () => void;
  onModeChange?: (mode: ClockGameMode) => void;
  onChallengeSuccess?: (result: ClockChallengeResult) => void;
  practiceTasks?: ClockTask[];
  section?: ClockTrainingTaskPoolId;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

type Feedback = 'correct' | 'wrong' | null;

type ClockFeedback = {
  kind: Feedback;
  title: string;
  details: string;
  tone?: 'near' | 'far';
};

export default function ClockTrainingGame(props: ClockTrainingGameProps): React.JSX.Element {
  const {
    completionPrimaryActionLabel = 'Zakończ ćwiczenie ✅',
    enableAdaptiveRetry = true,
    hideModeSwitch = false,
    initialMode = 'practice',
    onCompletionPrimaryAction,
    onFinish,
    onPracticeCompleted,
    onPracticeSuccess,
    onModeChange,
    onChallengeSuccess,
    practiceTasks,
    section = 'mixed',
    showTaskTitle = true,
    showTimeDisplay = true,
  } = props;
  const [gameMode, setGameMode] = useState<ClockGameMode>(initialMode);
  const [tasks, setTasks] = useState<ClockTask[]>(() =>
    resolveClockPracticeTaskSet(section, practiceTasks)
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
  const trainingSectionContent = getClockTrainingSectionContent(section);

  const task = tasks[current];
  if (!task) {
    return <KangurInlineFallback data-testid='clock-training-empty' title='Brak zadania.' />;
  }
  const currentTaskNumber = Math.min(current + 1, tasks.length);
  const showStandalonePracticeSummary = done && gameMode === 'practice' && !onPracticeCompleted;

  const handleDone = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress();
      const reward = createTrainingReward(progress, {
        activityKey: `training:clock:${section}`,
        lessonKey: 'clock',
        correctAnswers: finalScore,
        totalQuestions: tasks.length,
        strongThresholdPercent: gameMode === 'challenge' ? 80 : 60,
        perfectCounterKey: 'clockPerfect',
      });
      addXp(reward.xp, reward.progressUpdates);
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
        onChallengeSuccess?.({
          correctCount: finalScore,
          medal,
          totalCount: tasks.length,
        });
      } else {
        onPracticeCompleted?.({
          correctCount: finalScore,
          totalCount: tasks.length,
        });
      }
    },
    [gameMode, onChallengeSuccess, onPracticeCompleted, section, tasks.length]
  );

  const clearAdvanceTimeout = useCallback((): void => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const resetSession = useCallback(
    (mode: ClockGameMode = gameMode): void => {
      clearAdvanceTimeout();
      onModeChange?.(mode);
      setGameMode(mode);
      setTasks(
        mode === 'challenge'
          ? createClockTaskSet(section)
          : resolveClockPracticeTaskSet(section, practiceTasks)
      );
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
    [clearAdvanceTimeout, gameMode, onModeChange, practiceTasks, section]
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
        setScore((prevScore) => prevScore + 1);
        if (gameMode === 'challenge') {
          const nextStreak = challengeStreak + 1;
          setChallengeStreak(nextStreak);
          setChallengeBestStreak((value) => Math.max(value, nextStreak));
        } else if (!onPracticeCompleted) {
          onPracticeSuccess?.();
        }
        setFeedback(
          feedbackOverride ??
            buildClockCorrectFeedback(section, expectedTask, {
              gameMode,
              streak: challengeStreak + 1,
            })
        );
      } else {
        if (gameMode === 'challenge') {
          setChallengeStreak(0);
        }

        let selectedFeedback =
          feedbackOverride ??
          buildClockWrongFeedback(
            actualHours,
            actualMinutes,
            expectedTask.hours,
            expectedTask.minutes,
            section
          );

        if (gameMode === 'practice' && enableAdaptiveRetry) {
          const retryPlan = scheduleRetryTask(tasks, retryCounts, expectedTask);
          nextTaskCount = retryPlan.tasks.length;
          if (retryPlan.added) {
            setTasks(retryPlan.tasks);
            setRetryCounts(retryPlan.retryCounts);
            setRetryAddedCount((value) => value + 1);
            selectedFeedback = {
              ...selectedFeedback,
              details: `${selectedFeedback.details} Dodaliśmy krótką powtórkę tego zadania.`,
            };
          }
        }

        setFeedback(selectedFeedback);
      }

      const feedbackDelay = correct ? 1200 : gameMode === 'challenge' ? 1400 : 2100;
      const isLastTask = current + 1 >= nextTaskCount;
      setSubmitNextStep(
        isLastTask
          ? gameMode === 'challenge' || !onPracticeCompleted
            ? 'summary'
            : 'next-stage'
          : 'next-task'
      );
      clearAdvanceTimeout();
      advanceTimeoutRef.current = window.setTimeout(() => {
        if (isLastTask) {
          if (gameMode === 'challenge') {
            setFeedback(null);
          }
          setSubmitNextStep(null);
          advanceTimeoutRef.current = null;
          handleDone(scoreAfterAttempt);
          return;
        }

        setFeedback(null);
        setSubmitNextStep(null);
        setCurrent((prev) => prev + 1);
        if (gameMode === 'challenge') {
          setChallengeTimeLeft(CHALLENGE_TIME_LIMIT_SECONDS);
        }
        advanceTimeoutRef.current = null;
      }, feedbackDelay);
    },
    [
      challengeStreak,
      clearAdvanceTimeout,
      current,
      enableAdaptiveRetry,
      gameMode,
      handleDone,
      onPracticeCompleted,
      onPracticeSuccess,
      retryCounts,
      score,
      tasks,
      section,
    ]
  );

  const handleSubmit = (hours: number, minutes: number): void => {
    const correct = hours === task.hours && minutes === task.minutes;
    resolveAttempt({
      correct,
      actualHours: hours,
      actualMinutes: minutes,
      expectedTask: task,
    });
  };

  useEffect(() => {
    if (gameMode !== 'challenge' || done || feedback) {
      return;
    }
    if (challengeTimeLeft <= 0) {
      resolveAttempt({
        correct: false,
        actualHours: task.hours,
        actualMinutes: task.minutes,
        expectedTask: task,
        feedbackOverride: {
          ...buildClockTimeoutFeedback(section, task),
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
  }, [challengeTimeLeft, done, feedback, gameMode, resolveAttempt, task, section]);

  useEffect(() => () => clearAdvanceTimeout(), [clearAdvanceTimeout]);

  const completionAction = onCompletionPrimaryAction ?? onFinish;

  if (done && (gameMode === 'challenge' || showStandalonePracticeSummary)) {
    return (
      <ClockTrainingSummary
        score={score}
        tasksCount={tasks.length}
        gameMode={gameMode}
        xpEarned={xpEarned}
        xpBreakdown={xpBreakdown}
        challengeMedal={challengeMedal}
        challengeBestStreak={challengeBestStreak}
        retryAddedCount={retryAddedCount}
        section={section}
        completionPrimaryActionLabel={completionPrimaryActionLabel}
        onFinish={completionAction}
        onRestart={() => resetSession(gameMode)}
      />
    );
  }

  const taskSummaryTitle = showTaskTitle ? `${task.hours}:${pad(task.minutes)}` : undefined;

  return (
    <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      {!hideModeSwitch ? (
        <div
          data-testid='clock-mode-switch'
          className={cn(
            KANGUR_SEGMENTED_CONTROL_CLASSNAME,
            'w-full sm:w-auto sm:flex-wrap sm:justify-center'
          )}
        >
          <KangurButton
            data-testid='clock-mode-practice'
            onClick={() => resetSession('practice')}
            className='h-10 flex-1 px-4 text-xs sm:flex-none'
            size='sm'
            variant={gameMode === 'practice' ? 'segmentActive' : 'segment'}
          >
            Tryb Nauka
          </KangurButton>
          <KangurButton
            data-testid='clock-mode-challenge'
            onClick={() => resetSession('challenge')}
            className='h-10 flex-1 px-4 text-xs sm:flex-none'
            size='sm'
            variant={gameMode === 'challenge' ? 'segmentActive' : 'segment'}
          >
            Tryb Wyzwanie
          </KangurButton>
        </div>
      ) : null}
      {section !== 'mixed' &&
      gameMode !== 'challenge' &&
      trainingSectionContent.guidanceTitle &&
      trainingSectionContent.guidance &&
      trainingSectionContent.legend ? (
        <KangurInfoCard
          accent={trainingSectionContent.accent}
          className='w-full max-w-md'
          data-testid='clock-training-guidance'
          padding='md'
          tone='accent'
        >
          <p
            className='text-sm font-semibold [color:var(--kangur-page-text)]'
            data-testid='clock-training-guidance-title'
          >
            {trainingSectionContent.guidanceTitle}
          </p>
          <p className='mt-2 text-sm font-normal leading-relaxed [color:var(--kangur-page-text)]'>
            {trainingSectionContent.guidance}
          </p>
          <p className='mt-2 text-xs font-normal [color:var(--kangur-page-muted-text)]'>
            {trainingSectionContent.legend}
          </p>
        </KangurInfoCard>
      ) : null}
      {gameMode === 'challenge' ? (
        <div className='inline-flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent='amber'
            className='text-xs font-bold uppercase tracking-[0.16em]'
            data-testid='clock-challenge-pill'
          >
            Wyzwanie
          </KangurStatusChip>
          <KangurStatusChip
            accent='amber'
            className='gap-2 text-xs font-bold'
            data-testid='clock-challenge-timer'
          >
            ⏱ {challengeTimeLeft}s
          </KangurStatusChip>
          <KangurStatusChip
            accent='amber'
            className='gap-2 text-xs font-bold'
            data-testid='clock-challenge-streak'
          >
            🔥 Seria {Math.min(current + 1, tasks.length)}/{tasks.length}
          </KangurStatusChip>
        </div>
      ) : (
        <div className='inline-flex flex-wrap items-center gap-2'>
          <KangurStatusChip
            accent='indigo'
            className='gap-2 text-xs font-bold'
            data-testid='clock-practice-series'
          >
            Seria {Math.min(current + 1, tasks.length)}/{tasks.length}
          </KangurStatusChip>
          {retryAddedCount > 0 ? (
            <KangurStatusChip
              accent='indigo'
              className='text-xs font-semibold'
              data-testid='clock-retry-count'
            >
              Powtórki adaptacyjne: {retryAddedCount}
            </KangurStatusChip>
          ) : null}
        </div>
      )}
      <div className='flex flex-col items-center gap-2' data-testid='clock-task-progress'>
        <p
          className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'
          data-testid='clock-task-progress-label'
        >
          Zadanie {currentTaskNumber} z {tasks.length}
        </p>
        <div className='flex items-center gap-1.5' data-testid='clock-task-progress-pills'>
          {tasks.map((_, index) => {
            const isCompleted = index < current || (done && index === current);
            const isActive = !done && index === current;
            return (
              <span
                key={`${taskToKey(tasks[index]!)}-${index}`}
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[12px] min-w-[12px]',
                  isActive
                    ? [gameMode === 'challenge' ? 'w-7 bg-amber-500' : 'w-7 bg-indigo-500']
                    : isCompleted
                      ? [gameMode === 'challenge' ? 'w-4 bg-amber-200' : 'w-4 bg-indigo-200']
                      : KANGUR_PENDING_STEP_PILL_CLASSNAME
                )}
                data-testid={`clock-task-progress-pill-${index}`}
              />
            );
          })}
        </div>
      </div>

      <KangurSummaryPanel
        accent='amber'
        align='center'
        className='w-full max-w-md'
        label={trainingSectionContent.promptLabel}
        padding='md'
        title={taskSummaryTitle}
        tone='accent'
      >
        <p data-testid='clock-task-prompt' className='text-xs font-semibold text-amber-700/80 mt-1'>
          {buildClockTaskPrompt(task, section)}
        </p>
      </KangurSummaryPanel>

      <DraggableClock
        onSubmit={handleSubmit}
        showChallengeRing={gameMode === 'challenge'}
        challengeTimeLeft={challengeTimeLeft}
        challengeTimeLimit={CHALLENGE_TIME_LIMIT_SECONDS}
        section={section}
        showTimeDisplay={showTimeDisplay}
        submitFeedback={feedback?.kind ?? (done && gameMode === 'practice' ? 'correct' : null)}
        submitFeedbackDetails={feedback?.details ?? null}
        submitFeedbackTitle={feedback?.title ?? null}
        submitNextStep={submitNextStep}
        submitLocked={feedback !== null || done}
      />
    </div>
  );
}

export {
  angleToMinute,
  applyHourAngleToCycleMinutes,
  applyMinuteStepToCycleMinutes,
  applyMinuteValueToCycleMinutes,
  buildClockCorrectFeedback,
  buildClockTaskPrompt,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  cycleMinutesToDisplayHour,
  cycleMinutesToDisplayMinutes,
  cycleMinutesToHourAngle,
  getClockDistanceInMinutes,
  getClockTrainingSummaryMessage,
  scheduleRetryTask,
  taskToKey,
} from './clock-training-utils';
