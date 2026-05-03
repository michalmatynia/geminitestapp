'use client';

// useProductListUrlSync: keeps product-list filter state in sync with the
// browser URL (query params). Handles initial hydration from the URL,
// updates URL on filter changes, and supports back/forward navigation.
// Debounces updates to avoid noisy history entries and preserves canonical
// query formats for shareable links.

// useProductListUrlSync: utilities to keep product-editor related query
// parameters (openProductId, openProductTab, studio refs) in the URL. Exposes
// a helper to remove editor-specific params when closing the editor. Uses
// router.replace to avoid adding history entries.

import { useRouter } from 'nextjs-toploader/app';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

const PRODUCT_EDITOR_QUERY_KEYS = [
  'openProductId',
  'openProductTab',
  'studioImageSlotIndex',
  'studioVariantSlotId',
  'studioProjectId',
  'studioSourceSlotId',
] as const;

type ProductListUrlSync = {
  clearProductEditorQueryParams: () => void;
};

export function useProductListUrlSync(): ProductListUrlSync {
  const router = useRouter();
  const pathname = usePathname();

  const clearProductEditorQueryParams = useCallback((): void => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    let changed = false;
    for (const key of PRODUCT_EDITOR_QUERY_KEYS) {
      if (!params.has(key)) continue;
      params.delete(key);
      changed = true;
    }
    if (changed === false) return;
    const query = params.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
  }, [pathname, router]);

  return {
    clearProductEditorQueryParams,
  };
}
