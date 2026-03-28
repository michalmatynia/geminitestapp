'use client';

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

export type { ClockTrainingLessonGameProps };

export function renderClockTrainingLessonGame({
  clockInitialMode = 'practice',
  clockSection = 'hours',
  onFinish,
  showClockHourHand = true,
  showClockMinuteHand = true,
  showClockModeSwitch = false,
  showClockTaskTitle = true,
  showClockTimeDisplay = false,
}: ClockTrainingLessonGameProps): React.JSX.Element {
  return (
    <ClockTrainingGame
      key={clockSection}
      enableAdaptiveRetry={false}
      hideModeSwitch={!showClockModeSwitch}
      initialMode={clockInitialMode}
      onFinish={onFinish}
      onPracticeCompleted={clockInitialMode === 'practice' ? () => onFinish() : undefined}
      practiceTasks={resolvePracticeTasks(clockSection)}
      section={clockSection}
      showHourHand={showClockHourHand}
      showMinuteHand={showClockMinuteHand}
      showTaskTitle={showClockTaskTitle}
      showTimeDisplay={showClockTimeDisplay}
    />
  );
}
