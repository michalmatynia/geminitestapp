import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export const kangurGradientHeadingVariants = cva(
  'bg-gradient-to-r bg-clip-text font-extrabold text-transparent',
  {
    variants: {
      size: {
        md: 'text-2xl',
        lg: 'text-4xl',
      },
      shadow: {
        true: 'drop-shadow',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      shadow: true,
    },
  }
);

export type KangurGradientHeadingProps = React.HTMLAttributes<HTMLHeadingElement> &
  VariantProps<typeof kangurGradientHeadingVariants> & {
    as?: 'h1' | 'h2' | 'h3';
    gradientClass: string;
  };

export function KangurGradientHeading({
  as: Comp = 'h1',
  className,
  gradientClass,
  shadow,
  size,
  ...props
}: KangurGradientHeadingProps): React.JSX.Element {
  return (
    <Comp
      className={cn(kangurGradientHeadingVariants({ size, shadow }), gradientClass, className)}
      {...props}
    />
  );
}
