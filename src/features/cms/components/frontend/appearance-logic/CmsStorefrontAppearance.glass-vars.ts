import { applyTransparency, mixCssColor } from '../CmsStorefrontAppearance.utils';
import type { KangurAccentThemeInput, KangurAccentThemeName } from './CmsStorefrontAppearance.accent-vars';

export const buildKangurGlassSurfaceThemeVars = (args: {
  softCardBackground: string;
  softCardBorder: string;
  glassPanelBorder: string;
  glassPanelShadow: string;
  pageBackground: string;
  accents: Record<KangurAccentThemeName, KangurAccentThemeInput>;
}): Record<string, string> => ({
  '--kangur-glass-surface-mist-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.pageBackground,
    78
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 62)} 100%)`,
  '--kangur-glass-surface-mist-border': mixCssColor(args.glassPanelBorder, args.pageBackground, 94),
  '--kangur-glass-surface-mist-soft-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.pageBackground,
    64
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 48)} 100%)`,
  '--kangur-glass-surface-mist-soft-border': mixCssColor(
    args.glassPanelBorder,
    args.pageBackground,
    88
  ),
  '--kangur-glass-surface-mist-strong-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.pageBackground,
    86
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 74)} 100%)`,
  '--kangur-glass-surface-mist-strong-border': mixCssColor(
    args.glassPanelBorder,
    args.pageBackground,
    96
  ),
  '--kangur-glass-surface-frost-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.pageBackground,
    94
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 88)} 100%)`,
  '--kangur-glass-surface-frost-border': mixCssColor(args.softCardBorder, args.pageBackground, 92),
  '--kangur-glass-surface-solid-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    'transparent',
    98
  )} 0%, ${args.softCardBackground} 100%)`,
  '--kangur-glass-surface-solid-border': mixCssColor(args.softCardBorder, args.pageBackground, 96),
  '--kangur-glass-surface-neutral-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.pageBackground,
    94
  )} 0%, ${args.softCardBackground} 100%)`,
  '--kangur-glass-surface-neutral-border': args.softCardBorder,
  '--kangur-glass-surface-rose-background': `radial-gradient(circle at top, ${mixCssColor(
    args.softCardBackground,
    args.accents['rose'].start,
    84
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 94)} 44%, ${mixCssColor(
    args.softCardBackground,
    args.accents['rose'].end,
    86
  )} 100%)`,
  '--kangur-glass-surface-rose-border': mixCssColor(
    args.softCardBorder,
    args.accents['rose'].end,
    58
  ),
  '--kangur-glass-surface-warm-glow-background': `radial-gradient(circle at top, ${mixCssColor(
    args.softCardBackground,
    args.accents['amber'].start,
    82
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 94)} 42%, ${mixCssColor(
    args.softCardBackground,
    args.accents['amber'].end,
    84
  )} 100%)`,
  '--kangur-glass-surface-warm-glow-border': mixCssColor(
    args.softCardBorder,
    args.accents['amber'].end,
    56
  ),
  '--kangur-glass-surface-success-glow-background': `radial-gradient(circle at top, ${mixCssColor(
    args.softCardBackground,
    args.accents['emerald'].start,
    82
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 94)} 44%, ${mixCssColor(
    args.softCardBackground,
    args.accents['emerald'].end,
    84
  )} 100%)`,
  '--kangur-glass-surface-success-glow-border': mixCssColor(
    args.softCardBorder,
    args.accents['emerald'].end,
    56
  ),
  '--kangur-glass-surface-play-glow-background': `radial-gradient(circle at top, ${mixCssColor(
    args.softCardBackground,
    args.accents['indigo'].start,
    82
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 96)} 42%, ${mixCssColor(
    args.softCardBackground,
    args.accents['indigo'].end,
    84
  )} 100%)`,
  '--kangur-glass-surface-play-glow-border': mixCssColor(
    args.softCardBorder,
    args.accents['indigo'].end,
    56
  ),
  '--kangur-glass-surface-play-field-background': `radial-gradient(circle at top, ${mixCssColor(
    args.softCardBackground,
    'transparent',
    96
  )} 0%, ${mixCssColor(args.softCardBackground, args.accents['indigo'].start, 88)} 58%, ${mixCssColor(
    args.softCardBackground,
    args.accents['amber'].start,
    84
  )} 100%)`,
  '--kangur-glass-surface-play-field-border': mixCssColor(
    args.softCardBorder,
    args.accents['indigo'].end,
    76
  ),
  '--kangur-glass-surface-play-field-shadow': `inset 0 1px 0 ${mixCssColor(
    args.softCardBackground,
    'transparent',
    72
  )}, ${args.glassPanelShadow}`,
  '--kangur-glass-surface-teal-field-background': `linear-gradient(180deg, ${mixCssColor(
    args.softCardBackground,
    args.accents['teal'].start,
    92
  )} 0%, ${mixCssColor(args.softCardBackground, args.pageBackground, 88)} 100%)`,
  '--kangur-glass-surface-teal-field-border': mixCssColor(
    args.softCardBorder,
    args.accents['teal'].end,
    72
  ),
  '--kangur-glass-surface-teal-field-shadow': `0 14px 34px -26px ${applyTransparency(
    args.accents['teal'].end,
    0.34
  )}`,
});
