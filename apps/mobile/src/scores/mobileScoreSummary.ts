import { getKangurLeaderboardOperationInfo } from '@kangur/core';
import type { KangurScore } from '@kangur/contracts';

import {
  getKangurMobileLocaleTag,
  type KangurMobileLocale,
  type KangurMobileLocalizedValue,
} from '../i18n/kangurMobileI18n';

export type KangurMobileScoreFamily = 'all' | 'arithmetic' | 'logic' | 'time';
export type KangurMobileScorePracticeFamily = Exclude<
  KangurMobileScoreFamily,
  'all'
>;

export type KangurMobileScoreSummary = {
  arithmeticSessions: number;
  averageAccuracyPercent: number;
  bestAccuracyPercent: number;
  logicSessions: number;
  timeSessions: number;
  totalSessions: number;
};

export type KangurMobileOperationPerformance = {
  averageAccuracyPercent: number;
  bestAccuracyPercent: number;
  family: KangurMobileScorePracticeFamily;
  operation: string;
  sessions: number;
};

export type KangurMobileTrainingFocus = {
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestOperation: KangurMobileOperationPerformance | null;
};

const KANGUR_MOBILE_SCORE_FAMILY_LABELS: Record<
  KangurMobileScorePracticeFamily,
  KangurMobileLocalizedValue<string>
> = {
  arithmetic: {
    de: 'Arithmetiktraining',
    en: 'Arithmetic practice',
    pl: 'Trening arytmetyczny',
  },
  logic: {
    de: 'Logiktraining',
    en: 'Logic practice',
    pl: 'Trening logiczny',
  },
  time: {
    de: 'Zeittraining',
    en: 'Time practice',
    pl: 'Trening czasu',
  },
};

const toSafeRoundedPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
};

export const getKangurMobileScoreAccuracyPercent = (
  score: Pick<KangurScore, 'correct_answers' | 'total_questions'>,
): number => {
  if (score.total_questions <= 0) {
    return 0;
  }

  return toSafeRoundedPercent(
    (score.correct_answers / score.total_questions) * 100,
  );
};

export const isKangurMobileLogicScore = (
  score: Pick<KangurScore, 'operation'>,
): boolean => score.operation.startsWith('logical_');

export const isKangurMobileTimeScore = (
  score: Pick<KangurScore, 'operation'>,
): boolean => score.operation === 'clock' || score.operation === 'calendar';

export const getKangurMobileScoreFamily = (
  score: Pick<KangurScore, 'operation'>,
): KangurMobileScorePracticeFamily => {
  if (isKangurMobileLogicScore(score)) {
    return 'logic';
  }
  if (isKangurMobileTimeScore(score)) {
    return 'time';
  }
  return 'arithmetic';
};

export const filterKangurMobileScores = (
  scores: KangurScore[],
  filters: {
    family?: KangurMobileScoreFamily;
    operation?: string | null;
  } = {},
): KangurScore[] => {
  const family = filters.family ?? 'all';
  const operation = filters.operation?.trim() ?? '';

  return scores.filter((score) => {
    if (operation && score.operation !== operation) {
      return false;
    }

    if (family === 'logic') {
      return isKangurMobileLogicScore(score);
    }

    if (family === 'time') {
      return isKangurMobileTimeScore(score);
    }

    if (family === 'arithmetic') {
      return getKangurMobileScoreFamily(score) === 'arithmetic';
    }

    return true;
  });
};

export const listKangurMobileScoreOperations = (
  scores: KangurScore[],
): string[] => {
  const seen = new Set<string>();
  const operations: string[] = [];

  scores.forEach((score) => {
    const operation = score.operation.trim();
    if (!operation || seen.has(operation)) {
      return;
    }

    seen.add(operation);
    operations.push(operation);
  });

  return operations;
};

