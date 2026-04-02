'use client';

import React from 'react';

import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

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

const ProductListingsModalViewContext =
  React.createContext<ProductListingsModalViewContextValue | null>(null);

type ProductListingsModalViewProviderProps = {
  value: ProductListingsModalViewContextValue;
  children: React.ReactNode;
};

export function ProductListingsModalViewProvider({
  value,
  children,
}: ProductListingsModalViewProviderProps): React.JSX.Element {
  return (
    <ProductListingsModalViewContext.Provider value={value}>
      {children}
    </ProductListingsModalViewContext.Provider>
  );
}

export function useProductListingsModalViewContext(): ProductListingsModalViewContextValue {
  const context = React.useContext(ProductListingsModalViewContext);
  if (!context) {
    throw internalError(
      'useProductListingsModalViewContext must be used within ProductListingsModalViewProvider'
    );
  }
  return context;
}
