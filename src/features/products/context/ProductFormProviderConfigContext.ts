import { createContext, useContext } from 'react';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';

export type ProductFormProviderConfigContextType = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireHydratedEditProduct?: boolean;
  suppressNonHydratedEditWarning?: boolean;
  nonFormDirtyTrackingLockedRef: { current: boolean };
};

export type ProductFormProviderRuntimeValue = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
};

export const ProductFormProviderRuntimeContext =
  createContext<ProductFormProviderRuntimeValue | null>(null);

export const ProductFormProviderConfigContext =
  createContext<ProductFormProviderConfigContextType | null>(null);

export const useProductFormProviderConfigContext = (): ProductFormProviderConfigContextType => {
  const context = useContext(ProductFormProviderConfigContext);
  if (context === null) {
    throw internalError(
      'useProductFormProviderConfigContext must be used within a ProductFormProviderConfigContext provider'
    );
  }
  return context;
};
