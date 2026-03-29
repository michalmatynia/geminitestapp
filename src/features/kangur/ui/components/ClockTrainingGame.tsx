// @ts-nocheck
'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

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
  KANGUR_INLINE_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
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
import { cn } from '@/features/kangur/shared/utils';
import { translateClockTrainingWithFallback } from './clock-training-i18n';

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

const resolveClockTrainingCurrentTaskNumber = (current: number, tasksCount: number): number =>
  Math.min(current + 1, tasksCount);

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

function ClockTrainingModeSwitch({
  gameMode,
  isCoarsePointer,
  onResetSession,
  translations,
}: {
  gameMode: ClockGameMode;
  isCoarsePointer: boolean;
  onResetSession: (mode: ClockGameMode) => void;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div
      data-testid='clock-mode-switch'
      className={cn(
        KANGUR_SEGMENTED_CONTROL_CLASSNAME,
        'w-full sm:w-auto sm:flex-wrap sm:justify-center'
      )}
    >
      <KangurButton
        data-testid='clock-mode-practice'
        onClick={() => onResetSession('practice')}
        className={cn(
          'h-10 flex-1 px-4 text-xs touch-manipulation select-none sm:flex-none',
          isCoarsePointer && 'min-h-12 active:scale-[0.98]'
        )}
        size='sm'
        variant={gameMode === 'practice' ? 'segmentActive' : 'segment'}
      >
        {translateClockTrainingWithFallback(translations, 'mode.practice', 'Tryb Nauka')}
      </KangurButton>
      <KangurButton
        data-testid='clock-mode-challenge'
        onClick={() => onResetSession('challenge')}
        className={cn(
          'h-10 flex-1 px-4 text-xs touch-manipulation select-none sm:flex-none',
          isCoarsePointer && 'min-h-12 active:scale-[0.98]'
        )}
        size='sm'
        variant={gameMode === 'challenge' ? 'segmentActive' : 'segment'}
      >
        {translateClockTrainingWithFallback(translations, 'mode.challenge', 'Tryb Wyzwanie')}
      </KangurButton>
    </div>
  );
}

function ClockTrainingGuidance({
  trainingSectionContent,
}: {
  trainingSectionContent: ReturnType<typeof getClockTrainingSectionContent>;
}): React.JSX.Element | null {
  if (
    !trainingSectionContent.guidanceTitle ||
    !trainingSectionContent.guidance ||
    !trainingSectionContent.legend
  ) {
    return null;
  }

  return (
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
  );
}

