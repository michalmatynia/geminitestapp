'use client';

import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { createStrictViewContext } from '../../createStrictViewContext';

type ProductListingsModalViewContextValue = {
  product: ProductWithImages;
  onClose: () => void;
  onStartListing?:
    | ((
        integrationId: string,
        connectionId: string,
        options?: { autoSubmit?: boolean }
      ) => void)
    | undefined;
  filterIntegrationSlug?: string | null | undefined;
  onListingsUpdated?: (() => void) | undefined;
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
};

export const {
  Provider: ProductListingsModalViewProvider,
  useValue: useProductListingsModalViewContext,
} = createStrictViewContext<ProductListingsModalViewContextValue>({
  providerName: 'ProductListingsModalViewProvider',
  errorMessage:
    'useProductListingsModalViewContext must be used within ProductListingsModalViewProvider',
});
