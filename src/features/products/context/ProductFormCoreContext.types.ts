/**
 * Product Form Core Context Types
 * 
 * Type definitions for product form state management and validation.
 * Provides:
 * - Form registration and validation interfaces
 * - Product draft and image management types
 * - Form state tracking (unsaved changes, errors)
 * - Note selection and generation error handling
 * - React Hook Form integration types
 */

import type { BaseSyntheticEvent, ComponentType, ReactNode } from 'react';
import type {
  FieldErrors,
  UseFormGetValues,
  UseFormRegister,
  UseFormReturn,
  UseFormSetValue,
} from 'react-hook-form';

import type { ProductFormData, ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export interface ProductFormCoreContextType {
  register: UseFormRegister<ProductFormData>;
  hasUnsavedChanges: boolean;
  errors: FieldErrors<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  selectedNoteIds: string[];
  generationError: string | null;
  normalizeNameError: string | null;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  ConfirmationModal: ComponentType;
  methods: UseFormReturn<ProductFormData>;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  validatorSessionKey?: string;
}

export interface ProductFormCoreActionsContextType {
  handleSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
  setValue: UseFormSetValue<ProductFormData>;
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  setGenerationError: (error: string | null) => void;
  setNormalizeNameError: (error: string | null) => void;
  setHandleSubmit: (fn: (event?: BaseSyntheticEvent) => Promise<void>) => void;
  setConfirmationModal: (component: ComponentType) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setUploading: (value: boolean) => void;
  setUploadError: (value: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
}

export type ProductFormCoreContextValue = ProductFormCoreContextType &
  ProductFormCoreActionsContextType;

export type ProductFormCoreProviderProps = {
  children: ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  requireSku?: boolean;
  initialSku?: string;
  validatorSessionKey?: string;
};
