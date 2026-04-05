'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type ProductListingJobsPanelViewContextValue = {
  showBackToProducts: boolean;
};

export const {
  Context: ProductListingJobsPanelViewContextInternal,
  useStrictContext: useProductListingJobsPanelView,
} = createStrictContext<ProductListingJobsPanelViewContextValue>({
  hookName: 'useProductListingJobsPanelView',
  providerName: 'ProductListingJobsPanelViewProvider',
  displayName: 'ProductListingJobsPanelViewContext',
  errorFactory: internalError,
});

export const ProductListingJobsPanelViewContext =
  ProductListingJobsPanelViewContextInternal as React.Context<
    ProductListingJobsPanelViewContextValue | null
  >;

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
