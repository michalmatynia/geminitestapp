'use client';

import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import type { ChipProps } from '@/shared/contracts/ui';
import { cn, getTextContent } from '@/shared/utils';

import { Badge, badgeVariants } from './badge';

export type { ChipProps };

/**
 * Chip - An interactive, clickable badge-like component.
 * Refactored to leverage the shared Badge component for consistent styling.
 */
export function Chip(props: ChipProps): React.JSX.Element {
  const {
    label,
    active = false,
    onClick,
    icon: Icon,
    className,
    activeClassName,
    size = 'sm',
    variant = 'cyan',
    ariaLabel,
  } = props;

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
  };

  // Map Chip variants to Badge variants
  const badgeVariant: VariantProps<typeof badgeVariants>['variant'] = active
    ? variant === 'default'
      ? 'secondary'
      : variant === 'emerald'
        ? 'success'
        : variant
    : 'outline';

  const derivedLabel = getTextContent(label).trim();
  const finalAriaLabel = ariaLabel || derivedLabel || undefined;

  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'group outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full transition-all',
        !onClick && 'pointer-events-none'
      )}
      aria-label={finalAriaLabel}
      title={finalAriaLabel}>
      <Badge
        variant={badgeVariant}
        className={cn(
          'flex items-center gap-1.5 transition-all duration-200 border cursor-pointer',
          sizeStyles[size],
          !active &&
            'bg-transparent text-gray-400 border-border/50 hover:border-gray-400 hover:text-gray-200',
          active ? activeClassName : className
        )}
      >
        {Icon && <Icon className={cn('size-3', !active && 'opacity-70 group-hover:opacity-100')} />}
        {label}
      </Badge>
    </button>
  );
}
