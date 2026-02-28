import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
        warning: 'border-transparent bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
        info: 'border-transparent bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
        neutral: 'border-transparent bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
        pending: 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
        active: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30',
        failed: 'border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30',
        removed: 'border-gray-500/40 bg-gray-500/20 text-gray-300 hover:bg-gray-500/30',
        error: 'border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30',
        processing: 'border-blue-500/40 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
