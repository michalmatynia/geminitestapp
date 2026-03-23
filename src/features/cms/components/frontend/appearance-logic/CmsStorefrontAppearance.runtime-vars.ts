import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { toCssPx } from '../CmsStorefrontAppearance.utils';
import {
  resolveButtonHeight,
  resolveCardPadding,
  resolveGradientIconTileRadius,
  resolvePagePadding,
  resolvePanelPadding,
  resolveStackGap,
} from './CmsStorefrontAppearance.theme-resolvers';
import {
  resolveChatHeaderPadding,
  resolveChatPadding,
  resolveChatPanelRadius,
  resolveChatRadius,
} from './CmsStorefrontAppearance.chat-resolvers';

const resolveKangurNavGroupRadius = (theme: ThemeSettings): number =>
  Math.max(0, Math.min(theme.pillRadius + 10, theme.containerRadius + 8));

const resolveKangurNavItemRadius = (theme: ThemeSettings): number =>
  Math.max(0, Math.min(theme.pillRadius, theme.containerRadius + 6));

export const resolveKangurRuntimeThemeVars = (theme: ThemeSettings): Record<string, string> => {
  const pagePadding = resolvePagePadding(theme);
  const panelPadding = resolvePanelPadding(theme);
  const cardPadding = resolveCardPadding(theme);
  const gradientIconTileRadius = resolveGradientIconTileRadius(theme);
  const chatRadius = resolveChatRadius(theme);
  const chatPanelRadius = resolveChatPanelRadius(theme);
  const chatPadding = resolveChatPadding(theme);
  const chatHeaderPadding = resolveChatHeaderPadding(theme);
  const stackGap = resolveStackGap(theme);
  const navGroupRadius = resolveKangurNavGroupRadius(theme);
  const navItemRadius = resolveKangurNavItemRadius(theme);

  return {
    '--kangur-font-heading': theme.headingFont,
    '--kangur-font-body': theme.bodyFont,
    '--kangur-font-base-size': toCssPx(theme.baseSize),
    '--kangur-font-line-height': String(theme.lineHeight),
    '--kangur-font-heading-line-height': String(theme.headingLineHeight),
    '--kangur-page-max-width': toCssPx(theme.maxContentWidth),
    '--kangur-page-padding-top': toCssPx(pagePadding.top),
    '--kangur-page-padding-right': toCssPx(pagePadding.right),
    '--kangur-page-padding-bottom': toCssPx(pagePadding.bottom),
    '--kangur-page-padding-left': toCssPx(pagePadding.left),
    '--kangur-grid-gutter': toCssPx(theme.gridGutter),
    '--kangur-panel-radius-elevated': toCssPx(theme.containerRadius + 10),
    '--kangur-panel-radius-soft': toCssPx(theme.containerRadius + 8),
    '--kangur-panel-radius-subtle': toCssPx(theme.containerRadius),
    '--kangur-card-radius': toCssPx(theme.cardRadius),
    '--kangur-lesson-callout-radius': toCssPx(Math.max(theme.cardRadius - 2, 0)),
    '--kangur-lesson-inset-radius': toCssPx(Math.max(theme.cardRadius - 8, 0)),
    '--kangur-gradient-icon-tile-radius-md': toCssPx(gradientIconTileRadius.md),
    '--kangur-gradient-icon-tile-radius-lg': toCssPx(gradientIconTileRadius.lg),
    '--kangur-chat-bubble-radius': toCssPx(chatRadius.bubble),
    '--kangur-chat-card-radius': toCssPx(chatRadius.card),
    '--kangur-chat-inset-radius': toCssPx(chatRadius.inset),
    '--kangur-chat-panel-radius-minimal': toCssPx(chatPanelRadius.minimal),
    '--kangur-chat-panel-radius-compact': toCssPx(chatPanelRadius.compact),
    '--kangur-chat-spotlight-radius-sm': toCssPx(chatPanelRadius.spotlightSm),
    '--kangur-chat-spotlight-radius-md': toCssPx(chatPanelRadius.spotlightMd),
    '--kangur-chat-padding-x-sm': toCssPx(chatPadding.xSm),
    '--kangur-chat-padding-y-sm': toCssPx(chatPadding.ySm),
    '--kangur-chat-padding-x-md': toCssPx(chatPadding.xMd),
    '--kangur-chat-padding-y-md': toCssPx(chatPadding.yMd),
    '--kangur-chat-padding-x-lg': toCssPx(chatPadding.xLg),
    '--kangur-chat-padding-y-lg': toCssPx(chatPadding.yLg),
    '--kangur-chat-header-padding-x-sm': toCssPx(chatHeaderPadding.xSm),
    '--kangur-chat-header-padding-y-sm': toCssPx(chatHeaderPadding.ySm),
    '--kangur-chat-header-padding-x-md': toCssPx(chatHeaderPadding.xMd),
    '--kangur-chat-header-padding-y-md': toCssPx(chatHeaderPadding.yMd),
    '--kangur-chat-header-padding-x-lg': toCssPx(chatHeaderPadding.xLg),
    '--kangur-chat-header-padding-y-lg': toCssPx(chatHeaderPadding.yLg),
    '--kangur-panel-padding-md': toCssPx(panelPadding.md),
    '--kangur-panel-padding-lg': toCssPx(panelPadding.lg),
    '--kangur-panel-padding-xl': toCssPx(panelPadding.xl),
    '--kangur-card-padding-sm': toCssPx(cardPadding.sm),
    '--kangur-card-padding-md': toCssPx(cardPadding.md),
    '--kangur-card-padding-lg': toCssPx(cardPadding.lg),
    '--kangur-card-padding-xl': toCssPx(cardPadding.xl),
    '--kangur-media-padding-sm': toCssPx(cardPadding.sm),
    '--kangur-media-padding-md': toCssPx(cardPadding.md),
    '--kangur-stack-gap-sm': toCssPx(stackGap.sm),
    '--kangur-stack-gap-md': toCssPx(stackGap.md),
    '--kangur-stack-gap-lg': toCssPx(stackGap.lg),
    '--kangur-nav-group-radius': toCssPx(navGroupRadius),
    '--kangur-nav-item-radius': toCssPx(navItemRadius),
    '--kangur-segmented-control-radius': toCssPx(theme.pillRadius + 8),
    '--kangur-segmented-item-radius': toCssPx(Math.max(theme.pillRadius - 2, 0)),
    '--kangur-menu-item-radius': toCssPx(Math.max(theme.pillRadius - 4, 0)),
    '--kangur-pill-padding-x': toCssPx(theme.pillPaddingX),
    '--kangur-pill-padding-y': toCssPx(theme.pillPaddingY),
    '--kangur-pill-font-size': toCssPx(theme.pillFontSize),
    '--kangur-button-padding-x': toCssPx(theme.btnPaddingX),
    '--kangur-button-padding-y': toCssPx(theme.btnPaddingY),
    '--kangur-button-font-size': toCssPx(theme.btnFontSize),
    '--kangur-button-height': toCssPx(resolveButtonHeight(theme)),
    '--kangur-button-radius': toCssPx(theme.btnRadius),
    '--kangur-input-height': toCssPx(theme.inputHeight),
    '--kangur-input-radius': toCssPx(theme.inputRadius),
    '--kangur-input-font-size': toCssPx(theme.inputFontSize),
  };
};
