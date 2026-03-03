'use client';

import * as React from 'react';
import { cn } from '@/shared/utils';

export interface ChipProps {
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  activeClassName?: string;
  size?: 'xs' | 'sm';
  variant?: 'default' | 'cyan' | 'amber' | 'emerald';
}

export function Chip({
  label,
  active = false,
  onClick,
  icon: Icon,
  className,
  activeClassName,
  size = 'sm',
  variant = 'cyan',
}: ChipProps): React.JSX.Element {
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
  };

  const variantStyles = {
    default: {
      active: 'border-white/40 bg-white/10 text-white',
      inactive: 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200',
    },
    cyan: {
      active: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200',
      inactive: 'border-border/50 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-100',
    },
    amber: {
      active: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
      inactive: 'border-border/50 text-gray-400 hover:border-amber-500/30 hover:text-amber-100',
    },
    emerald: {
      active: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      inactive: 'border-border/50 text-gray-400 hover:border-emerald-500/30 hover:text-emerald-100',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded border transition-all duration-200',
        sizeStyles[size],
        active ? cn(styles.active, activeClassName) : cn(styles.inactive, className)
      )}
    >
      {Icon && <Icon className='size-3' />}
      {label}
    </button>
  );
}
