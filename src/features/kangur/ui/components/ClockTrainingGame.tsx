// @ts-nocheck
'use client';

import { Printer } from 'lucide-react';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import { KangurButton, KangurInlineFallback } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameBinaryFeedbackState,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { translateClockTrainingWithFallback } from './clock-training-i18n';
import { ClockTrainingGameView } from './ClockTrainingGame.views';

import type {
  ClockChallengeMedal,
  ClockChallengeResult,
  ClockGameMode,
  ClockTask,
  ClockTrainingTaskPoolId,
} from './clock-training/types';
import {
  CHALLENGE_TIME_LIMIT_SECONDS,
  buildClockCorrectFeedback,
  buildClockTaskPrompt,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  createClockTaskSet,
  getClockTrainingSummaryMessage,
  resolveClockChallengeMedal,
  resolveClockPracticeTaskSet,
  scheduleRetryTask,
} from './clock-training-utils';
import { getClockTrainingSectionContent } from './clock-training-data';

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
  showHourHand?: boolean;
  showMinuteHand?: boolean;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

type ClockFeedback = {
  kind: KangurMiniGameBinaryFeedbackState;
  title: string;
  details: string;
  tone?: 'near' | 'far';
};

type ResolvedClockTrainingGameProps = {
  completionPrimaryActionLabel?: string;
  enableAdaptiveRetry: boolean;
  hideModeSwitch: boolean;
  initialMode: ClockGameMode;
  onChallengeSuccess?: (result: ClockChallengeResult) => void;
  onCompletionPrimaryAction?: () => void;
  onFinish: () => void;
  onModeChange?: (mode: ClockGameMode) => void;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
  onPracticeSuccess?: () => void;
  practiceTasks?: ClockTask[];
  section: ClockTrainingTaskPoolId;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showTaskTitle: boolean;
  showTimeDisplay: boolean;
};

const resolveClockTrainingGameBehaviorDefaults = (
  props: ClockTrainingGameProps
): Pick<
  ResolvedClockTrainingGameProps,
  'enableAdaptiveRetry' | 'hideModeSwitch' | 'initialMode' | 'section'
> => ({
  enableAdaptiveRetry: props.enableAdaptiveRetry ?? true,
  hideModeSwitch: props.hideModeSwitch ?? false,
  initialMode: props.initialMode ?? 'practice',
  section: props.section ?? 'mixed',
});

const resolveClockTrainingGameVisualDefaults = (
  props: ClockTrainingGameProps
): Pick<
  ResolvedClockTrainingGameProps,
  'showHourHand' | 'showMinuteHand' | 'showTaskTitle' | 'showTimeDisplay'
> => ({
  showHourHand: props.showHourHand ?? true,
  showMinuteHand: props.showMinuteHand ?? true,
  showTaskTitle: props.showTaskTitle ?? true,
  showTimeDisplay: props.showTimeDisplay ?? true,
});

const resolveClockTrainingGameProps = (
  props: ClockTrainingGameProps
): ResolvedClockTrainingGameProps => ({
  completionPrimaryActionLabel: props.completionPrimaryActionLabel,
  ...resolveClockTrainingGameBehaviorDefaults(props),
  onChallengeSuccess: props.onChallengeSuccess,
  onCompletionPrimaryAction: props.onCompletionPrimaryAction,
  onFinish: props.onFinish,
  onModeChange: props.onModeChange,
  onPracticeCompleted: props.onPracticeCompleted,
  onPracticeSuccess: props.onPracticeSuccess,
  practiceTasks: props.practiceTasks,
  ...resolveClockTrainingGameVisualDefaults(props),
});

const resolveClockTrainingResolvedCompletionPrimaryActionLabel = ({
  completionPrimaryActionLabel,
  translations,
}: {
  completionPrimaryActionLabel?: string;
  translations: ReturnType<typeof useTranslations>;
}): string =>
  completionPrimaryActionLabel ??
  translateClockTrainingWithFallback(
    translations,
    'actions.finish',
    'Zakończ ćwiczenie ✅'
  );

const resolveClockTrainingShowStandalonePracticeSummary = ({
  done,
  gameMode,
  onPracticeCompleted,
}: {
  done: boolean;
  gameMode: ClockGameMode;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
}): boolean => done && gameMode === 'practice' && !onPracticeCompleted;

