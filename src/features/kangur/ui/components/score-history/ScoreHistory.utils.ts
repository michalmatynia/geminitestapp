'use client';

import type { TranslationValues } from 'use-intl';
import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  buildKangurScoreInsights,
} from '@/features/kangur/ui/services/score-insights';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { OP_ACCENTS } from './ScoreHistory.constants';
import type { ScoreHistoryFallbackCopy } from './ScoreHistory.types';

export const interpolateScoreHistoryTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

export const translateScoreHistoryWithFallback = (
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  if (!translate) {
    return interpolateScoreHistoryTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return interpolateScoreHistoryTemplate(
    translated === key || translated.endsWith(`.${key}`) ? fallback : translated,
    values
  );
};

export const formatRelativeLastPlayed = (
  value: string | null,
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (!value) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.noActivity',
      fallbackCopy.relative.noActivity
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.noActivity',
      fallbackCopy.relative.noActivity
    );
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const playedMidnight = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round(
    (todayMidnight.getTime() - playedMidnight.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays <= 0) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.today',
      fallbackCopy.relative.today
    );
  }
  if (diffDays === 1) {
    return translateScoreHistoryWithFallback(
      translate,
      'relative.yesterday',
      fallbackCopy.relative.yesterday
    );
  }
  return translateScoreHistoryWithFallback(
    translate,
    'relative.daysAgo',
    fallbackCopy.relative.daysAgo,
    { days: diffDays }
  );
};

export const formatTrendValue = (
  deltaAccuracy: number | null,
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (deltaAccuracy === null) {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.newRange',
      fallbackCopy.trend.newRange
    );
  }
  if (deltaAccuracy > 0) {
    return `+${deltaAccuracy} pp`;
  }
  return `${deltaAccuracy} pp`;
};

export const formatTrendContext = (
  trend: ReturnType<typeof buildKangurScoreInsights>['trend'],
  translate: ((key: string, values?: TranslationValues) => string) | undefined,
  fallbackCopy: ScoreHistoryFallbackCopy
): string => {
  if (trend.previousAverageAccuracy === null) {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.insufficient',
      fallbackCopy.trend.context.insufficient
    );
  }
  if (trend.direction === 'up') {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.up',
      fallbackCopy.trend.context.up,
      {
        previous: trend.previousAverageAccuracy,
        recent: trend.recentAverageAccuracy,
      }
    );
  }
  if (trend.direction === 'down') {
    return translateScoreHistoryWithFallback(
      translate,
      'trend.context.down',
      fallbackCopy.trend.context.down,
      {
        previous: trend.previousAverageAccuracy,
        recent: trend.recentAverageAccuracy,
      }
    );
  }
  return translateScoreHistoryWithFallback(
    translate,
    'trend.context.flat',
    fallbackCopy.trend.context.flat,
    { recent: trend.recentAverageAccuracy }
  );
};

export const buildLessonFocusHref = (basePath: string, operation: string): string =>
  appendKangurUrlParams(createPageUrl('Lessons', basePath), { focus: operation }, basePath);

export const resolveOperationAccent = (operation: string): KangurAccent => OP_ACCENTS[operation] ?? 'slate';

export const resolveAccuracyAccent = (percent: number): KangurAccent => {
  if (percent >= 90) {
    return 'emerald';
  }
  if (percent >= 70) {
    return 'amber';
  }
  return 'rose';
};
