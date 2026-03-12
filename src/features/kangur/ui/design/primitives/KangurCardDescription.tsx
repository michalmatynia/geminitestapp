import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurCardDescriptionVariants = cva('[color:var(--kangur-page-muted-text)]', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
    },
    relaxed: {
      true: 'leading-6',
      false: '',
    },
  },
  defaultVariants: {
    size: 'sm',
    relaxed: false,
  },
});

export type KangurCardDescriptionProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurCardDescriptionVariants> & {
    as?: 'div' | 'p' | 'span';
  };

export function KangurCardDescription({
  as: Comp = 'div',
  className,
  relaxed,
  size,
  ...props
}: KangurCardDescriptionProps): React.JSX.Element {
  return (
    <Comp
      className={cn(kangurCardDescriptionVariants({ relaxed, size }), className)}
      {...props}
    />
  );
}
