import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurCardTitleVariants = cva(
  '[color:var(--kangur-page-text)] [font-family:var(--kangur-font-heading,var(--app-font-heading))]',
  {
    variants: {
      size: {
        sm: 'text-sm font-semibold',
        md: 'text-base font-extrabold',
        lg: 'text-lg font-extrabold tracking-tight',
        xl: 'text-2xl font-extrabold tracking-tight',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  }
);

export type KangurCardTitleProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurCardTitleVariants> & {
    as?: 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  };

export function KangurCardTitle({
  as: Comp = 'div',
  className,
  size,
  ...props
}: KangurCardTitleProps): React.JSX.Element {
  return <Comp className={cn(kangurCardTitleVariants({ size }), className)} {...props} />;
}
