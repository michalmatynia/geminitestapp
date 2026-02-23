'use client';

import { createContext, useContext, BaseSyntheticEvent } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormGetValues, FieldErrors } from 'react-hook-form';
import { ProductFormData, ProductWithImages, ProductDraft } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

export interface ProductFormCoreContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  hasUnsavedChanges: boolean;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  ConfirmationModal: React.ComponentType;
}

export const ProductFormCoreContext = createContext<ProductFormCoreContextType | null>(null);

export const useProductFormCore = (): ProductFormCoreContextType => {
  const context = useContext(ProductFormCoreContext);
  if (!context) {
    throw internalError('useProductFormCore must be used within a ProductFormCoreProvider');
  }
  return context;
};
