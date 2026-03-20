import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurSurfacePanelVariants = cva('glass-panel kangur-panel-soft rounded-[34px]', {
  variants: {
    accent: {
      indigo: 'kangur-surface-panel-accent-indigo',
      violet: 'kangur-surface-panel-accent-violet',
      emerald: 'kangur-surface-panel-accent-emerald',
      sky: 'kangur-surface-panel-accent-sky',
      amber: 'kangur-surface-panel-accent-amber',
      rose: 'kangur-surface-panel-accent-rose',
      teal: 'kangur-surface-panel-accent-teal',
      slate: 'kangur-surface-panel-accent-slate',
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
      className={cn(
        kangurSurfacePanelVariants({ accent, fillHeight, padding }),
        'kangur-panel-shell',
        className
      )}
      {...props}
    />
  )
);
KangurSurfacePanel.displayName = 'KangurSurfacePanel';
