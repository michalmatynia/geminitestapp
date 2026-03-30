import type { KangurClockTrainingSection } from '@/shared/contracts/kangur-game-runtime-renderer-props';

import {
  TRAINING_PANEL_TASKS,
  type ClockPracticeTask,
} from './ClockLesson.data';
import ClockTrainingGame from './ClockTrainingGame';

type ClockTrainingLessonGameProps = {
  clockInitialMode?: 'practice' | 'challenge';
  clockSection?: KangurClockTrainingSection;
  onFinish: () => void;
  showClockHourHand?: boolean;
  showClockMinuteHand?: boolean;
  showClockModeSwitch?: boolean;
  showClockTaskTitle?: boolean;
  showClockTimeDisplay?: boolean;
};

const resolvePracticeTasks = (
  section: KangurClockTrainingSection
): ClockPracticeTask[] | undefined => TRAINING_PANEL_TASKS[section].pick_one;

type ResolvedClockTrainingLessonGameProps = {
  clockInitialMode: 'practice' | 'challenge';
  clockSection: KangurClockTrainingSection;
  onFinish: () => void;
  showClockHourHand: boolean;
  showClockMinuteHand: boolean;
  showClockModeSwitch: boolean;
  showClockTaskTitle: boolean;
  showClockTimeDisplay: boolean;
};

const resolveClockTrainingLessonGameProps = (
  props: ClockTrainingLessonGameProps
): ResolvedClockTrainingLessonGameProps => ({
  clockInitialMode: props.clockInitialMode ?? 'practice',
  clockSection: props.clockSection ?? 'hours',
  onFinish: props.onFinish,
  showClockHourHand: props.showClockHourHand ?? true,
  showClockMinuteHand: props.showClockMinuteHand ?? true,
  showClockModeSwitch: props.showClockModeSwitch ?? false,
  showClockTaskTitle: props.showClockTaskTitle ?? true,
  showClockTimeDisplay: props.showClockTimeDisplay ?? false,
});

const resolveClockTrainingLessonPracticeCompleted = ({
  clockInitialMode,
  onFinish,
}: {
  clockInitialMode: 'practice' | 'challenge';
  onFinish: () => void;
}): (() => void) | undefined =>
  clockInitialMode === 'practice' ? () => onFinish() : undefined;

export type { ClockTrainingLessonGameProps };

export function renderClockTrainingLessonGame(
  props: ClockTrainingLessonGameProps
): React.JSX.Element {
  const {
    clockInitialMode,
    clockSection,
    onFinish,
    showClockHourHand,
    showClockMinuteHand,
    showClockModeSwitch,
    showClockTaskTitle,
    showClockTimeDisplay,
  } = resolveClockTrainingLessonGameProps(props);

  return (
    <ClockTrainingGame
      key={clockSection}
      enableAdaptiveRetry={false}
      hideModeSwitch={!showClockModeSwitch}
      initialMode={clockInitialMode}
      onFinish={onFinish}
      onPracticeCompleted={resolveClockTrainingLessonPracticeCompleted({
        clockInitialMode,
        onFinish,
      })}
      practiceTasks={resolvePracticeTasks(clockSection)}
      section={clockSection}
      showHourHand={showClockHourHand}
      showMinuteHand={showClockMinuteHand}
      showTaskTitle={showClockTaskTitle}
      showTimeDisplay={showClockTimeDisplay}
    />
  );
}
