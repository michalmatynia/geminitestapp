'use client';

import { useEffect, useState } from 'react';

const KANGUR_MOBILE_MAX_WIDTH = 639;
const KANGUR_MOBILE_MEDIA_QUERY = `(max-width: ${KANGUR_MOBILE_MAX_WIDTH}px)`;

const resolveViewportWidth = (): number => {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY;
  }

  const visualViewportWidth = window.visualViewport?.width;
  return Math.min(window.innerWidth, visualViewportWidth ?? window.innerWidth);
};

const resolveMobileViewport = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const viewportWidth = resolveViewportWidth();
  const matchesMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY).matches
      : viewportWidth <= KANGUR_MOBILE_MAX_WIDTH;

  return matchesMedia && viewportWidth <= KANGUR_MOBILE_MAX_WIDTH;
};

export const useKangurMobileBreakpoint = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => resolveMobileViewport());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY)
        : null;
    const applyBreakpoint = (): void => {
      setIsMobile(resolveMobileViewport());
    };

    applyBreakpoint();

    const cleanups: Array<() => void> = [];
    const handleViewportChange = (): void => {
      applyBreakpoint();
    };

    if (media) {
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handleViewportChange);
        cleanups.push(() => {
          media.removeEventListener('change', handleViewportChange);
        });
      } else if (typeof media.addListener === 'function') {
        media.addListener(handleViewportChange);
        cleanups.push(() => {
          media.removeListener(handleViewportChange);
        });
      }
    }

    window.addEventListener('resize', handleViewportChange, { passive: true });
    cleanups.push(() => {
      window.removeEventListener('resize', handleViewportChange);
    });

    window.addEventListener('orientationchange', handleViewportChange);
    cleanups.push(() => {
      window.removeEventListener('orientationchange', handleViewportChange);
    });

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);
      cleanups.push(() => {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      });
    }

    return (): void => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return isMobile;
};
