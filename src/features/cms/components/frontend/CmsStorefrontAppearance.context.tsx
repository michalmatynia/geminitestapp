'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CmsStorefrontAppearanceMode,
  CmsStorefrontAppearanceContextValue,
  CmsStorefrontAppearanceProviderProps,
  VALID_MODES,
} from './CmsStorefrontAppearance.contracts';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const writePersistedMode = (storageKey: string, mode: CmsStorefrontAppearanceMode): void => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, mode);
  } catch (error) {
    logClientError(error);
  
    // Ignore localStorage persistence failures and keep the in-memory selection.
  }
};

export function CmsStorefrontAppearanceProvider({
  children,
  initialMode = 'default',
  storageKey = 'cms_appearance_mode',
}: CmsStorefrontAppearanceProviderProps): React.JSX.Element {
  const [mode, setMode] = useState<CmsStorefrontAppearanceMode>(initialMode);
  const [hydrated, setHydrated] = useState(false);
  const persistedModeRef = useRef<CmsStorefrontAppearanceMode | null>(null);
  const lastInitialModeRef = useRef<CmsStorefrontAppearanceMode>(initialMode);

  useEffect(() => {
    const persisted = readPersistedMode(storageKey);
    persistedModeRef.current = persisted;
    if (persisted) {
      setMode(persisted);
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    writePersistedMode(storageKey, mode);
  }, [hydrated, mode, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (persistedModeRef.current) return;
    if (mode === lastInitialModeRef.current && mode !== initialMode) {
      setMode(initialMode);
    }
    lastInitialModeRef.current = initialMode;
  }, [hydrated, initialMode, mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

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
