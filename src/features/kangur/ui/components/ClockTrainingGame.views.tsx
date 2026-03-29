// @ts-nocheck
'use client';

import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_INLINE_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { translateClockTrainingWithFallback } from './clock-training-i18n';
import { ClockTrainingSummary } from './clock-training/ClockTrainingSummary';
import { KANGUR_CLOCK_THEME_COLORS } from './clock-theme';
import type {
  ClockChallengeMedal,
  ClockGameMode,
  ClockTask,
  ClockTrainingTaskPoolId,
} from './clock-training/types';
import { CHALLENGE_TIME_LIMIT_SECONDS, buildClockTaskPrompt, pad, taskToKey } from './clock-training-utils';
import { getClockTrainingSectionContent } from './clock-training-data';
import { DraggableClock } from './clock-training/DraggableClock';

type ClockFeedback = {
  kind: 'correct' | 'wrong';
  title: string;
  details: string;
  tone?: 'near' | 'far';
};

const resolveClockTrainingCurrentTaskNumber = (current: number, tasksCount: number): number =>
  Math.min(current + 1, tasksCount);

const resolveClockTrainingProgressPillColor = ({
  gameMode,
  isActive,
}: {
  gameMode: ClockGameMode;
  isActive: boolean;
}): string =>
  gameMode === 'challenge'
    ? isActive
      ? KANGUR_CLOCK_THEME_COLORS.progressChallengeActive
      : KANGUR_CLOCK_THEME_COLORS.progressChallengeDone
    : isActive
      ? KANGUR_CLOCK_THEME_COLORS.progressPracticeActive
      : KANGUR_CLOCK_THEME_COLORS.progressPracticeDone;

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
                isActive ? 'w-7' : isCompleted ? 'w-4' : KANGUR_PENDING_STEP_PILL_CLASSNAME
              )}
              data-testid={`clock-task-progress-pill-${index}`}
              style={
                isActive || isCompleted
                  ? {
                      backgroundColor: resolveClockTrainingProgressPillColor({
                        gameMode,
                        isActive,
                      }),
                    }
                  : undefined
              }
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
      <p
        data-testid='clock-task-prompt'
        className='mt-1 text-xs font-semibold'
        style={{ color: KANGUR_CLOCK_THEME_COLORS.promptText }}
      >
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

export function ClockTrainingGameView({
  challengeBestStreak,
  challengeMedal,
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
