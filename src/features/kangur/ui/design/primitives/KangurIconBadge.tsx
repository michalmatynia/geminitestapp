import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';

export const kangurIconBadgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full font-bold shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]',
  {
    variants: {
      size: {
        sm: 'h-9 w-9 text-sm',
        md: 'h-12 w-12 text-base',
        lg: 'h-16 w-16 text-xl',
        xl: 'h-16 w-16 text-3xl',
        '2xl': 'h-20 w-20 text-4xl',
        '3xl': 'h-24 w-24 text-5xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type KangurIconBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurIconBadgeVariants> & {
    accent?: KangurAccent;
  };

export function KangurIconBadge({
  accent = 'slate',
  className,
  size,
  ...props
}: KangurIconBadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        kangurIconBadgeVariants({ size }),
        KANGUR_ACCENT_STYLES[accent].icon,
        className
      )}
      {...props}
    />
  );
}