const resolveClockTrainingStrongThresholdPercent = (gameMode: ClockGameMode): number =>
  gameMode === 'challenge' ? 80 : 60;

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

const resolveClockTrainingFeedbackDelay = (
  correct: boolean,
  gameMode: ClockGameMode
): number => (correct ? 1200 : gameMode === 'challenge' ? 1400 : 2100);

const resolveClockTrainingSubmitNextStep = ({
  gameMode,
  isLastTask,
  onPracticeCompleted,
}: {
  gameMode: ClockGameMode;
  isLastTask: boolean;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
}): 'next-stage' | 'next-task' | 'summary' => {
  if (!isLastTask) {
    return 'next-task';
  }

  return gameMode === 'challenge' || !onPracticeCompleted ? 'summary' : 'next-stage';
};

const handleClockTrainingCorrectAttempt = ({
  challengeStreak,
  expectedTask,
  feedbackOverride,
  gameMode,
  onPracticeCompleted,
  onPracticeSuccess,
  section,
  setChallengeBestStreak,
  setChallengeStreak,
  setFeedback,
  setScore,
  translations,
}: {
  challengeStreak: number;
  expectedTask: ClockTask;
  feedbackOverride?: ClockFeedback;
  gameMode: ClockGameMode;
  onPracticeCompleted?: (result: { correctCount: number; totalCount: number }) => void;
  onPracticeSuccess?: () => void;
  section: ClockTrainingTaskPoolId;
  setChallengeBestStreak: React.Dispatch<React.SetStateAction<number>>;
  setChallengeStreak: React.Dispatch<React.SetStateAction<number>>;
  setFeedback: React.Dispatch<React.SetStateAction<ClockFeedback | null>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  translations: ReturnType<typeof useTranslations>;
}): void => {
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
};

const resolveClockTrainingWrongAttemptFeedback = ({
  actualHours,
  actualMinutes,
  enableAdaptiveRetry,
  expectedTask,
  feedbackOverride,
  gameMode,
  retryCounts,
  section,
  tasks,
  translations,
}: {
  actualHours: number;
  actualMinutes: number;
  enableAdaptiveRetry: boolean;
  expectedTask: ClockTask;
  feedbackOverride?: ClockFeedback;
  gameMode: ClockGameMode;
  retryCounts: Record<string, number>;
  section: ClockTrainingTaskPoolId;
  tasks: ClockTask[];
  translations: ReturnType<typeof useTranslations>;
}): {
  nextTaskCount: number;
  retryPlan:
    | ReturnType<typeof scheduleRetryTask>
    | null;
  selectedFeedback: ClockFeedback;
} => {
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

  if (gameMode !== 'practice' || !enableAdaptiveRetry) {
    return {
      nextTaskCount: tasks.length,
      retryPlan: null,
      selectedFeedback: selectedBaseFeedback,
    };
  }

  const retryPlan = scheduleRetryTask(tasks, retryCounts, expectedTask);
  if (!retryPlan.added) {
    return {
      nextTaskCount: retryPlan.tasks.length,
      retryPlan,
      selectedFeedback: selectedBaseFeedback,
    };
  }

  return {
    nextTaskCount: retryPlan.tasks.length,
    retryPlan,
    selectedFeedback: {
      ...selectedBaseFeedback,
      details: `${selectedBaseFeedback.details} ${translateClockTrainingWithFallback(
        translations,
        'adaptiveRetryAdded',
        'Dodaliśmy krótką powtórkę tego zadania.'
      )}`,
    },
  };
};

