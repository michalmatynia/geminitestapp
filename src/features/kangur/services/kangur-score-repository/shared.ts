import type { KangurScore, KangurScoreSort, KangurScoreSortField } from '@/features/kangur/shared/contracts/kangur';

export type NormalizedSort = {
  field: KangurScoreSortField;
  direction: 'asc' | 'desc';
};

const SCORE_SORTABLE_FIELDS = new Set<KangurScoreSortField>([
  'created_date',
  'score',
  'time_taken',
  'correct_answers',
  'total_questions',
  'player_name',
  'operation',
]);

export const normalizeSort = (sort: KangurScoreSort | undefined): NormalizedSort => {
  if (!sort || sort.trim().length === 0) {
    return { field: 'created_date', direction: 'desc' };
  }

  const isDesc = sort.startsWith('-');
  const rawField = (isDesc ? sort.slice(1) : sort) as KangurScoreSortField;
  const field = SCORE_SORTABLE_FIELDS.has(rawField) ? rawField : 'created_date';
  return {
    field,
    direction: isDesc ? 'desc' : 'asc',
  };
};

const compareScalar = (left: unknown, right: unknown): number => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left ?? '').localeCompare(String(right ?? ''), 'pl');
};

export const sortScores = (
  scores: KangurScore[],
  sort: KangurScoreSort | undefined
): KangurScore[] => {
  const normalized = normalizeSort(sort);
  return [...scores].sort((left, right) => {
    const value = compareScalar(left[normalized.field], right[normalized.field]);
    return normalized.direction === 'desc' ? -value : value;
  });
};
