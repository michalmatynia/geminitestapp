'use client';

import { useEffect, useState } from 'react';

const KANGUR_MOBILE_MEDIA_QUERY = '(max-width: 639px)';

export const useKangurMobileBreakpoint = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY);
    const applyBreakpoint = (matches: boolean): void => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      setIsMobile(matches && width <= 639);
    };

    applyBreakpoint(media.matches);

    const handler = (event: MediaQueryListEvent): void => {
      applyBreakpoint(event.matches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
      return (): void => {
        media.removeEventListener('change', handler);
      };
    }

    media.addListener(handler);
    return (): void => {
      media.removeListener(handler);
    };
  }, []);

  return isMobile;
};
