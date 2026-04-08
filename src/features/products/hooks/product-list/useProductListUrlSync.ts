'use client';

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

export function useProductListUrlSync() {
  const router = useRouter();
  const pathname = usePathname();

  const clearProductEditorQueryParams = useCallback((): void => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    let changed = false;
    PRODUCT_EDITOR_QUERY_KEYS.forEach((key) => {
      if (!params.has(key)) return;
      params.delete(key);
      changed = true;
    });
    if (!changed) return;
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router]);

  return {
    clearProductEditorQueryParams,
  };
}
