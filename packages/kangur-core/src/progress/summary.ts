import type { KangurProgressState } from '@kangur/contracts';

import { getLocalizedKangurAllGoalsCompletedLabel } from '../progress-i18n';
import {
  BADGE_TRACK_META,
  getAverageAccuracyPercent,
  getBadgeProgress,
  getProgressBadges,
  GUIDED_BADGE_IDS,
  type KangurBadgeStatus,
} from './badges';
import { clampCounter } from './rewards';

export type KangurProgressActivitySummary = {
  key: string;
  label: string;
  sessionsPlayed: number;
  perfectSessions: number;
  totalXpEarned: number;
  averageXpPerSession: number;
  averageAccuracy: number;
  bestScorePercent: number;
  currentStreak: number;
  bestStreak: number;
};

export type KangurRecommendedSessionMomentum = {
  completedSessions: number;
  progressPercent: number;
  summary: string;
  nextBadgeName: string | null;
};

export type KangurRecommendedSessionProjection = {
  current: KangurRecommendedSessionMomentum;
  projected: KangurRecommendedSessionMomentum;
};

export type KangurProgressLevelLike = {
  level: number;
  minXp: number;
  title: string;
  color: string;
};

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

export function getCurrentLevel<T extends KangurProgressLevelLike>(
  totalXp: number,
  levels: readonly T[],
  fallbackLevel: T,
): T {
  let currentLevel = levels[0] ?? fallbackLevel;
  for (const level of levels) {
    if (totalXp >= level.minXp) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

export function getNextLevel<T extends KangurProgressLevelLike>(
  totalXp: number,
  levels: readonly T[],
): T | null {
  for (const level of levels) {
    if (totalXp < level.minXp) {
      return level;
    }
  }
  return null;
}

export function checkNewBadges(progress: KangurProgressState): string[] {
  const newBadges: string[] = [];
  for (const badge of getProgressBadges(progress)) {
    if (!progress.badges.includes(badge.id) && getBadgeProgress(progress, badge).isUnlocked) {
      newBadges.push(badge.id);
    }
  }
  return newBadges;
}

export const getNextLockedBadge = (
  progress: KangurProgressState,
  options: {
    badges?: KangurBadgeStatus[];
    locale?: string | null | undefined;
  } = {},
): KangurBadgeStatus | null => {
  const badgeStatuses = options.badges ?? getProgressBadges(progress, options.locale);
  const locked = badgeStatuses.filter((badge) => !badge.isUnlocked);
  if (locked.length === 0) {
    return null;
  }

  return (
    locked.sort((a, b) => {
      if (a.progressPercent !== b.progressPercent) {
        return b.progressPercent - a.progressPercent;
      }
      const aMeta = BADGE_TRACK_META[a.track];
      const bMeta = BADGE_TRACK_META[b.track];
      return (aMeta?.order ?? 99) - (bMeta?.order ?? 99);
    })[0] ?? null
  );
};

export const getProgressTopActivities = (
  progress: KangurProgressState,
  options: {
    limit?: number;
    formatActivityLabel?: (activityKey: string) => string;
  } = {},
): KangurProgressActivitySummary[] => {
  const { limit = 3, formatActivityLabel } = options;
  const entries = Object.entries(progress.activityStats ?? {});
  return entries
    .map(([key, stats]) => ({
      key,
      label: formatActivityLabel?.(key) ?? key,
      sessionsPlayed: stats.sessionsPlayed,
      perfectSessions: stats.perfectSessions,
      totalXpEarned: stats.totalXpEarned,
      averageXpPerSession:
        stats.sessionsPlayed > 0 ? Math.round(stats.totalXpEarned / stats.sessionsPlayed) : 0,
      averageAccuracy: Math.round((stats.totalCorrectAnswers / (stats.totalQuestionsAnswered || 1)) * 100),
      bestScorePercent: stats.bestScorePercent,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
    }))
    .sort((a, b) => b.totalXpEarned - a.totalXpEarned)
    .slice(0, limit);
};

export const getRecommendedSessionMomentum = (
  progress: KangurProgressState,
  options: {
    allGoalsCompletedLabel?: string;
    badges?: KangurBadgeStatus[];
    locale?: string | null | undefined;
  } = {},
): KangurRecommendedSessionMomentum => {
  const completed = progress.recommendedSessionsCompleted ?? 0;
  const badges = (options.badges ?? getProgressBadges(progress, options.locale)).filter((badge) =>
    GUIDED_BADGE_IDS.has(badge.id),
  );
  const nextBadge = badges.find((badge) => !badge.isUnlocked);

  if (!nextBadge) {
    return {
      completedSessions: completed,
      progressPercent: 100,
      summary:
        options.allGoalsCompletedLabel ??
        getLocalizedKangurAllGoalsCompletedLabel(options.locale),
      nextBadgeName: null,
    };
  }

  return {
    completedSessions: completed,
    progressPercent: nextBadge.progressPercent,
    summary: nextBadge.summary,
    nextBadgeName: nextBadge.name,
  };
};

export const getRecommendedSessionProjection = (
  progress: KangurProgressState,
  isSuccessful: boolean,
  options: {
    getMomentum?: (progressState: KangurProgressState) => KangurRecommendedSessionMomentum;
  } = {},
): KangurRecommendedSessionProjection => {
  const momentumGetter =
    options.getMomentum ?? ((progressState: KangurProgressState) => getRecommendedSessionMomentum(progressState));
  const current = momentumGetter(progress);
  const projectedProgress = {
    ...progress,
    recommendedSessionsCompleted:
      (progress.recommendedSessionsCompleted ?? 0) + (isSuccessful ? 1 : 0),
  };
  const projected = momentumGetter(projectedProgress);
  return { current, projected };
};
