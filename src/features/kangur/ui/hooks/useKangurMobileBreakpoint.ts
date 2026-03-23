'use client';

import { useEffect, useState } from 'react';

const KANGUR_MOBILE_MEDIA_QUERY = '(max-width: 639px)';

const resolveMobileViewport = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY).matches && window.innerWidth <= 639;
};

export const useKangurMobileBreakpoint = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => resolveMobileViewport());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY);
    const applyBreakpoint = (matches: boolean): void => {
      setIsMobile(matches && window.innerWidth <= 639);
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
