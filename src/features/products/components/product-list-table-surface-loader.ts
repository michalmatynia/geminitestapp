'use client';

import type { ComponentType } from 'react';

let productListTableSurfacePromise: Promise<ComponentType> | null = null;

export function loadProductListTableSurface(): Promise<ComponentType> {
  if (!productListTableSurfacePromise) {
    productListTableSurfacePromise = import(
      '@/features/products/components/ProductListTableSurface'
    ).then(
      (mod: typeof import('@/features/products/components/ProductListTableSurface')) =>
        mod.ProductListTableSurface
    );
  }

  return productListTableSurfacePromise;
}
