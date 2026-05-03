import type { QueryClient } from '@tanstack/react-query';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

export type EditableCellField = 'price' | 'stock';

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

function isProductListItemsCacheValue(
  cacheValue: ProductListCacheValue
): cacheValue is { items: ProductWithImages[] } {
  return (
    cacheValue !== null &&
    cacheValue !== undefined &&
    typeof cacheValue === 'object' &&
    !Array.isArray(cacheValue) &&
    'items' in cacheValue &&
    Array.isArray(cacheValue.items)
  );
}

function patchProductListCacheValue(
  cacheValue: ProductListCacheValue,
  productId: string,
  field: EditableCellField,
  value: number
): ProductListCacheValue {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
  }
  if (isProductListItemsCacheValue(cacheValue)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    };
  }
  return cacheValue;
}

export function resolveEditValue(value: number | null): string {
  return value !== null ? String(value) : '';
}

export function resolveEditableCellDisplayValue(
  value: number | null,
  field: EditableCellField
): string | number {
  if (value === null) return '-';
  if (field === 'price') return value.toFixed(2);
  return value;
}

export function getEditableCellFieldLabel(field: EditableCellField): string {
  return field.charAt(0).toUpperCase() + field.slice(1);
}

export function isInvalidEditableCellValue(
  numValue: number,
  field: EditableCellField
): boolean {
  if (Number.isNaN(numValue)) return true;
  if (numValue < 0) return true;
  return field === 'stock' && !Number.isInteger(numValue);
}

export function updateEditableCellCache(
  queryClient: QueryClient,
  productId: string,
  field: EditableCellField,
  numValue: number
): void {
  queryClient.setQueriesData({ queryKey: QUERY_KEYS.products.lists() }, (old: ProductListCacheValue) =>
    patchProductListCacheValue(old, productId, field, numValue)
  );
  queryClient.setQueryData(QUERY_KEYS.products.detail(productId), (old: ProductWithImages | undefined) =>
    old !== undefined ? { ...old, [field]: numValue } : old
  );
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(productId), (old: ProductWithImages | undefined) =>
    old !== undefined ? { ...old, [field]: numValue } : old
  );
}
