type ProductParameterRecord = Record<string, unknown>;

export type ProductParameterLanguageBackfillResult = {
  nextParameters: unknown[];
  changed: boolean;
  repairedCount: number;
  repairedParameterIds: string[];
};

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const hasLanguageCode = (
  valuesByLanguage: Record<string, unknown>,
  languageCode: string
): boolean => {
  const normalizedLanguageCode = normalizeTrimmedString(languageCode).toLowerCase();
  if (!normalizedLanguageCode) return false;
  return Object.keys(valuesByLanguage).some(
    (key: string): boolean => normalizeTrimmedString(key).toLowerCase() === normalizedLanguageCode
  );
};

const hasAnyLocalizedValue = (valuesByLanguage: Record<string, unknown>): boolean =>
  Object.values(valuesByLanguage).some((value: unknown): boolean => normalizeTrimmedString(value).length > 0);

const repairParameterRecord = (
  entry: ProductParameterRecord,
  languageCode: string
): { nextEntry: ProductParameterRecord; changed: boolean } => {
  const directValue = normalizeTrimmedString(entry['value']);
  const valuesByLanguage = toRecord(entry['valuesByLanguage']);
  if (!valuesByLanguage || !hasAnyLocalizedValue(valuesByLanguage) || !directValue) {
    return { nextEntry: entry, changed: false };
  }
  if (hasLanguageCode(valuesByLanguage, languageCode)) {
    return { nextEntry: entry, changed: false };
  }

  return {
    nextEntry: {
      ...entry,
      valuesByLanguage: {
        ...valuesByLanguage,
        [normalizeTrimmedString(languageCode).toLowerCase()]: directValue,
      },
    },
    changed: true,
  };
};

export const backfillProductParameterLanguageValues = (args: {
  parameters: unknown;
  languageCode?: string;
}): ProductParameterLanguageBackfillResult => {
  const input = Array.isArray(args.parameters) ? args.parameters : [];
  const languageCode = normalizeTrimmedString(args.languageCode || 'en').toLowerCase() || 'en';

  let repairedCount = 0;
  const repairedParameterIds: string[] = [];

  const nextParameters = input.map((entry: unknown): unknown => {
    const record = toRecord(entry);
    if (!record) return entry;

    const repairResult = repairParameterRecord(record, languageCode);
    if (!repairResult.changed) return entry;

    repairedCount += 1;
    const parameterId = normalizeTrimmedString(record['parameterId']);
    if (parameterId) {
      repairedParameterIds.push(parameterId);
    }
    return repairResult.nextEntry;
  });

  return {
    nextParameters,
    changed: repairedCount > 0,
    repairedCount,
    repairedParameterIds,
  };
};