const handleClockTrainingWrongAttempt = ({
  actualHours,
  actualMinutes,
  enableAdaptiveRetry,
  expectedTask,
  feedbackOverride,
  gameMode,
  retryCounts,
  section,
  setChallengeStreak,
  setFeedback,
  setRetryAddedCount,
  setRetryCounts,
  setTasks,
  tasks,
  translations,
}: {
  actualHours: number;
  actualMinutes: number;
  enableAdaptiveRetry: boolean;
  expectedTask: ClockTask;
  feedbackOverride?: ClockFeedback;
  gameMode: ClockGameMode;
  retryCounts: Record<string, number>;
  section: ClockTrainingTaskPoolId;
  setChallengeStreak: React.Dispatch<React.SetStateAction<number>>;
  setFeedback: React.Dispatch<React.SetStateAction<ClockFeedback | null>>;
  setRetryAddedCount: React.Dispatch<React.SetStateAction<number>>;
  setRetryCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setTasks: React.Dispatch<React.SetStateAction<ClockTask[]>>;
  tasks: ClockTask[];
  translations: ReturnType<typeof useTranslations>;
}): number => {
  if (gameMode === 'challenge') {
    setChallengeStreak(0);
  }

  const { nextTaskCount, retryPlan, selectedFeedback } = resolveClockTrainingWrongAttemptFeedback({
    actualHours,
    actualMinutes,
    enableAdaptiveRetry,
    expectedTask,
    feedbackOverride,
    gameMode,
    retryCounts,
    section,
    tasks,
    translations,
  });

  if (retryPlan?.added) {
    setTasks(retryPlan.tasks);
    setRetryCounts(retryPlan.retryCounts);
    setRetryAddedCount((value) => value + 1);
  }

  setFeedback(selectedFeedback);
  return nextTaskCount;
};

