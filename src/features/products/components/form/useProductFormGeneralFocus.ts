'use client';

import { useEffect, useRef, useState } from 'react';

const isFocusableProductFieldElement = (
  element: Element | null
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  element instanceof HTMLSelectElement;

const normalizeFocusedFieldToken = (value: string): string | null => {
  const normalized = value.trim();
  return normalized !== '' ? normalized : null;
};

const resolveFocusedProductFieldName = (): string | null => {
  if (typeof document === 'undefined') return null;
  const activeElement = document.activeElement;
  if (isFocusableProductFieldElement(activeElement) === false) return null;
  return (
    normalizeFocusedFieldToken(activeElement.name) ??
    normalizeFocusedFieldToken(activeElement.id)
  );
};

export const useProductFormGeneralFocus = (): string | null => {
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);
  const focusOutSyncTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const syncFocusedField = (): void => {
      setFocusedFieldName(resolveFocusedProductFieldName());
    };
    const handleFocusOut = (): void => {
      if (focusOutSyncTimeoutRef.current !== null) {
        window.clearTimeout(focusOutSyncTimeoutRef.current);
      }
      focusOutSyncTimeoutRef.current = window.setTimeout(() => {
        focusOutSyncTimeoutRef.current = null;
        syncFocusedField();
      }, 0);
    };

    syncFocusedField();
    document.addEventListener('focusin', syncFocusedField);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      if (focusOutSyncTimeoutRef.current !== null) {
        window.clearTimeout(focusOutSyncTimeoutRef.current);
        focusOutSyncTimeoutRef.current = null;
      }
      document.removeEventListener('focusin', syncFocusedField);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return focusedFieldName;
};
