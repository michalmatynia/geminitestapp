import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/utils/cn';

import { type KangurAccent } from '../tokens';

export const kangurHeadlineVariants = cva(
  'font-extrabold tracking-tight leading-tight [font-family:var(--kangur-font-heading,var(--app-font-heading))]',
  {
    variants: {
      size: {
        xs: 'text-lg',
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export const KANGUR_HEADLINE_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: '[color:var(--kangur-accent-indigo-start,#a855f7)]',
  violet: '[color:var(--kangur-accent-violet-start,#8b5cf6)]',
  emerald: '[color:var(--kangur-accent-emerald-start,#10b981)]',
  sky: '[color:var(--kangur-accent-sky-start,#0ea5e9)]',
  amber: '[color:var(--kangur-accent-amber-start,#f59e0b)]',
  rose: '[color:var(--kangur-accent-rose-start,#f43f5e)]',
  teal: '[color:var(--kangur-accent-teal-start,#14b8a6)]',
  slate: '[color:var(--kangur-page-text)]',
};

export type KangurHeadlineProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurHeadlineVariants> & {
    accent?: KangurAccent;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
  };

export function KangurHeadline({
  accent = 'slate',
  as: Comp = 'h2',
  className,
  size,
  ...props
}: KangurHeadlineProps): React.JSX.Element {
  return (
    <Comp
      className={cn(kangurHeadlineVariants({ size }), KANGUR_HEADLINE_CLASSNAMES[accent], className)}
      {...props}
    />
  );
}
