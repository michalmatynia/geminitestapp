import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductImageRecord, ProductWithImages } from '@/shared/contracts/products/product';
import {
  DEFAULT_IMAGE_SLOT_COUNT,
  buildEmptySlots,
  createExistingImageSlot,
} from '@/shared/lib/image-slots';

export const TOTAL_IMAGE_SLOTS = DEFAULT_IMAGE_SLOT_COUNT;

export const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number): void => {
      const value = link.trim();
      next[index] = value !== '' && !value.startsWith('data:') ? value : '';
    });
  }
  return next;
};

export const normalizeImageBase64s = (
  base64s?: string[] | null,
  links?: string[] | null
): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(base64s)) {
    base64s.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number): void => {
      const trimmed = value.trim();
      next[index] = trimmed.startsWith('data:') ? trimmed : '';
    });
  }
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number): void => {
      const trimmed = value.trim();
      const existingValue = next[index] ?? '';
      if (trimmed.startsWith('data:') && existingValue === '') {
        next[index] = trimmed;
      }
    });
  }
  return next;
};

export const buildImageSlotsFromProduct = (
  product?: ProductWithImages
): ProductImageSlot[] => {
  const slots: ProductImageSlot[] = buildEmptySlots(TOTAL_IMAGE_SLOTS);
  if (product === undefined || product.images.length === 0) return slots;

  product.images
    .slice(0, TOTAL_IMAGE_SLOTS)
    .forEach((imageRecord: ProductImageRecord, index: number): void => {
      slots[index] = createExistingImageSlot(imageRecord.imageFile as ImageFileSelection);
    });
  return slots;
};

export const revokeFileSlotPreview = (slot: ProductImageSlot | null | undefined): void => {
  if (slot?.type === 'file') {
    URL.revokeObjectURL(slot.previewUrl);
  }
};

export const swapArrayValues = <T>(values: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...values];
  const fromValue = next[fromIndex];
  const toValue = next[toIndex];
  if (fromValue === undefined || toValue === undefined) return values;
  next[fromIndex] = toValue;
  next[toIndex] = fromValue;
  return next;
};
