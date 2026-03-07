export type KangurPageTone = 'play' | 'learn' | 'profile' | 'dashboard';

export const KANGUR_PAGE_TONE_CLASSNAMES: Record<KangurPageTone, string> = {
  play: 'min-h-screen kangur-premium-bg',
  learn: 'min-h-screen kangur-premium-bg',
  profile: 'min-h-screen kangur-premium-bg',
  dashboard: 'min-h-screen kangur-premium-bg',
};

export const KANGUR_TOP_BAR_CLASSNAME =
  'sticky top-0 z-20 w-full px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-6';
export const KANGUR_TOP_BAR_INNER_CLASSNAME =
  'mx-auto flex w-full max-w-[1180px] items-start gap-4';
export const KANGUR_PAGE_CONTAINER_CLASSNAME = 'w-full max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 xl:px-10';

export const KANGUR_PANEL_CLASSNAMES = {
  elevated: 'glass-panel rounded-[36px]',
  soft: 'glass-panel rounded-[34px]',
  subtle: 'soft-card rounded-[26px]',
} as const;

export const KANGUR_TOP_NAV_GROUP_CLASSNAME =
  'flex flex-1 flex-wrap items-center justify-between gap-3 rounded-[32px] border border-white/70 bg-white/70 p-3 shadow-[0_12px_40px_rgba(101,119,180,0.14)] backdrop-blur-xl';

export const KANGUR_TOP_NAV_ITEM_CLASSNAME =
  'group relative inline-flex !h-[64px] min-w-[140px] flex-1 items-center justify-center gap-3 !rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,rgba(248,249,255,0.72)_100%)] px-5 text-[17px] font-semibold tracking-[-0.02em] text-[#8f99bf] transition-all duration-200 hover:text-[#5b6797] hover:shadow-[0_10px_24px_rgba(90,106,167,0.12)] sm:min-w-[210px] sm:px-7';

export const KANGUR_TOP_NAV_ITEM_ACTIVE_CLASSNAME =
  'border-[#2a4181] bg-[linear-gradient(180deg,#3f5db0_0%,#243d81_100%)] text-white shadow-[0_14px_28px_rgba(42,62,130,0.30),inset_0_1px_0_rgba(255,255,255,0.20)] hover:text-white';

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
    activeCard:
      'border-sky-300 bg-sky-50/80 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.48)]',
    hoverCard: 'hover:border-sky-200 hover:bg-sky-50/40',
    activeText: 'text-sky-700',
    mutedText: 'text-sky-600',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-700',
    badge: 'border border-amber-200 bg-amber-100 text-amber-700',
    activeCard:
      'border-amber-300 bg-amber-50/85 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.48)]',
    hoverCard: 'hover:border-amber-200 hover:bg-amber-50/50',
    activeText: 'text-amber-700',
    mutedText: 'text-amber-700',
  },
  rose: {
    icon: 'bg-rose-100 text-rose-700',
    badge: 'border border-rose-200 bg-rose-100 text-rose-700',
    activeCard:
      'border-rose-300 bg-rose-50/85 shadow-[0_24px_60px_-42px_rgba(244,63,94,0.46)]',
    hoverCard: 'hover:border-rose-200 hover:bg-rose-50/50',
    activeText: 'text-rose-700',
    mutedText: 'text-rose-600',
  },
  teal: {
    icon: 'bg-teal-100 text-teal-700',
    badge: 'border border-teal-200 bg-teal-100 text-teal-700',
    activeCard:
      'border-teal-300 bg-teal-50/85 shadow-[0_24px_60px_-42px_rgba(20,184,166,0.48)]',
    hoverCard: 'hover:border-teal-200 hover:bg-teal-50/50',
    activeText: 'text-teal-700',
    mutedText: 'text-teal-600',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-700',
    badge: 'border border-slate-200 bg-slate-100 text-slate-700',
    activeCard:
      'border-slate-300 bg-slate-50/95 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.35)]',
    hoverCard: 'hover:border-slate-200 hover:bg-slate-50/70',
    activeText: 'text-slate-700',
    mutedText: 'text-slate-500',
  },
};

export const KANGUR_OPTION_CARD_CLASSNAME =
  'soft-card group w-full rounded-[26px] p-4 text-left transition duration-200 hover:-translate-y-[1px]';

export const KANGUR_STEP_PILL_CLASSNAME =
  'kangur-cta-pill inline-flex items-center justify-center rounded-full border border-transparent transition-all duration-200';
