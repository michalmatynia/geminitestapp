import type { KangurScoreRecord } from '@kangur/platform';
import { resolveKangurOperationFallbackInfo } from '@/features/kangur/ui/services/kangur-operation-fallbacks';

export const SCORE_INSIGHT_WINDOW_DAYS = 7;

export type KangurScoreInsightsLocalizer = {
  locale?: string | null;
  translateOperationLabel?: (operation: string, fallback: string) => string;
};

export type KangurScoreInsightOperation = {
  operation: string;
  label: string;
  emoji: string;
  attempts: number;
  averageAccuracy: number;
  averageXpEarned: number;
  perfectSessions: number;
};

export type KangurScoreTrendDirection = 'up' | 'down' | 'flat' | 'insufficient_data';

export type KangurScoreInsights = {
  recentGames: number;
  recentAverageAccuracy: number;
  recentPerfectGames: number;
  recentXpEarned: number;
  averageXpPerRecentGame: number;
  lastPlayedAt: string | null;
  trend: {
    direction: KangurScoreTrendDirection;
    deltaAccuracy: number | null;
    recentAverageAccuracy: number;
    previousAverageAccuracy: number | null;
  };
  strongestOperation: KangurScoreInsightOperation | null;
  weakestOperation: KangurScoreInsightOperation | null;
};

const toPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
const normalizeXpEarned = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

const parseDateOrNull = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const averageAccuracyForScores = (scores: KangurScoreRecord[]): number => {
  if (scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((total, score) => {
    const totalQuestions = Math.max(1, score.total_questions || 1);
    return total + (score.correct_answers / totalQuestions) * 100;
  }, 0);
  return toPercent(sum / scores.length);
};

const sortScoresByCreatedDateDesc = (left: KangurScoreRecord, right: KangurScoreRecord): number =>
  (parseDateOrNull(right.created_date)?.getTime() ?? 0) -
  (parseDateOrNull(left.created_date)?.getTime() ?? 0);

const createEmptyKangurScoreInsights = (): KangurScoreInsights => ({
  recentGames: 0,
  recentAverageAccuracy: 0,
  recentPerfectGames: 0,
  recentXpEarned: 0,
  averageXpPerRecentGame: 0,
  lastPlayedAt: null,
  trend: {
    direction: 'insufficient_data',
    deltaAccuracy: null,
    recentAverageAccuracy: 0,
    previousAverageAccuracy: null,
  },
  strongestOperation: null,
  weakestOperation: null,
});

const resolveScoreInsightWindows = (
  now: Date
): { recentWindowStart: Date; previousWindowStart: Date } => {
  const today = startOfLocalDay(now);
  const recentWindowStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (SCORE_INSIGHT_WINDOW_DAYS - 1)
  );
  const previousWindowStart = new Date(
    recentWindowStart.getFullYear(),
    recentWindowStart.getMonth(),
    recentWindowStart.getDate() - SCORE_INSIGHT_WINDOW_DAYS
  );

  return { recentWindowStart, previousWindowStart };
};

const isScoreWithinDateWindow = (
  score: KangurScoreRecord,
  startMs: number,
  endMs: number = Number.POSITIVE_INFINITY
): boolean => {
  const parsed = parseDateOrNull(score.created_date);
  if (parsed === null) {
    return false;
  }

  const timestamp = parsed.getTime();
  return timestamp >= startMs && timestamp < endMs;
};

const filterScoresWithinDateWindow = (
  scores: KangurScoreRecord[],
  startMs: number,
  endMs?: number
): KangurScoreRecord[] =>
  scores.filter((score) => isScoreWithinDateWindow(score, startMs, endMs));

const resolveScoreTrendDirection = (
  deltaAccuracy: number | null
): KangurScoreTrendDirection => {
  if (deltaAccuracy === null) {
    return 'insufficient_data';
  }
  if (deltaAccuracy >= 5) {
    return 'up';
  }
  if (deltaAccuracy <= -5) {
    return 'down';
  }
  return 'flat';
};

const buildScoreTrend = ({
  previousAverageAccuracy,
  recentAverageAccuracy,
}: {
  previousAverageAccuracy: number | null;
  recentAverageAccuracy: number;
}): KangurScoreInsights['trend'] => {
  const deltaAccuracy =
    previousAverageAccuracy === null ? null : recentAverageAccuracy - previousAverageAccuracy;
  return {
    direction: resolveScoreTrendDirection(deltaAccuracy),
    deltaAccuracy,
    recentAverageAccuracy,
    previousAverageAccuracy,
  };
};

const countPerfectScores = (scores: KangurScoreRecord[]): number =>
  scores.filter((score) => score.correct_answers === score.total_questions).length;

const sumScoreXpEarned = (scores: KangurScoreRecord[]): number =>
  scores.reduce((sum, score) => sum + normalizeXpEarned(score.xp_earned), 0);

