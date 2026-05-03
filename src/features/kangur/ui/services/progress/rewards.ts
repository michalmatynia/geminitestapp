import type { KangurProgressState, KangurLessonPracticeReward } from '@/features/kangur/ui/types';

export interface LessonRewardOptions {
  activityKey: string;
  lessonKey: string;
  correctAnswers: number;
  totalQuestions: number;
  difficulty?: string | null;
  durationSeconds?: number | null;
  strongThresholdPercent?: number;
}

export function createLessonPracticeReward(
  progress: KangurProgressState,
  options: LessonRewardOptions
): KangurLessonPracticeReward {
  const { activityKey, correctAnswers: correct, totalQuestions: total, strongThresholdPercent: threshold } = options;
  const accuracy = total > 0 ? correct / total : 0;
  const isStrong = threshold !== undefined && (accuracy * 100) >= threshold;

  return {
    activityKey,
    accuracy,
    isStrong,
    xpGain: isStrong ? 20 : 10,
    timestamp: new Date().toISOString(),
  };
}
