'use client';

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
import { cn } from '@/features/kangur/shared/utils';

import { translateClockTrainingWithFallback } from './clock-training-i18n';
import { ClockTrainingSummary } from '../clock-training/ClockTrainingSummary';
import { KANGUR_CLOCK_THEME_COLORS } from '../clock-theme';
import type {
  ClockGameMode,
} from '../clock-training/types';
import { CHALLENGE_TIME_LIMIT_SECONDS, buildClockTaskPrompt, pad, taskToKey } from './clock-training-utils';
import { DraggableClock } from '../clock-training/DraggableClock';
import { useClockTrainingContext } from './ClockTraining.context';
import type { ClockFeedback } from '../clock-training/types';

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

function ClockTrainingModeSwitch(): React.JSX.Element {
  const { state, actions } = useClockTrainingContext();
  const { gameMode, isCoarsePointer, translations } = state;
  const { resetSession } = actions;

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
        onClick={() => resetSession('practice')}
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
        onClick={() => resetSession('challenge')}
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

function ClockTrainingGuidance(): React.JSX.Element | null {
  const { state } = useClockTrainingContext();
  const { trainingSectionContent } = state;

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

function ClockTrainingStatusRow(): React.JSX.Element {
  const { state } = useClockTrainingContext();
  const {
    challengeTimeLeft,
    current,
    gameMode,
    retryAddedCount,
    tasks,
    translations,
  } = state;
  const tasksCount = tasks.length;

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

function ClockTrainingTaskProgressView(): React.JSX.Element {
  const { state } = useClockTrainingContext();
  const { current, done, gameMode, tasks, translations } = state;
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

function ClockTrainingPromptPanel(): React.JSX.Element {
  const { props, state } = useClockTrainingContext();
  const { section, task, trainingSectionContent, translations } = state;
  const { showTaskTitle } = props;

  if (!task) {
    return <></>;
  }

  const taskSummaryTitle = (showTaskTitle ?? true) ? `${task.hours}:${pad(task.minutes)}` : undefined;

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

function ClockTrainingTouchHint(): React.JSX.Element {
  const { state } = useClockTrainingContext();
  const { translations } = state;

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

function ClockTrainingModeSwitchSlot(): React.JSX.Element | null {
  const { props } = useClockTrainingContext();
  const { hideModeSwitch } = props;

  if (hideModeSwitch) {
    return null;
  }

  return <ClockTrainingModeSwitch />;
}

function ClockTrainingGuidanceSlot(): React.JSX.Element | null {
  const { state } = useClockTrainingContext();
  const { gameMode, section } = state;

  if (section === 'mixed' || gameMode === 'challenge') {
    return null;
  }

  return <ClockTrainingGuidance />;
}

function ClockTrainingTouchHintSlot(): React.JSX.Element | null {
  const { state } = useClockTrainingContext();
  const { isCoarsePointer } = state;

  if (!isCoarsePointer) {
    return null;
  }

  return <ClockTrainingTouchHint />;
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

function ClockTrainingSummaryView(): React.JSX.Element {
  const { state, actions } = useClockTrainingContext();
  const {
    challengeBestStreak,
    challengeMedal,
    gameMode,
    resolvedCompletionPrimaryActionLabel,
    retryAddedCount,
    score,
    section,
    tasks,
    xpBreakdown,
    xpEarned,
    } = state;
    const { onFinish, resetSession } = actions;
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
      onFinish={onFinish}
      onRestart={() => resetSession(gameMode)}
    />
  );
}

function ClockTrainingActiveView(): React.JSX.Element {
  const { props, state, actions } = useClockTrainingContext();
  const {
    challengeTimeLeft,
    done,
    feedback,
    gameMode,
    section,
    submitNextStep,
  } = state;
  const { handleSubmit } = actions;
  const { showHourHand, showMinuteHand, showTimeDisplay } = props;

  return (
    <div className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <ClockTrainingModeSwitchSlot />
      <ClockTrainingGuidanceSlot />
      <ClockTrainingStatusRow />
      <ClockTrainingTaskProgressView />
      <ClockTrainingPromptPanel />
      <ClockTrainingTouchHintSlot />
      <ClockTrainingFeedbackAnnouncer feedback={feedback} />
      <DraggableClock
        onSubmit={handleSubmit}
        showChallengeRing={gameMode === 'challenge'}
        challengeTimeLeft={challengeTimeLeft}
        challengeTimeLimit={CHALLENGE_TIME_LIMIT_SECONDS}
        section={section}
        showHourHand={showHourHand ?? true}
        showMinuteHand={showMinuteHand ?? true}
        showTimeDisplay={showTimeDisplay ?? true}
        submitFeedback={resolveClockTrainingSubmitFeedback({ done, feedback, gameMode })}
        submitFeedbackDetails={feedback?.details ?? null}
        submitFeedbackTitle={feedback?.title ?? null}
        submitNextStep={submitNextStep}
        submitLocked={feedback !== null || done}
      />
    </div>
  );
}

export function ClockTrainingGameView(): React.JSX.Element {
  const { state } = useClockTrainingContext();
  const {
    done,
    gameMode,
    showStandalonePracticeSummary,
  } = state;

  if (shouldShowClockTrainingSummary({ done, gameMode, showStandalonePracticeSummary })) {
    return (
      <ClockTrainingSummaryView />
    );
  }

  return (
    <ClockTrainingActiveView />
  );
}
