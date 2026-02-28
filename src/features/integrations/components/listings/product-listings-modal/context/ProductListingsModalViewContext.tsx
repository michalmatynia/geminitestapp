'use client';

import React from 'react';

import type { ProductWithImagesDto as ProductWithImages } from '@/shared/contracts/products';

type ProductListingsModalViewContextValue = {
  product: ProductWithImages;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
  onListingsUpdated?: (() => void) | undefined;
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
    throw new Error(
      'useProductListingsModalViewContext must be used within ProductListingsModalViewProvider'
    );
  }
  return context;
}
