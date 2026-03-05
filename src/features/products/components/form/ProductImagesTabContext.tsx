'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { ProductImageManagerController } from '@/features/products/components/ProductImageManager';
import type { ImageFileSelection } from '@/shared/contracts/files';
import { internalError } from '@/shared/errors/app-error';

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

type ProductImagesTabActionKey = 'onShowFileManager' | 'onSelectFiles';

export type ProductImagesTabStateContextValue = Omit<
  ProductImagesTabContextValue,
  ProductImagesTabActionKey
>;
export type ProductImagesTabActionsContextValue = Pick<
  ProductImagesTabContextValue,
  ProductImagesTabActionKey
>;

const ProductImagesTabStateContext = createContext<ProductImagesTabStateContextValue | null>(null);
const ProductImagesTabActionsContext = createContext<ProductImagesTabActionsContextValue | null>(
  null
);

type ProductImagesTabProviderProps = {
  value: ProductImagesTabContextValue;
  children: React.ReactNode;
};

export function ProductImagesTabProvider({
  value,
  children,
}: ProductImagesTabProviderProps): React.JSX.Element {
  const {
    showFileManager,
    imageManagerController,
    inlineFileManager,
    sectionTitle,
    sectionDescription,
    chooseButtonLabel,
    chooseButtonAriaLabel,
    onShowFileManager,
    onSelectFiles,
  } = value;

  const stateValue = useMemo<ProductImagesTabStateContextValue>(
    () => ({
      showFileManager,
      imageManagerController,
      inlineFileManager,
      sectionTitle,
      sectionDescription,
      chooseButtonLabel,
      chooseButtonAriaLabel,
    }),
    [
      showFileManager,
      imageManagerController,
      inlineFileManager,
      sectionTitle,
      sectionDescription,
      chooseButtonLabel,
      chooseButtonAriaLabel,
    ]
  );

  const actionsValue = useMemo<ProductImagesTabActionsContextValue>(
    () => ({
      onShowFileManager,
      onSelectFiles,
    }),
    [onShowFileManager, onSelectFiles]
  );

  return (
    <ProductImagesTabActionsContext.Provider value={actionsValue}>
      <ProductImagesTabStateContext.Provider value={stateValue}>
        {children}
      </ProductImagesTabStateContext.Provider>
    </ProductImagesTabActionsContext.Provider>
  );
}

export function useOptionalProductImagesTabStateContext(): ProductImagesTabStateContextValue | null {
  return useContext(ProductImagesTabStateContext);
}

export function useProductImagesTabStateContext(): ProductImagesTabStateContextValue {
  const context = useContext(ProductImagesTabStateContext);
  if (!context) {
    throw internalError(
      'useProductImagesTabStateContext must be used within ProductImagesTabProvider'
    );
  }
  return context;
}

export function useOptionalProductImagesTabActionsContext():
  | ProductImagesTabActionsContextValue
  | null {
  return useContext(ProductImagesTabActionsContext);
}

export function useProductImagesTabActionsContext(): ProductImagesTabActionsContextValue {
  const context = useContext(ProductImagesTabActionsContext);
  if (!context) {
    throw internalError(
      'useProductImagesTabActionsContext must be used within ProductImagesTabProvider'
    );
  }
  return context;
}
