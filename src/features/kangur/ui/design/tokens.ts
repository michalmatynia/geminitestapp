import { cn } from '@/shared/utils';

export type KangurPageTone = 'play' | 'learn' | 'profile' | 'dashboard';

export const KANGUR_PAGE_TONE_CLASSNAMES: Record<KangurPageTone, string> = {
  play: 'min-h-screen kangur-premium-bg',
  learn: 'min-h-screen kangur-premium-bg',
  profile: 'min-h-screen kangur-premium-bg',
  dashboard: 'min-h-screen kangur-premium-bg',
};

export const KANGUR_TOP_BAR_CLASSNAME =
  'sticky inset-x-0 top-0 z-40 w-full px-4 pb-2 pt-3 sm:px-6 sm:pb-3 sm:pt-5';
export const KANGUR_TOP_BAR_INNER_CLASSNAME =
  'flex w-full flex-wrap items-center gap-4 sm:flex-nowrap';
export const KANGUR_PAGE_CONTAINER_CLASSNAME =
  'w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 xl:px-10';

export const KANGUR_PANEL_CLASSNAMES = {
  elevated: 'glass-panel rounded-[36px]',
  soft: 'glass-panel rounded-[34px]',
  subtle: 'soft-card rounded-[26px]',
} as const;

export const KANGUR_TOP_NAV_GROUP_CLASSNAME =
  'kangur-nav-group flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 rounded-[30px] border p-2 sm:flex-nowrap';

export const KANGUR_TOP_NAV_ITEM_CLASSNAME =
  'kangur-nav-item group relative inline-flex min-w-0 items-center justify-center gap-2 rounded-[20px] border font-semibold tracking-[-0.02em] transition-all duration-200';

export const KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME = 'kangur-nav-item-active';

export const KANGUR_SEGMENTED_CONTROL_CLASSNAME =
  'kangur-segmented-control flex w-full items-center gap-1.5 rounded-[28px] border p-1.5';

export const KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME =
  'kangur-segmented-control-item group relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] border font-semibold tracking-[-0.02em] transition-all duration-200';

export const KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME =
  'kangur-segmented-control-item-active';

export type KangurAccent =
  | 'indigo'
  | 'violet'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'slate';

type KangurAccentStyles = {
  icon: string;
  badge: string;
  activeCard: string;
  hoverCard: string;
  activeText: string;
  mutedText: string;
};

const buildAccentStyles = ({
  accentColor,
  accentSurface,
  glow,
}: {
  accentColor: string;
  accentSurface: string;
  glow: string;
}): KangurAccentStyles => ({
  icon: cn(
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,${accentSurface})]`,
    `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${accentColor})]`
  ),
  badge: cn(
    `[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,${accentSurface})]`,
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,${accentSurface})]`,
    `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${accentColor})]`
  ),
  activeCard: cn(
    `[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,${accentSurface})]`,
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,${accentSurface})]`,
    `shadow-[0_24px_60px_-42px_${glow}]`
  ),
  hoverCard: cn(
    `hover:[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_54%,${accentSurface})]`,
    `hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,${accentSurface})]`
  ),
  activeText: `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${accentColor})]`,
  mutedText: `[color:color-mix(in_srgb,var(--kangur-page-text)_54%,${accentColor})]`,
});

export const KANGUR_ACCENT_STYLES: Record<KangurAccent, KangurAccentStyles> = {
  indigo: buildAccentStyles({
    accentColor: 'rgb(79_70_229)',
    accentSurface: 'rgb(224_231_255)',
    glow: 'rgba(99,102,241,0.38)',
  }),
  violet: buildAccentStyles({
    accentColor: 'rgb(124_58_237)',
    accentSurface: 'rgb(237_233_254)',
    glow: 'rgba(139,92,246,0.34)',
  }),
  emerald: buildAccentStyles({
    accentColor: 'rgb(4_120_87)',
    accentSurface: 'rgb(209_250_229)',
    glow: 'rgba(16,185,129,0.3)',
  }),
  sky: buildAccentStyles({
    accentColor: 'rgb(3_105_161)',
    accentSurface: 'rgb(224_242_254)',
    glow: 'rgba(14,165,233,0.3)',
  }),
  amber: buildAccentStyles({
    accentColor: 'rgb(180_83_9)',
    accentSurface: 'rgb(254_243_199)',
    glow: 'rgba(245,158,11,0.3)',
  }),
  rose: buildAccentStyles({
    accentColor: 'rgb(190_24_93)',
    accentSurface: 'rgb(255_228_230)',
    glow: 'rgba(244,63,94,0.28)',
  }),
  teal: buildAccentStyles({
    accentColor: 'rgb(15_118_110)',
    accentSurface: 'rgb(204_251_241)',
    glow: 'rgba(20,184,166,0.3)',
  }),
  slate: buildAccentStyles({
    accentColor: 'rgb(71_85_105)',
    accentSurface: 'rgb(226_232_240)',
    glow: 'rgba(15,23,42,0.24)',
  }),
};

export const KANGUR_SURFACE_CARD_CLASSNAME =
  'soft-card w-full rounded-[26px] border text-left transition duration-200';

export const KANGUR_OPTION_CARD_CLASSNAME = `${KANGUR_SURFACE_CARD_CLASSNAME} group p-4 hover:-translate-y-[1px]`;

export const KANGUR_STEP_PILL_CLASSNAME =
  'kangur-cta-pill inline-flex items-center justify-center rounded-full border border-transparent transition-all duration-200';

export const KANGUR_PENDING_STEP_PILL_CLASSNAME = 'kangur-step-pill-pending w-[14px]';
