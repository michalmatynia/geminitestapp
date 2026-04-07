import type { KangurRegistryBaseData } from '../kangur-registry-types';

export const buildOperationPerformanceItem = (
  operation: KangurRegistryBaseData['snapshot']['operationPerformance'][number]
) => ({
  operation: operation.operation,
  label: operation.label,
  emoji: operation.emoji,
  attempts: operation.attempts,
  averageAccuracy: operation.averageAccuracy,
  averageScore: operation.averageScore,
  bestScore: operation.bestScore,
  totalXpEarned: operation.totalXpEarned,
  averageXpPerSession: operation.averageXpPerSession,
});

export const buildLearnerSummary = (
  snapshot: KangurRegistryBaseData['snapshot'],
  activeAssignments: KangurRegistryBaseData['activeAssignments'],
  masteryInsights: KangurRegistryBaseData['masteryInsights']
): string =>
  [
    `Average accuracy ${snapshot.averageAccuracy}%.`,
    `Daily goal ${snapshot.todayGames}/${snapshot.dailyGoalGames}.`,
    `XP today +${snapshot.todayXpEarned}.`,
    `XP last 7 days +${snapshot.weeklyXpEarned}.`,
    `Current streak ${snapshot.currentStreakDays} days.`,
    `${activeAssignments.length} active assignments.`,
    `${masteryInsights.lessonsNeedingPractice} lessons need practice.`,
  ].join(' ');
