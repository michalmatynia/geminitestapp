import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';

import type { ProductIdentityResolution } from './useProductDataMutations.types';

export const normalizeIdentityText = (value?: string | null): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveSingleMatch = (matches: ProductWithImages[]): ProductIdentityResolution | null => {
  if (matches.length !== 1) return null;
  const product = matches[0];
  return product !== undefined ? { kind: 'resolved', id: product.id } : null;
};

export const resolveProductIdByIdentity = async ({
  originalNameEn,
  originalSku,
}: {
  originalNameEn?: string | null;
  originalSku?: string | null;
}): Promise<ProductIdentityResolution> => {
  const normalizedSku = normalizeIdentityText(originalSku).toUpperCase();
  if (normalizedSku.length === 0) return { kind: 'missing' };
  const normalizedNameEn = normalizeIdentityText(originalNameEn);
  const products = await api
    .get<ProductWithImages[]>(`/api/v2/products?sku=${encodeURIComponent(normalizedSku)}`, {
      cache: 'no-store',
      logError: false,
    })
    .catch((): null => null);

  if (products === null) return { kind: 'missing' };
  const exactMatches = products.filter(
    (product: ProductWithImages): boolean =>
      typeof product.sku === 'string' && product.sku.trim().toUpperCase() === normalizedSku
  );
  const singleSkuMatch = resolveSingleMatch(exactMatches);
  if (singleSkuMatch !== null) return singleSkuMatch;

  if (exactMatches.length > 1 && normalizedNameEn.length > 0) {
    const exactNameMatches = exactMatches.filter(
      (product: ProductWithImages): boolean =>
        typeof product.name_en === 'string' && product.name_en.trim() === normalizedNameEn
    );
    const singleNameMatch = resolveSingleMatch(exactNameMatches);
    if (singleNameMatch !== null) return singleNameMatch;
  }

  if (exactMatches.length > 1) return { kind: 'ambiguous', matchCount: exactMatches.length };
  return { kind: 'missing' };
};
