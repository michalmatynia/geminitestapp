'use client';
// useProductImages: manages local image-slot state, object URL lifecycle,
// temporary uploads and deletion. Keeps product image previews responsive and
// invalidates product caches on server-side changes.
'use no memo';

import { useState } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import { useProductImageActions } from './useProductImages.actions';
import { useDisconnectProductImage } from './useProductImages.disconnect';
import {
  buildImageSlotsFromProduct,
  normalizeImageBase64s,
  normalizeImageLinks,
} from './useProductImages.helpers';
import { useProductImageObjectUrls } from './useProductImages.object-urls';
import { useProductImageRefresh } from './useProductImages.refresh';

export interface ProductImagesHookResult {
  imageSlots: ProductImageSlot[];
  imageLinks: string[];
  imageBase64s: string[];
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
  refreshFromProduct: (savedProduct: ProductWithImages) => void;
  setImagesReordering: (value: boolean) => void;
}

export function useProductImages(
  product?: ProductWithImages,
  initialImageLinks?: string[] | null
): ProductImagesHookResult {
  const [imageSlots, setImageSlots] = useState<ProductImageSlot[]>(() =>
    buildImageSlotsFromProduct(product)
  );
  const [imageLinks, setImageLinks] = useState<string[]>(() =>
    normalizeImageLinks(product?.imageLinks ?? initialImageLinks)
  );
  const [imageBase64s, setImageBase64s] = useState<string[]>(() =>
    normalizeImageBase64s(product?.imageBase64s, product?.imageLinks ?? initialImageLinks)
  );
  const [showFileManager, setShowFileManager] = useState(false);
  const disconnectProductImage = useDisconnectProductImage();

  useProductImageObjectUrls(imageSlots);
  const actions = useProductImageActions({
    imageSlots,
    product,
    disconnectProductImage,
    setImageSlots,
    setImageLinks,
    setImageBase64s,
    setShowFileManager,
  });
  const refreshActions = useProductImageRefresh({
    setImageSlots,
    setImageLinks,
    setImageBase64s,
  });

  return {
    imageSlots,
    imageLinks,
    imageBase64s,
    showFileManager,
    setShowFileManager,
    ...actions,
    ...refreshActions,
  };
}
