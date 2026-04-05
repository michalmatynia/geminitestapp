import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { Label } from './label';

interface HintProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'xxs';
  variant?: 'muted' | 'subtle' | 'warning' | 'danger' | 'info';
  italic?: boolean;
  uppercase?: boolean;
}

/**
 * Hint - A small, informational text component for metadata or secondary context.
 * Leverages the shared Label component for consistent base styling.
 */
export function Hint(props: HintProps): React.JSX.Element {
  const {
    children,
    className,
    size = 'xs',
    variant = 'muted',
    italic = false,
    uppercase = false,
  } = props;

  const sizeClasses = {
    xs: 'text-xs',
    xxs: 'text-[10px]',
  }[size];

  const variantClasses = {
    muted: 'text-gray-500',
    subtle: 'text-gray-400',
    warning: 'text-amber-400/80',
    danger: 'text-rose-400/80',
    info: 'text-sky-400/80',
  }[variant];

  return (
    <Label
      className={cn(
        'font-normal', // Hint is usually not bold like standard labels
        sizeClasses,
        variantClasses,
        italic && 'italic',
        uppercase && 'uppercase tracking-wider font-medium',
        className
      )}
    >
      {children}
    </Label>
  );
}
