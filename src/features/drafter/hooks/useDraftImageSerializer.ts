import { useCallback } from 'react';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

const TOTAL_IMAGE_SLOTS = 15;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'));
    reader.readAsDataURL(file);
  });

type ImageSerializerState = {
  imageSlots: ProductImageManagerController['imageSlots'];
  imageLinks: string[];
  imageBase64s: string[];
};

const serializeSlot = async (
  index: number,
  state: ImageSerializerState,
  draftId: string | null | undefined
): Promise<string | null> => {
  const base64 = state.imageBase64s[index]?.trim();
  if (base64 !== undefined && base64 !== '') {
    return base64;
  }

  const link = state.imageLinks[index]?.trim();
  if (link !== undefined && link !== '') {
    return link;
  }

  const slot = state.imageSlots[index];
  if (slot === undefined || slot === null) {
    return null;
  }

  if (slot.type === 'existing') {
    const path = slot.data?.filepath?.trim();
    return path !== undefined && path !== '' ? path : null;
  }

  try {
    return await fileToDataUrl(slot.data as File);
  } catch (err) {
    logClientCatch(err, { source: 'DraftCreator', action: 'serializeDraftImage', draftId });
    return null;
  }
};

export const useDraftImageSerializer = (images: ImageSerializerState, draftId?: string | null) => {
  return useCallback(async (): Promise<string[]> => {
    const promises: Promise<string | null>[] = [];

    for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
      promises.push(serializeSlot(i, images, draftId));
    }

    const results = await Promise.all(promises);
    return results.filter((r): r is string => r !== null && r !== '');
  }, [draftId, images]);
};

