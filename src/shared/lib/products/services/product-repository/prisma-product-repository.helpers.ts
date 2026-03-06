import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterGroup,
  type ProductParameterValue,
} from '@/shared/contracts/products';
import { logger } from '@/shared/utils/logger';

export function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key: string) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}

export const normalizeImageFileIds = (imageFileIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const rawId of imageFileIds) {
    const trimmed = rawId.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

export const normalizeProductParameterValues = (input: unknown): ProductParameterValue[] => {
  if (!Array.isArray(input)) return [];
  const resolvePrimaryLocalizedValue = (map: Record<string, string>): string =>
    map['default'] ||
    map['en'] ||
    map['pl'] ||
    map['de'] ||
    Object.values(map).find(
      (entry: string): boolean => typeof entry === 'string' && entry.length > 0
    ) ||
    '';
  const byParameterId = new Map<string, ProductParameterValue>();
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const parameterId = decodeSimpleParameterStorageId(
      typeof record['parameterId'] === 'string' ? record['parameterId'] : ''
    );
    if (!parameterId) return;
    const value = typeof record['value'] === 'string' ? record['value'] : '';
    const valuesByLanguageRaw = record['valuesByLanguage'];
    const valuesByLanguage =
      valuesByLanguageRaw &&
      typeof valuesByLanguageRaw === 'object' &&
      !Array.isArray(valuesByLanguageRaw)
        ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
            (acc: Record<string, string>, [languageCode, languageValue]) => {
              const normalizedCode = languageCode.trim().toLowerCase();
              if (!normalizedCode || typeof languageValue !== 'string') return acc;
              acc[normalizedCode] = languageValue;
              return acc;
            },
            {}
          )
        : {};
    const resolvedValue = value || resolvePrimaryLocalizedValue(valuesByLanguage) || '';
    byParameterId.set(parameterId, {
      parameterId,
      value: resolvedValue,
      ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
    });
  });
  return Array.from(byParameterId.values());
};

export const BASE_INTEGRATION_SLUGS = ['baselinker', 'base-com', 'base'] as const;

export const parseAdvancedFilterGroup = (
  payload: string | undefined
): ProductAdvancedFilterGroup | null => {
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    if (validated.success) return validated.data;
    logger.warn('[products.advanced-filter.prisma] validation failed', {
      issues: validated.error.issues.slice(0, 5).map((issue) => issue.message),
    });
    return null;
  } catch {
    logger.warn('[products.advanced-filter.prisma] invalid JSON payload');
    return null;
  }
};

export const toAdvancedStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toAdvancedNumberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const toAdvancedDateValue = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

export const toAdvancedBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return null;
};

export const toAdvancedStringArrayValues = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry: unknown) => toAdvancedStringValue(entry))
    .filter((entry: string | null): entry is string => entry !== null);
  return Array.from(new Set(normalized));
};
