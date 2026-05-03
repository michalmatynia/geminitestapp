'use client';

import { useProductFormConnectionNames } from './useProductFormConnectionNames';
import { useProductFormScanProductName } from './useProductFormScanProductName';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type ProductFormScansIntegrationsResult = {
  connectionNamesById: Map<string, string>;
  productName: string;
};

export function useProductFormScansIntegrations(product: ProductWithImages | undefined): ProductFormScansIntegrationsResult {
  const connectionNamesById = useProductFormConnectionNames();
  const productName = useProductFormScanProductName(product);
  
  return { connectionNamesById, productName };
}