function ClockTrainingStatusRow({
  challengeTimeLeft,
  current,
  gameMode,
  retryAddedCount,
  tasksCount,
  translations,
}: {
  challengeTimeLeft: number;
  current: number;
  gameMode: ClockGameMode;
  retryAddedCount: number;
  tasksCount: number;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const seriesLabel = translateClockTrainingWithFallback(
    translations,
    'seriesProgress',
    `Seria ${Math.min(current + 1, tasksCount)}/${tasksCount}`,
    {
      current: Math.min(current + 1, tasksCount),
      total: tasksCount,
    }
  );

  if (gameMode === 'challenge') {
    return (
      <div className={KANGUR_INLINE_WRAP_CENTER_ROW_CLASSNAME}>
        <KangurStatusChip
          accent='amber'
          className='text-xs font-bold uppercase tracking-[0.16em]'
          data-testid='clock-challenge-pill'
        >
          {translateClockTrainingWithFallback(translations, 'challengePill', 'Wyzwanie')}
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
          🔥 {seriesLabel}
        </KangurStatusChip>
      </div>
    );
  }

  return (
    <div className={KANGUR_INLINE_WRAP_CENTER_ROW_CLASSNAME}>
      <KangurStatusChip
        accent='indigo'
        className='gap-2 text-xs font-bold'
        data-testid='clock-practice-series'
      >
        {seriesLabel}
      </KangurStatusChip>
      {retryAddedCount > 0 ? (
        <KangurStatusChip
          accent='indigo'
          className='text-xs font-semibold'
          data-testid='clock-retry-count'
        >
          {translateClockTrainingWithFallback(
            translations,
            'adaptiveRetriesWithCount',
            `Powtórki adaptacyjne: ${retryAddedCount}`,
            { count: retryAddedCount }
          )}
        </KangurStatusChip>
      ) : null}
    </div>
  );
}

function ClockTrainingTaskProgressView({
  current,
  done,
  gameMode,
  tasks,
  translations,
}: {
  current: number;
  done: boolean;
  gameMode: ClockGameMode;
  tasks: ClockTask[];
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const currentTaskNumber = resolveClockTrainingCurrentTaskNumber(current, tasks.length);

  return (
    <div className='flex flex-col items-center gap-2' data-testid='clock-task-progress'>
      <p
        className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'
        data-testid='clock-task-progress-label'
      >
        {translateClockTrainingWithFallback(
          translations,
          'taskProgress',
          `Zadanie ${currentTaskNumber} z ${tasks.length}`,
          {
            current: currentTaskNumber,
            total: tasks.length,
          }
        )}
      </p>
      <div className='flex items-center gap-1.5' data-testid='clock-task-progress-pills'>
        {tasks.map((entry, index) => {
          const isCompleted = index < current || (done && index === current);
          const isActive = !done && index === current;
          return (
            <span
              key={`${taskToKey(entry)}-${index}`}
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
  );
}

function ClockTrainingPromptPanel({
  section,
  showTaskTitle,
  task,
  trainingSectionContent,
  translations,
}: {
  section: ClockTrainingTaskPoolId;
  showTaskTitle: boolean;
  task: ClockTask;
  trainingSectionContent: ReturnType<typeof getClockTrainingSectionContent>;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const taskSummaryTitle = showTaskTitle ? `${task.hours}:${pad(task.minutes)}` : undefined;

  return (
    <KangurSummaryPanel
      accent='amber'
      align='center'
      className='w-full max-w-md'
      label={trainingSectionContent.promptLabel}
      padding='md'
      title={taskSummaryTitle}
      tone='accent'
    >
      <p data-testid='clock-task-prompt' className='mt-1 text-xs font-semibold text-amber-700/80'>
        {buildClockTaskPrompt(task, section, translations)}
      </p>
    </KangurSummaryPanel>
  );
}

function ClockTrainingTouchHint({
  translations,
}: {
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <p
      className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
      data-testid='clock-training-touch-hint'
    >
      {translateClockTrainingWithFallback(
        translations,
        'touchHint',
        'Przesuwaj wskazówki palcem, aby ustawić czas.'
      )}
    </p>
  );
}

const resolveClockTrainingCompletedSubmitFeedback = ({
  done,
  gameMode,
}: {
  done: boolean;
  gameMode: ClockGameMode;
}): 'correct' | null => (done && gameMode === 'practice' ? 'correct' : null);

const resolveClockTrainingSubmitFeedback = ({
  done,
  feedback,
  gameMode,
}: {
  done: boolean;
  feedback: ClockFeedback | null;
  gameMode: ClockGameMode;
}): React.ComponentProps<typeof DraggableClock>['submitFeedback'] =>
  feedback?.kind ?? resolveClockTrainingCompletedSubmitFeedback({ done, gameMode });

const shouldShowClockTrainingSummary = ({
  done,
  gameMode,
  showStandalonePracticeSummary,
}: {
  done: boolean;
  gameMode: ClockGameMode;
  showStandalonePracticeSummary: boolean;
}): boolean => done && (gameMode === 'challenge' || showStandalonePracticeSummary);

function ClockTrainingModeSwitchSlot({
  gameMode,
  hideModeSwitch,
  isCoarsePointer,
  onResetSession,
  translations,
}: {
  gameMode: ClockGameMode;
  hideModeSwitch: boolean;
  isCoarsePointer: boolean;
  onResetSession: (mode: ClockGameMode) => void;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element | null {
  if (hideModeSwitch) {
    return null;
  }

  return (
    <ClockTrainingModeSwitch
      gameMode={gameMode}
      isCoarsePointer={isCoarsePointer}
      onResetSession={onResetSession}
      translations={translations}
    />
  );
}

function ClockTrainingGuidanceSlot({
  gameMode,
  section,
  trainingSectionContent,
}: {
  gameMode: ClockGameMode;
  section: ClockTrainingTaskPoolId;
  trainingSectionContent: ReturnType<typeof getClockTrainingSectionContent>;
}): React.JSX.Element | null {
  if (section === 'mixed' || gameMode === 'challenge') {
    return null;
  }

  return <ClockTrainingGuidance trainingSectionContent={trainingSectionContent} />;
}

function ClockTrainingTouchHintSlot({
  isCoarsePointer,
  translations,
}: {
  isCoarsePointer: boolean;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element | null {
  if (!isCoarsePointer) {
    return null;
  }

  return <ClockTrainingTouchHint translations={translations} />;
}

function ClockTrainingFeedbackAnnouncer({
  feedback,
}: {
  feedback: ClockFeedback | null;
}): React.JSX.Element {
  return (
    <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
      {feedback?.title ?? ''}
    </div>
  );
}

function ClockTrainingSummaryView({
  challengeBestStreak,
  challengeMedal,
  completionAction,
  gameMode,
  onResetSession,
  resolvedCompletionPrimaryActionLabel,
  retryAddedCount,
  score,
  section,
  tasks,
  xpBreakdown,
  xpEarned,
}: {
  challengeBestStreak: number;
  challengeMedal: ClockChallengeMedal | null;
  completionAction: () => void;
  gameMode: ClockGameMode;
  onResetSession: (mode: ClockGameMode) => void;
  resolvedCompletionPrimaryActionLabel: string;
  retryAddedCount: number;
  score: number;
  section: ClockTrainingTaskPoolId;
  tasks: ClockTask[];
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
}): React.JSX.Element {
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
      completionPrimaryActionLabel={resolvedCompletionPrimaryActionLabel}
      onFinish={completionAction}
      onRestart={() => onResetSession(gameMode)}
    />
  );
}

function ClockTrainingActiveView({
  challengeTimeLeft,
  current,
  done,
  feedback,
  gameMode,
  handleSubmit,
  hideModeSwitch,
  isCoarsePointer,
  onResetSession,
  retryAddedCount,
  section,
  showHourHand,
  showMinuteHand,
  showTaskTitle,
  showTimeDisplay,
  submitNextStep,
  task,
  tasks,
  trainingSectionContent,
  translations,
}: {
  challengeTimeLeft: number;
  current: number;
  done: boolean;
  feedback: ClockFeedback | null;
  gameMode: ClockGameMode;
  handleSubmit: (hours: number, minutes: number) => void;
  hideModeSwitch: boolean;
  isCoarsePointer: boolean;
  onResetSession: (mode: ClockGameMode) => void;
  retryAddedCount: number;
  section: ClockTrainingTaskPoolId;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showTaskTitle: boolean;
  showTimeDisplay: boolean;
  submitNextStep: 'next-stage' | 'next-task' | 'summary' | null;
  task: ClockTask;
  tasks: ClockTask[];
  trainingSectionContent: ReturnType<typeof getClockTrainingSectionContent>;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <ClockTrainingModeSwitchSlot
        gameMode={gameMode}
        hideModeSwitch={hideModeSwitch}
        isCoarsePointer={isCoarsePointer}
        onResetSession={onResetSession}
        translations={translations}
      />
      <ClockTrainingGuidanceSlot
        gameMode={gameMode}
        section={section}
        trainingSectionContent={trainingSectionContent}
      />
      <ClockTrainingStatusRow
        challengeTimeLeft={challengeTimeLeft}
        current={current}
        gameMode={gameMode}
        retryAddedCount={retryAddedCount}
        tasksCount={tasks.length}
        translations={translations}
      />
      <ClockTrainingTaskProgressView
        current={current}
        done={done}
        gameMode={gameMode}
        tasks={tasks}
        translations={translations}
      />
      <ClockTrainingPromptPanel
        section={section}
        showTaskTitle={showTaskTitle}
        task={task}
        trainingSectionContent={trainingSectionContent}
        translations={translations}
      />
      <ClockTrainingTouchHintSlot
        isCoarsePointer={isCoarsePointer}
        translations={translations}
      />
      <ClockTrainingFeedbackAnnouncer feedback={feedback} />
      <DraggableClock
        onSubmit={handleSubmit}
        showChallengeRing={gameMode === 'challenge'}
        challengeTimeLeft={challengeTimeLeft}
        challengeTimeLimit={CHALLENGE_TIME_LIMIT_SECONDS}
        section={section}
        showHourHand={showHourHand}
        showMinuteHand={showMinuteHand}
        showTimeDisplay={showTimeDisplay}
        submitFeedback={resolveClockTrainingSubmitFeedback({ done, feedback, gameMode })}
        submitFeedbackDetails={feedback?.details ?? null}
        submitFeedbackTitle={feedback?.title ?? null}
        submitNextStep={submitNextStep}
        submitLocked={feedback !== null || done}
      />
    </div>
  );
}

function ClockTrainingGameView({
  challengeTimeLeft,
  completionAction,
  current,
  done,
  feedback,
  gameMode,
  handleSubmit,
  hideModeSwitch,
  isCoarsePointer,
  onResetSession,
  resolvedCompletionPrimaryActionLabel,
  retryAddedCount,
  score,
  section,
  showHourHand,
  showMinuteHand,
  showStandalonePracticeSummary,
  showTaskTitle,
  showTimeDisplay,
  submitNextStep,
  task,
  tasks,
  trainingSectionContent,
  translations,
  xpBreakdown,
  xpEarned,
  challengeBestStreak,
  challengeMedal,
}: {
  challengeBestStreak: number;
  challengeMedal: ClockChallengeMedal | null;
  challengeTimeLeft: number;
  completionAction: () => void;
  current: number;
  done: boolean;
  feedback: ClockFeedback | null;
  gameMode: ClockGameMode;
  handleSubmit: (hours: number, minutes: number) => void;
  hideModeSwitch: boolean;
  isCoarsePointer: boolean;
  onResetSession: (mode: ClockGameMode) => void;
  resolvedCompletionPrimaryActionLabel: string;
  retryAddedCount: number;
  score: number;
  section: ClockTrainingTaskPoolId;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showStandalonePracticeSummary: boolean;
  showTaskTitle: boolean;
  showTimeDisplay: boolean;
  submitNextStep: 'next-stage' | 'next-task' | 'summary' | null;
  task: ClockTask;
  tasks: ClockTask[];
  trainingSectionContent: ReturnType<typeof getClockTrainingSectionContent>;
  translations: ReturnType<typeof useTranslations>;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
}): React.JSX.Element {
  if (shouldShowClockTrainingSummary({ done, gameMode, showStandalonePracticeSummary })) {
    return (
      <ClockTrainingSummaryView
        challengeBestStreak={challengeBestStreak}
        challengeMedal={challengeMedal}
        completionAction={completionAction}
        gameMode={gameMode}
        onResetSession={onResetSession}
        resolvedCompletionPrimaryActionLabel={resolvedCompletionPrimaryActionLabel}
        retryAddedCount={retryAddedCount}
        score={score}
        section={section}
        tasks={tasks}
        xpBreakdown={xpBreakdown}
        xpEarned={xpEarned}
      />
    );
  }

  return (
    <ClockTrainingActiveView
      challengeTimeLeft={challengeTimeLeft}
      current={current}
      done={done}
      feedback={feedback}
      gameMode={gameMode}
      handleSubmit={handleSubmit}
      hideModeSwitch={hideModeSwitch}
      isCoarsePointer={isCoarsePointer}
      onResetSession={onResetSession}
      retryAddedCount={retryAddedCount}
      section={section}
      showHourHand={showHourHand}
      showMinuteHand={showMinuteHand}
      showTaskTitle={showTaskTitle}
      showTimeDisplay={showTimeDisplay}
      submitNextStep={submitNextStep}
      task={task}
      tasks={tasks}
      trainingSectionContent={trainingSectionContent}
      translations={translations}
    />
  );
}

export default function ClockTrainingGame(props: ClockTrainingGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
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
  const resolvedCompletionPrimaryActionLabel =
    resolveClockTrainingResolvedCompletionPrimaryActionLabel({
      completionPrimaryActionLabel,
      translations,
    });

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

  return (
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
