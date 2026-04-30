import { useEffect, useRef } from 'react';

import type { ProductImageSlot } from '@/shared/contracts/products/drafts';

export const useProductImageObjectUrls = (imageSlots: ProductImageSlot[]): void => {
  const objectUrlsRef = useRef<string[]>([]);

  useEffect((): void => {
    const currentObjectUrls = imageSlots
      .map((slot: ProductImageSlot | null): string | null =>
        slot?.type === 'file' ? slot.previewUrl : null
      )
      .filter((url: string | null): url is string => url !== null);

    const oldObjectUrls = objectUrlsRef.current.filter(
      (url: string): boolean => !currentObjectUrls.includes(url)
    );
    oldObjectUrls.forEach((url: string): void => URL.revokeObjectURL(url));
    objectUrlsRef.current = currentObjectUrls;
  }, [imageSlots]);

  useEffect((): (() => void) => {
    return (): void => {
      objectUrlsRef.current.forEach((url: string): void => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);
};
