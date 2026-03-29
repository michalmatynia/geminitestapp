import type {
  KangurAssignmentPriority,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurProgressLevel = {
  level: number;
  minXp: number;
  title: string;
  color: string;
};

export type KangurOperationPerformance = {
  operation: string;
  label: string;
  emoji: string;
  attempts: number;
  averageAccuracy: number;
  averageScore: number;
  bestScore: number;
  totalXpEarned: number;
  averageXpPerSession: number;
};

export type KangurRecentSession = {
  id: string;
  operation: string;
  operationLabel: string;
  operationEmoji: string;
  createdAt: string;
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
  xpEarned: number | null;
};

export type KangurWeeklyActivityPoint = {
  dateKey: string;
  label: string;
  games: number;
  averageAccuracy: number;
};

export type KangurLearnerRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: KangurAssignmentPriority;
  action: KangurRouteAction;
};

export type KangurLessonMasteryInsight = {
  componentId: string;
  title: string;
  emoji: string;
  masteryPercent: number;
  attempts: number;
  bestScorePercent: number;
  lastScorePercent: number;
  lastCompletedAt: string | null;
};

export type KangurLessonMasteryInsights = {
  weakest: KangurLessonMasteryInsight[];
  strongest: KangurLessonMasteryInsight[];
  trackedLessons: number;
  masteredLessons: number;
  lessonsNeedingPractice: number;
};

export type KangurLearnerProfileSnapshot = {
  totalXp: number;
  gamesPlayed: number;
  lessonsCompleted: number;
  perfectGames: number;
  totalBadges: number;
  unlockedBadges: number;
  unlockedBadgeIds: string[];
  level: KangurProgressLevel;
  nextLevel: KangurProgressLevel | null;
  levelProgressPercent: number;
  averageAccuracy: number;
  bestAccuracy: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastPlayedAt: string | null;
  dailyGoalGames: number;
  todayGames: number;
  dailyGoalPercent: number;
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  recommendedSessionsCompleted: number;
  recommendedSessionProgressPercent: number;
  recommendedSessionSummary: string;
  recommendedSessionNextBadgeName: string | null;
  operationPerformance: KangurOperationPerformance[];
  recentSessions: KangurRecentSession[];
  weeklyActivity: KangurWeeklyActivityPoint[];
  recommendations: KangurLearnerRecommendation[];
  lessonMastery?: KangurLessonMasteryInsights;
};
