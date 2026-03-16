import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES, KANGUR_SURFACE_CARD_CLASSNAME, type KangurAccent } from '../tokens';

export const kangurInfoCardVariants = cva(`${KANGUR_SURFACE_CARD_CLASSNAME}`, {
  variants: {
    tone: {
      neutral: '[color:var(--kangur-soft-card-text)]',
      accent: '',
      muted:
        '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_68%,var(--kangur-page-background))] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-muted-text)]',
    },
    padding: {
      sm: 'kangur-card-padding-sm',
      md: 'kangur-card-padding-md',
      lg: 'kangur-card-padding-lg',
      xl: 'kangur-card-padding-xl',
    },
    dashed: {
      true: 'border-dashed',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'neutral',
    padding: 'md',
    dashed: false,
  },
});

export type KangurInfoCardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurInfoCardVariants> & {
    accent?: KangurAccent;
  };

export const KangurInfoCard = React.forwardRef<HTMLDivElement, KangurInfoCardProps>(
  ({ accent = 'slate', className, dashed, padding, tone, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        kangurInfoCardVariants({ tone, padding, dashed }),
        tone === 'accent' &&
          cn(KANGUR_ACCENT_STYLES[accent].activeCard, KANGUR_ACCENT_STYLES[accent].activeText),
        'kangur-panel-shell',
        className
      )}
      {...props}
    />
  )
);
KangurInfoCard.displayName = 'KangurInfoCard';
