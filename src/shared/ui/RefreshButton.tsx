'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  label?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

type RefreshButtonControlProps = {
  onRefresh: () => void;
  isRefreshing: boolean;
  label: string;
  className?: string;
  size: 'default' | 'sm' | 'lg' | 'icon';
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
};

function RefreshButtonControl({
  onRefresh,
  isRefreshing,
  label,
  className,
  size,
  variant,
}: RefreshButtonControlProps): React.JSX.Element {
  const ariaLabel = size === 'icon' || !label ? label || 'Refresh' : undefined;
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn('gap-2', className)}
      aria-label={ariaLabel}
    >
      <RefreshCcw className={cn('size-4', isRefreshing && 'animate-spin')} />
      {label ? <span>{label}</span> : null}
    </Button>
  );
}

/**
 * A standardized refresh button with an animated icon when refreshing.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  label = 'Refresh',
  className,
  size = 'sm',
  variant = 'outline',
}: RefreshButtonProps): React.JSX.Element {
  return (
    <RefreshButtonControl
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      label={label}
      className={className}
      size={size}
      variant={variant}
    />
  );
}
