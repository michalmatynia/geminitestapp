import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_PANEL_CLASSNAMES } from '../tokens';

export const kangurPanelVariants = cva('', {
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

export interface KangurPanelProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof kangurPanelVariants> {}

export const KangurPanel = React.forwardRef<HTMLDivElement, KangurPanelProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(kangurPanelVariants({ variant, padding }), className)} {...props} />
  )
);
KangurPanel.displayName = 'KangurPanel';

export type KangurGlassPanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurPanelVariants> & {
    surface?: keyof typeof KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES;
  };

export const KangurGlassPanel = React.forwardRef<HTMLDivElement, KangurGlassPanelProps>(
  ({ className, padding, surface = 'mist', variant = 'soft', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurPanelVariants({ padding, variant }),
        KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES[surface],
        className
      )}
      {...props}
    />
  )
);
KangurGlassPanel.displayName = 'KangurGlassPanel';
