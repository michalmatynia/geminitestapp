'use client';

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0)
  );
}

/**
 * Traps Tab/Shift+Tab focus within a container element when active.
 *
 * @param active - Whether the focus trap is currently enabled
 * @returns A callback ref to attach to the container element
 */
export function useFocusTrap(active: boolean): (node: HTMLElement | null) => void {
  const containerRef = useRef<HTMLElement | null>(null);

  const refCallback = useCallback((node: HTMLElement | null): void => {
    containerRef.current = node;
  }, []);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // If nothing in the container is focused, focus the first focusable element
    if (!container.contains(document.activeElement)) {
      const focusable = getFocusableElements(container);
      const first = focusable[0];
      if (first) {
        first.focus();
      }
    }

    return (): void => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return refCallback;
}