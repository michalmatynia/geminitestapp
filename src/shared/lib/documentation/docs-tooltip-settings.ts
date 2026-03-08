'use client';

import React from 'react';

export const readDocsTooltipsEnabled = (storageKey: string, defaultValue = false): boolean => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return defaultValue;
    return raw === '1';
  } catch {
    return defaultValue;
  }
};

export function useDocsTooltipsSetting(
  storageKey: string,
  defaultValue = false
): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
} {
  const [enabled, setEnabledState] = React.useState(defaultValue);

  React.useEffect(() => {
    setEnabledState(readDocsTooltipsEnabled(storageKey, defaultValue));
  }, [defaultValue, storageKey]);

  const setEnabled = React.useCallback(
    (value: boolean): void => {
      setEnabledState(value);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, value ? '1' : '0');
        } catch {
          // No-op when storage is unavailable; keep UI state responsive.
        }
      }
    },
    [storageKey]
  );

  return { enabled, setEnabled };
}
