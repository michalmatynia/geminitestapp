'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminLayoutActions, useAdminLayoutState } from '../context/AdminLayoutContext';

export function useViewportHandling(): { isMobileViewport: boolean } {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const lastDesktopMenuHiddenRef = useRef(isMenuHidden);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 1023px)');
    const applyMatch = (matches: boolean): void => {
      setIsMobileViewport(matches);
    };

    applyMatch(media.matches);

    const handler = (event: MediaQueryListEvent): void => {
      applyMatch(event.matches);
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

  useEffect(() => {
    if (!isMobileViewport) {
      lastDesktopMenuHiddenRef.current = isMenuHidden;
    }
  }, [isMobileViewport, isMenuHidden]);

  useEffect(() => {
    if (isMobileViewport) {
      setIsMenuHidden(true);
      return;
    }

    setIsMenuHidden(lastDesktopMenuHiddenRef.current);
  }, [isMobileViewport, setIsMenuHidden]);

  return { isMobileViewport };
}
