export type {
  KangurDifficulty,
  KangurDifficultyConfig,
  KangurDifficultyConfigEntry,
  KangurOperation,
  KangurQuestion,
} from './math/types';

export {
  DIFFICULTY_CONFIG,
  generateQuestions,
  generateTrainingQuestions,
} from './math/questions';

export type {
  KangurLessonPracticeReward,
  KangurRewardBreakdownEntry,
  KangurRewardCounterKey,
  KangurRewardInput,
  KangurRewardProfile,
  KangurRewardProfileConfig,
} from './progress/rewards';

export {
  REWARD_PROFILE_CONFIG,
  DIFFICULTY_XP_BONUS,
  MASTERY_STAGE_BONUSES,
  clampCounter,
  createEmptyActivityStatsEntry,
  getActivityStatsEntry,
  getAccuracyBonus,
  getDifficultyBonus,
  getSpeedBonus,
  getStreakBonus,
  getVarietyBonus,
  getActivityRepeatPenalty,
  getMasteryGainBonus,
  buildRewardBreakdown,
  buildActivityStatsUpdate,
  buildLessonMasteryUpdate,
  createRewardOutcome,
} from './progress/rewards';

export type {
  KangurBadge,
  KangurBadgeProgress,
  KangurBadgeStatus,
  KangurBadgeTrackKey,
  KangurBadgeTrackOptions,
  KangurBadgeTrackSummary,
  KangurVisibleBadgeOptions,
} from './progress/badges';

export {
  BADGE_TRACK_META,
  GUIDED_BADGE_IDS,
  BADGES,
  clampPercent,
  getAverageAccuracyPercent,
  getMasteredLessonCount,
  getBadgeTrackMeta,
  getBadgeProgress,
  getProgressBadges,
  getVisibleProgressBadges,
  getProgressBadgeTrackSummaries,
} from './progress/badges';

export {
  ACTIVITY_LABELS,
  CLOCK_TRAINING_SECTION_LABELS,
  LESSON_KEY_TO_OPERATION,
  resolveRewardOperation,
} from './progress/activity';

export type {
  KangurProgressActivitySummary,
  KangurProgressLevelLike,
  KangurRecommendedSessionMomentum,
  KangurRecommendedSessionProjection,
} from './progress/summary';

export {
  getProgressAverageXpPerSession,
  getProgressBestAccuracy,
  getCurrentLevel,
  getNextLevel,
  checkNewBadges,
  getNextLockedBadge,
  getProgressTopActivities,
  getRecommendedSessionMomentum,
  getRecommendedSessionProjection,
} from './progress/summary';
