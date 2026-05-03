export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const asNullableBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

export const asNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const asRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
};
