import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

export const kangurGradientIconTileVariants = cva(
  'inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-sm',
  {
    variants: {
      size: {
        md: 'h-12 w-12 kangur-gradient-icon-tile-md text-3xl',
        lg: 'h-16 w-16 kangur-gradient-icon-tile-lg text-5xl',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  }
);

export type KangurGradientIconTileProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof kangurGradientIconTileVariants> & {
    gradientClass: string;
  };

export function KangurGradientIconTile({
  className,
  gradientClass,
  size,
  ...props
}: KangurGradientIconTileProps): React.JSX.Element {
  return (
    <span
      className={cn(kangurGradientIconTileVariants({ size }), gradientClass, className)}
      {...props}
    />
  );
}
