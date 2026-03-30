import type { KangurScoreRecord } from '@kangur/platform';
import type {
  KangurOperationPerformance,
  KangurRecentSession,
  KangurWeeklyActivityPoint,
} from '@/features/kangur/shared/contracts/kangur-profile';
import type { KangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import { resolveKangurOperationFallbackInfo } from '@/features/kangur/ui/services/kangur-operation-fallbacks';
import { ACTIVITY_PRIMARY_TO_OPERATION } from '@/features/kangur/ui/services/profile.constants';
import type { KangurLearnerProfileTranslate } from './profile-types';
import {
  normalizeXpEarned,
  parseDateOrNull,
  toLocalDateKey,
  toPercent,
  translateKangurLearnerProfileWithFallback,
} from './profile-utils';

const trimActivityToken = (value: string | undefined): string | null => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
};

const resolveActivityPrimaryToken = (activityKey: string): string | null => {
  const [fallbackPrimary, rawPrimary] = activityKey.split(':');
  return activityKey.includes(':')
    ? trimActivityToken(rawPrimary)
    : trimActivityToken(fallbackPrimary);
};

export const resolveOperationFromActivityKey = (activityKey: string): string | null => {
  const primary = resolveActivityPrimaryToken(activityKey);
  return primary ? (ACTIVITY_PRIMARY_TO_OPERATION[primary] ?? primary) : null;
};

export const resolveOperationInfo = (
  operation: string,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): { label: string; emoji: string } => {
  const fallback = resolveKangurOperationFallbackInfo(operation, locale);

  return {
    emoji: fallback.emoji,
    label: translateKangurLearnerProfileWithFallback(
      translate,
      `activityLabels.${operation}`,
      fallback.label
    ),
  };
};

