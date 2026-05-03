export type KangurPracticeDebugAutoCompleteMode = 'perfect';

export const resolveKangurPracticeDebugAutoComplete = (
  value: string | string[] | null | undefined,
): KangurPracticeDebugAutoCompleteMode | null => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  return rawValue === 'perfect' ? 'perfect' : null;
};
