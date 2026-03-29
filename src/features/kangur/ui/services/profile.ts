'use client';

import type { KangurScoreRecord } from '@kangur/platform';
import type {
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import {
  getCurrentLevel,
  getNextLevel,
  getProgressBadges,
  getProgressAverageAccuracy,
  getProgressAverageXpPerSession,
  getProgressBestAccuracy,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import {
  type KangurLearnerProfileSnapshot,
  type KangurLearnerProfileTranslate,
} from './profile/profile-types';
import {
  parseDateOrNull,
  toLocalDateKey,
  toPercent,
} from './profile/profile-utils';
import { computeStreaks } from './profile/profile-streaks';
import {
  computeOperationPerformance,
  computeRecentSessions,
  computeWeeklyActivity,
  computeXpAnalytics,
} from './profile/profile-performance';
import { buildLessonMasteryInsights } from './profile/profile-mastery';
import {
  buildRecommendations,
  localizeRecommendedSessionMomentum,
} from './profile/profile-recommendations';

export * from './profile/profile-types';
export { buildLessonMasteryInsights } from './profile/profile-mastery';
export { translateKangurLearnerProfileWithFallback } from './profile/profile-utils';

const normalizeScoresDesc = (scores: KangurScoreRecord[]): KangurScoreRecord[] =>
  [...scores].sort((left, right) => {
    const leftDate = parseDateOrNull(left.created_date);
    const rightDate = parseDateOrNull(right.created_date);
    const leftTs = leftDate?.getTime() ?? 0;
    const rightTs = rightDate?.getTime() ?? 0;
    return rightTs - leftTs;
  });

type BuildProfileSnapshotInput = {
  progress: KangurProgressState;
  scores: KangurScoreRecord[];
  dailyGoalGames: number;
  now?: Date | undefined;
  locale?: string | null | undefined;
  translate?: KangurLearnerProfileTranslate | undefined;
};

export const buildKangurLearnerProfileSnapshot = (
  input: BuildProfileSnapshotInput
): KangurLearnerProfileSnapshot => {
  const now = input.now ?? new Date();
  const normalizedLocale = normalizeSiteLocale(input.locale);
  const sortedScores = normalizeScoresDesc(input.scores);

  const streaks = computeStreaks(sortedScores, now);
  const operationPerformance = computeOperationPerformance(
    sortedScores,
    input.progress,
    normalizedLocale,
    input.translate
  );
  const weeklyActivity = computeWeeklyActivity(
    sortedScores,
    now,
    normalizedLocale,
    input.translate
  );
  const recentSessions = computeRecentSessions(sortedScores, normalizedLocale, input.translate);
  const xpAnalytics = computeXpAnalytics(sortedScores, input.progress, now);
  const badges = getProgressBadges(input.progress);
  const level = getCurrentLevel(input.progress.totalXp);
  const nextLevel = getNextLevel(input.progress.totalXp);
  const xpIntoLevel = input.progress.totalXp - level.minXp;
  const xpNeeded = nextLevel ? Math.max(1, nextLevel.minXp - level.minXp) : 1;
  const todayDateKey = toLocalDateKey(now);

  const todayGames =
    weeklyActivity.find((entry) => entry.dateKey === todayDateKey)?.games ??
    weeklyActivity.at(-1)?.games ??
    0;
  const dailyGoalGames = Math.max(1, Math.round(input.dailyGoalGames));
  const averageAccuracy = getProgressAverageAccuracy(input.progress);

  const rawMomentum = getRecommendedSessionMomentum(input.progress);
  const momentum = localizeRecommendedSessionMomentum(
    rawMomentum.completedSessions,
    rawMomentum.nextBadgeName,
    rawMomentum.summary,
    input.translate
  );

  const recommendations = buildRecommendations({
    averageAccuracy,
    currentStreakDays: streaks.currentStreakDays,
    dailyGoalGames: input.dailyGoalGames,
    todayGames,
    todayXpEarned: xpAnalytics.todayXpEarned,
    weeklyXpEarned: xpAnalytics.weeklyXpEarned,
    averageXpPerSession: xpAnalytics.averageXpPerSession,
    operationPerformance,
    progress: input.progress,
    locale: normalizedLocale,
    translate: input.translate,
  });

  return {
    totalXp: input.progress.totalXp,
    gamesPlayed: input.progress.gamesPlayed,
    lessonsCompleted: input.progress.lessonsCompleted,
    perfectGames: input.progress.perfectGames,
    totalBadges: badges.length,
    unlockedBadges: badges.filter((badge) => badge.isUnlocked).length,
    unlockedBadgeIds: badges.filter((badge) => badge.isUnlocked).map((badge) => badge.id),
    level,
    nextLevel,
    levelProgressPercent: nextLevel ? toPercent((xpIntoLevel / xpNeeded) * 100) : 100,
    todayXpEarned: xpAnalytics.todayXpEarned,
    weeklyXpEarned: xpAnalytics.weeklyXpEarned,
    averageXpPerSession:
      xpAnalytics.averageXpPerSession || getProgressAverageXpPerSession(input.progress),
    averageAccuracy,
    bestAccuracy: getProgressBestAccuracy(input.progress),
    currentStreakDays: streaks.currentStreakDays,
    longestStreakDays: streaks.longestStreakDays,
    lastPlayedAt: streaks.lastPlayedAt,
    dailyGoalGames,
    todayGames,
    dailyGoalPercent: toPercent((todayGames / dailyGoalGames) * 100),
    recommendedSessionsCompleted: rawMomentum.completedSessions,
    recommendedSessionProgressPercent: rawMomentum.progressPercent,
    recommendedSessionSummary: momentum.summary,
    recommendedSessionNextBadgeName: momentum.nextBadgeName,
    weeklyActivity,
    operationPerformance,
    recentSessions,
    recommendations,
    lessonMastery: buildLessonMasteryInsights(input.progress, 3, normalizedLocale),
  };
};
