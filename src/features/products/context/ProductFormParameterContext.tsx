'use client';

// ProductFormParameterContext: manages product parameter (spec/attribute)
// state and helpers. Exposes parameter lists per-catalog and normalization
// utilities used by parameter input components.

import { createContext, useContext } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';

import {
  useMergedProductParameterValues,
  useProductFormParameterProviderData,
} from './ProductFormParameterContext.data';
import { useProductFormParameterContextValue } from './ProductFormParameterContext.value';

export { resolvePrimaryParameterValue } from './ProductFormParameterContext.utils';

export interface ProductFormParameterContextType {
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  applyLocalizedParameterValues: (
    updates: Array<{ parameterId: string; languageCode: string; value: string }>
  ) => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  updateParameterValueByLanguage: (index: number, languageCode: string, value: string) => void;
  updateParameterInferenceSkip: (index: number, skip: boolean) => void;
  removeParameterValue: (index: number) => void;
}

export type ProductFormParameterStateContextType = Pick<
  ProductFormParameterContextType,
  'parameters' | 'parametersLoading' | 'parameterValues'
>;

export type ProductFormParameterActionsContextType = Pick<
  ProductFormParameterContextType,
  | 'addParameterValue'
  | 'applyLocalizedParameterValues'
  | 'updateParameterId'
  | 'updateParameterValue'
  | 'updateParameterValueByLanguage'
  | 'updateParameterInferenceSkip'
  | 'removeParameterValue'
>;

export const ProductFormParameterContext = createContext<ProductFormParameterContextType | null>(
  null
);

export function ProductFormParameterProvider({
  children,
  product,
  draft,
  selectedCatalogIds,
  onInteraction,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  selectedCatalogIds: string[];
  onInteraction?: () => void;
}): React.JSX.Element {
  const data = useProductFormParameterProviderData({ product, draft, selectedCatalogIds });
  const merged = useMergedProductParameterValues(data);

  const value = useProductFormParameterContextValue({
    parameterDefinitions: data.parameterDefinitions,
    parametersLoading: data.parametersLoading,
    parameterValues: merged.parameterValues,
    parameterValueIndexMap: merged.parameterValueIndexMap,
    setBaseParameterValues: data.setBaseParameterValues,
    onInteraction,
  });

  return (
    <ProductFormParameterContext.Provider value={value}>
      {children}
    </ProductFormParameterContext.Provider>
  );
}

const useRequiredProductFormParameterContext = (): ProductFormParameterContextType => {
  const context = useContext(ProductFormParameterContext);
  if (!context) {
    throw internalError(
      'useProductFormParameters must be used within a ProductFormParameterProvider'
    );
  }
  return context;
};

export const useProductFormParameterState = (): ProductFormParameterStateContextType => {
  const { parameters, parametersLoading, parameterValues } = useRequiredProductFormParameterContext();
  return {
    parameters,
    parametersLoading,
    parameterValues,
  };
};

export const useProductFormParameterActions = (): ProductFormParameterActionsContextType => {
  const {
    addParameterValue,
    applyLocalizedParameterValues,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    updateParameterInferenceSkip,
    removeParameterValue,
  } = useRequiredProductFormParameterContext();
  return {
    addParameterValue,
    applyLocalizedParameterValues,
    updateParameterId,
    updateParameterValue,
    updateParameterValueByLanguage,
    updateParameterInferenceSkip,
    removeParameterValue,
  };
};

export const useProductFormParameters = (): ProductFormParameterContextType =>
  useRequiredProductFormParameterContext();
