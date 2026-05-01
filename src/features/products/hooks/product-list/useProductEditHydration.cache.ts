import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import {
  hasIncomingProductDetailGeneratedTextChanges,
  isIncomingProductDetailNewer,
  isIncomingProductDetailSameRevision,
} from '@/features/products/hooks/product-list-state-utils';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import type { ProductListCacheEntry } from './useProductEditHydration.types';

const normalizeSku = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';

const resolveProductListCacheCandidates = (
  entry: ProductListCacheEntry
): ProductWithImages[] => {
  if (Array.isArray(entry)) return entry;
  if (Array.isArray(entry?.items)) return entry.items;
  if (Array.isArray(entry?.products)) return entry.products;
  return [];
};

export const resolveExactProductIdBySku = (
  products: ProductWithImages[],
  sku: string | null | undefined
): string | null => {
  const normalizedSku = normalizeSku(sku);
  if (normalizedSku === '') return null;

  const matches = products.filter(
    (product: ProductWithImages): boolean => normalizeSku(product.sku) === normalizedSku
  );

  return matches.length === 1 ? matches[0]?.id ?? null : null;
};

export const findCachedProductSnapshotById = (
  cacheEntries: ProductListCacheEntry[],
  productId: string | null | undefined
): ProductWithImages | null => {
  const normalizedProductId = typeof productId === 'string' ? productId.trim() : '';
  if (normalizedProductId === '') return null;

  for (const entry of cacheEntries) {
    const candidates = resolveProductListCacheCandidates(entry);
    const match =
      candidates.find((product: ProductWithImages) => product.id === normalizedProductId) ?? null;
    if (match !== null) return match;
  }

  return null;
};

export const shouldEnableLiveEditProductDetailQuery = ({
  editingProduct,
  isEditHydrating,
}: {
  editingProduct: ProductWithImages | null;
  isEditHydrating: boolean;
}): boolean => {
  if (editingProduct === null || editingProduct.id === '') return false;
  if (isEditHydrating) return false;
  return isEditingProductHydrated(editingProduct);
};

export const shouldAdoptIncomingEditProductDetail = (input: {
  currentProduct: ProductWithImages;
  incomingProduct: ProductWithImages;
  isEditHydrating: boolean;
}): boolean => {
  const { currentProduct, incomingProduct, isEditHydrating } = input;
  if (incomingProduct.id !== currentProduct.id) return false;
  const hydrated = isEditingProductHydrated(currentProduct);
  if (!hydrated) return isEditHydrating;
  if (isIncomingProductDetailNewer(incomingProduct, currentProduct)) return true;
  return (
    isIncomingProductDetailSameRevision(incomingProduct, currentProduct) &&
    hasIncomingProductDetailGeneratedTextChanges(incomingProduct, currentProduct)
  );
};
