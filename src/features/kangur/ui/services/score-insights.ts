import type { KangurScoreRecord } from '@kangur/platform';

export const SCORE_INSIGHT_WINDOW_DAYS = 7;

const OPERATION_LABELS: Record<string, { label: string; emoji: string }> = {
  alphabet: { label: 'Alfabet', emoji: '🔤' },
  alphabet_basics: { label: 'Alfabet', emoji: '🔤' },
  alphabet_copy: { label: 'Przepisz litery', emoji: '📝' },
  alphabet_syllables: { label: 'Sylaby', emoji: '🔤' },
  alphabet_words: { label: 'Pierwsze slowa', emoji: '📖' },
  alphabet_matching: { label: 'Dopasuj litery', emoji: '🔤' },
  alphabet_sequence: { label: 'Kolejnosc liter', emoji: '🔤' },
  geometry_shape_recognition: { label: 'Geometria', emoji: '🔷' },
  addition: { label: 'Dodawanie', emoji: '➕' },
  subtraction: { label: 'Odejmowanie', emoji: '➖' },
  multiplication: { label: 'Mnożenie', emoji: '✖️' },
  division: { label: 'Dzielenie', emoji: '➗' },
  decimals: { label: 'Ułamki', emoji: '🔢' },
  powers: { label: 'Potęgi', emoji: '⚡' },
  roots: { label: 'Pierwiastki', emoji: '√' },
  clock: { label: 'Zegar', emoji: '🕐' },
  calendar: { label: 'Kalendarz', emoji: '📅' },
  geometry: { label: 'Geometria', emoji: '🔷' },
  logical: { label: 'Logika', emoji: '🧩' },
  mixed: { label: 'Mieszane', emoji: '🎲' },
  english_basics: { label: 'Podstawy', emoji: '🗣️' },
  english_parts_of_speech: { label: 'Części mowy', emoji: '🔤' },
  english_sentence_structure: { label: 'Szyk zdania', emoji: '🧩' },
  english_subject_verb_agreement: { label: 'Zgoda podmiotu', emoji: '🤝' },
  english_articles: { label: 'Przedimki', emoji: '📰' },
  english_prepositions_time_place: { label: 'Przyimki czasu i miejsca', emoji: '🧭' },
};

export type KangurScoreInsightsLocalizer = {
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

export const resolveKangurScoreOperationInfo = (
  operation: string,
  localizer?: KangurScoreInsightsLocalizer
): { label: string; emoji: string } => {
  const fallback = OPERATION_LABELS[operation] ?? { label: operation, emoji: '❓' };
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
    return {
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
    };
  }

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

  const recentScores = normalizedScores.filter((score) => {
    const parsed = parseDateOrNull(score.created_date);
    return parsed !== null && parsed.getTime() >= recentWindowStart.getTime();
  });
  const previousScores = normalizedScores.filter((score) => {
    const parsed = parseDateOrNull(score.created_date);
    if (parsed === null) {
      return false;
    }
    const timestamp = parsed.getTime();
    return timestamp >= previousWindowStart.getTime() && timestamp < recentWindowStart.getTime();
  });

  const recentAverageAccuracy = averageAccuracyForScores(recentScores);
  const previousAverageAccuracy =
    previousScores.length > 0 ? averageAccuracyForScores(previousScores) : null;
  const deltaAccuracy =
    previousAverageAccuracy === null ? null : recentAverageAccuracy - previousAverageAccuracy;
  const trendDirection: KangurScoreTrendDirection =
    deltaAccuracy === null
      ? 'insufficient_data'
      : deltaAccuracy >= 5
        ? 'up'
        : deltaAccuracy <= -5
          ? 'down'
          : 'flat';
  const insightScores = recentScores.length > 0 ? recentScores : normalizedScores;
  const operationInsights = buildOperationInsights(insightScores, localizer);
  const recentXpEarned = recentScores.reduce((sum, score) => sum + normalizeXpEarned(score.xp_earned), 0);

  return {
    recentGames: recentScores.length,
    recentAverageAccuracy,
    recentPerfectGames: recentScores.filter(
      (score) => score.correct_answers === score.total_questions
    ).length,
    recentXpEarned,
    averageXpPerRecentGame: recentScores.length > 0 ? Math.round(recentXpEarned / recentScores.length) : 0,
    lastPlayedAt: normalizedScores[0]?.created_date ?? null,
    trend: {
      direction: trendDirection,
      deltaAccuracy,
      recentAverageAccuracy,
      previousAverageAccuracy,
    },
    strongestOperation: operationInsights.strongestOperation,
    weakestOperation: operationInsights.weakestOperation,
  };
};
