import type { KangurMiniGameBinaryFeedbackState } from '@/features/kangur/ui/types';

export type ClockTask = {
  hours: number;
  minutes: number;
};

export type ClockFeedback = {
  kind: KangurMiniGameBinaryFeedbackState;
  title: string;
  details: string;
  tone?: 'near' | 'far';
};

export type ClockGameMode = 'practice' | 'challenge';

export type ClockTrainingSectionId = 'hours' | 'minutes' | 'combined';

export type ClockTrainingTaskPoolId = ClockTrainingSectionId | 'mixed';

export type ClockChallengeMedal = 'gold' | 'silver' | 'bronze';

export type ClockChallengeResult = {
  correctCount: number;
  medal: ClockChallengeMedal;
  totalCount: number;
};

export type ClockTrainingSectionContent = {
  accent: 'amber' | 'emerald' | 'indigo' | 'rose';
  guidance?: string;
  guidanceTitle?: string;
  legend?: string;
  promptLabel: string;
};

export type ClockTrainingProps = {
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
