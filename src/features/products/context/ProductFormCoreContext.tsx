'use client';

// ProductFormCoreContext: provides the core react-hook-form context and
// helpers for product create/edit flows. Keep this module client-only since it
// integrates with browser APIs and form lifecycle hooks.

import { createContext, useContext, useMemo } from 'react';
import { FormProvider } from 'react-hook-form';

import { internalError } from '@/shared/errors/app-error';

import {
  resolveProductFormDefaultSku,
  resolveProductFormDefaultValues,
} from './ProductFormCoreContext.defaults';
import { useProductFormCoreProviderValue } from './ProductFormCoreContext.provider';
import type {
  ProductFormCoreActionsContextType,
  ProductFormCoreContextType,
  ProductFormCoreContextValue,
  ProductFormCoreProviderProps,
} from './ProductFormCoreContext.types';

export type {
  ProductFormCoreActionsContextType,
  ProductFormCoreContextType,
  ProductFormCoreContextValue,
  ProductFormCoreProviderProps,
} from './ProductFormCoreContext.types';

export { resolveProductFormDefaultSku, resolveProductFormDefaultValues };

export const ProductFormCoreStateContext = createContext<ProductFormCoreContextType | null>(null);
export const ProductFormCoreActionsContext = createContext<ProductFormCoreActionsContextType | null>(
  null
);

export function ProductFormCoreProvider(
  props: ProductFormCoreProviderProps
): React.JSX.Element {
  const { actionsValue, methods, stateValue } = useProductFormCoreProviderValue(props);
  return (
    <ProductFormCoreActionsContext.Provider value={actionsValue}>
      <ProductFormCoreStateContext.Provider value={stateValue}>
        <FormProvider {...methods}>{props.children}</FormProvider>
      </ProductFormCoreStateContext.Provider>
    </ProductFormCoreActionsContext.Provider>
  );
}

export const useProductFormCoreState = (): ProductFormCoreContextType => {
  const context = useContext(ProductFormCoreStateContext);
  if (context === null) {
    throw internalError('useProductFormCoreState must be used within a ProductFormCoreProvider');
  }
  return context;
};

export const useProductFormCoreActions = (): ProductFormCoreActionsContextType => {
  const context = useContext(ProductFormCoreActionsContext);
  if (context === null) {
    throw internalError(
      'useProductFormCoreActions must be used within a ProductFormCoreProvider'
    );
  }
  return context;
};

export const useProductFormCore = (): ProductFormCoreContextValue => {
  const state = useProductFormCoreState();
  const actions = useProductFormCoreActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
