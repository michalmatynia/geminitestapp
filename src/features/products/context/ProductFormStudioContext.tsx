'use client';

import { createContext, useContext } from 'react';
import { internalError } from '@/shared/errors/app-error';

export interface ProductFormStudioContextType {
  studioProjectId: string | null;
  setStudioProjectId: (projectId: string | null) => void;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
}

export const ProductFormStudioContext = createContext<ProductFormStudioContextType | null>(null);

export const useProductFormStudio = (): ProductFormStudioContextType => {
  const context = useContext(ProductFormStudioContext);
  if (!context) {
    throw internalError('useProductFormStudio must be used within a ProductFormStudioProvider');
  }
  return context;
};
