import type {
  KangurXpRewards,
} from '@/features/kangur/ui/types';
import type { KangurProgressLevel } from '@/features/kangur/shared/contracts/kangur-profile';

export type { KangurProgressLevel } from '@/features/kangur/shared/contracts/kangur-profile';
export type {
  KangurBadge,
  KangurBadgeProgress,
  KangurBadgeStatus,
  KangurBadgeTrackKey,
  KangurBadgeTrackOptions,
  KangurBadgeTrackSummary,
  KangurLessonPracticeReward,
  KangurProgressActivitySummary,
  KangurRewardCounterKey,
  KangurRewardInput,
  KangurRewardProfile,
  KangurRewardProfileConfig,
  KangurRecommendedSessionMomentum,
  KangurRecommendedSessionProjection,
  KangurVisibleBadgeOptions,
} from '@kangur/core';
export {
  ACTIVITY_LABELS,
  CLOCK_TRAINING_SECTION_LABELS,
  LESSON_KEY_TO_OPERATION,
  REWARD_PROFILE_CONFIG,
  BADGE_TRACK_META,
  getBadgeTrackMeta,
  GUIDED_BADGE_IDS,
  resolveRewardOperation,
} from '@kangur/core';

export const KANGUR_PROGRESS_STORAGE_KEY = 'sprycio_progress';
export const KANGUR_PROGRESS_OWNER_STORAGE_KEY = 'sprycio_progress_owner';
export const KANGUR_PROGRESS_EVENT_NAME = 'kangur-progress-changed';

export const XP_REWARDS: KangurXpRewards = {
  correct_answer: 10,
  perfect_game: 50,
  great_game: 25,
  good_game: 10,
  lesson_completed: 40,
  clock_training_perfect: 60,
  clock_training_good: 30,
  geometry_training_perfect: 70,
  geometry_training_good: 40,
};

export const LEVELS: KangurProgressLevel[] = [
  { level: 1, minXp: 0, title: 'Raczkujący 🐣', color: 'text-gray-500' },
  { level: 2, minXp: 100, title: 'Uczeń ✏️', color: 'text-green-600' },
  { level: 3, minXp: 250, title: 'Myśliciel 🤔', color: 'text-blue-600' },
  { level: 4, minXp: 500, title: 'Liczmistrz 🔢', color: 'text-indigo-600' },
  { level: 5, minXp: 900, title: 'Matematyk 📐', color: 'text-purple-600' },
  { level: 6, minXp: 1400, title: 'Geniusz 🧠', color: 'text-yellow-600' },
  { level: 7, minXp: 2000, title: 'Legenda 🏆', color: 'text-red-600' },
];

export const FALLBACK_LEVEL: KangurProgressLevel = LEVELS[0]!;
