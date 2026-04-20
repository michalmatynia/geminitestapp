'use client';

import { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

export function useFocusManagement(isOverlayMenu: boolean, isMenuHidden: boolean) {
  const overlayMenuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  const shouldTrapFocus = isOverlayMenu && !isMenuHidden;
  const focusTrapRef = useFocusTrap(shouldTrapFocus);

  useEffect(() => {
    if (shouldTrapFocus) {
      previousFocusedElementRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    if (previousFocusedElementRef.current && document.contains(previousFocusedElementRef.current)) {
      previousFocusedElementRef.current.focus();
      previousFocusedElementRef.current = null;
      return;
    }
    overlayMenuToggleButtonRef.current?.focus();
  }, [shouldTrapFocus]);

  return { focusTrapRef, overlayMenuToggleButtonRef, shouldTrapFocus };
}
