import { cn } from '@/features/kangur/shared/utils';
import type { KangurAccent } from '@/shared/contracts/kangur-theme';

export type { KangurAccent } from '@/shared/contracts/kangur-theme';

export type KangurPageTone = 'play' | 'learn' | 'profile' | 'dashboard';

export const KANGUR_PAGE_TONE_CLASSNAMES: Record<KangurPageTone, string> = {
  play: 'kangur-shell-viewport-height kangur-premium-bg',
  learn: 'kangur-shell-viewport-height kangur-premium-bg',
  profile: 'kangur-shell-viewport-height kangur-premium-bg',
  dashboard: 'kangur-shell-viewport-height kangur-premium-bg',
};

export const KANGUR_TOP_BAR_CLASSNAME =
  'kangur-top-bar sticky inset-x-0 top-0 z-40 w-full';
export const KANGUR_TOP_BAR_INNER_CLASSNAME =
  'flex w-full flex-col items-stretch kangur-panel-gap px-4 sm:px-6 lg:px-8 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap';
export const KANGUR_TOP_BAR_HEIGHT_VAR_NAME = '--kangur-top-bar-height';
export const KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX = 88;
export const KANGUR_TOP_BAR_OFFSET_CLASSNAME = 'top-[var(--kangur-top-bar-height,88px)]';
export const KANGUR_TOP_BAR_PADDED_OFFSET_CLASSNAME =
  'pt-[calc(var(--kangur-top-bar-height,88px)+12px)]';
export const KANGUR_SHELL_MINUS_TOP_BAR_HEIGHT_CLASSNAME =
  'h-[calc(var(--kangur-shell-viewport-height,100dvh)-var(--kangur-top-bar-height,88px))]';
export const KANGUR_PAGE_CONTAINER_CLASSNAME =
  'kangur-page-container w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 mx-auto';
export const KANGUR_PANEL_GAP_CLASSNAME = 'kangur-panel-gap';
export const KANGUR_PANEL_ROW_CLASSNAME = cn(
  'flex flex-col',
  KANGUR_PANEL_GAP_CLASSNAME,
  'sm:flex-row'
);
export const KANGUR_PANEL_ROW_MD_CLASSNAME = cn(
  'flex flex-col',
  KANGUR_PANEL_GAP_CLASSNAME,
  'md:flex-row'
);
export const KANGUR_COMPACT_ROW_CLASSNAME = cn('flex flex-col gap-1', 'sm:flex-row');
export const KANGUR_TIGHT_ROW_CLASSNAME = cn('flex flex-col gap-2', 'sm:flex-row');
export const KANGUR_SPACED_ROW_CLASSNAME = cn('flex flex-col gap-3', 'sm:flex-row');
export const KANGUR_RELAXED_ROW_CLASSNAME = cn('flex flex-col gap-4', 'sm:flex-row');
export const KANGUR_STACK_ROW_CLASSNAME = cn('flex-col', 'sm:flex-row');
export const KANGUR_STACK_ROW_LG_CLASSNAME = cn('flex-col', 'lg:flex-row');
export const KANGUR_PANEL_ROW_LG_CLASSNAME = cn(
  'flex flex-col',
  KANGUR_PANEL_GAP_CLASSNAME,
  'lg:flex-row'
);
export const KANGUR_PANEL_ROW_XL_CLASSNAME = cn(
  'flex flex-col',
  KANGUR_PANEL_GAP_CLASSNAME,
  'xl:flex-row'
);
export const KANGUR_WRAP_ROW_CLASSNAME = 'flex flex-wrap gap-2';
export const KANGUR_WRAP_CENTER_ROW_CLASSNAME = 'flex flex-wrap items-center gap-2';
export const KANGUR_INLINE_WRAP_CENTER_ROW_CLASSNAME = 'inline-flex flex-wrap items-center gap-2';
export const KANGUR_WRAP_START_ROW_CLASSNAME = 'flex flex-wrap items-start gap-2';
export const KANGUR_WRAP_ROW_TIGHT_CLASSNAME = 'flex flex-wrap gap-x-2 gap-y-1';
export const KANGUR_WRAP_ROW_SPACED_CLASSNAME = 'flex flex-wrap gap-x-3 gap-y-2';
export const KANGUR_WRAP_ROW_ROOMY_CLASSNAME = 'flex flex-wrap gap-6';
export const KANGUR_START_ROW_CLASSNAME = 'flex items-start gap-2';
export const KANGUR_START_ROW_SPACED_CLASSNAME = 'flex items-start gap-3';
export const KANGUR_CENTER_ROW_CLASSNAME = 'flex items-center gap-2';
export const KANGUR_CENTER_ROW_SPACED_CLASSNAME = 'flex items-center gap-3';
export const KANGUR_CENTER_ROW_RELAXED_CLASSNAME = 'flex items-center gap-4';
export const KANGUR_INLINE_CENTER_ROW_CLASSNAME = 'inline-flex items-center gap-2';
export const KANGUR_WRAP_ROW_FINE_CLASSNAME = 'flex flex-wrap gap-1.5';
export const KANGUR_STACK_TIGHT_CLASSNAME = 'flex flex-col gap-2';
export const KANGUR_STACK_SPACED_CLASSNAME = 'flex flex-col gap-3';
export const KANGUR_STACK_RELAXED_CLASSNAME = 'flex flex-col gap-4';
export const KANGUR_STACK_ROOMY_CLASSNAME = 'flex flex-col gap-6';
export const KANGUR_STACK_COMPACT_CLASSNAME = 'flex flex-col gap-1';
export const KANGUR_GRID_TIGHT_CLASSNAME = 'grid gap-2';
export const KANGUR_GRID_SPACED_CLASSNAME = 'grid gap-3';
export const KANGUR_GRID_RELAXED_CLASSNAME = 'grid gap-4';
export const KANGUR_GRID_LOOSE_CLASSNAME = 'grid gap-5';
export const KANGUR_GRID_ROOMY_CLASSNAME = 'grid gap-6';
export const KANGUR_PANEL_GRID_TO_ROW_CLASSNAME = cn(
  'grid w-full',
  KANGUR_PANEL_GAP_CLASSNAME,
  'sm:flex sm:w-auto sm:flex-row'
);
export const KANGUR_LESSON_PANEL_GAP_CLASSNAME = 'kangur-lesson-panel-gap';
export const KANGUR_WIDGET_TITLE_CLASSNAME = 'text-lg font-bold tracking-[-0.02em]';

