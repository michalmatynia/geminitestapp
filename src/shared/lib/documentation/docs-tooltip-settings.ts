'use client';

import React from 'react';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


export const readDocsTooltipsEnabled = (storageKey: string, defaultValue = false): boolean => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return defaultValue;
    return raw === '1';
  } catch (error) {
    logClientCatch(error, {
      source: 'docs-tooltip-settings',
      action: 'readDocsTooltipsEnabled',
      storageKey,
      level: 'warn',
    });
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
        } catch (error) {
          logClientCatch(error, {
            source: 'docs-tooltip-settings',
            action: 'writeDocsTooltipsEnabled',
            storageKey,
            level: 'warn',
          });

          // No-op when storage is unavailable; keep UI state responsive.
        }
      }
    },
    [storageKey]
  );

  return { enabled, setEnabled };
}

export type DocsTooltipsState = {
  docsTooltipsEnabled: boolean;
  setDocsTooltipsEnabled: (enabled: boolean) => void;
};

export function createDocsTooltipsState(
  storageKey: string,
  defaultValue = false
): {
  readEnabled: () => boolean;
  useDocsTooltips: () => DocsTooltipsState;
} {
  const readEnabled = (): boolean => readDocsTooltipsEnabled(storageKey, defaultValue);

  const useDocsTooltips = (): DocsTooltipsState => {
    const { enabled, setEnabled } = useDocsTooltipsSetting(storageKey, defaultValue);

    return {
      docsTooltipsEnabled: enabled,
      setDocsTooltipsEnabled: setEnabled,
    };
  };

  return { readEnabled, useDocsTooltips };
}
