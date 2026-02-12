'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { ImageFileSelection } from '@/shared/types/domain/files';

import type { ProductImageManagerController } from '@/features/products/components/ProductImageManager';

export type ProductImagesTabContextValue = {
  showFileManager?: boolean;
  onShowFileManager?: (show: boolean) => void;
  onSelectFiles?: (files: ImageFileSelection[]) => void;
  imageManagerController?: ProductImageManagerController;
  inlineFileManager?: boolean;
  sectionTitle?: string;
  sectionDescription?: string;
  chooseButtonLabel?: string;
  chooseButtonAriaLabel?: string;
};

const ProductImagesTabContext = createContext<ProductImagesTabContextValue | null>(null);

export type ProductImagesTabProviderProps = {
  value: ProductImagesTabContextValue;
  children: React.ReactNode;
};

export function ProductImagesTabProvider({
  value,
  children,
}: ProductImagesTabProviderProps): React.JSX.Element {
  return (
    <ProductImagesTabContext.Provider value={value}>
      {children}
    </ProductImagesTabContext.Provider>
  );
}

export function useOptionalProductImagesTabContext(): ProductImagesTabContextValue | null {
  return useContext(ProductImagesTabContext);
}

export function useProductImagesTabContext(): ProductImagesTabContextValue {
  const context = useContext(ProductImagesTabContext);
  if (!context) {
    throw internalError('useProductImagesTabContext must be used within ProductImagesTabProvider');
  }
  return context;
}
