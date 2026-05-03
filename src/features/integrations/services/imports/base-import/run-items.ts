import {
  checkBaseSkuExists,
  fetchBaseProductById,
  fetchBaseProductIds,
} from '@/features/integrations/services/imports/base-client';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  normalizeDirectTarget,
  normalizeSelectedIds,
  shouldFilterToUniqueOnly,
  toStringId,
} from '../base-import-service-shared';

export type ResolveRunItemsResult = {
  ids: string[];
  resolutionError: string | null;
};

const resolveDirectTarget = async (input: {
  token: string;
  inventoryId: string;
  directTarget: {
    type: 'base_product_id' | 'sku';
    value: string;
  };
}): Promise<ResolveRunItemsResult> => {
  if (input.directTarget.type === 'base_product_id') {
    const product = await fetchBaseProductById(input.token, input.inventoryId, input.directTarget.value);
    const resolvedId =
      toStringId(product?.['product_id']) ??
      toStringId(product?.['id']) ??
      toStringId(product?.['base_product_id']);

    return resolvedId
      ? { ids: [resolvedId], resolutionError: null }
      : {
          ids: [],
          resolutionError: `Base product ID ${input.directTarget.value} was not found in the selected inventory.`,
        };
  }

  const skuLookup = await checkBaseSkuExists(input.token, input.inventoryId, input.directTarget.value);
  if (skuLookup.exists && skuLookup.productId) {
    return {
      ids: [skuLookup.productId],
      resolutionError: null,
    };
  }

  return {
    ids: [],
    resolutionError: skuLookup.exists
      ? `SKU ${input.directTarget.value} exists but could not be resolved to a Base product ID in the selected inventory.`
      : `SKU ${input.directTarget.value} was not found in the selected inventory.`,
  };
};

export const resolveRunItems = async (input: {
  token: string;
  inventoryId: string;
  selectedIds?: string[];
  directTarget?: {
    type: 'base_product_id' | 'sku';
    value: string;
  };
  limit?: number;
  uniqueOnly: boolean;
}): Promise<ResolveRunItemsResult> => {
  const selected = normalizeSelectedIds(input.selectedIds);
  const directTarget = normalizeDirectTarget(input.directTarget);

  if (directTarget) {
    return resolveDirectTarget({
      token: input.token,
      inventoryId: input.inventoryId,
      directTarget,
    });
  }

  let ids =
    selected.length > 0 ? selected : await fetchBaseProductIds(input.token, input.inventoryId);

  if (selected.length === 0 && typeof input.limit === 'number' && input.limit > 0) {
    ids = ids.slice(0, input.limit);
  }

  if (!shouldFilterToUniqueOnly(input) || ids.length === 0) {
    return { ids, resolutionError: null };
  }

  const productRepository = await getProductRepository();
  const existingProducts = await productRepository.getProducts({ page: 1, pageSize: 10_000 });
  const existingBaseIds = new Set(
    existingProducts
      .map((product: ProductWithImages) => product.baseProductId?.trim())
      .filter((value: string | undefined): value is string => Boolean(value))
  );

  return {
    ids: ids.filter((id: string) => !existingBaseIds.has(id)),
    resolutionError: null,
  };
};
