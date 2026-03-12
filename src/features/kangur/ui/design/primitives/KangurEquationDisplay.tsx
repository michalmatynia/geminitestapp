import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { type KangurAccent } from '../tokens';

export const kangurEquationDisplayVariants = cva('font-extrabold leading-tight tracking-tight', {
  variants: {
    size: {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
});

export const KANGUR_EQUATION_CLASSNAMES: Record<KangurAccent, string> = {
  indigo: 'text-indigo-700',
  violet: 'text-purple-600',
  emerald: 'text-green-600',
  sky: 'text-blue-600',
  amber: 'text-orange-500',
  rose: 'text-red-500',
  teal: 'text-teal-600',
  slate: 'text-gray-700',
};

export type KangurEquationDisplayProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof kangurEquationDisplayVariants> & {
    accent?: KangurAccent;
    as?: 'p' | 'div' | 'h2' | 'h3' | 'span';
  };

export function KangurEquationDisplay({
  accent = 'slate',
  as: Comp = 'p',
  className,
  size,
  ...props
}: KangurEquationDisplayProps): React.JSX.Element {
  return (
    <Comp
      className={cn(
        kangurEquationDisplayVariants({ size }),
        KANGUR_EQUATION_CLASSNAMES[accent],
        className
      )}
      {...props}
    />
  );
}
