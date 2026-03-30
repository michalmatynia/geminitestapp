import type { KangurLearnerProfileTranslate } from './profile-types';

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const translateKangurLearnerProfileWithFallback = (
  translate: KangurLearnerProfileTranslate | undefined,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
): string => {
  if (!translate) {
    return fallback;
  }

  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateOrNull = (raw: string): Date | null => {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toDateAtLocalMidnight = (value: string): Date => {
  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(year, month - 1, day);
};

export const toPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const resolvePracticeDifficulty = (averageAccuracy: number): 'easy' | 'medium' | 'hard' => {
  if (averageAccuracy >= 85) {
    return 'hard';
  }
  if (averageAccuracy >= 70) {
    return 'medium';
  }
  return 'easy';
};

export const normalizeXpEarned = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
