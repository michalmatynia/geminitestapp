import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurSurfacePanelVariants = cva('glass-panel kangur-panel-soft rounded-[34px]', {
  variants: {
    accent: {
      indigo: 'border-indigo-200/70 [color:var(--kangur-page-text)]',
      violet: 'border-violet-200/80 [color:var(--kangur-page-text)]',
      emerald: 'border-emerald-200/80 [color:var(--kangur-page-text)]',
      sky: 'border-sky-200/80 [color:var(--kangur-page-text)]',
      amber: 'border-amber-200/80 [color:var(--kangur-page-text)]',
      rose: 'border-rose-200/80 [color:var(--kangur-page-text)]',
      teal: 'border-teal-200/80 [color:var(--kangur-page-text)]',
      slate: '[border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]',
    },
    padding: {
      md: 'kangur-panel-padding-md',
      lg: 'kangur-panel-padding-lg',
      xl: 'kangur-panel-padding-xl',
    },
    fillHeight: {
      true: 'flex h-full flex-col',
      false: '',
    },
  },
  defaultVariants: {
    accent: 'slate',
    padding: 'lg',
    fillHeight: false,
  },
});

export type KangurSurfacePanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurSurfacePanelVariants>;

export const KangurSurfacePanel = React.forwardRef<HTMLDivElement, KangurSurfacePanelProps>(
  ({ accent, className, fillHeight, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(kangurSurfacePanelVariants({ accent, fillHeight, padding }), className)}
      {...props}
    />
  )
);
KangurSurfacePanel.displayName = 'KangurSurfacePanel';
