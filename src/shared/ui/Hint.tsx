'use client';

import React, { type ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface HintProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'xxs';
  variant?: 'muted' | 'subtle' | 'warning' | 'danger' | 'info';
  italic?: boolean;
  uppercase?: boolean;
}

export function Hint({
  children,
  className,
  size = 'xs',
  variant = 'muted',
  italic = false,
  uppercase = false,
}: HintProps): React.JSX.Element {
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
    <div
      className={cn(
        sizeClasses,
        variantClasses,
        italic && 'italic',
        uppercase && 'uppercase tracking-wider font-medium',
        className
      )}
    >
      {children}
    </div>
  );
}
