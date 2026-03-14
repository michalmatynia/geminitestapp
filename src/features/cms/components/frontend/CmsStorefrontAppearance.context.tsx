'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CmsStorefrontAppearanceMode,
  CmsStorefrontAppearanceContextValue,
  CmsStorefrontAppearanceProviderProps,
  VALID_MODES,
} from './CmsStorefrontAppearance.contracts';

const CmsStorefrontAppearanceContext =
  createContext<CmsStorefrontAppearanceContextValue | null>(null);

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readPersistedMode = (storageKey: string): CmsStorefrontAppearanceMode | null => {
  if (!canUseLocalStorage()) return null;

  try {
    const value = window.localStorage.getItem(storageKey);
    return VALID_MODES.has(value as CmsStorefrontAppearanceMode)
      ? (value as CmsStorefrontAppearanceMode)
      : null;
  } catch {
    return null;
  }
};

const writePersistedMode = (storageKey: string, mode: CmsStorefrontAppearanceMode): void => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore localStorage persistence failures and keep the in-memory selection.
  }
};

export function CmsStorefrontAppearanceProvider({
  children,
  initialMode = 'default',
  storageKey = 'cms_appearance_mode',
}: CmsStorefrontAppearanceProviderProps): React.JSX.Element {
  const [mode, setMode] = useState<CmsStorefrontAppearanceMode>(() => {
    const persisted = readPersistedMode(storageKey);
    return persisted || initialMode;
  });

  useEffect(() => {
    writePersistedMode(storageKey, mode);
  }, [mode, storageKey]);

  const value = React.useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <CmsStorefrontAppearanceContext.Provider value={value}>
      {children}
    </CmsStorefrontAppearanceContext.Provider>
  );
}

export function useCmsStorefrontAppearance(): CmsStorefrontAppearanceContextValue {
  const context = useContext(CmsStorefrontAppearanceContext);
  if (!context) {
    throw new Error(
      'useCmsStorefrontAppearance must be used within a CmsStorefrontAppearanceProvider'
    );
  }
  return context;
}

export function useOptionalCmsStorefrontAppearance():
  | CmsStorefrontAppearanceContextValue
  | null {
  return useContext(CmsStorefrontAppearanceContext);
}
