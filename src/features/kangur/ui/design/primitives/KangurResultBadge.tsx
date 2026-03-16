import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurResultBadgeVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl border font-bold shadow-[0_18px_42px_-30px_rgba(15,23,42,0.18)]',
  {
    variants: {
      tone: {
        success: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        error: 'border-rose-200 bg-rose-100 text-rose-700',
        warning: 'border-amber-200 bg-amber-100 text-amber-700',
        neutral: 'border-slate-200 bg-slate-100 text-slate-700',
      },
      size: {
        md: 'px-4 py-2 text-base',
        lg: 'px-5 py-2.5 text-lg',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'lg',
    },
  }
);

export type KangurResultBadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurResultBadgeVariants>;

export function KangurResultBadge({
  className,
  size,
  tone,
  ...props
}: KangurResultBadgeProps): React.JSX.Element {
  return <div className={cn(kangurResultBadgeVariants({ size, tone }), className)} {...props} />;
}
