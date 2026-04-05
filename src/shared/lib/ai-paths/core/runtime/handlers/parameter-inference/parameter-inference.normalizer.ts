import {
  coerceArrayLike,
  normalizeNonEmptyString,
  resolveParameterValue,
  toRecord,
} from '../database-parameter-inference-utils';

export const normalizeParameterId = (value: unknown): string | null => normalizeNonEmptyString(value);

export const normalizeParameterEntries = (
  value: unknown,
  options: { allowEmptyValue: boolean }
): Array<{ parameterId: string; value: string; raw: Record<string, unknown> }> => {
  const entries = coerceArrayLike(value);
  const normalized: Array<{ parameterId: string; value: string; raw: Record<string, unknown> }> =
    [];
  const seen = new Set<string>();
  entries.forEach((entry: unknown) => {
    const record = toRecord(entry);
    if (!record) return;
    const parameterId =
      normalizeParameterId(record['parameterId']) ?? normalizeParameterId(record['id']);
    if (!parameterId || seen.has(parameterId)) return;
    const resolvedValue = resolveParameterValue(record['value']);
    if (!resolvedValue && !options.allowEmptyValue) return;
    normalized.push({
      parameterId,
      value: resolvedValue ?? '',
      raw: { ...record },
    });
    seen.add(parameterId);
  });
  return normalized;
};

export const coerceParameterRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry: unknown): Record<string, unknown> | null => toRecord(entry))
      .filter((entry: Record<string, unknown> | null): entry is Record<string, unknown> =>
        Boolean(entry)
      );
  }
  const record = toRecord(value);
  if (record && Array.isArray(record['parameters'])) {
    return record['parameters']
      .map((entry: unknown): Record<string, unknown> | null => toRecord(entry))
      .filter((entry: Record<string, unknown> | null): entry is Record<string, unknown> =>
        Boolean(entry)
      );
  }
  return coerceArrayLike(value)
    .map((entry: unknown): Record<string, unknown> | null => toRecord(entry))
    .filter((entry: Record<string, unknown> | null): entry is Record<string, unknown> =>
      Boolean(entry)
    );
};
