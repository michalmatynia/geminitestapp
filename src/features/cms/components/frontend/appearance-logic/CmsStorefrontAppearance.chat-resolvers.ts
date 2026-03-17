import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { resolveCardPadding } from './CmsStorefrontAppearance.theme-resolvers';

export const resolveChatRadius = (theme: ThemeSettings) => ({
  bubble: Math.max(theme.cardRadius - 4, 18),
  card: Math.max(theme.cardRadius - 4, 18),
  inset: Math.max(theme.cardRadius - 6, 16),
});

export const resolveChatPanelRadius = (theme: ThemeSettings) => ({
  minimal: Math.max(theme.cardRadius + 2, 24),
  compact: Math.max(theme.cardRadius - 2, 20),
  spotlightSm: Math.max(theme.cardRadius - 8, 16),
  spotlightMd: Math.max(theme.cardRadius - 4, 18),
});

export const resolveChatPadding = (theme: ThemeSettings) => {
  const cardPadding = resolveCardPadding(theme);

  return {
    xSm: cardPadding.sm,
    ySm: Math.max(cardPadding.sm - 4, 8),
    xMd: cardPadding.sm,
    yMd: Math.max(cardPadding.sm, 12),
    xLg: cardPadding.md,
    yLg: Math.max(cardPadding.sm, 12),
  };
};

export const resolveChatHeaderPadding = (theme: ThemeSettings) => {
  const chatPadding = resolveChatPadding(theme);

  return {
    xSm: chatPadding.xSm,
    ySm: Math.max(chatPadding.ySm + 2, 10),
    xMd: Math.max(chatPadding.xMd, 16),
    yMd: Math.max(chatPadding.yMd - 2, 12),
    xLg: Math.max(chatPadding.xLg, 20),
    yLg: Math.max(chatPadding.yLg, 16),
  };
};