export const KANGUR_PANEL_CLASSNAMES = {
  elevated: 'glass-panel kangur-panel-elevated',
  soft: 'glass-panel kangur-panel-soft',
  subtle: 'soft-card kangur-panel-subtle',
} as const;

export const KANGUR_TOP_NAV_GROUP_CLASSNAME =
  'kangur-nav-group flex w-full min-w-0 max-w-full flex-col items-stretch gap-2 border p-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap';

export const KANGUR_TOP_NAV_ITEM_CLASSNAME =
  'kangur-nav-item group relative inline-flex min-w-0 items-center justify-center gap-2 border font-semibold tracking-[-0.02em] transition-all duration-200';

export const KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME = 'kangur-nav-item-active';

export const KANGUR_SEGMENTED_CONTROL_CLASSNAME =
  'kangur-segmented-control flex w-full flex-col items-stretch gap-1.5 rounded-[28px] border p-1.5 sm:flex-row sm:items-center';

export const KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME =
  'kangur-segmented-control-item group relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] border font-semibold tracking-[-0.02em] transition-all duration-200';

export const KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME =
  'kangur-segmented-control-item-active';

type KangurAccentStyles = {
  icon: string;
  badge: string;
  activeCard: string;
  hoverCard: string;
  activeText: string;
  mutedText: string;
};

type KangurAccentThemeVars = {
  start: string;
  end: string;
};

export const KANGUR_ACCENT_THEME_VARS: Record<KangurAccent, KangurAccentThemeVars> = {
  indigo: {
    start: 'var(--kangur-accent-indigo-start,#a855f7)',
    end: 'var(--kangur-accent-indigo-end,#6366f1)',
  },
  violet: {
    start: 'var(--kangur-accent-violet-start,#8b5cf6)',
    end: 'var(--kangur-accent-violet-end,#d946ef)',
  },
  emerald: {
    start: 'var(--kangur-accent-emerald-start,#10b981)',
    end: 'var(--kangur-accent-emerald-end,#06b6d4)',
  },
  sky: {
    start: 'var(--kangur-accent-sky-start,#38bdf8)',
    end: 'var(--kangur-accent-sky-end,#818cf8)',
  },
  amber: {
    start: 'var(--kangur-accent-amber-start,#fb923c)',
    end: 'var(--kangur-accent-amber-end,#facc15)',
  },
  rose: {
    start: 'var(--kangur-accent-rose-start,#f87171)',
    end: 'var(--kangur-accent-rose-end,#f472b6)',
  },
  teal: {
    start: 'var(--kangur-accent-teal-start,#3b82f6)',
    end: 'var(--kangur-accent-teal-end,#2dd4bf)',
  },
  slate: {
    start: 'var(--kangur-accent-slate-start,#94a3b8)',
    end: 'var(--kangur-accent-slate-end,#475569)',
  },
};

const buildAccentStyles = ({
  start,
  end,
}: {
  start: string;
  end: string;
}): KangurAccentStyles => ({
  icon: cn(
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,${start})]`,
    `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${end})]`
  ),
  badge: cn(
    `[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,${start})]`,
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,${start})]`,
    `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${end})]`
  ),
  activeCard: cn(
    `[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,${end})]`,
    `[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,${start})]`,
    `shadow-[0_24px_60px_-42px_color-mix(in_srgb,${end}_32%,transparent)]`
  ),
  hoverCard: cn(
    `hover:[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_54%,${end})]`,
    `hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,${start})]`
  ),
  activeText: `[color:color-mix(in_srgb,var(--kangur-page-text)_72%,${end})]`,
  mutedText: `[color:color-mix(in_srgb,var(--kangur-page-text)_54%,${end})]`,
});

export const KANGUR_ACCENT_STYLES: Record<KangurAccent, KangurAccentStyles> = {
  indigo: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.indigo),
  violet: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.violet),
  emerald: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.emerald),
  sky: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.sky),
  amber: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.amber),
  rose: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.rose),
  teal: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.teal),
  slate: buildAccentStyles(KANGUR_ACCENT_THEME_VARS.slate),
};

export const KANGUR_SURFACE_CARD_CLASSNAME =
  'soft-card kangur-card-surface w-full min-w-0 border text-left transition duration-200';

export const KANGUR_OPTION_CARD_CLASSNAME = `${KANGUR_SURFACE_CARD_CLASSNAME} group kangur-card-padding-md hover:-translate-y-[1px]`;

export const KANGUR_STEP_PILL_CLASSNAME =
  'kangur-cta-pill inline-flex items-center justify-center rounded-full border border-transparent transition-all duration-200';

export const KANGUR_PENDING_STEP_PILL_CLASSNAME = 'kangur-step-pill-pending w-[14px]';
