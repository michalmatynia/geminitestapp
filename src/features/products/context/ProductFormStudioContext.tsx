'use client';

import { createContext, useContext, useMemo } from 'react';

import { type ProductWithImages } from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';

import { useProductFormStudioController } from './ProductFormStudioContext.controller';

export interface ProductFormStudioStateContextType {
  studioProjectId: string | null;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
}

export interface ProductFormStudioActionsContextType {
  setStudioProjectId: (projectId: string | null) => void;
}

export type ProductFormStudioContextType = ProductFormStudioStateContextType &
  ProductFormStudioActionsContextType;

export const ProductFormStudioStateContext = createContext<ProductFormStudioStateContextType | null>(
  null
);
export const ProductFormStudioActionsContext =
  createContext<ProductFormStudioActionsContextType | null>(null);

export function ProductFormStudioProvider({
  children,
  product,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
}): React.JSX.Element {
  const { actionsValue, stateValue } = useProductFormStudioController(product);

  return (
    <ProductFormStudioActionsContext.Provider value={actionsValue}>
      <ProductFormStudioStateContext.Provider value={stateValue}>
        {children}
      </ProductFormStudioStateContext.Provider>
    </ProductFormStudioActionsContext.Provider>
  );
}

export const useProductFormStudioState = (): ProductFormStudioStateContextType => {
  const context = useContext(ProductFormStudioStateContext);
  if (!context) {
    throw internalError(
      'useProductFormStudioState must be used within a ProductFormStudioProvider'
    );
  }
  return context;
};

export const useProductFormStudioActions = (): ProductFormStudioActionsContextType => {
  const context = useContext(ProductFormStudioActionsContext);
  if (!context) {
    throw internalError(
      'useProductFormStudioActions must be used within a ProductFormStudioProvider'
    );
  }
  return context;
};

export const useProductFormStudio = (): ProductFormStudioContextType => {
  const state = useProductFormStudioState();
  const actions = useProductFormStudioActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
