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
  mist: 'kangur-glass-surface-mist',
  mistSoft: 'kangur-glass-surface-mist-soft',
  mistStrong: 'kangur-glass-surface-mist-strong',
  frost: 'kangur-glass-surface-frost',
  solid: 'kangur-glass-surface-solid',
  neutral: 'kangur-glass-surface-neutral',
  rose: 'kangur-glass-surface-rose',
  warmGlow: 'kangur-glass-surface-warm-glow',
  successGlow: 'kangur-glass-surface-success-glow',
  playGlow: 'kangur-glass-surface-play-glow',
  playField: 'kangur-glass-surface-play-field',
  tealField: 'kangur-glass-surface-teal-field',
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
      style={style}
      {...props}
    />
  )
);
KangurGlassPanel.displayName = 'KangurGlassPanel';
