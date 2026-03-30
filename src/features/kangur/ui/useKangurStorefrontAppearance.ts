'use client';

import { useMemo } from 'react';

import {
  resolveKangurStorefrontAppearance,
} from '@/features/cms/public';
import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  getKangurThemeSettingsKeyForAppearanceMode,
  resolveKangurStoredThemeForAppearanceMode,
} from '@/features/kangur/appearance/theme-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import {
  useKangurStorefrontAppearanceHydrated,
  useKangurStorefrontInitialThemeSettings,
} from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

const readHydratedThemeSetting = ({
  hydrated,
  initialValue,
  mode,
  settingsStore,
}: {
  hydrated: boolean;
  initialValue: string | null | undefined;
  mode: 'default' | 'dawn' | 'sunset' | 'dark';
  settingsStore: ReturnType<typeof useSettingsStore>;
}): string | null | undefined =>
  (hydrated ? settingsStore.get(getKangurThemeSettingsKeyForAppearanceMode(mode)) : null) ??
  initialValue;

export const useKangurStorefrontAppearance = () => {
  const settingsStore = useSettingsStore();
  const appearance = useOptionalCmsStorefrontAppearance();
  const hydrated = useKangurStorefrontAppearanceHydrated();
  const initialThemeSettings = useKangurStorefrontInitialThemeSettings();
  const mode = appearance?.mode ?? 'default';
  const dailyThemeRaw = readHydratedThemeSetting({
    hydrated,
    initialValue: initialThemeSettings.default,
    mode: 'default',
    settingsStore,
  });
  const dawnThemeRaw = readHydratedThemeSetting({
    hydrated,
    initialValue: initialThemeSettings.dawn,
    mode: 'dawn',
    settingsStore,
  });
  const sunsetThemeRaw = readHydratedThemeSetting({
    hydrated,
    initialValue: initialThemeSettings.sunset,
    mode: 'sunset',
    settingsStore,
  });
  const nightlyThemeRaw = readHydratedThemeSetting({
    hydrated,
    initialValue: initialThemeSettings.dark,
    mode: 'dark',
    settingsStore,
  });
  const theme = useMemo(
    () =>
      resolveKangurStoredThemeForAppearanceMode({
        mode,
        dailyThemeRaw,
        dawnThemeRaw,
        sunsetThemeRaw,
        nightlyThemeRaw,
      }),
    [dailyThemeRaw, dawnThemeRaw, mode, nightlyThemeRaw, sunsetThemeRaw]
  );
  const resolvedAppearance = useMemo(
    () => resolveKangurStorefrontAppearance(mode, theme),
    [mode, theme]
  );

  return useMemo(
    () => ({
      ...resolvedAppearance,
      theme,
    }),
    [resolvedAppearance, theme]
  );
};
