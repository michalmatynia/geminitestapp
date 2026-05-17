'use client';

import { useMemo } from 'react';

import {
  resolveKangurStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import {
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_DAWN_THEME,
  KANGUR_DEFAULT_SUNSET_THEME,
  KANGUR_DEFAULT_THEME,
  getKangurThemeSettingsKeyForAppearanceMode,
  parseKangurThemeSettings,
  resolveKangurThemeSettingsRawForMode,
  resolveKangurStoredThemeForAppearanceMode,
} from '@/features/kangur/appearance/theme-settings';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import {
  useKangurStorefrontAppearanceHydrated,
  useKangurStorefrontInitialThemeSettings,
} from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';

type KangurStorefrontAppearanceMode = 'default' | 'dawn' | 'sunset' | 'dark';

const KANGUR_FALLBACK_THEME_BASELINES_BY_MODE: Record<
  KangurStorefrontAppearanceMode,
  ThemeSettings
> = {
  default: KANGUR_DEFAULT_DAILY_THEME,
  dawn: KANGUR_DEFAULT_DAWN_THEME,
  sunset: KANGUR_DEFAULT_SUNSET_THEME,
  dark: KANGUR_DEFAULT_THEME,
};

const KANGUR_FALLBACK_THEME_SIGNATURES_BY_MODE: Record<
  KangurStorefrontAppearanceMode,
  string
> = {
  default: serializeSetting(KANGUR_DEFAULT_DAILY_THEME),
  dawn: serializeSetting(KANGUR_DEFAULT_DAWN_THEME),
  sunset: serializeSetting(KANGUR_DEFAULT_SUNSET_THEME),
  dark: serializeSetting(KANGUR_DEFAULT_THEME),
};

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

type KangurStorefrontAppearance = ReturnType<typeof resolveKangurStorefrontAppearance> & {
  isFallbackTheme: boolean;
  theme: ReturnType<typeof resolveKangurStoredThemeForAppearanceMode>;
};

const resolveKangurThemeRawSignature = ({
  mode,
  raw,
}: {
  mode: KangurStorefrontAppearanceMode;
  raw: string | null | undefined;
}): string | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  const theme = parseKangurThemeSettings(
    raw,
    KANGUR_FALLBACK_THEME_BASELINES_BY_MODE[mode]
  );

  return theme ? serializeSetting(theme) : null;
};

const resolveKangurStorefrontIsFallbackTheme = ({
  mode,
  selectedThemeRaw,
}: {
  mode: KangurStorefrontAppearanceMode;
  selectedThemeRaw: string | null;
}): boolean => {
  const signature = resolveKangurThemeRawSignature({
    mode,
    raw: selectedThemeRaw,
  });

  return (
    signature === null ||
    signature === KANGUR_FALLBACK_THEME_SIGNATURES_BY_MODE[mode]
  );
};

export const useKangurStorefrontAppearance = (): KangurStorefrontAppearance => {
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
  const selectedThemeRaw = useMemo(
    () =>
      resolveKangurThemeSettingsRawForMode({
        mode,
        dailyThemeRaw,
        dawnThemeRaw,
        sunsetThemeRaw,
        nightlyThemeRaw,
      }),
    [dailyThemeRaw, dawnThemeRaw, mode, nightlyThemeRaw, sunsetThemeRaw]
  );
  const isFallbackTheme = useMemo(
    () =>
      resolveKangurStorefrontIsFallbackTheme({
        mode,
        selectedThemeRaw,
      }),
    [mode, selectedThemeRaw]
  );
  const resolvedAppearance = useMemo(
    () => resolveKangurStorefrontAppearance(mode, theme),
    [mode, theme]
  );

  return useMemo(
    () => ({
      ...resolvedAppearance,
      isFallbackTheme,
      theme,
    }),
    [isFallbackTheme, resolvedAppearance, theme]
  );
};
