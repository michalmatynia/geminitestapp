import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';

export const kangurDividerVariants = cva('rounded-full', {
  variants: {
    size: {
      sm: 'h-px w-12',
      md: 'h-0.5 w-16',
      lg: 'h-1 w-20',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const KANGUR_DIVIDER_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'bg-indigo-200',
  violet: 'bg-violet-200',
  emerald: 'bg-emerald-200',
  sky: 'bg-sky-200',
  amber: 'bg-amber-200',
  rose: 'bg-rose-200',
  teal: 'bg-teal-200',
  slate: 'bg-slate-200',
};

export type KangurDividerProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurDividerVariants> & {
    accent?: KangurAccent;
  };

export function KangurDivider({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurDividerProps): React.JSX.Element {
  return (
    <div
      className={cn(kangurDividerVariants({ size }), KANGUR_DIVIDER_CLASSNAMES[accent], className)}
      {...props}
    />
  );
}
