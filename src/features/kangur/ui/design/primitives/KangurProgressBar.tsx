import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import * as React from 'react';

import { cn } from '@/shared/utils';

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

export const KANGUR_PROGRESS_BAR_GRADIENTS: Record<KangurAccent, string> = {
  indigo: 'from-purple-500 to-indigo-500',
  violet: 'from-violet-500 to-fuchsia-500',
  emerald: 'from-emerald-500 to-cyan-500',
  sky: 'from-sky-400 to-indigo-400',
  amber: 'from-orange-400 to-yellow-400',
  rose: 'from-red-400 to-pink-400',
  teal: 'from-blue-500 to-teal-400',
  slate: 'from-slate-400 to-slate-600',
};

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
    KANGUR_PROGRESS_BAR_GRADIENTS[accent],
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
