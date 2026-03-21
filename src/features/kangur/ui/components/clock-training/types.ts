export type ClockTask = {
  hours: number;
  minutes: number;
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
