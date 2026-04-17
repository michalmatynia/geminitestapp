'use client';

import { useEffect } from 'react';

const SCROLL_FOCUS_IGNORE_ATTRIBUTE = 'data-scroll-focus-ignore';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
].join(',');

function isFocusable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tab = el.getAttribute('tabindex');
  if (tab !== null && parseInt(tab, 10) >= 0) return true;
  return el.matches(FOCUSABLE_SELECTOR);
}

function shouldSkipScrollableEnhancement(el: HTMLElement): boolean {
  return (
    el.hasAttribute(SCROLL_FOCUS_IGNORE_ATTRIBUTE) ||
    el.hasAttribute('tabindex') ||
    el.getAttribute('aria-hidden') === 'true'
  );
}

function isScrollableElement(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.getPropertyValue('overflow-y');
  const overflowX = style.getPropertyValue('overflow-x');
  return /(auto|scroll)/.test(overflowY) || /(auto|scroll)/.test(overflowX);
}

function enhanceScrollableElement(el: HTMLElement): void {
  if (shouldSkipScrollableEnhancement(el) || !isScrollableElement(el) || isFocusable(el)) return;

  el.setAttribute('tabindex', '0');
  if (!el.hasAttribute('role')) {
    el.setAttribute('role', 'region');
  }
  if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
    el.setAttribute('aria-label', 'Scrollable region');
  }
}

function setScrollablesFocusable(): void {
  const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
  for (const el of all) {
    try {
      enhanceScrollableElement(el);
    } catch {
      // ignore cross-origin or computed style errors
    }
  }
}

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  useEffect((): (() => void) | undefined => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    setScrollablesFocusable();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver(() => {
      setScrollablesFocusable();
    });
    ro.observe(document.documentElement);

    return (): void => {
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <div id='aria-announcer' aria-live='polite' aria-atomic='true' className='sr-only' />
      {children}
    </>
  );
}

export const announceAria = (message: string): void => {
  if (typeof window === 'undefined') return;
  const announcer = document.getElementById('aria-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
};
