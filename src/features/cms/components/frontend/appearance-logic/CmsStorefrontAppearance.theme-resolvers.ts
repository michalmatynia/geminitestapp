import type { ThemeSettings } from '@/shared/contracts/cms-theme';

export const resolvePagePadding = (theme: ThemeSettings) => {
  const basePadding = theme.pagePadding;

  return {
    top: theme.pagePaddingTop ?? basePadding,
    right: theme.pagePaddingRight ?? basePadding,
    bottom: theme.pagePaddingBottom ?? basePadding,
    left: theme.pagePaddingLeft ?? basePadding,
  };
};

export const resolveButtonHeight = (theme: ThemeSettings): number =>
  Math.max(theme.btnFontSize + theme.btnPaddingY * 2 + 16, 32);

export const resolvePanelPadding = (theme: ThemeSettings) => ({
  md: Math.max(theme.containerPaddingInner - 4, 12),
  lg: Math.max(theme.containerPaddingInner, 16),
  xl: Math.max(theme.containerPaddingInner + 8, 20),
});

export const resolveCardPadding = (theme: ThemeSettings) => ({
  sm: Math.max(theme.containerPaddingInner - 12, 8),
  md: Math.max(theme.containerPaddingInner - 8, 12),
  lg: Math.max(theme.containerPaddingInner - 4, 16),
  xl: Math.max(theme.containerPaddingInner, 20),
});

export const resolveStackGap = (theme: ThemeSettings) => ({
  sm: Math.max(Math.round(theme.gridGutter / 3), 8),
  md: Math.max(Math.round(theme.gridGutter * (2 / 3)), 12),
  lg: Math.max(Math.round(theme.gridGutter * (5 / 6)), 16),
});

export const resolveGradientIconTileRadius = (theme: ThemeSettings) => ({
  md: Math.max(theme.cardRadius - 10, 12),
  lg: Math.max(theme.cardRadius - 2, 20),
});
