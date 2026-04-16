'use client';

import { useMemo } from 'react';
import type { ProductWithImages } from '@/shared/contracts/products/product';

function resolveProductName(product: ProductWithImages): string {
  const fields = [product.name_en, product.name_pl, product.name_de, product.sku, product.id];
  const matched = fields.find((f) => typeof f === 'string' && f !== '');
  return matched ?? 'Product';
}

export function useProductFormScanProductName(product: ProductWithImages | undefined): string {
  return useMemo((): string => {
    if (product === undefined) return 'Product';
    return resolveProductName(product);
  }, [product]);
}
