'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

type ProductListingJobsPanelViewContextValue = {
  showBackToProducts: boolean;
};

const ProductListingJobsPanelViewContext =
  React.createContext<ProductListingJobsPanelViewContextValue | null>(null);

type ProductListingJobsPanelViewProviderProps = {
  value: ProductListingJobsPanelViewContextValue;
  children: React.ReactNode;
};

export function ProductListingJobsPanelViewProvider({
  value,
  children,
}: ProductListingJobsPanelViewProviderProps): React.JSX.Element {
  return (
    <ProductListingJobsPanelViewContext.Provider value={value}>
      {children}
    </ProductListingJobsPanelViewContext.Provider>
  );
}

export function useProductListingJobsPanelView(): ProductListingJobsPanelViewContextValue {
  const context = React.useContext(ProductListingJobsPanelViewContext);
  if (!context) {
    throw internalError(
      'useProductListingJobsPanelView must be used within ProductListingJobsPanelViewProvider'
    );
  }
  return context;
}
