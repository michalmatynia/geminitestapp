'use client';

import { createContext, useContext } from 'react';
import type { ProductImageSlot, ProductWithImages } from '@/shared/contracts/products';
import type { ImageFileSelectionDto as ImageFileSelection } from '@/shared/contracts/files';
import { internalError } from '@/shared/errors/app-error';

export interface ProductFormImageContextType {
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
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

export const ProductFormImageContext = createContext<ProductFormImageContextType | null>(null);

export const useProductFormImages = (): ProductFormImageContextType => {
  const context = useContext(ProductFormImageContext);
  if (!context) {
    throw internalError('useProductFormImages must be used within a ProductFormImageProvider');
  }
  return context;
};
