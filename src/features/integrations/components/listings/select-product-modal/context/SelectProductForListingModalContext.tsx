'use client';

import React, { createContext, useContext } from 'react';

import type { ProductWithImages } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

type SelectProductForListingModalContextValue = {
  isLoadingProducts: boolean;
  products: ProductWithImages[] | null | undefined;
  selectedProductId: string | null;
  setSelectedProductId: (productId: string | null) => void;
  productSearch: string;
  setProductSearch: (value: string) => void;
  error: string | null;
};

const SelectProductForListingModalContext =
  createContext<SelectProductForListingModalContextValue | null>(null);

export function useSelectProductForListingModalContext(): SelectProductForListingModalContextValue {
  const context = useContext(SelectProductForListingModalContext);
  if (!context) {
    throw internalError(
      'useSelectProductForListingModalContext must be used within SelectProductForListingModalProvider'
    );
  }
  return context;
}

type SelectProductForListingModalProviderProps = SelectProductForListingModalContextValue & {
  children: React.ReactNode;
};

export function SelectProductForListingModalProvider({
  children,
  ...value
}: SelectProductForListingModalProviderProps): React.JSX.Element {
  return (
    <SelectProductForListingModalContext.Provider value={value}>
      {children}
    </SelectProductForListingModalContext.Provider>
  );
}
