import { useState, useCallback, useRef, useEffect } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductWithImages, ProductImageRecord } from '@/shared/contracts/products';
import type { ProductImageSlot } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import {
  DEFAULT_IMAGE_SLOT_COUNT,
  buildEmptySlots,
  createExistingImageSlot,
  createFileImageSlot,
  swapSlots,
} from '@/shared/lib/image-slots';
import { createDeleteMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logger } from '@/shared/utils/logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { invalidateProducts } from './productCache';

const TOTAL_IMAGE_SLOTS = DEFAULT_IMAGE_SLOT_COUNT;

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number) => {
      const value = typeof link === 'string' ? link.trim() : '';
      next[index] = value && !value.startsWith('data:') ? value : '';
    });
  }
  return next;
};

const normalizeImageBase64s = (base64s?: string[] | null, links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(base64s)) {
    base64s.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      next[index] =
        typeof value === 'string' && value.trim().startsWith('data:') ? value.trim() : '';
    });
  }
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed.startsWith('data:') && !next[index]) {
        next[index] = trimmed;
      }
    });
  }
  return next;
};

const buildImageSlotsFromProduct = (product?: ProductWithImages): ProductImageSlot[] => {
  const slots: ProductImageSlot[] = buildEmptySlots(TOTAL_IMAGE_SLOTS);
  if (!product?.images?.length) return slots;
  product.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg: ProductImageRecord, index: number) => {
    if (pImg.imageFile) {
      slots[index] = createExistingImageSlot(pImg.imageFile as ImageFileSelection);
    }
  });
  return slots;
};

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
  const objectUrlsRef = useRef<string[]>([]);
  const isReorderingRef = useRef(false);
  const pendingRefreshRef = useRef<ProductWithImages | null>(null);

  const disconnectImageMutation = createDeleteMutationV2<
    void,
    { productId: string; imageFileId: string }
  >({
    mutationFn: ({ productId, imageFileId }) =>
      api.delete<void>(`/api/v2/products/${productId}/images/${imageFileId}`),
    mutationKey: QUERY_KEYS.products.all,
    meta: {
      source: 'products.hooks.useProductImages.disconnectImage',
      operation: 'delete',
      resource: 'products.images',
      domain: 'products',
      mutationKey: QUERY_KEYS.products.all,
      tags: ['products', 'images', 'disconnect'],
      description: 'Deletes products images.'},
    invalidate: (queryClient) => invalidateProducts(queryClient),
  });

  // Effect to clean up object URLs when imageSlots change
  useEffect(() => {
    const currentObjectUrls = imageSlots
      .map((slot: ProductImageSlot | null): string | null =>
        slot?.type === 'file' ? slot.previewUrl : null
      )
      .filter((url: string | null): url is string => Boolean(url));

    // Revoke old object URLs that are no longer in use
    const oldObjectUrls = objectUrlsRef.current.filter(
      (url: string) => !currentObjectUrls.includes(url)
    );
    oldObjectUrls.forEach((url: string) => URL.revokeObjectURL(url));

    // Update ref with current object URLs
    objectUrlsRef.current = currentObjectUrls;
  }, [imageSlots]);

  // Clean up all object URLs on unmount only
  useEffect(() => {
    return (): void => {
      objectUrlsRef.current.forEach((url: string) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const handleSlotImageChange = useCallback((file: File | null, index: number): void => {
    setImageSlots((prevSlots: ProductImageSlot[]) => {
      const newSlots = [...prevSlots];
      if (file) {
        // Revoke existing object URL if replacing an image
        const existingSlot = newSlots[index];
        if (existingSlot?.type === 'file') {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = createFileImageSlot(file);
      } else {
        // Revoke object URL if clearing the slot
        const existingSlot = newSlots[index];
        if (existingSlot?.type === 'file') {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = null;
      }
      return newSlots;
    });
  }, []);

  const handleSlotFileSelect = useCallback(
    (file: ImageFileSelection | null, index: number): void => {
      setImageSlots((prevSlots: ProductImageSlot[]) => {
        const newSlots = [...prevSlots];
        if (file) {
          // Revoke object URL if replacing a file upload with an existing file
          const existingSlot = newSlots[index];
          if (existingSlot?.type === 'file') {
            URL.revokeObjectURL(existingSlot.previewUrl);
          }
          newSlots[index] = createExistingImageSlot(file);
        } else {
          // Revoke object URL if clearing the slot
          const existingSlot = newSlots[index];
          if (existingSlot?.type === 'file') {
            URL.revokeObjectURL(existingSlot.previewUrl);
          }
          newSlots[index] = null;
        }
        return newSlots;
      });
      setShowFileManager(false);
    },
    []
  );

  const handleSlotDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      const slotToClear = imageSlots[index];
      if (!slotToClear) return;

      setImageSlots((prevSlots: ProductImageSlot[]) => {
        const newSlots = [...prevSlots];
        newSlots[index] = null;
        return newSlots;
      });

      if (slotToClear.type === 'existing' && product?.id) {
        try {
          await disconnectImageMutation.mutateAsync({
            productId: product.id,
            imageFileId: slotToClear.data.id,
          });
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'useProductImages',
              action: 'disconnectImage',
              productId: product.id,
              imageFileId: slotToClear.data.id,
            },
          });
        }
      } else if (slotToClear.type === 'file') {
        URL.revokeObjectURL(slotToClear.previewUrl);
      }
    },
    [imageSlots, product, disconnectImageMutation]
  );

  const setImageLinkAt = useCallback((index: number, value: string): void => {
    setImageLinks((prev: string[]) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, []);

  const setImageBase64At = useCallback((index: number, value: string): void => {
    setImageBase64s((prev: string[]) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, []);

  const handleMultiImageChange = useCallback((files: File[]): void => {
    setImageSlots((prevSlots: ProductImageSlot[]) => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          if (file) {
            newSlots[i] = createFileImageSlot(file);
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
  }, []);

  const handleMultiFileSelect = useCallback((files: ImageFileSelection[]): void => {
    setImageSlots((prevSlots: ProductImageSlot[]) => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          if (file) {
            newSlots[i] = createExistingImageSlot(file);
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
    setShowFileManager(false);
  }, []);

  const swapImageSlots = useCallback((fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= TOTAL_IMAGE_SLOTS) return;
    if (toIndex < 0 || toIndex >= TOTAL_IMAGE_SLOTS) return;

    setImageSlots((prevSlots: ProductImageSlot[]) => {
      return swapSlots(prevSlots, fromIndex, toIndex);
    });

    setImageLinks((prevLinks: string[]) => {
      const newLinks = [...prevLinks];
      const temp = newLinks[fromIndex];
      newLinks[fromIndex] = newLinks[toIndex]!;
      newLinks[toIndex] = temp!;
      return newLinks;
    });

    setImageBase64s((prevBase64s: string[]) => {
      const newBase64s = [...prevBase64s];
      const temp = newBase64s[fromIndex];
      newBase64s[fromIndex] = newBase64s[toIndex]!;
      newBase64s[toIndex] = temp!;
      return newBase64s;
    });
  }, []);

  const applyRefresh = useCallback((savedProduct: ProductWithImages): void => {
    setImageSlots((prevSlots: ProductImageSlot[]) => {
      // Instead of replacing all slots, update only what changed
      // This prevents flickering by keeping existing references when possible
      const newSlots: ProductImageSlot[] = [...prevSlots];

      // Update slots with saved images
      savedProduct.images
        .slice(0, TOTAL_IMAGE_SLOTS)
        .forEach((pImg: ProductImageRecord, index: number) => {
          if (pImg.imageFile) {
            const existingSlot = newSlots[index];
            // Only update if the image ID changed or slot was empty
            if (existingSlot?.type !== 'existing' || existingSlot.slotId !== pImg.imageFile.id) {
              newSlots[index] = createExistingImageSlot(pImg.imageFile);
            }
          }
        });

      // Clear slots beyond saved images count
      for (let i = savedProduct.images.length; i < TOTAL_IMAGE_SLOTS; i++) {
        if (newSlots[i]?.type === 'file') {
          // Keep temporary file uploads that haven't been saved yet
          continue;
        }
        newSlots[i] = null;
      }

      return newSlots;
    });
    setImageLinks(normalizeImageLinks(savedProduct.imageLinks));
    setImageBase64s(normalizeImageBase64s(savedProduct.imageBase64s, savedProduct.imageLinks));
  }, []);

  const setImagesReordering = useCallback(
    (value: boolean): void => {
      isReorderingRef.current = value;
      if (!value && pendingRefreshRef.current) {
        const pending = pendingRefreshRef.current;
        pendingRefreshRef.current = null;
        applyRefresh(pending);
      }
    },
    [applyRefresh]
  );

  // Function to refresh state from product (e.g. after save)
  const refreshFromProduct = useCallback(
    (savedProduct: ProductWithImages): void => {
      if (isReorderingRef.current) {
        pendingRefreshRef.current = savedProduct;
        if (process.env['NODE_ENV'] !== 'production') {
          logger.info('[product-images] Refresh deferred during reorder');
        }
        return;
      }
      applyRefresh(savedProduct);
    },
    [applyRefresh]
  );

  return {
    imageSlots,
    imageLinks,
    imageBase64s,
    showFileManager,
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
    setImageBase64At,
    refreshFromProduct,
    setImagesReordering,
  };
}