const scheduleClockTrainingAdvance = ({
  clearAdvanceTimeout,
  delayMs,
  gameMode,
  handleDone,
  isLastTask,
  scoreAfterAttempt,
  setChallengeTimeLeft,
  setCurrent,
  setFeedback,
  setSubmitNextStep,
}: {
  clearAdvanceTimeout: () => void;
  delayMs: number;
  gameMode: ClockGameMode;
  handleDone: (finalScore: number) => void;
  isLastTask: boolean;
  scoreAfterAttempt: number;
  setChallengeTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
  setFeedback: React.Dispatch<React.SetStateAction<ClockFeedback | null>>;
  setSubmitNextStep: React.Dispatch<
    React.SetStateAction<'next-stage' | 'next-task' | 'summary' | null>
  >;
}): number => {
  clearAdvanceTimeout();
  return window.setTimeout(() => {
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
};

export default function ClockTrainingGame(props: ClockTrainingGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const gamePageTranslations = useTranslations('KangurGamePage');
  const {
    completionPrimaryActionLabel,
    enableAdaptiveRetry,
    hideModeSwitch,
    initialMode,
    onCompletionPrimaryAction,
    onFinish,
    onPracticeCompleted,
    onPracticeSuccess,
    onModeChange,
    onChallengeSuccess,
    practiceTasks,
    section,
    showHourHand,
    showMinuteHand,
    showTaskTitle,
    showTimeDisplay,
  } = resolveClockTrainingGameProps(props);
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const [gameMode, setGameMode] = useState<ClockGameMode>(initialMode);
  const [tasks, setTasks] = useState<ClockTask[]>(() =>
    resolveClockTrainingTaskSet({
      gameMode: 'practice',
      practiceTasks,
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
  const trainingSectionContent = getClockTrainingSectionContent(section, translations);
  const printPanelId = `clock-training-${section}`;
  const resolvedCompletionPrimaryActionLabel =
    resolveClockTrainingResolvedCompletionPrimaryActionLabel({
      completionPrimaryActionLabel,
      translations,
    });
  const printPanelLabel = lessonNavigationTranslations('printPanel');

  const task = tasks[current];
  if (!task) {
    return (
      <KangurInlineFallback
        data-testid='clock-training-empty'
        title={translateClockTrainingWithFallback(translations, 'emptyState', 'Brak zadania.')}
      />
    );
  }
  const showStandalonePracticeSummary = resolveClockTrainingShowStandalonePracticeSummary({
    done,
    gameMode,
    onPracticeCompleted,
  });

  const handleDone = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress({ ownerKey });
      const reward = createTrainingReward(progress, {
        activityKey: `training:clock:${section}`,
        lessonKey: 'clock',
        correctAnswers: finalScore,
        totalQuestions: tasks.length,
        strongThresholdPercent: resolveClockTrainingStrongThresholdPercent(gameMode),
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
    [gameMode, onChallengeSuccess, onPracticeCompleted, ownerKey, section, tasks.length]
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
      setTasks(resolveClockTrainingTaskSet({ gameMode: mode, practiceTasks, section }));
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
        handleClockTrainingCorrectAttempt({
          challengeStreak,
          expectedTask,
          feedbackOverride,
          gameMode,
          onPracticeCompleted,
          onPracticeSuccess,
          section,
          setChallengeBestStreak,
          setChallengeStreak,
          setFeedback,
          setScore,
          translations,
        });
      } else {
        nextTaskCount = handleClockTrainingWrongAttempt({
          actualHours,
          actualMinutes,
          enableAdaptiveRetry,
          expectedTask,
          feedbackOverride,
          gameMode,
          retryCounts,
          section,
          setChallengeStreak,
          setFeedback,
          setRetryAddedCount,
          setRetryCounts,
          setTasks,
          tasks,
          translations,
        });
      }

      const isLastTask = current + 1 >= nextTaskCount;
      setSubmitNextStep(
        resolveClockTrainingSubmitNextStep({
          gameMode,
          isLastTask,
          onPracticeCompleted,
        })
      );
      advanceTimeoutRef.current = scheduleClockTrainingAdvance({
        clearAdvanceTimeout,
        delayMs: resolveClockTrainingFeedbackDelay(correct, gameMode),
        gameMode,
        handleDone,
        isLastTask,
        scoreAfterAttempt,
        setChallengeTimeLeft,
        setCurrent,
        setFeedback,
        setSubmitNextStep,
      });
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
      translations,
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

  const completionAction = onCompletionPrimaryAction ?? onFinish;
  const printPanelTitle = trainingSectionContent.promptLabel;
  const printTaskPrompt = buildClockTaskPrompt(task, section, translations);
  const printHint = gamePageTranslations('practiceQuestion.printHint');
  const printTargetTime = `${task.hours}:${String(task.minutes).padStart(2, '0')}`;
  const printScoreLabel = `${score}/${tasks.length}`;
  const printSummaryMessage = getClockTrainingSummaryMessage(
    section,
    score,
    tasks.length,
    translations
  );

  return (
    <div
      data-kangur-print-panel='true'
      data-kangur-print-paged-panel='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      data-testid='clock-training-print-panel'
    >
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid='clock-training-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {printPanelTitle}
        </div>
        {done ? (
          <>
            <p className='text-base font-semibold leading-relaxed text-slate-900'>
              {printSummaryMessage}
            </p>
            <p className='text-sm text-slate-700'>{printScoreLabel}</p>
          </>
        ) : (
          <>
            <p className='text-base font-semibold leading-relaxed text-slate-900'>
              {printTaskPrompt}
            </p>
            <p className='text-sm text-slate-700'>{printTargetTime}</p>
          </>
        )}
        <p className='text-sm text-slate-600'>{printHint}</p>
      </div>

      <div data-kangur-print-exclude='true' data-testid='clock-training-live-ui'>
        {lessonPrint?.onPrintPanel ? (
          <div className='mb-4 flex justify-end'>
            <KangurButton
              onClick={() => lessonPrint.onPrintPanel?.(printPanelId)}
              className={isCoarsePointer ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]' : undefined}
              data-testid='clock-training-print-button'
              size='sm'
              type='button'
              variant='surface'
              aria-label={printPanelLabel}
              title={printPanelLabel}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          </div>
        ) : null}

        <ClockTrainingGameView
          challengeBestStreak={challengeBestStreak}
          challengeMedal={challengeMedal}
          challengeTimeLeft={challengeTimeLeft}
          completionAction={completionAction}
          current={current}
          done={done}
          feedback={feedback}
          gameMode={gameMode}
          handleSubmit={handleSubmit}
          hideModeSwitch={hideModeSwitch}
          isCoarsePointer={isCoarsePointer}
          onResetSession={resetSession}
          resolvedCompletionPrimaryActionLabel={resolvedCompletionPrimaryActionLabel}
          retryAddedCount={retryAddedCount}
          score={score}
          section={section}
          showHourHand={showHourHand}
          showMinuteHand={showMinuteHand}
          showStandalonePracticeSummary={showStandalonePracticeSummary}
          showTaskTitle={showTaskTitle}
          showTimeDisplay={showTimeDisplay}
          submitNextStep={submitNextStep}
          task={task}
          tasks={tasks}
          trainingSectionContent={trainingSectionContent}
          translations={translations}
          xpBreakdown={xpBreakdown}
          xpEarned={xpEarned}
        />
      </div>
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
