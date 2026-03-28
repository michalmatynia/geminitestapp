'use client';

import { applyTransparency, mixCssColor } from '../CmsStorefrontAppearance.utils';

export type KangurAccentThemeInput = {
  start: string;
  end: string;
};

export type KangurAccentThemeName =
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'slate';

export const buildKangurAccentThemeVars = (args: {
  softCardBackground: string;
  softCardBorder: string;
  glassPanelBorder: string;
  textFieldBorder: string;
  toneText: string;
  pageMutedText: string;
  pageBackground: string;
  contrastText: string;
  isDark: boolean;
  accents: Record<KangurAccentThemeName, KangurAccentThemeInput>;
}): Record<string, string> =>
  Object.entries(args.accents).reduce<Record<string, string>>((vars, [name, accent]) => {
    vars[`--kangur-accent-${name}-border`] = mixCssColor(args.softCardBorder, accent.end, 58);
    vars[`--kangur-accent-${name}-surface-panel-border`] = mixCssColor(
      args.glassPanelBorder,
      accent.end,
      56
    );
    vars[`--kangur-accent-${name}-media-border`] = mixCssColor(args.softCardBorder, accent.end, 58);
    vars[`--kangur-accent-${name}-soft-surface-background`] = mixCssColor(
      args.softCardBackground,
      accent.start,
      92
    );
    vars[`--kangur-accent-${name}-soft-surface-border`] = mixCssColor(
      args.softCardBorder,
      accent.end,
      58
    );
    vars[`--kangur-accent-${name}-soft-fill`] = mixCssColor(
      args.softCardBackground,
      accent.start,
      args.isDark ? 82 : 88
    );
    vars[`--kangur-accent-${name}-solid-fill`] = mixCssColor(
      accent.end,
      args.pageBackground,
      args.isDark ? 72 : 82
    );
    vars[`--kangur-accent-${name}-text`] = mixCssColor(
      args.toneText,
      accent.end,
      args.isDark ? 74 : 68
    );
    vars[`--kangur-accent-${name}-muted-text`] = mixCssColor(
      args.pageMutedText,
      accent.end,
      args.isDark ? 78 : 72
    );
    vars[`--kangur-accent-${name}-contrast-text`] = args.contrastText;
    vars[`--kangur-accent-${name}-soft-surface-shadow`] = `0 18px 40px -32px ${applyTransparency(
      accent.end,
      args.isDark ? 0.4 : 0.35
    )}`;
    vars[`--kangur-accent-${name}-focus-border`] = mixCssColor(
      args.textFieldBorder,
      accent.end,
      48
    );
    vars[`--kangur-accent-${name}-focus-ring`] = applyTransparency(
      accent.end,
      args.isDark ? 0.32 : 0.26
    );
    return vars;
  }, {});
