import type { CmsTheme } from '@/shared/contracts/cms';
import type { ColorSchemeColors, ThemeSettings } from '@/shared/contracts/cms-theme';

export const parseCssNumber = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeAiString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const parseColorSchemePayload = (
  payload: unknown
): { name?: string; colors: Partial<ColorSchemeColors> } | null => {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const name = normalizeAiString(raw['name']);
  const colorsSource = raw['colors'] as Record<string, unknown>;

  if (!colorsSource || typeof colorsSource !== 'object') return null;

  const colors = colorsSource;
  const parsedRaw = {
    background: normalizeAiString(colors['background']),
    surface: normalizeAiString(colors['surface']),
    text: normalizeAiString(colors['text']),
    accent: normalizeAiString(colors['accent']),
    border: normalizeAiString(colors['border']),
  };
  const parsed: Partial<ColorSchemeColors> = {};
  (Object.entries(parsedRaw) as Array<[keyof ColorSchemeColors, string | undefined]>).forEach(
    ([key, val]: [keyof ColorSchemeColors, string | undefined]) => {
      if (val !== undefined) {
        parsed[key] = val;
      }
    }
  );

  if (!Object.values(parsed).some(Boolean) && !name) return null;
  return { ...(name ? { name } : {}), colors: parsed };
};

export const parseColorSchemeFromText = (
  text: string
): { name?: string; colors: Partial<ColorSchemeColors> } | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const payload = JSON.parse(trimmed) as unknown;
    return parseColorSchemePayload(payload);
  } catch {
    return null;
  }
};

export const applySavedThemePreset = (
  current: ThemeSettings,
  saved: CmsTheme,
  presetValue: string
): ThemeSettings => {
  const next = { ...current, themePreset: presetValue };

  const colors = saved.colors;
  if (colors) {
    if (colors.primary) next.primaryColor = colors.primary;
    if (colors.secondary) next.secondaryColor = colors.secondary;
    if (colors.accent) next.accentColor = colors.accent;
    if (colors.background) next.backgroundColor = colors.background;
    if (colors.surface) next.surfaceColor = colors.surface;
    if (colors.text) next.textColor = colors.text;
    if (colors.muted) next.mutedTextColor = colors.muted;
  }

  const typography = saved.typography;
  if (typography) {
    if (typography.headingFont) next.headingFont = typography.headingFont;
    if (typography.bodyFont) next.bodyFont = typography.bodyFont;
    if (Number.isFinite(typography.baseSize)) next.baseSize = typography.baseSize;
    if (Number.isFinite(typography.headingWeight))
      next.headingWeight = String(typography.headingWeight);
    if (Number.isFinite(typography.bodyWeight)) next.bodyWeight = String(typography.bodyWeight);
  }

  const spacing = saved.spacing;
  if (spacing) {
    const sectionSpacing = parseCssNumber(spacing.sectionPadding);
    if (sectionSpacing !== null) next.sectionSpacing = sectionSpacing;
    const maxWidth = parseCssNumber(spacing.containerMaxWidth);
    if (maxWidth !== null) next.maxContentWidth = maxWidth;
  }

  if (typeof saved.customCss === 'string') {
    next.customCss = saved.customCss;
  }

  return next;
};

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.innerHTML;
}
