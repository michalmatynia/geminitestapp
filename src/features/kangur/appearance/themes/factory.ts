import { DEFAULT_THEME, normalizeThemeSettings, type ThemeSettings } from '@/shared/contracts/cms-theme';
import { KANGUR_DAWN_THEME } from './dawn';
import { KANGUR_SUNSET_THEME } from './sunset';

/**
 * Factory theme baseline — matches commit dda089a3c2c6956952afc10aac328dd42c65b6a4.
 * The Kangur defaults were the CMS DEFAULT_THEME with dark mode enabled.
 */
export const KANGUR_FACTORY_THEME: ThemeSettings = normalizeThemeSettings({
  ...DEFAULT_THEME,
  darkMode: true,
});

/** Factory daily theme (commit dda089a...). */
export const KANGUR_FACTORY_DAILY_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_FACTORY_THEME,
});

/** Factory dawn theme — baseline for the dawn slot. */
export const KANGUR_FACTORY_DAWN_THEME: ThemeSettings = KANGUR_DAWN_THEME;

/** Factory sunset theme — baseline for the sunset slot. */
export const KANGUR_FACTORY_SUNSET_THEME: ThemeSettings = KANGUR_SUNSET_THEME;

/** Factory nightly theme (commit dda089a...). */
export const KANGUR_FACTORY_NIGHTLY_THEME: ThemeSettings = normalizeThemeSettings({
  ...KANGUR_FACTORY_THEME,
});
