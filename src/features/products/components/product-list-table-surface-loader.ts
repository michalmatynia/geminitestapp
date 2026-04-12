import type { ComponentType } from 'react';

export function loadProductListTableSurface(): Promise<ComponentType> {
  // Keep the lazy import uncached at module scope so Fast Refresh always sees
  // the current table surface/context wiring instead of a stale component
  // closure from a previous dev bundle.
  return import('@/features/products/components/ProductListTableSurface').then(
    (mod: typeof import('@/features/products/components/ProductListTableSurface')) =>
      mod.ProductListTableSurface
  );
}
