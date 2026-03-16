import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { type KangurAccent } from '../tokens';

export const kangurProgressBarVariants = cva(
  'w-full overflow-hidden rounded-full [background:var(--kangur-progress-track)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]',
  {
    variants: {
      size: {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type KangurProgressBarProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurProgressBarVariants> & {
    accent?: KangurAccent;
    animated?: boolean;
    fillClassName?: string;
    value: number;
  };

export function KangurProgressBar({
  accent = 'indigo',
  animated = false,
  className,
  fillClassName,
  size,
  value,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: KangurProgressBarProps): React.JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillClasses = cn(
    'kangur-progress-fill h-full rounded-full bg-gradient-to-r',
    !animated && 'transition-[width] duration-500 ease-out',
    fillClassName
  );

  return (
    <div
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : 'Postęp')}
      aria-labelledby={ariaLabelledBy}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedValue)}
      className={cn(kangurProgressBarVariants({ size }), className)}
      role='progressbar'
      {...props}
    >
      {animated ? (
        <motion.div
          animate={{ width: `${clampedValue}%` }}
          className={fillClasses}
          data-kangur-accent={accent}
          initial={{ width: 0 }}
          transition={{ duration: 0.8 }}
        />
      ) : (
        <div className={fillClasses} data-kangur-accent={accent} style={{ width: `${clampedValue}%` }} />
      )}
    </div>
  );
}
