'use client';

import { useContext } from 'react';
import { useProductFormCustomFields, type ProductFormCustomFieldContextType } from '@/features/products/context/ProductFormCustomFieldContext';
import { useProductFormCore, type ProductFormCoreContextType, type ProductFormCoreActionsContextType } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext, type ProductFormImageContextType } from '@/features/products/context/ProductFormImageContext';
import { useProductFormParameters, type ProductFormParameterContextType } from '@/features/products/context/ProductFormParameterContext';

export type ProductFormScansContextResult = ProductFormCoreContextType & 
  ProductFormCoreActionsContextType & 
  ProductFormParameterContextType & 
  ProductFormCustomFieldContextType & {
    productFormImages: ProductFormImageContextType | null;
  };

export function useProductFormScansContext(): ProductFormScansContextResult {
  const core = useProductFormCore();
  const params = useProductFormParameters();
  const custom = useProductFormCustomFields();
  const images = useContext(ProductFormImageContext);
  
  return { ...core, ...params, ...custom, productFormImages: images };
}
