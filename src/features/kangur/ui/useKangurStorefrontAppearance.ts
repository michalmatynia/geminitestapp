'use client';

import { useMemo } from 'react';

import {
  resolveKangurStorefrontAppearance,
} from '@/features/cms/public';
import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  resolveKangurThemeSettingsRawForMode,
  parseKangurThemeSettings,
  resolveKangurDefaultThemeForMode,
} from '@/features/kangur/theme-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import {
  useKangurStorefrontAppearanceHydrated,
  useKangurStorefrontInitialThemeSettings,
} from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

export const useKangurStorefrontAppearance = () => {
  const settingsStore = useSettingsStore();
  const appearance = useOptionalCmsStorefrontAppearance();
  const hydrated = useKangurStorefrontAppearanceHydrated();
  const initialThemeSettings = useKangurStorefrontInitialThemeSettings();
  const mode = appearance?.mode ?? 'default';
  const dailyThemeRaw =
    (hydrated ? settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('default')) : null) ??
    initialThemeSettings.default;
  const dawnThemeRaw =
    (hydrated ? settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dawn')) : null) ??
    initialThemeSettings.dawn;
  const sunsetThemeRaw =
    (hydrated ? settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('sunset')) : null) ??
    initialThemeSettings.sunset;
  const nightlyThemeRaw =
    (hydrated ? settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode('dark')) : null) ??
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
