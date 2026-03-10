'use client';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type ProductListingItemRuntimeValue = {
  listing: ProductListingWithDetails;
};

const {
  Context: ProductListingItemRuntimeContext,
  useStrictContext: useProductListingItemRuntime,
} = createStrictContext<ProductListingItemRuntimeValue>({
  hookName: 'useProductListingItemRuntime',
  providerName: 'ProductListingItemRuntimeProvider',
  displayName: 'ProductListingItemRuntimeContext',
});

export { ProductListingItemRuntimeContext, useProductListingItemRuntime };
