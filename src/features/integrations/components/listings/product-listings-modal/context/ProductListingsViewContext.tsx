'use client';

import React from 'react';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations';

export type ProductListingsViewContextValue = {
  filteredListings: ProductListingWithDetails[];
  statusTargetLabel: string;
  filterIntegrationSlug: string | null | undefined;
  isBaseFilter: boolean;
  showSync: boolean;
};

const ProductListingsViewContext = React.createContext<ProductListingsViewContextValue | null>(
  null
);

type ProductListingsViewProviderProps = {
  value: ProductListingsViewContextValue;
  children: React.ReactNode;
};

export function ProductListingsViewProvider({
  value,
  children,
}: ProductListingsViewProviderProps): React.JSX.Element {
  return (
    <ProductListingsViewContext.Provider value={value}>
      {children}
    </ProductListingsViewContext.Provider>
  );
}

export function useProductListingsViewContext(): ProductListingsViewContextValue {
  const context = React.useContext(ProductListingsViewContext);
  if (!context) {
    throw new Error(
      'useProductListingsViewContext must be used within ProductListingsViewProvider'
    );
  }
  return context;
}
