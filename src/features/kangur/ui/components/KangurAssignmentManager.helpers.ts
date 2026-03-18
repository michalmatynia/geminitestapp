import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';

export const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'time', label: 'Czas' },
  { value: 'arithmetic', label: 'Arytmetyka' },
  { value: 'geometry', label: 'Geometria' },
  { value: 'logic', label: 'Logika' },
  { value: 'practice', label: 'Trening' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const TIME_LIMIT_MINUTES_MIN = 1;
export const TIME_LIMIT_MINUTES_MAX = 240;

export type FilterOption = (typeof FILTER_OPTIONS)[number]['value'];

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

export const formatTimeLimitValue = (value: number | null | undefined): string | null => {
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
    return `${hours} godz. ${minutes} min`;
  }
  if (hours > 0) {
    return `${hours} godz.`;
  }
  return `${rounded} min`;
};

export const parseTimeLimitInput = (
  value: string
): { value: number | null; error: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { value: null, error: 'Podaj pełne minuty.' };
  }
  if (parsed < TIME_LIMIT_MINUTES_MIN || parsed > TIME_LIMIT_MINUTES_MAX) {
    return {
      value: null,
      error: `Zakres: ${TIME_LIMIT_MINUTES_MIN}-${TIME_LIMIT_MINUTES_MAX} min.`,
    };
  }

  return { value: parsed, error: null };
};
