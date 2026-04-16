'use client';

import { useMemo } from 'react';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export function useProductFormScanProductName(product: ProductWithImages | undefined): string {
  return useMemo((): string => {
    if (product === undefined) return 'Product';
    
    if (typeof product.name_en === 'string' && product.name_en !== '') return product.name_en;
    if (typeof product.name_pl === 'string' && product.name_pl !== '') return product.name_pl;
    if (typeof product.name_de === 'string' && product.name_de !== '') return product.name_de;
    if (typeof product.sku === 'string' && product.sku !== '') return product.sku;
    if (typeof product.id === 'string' && product.id !== '') return product.id;
    
    return 'Product';
  }, [product]);
}
