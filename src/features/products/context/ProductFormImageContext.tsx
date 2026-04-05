'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductImageSlot, ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';

import { useProductImages } from '../hooks/useProductImages';

export interface ProductFormImageContextType {
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  productId?: string | null;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
  setImageBase64At: (index: number, value: string) => void;
  setImagesReordering: (reordering: boolean) => void;
  refreshImagesFromProduct: (savedProduct: ProductWithImages) => void;
}

export type ProductFormImageStateContextType = Pick<
  ProductFormImageContextType,
  | 'imageSlots'
  | 'imageLinks'
  | 'imageBase64s'
  | 'productId'
  | 'uploading'
  | 'uploadError'
  | 'uploadSuccess'
  | 'showFileManager'
>;

export type ProductFormImageActionsContextType = Pick<
  ProductFormImageContextType,
  | 'setShowFileManager'
  | 'handleSlotImageChange'
  | 'handleSlotFileSelect'
  | 'handleSlotDisconnectImage'
  | 'handleMultiImageChange'
  | 'handleMultiFileSelect'
  | 'swapImageSlots'
  | 'setImageLinkAt'
  | 'setImageBase64At'
  | 'setImagesReordering'
  | 'refreshImagesFromProduct'
>;

export const ProductFormImageContext = createContext<ProductFormImageContextType | null>(null);

export function ProductFormImageProvider({
  children,
  product,
  draft,
  uploading,
  uploadError,
  uploadSuccess,
  onInteraction,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  onInteraction?: () => void;
}) {
  const images = useProductImages(product, draft?.imageLinks);

  const value = useMemo(
    () => ({
      ...images,
      productId: product?.id ?? null,
      uploading,
      uploadError,
      uploadSuccess,
      refreshImagesFromProduct: images.refreshFromProduct,
      handleSlotImageChange: (file: File | null, index: number) => {
        onInteraction?.();
        images.handleSlotImageChange(file, index);
      },
      handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => {
        onInteraction?.();
        images.handleSlotFileSelect(file, index);
      },
      handleSlotDisconnectImage: async (index: number) => {
        onInteraction?.();
        await images.handleSlotDisconnectImage(index);
      },
      handleMultiImageChange: (files: File[]) => {
        onInteraction?.();
        images.handleMultiImageChange(files);
      },
      handleMultiFileSelect: (files: ImageFileSelection[]) => {
        onInteraction?.();
        images.handleMultiFileSelect(files);
      },
      swapImageSlots: (from: number, to: number) => {
        onInteraction?.();
        images.swapImageSlots(from, to);
      },
      setImageLinkAt: (index: number, value: string) => {
        onInteraction?.();
        images.setImageLinkAt(index, value);
      },
      setImageBase64At: (index: number, value: string) => {
        onInteraction?.();
        images.setImageBase64At(index, value);
      },
    }),
    [images, product?.id, uploading, uploadError, uploadSuccess, onInteraction]
  );

  return (
    <ProductFormImageContext.Provider value={value}>{children}</ProductFormImageContext.Provider>
  );
}

const useRequiredProductFormImageContext = (): ProductFormImageContextType => {
  const context = useContext(ProductFormImageContext);
  if (!context) {
    throw internalError('useProductFormImages must be used within a ProductFormImageProvider');
  }
  return context;
};

export const useProductFormImageState = (): ProductFormImageStateContextType => {
  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    productId,
    uploading,
    uploadError,
    uploadSuccess,
    showFileManager,
  } = useRequiredProductFormImageContext();
  return {
    imageSlots,
    imageLinks,
    imageBase64s,
    productId,
    uploading,
    uploadError,
    uploadSuccess,
    showFileManager,
  };
};

export const useProductFormImageActions = (): ProductFormImageActionsContextType => {
  const {
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
    setImageBase64At,
    setImagesReordering,
    refreshImagesFromProduct,
  } = useRequiredProductFormImageContext();
  return {
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
    setImageBase64At,
    setImagesReordering,
    refreshImagesFromProduct,
  };
};

export const useProductFormImages = (): ProductFormImageContextType =>
  useRequiredProductFormImageContext();
