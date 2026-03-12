import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';

export const kangurAccentDotVariants = cva(
  'inline-flex shrink-0 rounded-full border border-white/85 shadow-[0_0_0_1px_rgba(15,23,42,0.05)]',
  {
    variants: {
      size: {
        sm: 'h-2.5 w-2.5',
        md: 'h-3 w-3',
        lg: 'h-4 w-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const KANGUR_ACCENT_DOT_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-400',
  rose: 'bg-rose-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
};

export type KangurAccentDotProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurAccentDotVariants> & {
    accent?: KangurAccent;
  };

export function KangurAccentDot({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurAccentDotProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurAccentDotVariants({ size }),
        KANGUR_ACCENT_DOT_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}
