import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurMetaTextVariants = cva('[color:var(--kangur-page-muted-text)]', {
  variants: {
    size: {
      xs: 'text-[11px]',
      sm: 'text-sm',
      lg: 'text-2xl font-medium',
    },
    tone: {
      muted: '[color:var(--kangur-page-muted-text)]',
      slate: 'text-slate-500',
      amber: 'text-amber-900',
    },
    caps: {
      true: 'uppercase tracking-[0.14em]',
      false: '',
    },
    relaxed: {
      true: 'leading-6',
      false: '',
    },
  },
  defaultVariants: {
    size: 'xs',
    tone: 'muted',
    caps: false,
    relaxed: false,
  },
});

export type KangurMetaTextProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurMetaTextVariants> & {
    as?: 'div' | 'p' | 'span';
  };

export function KangurMetaText({
  as: Comp = 'div',
  caps,
  className,
  relaxed,
  size,
  tone,
  ...props
}: KangurMetaTextProps): React.JSX.Element {
  return (
    <Comp
      className={cn(kangurMetaTextVariants({ caps, relaxed, size, tone }), className)}
      {...props}
    />
  );
}
