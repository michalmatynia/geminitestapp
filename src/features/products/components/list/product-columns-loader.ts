import type { ProductWithImages } from '@/shared/contracts/products/product';

import type { ColumnDef } from '@tanstack/react-table';

export function loadProductColumns(): Promise<ColumnDef<ProductWithImages>[]> {
  // Avoid caching the module promise here. Turbopack fast-refresh can otherwise
  // keep stale column/cell closures alive across edits, which leaves row cells
  // bound to an older ProductList context tree.
  return import('./ProductColumns').then((mod) => mod.getProductColumns());
}
