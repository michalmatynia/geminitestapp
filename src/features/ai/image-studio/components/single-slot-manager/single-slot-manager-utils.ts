import { isLikelyImageStudioErrorText } from '@/features/ai/image-studio/utils/image-src';
import type { ManagedImageSlot as ProductImageSlot } from '@/shared/contracts/image-slots';
import type { ImageStudioAssetDto, ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

export const OBJECT_SLOT_INDEX = 0;
export const TEMP_OBJECT_SLOT_ID = '__image_studio_temp_object__';
export const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

export type UploadedAsset = ImageStudioAssetDto;

export function toManagedSlot(slot: ImageStudioSlotRecord | null): ProductImageSlot {
  if (!slot?.imageFileId) return null;
  const previewPath = slot.imageFile?.url || slot.imageUrl || null;
  if (!previewPath) return null;
  return {
    type: 'existing',
    data: {
      id: slot.imageFileId,
      filepath: previewPath,
    },
    previewUrl: previewPath,
    slotId: slot.id,
  };
}

export function toManagedUploadedAsset(uploaded: UploadedAsset | null): ProductImageSlot {
  if (!uploaded?.id || !uploaded.filepath) return null;
  return {
    type: 'existing',
    data: {
      id: uploaded.id,
      filepath: uploaded.filepath,
    },
    previewUrl: uploaded.filepath,
    slotId: TEMP_OBJECT_SLOT_ID,
  };
}

export const resolveSlotIdCandidates = (rawId: string): string[] => {
  const normalized = rawId.trim();
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? normalized.slice('slot:'.length).trim()
    : normalized.startsWith('card:')
      ? normalized.slice('card:'.length).trim()
      : normalized;

  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }
  return Array.from(candidates);
};

export function slotHasRenderableImage(slot: ImageStudioSlotRecord | null | undefined): boolean {
  if (!slot) return false;
  const imageFileId = slot.imageFileId?.trim() ?? '';
  const imageFilePath = slot.imageFile?.url?.trim() ?? '';
  const rawImageUrl = slot.imageUrl?.trim() ?? '';
  const imageUrl = rawImageUrl && !isLikelyImageStudioErrorText(rawImageUrl) ? rawImageUrl : '';
  const imageBase64 = slot.imageBase64?.trim() ?? '';
  return Boolean(imageFileId || imageFilePath || imageUrl || imageBase64);
}
