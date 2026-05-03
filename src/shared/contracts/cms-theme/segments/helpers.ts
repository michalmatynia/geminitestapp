import { type ColorScheme, type ColorSchemeColors } from './base';
import { type ThemeSettings, themeSettingsSchema } from './main';
import { DEFAULT_THEME } from './defaults';

export function normalizeThemeSettings(
  input?: Partial<ThemeSettings> | null,
  baseTheme: ThemeSettings = DEFAULT_THEME
): ThemeSettings {
  const exact = themeSettingsSchema.safeParse(input);
  if (exact.success) {
    return exact.data;
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) return baseTheme;

  const merged = {
    ...baseTheme,
    ...input,
    clockTheme:
      input.clockTheme && typeof input.clockTheme === 'object' && !Array.isArray(input.clockTheme)
        ? {
            ...baseTheme.clockTheme,
            ...input.clockTheme,
          }
        : baseTheme.clockTheme,
  };
  const mergedResult = themeSettingsSchema.safeParse(merged);
  if (mergedResult.success) return mergedResult.data;

  return baseTheme;
}

export function buildColorSchemeMap(
  input: ThemeSettings | ColorScheme[]
): Record<string, ColorSchemeColors> {
  const schemes = Array.isArray(input) ? input : input.colorSchemes;
  const map: Record<string, ColorSchemeColors> = {};
  schemes.forEach((s) => {
    map[s.id] = s.colors;
  });
  return map;
}
