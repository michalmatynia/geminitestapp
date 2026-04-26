import { useCallback } from 'react';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const TOTAL_IMAGE_SLOTS = 15;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'));
    reader.readAsDataURL(file);
  });

export const useDraftImageSerializer = (images: any, draftId?: string | null) => {
  return useCallback(async (): Promise<string[]> => {
    const promises: Promise<string | null>[] = [];

    for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
      const base64 = images.imageBase64s[i]?.trim();
      if (base64 !== undefined && base64 !== '') {
        promises.push(Promise.resolve(base64));
        continue;
      }
      const link = images.imageLinks[i]?.trim();
      if (link !== undefined && link !== '') {
        promises.push(Promise.resolve(link));
        continue;
      }
      const slot = images.imageSlots[i];
      if (slot === undefined || slot === null) {
        promises.push(Promise.resolve(null));
        continue;
      }
      if (slot.type === 'existing') {
        const path = slot.data?.filepath?.trim();
        promises.push(Promise.resolve(path !== undefined && path !== '' ? path : null));
        continue;
      }
      
      promises.push(
        fileToDataUrl(slot.data as File).catch((err) => {
          logClientCatch(err, { source: 'DraftCreator', action: 'serializeDraftImage', draftId });
          return null;
        })
      );
    }
    const results = await Promise.all(promises);
    return results.filter((r): r is string => r !== null && r !== '');
  }, [draftId, images]);
};
