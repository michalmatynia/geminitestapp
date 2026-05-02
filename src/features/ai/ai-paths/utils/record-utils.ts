export const toRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const toSampleStateMap = <T = unknown>(value: unknown): Record<string, T> | undefined => {
  const record = toRecord(value);
  if (record === null) return undefined;
  return record as Record<string, T>;
};
