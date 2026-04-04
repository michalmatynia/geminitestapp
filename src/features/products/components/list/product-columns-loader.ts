'use client';

import type { ProductWithImages } from '@/shared/contracts/products';

import type { ColumnDef } from '@tanstack/react-table';

let productColumnsPromise: Promise<ColumnDef<ProductWithImages>[]> | null = null;

export function loadProductColumns(): Promise<ColumnDef<ProductWithImages>[]> {
  if (!productColumnsPromise) {
    productColumnsPromise = import('./ProductColumns').then((mod) => mod.getProductColumns());
  }

  return productColumnsPromise;
}
