'use client';

import { createContext, useContext } from 'react';
import type { ProductParameter, ProductParameterValue } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

export interface ProductFormParameterContextType {
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  updateParameterValueByLanguage: (
    index: number,
    languageCode: string,
    value: string
  ) => void;
  removeParameterValue: (index: number) => void;
}

export const ProductFormParameterContext = createContext<ProductFormParameterContextType | null>(null);

export const useProductFormParameters = (): ProductFormParameterContextType => {
  const context = useContext(ProductFormParameterContext);
  if (!context) {
    throw internalError('useProductFormParameters must be used within a ProductFormParameterProvider');
  }
  return context;
};
