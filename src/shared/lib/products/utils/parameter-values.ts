import type {
  ProductParameterValue,
  ResolvedProductParameterValue,
} from '@/shared/contracts/products';

const normalizeTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const normalizeParameterValuesByLanguage = (
  input: unknown
): Record<string, string> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [languageCode, rawValue]: [string, unknown]) => {
      const normalizedLanguageCode = normalizeTrimmedString(languageCode).toLowerCase();
      const normalizedValue = normalizeTrimmedString(rawValue);
      if (!normalizedLanguageCode || !normalizedValue) return acc;
      acc[normalizedLanguageCode] = normalizedValue;
      return acc;
    },
    {}
  );
};

export const resolveStoredParameterValue = (
  valuesByLanguage: Record<string, string>,
  directValue: string | null | undefined = ''
): string => {
  const normalizedDirectValue = normalizeTrimmedString(directValue);
  const defaultValue = Object.prototype.hasOwnProperty.call(valuesByLanguage, 'default')
    ? (valuesByLanguage['default'] ?? '')
    : '';
  if (defaultValue) return defaultValue;
  if (Object.keys(valuesByLanguage).length === 0) return normalizedDirectValue;
  if (
    normalizedDirectValue &&
    Object.values(valuesByLanguage).some(
      (localizedValue: string): boolean => localizedValue === normalizedDirectValue
    )
  ) {
    return normalizedDirectValue;
  }
  return '';
};

export const mergeProductParameterValue = (
  existing: ProductParameterValue | undefined,
  incoming: {
    parameterId: string;
    value: string;
    valuesByLanguage: Record<string, string>;
  }
): ResolvedProductParameterValue => {
  if (Object.keys(incoming.valuesByLanguage).length === 0) {
    return {
      parameterId: incoming.parameterId,
      value: incoming.value,
    };
  }

  const existingValuesByLanguage = normalizeParameterValuesByLanguage(existing?.valuesByLanguage);
  const mergedValuesByLanguage = {
    ...existingValuesByLanguage,
    ...incoming.valuesByLanguage,
  };
  const scalarCandidate = incoming.value || normalizeTrimmedString(existing?.value);

  return {
    parameterId: incoming.parameterId,
    value: resolveStoredParameterValue(mergedValuesByLanguage, scalarCandidate),
    valuesByLanguage: mergedValuesByLanguage,
  };
};
