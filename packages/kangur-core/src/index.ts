export { createKangurProgressStore, type KangurProgressStore } from './progress-store';
export {
  KANGUR_COMPETITION_MODES,
  getKangurCompetitionQuestions,
  isKangurCompetitionExamMode,
  type KangurCompetitionMode,
} from './competition';
export {
  buildKangurAssignments,
  type KangurAssignmentAction,
  type KangurAssignmentPlan,
  type KangurAssignmentPriority,
} from './assignments';
export {
  KANGUR_PORTABLE_LESSONS,
  buildActiveKangurLessonAssignmentsByComponent,
  buildCompletedKangurLessonAssignmentsByComponent,
  getKangurLessonMasteryPresentation,
  getLocalizedKangurPortableLessons,
  orderKangurLessonsByAssignmentPriority,
  resolveFocusedKangurLessonId,
  type KangurLessonAssignmentSnapshot,
  type KangurLessonMasteryPresentation,
  type KangurPortableLesson,
} from './lessons';
export {
  getKangurPortableLessonBody,
  type KangurPortableLessonBody,
  type KangurPortableLessonBodySection,
} from './lesson-content';
export {
  KANGUR_PRACTICE_OPERATIONS,
  buildKangurLessonMasteryUpdate,
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  getKangurPracticeOperationConfig,
  getKangurPracticeOperationForLessonComponent,
  isKangurLogicPracticeOperation,
  isKangurPracticeOperation,
  resolveKangurLessonFocusForPracticeOperation,
  resolveKangurPracticeOperation,
  resolvePreferredKangurPracticeOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeOperationConfig,
  type KangurPracticeQuestion,
} from './practice';
export {
  KANGUR_BADGES,
  KANGUR_LEVELS,
  KANGUR_XP_REWARDS,
  checkKangurNewBadges,
  getCurrentKangurLevel,
  getNextKangurLevel,
  type KangurBadge as KangurMetadataBadge,
  type KangurProgressLevel,
} from './progress-metadata';
export {
  KANGUR_LESSON_CATALOG,
  type KangurLessonCatalogEntry,
} from './lesson-catalog';
export type { KangurCoreLocale } from './profile-i18n';
export {
  getLocalizedKangurCoreLessonTitle,
  getLocalizedKangurCoreLevelTitle,
  getLocalizedKangurCoreOperationInfo,
  getLocalizedKangurCoreWeekdayLabel,
  localizeKangurCoreText,
  normalizeKangurCoreLocale,
} from './profile-i18n';
export {
  KANGUR_LEADERBOARD_OPERATION_OPTIONS,
  KANGUR_LEADERBOARD_USER_OPTIONS,
  buildKangurLeaderboardItems,
  filterKangurLeaderboardScores,
  getKangurLeaderboardOperationInfo,
  getKangurLeaderboardOperationOptions,
  getKangurLeaderboardUserFilterLabel,
  getKangurLeaderboardUserOptions,
  type KangurLeaderboardItem,
  type KangurLeaderboardOperationOption,
  type KangurLeaderboardUserFilter,
  type KangurLeaderboardUserFilterIcon,
  type KangurLeaderboardUserOption,
} from './leaderboard';
export {
  KANGUR_PROFILE_DEFAULT_DAILY_GOAL_GAMES,
  buildKangurLearnerProfileSnapshot,
  buildLessonMasteryInsights,
  type BuildKangurLearnerProfileSnapshotInput,
  type KangurLearnerProfileSnapshot,
  type KangurLearnerRecommendation,
  type KangurLearnerRecommendationAction,
  type KangurLearnerRecommendationPriority,
  type KangurLessonMasteryInsight,
  type KangurLessonMasteryInsights,
  type KangurOperationPerformance,
  type KangurRecentSession,
  type KangurWeeklyActivityPoint,
} from './profile';

export type {
  KangurDifficulty,
  KangurDifficultyConfig,
  KangurDifficultyConfigEntry,
  KangurOperation,
  KangurQuestion,
} from './math/types';
export type { KangurQuestionChoice } from '@kangur/contracts';

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
  getLocalizedKangurAllGoalsCompletedLabel,
  getLocalizedKangurClockSectionLabel,
  getLocalizedKangurMetadataBadgeDescription,
  getLocalizedKangurMetadataBadgeName,
  getLocalizedKangurProgressBadgeDescription,
  getLocalizedKangurProgressBadgeName,
  getLocalizedKangurProgressBadgeSummary,
  getLocalizedKangurProgressActivityLabel,
  getLocalizedKangurProgressBadgeTrackLabel,
  getLocalizedKangurRewardBreakdownLabel,
} from './progress-i18n';

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
