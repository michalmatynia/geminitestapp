import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products';
import type {
  ProductParameterValue,
  ProductSimpleParameterValue,
} from '@/shared/contracts/products';

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeValuesByLanguage = (input: unknown): Record<string, string> | undefined => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  const normalized = Object.entries(input as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [languageCode, rawValue]: [string, unknown]) => {
      const code = toTrimmedString(languageCode).toLowerCase();
      if (!code) return acc;
      acc[code] = typeof rawValue === 'string' ? rawValue : '';
      return acc;
    },
    {}
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const isSimpleParameterStorageId = (parameterId: string): boolean =>
  parameterId.startsWith(PRODUCT_SIMPLE_PARAMETER_ID_PREFIX);

export const encodeSimpleParameterStorageId = (parameterId: string): string => {
  const normalizedId = toTrimmedString(parameterId);
  if (!normalizedId) return '';
  if (isSimpleParameterStorageId(normalizedId)) return normalizedId;
  return `${PRODUCT_SIMPLE_PARAMETER_ID_PREFIX}${normalizedId}`;
};

export const decodeSimpleParameterStorageId = (parameterId: string): string => {
  if (!isSimpleParameterStorageId(parameterId)) return parameterId;
  return parameterId.slice(PRODUCT_SIMPLE_PARAMETER_ID_PREFIX.length).trim();
};

export const splitProductParameterValues = (
  input: ProductParameterValue[] | null | undefined
): {
  customFieldValues: ProductParameterValue[];
  simpleParameterValues: ProductSimpleParameterValue[];
} => {
  if (!Array.isArray(input)) {
    return { customFieldValues: [], simpleParameterValues: [] };
  }

  return input.reduce(
    (
      acc: {
        customFieldValues: ProductParameterValue[];
        simpleParameterValues: ProductSimpleParameterValue[];
      },
      entry: ProductParameterValue
    ) => {
      const parameterId = toTrimmedString(entry?.parameterId);
      if (!parameterId) return acc;

      if (isSimpleParameterStorageId(parameterId)) {
        const decodedId = decodeSimpleParameterStorageId(parameterId);
        if (!decodedId) return acc;
        const value = typeof entry?.value === 'string' ? entry.value : '';
        acc.simpleParameterValues.push({
          parameterId: decodedId,
          value,
        });
        return acc;
      }

      const value = typeof entry?.value === 'string' ? entry.value : '';
      const valuesByLanguage = normalizeValuesByLanguage(entry?.valuesByLanguage);
      acc.customFieldValues.push({
        parameterId,
        value,
        ...(valuesByLanguage ? { valuesByLanguage } : {}),
      });
      return acc;
    },
    { customFieldValues: [], simpleParameterValues: [] }
  );
};

export const mergeProductParameterValues = (input: {
  customFieldValues: ProductParameterValue[];
  simpleParameterValues: ProductSimpleParameterValue[];
}): ProductParameterValue[] => {
  const customFieldValues = Array.isArray(input.customFieldValues) ? input.customFieldValues : [];
  const simpleParameterValues = Array.isArray(input.simpleParameterValues)
    ? input.simpleParameterValues
    : [];

  const normalizedCustomFieldValues = customFieldValues.reduce(
    (acc: ProductParameterValue[], entry: ProductParameterValue) => {
      const parameterId = toTrimmedString(entry?.parameterId);
      if (!parameterId || isSimpleParameterStorageId(parameterId)) return acc;
      const value = typeof entry?.value === 'string' ? entry.value : '';
      const valuesByLanguage = normalizeValuesByLanguage(entry?.valuesByLanguage);
      acc.push({
        parameterId,
        value,
        ...(valuesByLanguage ? { valuesByLanguage } : {}),
      });
      return acc;
    },
    []
  );

  const normalizedSimpleParameterValues = simpleParameterValues.reduce(
    (acc: ProductParameterValue[], entry: ProductSimpleParameterValue) => {
      const parameterId = encodeSimpleParameterStorageId(entry?.parameterId ?? '');
      if (!parameterId) return acc;
      const value = typeof entry?.value === 'string' ? entry.value : '';
      acc.push({
        parameterId,
        value,
      });
      return acc;
    },
    []
  );

  return [...normalizedCustomFieldValues, ...normalizedSimpleParameterValues];
};
