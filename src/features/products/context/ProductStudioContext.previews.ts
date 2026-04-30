'use client';

import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';

import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

import type { ProductImageSlotPreview } from './ProductStudioContext.types';

const buildProductImageSlotPreview = (
  slot: ProductImageSlot | null,
  index: number,
  productImagesExternalBaseUrl: string
): ProductImageSlotPreview | null => {
  if (slot === null) return null;

  const src =
    slot.type === 'file'
      ? slot.previewUrl
      : (resolveProductImageUrl(slot.data.filepath, productImagesExternalBaseUrl) ??
        slot.previewUrl);
  if (src.length === 0) return null;

  return { index, label: `Slot ${index + 1}`, src };
};

export const useProductImageSlotPreviews = (
  imageSlots: Array<ProductImageSlot | null>,
  productImagesExternalBaseUrl: string
): ProductImageSlotPreview[] =>
  useMemo(
    () =>
      imageSlots
        .map((slot, index) =>
          buildProductImageSlotPreview(slot, index, productImagesExternalBaseUrl)
        )
        .filter((entry): entry is ProductImageSlotPreview => entry !== null),
    [imageSlots, productImagesExternalBaseUrl]
  );

export const useProductStudioInitialImageSelection = ({
  imageSlotPreviews,
  selectedImageIndex,
  setSelectedImageIndex,
}: {
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedImageIndex: number | null;
  setSelectedImageIndex: Dispatch<SetStateAction<number | null>>;
}): void => {
  useEffect(() => {
    if (imageSlotPreviews.length === 0) {
      setSelectedImageIndex(null);
      return;
    }

    const selectedPreviewExists =
      selectedImageIndex !== null &&
      imageSlotPreviews.some((preview) => preview.index === selectedImageIndex);
    if (selectedPreviewExists) return;

    setSelectedImageIndex(imageSlotPreviews[0]?.index ?? null);
  }, [imageSlotPreviews, selectedImageIndex, setSelectedImageIndex]);
};
