'use client';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

export function KangurStorefrontAppearanceProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const [hydrated, setHydrated] = useState(false);
  const storedMode = settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY);
  const resolvedMode = useMemo(
    () => parseKangurStorefrontAppearanceMode(storedMode),
    [storedMode]
  );
  const defaultMode = hydrated ? resolvedMode : 'default';

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <CmsStorefrontAppearanceProvider initialMode={defaultMode}>
      {children}
    </CmsStorefrontAppearanceProvider>
  );
}
