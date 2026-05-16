import { buildEffectiveProductSyncFieldRules } from '@/shared/contracts/product-sync';
import type {
  ProductSyncAppField,
  ProductSyncFieldRule,
} from '@/shared/contracts/product-sync';
import type { ProductWithImages, ProductParameterValue } from '@/shared/contracts/products/product';

import {
  toTrimmedString,
  coerceNumber,
  serializeArrayField,
} from './utils';
import {
  normalizeParameterSyncValues,
  extractBaseRecordParameterSyncValues,
  isParameterCollectionBaseField,
  hasLocalizedParameterTextFieldBuckets,
  normalizeLanguageCode,
} from './parameter-normalization';

export const extractLanguageFromBaseFieldPath = (path: string): string | null => {
  const lastSegment = path.split('.').pop() ?? path;
  const separatorIndex = lastSegment.lastIndexOf('|');
  if (separatorIndex < 0) return null;
  const languageCode = normalizeLanguageCode(lastSegment.slice(separatorIndex + 1));
  return languageCode === 'default' ? null : languageCode;
};

export const resolvePathValue = (record: Record<string, unknown>, path: string): unknown => {
  const normalizedPath = toTrimmedString(path);
  if (normalizedPath === '') return undefined;

  const parts = normalizedPath.split('.').map((segment: string) => segment.trim());
  let current: unknown = record;

  for (const segment of parts) {
    if (segment === '') return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index)) return undefined;
      current = current[index];
      continue;
    }
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

export const setPathValue = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const normalizedPath = toTrimmedString(path);
  if (normalizedPath === '') return;

  const segments = normalizedPath.split('.').map((segment: string) => segment.trim());
  if (segments.length === 0) return;

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index];
    if (key === '') return;
    const next = current[key];
    if (next === null || next === undefined || typeof next !== 'object' || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = segments[segments.length - 1];
  if (lastKey === '') return;
  current[lastKey] = value;
};

export const normalizeFieldValue = (
  appField: ProductSyncAppField,
  value: unknown
): string | number | null => {
  if (
    appField === 'stock' ||
    appField === 'price' ||
    appField === 'weight' ||
    appField === 'length' ||
    appField === 'width'
  ) {
    return coerceNumber(value);
  }
  if (appField === 'parameters' || appField === 'custom_fields') {
    if (appField === 'parameters') {
      const parameters = normalizeParameterSyncValues(value);
      return parameters.length > 0 ? serializeArrayField(parameters) : null;
    }
    return serializeArrayField(value);
  }
  const stringValue = toTrimmedString(value);
  return stringValue !== '' ? stringValue : null;
};

export const buildLocalPatchValue = (
  appField: ProductSyncAppField,
  rawBaseValue: unknown,
  normalizedBaseValue: string | number | null
): unknown => {
  if (normalizedBaseValue === null) return null;
  if (appField === 'parameters') return normalizeParameterSyncValues(rawBaseValue);
  if (appField === 'custom_fields') return rawBaseValue;
  return normalizedBaseValue;
};

export const valuesEqual = (appField: ProductSyncAppField, left: unknown, right: unknown): boolean => {
  const normalizedLeft = normalizeFieldValue(appField, left);
  const normalizedRight = normalizeFieldValue(appField, right);

  if (normalizedLeft === null && normalizedRight === null) return true;
  return normalizedLeft === normalizedRight;
};

export const getProductFieldValue = (product: ProductWithImages, field: ProductSyncAppField): unknown => {
  if (field === 'name_en') return product.name_en;
  if (field === 'name_pl') return product.name_pl;
  if (field === 'description_en') return product.description_en;
  if (field === 'description_pl') return product.description_pl;
  if (field === 'stock') return product.stock;
  if (field === 'price') return product.price;
  if (field === 'sku') return product.sku;
  if (field === 'ean') return product.ean;
  if (field === 'asin') return product.asin;
  if (field === 'weight') return product.weight;
  if (field === 'length') return product.length;
  if (field === 'width') return product.sizeWidth;
  if (field === 'category') return product.categoryId;
  if (field === 'parameters') return product.parameters;
  if (field === 'custom_fields') return product.customFields;
  return null;
};

const readNumericFromPriceEntry = (entry: unknown): number | null => {
  if (typeof entry === 'number') return Number.isFinite(entry) ? entry : null;
  if (typeof entry === 'string') return coerceNumber(entry);
  if (entry != null && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const candidate = e['price'] ?? e['price_brutto'] ?? e['price_gross'] ?? e['gross'];
    return coerceNumber(candidate);
  }
  return null;
};