const resolveAverageXpPerGame = (xpEarned: number, totalGames: number): number =>
  totalGames > 0 ? Math.round(xpEarned / totalGames) : 0;

const resolveOperationInsightScores = (
  recentScores: KangurScoreRecord[],
  normalizedScores: KangurScoreRecord[]
): KangurScoreRecord[] => (recentScores.length > 0 ? recentScores : normalizedScores);

export const resolveKangurScoreOperationInfo = (
  operation: string,
  localizer?: KangurScoreInsightsLocalizer
): { label: string; emoji: string } => {
  const fallback = resolveKangurOperationFallbackInfo(operation, localizer?.locale);
  return {
    emoji: fallback.emoji,
    label: localizer?.translateOperationLabel?.(operation, fallback.label) ?? fallback.label,
  };
};

const buildOperationInsights = (
  scores: KangurScoreRecord[],
  localizer?: KangurScoreInsightsLocalizer
): {
  strongestOperation: KangurScoreInsightOperation | null;
  weakestOperation: KangurScoreInsightOperation | null;
} => {
  const buckets = new Map<
    string,
    {
      attempts: number;
      accuracySum: number;
      xpSum: number;
      perfectSessions: number;
    }
  >();

  scores.forEach((score) => {
    const totalQuestions = Math.max(1, score.total_questions || 1);
    const accuracy = (score.correct_answers / totalQuestions) * 100;
    const bucket = buckets.get(score.operation) ?? {
      attempts: 0,
      accuracySum: 0,
      xpSum: 0,
      perfectSessions: 0,
    };
    bucket.attempts += 1;
    bucket.accuracySum += accuracy;
    bucket.xpSum += normalizeXpEarned(score.xp_earned);
    if (score.correct_answers === score.total_questions) {
      bucket.perfectSessions += 1;
    }
    buckets.set(score.operation, bucket);
  });

  const entries = Array.from(buckets.entries()).map(
    ([operation, bucket]): KangurScoreInsightOperation => {
      const operationInfo = resolveKangurScoreOperationInfo(operation, localizer);
      return {
        operation,
        label: operationInfo.label,
        emoji: operationInfo.emoji,
        attempts: bucket.attempts,
        averageAccuracy: toPercent(bucket.accuracySum / bucket.attempts),
        averageXpEarned: Math.round(bucket.xpSum / bucket.attempts),
        perfectSessions: bucket.perfectSessions,
      };
    }
  );

  if (entries.length === 0) {
    return {
      strongestOperation: null,
      weakestOperation: null,
    };
  }

  const strongestOperation = [...entries].sort((left, right) => {
    if (left.averageAccuracy !== right.averageAccuracy) {
      return right.averageAccuracy - left.averageAccuracy;
    }
    return right.attempts - left.attempts;
  })[0]!;

  const weakestOperation =
    entries.length < 2
      ? null
      : [...entries].sort((left, right) => {
        if (left.averageAccuracy !== right.averageAccuracy) {
          return left.averageAccuracy - right.averageAccuracy;
        }
        return right.attempts - left.attempts;
      })[0]!;

  return {
    strongestOperation,
    weakestOperation,
  };
};

export const buildKangurScoreInsights = (
  scores: KangurScoreRecord[],
  now: Date = new Date(),
  localizer?: KangurScoreInsightsLocalizer
): KangurScoreInsights => {
  const normalizedScores = [...scores].sort(sortScoresByCreatedDateDesc);
  if (normalizedScores.length === 0) {
    return createEmptyKangurScoreInsights();
  }

  const { recentWindowStart, previousWindowStart } = resolveScoreInsightWindows(now);
  const recentScores = filterScoresWithinDateWindow(normalizedScores, recentWindowStart.getTime());
  const previousScores = filterScoresWithinDateWindow(
    normalizedScores,
    previousWindowStart.getTime(),
    recentWindowStart.getTime()
  );

  const recentAverageAccuracy = averageAccuracyForScores(recentScores);
  const previousAverageAccuracy =
    previousScores.length > 0 ? averageAccuracyForScores(previousScores) : null;
  const trend = buildScoreTrend({
    previousAverageAccuracy,
    recentAverageAccuracy,
  });
  const insightScores = resolveOperationInsightScores(recentScores, normalizedScores);
  const operationInsights = buildOperationInsights(insightScores, localizer);
  const recentXpEarned = sumScoreXpEarned(recentScores);

  return {
    recentGames: recentScores.length,
    recentAverageAccuracy,
    recentPerfectGames: countPerfectScores(recentScores),
    recentXpEarned,
    averageXpPerRecentGame: resolveAverageXpPerGame(recentXpEarned, recentScores.length),
    lastPlayedAt: normalizedScores[0]?.created_date ?? null,
    trend,
    strongestOperation: operationInsights.strongestOperation,
    weakestOperation: operationInsights.weakestOperation,
  };
};
