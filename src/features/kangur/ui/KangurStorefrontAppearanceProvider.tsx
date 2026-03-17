'use client';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  parseKangurStorefrontAppearanceMode,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

export function KangurStorefrontAppearanceProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: KangurStorefrontAppearanceMode;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const [hydrated, setHydrated] = useState(false);
  const storedMode = settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  const resolvedMode = useMemo(
    () => parseKangurStorefrontAppearanceMode(storedMode),
    [storedMode]
  );
  const defaultMode = hydrated ? resolvedMode : (initialMode ?? 'default');
  const shouldPersistMode = useMemo(() => {
    const raw = process.env['NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST'];
    if (process.env['NODE_ENV'] !== 'production') {
      return raw !== 'false';
    }
    return raw === 'true';
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <CmsStorefrontAppearanceProvider
      initialMode={defaultMode}
      storageKey={KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY}
      persistMode={shouldPersistMode}
    >
      {children}
    </CmsStorefrontAppearanceProvider>
  );
}
