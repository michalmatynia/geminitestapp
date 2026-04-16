'use client';

import { useEffect } from 'react';

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const focusableSelector = [
      'a[href]',
      'area[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      'object',
      'embed',
      '[contenteditable]'
    ].join(',');

    const isFocusable = (el: Element) => {
      if (!(el instanceof HTMLElement)) return false;
      const tab = el.getAttribute('tabindex');
      if (tab !== null && parseInt(tab, 10) >= 0) return true;
      return el.matches(focusableSelector);
    };

    const setScrollablesFocusable = () => {
      const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
      for (const el of all) {
        try {
          const style = window.getComputedStyle(el);
          const overflowY = style.getPropertyValue('overflow-y');
          const overflowX = style.getPropertyValue('overflow-x');
          const isScrollable = /(auto|scroll)/.test(overflowY) || /(auto|scroll)/.test(overflowX);
          if (isScrollable && !isFocusable(el)) {
            // make keyboard accessible
            el.setAttribute('tabindex', '0');
            // add landmark role if missing
            if (!el.hasAttribute('role')) {
              el.setAttribute('role', 'region');
            }
            // add aria-label if missing
            if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
              el.setAttribute('aria-label', 'Scrollable region');
            }
          }
        } catch (_) {
          // ignore cross-origin or computed style errors
        }
      }
    };

    // Run initially and on resize (dynamic content may change scrollability)
    setScrollablesFocusable();
    const ro = new ResizeObserver(() => setScrollablesFocusable());
    ro.observe(document.documentElement);

    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div id='aria-announcer' aria-live='polite' aria-atomic='true' className='sr-only' />
      {children}
    </>
  );
};

export const announceAria = (message: string) => {
  if (typeof window === 'undefined') return;
  const announcer = document.getElementById('aria-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
};
