import type { AdminMenuColorOption } from '@/shared/contracts/admin';

export const ADMIN_MENU_COLORS: AdminMenuColorOption[] = [
  {
    value: 'slate',
    label: 'Slate',
    dot: 'bg-slate-400',
    border: 'border-slate-400/60',
    text: 'text-slate-200',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    dot: 'bg-emerald-400',
    border: 'border-emerald-400/60',
    text: 'text-emerald-200',
  },
  {
    value: 'blue',
    label: 'Blue',
    dot: 'bg-blue-400',
    border: 'border-blue-400/60',
    text: 'text-blue-200',
  },
  {
    value: 'amber',
    label: 'Amber',
    dot: 'bg-amber-400',
    border: 'border-amber-400/60',
    text: 'text-amber-200',
  },
  {
    value: 'violet',
    label: 'Violet',
    dot: 'bg-violet-400',
    border: 'border-violet-400/60',
    text: 'text-violet-200',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    dot: 'bg-cyan-400',
    border: 'border-cyan-400/60',
    text: 'text-cyan-200',
  },
  {
    value: 'orange',
    label: 'Orange',
    dot: 'bg-orange-400',
    border: 'border-orange-400/60',
    text: 'text-orange-200',
  },
  {
    value: 'rose',
    label: 'Rose',
    dot: 'bg-rose-400',
    border: 'border-rose-400/60',
    text: 'text-rose-200',
  },
];

export const ADMIN_MENU_COLOR_MAP: Record<string, AdminMenuColorOption> = Object.fromEntries(
  ADMIN_MENU_COLORS.map((option: AdminMenuColorOption) => [option.value, option])
);

export const OPEN_KEY = 'adminMenuOpenIds.v2';
export const POPULAR_ADMIN_PREFETCH_HREFS = [
  '/admin/products',
  '/admin/integrations',
  '/admin/kangur/social',
  '/admin/settings',
  '/admin/ai-paths',
] as const;
