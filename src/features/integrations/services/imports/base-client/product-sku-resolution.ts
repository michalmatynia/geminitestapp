import type { BaseProductRecord } from '@/shared/contracts/integrations/base-api';

import { toStringId } from '../base-client-parsers';

const normalizeSku = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const getTopLevelProductId = (record: BaseProductRecord): string | null =>
  toStringId(record['product_id'] ?? record['id'] ?? record['base_product_id']);

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getVariantEntries = (variants: unknown): Array<[string, unknown]> => {
  if (!isPlainRecord(variants) && !Array.isArray(variants)) {
    return [];
  }

  if (Array.isArray(variants)) {
    return variants.map((variant, index) => [String(index), variant]);
  }

  return Object.entries(variants);
};

const resolveVariantProductId = (variantKey: string, variant: unknown): string | null => {
  if (isPlainRecord(variant)) {
    return (
      toStringId(variant['variant_id'] ?? variant['product_id'] ?? variant['id']) ??
      toStringId(variantKey)
    );
  }

  return toStringId(variantKey);
};

const resolveVariantSkuMatch = (
  variantEntries: Array<[string, unknown]>,
  normalizedTargetSku: string
): string | null => {
  for (const [variantKey, variant] of variantEntries) {
    if (!isPlainRecord(variant)) {
      continue;
    }
    const variantSku = normalizeSku(variant['sku'] ?? variant['SKU'] ?? variant['Sku']);
    if (variantSku === normalizedTargetSku) {
      return resolveVariantProductId(variantKey, variant);
    }
  }

  return null;
};

export const resolveBaseProductIdBySku = (
  record: BaseProductRecord,
  targetSku: string
): string | null => {
  const normalizedTargetSku = normalizeSku(targetSku);
  if (normalizedTargetSku === null) {
    return null;
  }

  const topLevelSku = normalizeSku(record['sku'] ?? record['SKU'] ?? record['Sku']);
  if (topLevelSku === normalizedTargetSku) {
    return getTopLevelProductId(record);
  }

  return resolveVariantSkuMatch(getVariantEntries(record['variants']), normalizedTargetSku);
};
