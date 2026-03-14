'use client';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/public';
import {
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
  parseKangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import type { ReactNode } from 'react';

export function KangurStorefrontAppearanceProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const defaultMode = parseKangurStorefrontAppearanceMode(
    settingsStore.get(KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY)
  );

  return (
    <CmsStorefrontAppearanceProvider initialMode={defaultMode}>
      {children}
    </CmsStorefrontAppearanceProvider>
  );
}
