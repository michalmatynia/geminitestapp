'use client';

import type { KangurAssignmentSnapshot } from '@kangur/platform';

export type FilterOption = 'all' | 'unassigned' | 'assigned';
export const FILTER_OPTION_VALUES: FilterOption[] = ['all', 'unassigned', 'assigned'];

export const TIME_LIMIT_MINUTES_MIN = 5;
export const TIME_LIMIT_MINUTES_MAX = 120;

export type TimeLimitParsedValue = {
  value: number | null;
  errorKey: string | null;
};

export const parseTimeLimitInput = (input: string): TimeLimitParsedValue => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, errorKey: null };
  }

  const numericValue = parseInt(trimmed, 10);
  if (Number.isNaN(numericValue)) {
    return { value: null, errorKey: 'timeLimit.invalidFormat' };
  }

  if (numericValue < TIME_LIMIT_MINUTES_MIN) {
    return { value: numericValue, errorKey: 'timeLimit.tooSmall' };
  }

  if (numericValue > TIME_LIMIT_MINUTES_MAX) {
    return { value: numericValue, errorKey: 'timeLimit.tooLarge' };
  }

  return { value: numericValue, errorKey: null };
};

export const formatTimeLimitValue = (
  minutes: number | null | undefined,
  translate: (key: string, values?: Record<string, any>) => string
): string => {
  if (minutes === null || minutes === undefined || minutes <= 0) {
    return translate('noLimit');
  }

  if (minutes < 60) {
    return translate('minutes', { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return translate('hours', { count: hours });
  }

  return translate('hoursMinutes', { hours, minutes: remainingMinutes });
};

export type TrackerSummary = {
  activeCount: number;
  completedCount: number;
  totalXp: number;
  averageMasteryPercent: number;
};

export const buildTrackerSummary = (
  assignments: KangurAssignmentSnapshot[]
): TrackerSummary => {
  const active = assignments.filter((a) => !a.archived && a.progress.status !== 'completed');
  const completed = assignments.filter((a) => !a.archived && a.progress.status === 'completed');

  const totalXp = completed.reduce((sum, a) => sum + (a.progress.xpEarned ?? 0), 0);
  const masterySum = completed.reduce((sum, a) => sum + (a.progress.masteryPercent ?? 0), 0);
  const averageMasteryPercent = completed.length > 0 ? Math.round(masterySum / completed.length) : 0;

  return {
    activeCount: active.length,
    completedCount: completed.length,
    totalXp,
    averageMasteryPercent,
  };
};
