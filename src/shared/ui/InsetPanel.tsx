import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils/ui-utils';

export const insetPanelVariants = cva('border border-border/60 bg-card/40', {
  variants: {
    radius: {
      compact: 'rounded',
      panel: 'rounded-lg',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
  },
  defaultVariants: {
    radius: 'panel',
    padding: 'md',
  },
});

export type InsetPanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof insetPanelVariants>;

export const InsetPanel = React.forwardRef<HTMLDivElement, InsetPanelProps>(
  ({ className, padding, radius, ...props }, ref) => (
    <div ref={ref} className={cn(insetPanelVariants({ padding, radius }), className)} {...props} />
  )
);

InsetPanel.displayName = 'InsetPanel';
