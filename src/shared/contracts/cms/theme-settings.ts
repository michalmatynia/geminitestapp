import { z } from 'zod';
import { namedDtoSchema } from '../base';

export const CMS_THEME_SETTINGS_KEY = 'cms_theme_settings.v1';

export const colorSchemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    muted: z.string(),
  }),
});

export type ColorScheme = z.infer<typeof colorSchemeSchema>;

export const themeSettingsSchema = z.object({
  colorSchemes: z.array(colorSchemeSchema),
  defaultSchemeId: z.string().nullable(),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
    baseSize: z.number(),
  }),
  spacing: z.object({
    containerMaxWidth: z.string(),
  }),
});

export type ThemeSettings = z.infer<typeof themeSettingsSchema> & {
  hoverEffect?: 'none' | 'glow' | 'outline' | 'shadow' | 'lift';
  hoverScale?: number;
  activeScale?: number;
  transitionDuration?: number;
  borderRadius?: number;
  fullWidth?: boolean;
  enableAnimations?: boolean;
  socialFacebook?: string | null;
  socialInstagram?: string | null;
  socialYoutube?: string | null;
  socialTiktok?: string | null;
  socialTwitter?: string | null;
  socialSnapchat?: string | null;
  socialPinterest?: string | null;
  socialTumblr?: string | null;
  socialVimeo?: string | null;
  socialLinkedin?: string | null;
};

export const DEFAULT_THEME: ThemeSettings = {
  colorSchemes: [],
  defaultSchemeId: null,
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
  },
  spacing: {
    containerMaxWidth: '1200px',
  },
  hoverEffect: 'none',
  hoverScale: 1.02,
  activeScale: 0.98,
  transitionDuration: 0.2,
  borderRadius: 8,
  fullWidth: false,
  enableAnimations: true,
  socialFacebook: null,
  socialInstagram: null,
  socialYoutube: null,
  socialTiktok: null,
  socialTwitter: null,
  socialSnapchat: null,
  socialPinterest: null,
  socialTumblr: null,
  socialVimeo: null,
  socialLinkedin: null,
};

export function normalizeThemeSettings(input: unknown): ThemeSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as any;
    return {
      colorSchemes: Array.isArray(record.colorSchemes) ? record.colorSchemes : [],
      defaultSchemeId: typeof record.defaultSchemeId === 'string' ? record.defaultSchemeId : null,
      typography: record.typography || DEFAULT_THEME.typography,
      spacing: record.spacing || DEFAULT_THEME.spacing,
      hoverEffect: record.hoverEffect || DEFAULT_THEME.hoverEffect,
      hoverScale: typeof record.hoverScale === 'number' ? record.hoverScale : DEFAULT_THEME.hoverScale,
      activeScale: typeof record.activeScale === 'number' ? record.activeScale : DEFAULT_THEME.activeScale,
      transitionDuration: typeof record.transitionDuration === 'number' ? record.transitionDuration : DEFAULT_THEME.transitionDuration,
      borderRadius: typeof record.borderRadius === 'number' ? record.borderRadius : DEFAULT_THEME.borderRadius,
      fullWidth: typeof record.fullWidth === 'boolean' ? record.fullWidth : DEFAULT_THEME.fullWidth,
      enableAnimations: typeof record.enableAnimations === 'boolean' ? record.enableAnimations : DEFAULT_THEME.enableAnimations,
      socialFacebook: typeof record.socialFacebook === 'string' ? record.socialFacebook : DEFAULT_THEME.socialFacebook,
      socialInstagram: typeof record.socialInstagram === 'string' ? record.socialInstagram : DEFAULT_THEME.socialInstagram,
      socialYoutube: typeof record.socialYoutube === 'string' ? record.socialYoutube : DEFAULT_THEME.socialYoutube,
      socialTiktok: typeof record.socialTiktok === 'string' ? record.socialTiktok : DEFAULT_THEME.socialTiktok,
      socialTwitter: typeof record.socialTwitter === 'string' ? record.socialTwitter : DEFAULT_THEME.socialTwitter,
      socialSnapchat: typeof record.socialSnapchat === 'string' ? record.socialSnapchat : DEFAULT_THEME.socialSnapchat,
      socialPinterest: typeof record.socialPinterest === 'string' ? record.socialPinterest : DEFAULT_THEME.socialPinterest,
      socialTumblr: typeof record.socialTumblr === 'string' ? record.socialTumblr : DEFAULT_THEME.socialTumblr,
      socialVimeo: typeof record.socialVimeo === 'string' ? record.socialVimeo : DEFAULT_THEME.socialVimeo,
      socialLinkedin: typeof record.socialLinkedin === 'string' ? record.socialLinkedin : DEFAULT_THEME.socialLinkedin,
    };
  }
  return DEFAULT_THEME;
}

export function buildColorSchemeMap(input: ThemeSettings | ColorScheme[]): Record<string, ColorScheme> {
  const schemes = Array.isArray(input) ? input : input.colorSchemes;
  const map: Record<string, ColorScheme> = {};
  schemes.forEach((s) => {
    map[s.id] = s;
  });
  return map;
}
