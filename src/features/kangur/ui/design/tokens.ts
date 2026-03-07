export type KangurPageTone = 'play' | 'learn' | 'profile' | 'dashboard';

export const KANGUR_PAGE_TONE_CLASSNAMES: Record<KangurPageTone, string> = {
  play: 'min-h-screen kangur-premium-bg',
  learn: 'min-h-screen kangur-premium-bg',
  profile: 'min-h-screen kangur-premium-bg',
  dashboard: 'min-h-screen kangur-premium-bg',
};

export const KANGUR_TOP_BAR_CLASSNAME =
  'sticky top-0 z-20 w-full px-4 pb-2 pt-3 sm:px-6 sm:pb-3 sm:pt-5';
export const KANGUR_TOP_BAR_INNER_CLASSNAME =
  'flex w-full items-center gap-4';
export const KANGUR_PAGE_CONTAINER_CLASSNAME =
  'w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 xl:px-10';

export const KANGUR_PANEL_CLASSNAMES = {
  elevated: 'glass-panel rounded-[36px]',
  soft: 'glass-panel rounded-[34px]',
  subtle: 'soft-card rounded-[26px]',
} as const;

export const KANGUR_TOP_NAV_GROUP_CLASSNAME =
  'flex w-full flex-wrap items-center gap-2 rounded-[30px] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.58)_100%)] p-2 shadow-[0_20px_40px_-30px_rgba(94,110,160,0.38)] backdrop-blur-xl sm:flex-nowrap';

export const KANGUR_TOP_NAV_ITEM_CLASSNAME =
  'group relative inline-flex min-w-0 items-center justify-center gap-2 rounded-[20px] border border-transparent bg-transparent font-semibold tracking-[-0.02em] text-slate-500 transition-all duration-200 hover:border-white/80 hover:bg-white/78 hover:text-slate-700 hover:shadow-[0_10px_18px_-16px_rgba(148,163,184,0.7)]';

export const KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME =
  'border-indigo-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(238,242,255,0.92)_100%)] text-indigo-700 shadow-[0_14px_24px_-18px_rgba(99,102,241,0.42)] ring-1 ring-indigo-100/80 hover:border-indigo-100 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(238,242,255,0.95)_100%)] hover:text-indigo-700';

export const KANGUR_SEGMENTED_CONTROL_CLASSNAME =
  'flex w-full items-center gap-1.5 rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0.56)_100%)] p-1.5 shadow-[0_18px_36px_-28px_rgba(94,110,160,0.34)] backdrop-blur-xl';

export const KANGUR_SEGMENTED_CONTROL_ITEM_CLASSNAME =
  'group relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] border border-transparent bg-transparent font-semibold tracking-[-0.02em] text-slate-500 transition-all duration-200 hover:border-white/80 hover:bg-white/76 hover:text-slate-700 hover:shadow-[0_10px_18px_-16px_rgba(148,163,184,0.66)]';

export const KANGUR_SEGMENTED_CONTROL_ITEM_ACTIVE_CLASSNAME =
  'border-indigo-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(238,242,255,0.92)_100%)] text-indigo-700 shadow-[0_14px_24px_-18px_rgba(99,102,241,0.4)] ring-1 ring-indigo-100/80 hover:border-indigo-100 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(238,242,255,0.95)_100%)] hover:text-indigo-700';

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

export const KANGUR_ACCENT_STYLES: Record<KangurAccent, KangurAccentStyles> = {
  indigo: {
    icon: 'bg-indigo-100 text-indigo-700',
    badge: 'border border-indigo-200 bg-indigo-100 text-indigo-700',
    activeCard:
      'border-indigo-300 bg-indigo-50/80 shadow-[0_24px_60px_-42px_rgba(99,102,241,0.58)]',
    hoverCard: 'hover:border-indigo-200 hover:bg-indigo-50/40',
    activeText: 'text-indigo-700',
    mutedText: 'text-indigo-600',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-700',
    badge: 'border border-violet-200 bg-violet-100 text-violet-700',
    activeCard:
      'border-violet-300 bg-violet-50/80 shadow-[0_24px_60px_-42px_rgba(139,92,246,0.55)]',
    hoverCard: 'hover:border-violet-200 hover:bg-violet-50/40',
    activeText: 'text-violet-700',
    mutedText: 'text-violet-600',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-700',
    badge: 'border border-emerald-200 bg-emerald-100 text-emerald-700',
    activeCard:
      'border-emerald-300 bg-emerald-50/80 shadow-[0_24px_60px_-42px_rgba(16,185,129,0.52)]',
    hoverCard: 'hover:border-emerald-200 hover:bg-emerald-50/40',
    activeText: 'text-emerald-700',
    mutedText: 'text-emerald-600',
  },
  sky: {
    icon: 'bg-sky-100 text-sky-700',
    badge: 'border border-sky-200 bg-sky-100 text-sky-700',
    activeCard: 'border-sky-300 bg-sky-50/80 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.48)]',
    hoverCard: 'hover:border-sky-200 hover:bg-sky-50/40',
    activeText: 'text-sky-700',
    mutedText: 'text-sky-600',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-700',
    badge: 'border border-amber-200 bg-amber-100 text-amber-700',
    activeCard: 'border-amber-300 bg-amber-50/85 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.48)]',
    hoverCard: 'hover:border-amber-200 hover:bg-amber-50/50',
    activeText: 'text-amber-700',
    mutedText: 'text-amber-700',
  },
  rose: {
    icon: 'bg-rose-100 text-rose-700',
    badge: 'border border-rose-200 bg-rose-100 text-rose-700',
    activeCard: 'border-rose-300 bg-rose-50/85 shadow-[0_24px_60px_-42px_rgba(244,63,94,0.46)]',
    hoverCard: 'hover:border-rose-200 hover:bg-rose-50/50',
    activeText: 'text-rose-700',
    mutedText: 'text-rose-600',
  },
  teal: {
    icon: 'bg-teal-100 text-teal-700',
    badge: 'border border-teal-200 bg-teal-100 text-teal-700',
    activeCard: 'border-teal-300 bg-teal-50/85 shadow-[0_24px_60px_-42px_rgba(20,184,166,0.48)]',
    hoverCard: 'hover:border-teal-200 hover:bg-teal-50/50',
    activeText: 'text-teal-700',
    mutedText: 'text-teal-600',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-700',
    badge: 'border border-slate-200 bg-slate-100 text-slate-700',
    activeCard: 'border-slate-300 bg-slate-50/95 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.35)]',
    hoverCard: 'hover:border-slate-200 hover:bg-slate-50/70',
    activeText: 'text-slate-700',
    mutedText: 'text-slate-500',
  },
};

export const KANGUR_SURFACE_CARD_CLASSNAME =
  'soft-card w-full rounded-[26px] border text-left transition duration-200';

export const KANGUR_OPTION_CARD_CLASSNAME = `${KANGUR_SURFACE_CARD_CLASSNAME} group p-4 hover:-translate-y-[1px]`;

export const KANGUR_STEP_PILL_CLASSNAME =
  'kangur-cta-pill inline-flex items-center justify-center rounded-full border border-transparent transition-all duration-200';
