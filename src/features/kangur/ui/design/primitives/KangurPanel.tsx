import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PANEL_CLASSNAMES } from '../tokens';

export const kangurPanelVariants = cva('min-w-0 max-w-full', {
  variants: {
    variant: {
      elevated: KANGUR_PANEL_CLASSNAMES.elevated,
      soft: KANGUR_PANEL_CLASSNAMES.soft,
      subtle: KANGUR_PANEL_CLASSNAMES.subtle,
    },
    padding: {
      md: 'kangur-panel-padding-md',
      lg: 'kangur-panel-padding-lg',
      xl: 'kangur-panel-padding-xl',
    },
  },
  defaultVariants: {
    variant: 'soft',
    padding: 'lg',
  },
});

export const KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES = {
  mist: 'border-white/78 bg-white/58',
  mistSoft: 'border-white/70 bg-white/45',
  mistStrong: 'border-white/78 bg-white/68',
  frost: 'border-white/75 bg-white/88',
  solid: 'border-white/88 bg-white/94',
  neutral: 'border-slate-200/70 bg-white/88',
  rose: 'border-rose-200/70 bg-white/88',
  warmGlow:
    'border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(254,243,199,0.9),rgba(255,255,255,0.94)_42%,rgba(238,242,255,0.9)_100%)]',
  successGlow:
    'border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(209,250,229,0.85),rgba(255,255,255,0.95)_44%,rgba(238,242,255,0.92)_100%)]',
  playGlow:
    'border-indigo-200/70 bg-[radial-gradient(circle_at_top,rgba(255,251,235,0.85),rgba(255,255,255,0.97)_42%,rgba(238,242,255,0.92)_100%)]',
  playField:
    'border-white/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(244,247,255,0.94)_58%,rgba(255,247,237,0.86)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
  tealField:
    'border-white/75 bg-white/86 shadow-[0_14px_34px_-26px_rgba(20,184,166,0.28)]',
} as const;

type KangurGlassPanelSurfaceStyle = React.CSSProperties & {
  ['--kangur-panel-surface-background']?: string;
  ['--kangur-panel-surface-border']?: string;
  ['--kangur-panel-surface-shadow']?: string;
  ['--kangur-panel-surface-text']?: string;
};

const buildGlassPanelSurfaceStyle = (
  style: KangurGlassPanelSurfaceStyle
): KangurGlassPanelSurfaceStyle => style;

export const KANGUR_GLASS_PANEL_SURFACE_STYLES = {
  mist: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 78%, var(--kangur-page-background, #f8fafc)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 62%, var(--kangur-page-background, #f8fafc)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-glass-panel-border, rgba(255,255,255,0.78)) 94%, var(--kangur-page-background, #f8fafc))',
  }),
  mistSoft: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 64%, var(--kangur-page-background, #f8fafc)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 48%, var(--kangur-page-background, #f8fafc)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-glass-panel-border, rgba(255,255,255,0.78)) 88%, var(--kangur-page-background, #f8fafc))',
  }),
  mistStrong: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 86%, var(--kangur-page-background, #f8fafc)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 74%, var(--kangur-page-background, #f8fafc)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-glass-panel-border, rgba(255,255,255,0.78)) 96%, var(--kangur-page-background, #f8fafc))',
  }),
  frost: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 94%, var(--kangur-page-background, #f8fafc)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-page-background, #f8fafc)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 92%, var(--kangur-page-background, #f8fafc))',
  }),
  solid: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 98%, transparent) 0%, var(--kangur-soft-card-background, #ffffff) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 96%, var(--kangur-page-background, #f8fafc))',
  }),
  neutral: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 94%, var(--kangur-page-background, #f8fafc)) 0%, var(--kangur-soft-card-background, #ffffff) 100%)',
    '--kangur-panel-surface-border': 'var(--kangur-soft-card-border, #eef1f7)',
  }),
  rose: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-accent-rose-start, #f87171)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 94%, var(--kangur-page-background, #f8fafc)) 44%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 86%, var(--kangur-accent-rose-end, #f472b6)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 58%, var(--kangur-accent-rose-end, #f472b6))',
  }),
  warmGlow: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-accent-amber-start, #fb923c)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 94%, var(--kangur-page-background, #f8fafc)) 42%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-accent-amber-end, #facc15)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 56%, var(--kangur-accent-amber-end, #facc15))',
  }),
  successGlow: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-accent-emerald-start, #10b981)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 94%, var(--kangur-page-background, #f8fafc)) 44%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-accent-emerald-end, #06b6d4)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 56%, var(--kangur-accent-emerald-end, #06b6d4))',
  }),
  playGlow: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-accent-indigo-start, #a855f7)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 96%, var(--kangur-page-background, #f8fafc)) 42%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-accent-indigo-end, #6366f1)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 56%, var(--kangur-accent-indigo-end, #6366f1))',
  }),
  playField: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'radial-gradient(circle at top, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 96%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-accent-indigo-start, #a855f7)) 58%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 84%, var(--kangur-accent-amber-start, #fb923c)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 76%, var(--kangur-accent-indigo-end, #6366f1))',
    '--kangur-panel-surface-shadow':
      'inset 0 1px 0 color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 72%, transparent), var(--kangur-glass-panel-shadow, 0 20px 60px rgba(168, 175, 216, 0.18))',
  }),
  tealField: buildGlassPanelSurfaceStyle({
    '--kangur-panel-surface-background':
      'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 92%, var(--kangur-accent-teal-start, #3b82f6)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, var(--kangur-page-background, #f8fafc)) 100%)',
    '--kangur-panel-surface-border':
      'color-mix(in srgb, var(--kangur-soft-card-border, #eef1f7) 72%, var(--kangur-accent-teal-end, #2dd4bf))',
    '--kangur-panel-surface-shadow':
      '0 14px 34px -26px color-mix(in srgb, var(--kangur-accent-teal-end, #2dd4bf) 34%, transparent)',
  }),
} as const;

export interface KangurPanelProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof kangurPanelVariants> {}

export const KangurPanel = React.forwardRef<HTMLDivElement, KangurPanelProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(kangurPanelVariants({ variant, padding }), 'kangur-panel-shell', className)}
      {...props}
    />
  )
);
KangurPanel.displayName = 'KangurPanel';

export type KangurGlassPanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurPanelVariants> & {
    surface?: keyof typeof KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES;
  };

export const KangurGlassPanel = React.forwardRef<HTMLDivElement, KangurGlassPanelProps>(
  ({ className, padding, surface = 'mist', style, variant = 'soft', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurPanelVariants({ padding, variant }),
        KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES[surface],
        'kangur-panel-shell',
        className
      )}
      style={{
        ...KANGUR_GLASS_PANEL_SURFACE_STYLES[surface],
        ...style,
      }}
      {...props}
    />
  )
);
KangurGlassPanel.displayName = 'KangurGlassPanel';
