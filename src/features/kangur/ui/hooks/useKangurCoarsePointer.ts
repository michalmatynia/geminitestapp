'use client';

import { useEffect, useState } from 'react';

export const useKangurCoarsePointer = (): boolean => {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(pointer: coarse)');
    const updatePointer = (): void => {
      setIsCoarsePointer(media.matches);
    };
    updatePointer();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updatePointer);
      return () => media.removeEventListener('change', updatePointer);
    }
    if (typeof media.addListener === 'function') {
      media.addListener(updatePointer);
      return () => media.removeListener(updatePointer);
    }
    return undefined;
  }, []);

  return isCoarsePointer;
};
