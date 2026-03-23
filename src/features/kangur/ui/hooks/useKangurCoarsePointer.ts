'use client';

import { useEffect, useState } from 'react';

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';

const resolveCoarsePointer = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchesCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY).matches
      : false;

  if (matchesCoarsePointer) {
    return true;
  }

  const maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const prefersTouchOnlyInteraction =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY).matches
      : false;

  return maxTouchPoints > 0 && prefersTouchOnlyInteraction;
};

export const useKangurCoarsePointer = (): boolean => {
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(() => resolveCoarsePointer());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const coarseMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY)
        : null;
    const hoverMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(KANGUR_HOVER_NONE_QUERY)
        : null;

    const updatePointer = (): void => {
      setIsCoarsePointer(resolveCoarsePointer());
    };

    updatePointer();

    const cleanups: Array<() => void> = [];
    const watchMediaQuery = (media: MediaQueryList | null): void => {
      if (!media) {
        return;
      }
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', updatePointer);
        cleanups.push(() => media.removeEventListener('change', updatePointer));
        return;
      }
      if (typeof media.addListener === 'function') {
        media.addListener(updatePointer);
        cleanups.push(() => media.removeListener(updatePointer));
      }
    };

    watchMediaQuery(coarseMedia);
    watchMediaQuery(hoverMedia);

    window.addEventListener('resize', updatePointer, { passive: true });
    cleanups.push(() => window.removeEventListener('resize', updatePointer));

    window.addEventListener('orientationchange', updatePointer);
    cleanups.push(() => window.removeEventListener('orientationchange', updatePointer));

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updatePointer);
      cleanups.push(() => visualViewport.removeEventListener('resize', updatePointer));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return isCoarsePointer;
};
