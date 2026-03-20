import type { KangurAssignmentSnapshot } from '@kangur/platform';

export const FILTER_OPTION_VALUES = [
  'all',
  'time',
  'arithmetic',
  'geometry',
  'logic',
  'practice',
] as const;

export const TIME_LIMIT_MINUTES_MIN = 1;
export const TIME_LIMIT_MINUTES_MAX = 240;

export type FilterOption = (typeof FILTER_OPTION_VALUES)[number];

export type KangurAssignmentTrackerSummary = {
  activeCount: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
};

export const buildTrackerSummary = (
  assignments: KangurAssignmentSnapshot[]
): KangurAssignmentTrackerSummary => {
  const visibleAssignments = assignments.filter((assignment) => !assignment.archived);
  const activeAssignments = visibleAssignments.filter(
    (assignment) => assignment.progress.status !== 'completed'
  );
  const notStartedCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'not_started'
  ).length;
  const inProgressCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'in_progress'
  ).length;
  const completedCount = visibleAssignments.filter(
    (assignment) => assignment.progress.status === 'completed'
  ).length;

  return {
    activeCount: activeAssignments.length,
    notStartedCount,
    inProgressCount,
    completedCount,
    completionRate:
      visibleAssignments.length === 0
        ? 0
        : Math.round((completedCount / visibleAssignments.length) * 100),
  };
};

export const formatTimeLimitValue = (
  value: number | null | undefined,
  formatLabel: (
    key: 'hoursMinutes' | 'hoursOnly' | 'minutesOnly',
    values: Record<string, number>
  ) => string
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return null;
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours > 0 && minutes > 0) {
    return formatLabel('hoursMinutes', { hours, minutes });
  }
  if (hours > 0) {
    return formatLabel('hoursOnly', { hours });
  }
  return formatLabel('minutesOnly', { minutes: rounded });
};

export const parseTimeLimitInput = (
  value: string
): { value: number | null; errorKey: 'validation.integerMinutes' | 'validation.range' | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, errorKey: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { value: null, errorKey: 'validation.integerMinutes' };
  }
  if (parsed < TIME_LIMIT_MINUTES_MIN || parsed > TIME_LIMIT_MINUTES_MAX) {
    return {
      value: null,
      errorKey: 'validation.range',
    };
  }

  return { value: parsed, errorKey: null };
};
