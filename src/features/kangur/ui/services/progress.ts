import type {
  KangurAddXpResult,
  KangurProgressState,
} from '@/features/kangur/ui/types';
import {
  normalizeKangurProgressState,
} from '@/shared/contracts/kangur';

import {
  ACTIVITY_LABELS,
  CLOCK_TRAINING_SECTION_LABELS,
  LESSON_KEY_TO_OPERATION,
  LEVELS,
  FALLBACK_LEVEL,
  type KangurBadge,
  type KangurProgressLevel,
  type KangurRewardCounterKey,
  type KangurLessonPracticeReward,
} from './progress.contracts';
import {
  BADGES,
  clampPercent,
  getAverageAccuracyPercent,
  getBadgeProgress,
  getMasteredLessonCount,
} from './progress.badges';
import {
  clampCounter,
  createRewardOutcome,
  getActivityStatsEntry,
} from './progress.rewards';
import {
  loadProgress,
  saveProgress,
} from './progress.persistence';

// Re-export modular parts
export * from './progress.contracts';
export * from './progress.badges';
export * from './progress.rewards';
export * from './progress.persistence';

const mergeUniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const resolveActivityTokenLabel = (token: string): string =>
  ACTIVITY_LABELS[token] ?? token.replace(/_/g, ' ').trim();

const resolveRewardOperation = ({
  operation,
  lessonKey,
  activityKey,
}: {
  operation?: string | null;
  lessonKey?: string | null;
  activityKey?: string | null;
}): string | null => {
  const normalizedOperation = operation?.trim();
  if (normalizedOperation) {
    return normalizedOperation;
  }

  const normalizedLessonKey = lessonKey?.trim();
  if (normalizedLessonKey) {
    return LESSON_KEY_TO_OPERATION[normalizedLessonKey] ?? normalizedLessonKey;
  }

  const normalizedActivityKey = activityKey?.trim();
  if (!normalizedActivityKey) {
    return null;
  }

  const [, rawPrimary = ''] = normalizedActivityKey.split(':');
  const normalizedPrimary = rawPrimary.trim();
  if (!normalizedPrimary) {
    return null;
  }

  return LESSON_KEY_TO_OPERATION[normalizedPrimary] ?? normalizedPrimary;
};

export const formatKangurProgressActivityLabel = (activityKey: string): string => {
  const [kind = '', rawPrimary = '', rawSecondary = ''] = activityKey.split(':');
  const primary = resolveActivityTokenLabel(rawPrimary);

  if (kind === 'game') {
    return `Gra: ${primary}`;
  }

  if (kind === 'lesson_practice') {
    return `Ćwiczenie: ${primary}`;
  }

  if (kind === 'training') {
    if (rawPrimary === 'clock') {
      const sectionLabel = CLOCK_TRAINING_SECTION_LABELS[rawSecondary] ?? resolveActivityTokenLabel(rawSecondary);
      return `Trening zegara: ${sectionLabel}`;
    }

    return `Trening: ${primary}`;
  }

  if (kind === 'lesson_completion') {
    return `Lekcja: ${primary}`;
  }

  return resolveActivityTokenLabel(activityKey);
};

export const getProgressAverageAccuracy = (progress: KangurProgressState): number =>
  getAverageAccuracyPercent(progress);

export const getProgressAverageXpPerSession = (progress: KangurProgressState): number => {
  if (progress.gamesPlayed <= 0) {
    return 0;
  }

  return clampCounter(progress.totalXp / progress.gamesPlayed);
};

export const getProgressBestAccuracy = (progress: KangurProgressState): number => {
  const activityStats = Object.values(progress.activityStats ?? {});
  if (activityStats.length === 0) {
    return getAverageAccuracyPercent(progress);
  }

  return Math.max(...activityStats.map((entry) => entry.bestScorePercent));
};

export function createGameReward(
  progress: KangurProgressState,
  {
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    followsRecommendation = false,
  }: {
    operation: string;
    difficulty?: string | null;
    correctAnswers: number;
    totalQuestions: number;
    durationSeconds?: number | null;
    followsRecommendation?: boolean;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `game:${operation.trim() || 'mixed'}`,
    profile: 'game',
    operation,
    difficulty,
    correctAnswers,
    totalQuestions,
    durationSeconds,
    countsAsGame: true,
    followsRecommendation,
    strongThresholdPercent: 70,
  });
}

export function createTrainingReward(
  progress: KangurProgressState,
  {
    activityKey,
    lessonKey,
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    strongThresholdPercent = 70,
    perfectCounterKey,
  }: {
    activityKey: string;
    lessonKey: string;
    correctAnswers: number;
    totalQuestions: number;
    difficulty?: string | null;
    durationSeconds?: number | null;
    strongThresholdPercent?: number;
    perfectCounterKey?: KangurRewardCounterKey;
  }
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey,
    profile: 'training',
    lessonKey,
    operation: resolveRewardOperation({ lessonKey, activityKey }),
    correctAnswers,
    totalQuestions,
    difficulty,
    durationSeconds,
    countsAsGame: true,
    strongThresholdPercent,
    perfectCounterKey,
  });
}

export function createLessonCompletionReward(
  progress: KangurProgressState,
  lessonKey: string,
  scorePercent = 100
): KangurLessonPracticeReward {
  return createRewardOutcome(progress, {
    activityKey: `lesson_completion:${lessonKey.trim() || 'unknown'}`,
    profile: 'lesson_completion',
    lessonKey,
    scorePercentOverride: scorePercent,
    countsAsLessonCompletion: true,
    strongThresholdPercent: 100,
  });
}

export function getCurrentLevel(totalXp: number): KangurProgressLevel {
  return getCurrentKangurLevel(totalXp);
}

export function getNextLevel(totalXp: number): KangurProgressLevel | null {
  return getNextKangurLevel(totalXp);
}

export function checkNewBadges(progress: KangurProgressState): string[] {
  const newBadges: string[] = [];
  for (const badge of BADGES) {
    if (!progress.badges.includes(badge.id) && getBadgeProgress(progress, badge).isUnlocked) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

export function addXp(
  amount: number,
  extraUpdates: Partial<KangurProgressState> = {}
): KangurAddXpResult {
  const progress = loadProgress();
  const updated = normalizeKangurProgressState({
    ...progress,
    totalXp: progress.totalXp + amount,
    ...extraUpdates,
  });
  const newBadges = checkNewBadges(updated);
  updated.badges = mergeUniqueStrings([...updated.badges, ...newBadges]);
  saveProgress(updated);
  return { updated, newBadges, xpGained: amount };
}
