/**
 * Product Studio Context Previews
 * 
 * Preview management for product studio image slots.
 * Provides:
 * - Image slot preview generation
 * - Preview source type handling
 * - Image URL resolution
 * - Client-side preview state management
 * - Preview synchronization with image slots
 */

'use client';

import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';

import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import { resolveProductImageFileUrl, resolveProductImageUrl } from '@/shared/utils/image-routing';

import type { ProductImageSlotPreview } from './ProductStudioContext.types';

type ProductImageSlotPreviewSource = Pick<ProductImageSlotPreview, 'sourceType' | 'src'>;

type BuildProductImageSlotPreviewInput = {
  imageBase64?: string | null;
  imageLink?: string | null;
  index: number;
  productImagesExternalBaseUrl: string;
  slot: ProductImageSlot | null;
};

const resolveSlotPreviewSource = ({
  productImagesExternalBaseUrl,
  slot,
}: Pick<
  BuildProductImageSlotPreviewInput,
  'productImagesExternalBaseUrl' | 'slot'
>): ProductImageSlotPreviewSource | null => {
  if (slot?.type === 'file') {
    return { sourceType: 'file', src: slot.previewUrl };
  }

  if (slot?.type !== 'existing') {
    return null;
  }

  return {
    sourceType: 'file',
    src: resolveProductImageFileUrl(slot.data, productImagesExternalBaseUrl) ?? slot.previewUrl,
  };
};

const resolveLinkPreviewSource = ({
  imageBase64,
  imageLink,
  productImagesExternalBaseUrl,
}: Pick<
  BuildProductImageSlotPreviewInput,
  'imageBase64' | 'imageLink' | 'productImagesExternalBaseUrl'
>): ProductImageSlotPreviewSource | null => {
  const base64Src = resolveProductImageUrl(imageBase64, productImagesExternalBaseUrl);
  if (base64Src !== null) return { sourceType: 'base64', src: base64Src };

  const linkSrc = resolveProductImageUrl(imageLink, productImagesExternalBaseUrl);
  return linkSrc === null ? null : { sourceType: 'link', src: linkSrc };
};

const buildProductImageSlotPreview = (
  input: BuildProductImageSlotPreviewInput
): ProductImageSlotPreview | null => {
  const source = resolveSlotPreviewSource(input) ?? resolveLinkPreviewSource(input);
  if (source === null || source.src.length === 0) return null;

  return { index: input.index, label: `Slot ${input.index + 1}`, ...source };
};

export const useProductImageSlotPreviews = (
  imageSlots: Array<ProductImageSlot | null>,
  imageLinks: string[],
  imageBase64s: string[],
  productImagesExternalBaseUrl: string
): ProductImageSlotPreview[] =>
  useMemo(
    () =>
      imageSlots
        .map((slot, index) =>
          buildProductImageSlotPreview({
            slot,
            index,
            productImagesExternalBaseUrl,
            imageLink: imageLinks[index],
            imageBase64: imageBase64s[index],
          })
        )
        .filter((entry): entry is ProductImageSlotPreview => entry !== null),
    [imageBase64s, imageLinks, imageSlots, productImagesExternalBaseUrl]
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