const resolveFirstPriceFromRecord = (record: Record<string, unknown>): number | null => {
  const group0 = resolvePathValue(record, 'prices.0');
  if (group0 !== undefined && group0 !== null) {
    const v = readNumericFromPriceEntry(group0);
    if (v !== null) return v;
  }
  const topLevel = readNumericFromPriceEntry({
    price: record['price'],
    price_brutto: record['price_brutto'],
    price_gross: record['price_gross'],
  });
  if (topLevel !== null) return topLevel;
  const pricesObj = record['prices'];
  if (pricesObj != null && typeof pricesObj === 'object' && !Array.isArray(pricesObj)) {
    for (const entry of Object.values(pricesObj as Record<string, unknown>)) {
      const v = readNumericFromPriceEntry(entry);
      if (v !== null) return v;
    }
  }
  return null;
};

export const resolveDefaultBaseValue = (
  appField: ProductSyncAppField,
  record: Record<string, unknown>
): unknown => {
  if (appField === 'stock') {
    return resolvePathValue(record, 'stock');
  }
  if (appField === 'price') {
    return resolveFirstPriceFromRecord(record);
  }
  if (appField === 'name_en') {
    return (
      resolvePathValue(record, 'name_en') ??
      resolvePathValue(record, 'text_fields.name_en') ??
      resolvePathValue(record, 'text_fields.name|en') ??
      resolvePathValue(record, 'text_fields.name') ??
      resolvePathValue(record, 'name')
    );
  }
  if (appField === 'description_en') {
    return (
      resolvePathValue(record, 'description_en') ??
      resolvePathValue(record, 'text_fields.description_en') ??
      resolvePathValue(record, 'text_fields.description|en') ??
      resolvePathValue(record, 'text_fields.description') ??
      resolvePathValue(record, 'description')
    );
  }
  if (appField === 'sku') {
    return resolvePathValue(record, 'sku');
  }
  if (appField === 'ean') {
    return resolvePathValue(record, 'ean');
  }
  if (appField === 'weight') {
    return resolvePathValue(record, 'weight');
  }
  if (appField === 'name_pl') {
    return (
      resolvePathValue(record, 'name_pl') ??
      resolvePathValue(record, 'text_fields.name_pl') ??
      resolvePathValue(record, 'text_fields.name|pl') ??
      resolvePathValue(record, 'name|pl') ??
      resolvePathValue(record, 'text_fields.name') ??
      resolvePathValue(record, 'name')
    );
  }
  if (appField === 'description_pl') {
    return (
      resolvePathValue(record, 'description_pl') ??
      resolvePathValue(record, 'text_fields.description_pl') ??
      resolvePathValue(record, 'text_fields.description|pl') ??
      resolvePathValue(record, 'description|pl') ??
      resolvePathValue(record, 'text_fields.description') ??
      resolvePathValue(record, 'description')
    );
  }
  if (appField === 'length') {
    return resolvePathValue(record, 'length');
  }
  if (appField === 'width') {
    return resolvePathValue(record, 'width');
  }
  if (appField === 'category') {
    return (
      resolvePathValue(record, 'category_id') ??
      resolvePathValue(record, 'category')
    );
  }
  if (appField === 'parameters') {
    const extracted = extractBaseRecordParameterSyncValues(record);
    if (extracted.length > 0) return extracted;
    return undefined;
  }
  if (appField === 'custom_fields') {
    return (
      resolvePathValue(record, 'custom_fields') ??
      resolvePathValue(record, 'features')
    );
  }
  return undefined;
};

export const resolveBaseValueByRule = (
  rule: ProductSyncFieldRule,
  record: Record<string, unknown>
): unknown => {
  if (rule.appField === 'parameters') {
    const normalizedBaseField = toTrimmedString(rule.baseField);
    const byPath = resolvePathValue(record, normalizedBaseField);
    if (byPath !== undefined && byPath !== null) {
      const languageCode = extractLanguageFromBaseFieldPath(normalizedBaseField);
      if (languageCode !== null) {
        return normalizeParameterSyncValues(byPath, languageCode);
      }
      if (isParameterCollectionBaseField(normalizedBaseField)) {
        if (hasLocalizedParameterTextFieldBuckets(record)) {
          const extracted = extractBaseRecordParameterSyncValues(record);
          if (extracted.length > 0) return extracted;
        }
      }
      return normalizeParameterSyncValues(byPath);
    }
    return resolveDefaultBaseValue(rule.appField, record);
  }

  const byPath = resolvePathValue(record, rule.baseField);
  if (byPath !== undefined && byPath !== null) {
    return byPath;
  }
  return resolveDefaultBaseValue(rule.appField, record);
};
