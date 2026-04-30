import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { createExistingImageSlot, createFileImageSlot, swapSlots } from '@/shared/lib/image-slots';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { DisconnectProductImage } from './useProductImages.disconnect';
import {
  revokeFileSlotPreview,
  swapArrayValues,
  TOTAL_IMAGE_SLOTS,
} from './useProductImages.helpers';

type ProductImageStateSetters = {
  setImageSlots: Dispatch<SetStateAction<ProductImageSlot[]>>;
  setImageLinks: Dispatch<SetStateAction<string[]>>;
  setImageBase64s: Dispatch<SetStateAction<string[]>>;
  setShowFileManager: Dispatch<SetStateAction<boolean>>;
};

export type ProductImageActions = {
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
  setImageBase64At: (index: number, value: string) => void;
};

type ProductImageActionsArgs = ProductImageStateSetters & {
  imageSlots: ProductImageSlot[];
  product?: ProductWithImages;
  disconnectProductImage: DisconnectProductImage;
};

const fillEmptySlotsWithFiles = <T extends File | ImageFileSelection>(
  prevSlots: ProductImageSlot[],
  files: T[],
  createSlot: (file: T) => ProductImageSlot
): ProductImageSlot[] => {
  const newSlots = [...prevSlots];
  let fileIndex = 0;
  for (let index = 0; index < TOTAL_IMAGE_SLOTS && fileIndex < files.length; index += 1) {
    if (newSlots[index] === null) {
      const file = files[fileIndex];
      if (file !== undefined) {
        newSlots[index] = createSlot(file);
      }
      fileIndex += 1;
    }
  }
  return newSlots;
};

const isValidSlotIndex = (index: number): boolean =>
  index >= 0 && index < TOTAL_IMAGE_SLOTS;

type SingleProductImageActions = Pick<
  ProductImageActions,
  'handleSlotImageChange' | 'handleSlotFileSelect' | 'handleSlotDisconnectImage'
>;

type BulkProductImageActions = Pick<
  ProductImageActions,
  'handleMultiImageChange' | 'handleMultiFileSelect' | 'swapImageSlots'
>;

type ProductImageValueActions = Pick<
  ProductImageActions,
  'setImageLinkAt' | 'setImageBase64At'
>;

const useSingleProductImageActions = ({
  imageSlots,
  product,
  disconnectProductImage,
  setImageSlots,
  setShowFileManager,
}: ProductImageActionsArgs): SingleProductImageActions => {
  const handleSlotImageChange = useCallback((file: File | null, index: number): void => {
    setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] => {
      const newSlots = [...prevSlots];
      revokeFileSlotPreview(newSlots[index]);
      newSlots[index] = file !== null ? createFileImageSlot(file) : null;
      return newSlots;
    });
  }, [setImageSlots]);

  const handleSlotFileSelect = useCallback(
    (file: ImageFileSelection | null, index: number): void => {
      setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] => {
        const newSlots = [...prevSlots];
        revokeFileSlotPreview(newSlots[index]);
        newSlots[index] = file !== null ? createExistingImageSlot(file) : null;
        return newSlots;
      });
      setShowFileManager(false);
    },
    [setImageSlots, setShowFileManager]
  );

  const handleSlotDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      const slotToClear = imageSlots[index];
      if (slotToClear === undefined || slotToClear === null) return;

      setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] => {
        const newSlots = [...prevSlots];
        newSlots[index] = null;
        return newSlots;
      });

      if (slotToClear.type === 'existing' && product !== undefined) {
        try {
          await disconnectProductImage(product.id, slotToClear.data.id);
        } catch (error) {
          logClientCatch(error, {
            source: 'useProductImages',
            action: 'disconnectImage',
            productId: product.id,
            imageFileId: slotToClear.data.id,
          });
        }
        return;
      }

      revokeFileSlotPreview(slotToClear);
    },
    [disconnectProductImage, imageSlots, product, setImageSlots]
  );

  return {
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
  };
};

const useBulkProductImageActions = ({
  setImageSlots,
  setImageLinks,
  setImageBase64s,
  setShowFileManager,
}: ProductImageStateSetters): BulkProductImageActions => {
  const handleMultiImageChange = useCallback((files: File[]): void => {
    setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] =>
      fillEmptySlotsWithFiles(prevSlots, files, createFileImageSlot)
    );
  }, [setImageSlots]);

  const handleMultiFileSelect = useCallback((files: ImageFileSelection[]): void => {
    setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] =>
      fillEmptySlotsWithFiles(prevSlots, files, createExistingImageSlot)
    );
    setShowFileManager(false);
  }, [setImageSlots, setShowFileManager]);

  const swapImageSlots = useCallback((fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) return;
    if (!isValidSlotIndex(fromIndex) || !isValidSlotIndex(toIndex)) return;

    setImageSlots((prevSlots: ProductImageSlot[]): ProductImageSlot[] =>
      swapSlots(prevSlots, fromIndex, toIndex)
    );
    setImageLinks((prevLinks: string[]): string[] =>
      swapArrayValues(prevLinks, fromIndex, toIndex)
    );
    setImageBase64s((prevBase64s: string[]): string[] =>
      swapArrayValues(prevBase64s, fromIndex, toIndex)
    );
  }, [setImageBase64s, setImageLinks, setImageSlots]);

  return {
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
  };
};

const useProductImageValueActions = ({
  setImageLinks,
  setImageBase64s,
}: Pick<ProductImageStateSetters, 'setImageLinks' | 'setImageBase64s'>): ProductImageValueActions => {
  const setImageLinkAt = useCallback((index: number, value: string): void => {
    setImageLinks((prev: string[]): string[] => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, [setImageLinks]);

  const setImageBase64At = useCallback((index: number, value: string): void => {
    setImageBase64s((prev: string[]): string[] => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, [setImageBase64s]);

  return {
    setImageLinkAt,
    setImageBase64At,
  };
};

export const useProductImageActions = (
  args: ProductImageActionsArgs
): ProductImageActions => {
  const singleActions = useSingleProductImageActions(args);
  const bulkActions = useBulkProductImageActions(args);
  const valueActions = useProductImageValueActions(args);

  return {
    ...singleActions,
    ...bulkActions,
    ...valueActions,
  };
};