export const buildKangurMobileOperationPerformance = (
  scores: KangurScore[],
): KangurMobileOperationPerformance[] => {
  const byOperation = new Map<
    string,
    {
        bestAccuracyPercent: number;
        family: KangurMobileScorePracticeFamily;
        sessions: number;
        totalAccuracyPercent: number;
      }
  >();

  scores.forEach((score) => {
    const operation = score.operation.trim();
    if (!operation) {
      return;
    }

    const accuracyPercent = getKangurMobileScoreAccuracyPercent(score);
    const current =
      byOperation.get(operation) ?? {
        bestAccuracyPercent: 0,
        family: getKangurMobileScoreFamily(score),
        sessions: 0,
        totalAccuracyPercent: 0,
      };

    current.sessions += 1;
    current.totalAccuracyPercent += accuracyPercent;
    current.bestAccuracyPercent = Math.max(
      current.bestAccuracyPercent,
      accuracyPercent,
    );
    byOperation.set(operation, current);
  });

  return Array.from(byOperation.entries())
    .map(([operation, stats]) => ({
      averageAccuracyPercent: toSafeRoundedPercent(
        stats.totalAccuracyPercent / stats.sessions,
      ),
      bestAccuracyPercent: stats.bestAccuracyPercent,
      family: stats.family,
      operation,
      sessions: stats.sessions,
    }))
    .sort((left, right) => {
      if (right.averageAccuracyPercent !== left.averageAccuracyPercent) {
        return right.averageAccuracyPercent - left.averageAccuracyPercent;
      }
      if (right.sessions !== left.sessions) {
        return right.sessions - left.sessions;
      }
      return left.operation.localeCompare(right.operation);
    });
};

export const buildKangurMobileTrainingFocus = (
  operationPerformance: KangurMobileOperationPerformance[],
): KangurMobileTrainingFocus => ({
  strongestOperation: operationPerformance[0] ?? null,
  weakestOperation:
    operationPerformance.length > 1
      ? operationPerformance[operationPerformance.length - 1] ?? null
      : null,
});

export const buildKangurMobileScoreSummary = (
  scores: KangurScore[],
): KangurMobileScoreSummary => {
  if (scores.length === 0) {
    return {
      arithmeticSessions: 0,
      averageAccuracyPercent: 0,
      bestAccuracyPercent: 0,
      logicSessions: 0,
      timeSessions: 0,
      totalSessions: 0,
    };
  }

  let arithmeticSessions = 0;
  let logicSessions = 0;
  let timeSessions = 0;
  let totalAccuracy = 0;
  let bestAccuracyPercent = 0;

  scores.forEach((score) => {
    const accuracyPercent = getKangurMobileScoreAccuracyPercent(score);
    totalAccuracy += accuracyPercent;
    bestAccuracyPercent = Math.max(bestAccuracyPercent, accuracyPercent);
    const family = getKangurMobileScoreFamily(score);
    if (family === 'logic') {
      logicSessions += 1;
      return;
    }
    if (family === 'time') {
      timeSessions += 1;
      return;
    }
    arithmeticSessions += 1;
  });

  return {
    arithmeticSessions,
    averageAccuracyPercent: toSafeRoundedPercent(totalAccuracy / scores.length),
    bestAccuracyPercent,
    logicSessions,
    timeSessions,
    totalSessions: scores.length,
  };
};

export const formatKangurMobileScoreOperation = (
  value: string,
  locale: KangurMobileLocale = 'pl',
): string => getKangurLeaderboardOperationInfo(value, locale).label;

export const formatKangurMobileScoreFamily = (
  family: KangurMobileScorePracticeFamily,
  locale: KangurMobileLocale = 'pl',
): string => KANGUR_MOBILE_SCORE_FAMILY_LABELS[family][locale];

export const formatKangurMobileScoreDateTime = (
  value: string,
  locale: KangurMobileLocale = 'pl',
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }

  return parsed.toLocaleString(getKangurMobileLocaleTag(locale), {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
};

export const formatKangurMobileScoreDuration = (value: number): string => {
  const safeValue = Math.max(0, Math.floor(value));
  if (safeValue < 60) {
    return `${safeValue}s`;
  }

  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};
