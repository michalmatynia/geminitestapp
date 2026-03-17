'use client';

import { useMemo } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import { resolveKangurStorefrontAppearance } from '@/features/cms/components/frontend/CmsStorefrontAppearance.logic';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  resolveKangurThemeSettingsRawForMode,
  KANGUR_THEME_SETTINGS_KEY,
  parseKangurThemeSettings,
  resolveKangurDefaultThemeForMode,
} from '@/features/kangur/theme-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

export const useKangurStorefrontAppearance = () => {
  const settingsStore = useSettingsStore();
  const appearance = useOptionalCmsStorefrontAppearance();
  const mode = appearance?.mode ?? 'default';
  const rawTheme = resolveKangurThemeSettingsRawForMode({
    mode,
    dailyThemeRaw: settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('default')),
    dawnThemeRaw: settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dawn')),
    sunsetThemeRaw: settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('sunset')),
    nightlyThemeRaw: settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dark')),
    legacyThemeRaw: settingsStore.get(KANGUR_THEME_SETTINGS_KEY),
  });
  const fallbackTheme = useMemo(() => resolveKangurDefaultThemeForMode(mode), [mode]);
  const theme = useMemo(
    () => parseKangurThemeSettings(rawTheme, fallbackTheme) ?? fallbackTheme,
    [fallbackTheme, rawTheme]
  );

  return useMemo(
    () => ({
      ...resolveKangurStorefrontAppearance(mode, theme),
      theme,
    }),
    [mode, theme]
  );
};
