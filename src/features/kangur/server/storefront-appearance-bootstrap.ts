import 'server-only';

import { resolveKangurStorefrontAppearance } from '@/features/cms/components/frontend/CmsStorefrontAppearance.logic';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';
import {
  parseKangurThemeSettings,
  resolveKangurDefaultThemeForMode,
  resolveKangurThemeSettingsRawForMode,
} from '@/features/kangur/theme-settings';

const KANGUR_SURFACE_BOOTSTRAP_SELECTORS = [
  'html.kangur-surface-active',
  'body.kangur-surface-active',
  '#app-content.kangur-surface-active',
].join(',\n');

const EMPTY_THEME_SETTINGS: KangurStorefrontThemeSettingsSnapshot = {
  default: null,
  dawn: null,
  sunset: null,
  dark: null,
};

export const KANGUR_SURFACE_HINT_SCRIPT =
  'document.documentElement.classList.add(\'kangur-surface-active\');document.body.classList.add(\'kangur-surface-active\');';

export type KangurSurfaceBootstrapAppearanceInput = {
  mode?: KangurStorefrontAppearanceMode;
  themeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
};

const normalizeThemeSettingsSnapshot = (
  snapshot?: Partial<KangurStorefrontThemeSettingsSnapshot>
): KangurStorefrontThemeSettingsSnapshot => ({
  default: snapshot?.default ?? EMPTY_THEME_SETTINGS.default,
  dawn: snapshot?.dawn ?? EMPTY_THEME_SETTINGS.dawn,
  sunset: snapshot?.sunset ?? EMPTY_THEME_SETTINGS.sunset,
  dark: snapshot?.dark ?? EMPTY_THEME_SETTINGS.dark,
});

const serializeCssDeclarations = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join('');

const escapeInlineCssText = (css: string): string => css.replaceAll('<', '\\3C ');

export const getKangurSurfaceBootstrapStyle = (
  initialAppearance?: KangurSurfaceBootstrapAppearanceInput
): string => {
  const mode = initialAppearance?.mode ?? 'default';
  const themeSettings = normalizeThemeSettingsSnapshot(initialAppearance?.themeSettings);
  const fallbackTheme = resolveKangurDefaultThemeForMode(mode);
  const rawTheme = resolveKangurThemeSettingsRawForMode({
    mode,
    dailyThemeRaw: themeSettings.default,
    dawnThemeRaw: themeSettings.dawn,
    sunsetThemeRaw: themeSettings.sunset,
    nightlyThemeRaw: themeSettings.dark,
  });
  const theme = parseKangurThemeSettings(rawTheme, fallbackTheme) ?? fallbackTheme;
  const appearance = resolveKangurStorefrontAppearance(mode, theme);

  return escapeInlineCssText(
    `${KANGUR_SURFACE_BOOTSTRAP_SELECTORS}{${serializeCssDeclarations({
      background: appearance.background,
      ...appearance.vars,
    })}}`
  );
};
