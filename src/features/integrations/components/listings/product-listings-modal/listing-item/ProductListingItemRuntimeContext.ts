'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations';

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