export const computeOperationPerformance = (
  scores: KangurScoreRecord[],
  progress: KangurProgressState,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurOperationPerformance[] => {
  const buckets = new Map<
    string,
    {
      attempts: number;
      scoreSum: number;
      accuracySum: number;
      bestAccuracy: number;
      totalXpEarned: number;
      xpSamples: number;
    }
  >();

  scores.forEach((score) => {
    const total = Math.max(1, score.total_questions || 1);
    const accuracy = (score.correct_answers / total) * 100;
    const bucket = buckets.get(score.operation) ?? {
      attempts: 0,
      scoreSum: 0,
      accuracySum: 0,
      bestAccuracy: 0,
      totalXpEarned: 0,
      xpSamples: 0,
    };
    bucket.attempts += 1;
    bucket.scoreSum += score.score;
    bucket.accuracySum += accuracy;
    bucket.bestAccuracy = Math.max(bucket.bestAccuracy, accuracy);
    const normalizedXp = normalizeXpEarned(score.xp_earned);
    if (normalizedXp > 0) {
      bucket.totalXpEarned += normalizedXp;
      bucket.xpSamples += 1;
    }
    buckets.set(score.operation, bucket);
  });

  Object.entries(progress.activityStats ?? {}).forEach(([activityKey, entry]) => {
    const operation = resolveOperationFromActivityKey(activityKey);
    if (!operation || buckets.has(operation) || entry.sessionsPlayed <= 0) {
      return;
    }

    const totalQuestionsAnswered = Math.max(0, entry.totalQuestionsAnswered);
    const averageAccuracy =
      totalQuestionsAnswered > 0
        ? toPercent((entry.totalCorrectAnswers / totalQuestionsAnswered) * 100)
        : entry.bestScorePercent;

    buckets.set(operation, {
      attempts: entry.sessionsPlayed,
      scoreSum: Math.round((averageAccuracy / 100) * entry.sessionsPlayed * 10),
      accuracySum: averageAccuracy * entry.sessionsPlayed,
      bestAccuracy: entry.bestScorePercent,
      totalXpEarned: entry.totalXpEarned,
      xpSamples: entry.sessionsPlayed,
    });
  });

  return Array.from(buckets.entries())
    .map(([operation, bucket]): KangurOperationPerformance => {
      const operationInfo = resolveOperationInfo(operation, locale, translate);
      return {
        operation,
        label: operationInfo.label,
        emoji: operationInfo.emoji,
        attempts: bucket.attempts,
        averageAccuracy: toPercent(bucket.accuracySum / bucket.attempts),
        averageScore: Math.round((bucket.scoreSum / bucket.attempts) * 10) / 10,
        bestScore: toPercent(bucket.bestAccuracy),
        totalXpEarned: bucket.totalXpEarned,
        averageXpPerSession:
          bucket.xpSamples > 0 ? Math.max(0, Math.round(bucket.totalXpEarned / bucket.xpSamples)) : 0,
      };
    })
    .sort((left, right) => {
      if (right.averageAccuracy !== left.averageAccuracy) {
        return right.averageAccuracy - left.averageAccuracy;
      }
      if (right.averageXpPerSession !== left.averageXpPerSession) {
        return right.averageXpPerSession - left.averageXpPerSession;
      }
      return right.attempts - left.attempts;
    });
};

export const computeWeeklyActivity = (
  scores: KangurScoreRecord[],
  now: Date,
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurWeeklyActivityPoint[] => {
  const daysToDisplay = 7;
  const buckets = new Map<string, { games: number; accuracySum: number }>();

  scores.forEach((score) => {
    const parsed = parseDateOrNull(score.created_date);
    if (!parsed) return;
    const dateKey = toLocalDateKey(parsed);
    const bucket = buckets.get(dateKey) ?? { games: 0, accuracySum: 0 };
    const total = Math.max(1, score.total_questions || 1);
    bucket.games += 1;
    bucket.accuracySum += (score.correct_answers / total) * 100;
    buckets.set(dateKey, bucket);
  });

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayLabelFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const result: KangurWeeklyActivityPoint[] = [];
  for (let offset = daysToDisplay - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateKey = toLocalDateKey(day);
    const bucket = buckets.get(dateKey);
    const avg = bucket && bucket.games > 0 ? toPercent(bucket.accuracySum / bucket.games) : 0;
    const dayIndex = day.getDay();
    result.push({
      dateKey,
      label: translateKangurLearnerProfileWithFallback(
        translate,
        `weeklyActivity.${dayKeys[dayIndex]}`,
        dayLabelFormatter.format(day)
      ),
      games: bucket?.games ?? 0,
      averageAccuracy: avg,
    });
  }

  return result;
};

export const computeRecentSessions = (
  scores: KangurScoreRecord[],
  locale: string,
  translate?: KangurLearnerProfileTranslate
): KangurRecentSession[] =>
  scores.slice(0, 8).map((score): KangurRecentSession => {
    const operationInfo = resolveOperationInfo(score.operation, locale, translate);
    const totalQuestions = Math.max(1, score.total_questions || 1);
    return {
      id: score.id,
      operation: score.operation,
      operationLabel: operationInfo.label,
      operationEmoji: operationInfo.emoji,
      createdAt: score.created_date,
      score: score.score,
      totalQuestions,
      accuracyPercent: toPercent((score.correct_answers / totalQuestions) * 100),
      timeTakenSeconds: Math.max(0, score.time_taken || 0),
      xpEarned:
        typeof score.xp_earned === 'number' && Number.isFinite(score.xp_earned)
          ? Math.max(0, Math.round(score.xp_earned))
          : null,
    };
  });

export const computeXpAnalytics = (
  scores: KangurScoreRecord[],
  progress: KangurProgressState,
  now: Date
): {
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
} => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  let todayXpEarned = 0;
  let weeklyXpEarned = 0;

  scores.forEach((score) => {
    const playedAt = parseDateOrNull(score.created_date);
    if (!playedAt) {
      return;
    }

    const normalizedXp = normalizeXpEarned(score.xp_earned);
    if (normalizedXp <= 0) {
      return;
    }

    const playedDay = new Date(playedAt.getFullYear(), playedAt.getMonth(), playedAt.getDate());
    if (playedDay.getTime() === today.getTime()) {
      todayXpEarned += normalizedXp;
    }
    if (playedDay.getTime() >= weekStart.getTime() && playedDay.getTime() <= today.getTime()) {
      weeklyXpEarned += normalizedXp;
    }
  });

  return {
    todayXpEarned,
    weeklyXpEarned,
    averageXpPerSession:
      progress.gamesPlayed > 0 ? Math.max(0, Math.round(progress.totalXp / progress.gamesPlayed)) : 0,
  };
};
