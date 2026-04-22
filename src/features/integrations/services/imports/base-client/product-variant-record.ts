import type { BaseProductRecord } from '@/shared/contracts/integrations/base-api';

import { toStringId } from '../base-client-parsers';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getVariantRecord = (
  parentRecord: BaseProductRecord,
  variantId: string
): Record<string, unknown> | null => {
  const variants = parentRecord['variants'];
  if (!isPlainRecord(variants)) {
    return null;
  }
  const variant = variants[variantId];
  return isPlainRecord(variant) ? variant : null;
};

const getParentProductId = (parentRecord: BaseProductRecord): string | null =>
  toStringId(
    parentRecord['base_product_id'] ?? parentRecord['product_id'] ?? parentRecord['id']
  );

export const deriveVariantBaseProductRecord = (
  parentRecord: BaseProductRecord,
  variantId: string
): BaseProductRecord | null => {
  const variantRecord = getVariantRecord(parentRecord, variantId);
  if (variantRecord === null) {
    return null;
  }

  const parentProductId = getParentProductId(parentRecord);
  const normalizedVariantId =
    toStringId(variantRecord['variant_id'] ?? variantRecord['product_id'] ?? variantRecord['id']) ??
    toStringId(variantId);
  if (normalizedVariantId === null) {
    return null;
  }

  return {
    ...parentRecord,
    ...variantRecord,
    id: normalizedVariantId,
    product_id: normalizedVariantId,
    base_product_id: normalizedVariantId,
    ...(parentProductId !== null ? { parent_id: parentProductId } : {}),
  };
};
