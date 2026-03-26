'use client';

import type { KangurClockTrainingStageSection } from '@/shared/contracts/kangur-games';

import {
  TRAINING_PANEL_TASKS,
  type ClockPracticeTask,
} from './ClockLesson.data';
import ClockTrainingGame from './ClockTrainingGame';

type ClockTrainingStageGameProps = {
  clockSection?: KangurClockTrainingStageSection;
  onFinish: () => void;
};

const resolvePracticeTasks = (
  section: KangurClockTrainingStageSection
): ClockPracticeTask[] | undefined => TRAINING_PANEL_TASKS[section].pick_one;

export default function ClockTrainingStageGame({
  clockSection = 'hours',
  onFinish,
}: ClockTrainingStageGameProps): React.JSX.Element {
  return (
    <ClockTrainingGame
      key={clockSection}
      enableAdaptiveRetry={false}
      hideModeSwitch
      initialMode='practice'
      onFinish={onFinish}
      onPracticeCompleted={() => onFinish()}
      practiceTasks={resolvePracticeTasks(clockSection)}
      section={clockSection}
      showTaskTitle
      showTimeDisplay={false}
    />
  );
}
