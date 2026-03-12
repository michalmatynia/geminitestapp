import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

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
  indigo: 'text-indigo-700',
  violet: 'text-violet-700',
  emerald: 'text-green-700',
  sky: 'text-sky-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  teal: 'text-teal-700',
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
      className={cn(
        kangurHeadlineVariants({ size }),
        KANGUR_HEADLINE_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}
