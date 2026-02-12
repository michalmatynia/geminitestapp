'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { ProductImageManagerController } from './ProductImageManager';

type ProductImageManagerControllerProviderProps = {
  value: ProductImageManagerController;
  children: React.ReactNode;
};

const ProductImageManagerControllerContext = createContext<ProductImageManagerController | null>(null);

export function ProductImageManagerControllerProvider({
  value,
  children,
}: ProductImageManagerControllerProviderProps): React.JSX.Element {
  return (
    <ProductImageManagerControllerContext.Provider value={value}>
      {children}
    </ProductImageManagerControllerContext.Provider>
  );
}

export function useOptionalProductImageManagerController(): ProductImageManagerController | null {
  return useContext(ProductImageManagerControllerContext);
}

export function useProductImageManagerController(): ProductImageManagerController {
  const context = useContext(ProductImageManagerControllerContext);
  if (!context) {
    throw internalError(
      'useProductImageManagerController must be used within ProductImageManagerControllerProvider'
    );
  }
  return context;
}
