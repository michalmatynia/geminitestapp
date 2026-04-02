'use client';

import React from 'react';

import type { ProductWithImages } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

type ListProductModalViewContextValue = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  hasPresetSelection: boolean;
  autoSubmitOnOpen: boolean;
};

const ListProductModalViewContext = React.createContext<ListProductModalViewContextValue | null>(
  null
);

type ListProductModalViewProviderProps = {
  value: ListProductModalViewContextValue;
  children: React.ReactNode;
};

export function ListProductModalViewProvider({
  value,
  children,
}: ListProductModalViewProviderProps): React.JSX.Element {
  return (
    <ListProductModalViewContext.Provider value={value}>
      {children}
    </ListProductModalViewContext.Provider>
  );
}

export function useListProductModalViewContext(): ListProductModalViewContextValue {
  const context = React.useContext(ListProductModalViewContext);
  if (!context) {
    throw internalError(
      'useListProductModalViewContext must be used within ListProductModalViewProvider'
    );
  }
  return context;
}
