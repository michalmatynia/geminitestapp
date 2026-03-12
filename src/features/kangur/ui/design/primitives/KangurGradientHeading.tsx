import * as React from 'react';

import { cn } from '@/shared/utils';

import { KangurHeadline, type KangurHeadlineProps } from './KangurHeadline';

const KANGUR_GRADIENT_HEADING_SIZE_CLASSNAMES: Record<
  NonNullable<KangurHeadlineProps['size']>,
  string
> = {
  xs: 'text-xl',
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

export type KangurGradientHeadingProps = Omit<KangurHeadlineProps, 'accent'> & {
  gradientClass?: string;
};

export function KangurGradientHeading({
  className,
  gradientClass = 'from-indigo-500 to-violet-500',
  size = 'md',
  ...props
}: KangurGradientHeadingProps): React.JSX.Element {
  return (
    <KangurHeadline
      className={cn(
        'inline-block bg-gradient-to-r bg-clip-text text-transparent',
        KANGUR_GRADIENT_HEADING_SIZE_CLASSNAMES[size],
        gradientClass,
        className
      )}
      {...props}
    />
  );
}
