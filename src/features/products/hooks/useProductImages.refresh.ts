import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react';

import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductImageRecord, ProductWithImages } from '@/shared/contracts/products/product';
import { createExistingImageSlot } from '@/shared/lib/image-slots';
import { logger } from '@/shared/utils/logger';

import {
  normalizeImageBase64s,
  normalizeImageLinks,
  TOTAL_IMAGE_SLOTS,
} from './useProductImages.helpers';

type ProductImageRefreshArgs = {
  setImageSlots: Dispatch<SetStateAction<ProductImageSlot[]>>;
  setImageLinks: Dispatch<SetStateAction<string[]>>;
  setImageBase64s: Dispatch<SetStateAction<string[]>>;
};

type ProductImageRefreshActions = {
  refreshFromProduct: (savedProduct: ProductWithImages) => void;
  setImagesReordering: (value: boolean) => void;
};

const resolveRefreshedImageSlots = (
  prevSlots: ProductImageSlot[],
  savedProduct: ProductWithImages
): ProductImageSlot[] => {
  const newSlots: ProductImageSlot[] = [...prevSlots];

  savedProduct.images
    .slice(0, TOTAL_IMAGE_SLOTS)
    .forEach((imageRecord: ProductImageRecord, index: number): void => {
      const existingSlot = newSlots[index];
      if (existingSlot?.type !== 'existing' || existingSlot.slotId !== imageRecord.imageFile.id) {
        newSlots[index] = createExistingImageSlot(imageRecord.imageFile);
      }
    });

  for (let index = savedProduct.images.length; index < TOTAL_IMAGE_SLOTS; index += 1) {
    if (newSlots[index]?.type !== 'file') {
      newSlots[index] = null;
    }
  }

  return newSlots;
};

export const useProductImageRefresh = ({
  setImageSlots,
  setImageLinks,
  setImageBase64s,
}: ProductImageRefreshArgs): ProductImageRefreshActions => {
  const isReorderingRef = useRef(false);
  const pendingRefreshRef = useRef<ProductWithImages | null>(null);

  const applyRefresh = useCallback((savedProduct: ProductWithImages): void => {
    setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] =>
      resolveRefreshedImageSlots(prevSlots, savedProduct)
    );
    setImageLinks(normalizeImageLinks(savedProduct.imageLinks));
    setImageBase64s(normalizeImageBase64s(savedProduct.imageBase64s, savedProduct.imageLinks));
  }, [setImageBase64s, setImageLinks, setImageSlots]);

  const setImagesReordering = useCallback((value: boolean): void => {
    isReorderingRef.current = value;
    if (!value && pendingRefreshRef.current !== null) {
      const pending = pendingRefreshRef.current;
      pendingRefreshRef.current = null;
      applyRefresh(pending);
    }
  }, [applyRefresh]);

  const refreshFromProduct = useCallback((savedProduct: ProductWithImages): void => {
    if (isReorderingRef.current) {
      pendingRefreshRef.current = savedProduct;
      if (process.env['NODE_ENV'] !== 'production') {
        logger.info('[product-images] Refresh deferred during reorder');
      }
      return;
    }
    applyRefresh(savedProduct);
  }, [applyRefresh]);

  return {
    refreshFromProduct,
    setImagesReordering,
  };
};
