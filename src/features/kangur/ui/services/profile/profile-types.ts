import type {
  KangurLearnerProfileSnapshot,
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
  KangurLessonMasteryInsights,
  KangurOperationPerformance,
  KangurRecentSession,
  KangurWeeklyActivityPoint,
} from '@/features/kangur/shared/contracts/kangur-profile';

export type {
  KangurLearnerProfileSnapshot,
  KangurLearnerRecommendation,
  KangurLessonMasteryInsight,
  KangurLessonMasteryInsights,
  KangurOperationPerformance,
  KangurRecentSession,
  KangurWeeklyActivityPoint,
};

export type KangurLearnerProfileTranslate = (
  key: string,
  values?: Record<string, string | number>
) => string;
