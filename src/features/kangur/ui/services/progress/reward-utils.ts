import { 
  createRewardOutcome
} from '../progress.rewards';
import { resolveRewardOperation } from '../progress.contracts';
import type { 
  KangurProgressState, 
  KangurLessonPracticeReward 
} from '@/features/kangur/ui/types';

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
  const { activityKey, lessonKey, correctAnswers, totalQuestions, difficulty, durationSeconds, strongThresholdPercent } = options;
  
  return createRewardOutcome(progress, {
    activityKey,
    profile: 'lesson_practice',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey, activityKey }),
    correctAnswers: Math.max(0, Math.round(correctAnswers)),
    totalQuestions: Math.max(1, Math.round(totalQuestions)),
    difficulty,
    durationSeconds,
    countsAsGame: true,
    strongThresholdPercent: strongThresholdPercent ?? 70,
  });
}

export function createLessonCompletionReward(
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent: number = 100
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `lesson_completion:${lessonKey.trim().length > 0 ? lessonKey.trim() : 'unknown'}`,
    profile: 'lesson_completion',
    lessonKey,
    scorePercentOverride: scorePercent,
    countsAsLessonCompletion: true,
    strongThresholdPercent: 100,
  });
}
