'use client';

import { useMemo } from 'react';

import {
  resolveKangurStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  resolveKangurThemeSettingsRawForMode,
  parseKangurThemeSettings,
  resolveKangurDefaultThemeForMode,
} from '@/features/kangur/theme-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { useKangurStorefrontInitialThemeSettings } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

export const useKangurStorefrontAppearance = () => {
  const settingsStore = useSettingsStore();
  const appearance = useOptionalCmsStorefrontAppearance();
  const initialThemeSettings = useKangurStorefrontInitialThemeSettings();
  const mode = appearance?.mode ?? 'default';
  const dailyThemeRaw =
    settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('default')) ??
    initialThemeSettings.default;
  const dawnThemeRaw =
    settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dawn')) ??
    initialThemeSettings.dawn;
  const sunsetThemeRaw =
    settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('sunset')) ??
    initialThemeSettings.sunset;
  const nightlyThemeRaw =
    settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dark')) ??
    initialThemeSettings.dark;
  const rawTheme = resolveKangurThemeSettingsRawForMode({
    mode,
    dailyThemeRaw,
    dawnThemeRaw,
    sunsetThemeRaw,
    nightlyThemeRaw,
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
