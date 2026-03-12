'use client';

import { useMemo } from 'react';

import {
  resolveKangurStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  KANGUR_THEME_SETTINGS_KEY,
  parseKangurThemeSettings,
} from '@/features/kangur/theme-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export const useKangurStorefrontAppearance = () => {
  const settingsStore = useSettingsStore();
  const appearance = useOptionalCmsStorefrontAppearance();
  const mode = appearance?.mode ?? 'default';
  const rawTheme = settingsStore.get(KANGUR_THEME_SETTINGS_KEY);
  const theme = useMemo(() => parseKangurThemeSettings(rawTheme), [rawTheme]);

  return useMemo(
    () => ({
      ...resolveKangurStorefrontAppearance(mode, theme),
      theme,
    }),
    [mode, theme]
  );
};
